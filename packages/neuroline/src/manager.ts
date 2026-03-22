import crypto from 'node:crypto';

import type { PipelineStorage } from './storage';
import type {
    PipelineConfig,
    PipelineInput,
    PipelineStage,
    StageItem,
    JobInPipeline,
    JobState,
    JobStatus,
    JobContext,
    JobLogger,
    SynapseContext,
    JobError,
    StartPipelineResponse,
    StartPipelineOptions,
    RestartPipelineOptions,
    RestartPipelineResponse,
    PipelineStatusResponse,
    PipelineResultResponse,
    PipelineState,
} from './types';

// ============================================================================
// Utilities
// ============================================================================

/**
 * Задержка на указанное количество миллисекунд
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Проверяет, является ли элемент JobInPipeline (имеет поле job)
 */
const isJobInPipeline = (item: StageItem): item is JobInPipeline => {
    return 'job' in item && typeof item.job === 'object' && 'name' in item.job;
};

/**
 * Нормализует StageItem в JobInPipeline
 */
const normalizeStageItem = (item: StageItem): JobInPipeline => {
    if (isJobInPipeline(item)) {
        return item;
    }
    // JobDefinition -> JobInPipeline без маппера
    return { job: item };
};

/**
 * Нормализует stage в массив JobInPipeline
 */
const normalizeStage = (stage: PipelineStage): JobInPipeline[] => {
    const items = Array.isArray(stage) ? stage : [stage];
    return items.map(normalizeStageItem);
};

/**
 * Преобразует stages в плоский список jobs с метаданными
 */
const flattenStages = (stages: PipelineStage[]): { jobInPipeline: JobInPipeline; stageIndex: number }[] => {
    const result: { jobInPipeline: JobInPipeline; stageIndex: number }[] = [];
    stages.forEach((stage, stageIndex) => {
        const jobs = normalizeStage(stage);
        jobs.forEach((jobInPipeline) => {
            result.push({ jobInPipeline, stageIndex });
        });
    });
    return result;
};

/**
 * Минимальный индекс stage, где есть job не в статусе done (для recovery после рестарта процесса)
 */
const getEarliestIncompleteStageIndex = (flat: { stageIndex: number }[], jobs: JobState[]): number => {
    let min = Infinity;
    for (let i = 0; i < flat.length; i++) {
        if (jobs[i]?.status !== 'done') {
            min = Math.min(min, flat[i].stageIndex);
        }
    }
    return min === Infinity ? 0 : min;
};

/**
 * Вычисляет хеш от входных данных
 */
const computeDefaultHash = (input: unknown): string => {
    const json = JSON.stringify(input);
    return crypto.createHash('sha256').update(json).digest('hex').slice(0, 16);
};

/**
 * Вычисляет хеш структуры pipeline (имена jobs в порядке выполнения)
 * Используется для инвалидации при изменении конфигурации
 */
const computeConfigHash = (stages: PipelineStage[]): string => {
    const flatJobs = flattenStages(stages);
    const jobNames = flatJobs.map(({ jobInPipeline }) => jobInPipeline.job.name);
    return crypto.createHash('sha256').update(jobNames.join(',')).digest('hex').slice(0, 16);
};

// ============================================================================
// Pipeline Execution Context
// ============================================================================

/** Разделяемое состояние между stage в процессе выполнения pipeline */
interface PipelineExecutionContext {
    readonly pipelineId: string;
    readonly artifacts: Map<string, unknown>;
    readonly mapperContext: SynapseContext;
    readonly jobOptions: Record<string, unknown>;
    defaultInput: unknown;
}

// ============================================================================
// Pipeline Manager Options
// ============================================================================

export interface PipelineManagerOptions {
    /** Хранилище состояния пайплайнов */
    storage: PipelineStorage;
    /** Логгер (опционально) */
    logger?: JobLogger;
}

// ============================================================================
// Stale Jobs Watchdog Options
// ============================================================================

/**
 * Опции для watchdog, который отслеживает и таймаутит "зависшие" джобы
 */
export interface StaleJobsWatchdogOptions {
    /**
     * Интервал проверки в миллисекундах
     * @default 60000 (1 минута)
     */
    checkIntervalMs?: number;

    /**
     * Таймаут джобы в миллисекундах — если джоба в статусе processing
     * дольше этого времени, она будет помечена как error
     * @default 1200000 (20 минут)
     */
    jobTimeoutMs?: number;

    /**
     * Callback, вызываемый при обнаружении и таймауте зависших джоб
     */
    onStaleJobsFound?: (count: number) => void;
}

// ============================================================================
// Pipeline Manager
// ============================================================================

/**
 * Менеджер пайплайнов — оркестрирует выполнение jobs
 * Не зависит от NestJS, MongoDB или других фреймворков
 */
export class PipelineManager {
    private readonly pipelineConfigs = new Map<string, PipelineConfig>();
    private readonly storage: PipelineStorage;
    private readonly logger: JobLogger;

    /** Таймер для watchdog */
    private watchdogTimer: ReturnType<typeof setInterval> | null = null;
    /** Опции watchdog */
    private watchdogOptions: StaleJobsWatchdogOptions | null = null;

    /** Активные execution loops (для отслеживания живых процессов) */
    private readonly activePipelines = new Set<string>();
    /** Resolvers для пробуждения stage loop при ожидании manual jobs */
    private readonly manualJobResolvers = new Map<string, () => void>();

    constructor(options: PipelineManagerOptions) {
        this.storage = options.storage;
        this.logger = options.logger ?? {
            info: () => { },
            error: () => { },
            warn: () => { },
        };
    }

    /**
     * Регистрирует конфигурацию пайплайна
     */
    registerPipeline<TInput = unknown>(config: PipelineConfig<TInput>): void {
        this.pipelineConfigs.set(config.name, config as PipelineConfig);
        const totalJobs = flattenStages(config.stages).length;
        this.logger.info(`Pipeline registered: ${config.name}`, {
            stagesCount: config.stages.length,
            totalJobs,
        });
    }

    /**
     * Получает конфигурацию пайплайна по имени
     */
    private getPipelineConfig(pipelineType: string): PipelineConfig {
        const config = this.pipelineConfigs.get(pipelineType);
        if (!config) {
            throw new Error(`Pipeline type "${pipelineType}" not registered`);
        }
        return config;
    }

    /**
     * Запускает пайплайн или возвращает существующий
     *
     * @param pipelineType - тип пайплайна (должен быть зарегистрирован)
     * @param input - входные данные и опции для jobs
     * @param options - опции запуска (onExecutionStart для serverless)
     */
    async startPipeline<TData = unknown>(
        pipelineType: string,
        input: PipelineInput<TData>,
        options?: StartPipelineOptions,
    ): Promise<StartPipelineResponse> {
        const config = this.getPipelineConfig(pipelineType);

        // Вычисляем ID пайплайна (хеш от входных данных)
        const hashInput = { pipelineType, data: input.data };
        const pipelineId = config.computeInputHash
            ? config.computeInputHash(input.data)
            : computeDefaultHash(hashInput);

        // Вычисляем хеш структуры pipeline (для инвалидации при изменении конфигурации)
        const configHash = computeConfigHash(config.stages);

        // Проверяем, существует ли уже такой пайплайн
        const existingPipeline = await this.storage.findById(pipelineId);

        if (existingPipeline) {
            // Проверяем, совпадает ли структура pipeline
            this.logger.info('Pipeline exists, checking config hash', {
                pipelineId,
                pipelineType,
                existingJobsCount: existingPipeline.jobs.length,
                newJobsCount: flattenStages(config.stages).length,
                existingConfigHash: existingPipeline.configHash,
                newConfigHash: configHash,
                hashesMatch: existingPipeline.configHash === configHash,
            });

            if (existingPipeline.configHash === configHash) {
                this.logger.info('Pipeline already exists, returning existing', { pipelineId, pipelineType });
                return { pipelineId, isNew: false };
            }

            // Структура изменилась — удаляем старую запись и создаём новую
            this.logger.info('Pipeline config changed, invalidating old pipeline', {
                pipelineId,
                pipelineType,
                oldConfigHash: existingPipeline.configHash,
                newConfigHash: configHash,
            });
            await this.storage.delete(pipelineId);
        }

        // Создаём начальные состояния jobs (плоский список из всех stages)
        const flatJobs = flattenStages(config.stages);
        const jobs: JobState[] = flatJobs.map(({ jobInPipeline }) => ({
            name: jobInPipeline.job.name,
            status: (jobInPipeline.manual ? 'awaiting_manual' : 'pending') as JobStatus,
            errors: [],
        }));

        // Создаём состояние пайплайна
        const pipelineState: PipelineState = {
            pipelineId,
            pipelineType,
            status: 'processing',
            currentJobIndex: 0,
            input: input.data,
            jobOptions: input.jobOptions as Record<string, unknown> | undefined,
            jobs,
            configHash,
        };

        await this.storage.create(pipelineState);

        this.logger.info('Pipeline created', { pipelineId, pipelineType, configHash });

        // Создаём promise выполнения
        const executionPromise = this.executePipeline(pipelineId, pipelineType).catch((error) => {
            this.logger.error('Pipeline execution failed', { pipelineId, error });
        });

        // Вызываем callback если передан (для waitUntil в serverless)
        if (options?.onExecutionStart) {
            options.onExecutionStart(executionPromise);
        }

        return { pipelineId, isNew: true };
    }

    /**
     * Выполняет пайплайн: stages последовательно, jobs внутри stage — параллельно
     * 
     * При перезапуске выполняются только jobs со статусом 'pending'.
     * Jobs со статусом 'done' пропускаются, их артефакты загружаются из storage.
     * 
     * @param pipelineId - ID пайплайна
     * @param pipelineType - тип пайплайна
     * @param startFromStageIndex - индекс stage, с которого начать выполнение (для перезапуска)
     */
    private async executePipeline(
        pipelineId: string,
        pipelineType: string,
        startFromStageIndex = 0,
    ): Promise<void> {
        this.activePipelines.add(pipelineId);

        try {
            await this.executePipelineInner(pipelineId, pipelineType, startFromStageIndex);
        } finally {
            this.activePipelines.delete(pipelineId);
            this.manualJobResolvers.delete(pipelineId);
        }
    }

    private async executePipelineInner(
        pipelineId: string,
        pipelineType: string,
        startFromStageIndex: number,
    ): Promise<void> {
        const config = this.getPipelineConfig(pipelineType);
        const pipeline = await this.storage.findById(pipelineId);

        if (!pipeline) {
            throw new Error(`Pipeline ${pipelineId} not found`);
        }

        const pipelineInput = pipeline.input;
        const artifacts = new Map<string, unknown>();

        const ctx: PipelineExecutionContext = {
            pipelineId,
            artifacts,
            mapperContext: {
                pipelineInput,
                getArtifact: <T = unknown>(jobName: string): T | undefined =>
                    artifacts.get(jobName) as T | undefined,
            },
            jobOptions: pipeline.jobOptions ?? {},
            defaultInput: pipelineInput,
        };

        let flatJobIndex = 0;

        for (let stageIndex = 0; stageIndex < config.stages.length; stageIndex++) {
            const stageJobs = normalizeStage(config.stages[stageIndex]);

            if (stageIndex < startFromStageIndex) {
                this.loadSkippedStageArtifacts(stageJobs, pipeline.jobs, flatJobIndex, ctx);
                flatJobIndex += stageJobs.length;
                continue;
            }

            const stageJobIndices = stageJobs.map((_, i) => flatJobIndex + i);
            const success = await this.executeStage(stageJobs, stageJobIndices, stageIndex, config.stages.length, ctx);

            if (!success) return;

            // Обновляем defaultInput: если в stage одна job — её артефакт становится дефолтным
            if (stageJobs.length === 1) {
                const latestPipeline = await this.storage.findById(pipelineId);
                const jobState = latestPipeline?.jobs[flatJobIndex];
                if (jobState?.status === 'done' && jobState.artifact !== undefined) {
                    ctx.defaultInput = jobState.artifact;
                }
            }

            flatJobIndex += stageJobs.length;
        }

        await this.storage.updateStatus(pipelineId, 'done');
        this.logger.info('Pipeline completed', { pipelineId, pipelineType });
    }

    // ============================================================================
    // Stage Execution
    // ============================================================================

    /**
     * Загружает артефакты из пропущенных stages (до точки перезапуска) в контекст
     */
    private loadSkippedStageArtifacts(
        stageJobs: JobInPipeline[],
        pipelineJobs: JobState[],
        flatJobIndex: number,
        ctx: PipelineExecutionContext,
    ): void {
        for (let i = 0; i < stageJobs.length; i++) {
            const jobState = pipelineJobs[flatJobIndex + i];
            if (jobState?.status === 'done' && jobState.artifact !== undefined) {
                ctx.artifacts.set(stageJobs[i].job.name, jobState.artifact);
            }
        }

        if (stageJobs.length === 1) {
            const jobState = pipelineJobs[flatJobIndex];
            if (jobState?.status === 'done' && jobState.artifact !== undefined) {
                ctx.defaultInput = jobState.artifact;
            }
        }
    }

    /**
     * Выполняет один stage: pending jobs волнами, awaiting_manual — с ожиданием
     *
     * @returns true если stage завершён успешно, false если произошла ошибка
     */
    private async executeStage(
        stageJobs: JobInPipeline[],
        stageJobIndices: number[],
        stageIndex: number,
        totalStages: number,
        ctx: PipelineExecutionContext,
    ): Promise<boolean> {
        while (true) {
            const currentPipeline = await this.storage.findById(ctx.pipelineId);
            if (!currentPipeline) {
                throw new Error(`Pipeline ${ctx.pipelineId} not found`);
            }

            // Категоризируем jobs в этом stage
            const pendingJobs: Array<{ jobInPipeline: JobInPipeline; jobIndex: number }> = [];
            let hasAwaitingManual = false;
            let allDone = true;

            for (let i = 0; i < stageJobs.length; i++) {
                const jobIndex = stageJobIndices[i];
                const jobState = currentPipeline.jobs[jobIndex];

                if (jobState?.status === 'done') {
                    if (jobState.artifact !== undefined) {
                        ctx.artifacts.set(stageJobs[i].job.name, jobState.artifact);
                    }
                } else if (jobState?.status === 'pending') {
                    pendingJobs.push({ jobInPipeline: stageJobs[i], jobIndex });
                    allDone = false;
                } else if (jobState?.status === 'awaiting_manual') {
                    hasAwaitingManual = true;
                    allDone = false;
                } else {
                    allDone = false;
                }
            }

            if (allDone) return true;

            if (pendingJobs.length > 0) {
                const success = await this.executePendingBatch(pendingJobs, stageJobs.length, stageIndex, totalStages, ctx);
                if (!success) return false;
                continue;
            }

            if (hasAwaitingManual) {
                let blockingManualJobIndex = Infinity;
                for (let i = 0; i < stageJobs.length; i++) {
                    const jobIndex = stageJobIndices[i];
                    if (currentPipeline.jobs[jobIndex]?.status === 'awaiting_manual') {
                        blockingManualJobIndex = Math.min(blockingManualJobIndex, jobIndex);
                    }
                }
                if (blockingManualJobIndex === Infinity) {
                    throw new Error(
                        `Pipeline ${ctx.pipelineId}: awaiting_manual expected in stage ${stageIndex} but none found`,
                    );
                }
                await this.waitForManualJob(ctx.pipelineId, stageIndex, blockingManualJobIndex);
                continue;
            }

            return true;
        }
    }

    /**
     * Выполняет batch pending jobs параллельно, сохраняет артефакты
     *
     * @returns true если все jobs успешны, false если есть ошибки
     */
    private async executePendingBatch(
        pendingJobs: Array<{ jobInPipeline: JobInPipeline; jobIndex: number }>,
        jobsInStage: number,
        stageIndex: number,
        totalStages: number,
        ctx: PipelineExecutionContext,
    ): Promise<boolean> {
        this.logger.info(`Executing stage ${stageIndex + 1}/${totalStages}`, {
            pipelineId: ctx.pipelineId,
            jobsInStage,
            jobsToExecute: pendingJobs.length,
            parallel: pendingJobs.length > 1,
        });

        await Promise.all(
            pendingJobs.map(({ jobIndex }) =>
                this.storage.updateJobStatus(ctx.pipelineId, jobIndex, 'processing', new Date()),
            ),
        );

        const results = await Promise.all(
            pendingJobs.map(({ jobInPipeline, jobIndex }) =>
                this.executeJob(ctx.pipelineId, jobInPipeline, jobIndex, ctx),
            ),
        );

        const failedJobs = results.filter((r) => !r.success);
        if (failedJobs.length > 0) {
            await this.storage.updateStatus(ctx.pipelineId, 'error');
            return false;
        }

        for (const result of results) {
            if (result.success && result.artifact !== null) {
                ctx.artifacts.set(result.jobDef.name, result.artifact);
            }
        }

        return true;
    }

    /**
     * Ставит pipeline в awaiting_manual и ждёт пробуждения от runManualJob
     *
     * @param blockingJobIndex — flat-индекс первой manual job в stage, которую нужно запустить (для getStatus / currentJobName)
     */
    private async waitForManualJob(
        pipelineId: string,
        stageIndex: number,
        blockingJobIndex: number,
    ): Promise<void> {
        await this.storage.updateCurrentJobIndex(pipelineId, blockingJobIndex);
        await this.storage.updateStatus(pipelineId, 'awaiting_manual');
        this.logger.info('Pipeline awaiting manual job execution', {
            pipelineId,
            stageIndex: stageIndex + 1,
            blockingJobIndex,
        });

        await new Promise<void>((resolve) => {
            this.manualJobResolvers.set(pipelineId, resolve);
        });

        await this.storage.updateStatus(pipelineId, 'processing');
    }

    // ============================================================================
    // Job Execution
    // ============================================================================

    /**
     * Выполняет одну job с поддержкой retry
     */
    private async executeJob(
        pipelineId: string,
        jobInPipeline: JobInPipeline,
        jobIndex: number,
        ctx: PipelineExecutionContext,
    ): Promise<
        | { success: true; jobDef: JobInPipeline['job']; artifact: unknown; jobIndex: number }
        | { success: false; jobDef: JobInPipeline['job']; error: string; jobIndex: number }
    > {
        const { job: jobDef, synapses, retries = 0, retryDelay = 1000 } = jobInPipeline;

        const jobInput = synapses ? synapses(ctx.mapperContext) : ctx.defaultInput;
        const options = ctx.jobOptions[jobDef.name];

        await this.storage.updateJobInput(pipelineId, jobIndex, jobInput, options);

        if (retries > 0) {
            await this.storage.updateJobRetryCount(pipelineId, jobIndex, 0, retries);
        }

        const context: JobContext = {
            pipelineId,
            jobIndex,
            logger: {
                info: (msg, data) =>
                    this.logger.info(msg, { pipelineId, jobName: jobDef.name, ...data }),
                error: (msg, data) =>
                    this.logger.error(msg, { pipelineId, jobName: jobDef.name, ...data }),
                warn: (msg, data) =>
                    this.logger.warn(msg, { pipelineId, jobName: jobDef.name, ...data }),
            },
        };

        for (let attempt = 0; attempt <= retries; attempt++) {
            if (attempt > 0) {
                this.logger.warn(`Retrying job (attempt ${attempt + 1}/${retries + 1})`, {
                    pipelineId,
                    jobName: jobDef.name,
                    retryDelay,
                });

                await delay(retryDelay);
                await this.storage.updateJobRetryCount(pipelineId, jobIndex, attempt, retries);
                await this.storage.updateJobStatus(pipelineId, jobIndex, 'processing');
            }

            try {
                const artifact = await jobDef.execute(jobInput, options, context);
                await this.storage.updateJobArtifact(pipelineId, jobIndex, artifact, new Date());
                return { success: true as const, jobDef, artifact, jobIndex };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
                const errorStack = error instanceof Error ? error.stack : undefined;
                const isFinal = attempt >= retries;

                this.logger.error(`Job execution failed (attempt ${attempt + 1}/${retries + 1})`, {
                    pipelineId,
                    jobName: jobDef.name,
                    error: errorMessage,
                    hasRetries: !isFinal,
                });

                await this.storage.appendJobError(
                    pipelineId,
                    jobIndex,
                    { message: errorMessage, stack: errorStack, attempt },
                    isFinal,
                    isFinal ? new Date() : undefined,
                );

                if (!isFinal) continue;

                return { success: false as const, jobDef, error: errorMessage, jobIndex };
            }
        }

        return { success: false as const, jobDef, error: 'Unknown error', jobIndex };
    }

    /**
     * Получает статус пайплайна
     */
    async getStatus(pipelineId: string): Promise<PipelineStatusResponse> {
        const pipeline = await this.storage.findById(pipelineId);

        if (!pipeline) {
            throw new Error(`Pipeline ${pipelineId} not found`);
        }

        const config = this.getPipelineConfig(pipeline.pipelineType);
        const flat = flattenStages(config.stages);

        const currentJob = pipeline.jobs[pipeline.currentJobIndex];

        // Группируем jobs по stageIndex на основе конфигурации
        const stagesMap = new Map<
            number,
            Array<{
                name: string;
                status: JobStatus;
                startedAt?: Date;
                finishedAt?: Date;
                errors: JobError[];
                retryCount?: number;
                maxRetries?: number;
            }>
        >();

        flat.forEach(({ stageIndex }, idx) => {
            const jobState = pipeline.jobs[idx];
            if (!jobState) return;
            const bucket = stagesMap.get(stageIndex) ?? [];
            bucket.push({
                name: jobState.name,
                status: jobState.status,
                startedAt: jobState.startedAt,
                finishedAt: jobState.finishedAt,
                errors: jobState.errors ?? [],
                retryCount: jobState.retryCount,
                maxRetries: jobState.maxRetries,
            });
            stagesMap.set(stageIndex, bucket);
        });

        const stages = Array.from(stagesMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([, jobs]) => ({ jobs }));

        const response: PipelineStatusResponse = {
            pipelineId: pipeline.pipelineId,
            pipelineType: pipeline.pipelineType,
            status: pipeline.status,
            currentJobIndex: pipeline.currentJobIndex,
            totalJobs: pipeline.jobs.length,
            currentJobName: currentJob?.name,
            stages,
        };

        if (pipeline.status === 'error') {
            const errorJob = pipeline.jobs.find((j) => j.status === 'error');
            if (errorJob) {
                const lastError = errorJob.errors?.at(-1);
                if (lastError) {
                    response.error = {
                        message: lastError.message,
                        jobName: errorJob.name,
                    };
                }
            }
        }

        return response;
    }

    /**
     * Получает результат (артефакт) конкретной job
     * 
     * @param pipelineId - ID пайплайна
     * @param jobName - имя job (опционально, по умолчанию — последняя job)
     */
    async getResult(pipelineId: string, jobName?: string): Promise<PipelineResultResponse> {
        const pipeline = await this.storage.findById(pipelineId);

        if (!pipeline) {
            throw new Error(`Pipeline ${pipelineId} not found`);
        }

        // Находим job: по имени или последнюю
        let job: typeof pipeline.jobs[0] | undefined;

        if (jobName) {
            job = pipeline.jobs.find((j) => j.name === jobName);
            if (!job) {
                throw new Error(`Job "${jobName}" not found in pipeline ${pipelineId}`);
            }
        } else {
            // Последняя job
            job = pipeline.jobs[pipeline.jobs.length - 1];
        }

        return {
            pipelineId,
            jobName: job.name,
            status: job.status,
            artifact: job.status === 'done' ? (job.artifact ?? null) : undefined,
        };
    }

    /**
     * Запускает manual job — переводит её из awaiting_manual в pending
     * и активирует execution loop (пробуждает или запускает заново)
     *
     * @param pipelineId - ID пайплайна
     * @param jobName - имя manual job
     * @param options - опции (onExecutionStart для serverless, если loop нужно перезапустить)
     */
    async runManualJob(
        pipelineId: string,
        jobName: string,
        options?: StartPipelineOptions,
    ): Promise<void> {
        const pipeline = await this.storage.findById(pipelineId);

        if (!pipeline) {
            throw new Error(`Pipeline ${pipelineId} not found`);
        }

        const jobIndex = pipeline.jobs.findIndex((j) => j.name === jobName);
        if (jobIndex === -1) {
            throw new Error(`Job "${jobName}" not found in pipeline ${pipelineId}`);
        }

        const jobState = pipeline.jobs[jobIndex];
        if (jobState.status !== 'awaiting_manual') {
            throw new Error(
                `Job "${jobName}" is not awaiting manual execution (status: ${jobState.status})`,
            );
        }

        // Переводим job в pending
        await this.storage.updateJobStatus(pipelineId, jobIndex, 'pending');

        this.logger.info('Manual job promoted to pending', { pipelineId, jobName });

        // Если pipeline в awaiting_manual — пробуждаем или перезапускаем
        if (pipeline.status === 'awaiting_manual') {
            const resolver = this.manualJobResolvers.get(pipelineId);
            if (resolver) {
                // Execution loop жив — пробуждаем
                this.manualJobResolvers.delete(pipelineId);
                resolver();
            } else if (!this.activePipelines.has(pipelineId)) {
                // Execution loop мёртв (перезапуск сервера) — запускаем заново с первого незавершённого stage,
                // иначе runManualJob для «будущей» manual job (промоут до stage) пропустит более ранние паузы.
                const config = this.getPipelineConfig(pipeline.pipelineType);
                const flat = flattenStages(config.stages);
                const latest = await this.storage.findById(pipelineId);
                if (!latest) {
                    throw new Error(`Pipeline ${pipelineId} not found`);
                }
                const startFromStageIndex = getEarliestIncompleteStageIndex(flat, latest.jobs);

                await this.storage.updateStatus(pipelineId, 'processing');

                const executionPromise = this.executePipeline(
                    pipelineId,
                    pipeline.pipelineType,
                    startFromStageIndex,
                ).catch((error) => {
                    this.logger.error('Pipeline execution failed after manual job', {
                        pipelineId,
                        error,
                    });
                });

                if (options?.onExecutionStart) {
                    options.onExecutionStart(executionPromise);
                }
            }
            // else: loop жив, но ещё не установил resolver — job уже pending,
            // loop подхватит её в следующей итерации
        }
        // Если pipeline ещё processing — loop подхватит job при достижении stage
    }

    /**
     * Перезапускает пайплайн начиная с указанной job
     * 
     * Сбрасывает состояние выбранной job и всех последующих, затем запускает выполнение.
     * Артефакты jobs до точки перезапуска сохраняются и доступны через synapses.
     * 
     * @param pipelineId - ID пайплайна
     * @param fromJobName - имя job, с которой начать перезапуск
     * @param options - опции перезапуска (новые jobOptions, onExecutionStart)
     * 
     * @example
     * ```typescript
     * // Перезапуск с job "transform" с новыми опциями
     * const result = await manager.restartPipelineFromJob(pipelineId, 'transform', {
     *     jobOptions: { transform: { format: 'csv' } },
     *     onExecutionStart: (promise) => waitUntil(promise),
     * });
     * ```
     */
    async restartPipelineFromJob(
        pipelineId: string,
        fromJobName: string,
        options?: RestartPipelineOptions,
    ): Promise<RestartPipelineResponse> {
        const pipeline = await this.storage.findById(pipelineId);

        if (!pipeline) {
            throw new Error(`Pipeline ${pipelineId} not found`);
        }

        // Проверяем, что pipeline не в процессе выполнения
        if (pipeline.status === 'processing' || pipeline.status === 'awaiting_manual') {
            throw new Error(`Pipeline ${pipelineId} is currently ${pipeline.status}, cannot restart`);
        }

        const config = this.getPipelineConfig(pipeline.pipelineType);
        const flat = flattenStages(config.stages);

        // Находим индекс job по имени
        const jobIndex = pipeline.jobs.findIndex((j) => j.name === fromJobName);
        if (jobIndex === -1) {
            throw new Error(`Job "${fromJobName}" not found in pipeline ${pipelineId}`);
        }

        // Находим stageIndex для этой job (для передачи в executePipeline)
        const stageIndex = flat[jobIndex].stageIndex;

        // Собираем индексы jobs для сброса и manual индексы из конфига
        const resetJobIndices = new Set<number>();
        const manualJobIndices = new Set<number>();

        for (let i = 0; i < flat.length; i++) {
            const isManual = flat[i].jobInPipeline.manual === true;

            if (i === jobIndex) {
                resetJobIndices.add(i);
            } else if (flat[i].stageIndex > stageIndex) {
                resetJobIndices.add(i);
            } else if (flat[i].stageIndex === stageIndex) {
                const jobState = pipeline.jobs[i];
                if (jobState?.status !== 'done') {
                    resetJobIndices.add(i);
                }
            }

            if (isManual && resetJobIndices.has(i)) {
                manualJobIndices.add(i);
            }
        }

        // Сбрасываем только нужные jobs (manual jobs получат awaiting_manual)
        await this.storage.resetJobs({
            pipelineId,
            resetJobIndices,
            manualJobIndices,
            jobOptions: options?.jobOptions,
        });

        const jobsToRerun = resetJobIndices.size;

        this.logger.info('Restarting pipeline from job', {
            pipelineId,
            fromJobName,
            fromJobIndex: jobIndex,
            stageIndex,
            jobsToRerun,
        });

        // Создаём promise выполнения с указанием startFromStageIndex
        // executePipeline пропустит jobs со статусом done (они сохранят артефакты)
        const executionPromise = this.executePipeline(
            pipelineId,
            pipeline.pipelineType,
            stageIndex,
        ).catch((error) => {
            this.logger.error('Pipeline restart execution failed', { pipelineId, error });
        });

        // Вызываем callback если передан (для waitUntil в serverless)
        if (options?.onExecutionStart) {
            options.onExecutionStart(executionPromise);
        }

        return {
            pipelineId,
            fromJobName,
            fromJobIndex: jobIndex,
            jobsToRerun,
        };
    }

    /**
     * Получает полное состояние пайплайна
     */
    async getPipeline(pipelineId: string): Promise<PipelineState | null> {
        return this.storage.findById(pipelineId);
    }

    // ============================================================================
    // Stale Jobs Watchdog
    // ============================================================================

    /**
     * Запускает фоновый watchdog, который периодически проверяет и таймаутит
     * "зависшие" джобы — джобы в статусе processing, которые не завершились
     * за указанное время (например, из-за падения процесса).
     * 
     * @param options - опции watchdog
     * 
     * @example
     * ```typescript
     * // Запуск с настройками по умолчанию (проверка раз в минуту, таймаут 20 минут)
     * manager.startStaleJobsWatchdog();
     * 
     * // Запуск с кастомными настройками
     * manager.startStaleJobsWatchdog({
     *     checkIntervalMs: 30000,  // проверка каждые 30 секунд
     *     jobTimeoutMs: 600000,    // таймаут 10 минут
     *     onStaleJobsFound: (count) => console.log(`Timed out ${count} stale jobs`),
     * });
     * 
     * // Остановка при shutdown приложения
     * manager.stopStaleJobsWatchdog();
     * ```
     */
    startStaleJobsWatchdog(options: StaleJobsWatchdogOptions = {}): void {
        // Останавливаем предыдущий watchdog если был запущен
        this.stopStaleJobsWatchdog();

        const checkIntervalMs = options.checkIntervalMs ?? 60_000; // 1 минута
        const jobTimeoutMs = options.jobTimeoutMs ?? 20 * 60_000;  // 20 минут

        this.watchdogOptions = {
            checkIntervalMs,
            jobTimeoutMs,
            onStaleJobsFound: options.onStaleJobsFound,
        };

        this.logger.info('Stale jobs watchdog started', {
            checkIntervalMs,
            jobTimeoutMs,
        });

        // Запускаем периодическую проверку
        this.watchdogTimer = setInterval(() => {
            this.checkStaleJobs().catch((error) => {
                this.logger.error('Stale jobs watchdog error', {
                    error: error instanceof Error ? error.message : String(error),
                });
            });
        }, checkIntervalMs);

        // Делаем unref() чтобы таймер не блокировал завершение процесса
        if (this.watchdogTimer.unref) {
            this.watchdogTimer.unref();
        }
    }

    /**
     * Останавливает фоновый watchdog
     */
    stopStaleJobsWatchdog(): void {
        if (this.watchdogTimer) {
            clearInterval(this.watchdogTimer);
            this.watchdogTimer = null;
            this.watchdogOptions = null;
            this.logger.info('Stale jobs watchdog stopped');
        }
    }

    /**
     * Проверяет возможность стартовать — проверяет есть ли watchdog у storage
     */
    isWatchdogRunning(): boolean {
        return this.watchdogTimer !== null;
    }

    /**
     * Выполняет проверку зависших джоб (вызывается по таймеру)
     */
    private async checkStaleJobs(): Promise<void> {
        if (!this.watchdogOptions) return;

        const timedOutCount = await this.storage.findAndTimeoutStaleJobs(
            this.watchdogOptions.jobTimeoutMs,
        );

        if (timedOutCount > 0) {
            this.logger.warn('Stale jobs timed out', { count: timedOutCount });
            this.watchdogOptions.onStaleJobsFound?.(timedOutCount);
        }
    }

    /**
     * Вручную запустить проверку зависших джоб (полезно для тестов)
     * 
     * @param timeoutMs - таймаут в миллисекундах (по умолчанию 20 минут)
     * @returns количество таймаутнутых джоб
     */
    async timeoutStaleJobs(timeoutMs?: number): Promise<number> {
        return this.storage.findAndTimeoutStaleJobs(timeoutMs);
    }
}



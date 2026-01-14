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
    StartPipelineResponse,
    StartPipelineOptions,
    PipelineStatusResponse,
    PipelineResultResponse,
    PipelineState,
} from './types';

// ============================================================================
// Utilities
// ============================================================================

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
// Pipeline Manager Options
// ============================================================================

export interface PipelineManagerOptions {
    /** Хранилище состояния пайплайнов */
    storage: PipelineStorage;
    /** Логгер (опционально) */
    logger?: JobLogger;
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
    registerPipeline(config: PipelineConfig): void {
        this.pipelineConfigs.set(config.name, config);
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
            status: 'pending' as JobStatus,
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
     */
    private async executePipeline(pipelineId: string, pipelineType: string): Promise<void> {
        const config = this.getPipelineConfig(pipelineType);
        const pipeline = await this.storage.findById(pipelineId);

        if (!pipeline) {
            throw new Error(`Pipeline ${pipelineId} not found`);
        }

        const pipelineInput = pipeline.input;
        let defaultInput: unknown = pipelineInput;
        const jobOptions = pipeline.jobOptions ?? {};

        // Храним артефакты для доступа через synapses
        const artifacts = new Map<string, unknown>();

        // Контекст для synapses (доступ к данным пайплайна)
        const mapperContext: SynapseContext = {
            pipelineInput,
            getArtifact: <T = unknown>(jobName: string): T | undefined => {
                return artifacts.get(jobName) as T | undefined;
            },
        };

        // Индекс job в плоском списке (для обновления статуса)
        let flatJobIndex = 0;

        for (let stageIndex = 0; stageIndex < config.stages.length; stageIndex++) {
            const stage = config.stages[stageIndex];
            const stageJobs = normalizeStage(stage);

            this.logger.info(`Executing stage ${stageIndex + 1}/${config.stages.length}`, {
                pipelineId,
                jobsInStage: stageJobs.length,
                parallel: stageJobs.length > 1,
            });

            // Сохраняем начальные индексы jobs этого stage
            const stageJobIndices = stageJobs.map((_, i) => flatJobIndex + i);

            // Обновляем статус всех jobs stage на processing
            await Promise.all(
                stageJobIndices.map((jobIndex) =>
                    this.storage.updateJobStatus(pipelineId, jobIndex, 'processing', new Date()),
                ),
            );

            // Выполняем все jobs stage параллельно
            const jobPromises = stageJobs.map(async (jobInPipeline, indexInStage) => {
                const { job: jobDef, synapses } = jobInPipeline;
                const jobIndex = stageJobIndices[indexInStage];

                // Подготавливаем input через synapses или используем дефолтный
                const jobInput = synapses ? synapses(mapperContext) : defaultInput;
                const options = jobOptions[jobDef.name];

                // Сохраняем input и options в storage для отображения в UI
                await this.storage.updateJobInput(pipelineId, jobIndex, jobInput, options);

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

                try {
                    const artifact = await jobDef.execute(jobInput, options, context);

                    // Сохраняем артефакт
                    await this.storage.updateJobArtifact(pipelineId, jobIndex, artifact, new Date());

                    return { success: true as const, jobDef, artifact, jobIndex };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
                    const errorStack = error instanceof Error ? error.stack : undefined;

                    await this.storage.updateJobError(
                        pipelineId,
                        jobIndex,
                        { message: errorMessage, stack: errorStack },
                        new Date(),
                    );

                    this.logger.error('Job execution failed', {
                        pipelineId,
                        jobName: jobDef.name,
                        error: errorMessage,
                    });

                    return { success: false as const, jobDef, error: errorMessage, jobIndex };
                }
            });

            const results = await Promise.all(jobPromises);

            // Проверяем, есть ли ошибки
            const failedJobs = results.filter((r) => !r.success);
            if (failedJobs.length > 0) {
                // Помечаем весь пайплайн как error
                await this.storage.updateStatus(pipelineId, 'error');
                return;
            }

            // Сохраняем артефакты в Map для доступа следующими jobs через synapses
            for (const result of results) {
                if (result.success && result.artifact !== null) {
                    artifacts.set(result.jobDef.name, result.artifact);
                }
            }

            // Обновляем defaultInput для следующего stage
            // Если в stage одна job — её артефакт становится defaultInput
            // Если несколько jobs — defaultInput не меняется (следующие jobs используют synapses)
            if (stageJobs.length === 1) {
                const result = results[0];
                if (result.success && result.artifact !== null) {
                    defaultInput = result.artifact;
                }
            }

            // Увеличиваем индекс для следующего stage
            flatJobIndex += stageJobs.length;
        }

        // Все stages выполнены успешно
        await this.storage.updateStatus(pipelineId, 'done');

        this.logger.info('Pipeline completed', { pipelineId, pipelineType });
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
                error?: { message: string; stack?: string };
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
                error: jobState.error,
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
            if (errorJob?.error) {
                response.error = {
                    message: errorJob.error.message,
                    jobName: errorJob.name,
                };
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
     * Получает полное состояние пайплайна
     */
    async getPipeline(pipelineId: string): Promise<PipelineState | null> {
        return this.storage.findById(pipelineId);
    }
}



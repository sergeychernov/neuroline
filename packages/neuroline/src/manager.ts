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
                const { job: jobDef, synapses, retries = 0, retryDelay = 1000 } = jobInPipeline;
                const jobIndex = stageJobIndices[indexInStage];

                // Подготавливаем input через synapses или используем дефолтный
                const jobInput = synapses ? synapses(mapperContext) : defaultInput;
                const options = jobOptions[jobDef.name];

                // Сохраняем input и options в storage для отображения в UI
                await this.storage.updateJobInput(pipelineId, jobIndex, jobInput, options);

                // Сохраняем информацию о ретраях если они настроены
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

                // Выполняем job с поддержкой retry
                for (let attempt = 0; attempt <= retries; attempt++) {
                    // Если это не первая попытка — ждём и обновляем счётчик
                    if (attempt > 0) {
                        this.logger.warn(`Retrying job (attempt ${attempt + 1}/${retries + 1})`, {
                            pipelineId,
                            jobName: jobDef.name,
                            retryDelay,
                        });

                        await delay(retryDelay);
                        await this.storage.updateJobRetryCount(pipelineId, jobIndex, attempt, retries);
                        // Сбрасываем статус обратно на processing для UI (без обновления startedAt)
                        await this.storage.updateJobStatus(pipelineId, jobIndex, 'processing');
                    }

                    try {
                        const artifact = await jobDef.execute(jobInput, options, context);

                        // Сохраняем артефакт
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

                        // Записываем ошибку в историю (isFinal определяет финальный статус)
                        await this.storage.appendJobError(
                            pipelineId,
                            jobIndex,
                            { message: errorMessage, stack: errorStack, attempt },
                            isFinal,
                            isFinal ? new Date() : undefined,
                        );

                        // Если ещё есть ретраи — продолжаем цикл
                        if (!isFinal) {
                            continue;
                        }

                        // Все попытки исчерпаны
                        return { success: false as const, jobDef, error: errorMessage, jobIndex };
                    }
                }

                // Этот код недостижим, но TypeScript требует return
                return { success: false as const, jobDef, error: 'Unknown error', jobIndex };
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



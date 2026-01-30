import type { PipelineState, JobStatus, PipelineStatus, JobError } from './types';

/** Результат пагинированного запроса */
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/** Параметры пагинации */
export interface PaginationParams {
    page?: number;
    limit?: number;
    pipelineType?: string;
}

/**
 * Интерфейс хранилища для состояния пайплайнов
 * Реализации могут использовать MongoDB, Redis, PostgreSQL, in-memory и т.д.
 */
export interface PipelineStorage {
    /**
     * Найти пайплайн по ID
     * @returns состояние пайплайна или null, если не найден
     */
    findById(pipelineId: string): Promise<PipelineState | null>;

    /**
     * Найти все пайплайны с пагинацией
     */
    findAll(params?: PaginationParams): Promise<PaginatedResult<PipelineState>>;

    /**
     * Создать новый пайплайн
     * @returns созданное состояние пайплайна
     */
    create(state: PipelineState): Promise<PipelineState>;

    /**
     * Удалить пайплайн по ID
     * @returns true если удалён, false если не найден
     */
    delete(pipelineId: string): Promise<boolean>;

    /**
     * Обновить статус пайплайна
     */
    updateStatus(pipelineId: string, status: PipelineStatus): Promise<void>;

    /**
     * Обновить статус job
     */
    updateJobStatus(
        pipelineId: string,
        jobIndex: number,
        status: JobStatus,
        startedAt?: Date,
    ): Promise<void>;

    /**
     * Обновить артефакт job (при успешном выполнении)
     */
    updateJobArtifact(
        pipelineId: string,
        jobIndex: number,
        artifact: unknown,
        finishedAt: Date,
    ): Promise<void>;

    /**
     * Добавить ошибку job в историю (при каждом падении, включая промежуточные при ретраях)
     * @param pipelineId - ID пайплайна
     * @param jobIndex - индекс job
     * @param error - информация об ошибке (message, stack, logs, data)
     * @param isFinal - если true, также обновляет статус job на 'error' и finishedAt
     */
    appendJobError(
        pipelineId: string,
        jobIndex: number,
        error: JobError,
        isFinal: boolean,
        finishedAt?: Date,
    ): Promise<void>;

    /**
     * Обновить текущий индекс job
     */
    updateCurrentJobIndex(pipelineId: string, jobIndex: number): Promise<void>;

    /**
     * Обновить входные данные и опции job (при старте выполнения)
     * @param pipelineId - ID пайплайна
     * @param jobIndex - индекс job
     * @param input - входные данные job (результат synapses)
     * @param options - опции job
     */
    updateJobInput(
        pipelineId: string,
        jobIndex: number,
        input: unknown,
        options?: unknown,
    ): Promise<void>;

    /**
     * Обновить счётчик ретраев job
     * @param pipelineId - ID пайплайна
     * @param jobIndex - индекс job
     * @param retryCount - текущий номер попытки (0 = первая)
     * @param maxRetries - максимальное количество ретраев
     */
    updateJobRetryCount(
        pipelineId: string,
        jobIndex: number,
        retryCount: number,
        maxRetries: number,
    ): Promise<void>;

    /**
     * Найти и пометить как error все "зависшие" джобы
     * 
     * Зависшая джоба — это джоба со статусом 'processing', у которой
     * startedAt установлен и прошло больше времени, чем указано в timeoutMs.
     * 
     * Метод также обновляет статус пайплайна на 'error', если в нём есть зависшие джобы.
     * 
     * @param timeoutMs - таймаут в миллисекундах (по умолчанию 20 минут)
     * @returns количество обновлённых джоб
     */
    findAndTimeoutStaleJobs(timeoutMs?: number): Promise<number>;

    /**
     * Сбросить состояние jobs для перезапуска pipeline
     * 
     * Для каждой job из resetJobIndices (или всех, если не указано):
     * - статус → 'pending'
     * - очищаются: artifact, errors, startedAt, finishedAt, retryCount
     * 
     * Также обновляет:
     * - статус pipeline → 'processing'
     * - currentJobIndex → минимальный индекс из resetJobIndices (или 0)
     * - jobOptions (если переданы новые — полностью заменяют существующие)
     */
    resetJobs(options: {
        pipelineId: string;
        /** Индексы jobs для сброса. Если не указано — сбрасываются все jobs */
        resetJobIndices?: Set<number>;
        /** Новые опции для jobs (полностью заменяют существующие) */
        jobOptions?: Record<string, unknown>;
    }): Promise<void>;
}

/**
 * In-memory реализация хранилища для тестирования
 */
export class InMemoryPipelineStorage implements PipelineStorage {
    private readonly pipelines = new Map<string, PipelineState>();

    async findById(pipelineId: string): Promise<PipelineState | null> {
        return this.pipelines.get(pipelineId) ?? null;
    }

    async findAll(params?: PaginationParams): Promise<PaginatedResult<PipelineState>> {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 10;

        let items = Array.from(this.pipelines.values());

        // Фильтрация по типу
        if (params?.pipelineType) {
            items = items.filter(p => p.pipelineType === params.pipelineType);
        }

        // Сортировка по дате создания (новые первыми)
        items.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

        const total = items.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const paginatedItems = items.slice(startIndex, startIndex + limit);

        return {
            items: paginatedItems,
            total,
            page,
            limit,
            totalPages,
        };
    }

    async create(state: PipelineState): Promise<PipelineState> {
        const now = new Date();
        const stateWithTimestamps: PipelineState = {
            ...state,
            createdAt: now,
            updatedAt: now,
        };
        this.pipelines.set(state.pipelineId, stateWithTimestamps);
        return stateWithTimestamps;
    }

    async delete(pipelineId: string): Promise<boolean> {
        return this.pipelines.delete(pipelineId);
    }

    async updateStatus(pipelineId: string, status: PipelineStatus): Promise<void> {
        const pipeline = this.pipelines.get(pipelineId);
        if (pipeline) {
            pipeline.status = status;
            pipeline.updatedAt = new Date();
        }
    }

    async updateJobStatus(
        pipelineId: string,
        jobIndex: number,
        status: JobStatus,
        startedAt?: Date,
    ): Promise<void> {
        const pipeline = this.pipelines.get(pipelineId);
        if (pipeline && pipeline.jobs[jobIndex]) {
            pipeline.jobs[jobIndex].status = status;
            if (startedAt) {
                pipeline.jobs[jobIndex].startedAt = startedAt;
            }
            pipeline.currentJobIndex = jobIndex;
            pipeline.updatedAt = new Date();
        }
    }

    async updateJobArtifact(
        pipelineId: string,
        jobIndex: number,
        artifact: unknown,
        finishedAt: Date,
    ): Promise<void> {
        const pipeline = this.pipelines.get(pipelineId);
        if (pipeline && pipeline.jobs[jobIndex]) {
            pipeline.jobs[jobIndex].status = 'done';
            pipeline.jobs[jobIndex].artifact = artifact;
            pipeline.jobs[jobIndex].finishedAt = finishedAt;
            pipeline.updatedAt = new Date();
        }
    }

    async appendJobError(
        pipelineId: string,
        jobIndex: number,
        error: JobError,
        isFinal: boolean,
        finishedAt?: Date,
    ): Promise<void> {
        const pipeline = this.pipelines.get(pipelineId);
        if (pipeline && pipeline.jobs[jobIndex]) {
            const job = pipeline.jobs[jobIndex];
            // Инициализируем массив если его нет
            if (!job.errors) {
                job.errors = [];
            }
            // Добавляем ошибку в историю
            job.errors.push(error);
            // Если это финальная ошибка — обновляем статус и время
            if (isFinal) {
                job.status = 'error';
                job.finishedAt = finishedAt ?? new Date();
            }
            pipeline.updatedAt = new Date();
        }
    }

    async updateCurrentJobIndex(pipelineId: string, jobIndex: number): Promise<void> {
        const pipeline = this.pipelines.get(pipelineId);
        if (pipeline) {
            pipeline.currentJobIndex = jobIndex;
            pipeline.updatedAt = new Date();
        }
    }

    async updateJobInput(
        pipelineId: string,
        jobIndex: number,
        input: unknown,
        options?: unknown,
    ): Promise<void> {
        const pipeline = this.pipelines.get(pipelineId);
        if (pipeline && pipeline.jobs[jobIndex]) {
            pipeline.jobs[jobIndex].input = input;
            if (options !== undefined) {
                pipeline.jobs[jobIndex].options = options;
            }
            pipeline.updatedAt = new Date();
        }
    }

    async updateJobRetryCount(
        pipelineId: string,
        jobIndex: number,
        retryCount: number,
        maxRetries: number,
    ): Promise<void> {
        const pipeline = this.pipelines.get(pipelineId);
        if (pipeline && pipeline.jobs[jobIndex]) {
            pipeline.jobs[jobIndex].retryCount = retryCount;
            pipeline.jobs[jobIndex].maxRetries = maxRetries;
            pipeline.updatedAt = new Date();
        }
    }

    async findAndTimeoutStaleJobs(timeoutMs = 20 * 60 * 1000): Promise<number> {
        const now = Date.now();
        const cutoffTime = new Date(now - timeoutMs);
        let timedOutCount = 0;

        for (const pipeline of this.pipelines.values()) {
            // Пропускаем уже завершённые пайплайны
            if (pipeline.status !== 'processing') continue;

            let hasTimedOutJob = false;

            for (const job of pipeline.jobs) {
                // Ищем джобы со статусом 'processing', у которых startedAt старше cutoffTime
                if (
                    job.status === 'processing' &&
                    job.startedAt &&
                    new Date(job.startedAt) < cutoffTime
                ) {
                    job.status = 'error';
                    // Добавляем ошибку таймаута в массив errors
                    if (!job.errors) {
                        job.errors = [];
                    }
                    job.errors.push({
                        message: `Job timed out after ${Math.round(timeoutMs / 60000)} minutes`,
                        attempt: job.retryCount ?? 0,
                    });
                    job.finishedAt = new Date();
                    hasTimedOutJob = true;
                    timedOutCount++;
                }
            }

            // Если нашли зависшие джобы — помечаем пайплайн как error
            if (hasTimedOutJob) {
                pipeline.status = 'error';
                pipeline.updatedAt = new Date();
            }
        }

        return timedOutCount;
    }

    async resetJobs(options: {
        pipelineId: string;
        resetJobIndices?: Set<number>;
        jobOptions?: Record<string, unknown>;
    }): Promise<void> {
        const { pipelineId, resetJobIndices, jobOptions } = options;
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline) return;

        // Определяем какие jobs сбрасывать
        const indicesToReset = resetJobIndices ?? new Set(pipeline.jobs.map((_, i) => i));

        // Сбрасываем указанные jobs
        for (const i of indicesToReset) {
            const job = pipeline.jobs[i];
            if (!job) continue;

            job.status = 'pending';
            job.artifact = undefined;
            job.errors = [];
            job.startedAt = undefined;
            job.finishedAt = undefined;
            job.retryCount = undefined;
            job.maxRetries = undefined;
            // input и options сохраняем — они будут перезаписаны при выполнении
        }

        // Обновляем статус pipeline
        pipeline.status = 'processing';
        // currentJobIndex = минимальный индекс из сбрасываемых
        pipeline.currentJobIndex = indicesToReset.size > 0 ? Math.min(...indicesToReset) : 0;

        // Новые jobOptions полностью заменяют существующие
        if (jobOptions) {
            pipeline.jobOptions = jobOptions;
        }

        pipeline.updatedAt = new Date();
    }

    /** Для тестов: очистить все данные */
    clear(): void {
        this.pipelines.clear();
    }

    /** Для тестов: получить все пайплайны */
    getAll(): PipelineState[] {
        return Array.from(this.pipelines.values());
    }
}



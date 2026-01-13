import type { PipelineState, JobStatus, PipelineStatus } from './types';

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
     * Обновить ошибку job (при неудачном выполнении)
     */
    updateJobError(
        pipelineId: string,
        jobIndex: number,
        error: { message: string; stack?: string },
        finishedAt: Date,
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

    async updateJobError(
        pipelineId: string,
        jobIndex: number,
        error: { message: string; stack?: string },
        finishedAt: Date,
    ): Promise<void> {
        const pipeline = this.pipelines.get(pipelineId);
        if (pipeline && pipeline.jobs[jobIndex]) {
            pipeline.jobs[jobIndex].status = 'error';
            pipeline.jobs[jobIndex].error = error;
            pipeline.jobs[jobIndex].finishedAt = finishedAt;
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

    /** Для тестов: очистить все данные */
    clear(): void {
        this.pipelines.clear();
    }

    /** Для тестов: получить все пайплайны */
    getAll(): PipelineState[] {
        return Array.from(this.pipelines.values());
    }
}



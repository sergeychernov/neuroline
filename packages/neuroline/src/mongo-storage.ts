import type { Model, Document } from 'mongoose';

import type { PipelineStorage, PaginationParams, PaginatedResult } from './storage';
import type { PipelineState, JobStatus, PipelineStatus } from './types';

/**
 * Интерфейс состояния job в MongoDB документе
 */
export interface MongoPipelineJobState {
    name: string;
    status: JobStatus;
    /** Входные данные job (результат synapses) */
    input?: unknown;
    /** Опции job */
    options?: unknown;
    artifact?: unknown;
    error?: { message: string; stack?: string };
    startedAt?: Date;
    finishedAt?: Date;
    /** Количество выполненных ретраев */
    retryCount?: number;
    /** Максимальное количество ретраев */
    maxRetries?: number;
}

/**
 * Интерфейс документа пайплайна в MongoDB
 */
export interface MongoPipelineDocument extends Document {
    pipelineId: string;
    pipelineType: string;
    status: PipelineStatus;
    currentJobIndex: number;
    input: unknown;
    jobOptions?: Record<string, unknown>;
    jobs: MongoPipelineJobState[];
    /** Хеш структуры pipeline для инвалидации при изменении конфигурации */
    configHash?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Утилита для санитизации данных перед записью в MongoDB
 * Конвертирует поля с $ в безопасный формат
 */
export const sanitizeForMongo = (value: unknown): unknown => {
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeForMongo(item));
    }

    if (value && typeof value === 'object') {
        // Важно: Date нужно сохранять как Date, иначе Object.entries(new Date()) === []
        // и значение превратится в {}
        if (value instanceof Date) {
            return value;
        }

        const entries = Object.entries(value as Record<string, unknown>);

        // Конвертируем структуры вида { $date: "..." } в Date
        if (entries.length === 1 && entries[0][0] === '$date' && typeof entries[0][1] === 'string') {
            return new Date(entries[0][1]);
        }

        const sanitized: Record<string, unknown> = {};

        for (const [rawKey, rawVal] of entries) {
            const key = rawKey.startsWith('$') ? `_${rawKey.slice(1)}` : rawKey;
            sanitized[key] = sanitizeForMongo(rawVal);
        }

        return sanitized;
    }

    return value;
};

/**
 * MongoDB реализация хранилища пайплайнов
 *
 * @example
 * ```typescript
 * import { MongoPipelineStorage } from 'pipeline-manager/mongo';
 * import { PipelineModel } from './your-schema';
 *
 * const storage = new MongoPipelineStorage(PipelineModel);
 * const manager = new PipelineManager({ storage });
 * ```
 */
export class MongoPipelineStorage implements PipelineStorage {
    constructor(private readonly pipelineModel: Model<MongoPipelineDocument>) { }

    async findById(pipelineId: string): Promise<PipelineState | null> {
        try {
            const doc = await this.pipelineModel.findOne({ pipelineId }).lean().exec();
            if (!doc) return null;

            return {
                pipelineId: doc.pipelineId,
                pipelineType: doc.pipelineType,
                status: doc.status,
                currentJobIndex: doc.currentJobIndex,
                input: doc.input,
                jobOptions: doc.jobOptions as Record<string, unknown> | undefined,
                jobs: doc.jobs.map((j) => ({
                    name: j.name,
                    status: j.status,
                    input: j.input,
                    options: j.options,
                    artifact: j.artifact,
                    error: j.error,
                    startedAt: j.startedAt,
                    finishedAt: j.finishedAt,
                    retryCount: j.retryCount,
                    maxRetries: j.maxRetries,
                })),
                configHash: doc.configHash,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        } catch (error) {
            throw new Error(
                `Failed to find pipeline by ID "${pipelineId}": ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    async findAll(params?: PaginationParams): Promise<PaginatedResult<PipelineState>> {
        try {
            const page = params?.page ?? 1;
            const limit = params?.limit ?? 10;
            const skip = (page - 1) * limit;

            const filter: Record<string, unknown> = {};
            if (params?.pipelineType) {
                filter.pipelineType = params.pipelineType;
            }

            const [docs, total] = await Promise.all([
                this.pipelineModel
                    .find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean()
                    .exec(),
                this.pipelineModel.countDocuments(filter).exec(),
            ]);

            const items: PipelineState[] = docs.map((doc) => ({
                pipelineId: doc.pipelineId,
                pipelineType: doc.pipelineType,
                status: doc.status,
                currentJobIndex: doc.currentJobIndex,
                input: doc.input,
                jobOptions: doc.jobOptions as Record<string, unknown> | undefined,
                jobs: doc.jobs.map((j) => ({
                    name: j.name,
                    status: j.status,
                    input: j.input,
                    options: j.options,
                    artifact: j.artifact,
                    error: j.error,
                    startedAt: j.startedAt,
                    finishedAt: j.finishedAt,
                    retryCount: j.retryCount,
                    maxRetries: j.maxRetries,
                })),
                configHash: doc.configHash,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            }));

            return {
                items,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            const filterDesc = params?.pipelineType ? ` with filter pipelineType="${params.pipelineType}"` : '';
            throw new Error(
                `Failed to fetch pipelines${filterDesc} (page ${params?.page ?? 1}, limit ${params?.limit ?? 10}): ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    async create(state: PipelineState): Promise<PipelineState> {
        try {
            const jobs: MongoPipelineJobState[] = state.jobs.map((j) => ({
                name: j.name,
                status: j.status as JobStatus,
            }));

            const doc = await this.pipelineModel.create({
                pipelineId: state.pipelineId,
                pipelineType: state.pipelineType,
                status: state.status,
                currentJobIndex: state.currentJobIndex,
                input: sanitizeForMongo(state.input),
                jobOptions: state.jobOptions ? sanitizeForMongo(state.jobOptions) : undefined,
                jobs,
                configHash: state.configHash,
            });

            return {
                ...state,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        } catch (error) {
            // Check for duplicate key error (code 11000)
            if (error instanceof Error && 'code' in error && error.code === 11000) {
                throw new Error(
                    `Pipeline with ID "${state.pipelineId}" already exists. Use a unique pipeline ID.`,
                );
            }
            throw new Error(
                `Failed to create pipeline "${state.pipelineId}" of type "${state.pipelineType}": ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    async delete(pipelineId: string): Promise<boolean> {
        try {
            const result = await this.pipelineModel.deleteOne({ pipelineId }).exec();
            return result.deletedCount > 0;
        } catch (error) {
            throw new Error(
                `Failed to delete pipeline "${pipelineId}": ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    async updateStatus(pipelineId: string, status: PipelineStatus): Promise<void> {
        try {
            const result = await this.pipelineModel.updateOne({ pipelineId }, { status }).exec();
            if (result.matchedCount === 0) {
                throw new Error(`Pipeline "${pipelineId}" not found`);
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw error;
            }
            throw new Error(
                `Failed to update status for pipeline "${pipelineId}" to "${status}": ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    async updateJobStatus(
        pipelineId: string,
        jobIndex: number,
        status: JobStatus,
        startedAt?: Date,
    ): Promise<void> {
        try {
            const update: Record<string, unknown> = {
                [`jobs.${jobIndex}.status`]: status,
                currentJobIndex: jobIndex,
            };

            if (startedAt) {
                update[`jobs.${jobIndex}.startedAt`] = startedAt;
            }

            const result = await this.pipelineModel.updateOne({ pipelineId }, update).exec();
            if (result.matchedCount === 0) {
                throw new Error(`Pipeline "${pipelineId}" not found`);
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw error;
            }
            throw new Error(
                `Failed to update job ${jobIndex} status to "${status}" for pipeline "${pipelineId}": ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    async updateJobArtifact(
        pipelineId: string,
        jobIndex: number,
        artifact: unknown,
        finishedAt: Date,
    ): Promise<void> {
        try {
            const result = await this.pipelineModel
                .updateOne(
                    { pipelineId },
                    {
                        [`jobs.${jobIndex}.status`]: 'done',
                        [`jobs.${jobIndex}.artifact`]: sanitizeForMongo(artifact),
                        [`jobs.${jobIndex}.finishedAt`]: finishedAt,
                    },
                )
                .exec();
            if (result.matchedCount === 0) {
                throw new Error(`Pipeline "${pipelineId}" not found`);
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw error;
            }
            throw new Error(
                `Failed to update job ${jobIndex} artifact for pipeline "${pipelineId}": ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    async updateJobError(
        pipelineId: string,
        jobIndex: number,
        error: { message: string; stack?: string },
        finishedAt: Date,
    ): Promise<void> {
        try {
            const result = await this.pipelineModel
                .updateOne(
                    { pipelineId },
                    {
                        [`jobs.${jobIndex}.status`]: 'error',
                        [`jobs.${jobIndex}.error`]: error,
                        [`jobs.${jobIndex}.finishedAt`]: finishedAt,
                    },
                )
                .exec();
            if (result.matchedCount === 0) {
                throw new Error(`Pipeline "${pipelineId}" not found`);
            }
        } catch (dbError) {
            if (dbError instanceof Error && dbError.message.includes('not found')) {
                throw dbError;
            }
            throw new Error(
                `Failed to update job ${jobIndex} error for pipeline "${pipelineId}": ${dbError instanceof Error ? dbError.message : String(dbError)}`,
            );
        }
    }

    async updateCurrentJobIndex(pipelineId: string, jobIndex: number): Promise<void> {
        try {
            const result = await this.pipelineModel.updateOne({ pipelineId }, { currentJobIndex: jobIndex }).exec();
            if (result.matchedCount === 0) {
                throw new Error(`Pipeline "${pipelineId}" not found`);
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw error;
            }
            throw new Error(
                `Failed to update current job index to ${jobIndex} for pipeline "${pipelineId}": ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    async updateJobInput(
        pipelineId: string,
        jobIndex: number,
        input: unknown,
        options?: unknown,
    ): Promise<void> {
        try {
            const update: Record<string, unknown> = {
                [`jobs.${jobIndex}.input`]: sanitizeForMongo(input),
            };

            if (options !== undefined) {
                update[`jobs.${jobIndex}.options`] = sanitizeForMongo(options);
            }

            const result = await this.pipelineModel.updateOne({ pipelineId }, update).exec();
            if (result.matchedCount === 0) {
                throw new Error(`Pipeline "${pipelineId}" not found`);
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw error;
            }
            throw new Error(
                `Failed to update job ${jobIndex} input for pipeline "${pipelineId}": ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    async updateJobRetryCount(
        pipelineId: string,
        jobIndex: number,
        retryCount: number,
        maxRetries: number,
    ): Promise<void> {
        try {
            const result = await this.pipelineModel
                .updateOne(
                    { pipelineId },
                    {
                        [`jobs.${jobIndex}.retryCount`]: retryCount,
                        [`jobs.${jobIndex}.maxRetries`]: maxRetries,
                    },
                )
                .exec();
            if (result.matchedCount === 0) {
                throw new Error(`Pipeline "${pipelineId}" not found`);
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                throw error;
            }
            throw new Error(
                `Failed to update job ${jobIndex} retry count (${retryCount}/${maxRetries}) for pipeline "${pipelineId}": ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    async findAndTimeoutStaleJobs(timeoutMs = 20 * 60 * 1000): Promise<number> {
        try {
            const cutoffTime = new Date(Date.now() - timeoutMs);
            const errorMessage = `Job timed out after ${Math.round(timeoutMs / 60000)} minutes`;
            const now = new Date();

            // Находим все processing пайплайны с зависшими джобами
            // и обновляем их за один запрос используя arrayFilters
            const result = await this.pipelineModel
                .updateMany(
                    {
                        status: 'processing',
                        jobs: {
                            $elemMatch: {
                                status: 'processing',
                                startedAt: { $lt: cutoffTime },
                            },
                        },
                    },
                    {
                        $set: {
                            status: 'error',
                            'jobs.$[staleJob].status': 'error',
                            'jobs.$[staleJob].error': { message: errorMessage },
                            'jobs.$[staleJob].finishedAt': now,
                        },
                    },
                    {
                        arrayFilters: [
                            {
                                'staleJob.status': 'processing',
                                'staleJob.startedAt': { $lt: cutoffTime },
                            },
                        ],
                    },
                )
                .exec();

            return result.modifiedCount;
        } catch (error) {
            throw new Error(
                `Failed to find and timeout stale jobs (timeout: ${Math.round(timeoutMs / 60000)} minutes): ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
}


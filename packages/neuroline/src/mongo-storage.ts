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
            })),
            configHash: doc.configHash,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        };
    }

    async findAll(params?: PaginationParams): Promise<PaginatedResult<PipelineState>> {
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
    }

    async create(state: PipelineState): Promise<PipelineState> {
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
    }

    async delete(pipelineId: string): Promise<boolean> {
        const result = await this.pipelineModel.deleteOne({ pipelineId }).exec();
        return result.deletedCount > 0;
    }

    async updateStatus(pipelineId: string, status: PipelineStatus): Promise<void> {
        await this.pipelineModel.updateOne({ pipelineId }, { status }).exec();
    }

    async updateJobStatus(
        pipelineId: string,
        jobIndex: number,
        status: JobStatus,
        startedAt?: Date,
    ): Promise<void> {
        const update: Record<string, unknown> = {
            [`jobs.${jobIndex}.status`]: status,
            currentJobIndex: jobIndex,
        };

        if (startedAt) {
            update[`jobs.${jobIndex}.startedAt`] = startedAt;
        }

        await this.pipelineModel.updateOne({ pipelineId }, update).exec();
    }

    async updateJobArtifact(
        pipelineId: string,
        jobIndex: number,
        artifact: unknown,
        finishedAt: Date,
    ): Promise<void> {
        await this.pipelineModel
            .updateOne(
                { pipelineId },
                {
                    [`jobs.${jobIndex}.status`]: 'done',
                    [`jobs.${jobIndex}.artifact`]: sanitizeForMongo(artifact),
                    [`jobs.${jobIndex}.finishedAt`]: finishedAt,
                },
            )
            .exec();
    }

    async updateJobError(
        pipelineId: string,
        jobIndex: number,
        error: { message: string; stack?: string },
        finishedAt: Date,
    ): Promise<void> {
        await this.pipelineModel
            .updateOne(
                { pipelineId },
                {
                    [`jobs.${jobIndex}.status`]: 'error',
                    [`jobs.${jobIndex}.error`]: error,
                    [`jobs.${jobIndex}.finishedAt`]: finishedAt,
                },
            )
            .exec();
    }

    async updateCurrentJobIndex(pipelineId: string, jobIndex: number): Promise<void> {
        await this.pipelineModel.updateOne({ pipelineId }, { currentJobIndex: jobIndex }).exec();
    }

    async updateJobInput(
        pipelineId: string,
        jobIndex: number,
        input: unknown,
        options?: unknown,
    ): Promise<void> {
        const update: Record<string, unknown> = {
            [`jobs.${jobIndex}.input`]: sanitizeForMongo(input),
        };

        if (options !== undefined) {
            update[`jobs.${jobIndex}.options`] = sanitizeForMongo(options);
        }

        await this.pipelineModel.updateOne({ pipelineId }, update).exec();
    }
}


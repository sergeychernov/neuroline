import { Schema as MongooseSchema } from 'mongoose';

import type { MongoPipelineDocument, MongoPipelineJobState } from './mongo-storage';

/**
 * Mongoose схема состояния job
 */
export const PipelineJobStateSchema = new MongooseSchema<MongoPipelineJobState>(
    {
        name: { type: String, required: true },
        status: {
            type: String,
            required: true,
            enum: ['pending', 'processing', 'done', 'error'],
        },
        /** Входные данные job (результат synapses) */
        input: { type: MongooseSchema.Types.Mixed },
        /** Опции job */
        options: { type: MongooseSchema.Types.Mixed },
        artifact: { type: MongooseSchema.Types.Mixed },
        /** История ошибок (включая промежуточные при ретраях) */
        errors: {
            type: [
                new MongooseSchema(
                    {
                        message: { type: String, required: true },
                        stack: { type: String },
                        attempt: { type: Number },
                        /** Логи выполнения до момента ошибки */
                        logs: { type: [String] },
                        /** Дополнительные данные для отладки */
                        data: { type: MongooseSchema.Types.Mixed },
                    },
                    { _id: false },
                ),
            ],
            default: [],
        },
        startedAt: { type: Date },
        finishedAt: { type: Date },
        /** Количество выполненных ретраев */
        retryCount: { type: Number },
        /** Максимальное количество ретраев */
        maxRetries: { type: Number },
    },
    { _id: false },
);

/**
 * Mongoose схема документа пайплайна
 *
 * @example
 * ```typescript
 * import mongoose from 'mongoose';
 * import { PipelineSchema, MongoPipelineDocument } from 'pipeline-manager/mongo';
 *
 * const PipelineModel = mongoose.model<MongoPipelineDocument>('Pipeline', PipelineSchema);
 * ```
 */
export const PipelineSchema = new MongooseSchema<MongoPipelineDocument>(
    {
        /** ID пайплайна (хеш от входных данных) */
        pipelineId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        /** Тип пайплайна (имя конфигурации) */
        pipelineType: {
            type: String,
            required: true,
            index: true,
        },
        /** Статус всего пайплайна */
        status: {
            type: String,
            required: true,
            enum: ['processing', 'done', 'error'],
        },
        /** Индекс текущей job (0-based) */
        currentJobIndex: {
            type: Number,
            required: true,
            default: 0,
        },
        /** Входные данные пайплайна */
        input: {
            type: MongooseSchema.Types.Mixed,
            required: true,
        },
        /** Опции для jobs */
        jobOptions: {
            type: MongooseSchema.Types.Mixed,
        },
        /** Состояния всех jobs */
        jobs: {
            type: [PipelineJobStateSchema],
            required: true,
        },
        /** Хеш структуры pipeline для инвалидации при изменении конфигурации */
        configHash: {
            type: String,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: true },
    },
);

// Составной индекс для быстрого поиска по типу и статусу
PipelineSchema.index({ pipelineType: 1, status: 1 });

// Индекс для сортировки по дате создания (используется в findAll)
PipelineSchema.index({ createdAt: -1 });

// Составной индекс для фильтрации по статусу с сортировкой по дате
// Оптимизирует запросы типа: find({ status: 'processing' }).sort({ createdAt: -1 })
PipelineSchema.index({ status: 1, createdAt: -1 });

// Критичный индекс для watchdog запросов (findAndTimeoutStaleJobs)
// Ускоряет поиск зависших jobs в активных пайплайнах
PipelineSchema.index({ status: 1, 'jobs.status': 1, 'jobs.startedAt': 1 });

// Partial index для оптимизации watchdog - индексирует только активные пайплайны
// Экономит ~60% места в индексе, так как большинство пайплайнов уже завершены
PipelineSchema.index(
    { 'jobs.status': 1, 'jobs.startedAt': 1 },
    {
        partialFilterExpression: { status: 'processing' },
        name: 'processing_jobs_watchdog',
    },
);


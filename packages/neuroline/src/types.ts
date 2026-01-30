/**
 * Pipeline Manager - базовые типы
 * Не зависит от NestJS, MongoDB или других фреймворков
 */

// ============================================================================
// Job Types
// ============================================================================

/** Статус отдельной job */
export type JobStatus = 'pending' | 'processing' | 'done' | 'error';

/** Статус всего пайплайна */
export type PipelineStatus = 'processing' | 'done' | 'error';

/**
 * Логгер для job
 */
export interface JobLogger {
    info: (msg: string, data?: Record<string, unknown>) => void;
    error: (msg: string, data?: Record<string, unknown>) => void;
    warn: (msg: string, data?: Record<string, unknown>) => void;
}

/**
 * Контекст выполнения job — только метаданные и логгер
 * Job не имеет доступа к pipelineInput и артефактам напрямую
 */
export interface JobContext {
    /** ID пайплайна */
    pipelineId: string;
    /** Индекс текущей job */
    jobIndex: number;
    /** Логгер */
    logger: JobLogger;
}

/**
 * Определение job — чистая функция, легко тестируемая
 * TInput - тип входных данных
 * TOutput - тип выходных данных (артефакт)
 * TOptions - тип опций для этой job
 */
export interface JobDefinition<TInput = unknown, TOutput = unknown, TOptions = unknown> {
    /** Уникальное имя job */
    name: string;
    /**
     * Функция выполнения job
     * @param input - входные данные (подготовленные через synapses)
     * @param options - опции для этой job
     * @param context - контекст выполнения (логгер, метаданные)
     * @returns артефакт или null, если job не возвращает результат
     */
    execute: (input: TInput, options: TOptions | undefined, context: JobContext) => Promise<TOutput | null>;
}

// ============================================================================
// Synapse Types
// ============================================================================

/**
 * Контекст для synapses — доступ к данным пайплайна
 */
export interface SynapseContext<TPipelineInput = unknown> {
    /** Исходные входные данные пайплайна */
    pipelineInput: TPipelineInput;
    /**
     * Получить артефакт предыдущей job по имени
     * @returns артефакт или undefined, если job не найдена или ещё не выполнена
     */
    getArtifact: <T = unknown>(jobName: string) => T | undefined;
}

/**
 * Job в конфигурации pipeline с опциональным маппером входных данных
 */
export interface JobInPipeline<TInput = unknown, TOutput = unknown, TOptions = unknown> {
    /** Определение job */
    job: JobDefinition<TInput, TOutput, TOptions>;
    /**
     * Функция подготовки входных данных для job
     * Если не указана, job получает pipelineInput (для первого stage) или артефакт предыдущей job
     */
    synapses?: (ctx: SynapseContext) => TInput;
    /**
     * Количество повторных попыток при ошибке (по умолчанию 0 — без ретраев)
     */
    retries?: number;
    /**
     * Задержка между ретраями в миллисекундах (по умолчанию 1000)
     */
    retryDelay?: number;
}

// ============================================================================
// Stage Types
// ============================================================================

/**
 * Элемент stage — job или job с маппером
 * - JobDefinition: job без маппера (получает дефолтный input)
 * - JobInPipeline: job с кастомным synapses
 */
export type StageItem = JobDefinition | JobInPipeline;

/**
 * Stage пайплайна - один элемент или массив для параллельного выполнения
 * - StageItem: одиночная job
 * - StageItem[]: массив jobs, выполняемых параллельно
 */
export type PipelineStage = StageItem | StageItem[];

// ============================================================================
// Pipeline Config Types
// ============================================================================

/** Конфигурация пайплайна */
export interface PipelineConfig<TInput = unknown> {
    /** Уникальное имя типа пайплайна */
    name: string;
    /**
     * Stages пайплайна (выполняются последовательно)
     * Каждый stage может быть:
     * - одной job/JobInPipeline
     * - массивом jobs/JobInPipeline (выполняются параллельно внутри stage)
     */
    stages: PipelineStage[];
    /** Функция для вычисления хеша входных данных */
    computeInputHash?: (input: TInput) => string;
}

/** Входные данные для запуска пайплайна */
export interface PipelineInput<TData = unknown, TJobOptions = Record<string, unknown>> {
    /** Входные данные пайплайна */
    data: TData;
    /** Опции для каждой job (ключ - имя job) */
    jobOptions?: TJobOptions;
}

/** Опции для запуска пайплайна */
export interface StartPipelineOptions {
    /**
     * Callback вызываемый при старте выполнения pipeline
     * Используется для интеграции с waitUntil() в serverless окружениях
     *
     * @example
     * ```typescript
     * // Next.js App Router с waitUntil
     * import { waitUntil } from 'next/server';
     *
     * manager.startPipeline(type, input, {
     *   onExecutionStart: (promise) => waitUntil(promise)
     * });
     * ```
     */
    onExecutionStart?: (executionPromise: Promise<void>) => void;
}

/** Опции для перезапуска пайплайна с определённой job */
export interface RestartPipelineOptions {
    /**
     * Callback вызываемый при старте выполнения pipeline
     * Используется для интеграции с waitUntil() в serverless окружениях
     */
    onExecutionStart?: (executionPromise: Promise<void>) => void;
    /**
     * Новые опции для jobs (полностью заменяют существующие)
     * Ключ — имя job, значение — опции
     */
    jobOptions?: Record<string, unknown>;
}

/** Ответ на перезапуск пайплайна */
export interface RestartPipelineResponse {
    /** ID пайплайна */
    pipelineId: string;
    /** Имя job, с которой начат перезапуск */
    fromJobName: string;
    /** Индекс job в плоском списке */
    fromJobIndex: number;
    /** Количество jobs, которые будут перезапущены */
    jobsToRerun: number;
}

/**
 * Body для запуска pipeline с явными jobOptions (admin endpoint)
 * 
 * Используется в:
 * - API endpoint: POST /<path>?action=startWithOptions
 * - Клиент: client.startWithOptions({ input, jobOptions })
 */
export interface StartWithOptionsBody<TInput = unknown> {
    /** Входные данные pipeline */
    input: TInput;
    /** Опции для jobs (ключ — имя job) */
    jobOptions?: Record<string, unknown>;
}

// ============================================================================
// Job State Types (для хранилища)
// ============================================================================

/**
 * Информация об ошибке выполнения job
 */
export interface JobError {
    /** Сообщение об ошибке */
    message: string;
    /** Stack trace ошибки */
    stack?: string;
    /** Номер попытки (0 = первая) */
    attempt?: number;
    /** Логи выполнения до момента ошибки */
    logs?: string[];
    /** Дополнительные данные для отладки */
    data?: unknown;
}

/**
 * Состояние отдельной job в документе пайплайна
 * @template TInput - тип входных данных job (результат synapses)
 * @template TOutput - тип артефакта (результат выполнения)
 * @template TOptions - тип опций job
 */
export interface JobState<TInput = unknown, TOutput = unknown, TOptions = unknown> {
    /** Имя job */
    name: string;
    /** Статус выполнения */
    status: JobStatus;
    /** Входные данные job (результат synapses или дефолтный input) */
    input?: TInput;
    /** Опции job */
    options?: TOptions;
    /** Артефакт (результат выполнения) */
    artifact?: TOutput;
    /** История ошибок (пустой массив, если ошибок нет) */
    errors: Array<JobError>;
    /** Время начала выполнения */
    startedAt?: Date;
    /** Время завершения */
    finishedAt?: Date;
    /** Количество выполненных ретраев (0 = первая попытка) */
    retryCount?: number;
    /** Максимальное количество ретраев для этой job */
    maxRetries?: number;
}

/** Состояние пайплайна (для хранилища) */
export interface PipelineState {
    /** ID пайплайна */
    pipelineId: string;
    /** Тип пайплайна */
    pipelineType: string;
    /** Статус пайплайна */
    status: PipelineStatus;
    /** Индекс текущей job */
    currentJobIndex: number;
    /** Входные данные */
    input: unknown;
    /** Опции для jobs */
    jobOptions?: Record<string, unknown>;
    /** Состояния всех jobs */
    jobs: JobState[];
    /**
     * Хеш структуры pipeline (имена jobs в порядке выполнения)
     * Используется для инвалидации при изменении конфигурации
     */
    configHash?: string;
    /** Время создания */
    createdAt?: Date;
    /** Время обновления */
    updatedAt?: Date;
}

// ============================================================================
// Response Types
// ============================================================================

/** Ответ на запуск пайплайна */
export interface StartPipelineResponse {
    /** ID пайплайна (хеш от входных данных) */
    pipelineId: string;
    /** Был ли пайплайн создан заново или уже существовал */
    isNew: boolean;
}

/** Ответ на запрос статуса пайплайна */
export interface PipelineStatusResponse {
    /** ID пайплайна */
    pipelineId: string;
    /** Тип пайплайна */
    pipelineType: string;
    /** Статус пайплайна */
    status: PipelineStatus;
    /** Индекс текущей job (0-based) */
    currentJobIndex: number;
    /** Общее количество jobs */
    totalJobs: number;
    /** Имя текущей job */
    currentJobName?: string;
    /** Группировка jobs по stage (без индексных полей) */
    stages: Array<{
        jobs: Array<{
            name: string;
            status: JobStatus;
            startedAt?: Date;
            finishedAt?: Date;
            /** История ошибок (пустой массив, если ошибок нет) */
            errors: Array<JobError>;
            /** Количество выполненных ретраев */
            retryCount?: number;
            /** Максимальное количество ретраев для этой job */
            maxRetries?: number;
        }>;
    }>;
    /** Информация об ошибке (если status === 'error') */
    error?: { message: string; jobName?: string };
}

/** Ответ на запрос результата job */
export interface PipelineResultResponse<T = unknown> {
    /** ID пайплайна */
    pipelineId: string;
    /** Имя job */
    jobName: string;
    /** Статус job */
    status: JobStatus;
    /**
     * Артефакт job
     * - undefined: job ещё выполняется или в очереди
     * - null: job завершена, но не возвращает результат
     * - значение: артефакт job
     */
    artifact: T | null | undefined;
}

/**
 * Ответ на запрос деталей job
 */
export interface JobDetailsResponse {
    /** Имя job */
    name: string;
    /** Статус job */
    status: JobStatus;
    /** Входные данные job */
    input?: unknown;
    /** Опции job */
    options?: unknown;
    /** Артефакт job */
    artifact?: unknown;
    /** История ошибок (пустой массив, если ошибок нет) */
    errors: JobError[];
    /** Время начала выполнения */
    startedAt?: Date;
    /** Время завершения */
    finishedAt?: Date;
}



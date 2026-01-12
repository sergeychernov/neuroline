import type { PipelineManager, PipelineConfig } from 'neuroline';

/**
 * Конфигурация для Next.js хендлеров
 */
export interface NextjsPipelineOptions {
  /** PipelineManager инстанс */
  manager: PipelineManager;
  /** Зарегистрированные pipeline конфигурации */
  pipelines: PipelineConfig[];
}

/**
 * Тело запроса для запуска pipeline
 */
export interface StartPipelineBody {
  /** Тип pipeline (имя из конфигурации) */
  pipelineType: string;
  /** Входные данные */
  input: unknown;
  /** Опции для jobs */
  jobOptions?: Record<string, unknown>;
}

/**
 * Query параметры для статуса
 */
export interface StatusQuery {
  id: string;
}

/**
 * Query параметры для результатов
 */
export interface ResultQuery {
  id: string;
}

/**
 * Query параметры для списка
 */
export interface ListQuery {
  page?: string;
  limit?: string;
  pipelineType?: string;
}

/**
 * Стандартный ответ API
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}


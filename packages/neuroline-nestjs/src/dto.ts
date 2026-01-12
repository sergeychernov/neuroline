/**
 * DTO для API endpoints
 */

/**
 * DTO для запуска pipeline
 */
export class StartPipelineDto {
  /** Тип pipeline */
  pipelineType!: string;
  /** Входные данные */
  input!: unknown;
  /** Опции для jobs */
  jobOptions?: Record<string, unknown>;
}

/**
 * DTO для query параметров пагинации
 */
export class ListQueryDto {
  /** Номер страницы */
  page?: string;
  /** Количество на странице */
  limit?: string;
  /** Фильтр по типу pipeline */
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


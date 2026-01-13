/**
 * DTO для API endpoints
 */

/**
 * Body для запуска pipeline
 */
export interface StartPipelineBody {
	/** Входные данные */
	input: unknown;
	/** Опции для jobs */
	jobOptions?: Record<string, unknown>;
}

/**
 * Стандартный ответ API
 */
export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

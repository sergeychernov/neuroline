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
 * Query параметры для GET запросов
 */
export interface GetQueryParams {
	/** Действие: status, result, job, pipeline, list */
	action?: string;
	/** ID pipeline */
	id?: string;
	/** Имя job (для action=job и action=result) */
	jobName?: string;
	/** Номер страницы (для action=list) */
	page?: string;
	/** Количество элементов на странице (для action=list) */
	limit?: string;
}

/**
 * Стандартный ответ API
 */
export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

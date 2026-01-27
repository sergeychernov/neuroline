import type { JobDetailsResponse, StartWithOptionsBody } from 'neuroline';

// Реэкспорт из core для удобства
export type { StartWithOptionsBody };

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
 * Query параметры для данных job
 */
export interface JobQuery {
	id: string;
	jobName: string;
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

export type { JobDetailsResponse };

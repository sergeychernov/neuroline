import type { JobStatus } from 'neuroline';

/**
 * Тело запроса для запуска pipeline
 */
export interface StartPipelineBody {
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

/**
 * Данные job для ответа API
 */
export interface JobDetailsResponse {
	name: string;
	status: JobStatus;
	input?: unknown;
	options?: unknown;
	artifact?: unknown;
	error?: { message: string; stack?: string };
	startedAt?: Date;
	finishedAt?: Date;
}

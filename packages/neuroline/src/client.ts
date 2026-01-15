/**
 * Neuroline Client
 * Клиентский модуль для работы с Pipeline API через polling
 */

// ============================================================================
// Types
// ============================================================================

import type {
	JobStatus,
	StartPipelineResponse,
	PipelineStatusResponse,
	PipelineResultResponse,
} from './types';

/** Ответ API */
export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

/** Конфигурация клиента */
export interface PipelineClientConfig {
	/** Базовый URL API (например, '/api/pipeline') */
	baseUrl: string;
	/** Интервал polling в мс (по умолчанию 500) */
	pollingInterval?: number;
	/** Максимальное количество попыток polling (по умолчанию без ограничения) */
	maxPollingAttempts?: number;
	/** Кастомный fetch (для SSR или тестов) */
	fetch?: typeof fetch;
}

/** Параметры запуска pipeline */
export interface StartPipelineParams<TData = unknown> {
	/** Входные данные */
	input: TData;
	/** Опции для jobs */
	jobOptions?: Record<string, unknown>;
}

/** Событие обновления pipeline (только статус) */
export interface PipelineUpdateEvent {
	/** Статус pipeline */
	status: PipelineStatusResponse;
}

/** Callback для обновлений */
export type PipelineUpdateCallback = (event: PipelineUpdateEvent) => void;

/** Callback для ошибок */
export type PipelineErrorCallback = (error: Error) => void;

/** Результат polling */
export interface PollingResult {
	/** Остановить polling */
	stop: () => void;
	/** Promise завершения pipeline */
	completed: Promise<PipelineUpdateEvent>;
}

// ============================================================================
// Pipeline Client
// ============================================================================

/**
 * Клиент для работы с Pipeline API
 *
 * Один клиент = один pipeline. URL определяет какой pipeline запускается.
 *
 * @example
 * ```typescript
 * // Клиент для конкретного pipeline
 * const client = new PipelineClient({ baseUrl: '/api/pipeline/my-pipeline' });
 *
 * // Запуск pipeline с polling
 * const { stop, completed, pipelineId } = await client.startAndPoll({
 *   input: { userId: 123 },
 * }, (event) => {
 *   console.log('Status:', event.status.status);
 * });
 *
 * // Дождаться завершения
 * await completed;
 *
 * // Получить результат последней job
 * const result = await client.getResult(pipelineId);
 * console.log('Artifact:', result.artifact);
 * ```
 */
export class PipelineClient {
	private readonly config: Required<PipelineClientConfig>;

	constructor(config: PipelineClientConfig) {
		this.config = {
			baseUrl: config.baseUrl,
			pollingInterval: config.pollingInterval ?? 500,
			maxPollingAttempts: config.maxPollingAttempts ?? 0, // 0 = без ограничения
			fetch: config.fetch ?? globalThis.fetch.bind(globalThis),
		};
	}

	/**
	 * Запускает pipeline
	 */
	async start<TData = unknown>(
		params: StartPipelineParams<TData>,
	): Promise<StartPipelineResponse> {
		try {
			const response = await this.config.fetch(this.config.baseUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(params),
			});

			if (!response.ok) {
				throw new Error(
					`HTTP error ${response.status}: ${response.statusText} while starting pipeline at ${this.config.baseUrl}`,
				);
			}

			let data: ApiResponse<StartPipelineResponse>;
			try {
				data = await response.json();
			} catch (parseError) {
				throw new Error(
					`Invalid JSON response from server when starting pipeline: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
				);
			}

			if (!data.success || !data.data) {
				throw new Error(data.error ?? 'Failed to start pipeline');
			}

			return data.data;
		} catch (error) {
			// Re-throw errors with additional context if they're not already our custom errors
			if (error instanceof Error) {
				if (error.message.includes('HTTP error') || error.message.includes('Invalid JSON') || error.message.includes('Failed to start')) {
					throw error;
				}
				// Network or fetch errors
				throw new Error(
					`Network error while starting pipeline at ${this.config.baseUrl}: ${error.message}`,
				);
			}
			throw new Error(
				`Unexpected error while starting pipeline: ${String(error)}`,
			);
		}
	}

	/**
	 * Получает статус pipeline
	 */
	async getStatus(pipelineId: string): Promise<PipelineStatusResponse> {
		const url = `${this.config.baseUrl}?action=status&id=${encodeURIComponent(pipelineId)}`;

		try {
			const response = await this.config.fetch(url);

			if (!response.ok) {
				throw new Error(
					`HTTP error ${response.status}: ${response.statusText} while getting status for pipeline "${pipelineId}"`,
				);
			}

			let data: ApiResponse<PipelineStatusResponse>;
			try {
				data = await response.json();
			} catch (parseError) {
				throw new Error(
					`Invalid JSON response from server when getting pipeline status: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
				);
			}

			if (!data.success || !data.data) {
				throw new Error(data.error ?? `Failed to get status for pipeline "${pipelineId}"`);
			}

			return data.data;
		} catch (error) {
			if (error instanceof Error) {
				if (error.message.includes('HTTP error') || error.message.includes('Invalid JSON') || error.message.includes('Failed to get')) {
					throw error;
				}
				throw new Error(
					`Network error while getting status for pipeline "${pipelineId}": ${error.message}`,
				);
			}
			throw new Error(
				`Unexpected error while getting pipeline status: ${String(error)}`,
			);
		}
	}

	/**
	 * Получает результат (артефакт) конкретной job
	 *
	 * @param pipelineId - ID пайплайна
	 * @param jobName - имя job (опционально, по умолчанию — последняя job)
	 */
	async getResult<T = unknown>(
		pipelineId: string,
		jobName?: string,
	): Promise<PipelineResultResponse<T>> {
		let url = `${this.config.baseUrl}?action=result&id=${encodeURIComponent(pipelineId)}`;
		if (jobName) {
			url += `&jobName=${encodeURIComponent(jobName)}`;
		}

		try {
			const response = await this.config.fetch(url);

			if (!response.ok) {
				const jobDesc = jobName ? ` for job "${jobName}"` : '';
				throw new Error(
					`HTTP error ${response.status}: ${response.statusText} while getting result${jobDesc} for pipeline "${pipelineId}"`,
				);
			}

			let data: ApiResponse<PipelineResultResponse<T>>;
			try {
				data = await response.json();
			} catch (parseError) {
				throw new Error(
					`Invalid JSON response from server when getting pipeline result: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
				);
			}

			if (!data.success || !data.data) {
				const jobDesc = jobName ? ` for job "${jobName}"` : '';
				throw new Error(data.error ?? `Failed to get result${jobDesc} for pipeline "${pipelineId}"`);
			}

			return data.data;
		} catch (error) {
			if (error instanceof Error) {
				if (error.message.includes('HTTP error') || error.message.includes('Invalid JSON') || error.message.includes('Failed to get')) {
					throw error;
				}
				const jobDesc = jobName ? ` for job "${jobName}"` : '';
				throw new Error(
					`Network error while getting result${jobDesc} for pipeline "${pipelineId}": ${error.message}`,
				);
			}
			throw new Error(
				`Unexpected error while getting pipeline result: ${String(error)}`,
			);
		}
	}

	/**
	 * Получает данные конкретной job
	 */
	async getJobDetails(
		pipelineId: string,
		jobName: string,
	): Promise<{
		name: string;
		status: JobStatus;
		input?: unknown;
		options?: unknown;
		artifact?: unknown;
		error?: { message: string; stack?: string };
		startedAt?: string;
		finishedAt?: string;
	}> {
		const url = `${this.config.baseUrl}?action=job&id=${encodeURIComponent(pipelineId)}&jobName=${encodeURIComponent(jobName)}`;

		try {
			const response = await this.config.fetch(url);

			if (!response.ok) {
				throw new Error(
					`HTTP error ${response.status}: ${response.statusText} while getting details for job "${jobName}" in pipeline "${pipelineId}"`,
				);
			}

			let data: ApiResponse;
			try {
				data = await response.json();
			} catch (parseError) {
				throw new Error(
					`Invalid JSON response from server when getting job details: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
				);
			}

			if (!data.success || !data.data) {
				throw new Error(data.error ?? `Failed to get details for job "${jobName}" in pipeline "${pipelineId}"`);
			}

			return data.data as {
				name: string;
				status: JobStatus;
				input?: unknown;
				options?: unknown;
				artifact?: unknown;
				error?: { message: string; stack?: string };
				startedAt?: string;
				finishedAt?: string;
			};
		} catch (error) {
			if (error instanceof Error) {
				if (error.message.includes('HTTP error') || error.message.includes('Invalid JSON') || error.message.includes('Failed to get')) {
					throw error;
				}
				throw new Error(
					`Network error while getting details for job "${jobName}" in pipeline "${pipelineId}": ${error.message}`,
				);
			}
			throw new Error(
				`Unexpected error while getting job details: ${String(error)}`,
			);
		}
	}

	/**
	 * Polling для отслеживания выполнения pipeline
	 *
	 * Отслеживает только статус. Для получения результатов используйте getResult()
	 */
	poll(
		pipelineId: string,
		onUpdate?: PipelineUpdateCallback,
		onError?: PipelineErrorCallback,
	): PollingResult {
		let stopped = false;
		let attempts = 0;

		const stop = () => {
			stopped = true;
		};

		const completed = new Promise<PipelineUpdateEvent>((resolve, reject) => {
			const doPoll = async () => {
				if (stopped) {
					reject(new Error('Polling stopped'));
					return;
				}

				try {
					const status = await this.getStatus(pipelineId);
					const event: PipelineUpdateEvent = { status };

					onUpdate?.(event);

					if (status.status !== 'processing') {
						// Pipeline завершён
						resolve(event);
						return;
					}

					// Проверяем лимит попыток
					attempts++;
					if (this.config.maxPollingAttempts > 0 && attempts >= this.config.maxPollingAttempts) {
						reject(new Error('Max polling attempts reached'));
						return;
					}

					// Следующий poll
					setTimeout(doPoll, this.config.pollingInterval);
				} catch (error) {
					const err = error instanceof Error ? error : new Error(String(error));
					onError?.(err);
					reject(err);
				}
			};

			// Первый запрос сразу
			doPoll();
		});

		return { stop, completed };
	}

	/**
	 * Запускает pipeline и сразу начинает polling
	 */
	async startAndPoll<TData = unknown>(
		params: StartPipelineParams<TData>,
		onUpdate?: PipelineUpdateCallback,
		onError?: PipelineErrorCallback,
	): Promise<PollingResult & { pipelineId: string }> {
		const { pipelineId } = await this.start(params);

		const polling = this.poll(pipelineId, onUpdate, onError);

		return {
			...polling,
			pipelineId,
		};
	}
}

// ============================================================================
// React Hook (условный экспорт)
// ============================================================================

/**
 * Состояние хука usePipeline
 */
export interface UsePipelineState<TInput = unknown> {
	/** ID текущего pipeline */
	pipelineId: string | null;
	/** Статус pipeline */
	status: PipelineStatusResponse | null;
	/** Ошибка */
	error: Error | null;
	/** Pipeline выполняется */
	isRunning: boolean;
	/** Запустить pipeline */
	start: (params: StartPipelineParams<TInput>) => Promise<void>;
	/** Остановить polling */
	stop: () => void;
	/** Получить результат job (клиент для запроса) */
	client: PipelineClient;
}

/**
 * Фабрика для создания React хука usePipeline
 * (для избежания прямой зависимости от React)
 *
 * @example
 * ```typescript
 * // В вашем приложении:
 * import { useState, useCallback, useEffect, useRef } from 'react';
 * import { createUsePipelineHook, PipelineClient } from 'neuroline/client';
 *
 * const usePipeline = createUsePipelineHook({ useState, useCallback, useEffect, useRef });
 *
 * // Использование:
 * const client = new PipelineClient({ baseUrl: '/api/pipeline' });
 * const { start, status, isRunning, pipelineId, client } = usePipeline(client);
 *
 * // Когда pipeline завершён, получить результат:
 * if (pipelineId && !isRunning) {
 *   const result = await client.getResult(pipelineId);
 * }
 * ```
 */
export function createUsePipelineHook(react: {
	useState: typeof import('react').useState;
	useCallback: typeof import('react').useCallback;
	useEffect: typeof import('react').useEffect;
	useRef: typeof import('react').useRef;
}) {
	const { useState, useCallback, useEffect, useRef } = react;

	return function usePipeline<TInput = unknown>(
		client: PipelineClient,
	): UsePipelineState<TInput> {
		const [pipelineId, setPipelineId] = useState<string | null>(null);
		const [status, setStatus] = useState<PipelineStatusResponse | null>(null);
		const [error, setError] = useState<Error | null>(null);
		const [isRunning, setIsRunning] = useState(false);

		const stopRef = useRef<(() => void) | null>(null);

		const stop = useCallback(() => {
			stopRef.current?.();
			stopRef.current = null;
			setIsRunning(false);
		}, []);

		const start = useCallback(
			async (params: StartPipelineParams<TInput>) => {
				// Остановить предыдущий polling
				stop();

				setError(null);
				setStatus(null);
				setIsRunning(true);

				try {
					const polling = await client.startAndPoll(
						params,
						(event) => {
							setStatus(event.status);
						},
						(err) => {
							setError(err);
							setIsRunning(false);
						},
					);

					setPipelineId(polling.pipelineId);
					stopRef.current = polling.stop;

					// Ждём завершения
					await polling.completed;
					setIsRunning(false);
				} catch (err) {
					setError(err instanceof Error ? err : new Error(String(err)));
					setIsRunning(false);
				}
			},
			[client, stop],
		);

		// Cleanup при unmount
		useEffect(() => {
			return () => {
				stopRef.current?.();
			};
		}, []);

		return {
			pipelineId,
			status,
			error,
			isRunning,
			start,
			stop,
			client,
		};
	};
}

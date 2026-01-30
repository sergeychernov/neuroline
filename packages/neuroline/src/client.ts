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
	RestartPipelineResponse,
	PipelineStatusResponse,
	PipelineResultResponse,
	JobDetailsResponse,
	StartWithOptionsBody,
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

/**
 * Параметры запуска pipeline с явными jobOptions (admin режим)
 * Реэкспорт из core types для удобства
 */
export type StartWithOptionsParams<TData = unknown> = StartWithOptionsBody<TData>;

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
	 * Запускает pipeline (базовый режим)
	 * 
	 * Body = TInput напрямую. jobOptions получаются на сервере через getJobOptions.
	 * 
	 * @param input - входные данные pipeline
	 */
	async start<TInput = unknown>(
		input: TInput,
	): Promise<StartPipelineResponse> {
		const response = await this.config.fetch(this.config.baseUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input),
		});

		const data: ApiResponse<StartPipelineResponse> = await response.json();

		if (!data.success || !data.data) {
			throw new Error(data.error ?? 'Failed to start pipeline');
		}

		return data.data;
	}

	/**
	 * Запускает pipeline с явными jobOptions (admin режим)
	 * 
	 * Требует enableDebugEndpoints: true на сервере (Next.js) 
	 * или adminGuards на сервере (NestJS).
	 * 
	 * @param params - { input, jobOptions }
	 */
	async startWithOptions<TData = unknown>(
		params: StartWithOptionsParams<TData>,
	): Promise<StartPipelineResponse> {
		const url = `${this.config.baseUrl}?action=startWithOptions`;
		const response = await this.config.fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(params),
		});

		const data: ApiResponse<StartPipelineResponse> = await response.json();

		if (!data.success || !data.data) {
			throw new Error(data.error ?? 'Failed to start pipeline');
		}

		return data.data;
	}

	/**
	 * Получает статус pipeline
	 */
	async getStatus(pipelineId: string): Promise<PipelineStatusResponse> {
		const url = `${this.config.baseUrl}?action=status&id=${encodeURIComponent(pipelineId)}`;
		const response = await this.config.fetch(url);
		const data: ApiResponse<PipelineStatusResponse> = await response.json();

		if (!data.success || !data.data) {
			throw new Error(data.error ?? 'Failed to get pipeline status');
		}

		return data.data;
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

		const response = await this.config.fetch(url);
		const data: ApiResponse<PipelineResultResponse<T>> = await response.json();

		if (!data.success || !data.data) {
			throw new Error(data.error ?? 'Failed to get pipeline result');
		}

		return data.data;
	}

	/**
	 * Получает данные конкретной job
	 */
	async getJobDetails(
		pipelineId: string,
		jobName: string,
	): Promise<JobDetailsResponse> {
		const url = `${this.config.baseUrl}?action=job&id=${encodeURIComponent(pipelineId)}&jobName=${encodeURIComponent(jobName)}`;
		const response = await this.config.fetch(url);
		const data: ApiResponse = await response.json();

		if (!data.success || !data.data) {
			throw new Error(data.error ?? 'Failed to get job details');
		}

		return data.data as JobDetailsResponse;
	}

	/**
	 * Перезапускает pipeline с указанной job (admin режим)
	 * 
	 * Требует enableDebugEndpoints: true на сервере (Next.js) 
	 * или adminGuards на сервере (NestJS).
	 * 
	 * @param pipelineId - ID pipeline
	 * @param jobName - имя job, с которой начать перезапуск
	 * @param jobOptions - новые опции для jobs (опционально)
	 */
	async restart(
		pipelineId: string,
		jobName: string,
		jobOptions?: Record<string, unknown>,
	): Promise<RestartPipelineResponse> {
		const url = `${this.config.baseUrl}?action=retry&id=${encodeURIComponent(pipelineId)}`;
		const response = await this.config.fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ jobName, jobOptions }),
		});

		const data: ApiResponse<RestartPipelineResponse> = await response.json();

		if (!data.success || !data.data) {
			throw new Error(data.error ?? 'Failed to restart pipeline');
		}

		return data.data;
	}

	/**
	 * Перезапускает pipeline с указанной job и сразу начинает polling
	 * 
	 * @param pipelineId - ID pipeline
	 * @param jobName - имя job, с которой начать перезапуск
	 * @param jobOptions - новые опции для jobs (опционально)
	 */
	async restartAndPoll(
		pipelineId: string,
		jobName: string,
		jobOptions?: Record<string, unknown>,
		onUpdate?: PipelineUpdateCallback,
		onError?: PipelineErrorCallback,
	): Promise<PollingResult & { pipelineId: string }> {
		await this.restart(pipelineId, jobName, jobOptions);

		const polling = this.poll(pipelineId, onUpdate, onError);

		return {
			...polling,
			pipelineId,
		};
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
	 * Запускает pipeline и сразу начинает polling (базовый режим)
	 * 
	 * @param input - входные данные pipeline (body = TInput)
	 */
	async startAndPoll<TInput = unknown>(
		input: TInput,
		onUpdate?: PipelineUpdateCallback,
		onError?: PipelineErrorCallback,
	): Promise<PollingResult & { pipelineId: string }> {
		const { pipelineId } = await this.start(input);

		const polling = this.poll(pipelineId, onUpdate, onError);

		return {
			...polling,
			pipelineId,
		};
	}

	/**
	 * Запускает pipeline с явными jobOptions и сразу начинает polling (admin режим)
	 * 
	 * @param params - { input, jobOptions }
	 */
	async startAndPollWithOptions<TData = unknown>(
		params: StartWithOptionsParams<TData>,
		onUpdate?: PipelineUpdateCallback,
		onError?: PipelineErrorCallback,
	): Promise<PollingResult & { pipelineId: string }> {
		const { pipelineId } = await this.startWithOptions(params);

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
	/** Запустить pipeline (базовый режим, body = TInput) */
	start: (input: TInput) => Promise<void>;
	/** Запустить pipeline с явными jobOptions (admin режим) */
	startWithOptions: (params: StartWithOptionsParams<TInput>) => Promise<void>;
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

		/**
		 * Запуск pipeline (базовый режим, body = TInput)
		 */
		const start = useCallback(
			async (input: TInput) => {
				// Остановить предыдущий polling
				stop();

				setError(null);
				setStatus(null);
				setIsRunning(true);

				try {
					const polling = await client.startAndPoll(
						input,
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

		/**
		 * Запуск pipeline с явными jobOptions (admin режим)
		 */
		const startWithOptions = useCallback(
			async (params: StartWithOptionsParams<TInput>) => {
				// Остановить предыдущий polling
				stop();

				setError(null);
				setStatus(null);
				setIsRunning(true);

				try {
					const polling = await client.startAndPollWithOptions(
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
			startWithOptions,
			stop,
			client,
		};
	};
}

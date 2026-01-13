/**
 * Neuroline Client
 * Клиентский модуль для работы с Pipeline API через polling
 */

// ============================================================================
// Types
// ============================================================================

import type {
	PipelineStatus,
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

/** Событие обновления pipeline */
export interface PipelineUpdateEvent {
	/** Статус pipeline */
	status: PipelineStatusResponse;
	/** Результаты (артефакты) */
	result: PipelineResultResponse;
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
 * const { stop, completed } = client.startAndPoll({
 *   input: { userId: 123 },
 * }, (event) => {
 *   console.log('Status:', event.status.status);
 *   console.log('Artifacts:', event.result.artifacts);
 * });
 *
 * // Дождаться завершения
 * const finalEvent = await completed;
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
		const response = await this.config.fetch(this.config.baseUrl, {
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
	 * Получает результаты pipeline (артефакты)
	 */
	async getResult(pipelineId: string): Promise<PipelineResultResponse> {
		const url = `${this.config.baseUrl}?action=result&id=${encodeURIComponent(pipelineId)}`;
		const response = await this.config.fetch(url);
		const data: ApiResponse<PipelineResultResponse> = await response.json();

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
		const response = await this.config.fetch(url);
		const data: ApiResponse = await response.json();

		if (!data.success || !data.data) {
			throw new Error(data.error ?? 'Failed to get job details');
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
	}

	/**
	 * Получает полные данные pipeline (статус + результаты)
	 */
	async getPipelineData(pipelineId: string): Promise<PipelineUpdateEvent> {
		const [status, result] = await Promise.all([
			this.getStatus(pipelineId),
			this.getResult(pipelineId),
		]);

		return { status, result };
	}

	/**
	 * Polling для отслеживания выполнения pipeline
	 *
	 * Оптимизация: запрашиваем result только когда статус jobs изменился,
	 * а не при каждом poll-запросе
	 */
	poll(
		pipelineId: string,
		onUpdate?: PipelineUpdateCallback,
		onError?: PipelineErrorCallback,
	): PollingResult {
		let stopped = false;
		let attempts = 0;
		// Храним предыдущий статус для сравнения
		let prevJobStatuses: Map<string, JobStatus> | null = null;
		// Кешируем результаты
		let cachedResult: PipelineResultResponse | null = null;

		const stop = () => {
			stopped = true;
		};

		/**
		 * Проверяет, изменился ли статус какой-либо job на done/error
		 * (т.е. появились новые артефакты)
		 */
		const hasNewCompletedJobs = (status: PipelineStatusResponse): boolean => {
			if (!prevJobStatuses) {
				// Первый запрос — нужно получить результаты
				return true;
			}

			for (const stage of status.stages) {
				for (const job of stage.jobs) {
					const prevStatus = prevJobStatuses.get(job.name);
					// Job завершилась с прошлого poll
					if (prevStatus !== job.status && (job.status === 'done' || job.status === 'error')) {
						return true;
					}
				}
			}

			return false;
		};

		/**
		 * Сохраняет текущие статусы jobs для сравнения
		 */
		const saveJobStatuses = (status: PipelineStatusResponse): void => {
			prevJobStatuses = new Map();
			for (const stage of status.stages) {
				for (const job of stage.jobs) {
					prevJobStatuses.set(job.name, job.status);
				}
			}
		};

		const completed = new Promise<PipelineUpdateEvent>((resolve, reject) => {
			const doPoll = async () => {
				if (stopped) {
					reject(new Error('Polling stopped'));
					return;
				}

				try {
					// Всегда запрашиваем статус
					const status = await this.getStatus(pipelineId);

					// Запрашиваем result только если есть новые завершённые jobs
					if (hasNewCompletedJobs(status)) {
						cachedResult = await this.getResult(pipelineId);
					}

					// Сохраняем текущие статусы для следующего сравнения
					saveJobStatuses(status);

					const event: PipelineUpdateEvent = {
						status,
						result: cachedResult ?? { status: status.status, artifacts: {} },
					};

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
	/** Результаты pipeline */
	result: PipelineResultResponse | null;
	/** Ошибка */
	error: Error | null;
	/** Pipeline выполняется */
	isRunning: boolean;
	/** Запустить pipeline */
	start: (params: StartPipelineParams<TInput>) => Promise<void>;
	/** Остановить polling */
	stop: () => void;
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
 * const { start, status, result, isRunning } = usePipeline(client);
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
		const [result, setResult] = useState<PipelineResultResponse | null>(null);
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
				setResult(null);
				setIsRunning(true);

				try {
					const polling = await client.startAndPoll(
						params,
						(event) => {
							setStatus(event.status);
							setResult(event.result);
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
			result,
			error,
			isRunning,
			start,
			stop,
		};
	};
}

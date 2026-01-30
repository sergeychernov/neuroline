import type { PipelineManager, PipelineStorage } from 'neuroline';
import type { StartWithOptionsBody, RetryBody, ApiResponse, JobDetailsResponse } from './types';

/**
 * Хелпер для создания JSON ответа
 */
function jsonResponse<T>(data: T, init?: ResponseInit): Response {
	return new Response(JSON.stringify(data), {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...init?.headers,
		},
	});
}

/** Опции для запуска pipeline */
export interface HandleStartPipelineOptions {
	/**
	 * Callback для регистрации фонового выполнения в serverless окружении
	 * Для Vercel/Next.js передайте waitUntil из next/server
	 */
	waitUntil?: (promise: Promise<unknown>) => void;
	/**
	 * Включить admin режим (action=startWithOptions)
	 * @default false
	 */
	enableAdminStart?: boolean;
	/**
	 * Асинхронная функция для получения jobOptions на основе input и request.
	 * Используется только для базового POST endpoint.
	 */
	getJobOptions?: (input: unknown, request: Request) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

/**
 * Хендлер для POST /pipeline - запуск pipeline
 *
 * Базовый режим: body = TInput напрямую, jobOptions получаются через getJobOptions
 * Admin режим (?action=startWithOptions): body = { input, jobOptions }
 * 
 * @param request - HTTP запрос
 * @param manager - PipelineManager инстанс
 * @param pipelineType - тип pipeline (определяется route)
 * @param options - опции запуска (waitUntil для serverless, getJobOptions)
 */
export async function handleStartPipeline(
	request: Request,
	manager: PipelineManager,
	pipelineType: string,
	options?: HandleStartPipelineOptions,
): Promise<Response> {
	try {
		const { searchParams } = new URL(request.url);
		const action = searchParams.get('action');

		// Admin режим: action=startWithOptions
		if (action === 'startWithOptions') {
			if (!options?.enableAdminStart) {
				return jsonResponse<ApiResponse>(
					{ success: false, error: 'Admin endpoints are disabled. Set enableDebugEndpoints: true to enable.' },
					{ status: 403 },
				);
			}

			const body: StartWithOptionsBody = await request.json();

			if (body.input === undefined) {
				return jsonResponse<ApiResponse>(
					{ success: false, error: 'input is required' },
					{ status: 400 },
				);
			}

			const result = await manager.startPipeline(
				pipelineType,
				{
					data: body.input,
					jobOptions: body.jobOptions,
				},
				{
					onExecutionStart: options?.waitUntil,
				},
			);

			return jsonResponse<ApiResponse>({
				success: true,
				data: result,
			});
		}

		// Базовый режим: body = TInput
		const input: unknown = await request.json();

		// Получаем jobOptions через функцию из конфигурации
		const jobOptions = options?.getJobOptions
			? await options.getJobOptions(input, request)
			: undefined;

		const result = await manager.startPipeline(
			pipelineType,
			{
				data: input,
				jobOptions,
			},
			{
				onExecutionStart: options?.waitUntil,
			},
		);

		return jsonResponse<ApiResponse>({
			success: true,
			data: result,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return jsonResponse<ApiResponse>(
			{ success: false, error: message },
			{ status: 400 },
		);
	}
}

/**
 * Хендлер для GET /pipeline/status - получение статуса
 */
export async function handleGetStatus(
	request: Request,
	manager: PipelineManager,
): Promise<Response> {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');

		if (!id) {
			return jsonResponse<ApiResponse>(
				{ success: false, error: 'id query parameter is required' },
				{ status: 400 },
			);
		}

		const status = await manager.getStatus(id);

		return jsonResponse<ApiResponse>({
			success: true,
			data: status,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		const status = message.includes('not found') ? 404 : 400;
		return jsonResponse<ApiResponse>(
			{ success: false, error: message },
			{ status },
		);
	}
}

/**
 * Хендлер для GET /pipeline/result - получение результата (артефакта) job
 * 
 * Query параметры:
 * - id (required): ID пайплайна
 * - jobName (optional): имя job (по умолчанию — последняя job)
 */
export async function handleGetResult(
	request: Request,
	manager: PipelineManager,
): Promise<Response> {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		const jobName = searchParams.get('jobName') ?? undefined;

		if (!id) {
			return jsonResponse<ApiResponse>(
				{ success: false, error: 'id query parameter is required' },
				{ status: 400 },
			);
		}

		const result = await manager.getResult(id, jobName);

		return jsonResponse<ApiResponse>({
			success: true,
			data: result,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		const status = message.includes('not found') ? 404 : 400;
		return jsonResponse<ApiResponse>(
			{ success: false, error: message },
			{ status },
		);
	}
}

/**
 * Хендлер для GET /pipeline/list - список pipeline с пагинацией
 *
 * @param request - HTTP запрос
 * @param storage - PipelineStorage инстанс
 * @param pipelineType - тип pipeline (определяется route, фильтрует результаты)
 */
export async function handleGetList(
	request: Request,
	storage: PipelineStorage,
	pipelineType: string,
): Promise<Response> {
	try {
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get('page') ?? '1', 10);
		const limit = parseInt(searchParams.get('limit') ?? '10', 10);

		const result = await storage.findAll({
			page: Math.max(1, page),
			limit: Math.min(100, Math.max(1, limit)),
			pipelineType,
		});

		return jsonResponse<ApiResponse>({
			success: true,
			data: result,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return jsonResponse<ApiResponse>(
			{ success: false, error: message },
			{ status: 500 },
		);
	}
}

/**
 * Хендлер для GET /pipeline?action=job - получение данных конкретной job
 */
export async function handleGetJob(
	request: Request,
	storage: PipelineStorage,
): Promise<Response> {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');
		const jobName = searchParams.get('jobName');

		if (!id) {
			return jsonResponse<ApiResponse>(
				{ success: false, error: 'id query parameter is required' },
				{ status: 400 },
			);
		}

		if (!jobName) {
			return jsonResponse<ApiResponse>(
				{ success: false, error: 'jobName query parameter is required' },
				{ status: 400 },
			);
		}

		const pipeline = await storage.findById(id);

		if (!pipeline) {
			return jsonResponse<ApiResponse>(
				{ success: false, error: `Pipeline ${id} not found` },
				{ status: 404 },
			);
		}

		const job = pipeline.jobs.find((j) => j.name === jobName);

		if (!job) {
			return jsonResponse<ApiResponse>(
				{ success: false, error: `Job ${jobName} not found in pipeline ${id}` },
				{ status: 404 },
			);
		}

		const response: JobDetailsResponse = {
			name: job.name,
			status: job.status,
			input: job.input,
			options: job.options,
			artifact: job.artifact,
			errors: job.errors ?? [],
			startedAt: job.startedAt,
			finishedAt: job.finishedAt,
		};

		return jsonResponse<ApiResponse<JobDetailsResponse>>({
			success: true,
			data: response,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return jsonResponse<ApiResponse>(
			{ success: false, error: message },
			{ status: 500 },
		);
	}
}

/**
 * Хендлер для GET /pipeline?action=pipeline - получение полных данных pipeline
 */
export async function handleGetPipeline(
	request: Request,
	storage: PipelineStorage,
): Promise<Response> {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');

		if (!id) {
			return jsonResponse<ApiResponse>(
				{ success: false, error: 'id query parameter is required' },
				{ status: 400 },
			);
		}

		const pipeline = await storage.findById(id);

		if (!pipeline) {
			return jsonResponse<ApiResponse>(
				{ success: false, error: `Pipeline ${id} not found` },
				{ status: 404 },
			);
		}

		return jsonResponse<ApiResponse>({
			success: true,
			data: pipeline,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return jsonResponse<ApiResponse>(
			{ success: false, error: message },
			{ status: 500 },
		);
	}
}

/** Опции для перезапуска pipeline */
export interface HandleRestartPipelineOptions {
	/**
	 * Callback для регистрации фонового выполнения в serverless окружении
	 * Для Vercel/Next.js передайте waitUntil из next/server
	 */
	waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * Хендлер для POST /pipeline?action=retry&id=xxx - перезапуск pipeline с указанной job
 * 
 * Body: { jobName: string, jobOptions?: Record<string, unknown> }
 * 
 * @param request - HTTP запрос
 * @param manager - PipelineManager инстанс
 * @param options - опции (waitUntil для serverless)
 */
export async function handleRestartPipeline(
	request: Request,
	manager: PipelineManager,
	options?: HandleRestartPipelineOptions,
): Promise<Response> {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');

		if (!id) {
			return jsonResponse<ApiResponse>(
				{ success: false, error: 'id query parameter is required' },
				{ status: 400 },
			);
		}

		const body: RetryBody = await request.json();

		if (!body.jobName) {
			return jsonResponse<ApiResponse>(
				{ success: false, error: 'jobName is required' },
				{ status: 400 },
			);
		}

		const result = await manager.restartPipelineFromJob(
			id,
			body.jobName,
			{
				jobOptions: body.jobOptions,
				onExecutionStart: options?.waitUntil,
			},
		);

		return jsonResponse<ApiResponse>({
			success: true,
			data: result,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		const status = message.includes('not found') ? 404 : 
			message.includes('processing') ? 409 : 400;
		return jsonResponse<ApiResponse>(
			{ success: false, error: message },
			{ status },
		);
	}
}

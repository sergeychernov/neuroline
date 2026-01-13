import type { PipelineManager, PipelineStorage } from 'neuroline';
import type { StartPipelineBody, ApiResponse, JobDetailsResponse } from './types';

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

/**
 * Хендлер для POST /pipeline - запуск pipeline
 */
export async function handleStartPipeline(
	request: Request,
	manager: PipelineManager,
): Promise<Response> {
	try {
		const body: StartPipelineBody = await request.json();

		if (!body.pipelineType) {
			return jsonResponse<ApiResponse>(
				{ success: false, error: 'pipelineType is required' },
				{ status: 400 },
			);
		}

		if (body.input === undefined) {
			return jsonResponse<ApiResponse>(
				{ success: false, error: 'input is required' },
				{ status: 400 },
			);
		}

		const result = await manager.startPipeline(body.pipelineType, {
			data: body.input,
			jobOptions: body.jobOptions,
		});

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
 * Хендлер для GET /pipeline/result - получение результатов
 */
export async function handleGetResult(
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

		const result = await manager.getResult(id);

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
 */
export async function handleGetList(
	request: Request,
	storage: PipelineStorage,
): Promise<Response> {
	try {
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get('page') ?? '1', 10);
		const limit = parseInt(searchParams.get('limit') ?? '10', 10);
		const pipelineType = searchParams.get('pipelineType') ?? undefined;

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
			error: job.error,
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

import {
	Controller,
	Post,
	Get,
	Body,
	Query,
	HttpException,
	HttpStatus,
	Type,
} from '@nestjs/common';
import type { PipelineManager, PipelineStorage, PipelineConfig, JobStatus } from 'neuroline';

// ============================================================================
// Types
// ============================================================================

/** Опции для создания контроллера */
export interface CreatePipelineControllerOptions {
	/** Путь для контроллера (например, 'api/pipeline/demo') */
	path: string;
	/** PipelineManager инстанс */
	manager: PipelineManager;
	/** Storage инстанс */
	storage: PipelineStorage;
	/** Конфигурация pipeline */
	pipeline: PipelineConfig;
	/**
	 * Включить debug-эндпоинты (action=pipeline, action=job)
	 * 
	 * ⚠️ ВНИМАНИЕ: Эти эндпоинты возвращают полные данные pipeline/job,
	 * включая input, options и artifacts. Не включайте в production!
	 * 
	 * @default false
	 */
	enableDebugEndpoints?: boolean;
}

/** Body для запуска pipeline */
interface StartPipelineBody {
	input: unknown;
	jobOptions?: Record<string, unknown>;
}

/** Query параметры для GET запросов */
interface GetQueryParams {
	action?: string;
	id?: string;
	jobName?: string;
	page?: string;
	limit?: string;
}

/** Стандартный ответ API */
interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

/** Ответ с деталями job */
interface JobDetailsResponse {
	name: string;
	status: JobStatus;
	input?: unknown;
	options?: unknown;
	artifact?: unknown;
	error?: { message: string; stack?: string };
	startedAt?: Date;
	finishedAt?: Date;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Создаёт NestJS контроллер для конкретного pipeline
 *
 * Один контроллер = один pipeline. API совместим с PipelineClient.
 *
 * @example
 * ```typescript
 * // Создаём контроллер
 * const DemoPipelineController = createPipelineController({
 *   path: 'api/pipeline/demo',
 *   manager,
 *   storage,
 *   pipeline: demoPipeline,
 * });
 *
 * // Регистрируем в модуле
 * @Module({
 *   controllers: [DemoPipelineController],
 * })
 * export class AppModule {}
 * ```
 *
 * Endpoints:
 * - POST /api/pipeline/demo - запуск pipeline
 * - GET /api/pipeline/demo?action=status&id=xxx - статус
 * - GET /api/pipeline/demo?action=result&id=xxx - результаты
 * - GET /api/pipeline/demo?action=list&page=1&limit=10 - список
 * 
 * Debug endpoints (требуют enableDebugEndpoints: true):
 * - GET /api/pipeline/demo?action=job&id=xxx&jobName=yyy - данные job
 * - GET /api/pipeline/demo?action=pipeline&id=xxx - полные данные pipeline
 */
export function createPipelineController(
	options: CreatePipelineControllerOptions,
): Type<unknown> {
	const { path, manager, storage, pipeline, enableDebugEndpoints = false } = options;
	const pipelineType = pipeline.name;

	// Регистрируем pipeline при создании контроллера
	manager.registerPipeline(pipeline);

	@Controller(path)
	class PipelineController {
		/**
		 * POST - запуск pipeline
		 */
		@Post()
		async start(@Body() body: StartPipelineBody): Promise<ApiResponse> {
			try {
				if (body.input === undefined) {
					throw new HttpException(
						{ success: false, error: 'input is required' },
						HttpStatus.BAD_REQUEST,
					);
				}

				const result = await manager.startPipeline(pipelineType, {
					data: body.input,
					jobOptions: body.jobOptions,
				});

				return { success: true, data: result };
			} catch (error) {
				if (error instanceof HttpException) throw error;
				const message = error instanceof Error ? error.message : 'Unknown error';
				throw new HttpException(
					{ success: false, error: message },
					HttpStatus.BAD_REQUEST,
				);
			}
		}

		/**
		 * GET - получение данных (status, result, job, pipeline, list)
		 */
		@Get()
		async handleGet(@Query() query: GetQueryParams): Promise<ApiResponse> {
			const action = query.action ?? 'status';

			switch (action) {
				case 'status':
					return this.getStatus(query.id);
				case 'result':
					return this.getResult(query.id, query.jobName);
				case 'job':
					if (!enableDebugEndpoints) {
						throw new HttpException(
							{
								success: false,
								error: 'Debug endpoints are disabled. Set enableDebugEndpoints: true to enable.',
							},
							HttpStatus.FORBIDDEN,
						);
					}
					return this.getJob(query.id, query.jobName);
				case 'pipeline':
					if (!enableDebugEndpoints) {
						throw new HttpException(
							{
								success: false,
								error: 'Debug endpoints are disabled. Set enableDebugEndpoints: true to enable.',
							},
							HttpStatus.FORBIDDEN,
						);
					}
					return this.getPipeline(query.id);
				case 'list':
					return this.getList(query.page, query.limit);
				default:
					throw new HttpException(
						{
							success: false,
							error: `Unknown action: ${action}. Valid actions: status, result, list`,
						},
						HttpStatus.BAD_REQUEST,
					);
			}
		}

		private async getStatus(id?: string): Promise<ApiResponse> {
			if (!id) {
				throw new HttpException(
					{ success: false, error: 'id query parameter is required' },
					HttpStatus.BAD_REQUEST,
				);
			}

			try {
				const status = await manager.getStatus(id);
				return { success: true, data: status };
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				const status = message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
				throw new HttpException({ success: false, error: message }, status);
			}
		}

		private async getResult(id?: string, jobName?: string): Promise<ApiResponse> {
			if (!id) {
				throw new HttpException(
					{ success: false, error: 'id query parameter is required' },
					HttpStatus.BAD_REQUEST,
				);
			}

			try {
				const result = await manager.getResult(id, jobName);
				return { success: true, data: result };
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				const status = message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
				throw new HttpException({ success: false, error: message }, status);
			}
		}

		private async getJob(id?: string, jobName?: string): Promise<ApiResponse<JobDetailsResponse>> {
			if (!id) {
				throw new HttpException(
					{ success: false, error: 'id query parameter is required' },
					HttpStatus.BAD_REQUEST,
				);
			}

			if (!jobName) {
				throw new HttpException(
					{ success: false, error: 'jobName query parameter is required' },
					HttpStatus.BAD_REQUEST,
				);
			}

			try {
				const pipelineData = await storage.findById(id);

				if (!pipelineData) {
					throw new HttpException(
						{ success: false, error: `Pipeline ${id} not found` },
						HttpStatus.NOT_FOUND,
					);
				}

				const job = pipelineData.jobs.find((j) => j.name === jobName);

				if (!job) {
					throw new HttpException(
						{ success: false, error: `Job ${jobName} not found in pipeline ${id}` },
						HttpStatus.NOT_FOUND,
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

				return { success: true, data: response };
			} catch (error) {
				if (error instanceof HttpException) throw error;
				const message = error instanceof Error ? error.message : 'Unknown error';
				throw new HttpException({ success: false, error: message }, HttpStatus.INTERNAL_SERVER_ERROR);
			}
		}

		private async getPipeline(id?: string): Promise<ApiResponse> {
			if (!id) {
				throw new HttpException(
					{ success: false, error: 'id query parameter is required' },
					HttpStatus.BAD_REQUEST,
				);
			}

			try {
				const pipelineData = await storage.findById(id);

				if (!pipelineData) {
					throw new HttpException(
						{ success: false, error: `Pipeline ${id} not found` },
						HttpStatus.NOT_FOUND,
					);
				}

				return { success: true, data: pipelineData };
			} catch (error) {
				if (error instanceof HttpException) throw error;
				const message = error instanceof Error ? error.message : 'Unknown error';
				throw new HttpException({ success: false, error: message }, HttpStatus.INTERNAL_SERVER_ERROR);
			}
		}

		private async getList(page?: string, limit?: string): Promise<ApiResponse> {
			try {
				const pageNum = page ? parseInt(page, 10) : 1;
				const limitNum = limit ? parseInt(limit, 10) : 10;

				const result = await storage.findAll({
					page: Math.max(1, pageNum),
					limit: Math.min(100, Math.max(1, limitNum)),
					pipelineType,
				});

				return { success: true, data: result };
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				throw new HttpException({ success: false, error: message }, HttpStatus.INTERNAL_SERVER_ERROR);
			}
		}
	}

	return PipelineController;
}

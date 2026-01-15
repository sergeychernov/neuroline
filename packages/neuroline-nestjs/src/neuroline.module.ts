import {
	Module,
	DynamicModule,
	Controller,
	Post,
	Get,
	Body,
	Query,
	HttpException,
	HttpStatus,
	Inject,
	Type,
	Provider,
} from '@nestjs/common';
import type {
	PipelineManager,
	PipelineStorage,
	PipelineConfig,
	JobStatus,
} from 'neuroline';
import { PipelineManager as PipelineManagerClass } from 'neuroline';
import {
	NEUROLINE_MANAGER,
	NEUROLINE_STORAGE,
	NEUROLINE_CONTROLLER_OPTIONS,
} from './constants';
import { NeurolineService } from './neuroline.service';

// ============================================================================
// Types
// ============================================================================

/**
 * Опции для создания pipeline контроллера
 */
export interface PipelineControllerOptions {
	/** Путь контроллера (например, 'api/v1/my-pipeline') */
	path: string;
	/** Конфигурация pipeline из neuroline */
	pipeline: PipelineConfig;
	/** Guards для контроллера (опционально) */
	guards?: Type[];
	/**
	 * Включить debug-эндпоинты action=job и action=pipeline
	 * 
	 * ⚠️ ВНИМАНИЕ: Эти эндпоинты возвращают полные данные pipeline/job,
	 * включая input, options и artifacts. Не включайте в production!
	 * 
	 * @default false
	 */
	enableDebugEndpoints?: boolean;
}

/**
 * Логгер для pipeline manager
 */
export interface NeurolineLogger {
	info: (msg: string, data?: Record<string, unknown>) => void;
	error: (msg: string, data?: Record<string, unknown>) => void;
	warn: (msg: string, data?: Record<string, unknown>) => void;
}

/**
 * Асинхронные опции для NeurolineModule
 */
export interface NeurolineModuleAsyncOptions {
	/** Модули для импорта (например, MongooseModule) */
	imports?: any[];
	/**
	 * Factory для создания PipelineStorage
	 * @example
	 * ```typescript
	 * useFactory: (model) => new MongoPipelineStorage(model),
	 * inject: [getModelToken('Pipeline')],
	 * ```
	 */
	useFactory: (...args: any[]) => Promise<PipelineStorage> | PipelineStorage;
	/** Провайдеры для инъекции в factory */
	inject?: any[];
	/** Конфигурации контроллеров для автоматической генерации */
	controllers: PipelineControllerOptions[];
	/** Логгер для PipelineManager (опционально) */
	logger?: NeurolineLogger;
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
// Controller Factory (для DI)
// ============================================================================

/**
 * Создаёт класс контроллера с правильным DI
 * 
 * В отличие от createPipelineController(), этот контроллер получает
 * manager и storage через DI, а не через closure.
 */
function createDynamicController(
	controllerOptions: PipelineControllerOptions,
): Type<unknown> {
	const { path, pipeline, enableDebugEndpoints = false } = controllerOptions;
	const pipelineType = pipeline.name;

	@Controller(path)
	class DynamicPipelineController {
		constructor(
			@Inject(NEUROLINE_MANAGER)
			private readonly manager: PipelineManager,
			@Inject(NEUROLINE_STORAGE)
			private readonly storage: PipelineStorage,
		) {}

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

				const result = await this.manager.startPipeline(pipelineType, {
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
				const status = await this.manager.getStatus(id);
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
				const result = await this.manager.getResult(id, jobName);
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
				const pipelineData = await this.storage.findById(id);

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
				const pipelineData = await this.storage.findById(id);

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

				const result = await this.storage.findAll({
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

	// Применяем guards через Reflect.defineMetadata
	if (controllerOptions.guards && controllerOptions.guards.length > 0) {
		Reflect.defineMetadata('__guards__', controllerOptions.guards, DynamicPipelineController);
	}

	return DynamicPipelineController;
}

// ============================================================================
// Module
// ============================================================================

/**
 * Neuroline Module для NestJS
 * 
 * Поддерживает динамическое создание контроллеров через forRootAsync().
 * 
 * @example
 * ```typescript
 * import { Module } from '@nestjs/common';
 * import { MongooseModule, getModelToken } from '@nestjs/mongoose';
 * import { NeurolineModule, MongoPipelineStorage, PipelineSchema } from 'neuroline-nestjs';
 * import { demoPipelineConfig } from './pipelines';
 * 
 * @Module({
 *   imports: [
 *     MongooseModule.forFeature([{ name: 'Pipeline', schema: PipelineSchema }]),
 *     
 *     NeurolineModule.forRootAsync({
 *       imports: [MongooseModule],
 *       useFactory: (model) => new MongoPipelineStorage(model),
 *       inject: [getModelToken('Pipeline')],
 *       controllers: [
 *         {
 *           path: 'api/v1/demo-pipeline',
 *           pipeline: demoPipelineConfig,
 *           guards: [AuthGuard],
 *           enableDebugEndpoints: true,
 *         },
 *       ],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class NeurolineModule {
	/**
	 * Асинхронная конфигурация модуля с поддержкой DI
	 * 
	 * - Автоматически создаёт NEUROLINE_STORAGE через useFactory
	 * - Создаёт NEUROLINE_MANAGER с автоматической регистрацией всех pipelines
	 * - Динамически генерирует контроллеры с правильным DI
	 * - Применяет guards через метаданные
	 */
	static forRootAsync(options: NeurolineModuleAsyncOptions): DynamicModule {
		// Создаём провайдер для storage
		const storageProvider: Provider = {
			provide: NEUROLINE_STORAGE,
			useFactory: options.useFactory,
			inject: options.inject ?? [],
		};

		// Создаём провайдер для manager
		const managerProvider: Provider = {
			provide: NEUROLINE_MANAGER,
			useFactory: (storage: PipelineStorage) => {
				const manager = new PipelineManagerClass({
					storage,
					logger: options.logger,
				});

				// Регистрируем все pipelines
				for (const controller of options.controllers) {
					manager.registerPipeline(controller.pipeline);
				}

				return manager;
			},
			inject: [NEUROLINE_STORAGE],
		};

		// Создаём провайдер для конфигурации контроллеров (для NeurolineService)
		const controllerOptionsProvider: Provider = {
			provide: NEUROLINE_CONTROLLER_OPTIONS,
			useValue: options.controllers,
		};

		// Динамически генерируем контроллеры
		const dynamicControllers = options.controllers.map((controllerOptions) =>
			createDynamicController(controllerOptions),
		);

		return {
			module: NeurolineModule,
			imports: options.imports ?? [],
			controllers: dynamicControllers,
			providers: [
				storageProvider,
				managerProvider,
				controllerOptionsProvider,
				NeurolineService,
			],
			exports: [
				NEUROLINE_STORAGE,
				NEUROLINE_MANAGER,
				NeurolineService,
			],
		};
	}
}

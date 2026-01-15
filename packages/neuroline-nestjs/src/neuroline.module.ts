import {
	Module,
	DynamicModule,
	Controller,
	Post,
	Get,
	Body,
	Query,
	Req,
	HttpException,
	HttpStatus,
	Inject,
	Type,
	Provider,
	ExecutionContext,
	ForbiddenException,
	CanActivate,
	OnModuleDestroy,
} from '@nestjs/common';
import { ModuleRef, ContextIdFactory } from '@nestjs/core';
import type {
	PipelineManager,
	PipelineStorage,
	PipelineConfig,
	JobStatus,
	StaleJobsWatchdogOptions,
} from 'neuroline';
import { PipelineManager as PipelineManagerClass } from 'neuroline';
import {
	NEUROLINE_MANAGER,
	NEUROLINE_STORAGE,
	NEUROLINE_CONTROLLER_OPTIONS,
	NEUROLINE_WATCHDOG_OPTIONS,
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
	/** Guards для всего контроллера (опционально) */
	guards?: Type[];
	/**
	 * Guards для admin-эндпоинтов (action=job, action=pipeline)
	 * 
	 * Эти эндпоинты возвращают полные данные pipeline/job (input, options, artifacts).
	 * 
	 * - Если указаны — admin-эндпоинты доступны только после прохождения guards
	 * - Если не указаны — admin-эндпоинты отключены (возвращают 403)
	 * - Для открытого доступа используйте пустой массив: `adminGuards: []`
	 * 
	 * @example
	 * ```typescript
	 * // Admin доступен только авторизованным
	 * adminGuards: [AuthGuard]
	 * 
	 * // Admin доступен всем
	 * adminGuards: []
	 * ```
	 */
	adminGuards?: Type[];
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
	/**
	 * Опции для фонового watchdog, который отслеживает "зависшие" джобы.
	 * 
	 * Если джоба в статусе processing дольше указанного времени (по умолчанию 20 минут),
	 * watchdog пометит её как error.
	 * 
	 * Это защищает от ситуаций, когда процесс падает во время выполнения джобы,
	 * и она навсегда остаётся в processing.
	 * 
	 * @example
	 * ```typescript
	 * staleJobsWatchdog: {
	 *     checkIntervalMs: 60000,  // проверка раз в минуту
	 *     jobTimeoutMs: 1200000,   // таймаут 20 минут
	 * }
	 * ```
	 */
	staleJobsWatchdog?: StaleJobsWatchdogOptions;
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
 */
function createDynamicController(
	controllerOptions: PipelineControllerOptions,
	adminGuardTypes: Type[] | undefined,
): Type<unknown> {
	const { path, pipeline } = controllerOptions;
	const pipelineType = pipeline.name;
	// undefined = disabled, [] = open, [...guards] = protected
	const adminEnabled = adminGuardTypes !== undefined;
	const hasAdminGuards = adminGuardTypes && adminGuardTypes.length > 0;

	@Controller(path)
	class DynamicPipelineController {
		constructor(
			@Inject(NEUROLINE_MANAGER)
			private readonly manager: PipelineManager,
			@Inject(NEUROLINE_STORAGE)
			private readonly storage: PipelineStorage,
			private readonly moduleRef: ModuleRef,
		) { }

		/**
		 * Проверяет admin guards программно
		 */
		private async checkAdminGuards(request: any): Promise<void> {
			if (!adminEnabled) {
				throw new ForbiddenException({
					success: false,
					error: 'Admin endpoints are disabled. Set adminGuards: [] to enable.',
				});
			}

			if (!hasAdminGuards) {
				// adminGuards: [] — открытый доступ
				return;
			}

			// Создаём минимальный контекст для guards
			const context = {
				switchToHttp: () => ({
					getRequest: <T = any>(): T => request as T,
					getResponse: <T = any>(): T => ({}) as T,
					getNext: <T = any>(): T => (() => { }) as T,
				}),
				getClass: <T = any>(): Type<T> => DynamicPipelineController as Type<T>,
				getHandler: () => this.handleGet,
				getArgs: <T extends unknown[] = unknown[]>(): T => [request] as T,
				getArgByIndex: <T = any>(index: number): T => (index === 0 ? request : undefined) as T,
				getType: <TContext extends string = string>(): TContext => 'http' as TContext,
				switchToRpc: () => ({
					getData: <T = any>(): T => null as T,
					getContext: <T = any>(): T => null as T,
				}),
				switchToWs: () => ({
					getData: <T = any>(): T => null as T,
					getClient: <T = any>(): T => null as T,
					getPattern: <T = any>(): T => null as T,
				}),
			} as ExecutionContext;

			// Получаем request-scoped context
			const contextId = ContextIdFactory.getByRequest(request);

			// Проверяем каждый guard
			for (const GuardType of adminGuardTypes!) {
				try {
					const guard = await this.moduleRef.resolve<CanActivate>(GuardType, contextId, { strict: false });
					const result = await guard.canActivate(context);
					if (!result) {
						throw new ForbiddenException({
							success: false,
							error: 'Access denied to admin endpoints',
						});
					}
				} catch (error) {
					if (error instanceof ForbiddenException) throw error;
					// Guard не зарегистрирован — пробуем создать
					try {
						const guard = this.moduleRef.get<CanActivate>(GuardType, { strict: false });
						const result = await guard.canActivate(context);
						if (!result) {
							throw new ForbiddenException({
								success: false,
								error: 'Access denied to admin endpoints',
							});
						}
					} catch {
						throw new ForbiddenException({
							success: false,
							error: 'Access denied to admin endpoints',
						});
					}
				}
			}
		}

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
		async handleGet(
			@Query() query: GetQueryParams,
			@Req() request: any,
		): Promise<ApiResponse> {
			const action = query.action ?? 'status';

			switch (action) {
				case 'status':
					return this.getStatus(query.id);
				case 'result':
					return this.getResult(query.id, query.jobName);
				case 'job':
					await this.checkAdminGuards(request);
					return this.getJob(query.id, query.jobName);
				case 'pipeline':
					await this.checkAdminGuards(request);
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
 *           guards: [AuthGuard],        // guards для всего контроллера
 *           adminGuards: [AdminGuard], // guards для admin-эндпоинтов
 *         },
 *       ],
 *       // Фоновый watchdog для отслеживания зависших джоб
 *       staleJobsWatchdog: {
 *         checkIntervalMs: 60000,  // проверка раз в минуту
 *         jobTimeoutMs: 1200000,   // таймаут 20 минут
 *       },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class NeurolineModule implements OnModuleDestroy {
	constructor(
		@Inject(NEUROLINE_MANAGER)
		private readonly manager: PipelineManager,
		@Inject(NEUROLINE_WATCHDOG_OPTIONS)
		private readonly watchdogOptions: StaleJobsWatchdogOptions | null,
	) {
		// Запускаем watchdog если опции переданы
		if (this.watchdogOptions) {
			this.manager.startStaleJobsWatchdog(this.watchdogOptions);
		}
	}

	/**
	 * Останавливает watchdog при закрытии модуля
	 */
	onModuleDestroy(): void {
		this.manager.stopStaleJobsWatchdog();
	}

	/**
	 * Асинхронная конфигурация модуля с поддержкой DI
	 * 
	 * - Автоматически создаёт NEUROLINE_STORAGE через useFactory
	 * - Создаёт NEUROLINE_MANAGER с автоматической регистрацией всех pipelines
	 * - Динамически генерирует контроллеры с правильным DI
	 * - Применяет guards через метаданные
	 * - Запускает stale jobs watchdog если опции переданы
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

		// Создаём провайдер для опций watchdog
		const watchdogOptionsProvider: Provider = {
			provide: NEUROLINE_WATCHDOG_OPTIONS,
			useValue: options.staleJobsWatchdog ?? null,
		};

		// Динамически генерируем контроллеры
		const dynamicControllers = options.controllers.map((controllerOptions) =>
			createDynamicController(controllerOptions, controllerOptions.adminGuards),
		);

		return {
			module: NeurolineModule,
			imports: options.imports ?? [],
			controllers: dynamicControllers,
			providers: [
				storageProvider,
				managerProvider,
				controllerOptionsProvider,
				watchdogOptionsProvider,
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

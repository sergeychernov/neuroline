import type { PipelineManager, PipelineStorage, PipelineConfig } from 'neuroline';
import {
	handleStartPipeline,
	handleGetStatus,
	handleGetResult,
	handleGetList,
	handleGetJob,
	handleGetPipeline,
} from './handlers';

export interface PipelineRouteHandlerOptions<TInput = unknown> {
	/** PipelineManager инстанс */
	manager: PipelineManager;
	/** Storage для списка */
	storage: PipelineStorage;
	/** Конфигурация pipeline для этого route */
	pipeline: PipelineConfig;
	/**
	 * Callback для регистрации фонового выполнения в serverless окружении
	 * Для Vercel/Next.js передайте waitUntil из next/server
	 *
	 * @example
	 * ```typescript
	 * import { waitUntil } from 'next/server';
	 *
	 * const handlers = createPipelineRouteHandler({
	 *   manager, storage, pipeline,
	 *   waitUntil, // передаём функцию waitUntil
	 * });
	 * ```
	 */
	waitUntil?: (promise: Promise<unknown>) => void;
	/**
	 * Включить admin-эндпоинты (action=pipeline, action=job, action=startWithOptions)
	 * 
	 * ⚠️ ВНИМАНИЕ: Эти эндпоинты возвращают полные данные pipeline/job,
	 * включая input, options и artifacts, или позволяют передавать jobOptions напрямую.
	 * Не включайте в production без защиты!
	 * 
	 * @default false
	 */
	enableDebugEndpoints?: boolean;
	/**
	 * Асинхронная функция для получения jobOptions на основе input и request.
	 * 
	 * Используется только для базового POST endpoint.
	 * Admin endpoint (action=startWithOptions) получает jobOptions напрямую из body.
	 * 
	 * @param input - входные данные pipeline (body запроса)
	 * @param request - HTTP Request объект (для доступа к headers и т.д.)
	 * @returns jobOptions или Promise<jobOptions>
	 * 
	 * @example
	 * ```typescript
	 * getJobOptions: async (input, request) => {
	 *     const authHeader = request.headers.get('Authorization');
	 *     return {
	 *         myJob: { token: authHeader, apiKey: process.env.API_KEY },
	 *     };
	 * }
	 * ```
	 */
	getJobOptions?: (input: TInput, request: Request) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

export interface PipelineRouteHandlers {
	/** POST handler - запуск pipeline */
	POST: (request: Request) => Promise<Response>;
	/** GET handler - получение данных (status, result, list) */
	GET: (request: Request) => Promise<Response>;
}

/**
 * Создаёт обработчики для Next.js App Router
 *
 * Один route = один pipeline. Тип pipeline определяется конфигурацией,
 * а не параметром в запросе.
 *
 * @example
 * ```typescript
 * // app/api/pipeline/success/route.ts
 * import { createPipelineRouteHandler } from 'neuroline-nextjs';
 * import { manager, storage } from '@/lib/pipeline';
 * import { successPipeline } from '@/pipelines';
 *
 * const handlers = createPipelineRouteHandler({ manager, storage, pipeline: successPipeline });
 *
 * export const POST = handlers.POST;
 * export const GET = handlers.GET;
 * ```
 *
 * Endpoints:
 * - POST /api/pipeline/success - запуск pipeline
 * - GET /api/pipeline/success?action=status&id=xxx - статус
 * - GET /api/pipeline/success?action=result&id=xxx - результаты
 * - GET /api/pipeline/success?action=list&page=1&limit=10 - список (фильтр по типу)
 * 
 * Debug endpoints (требуют enableDebugEndpoints: true):
 * - GET /api/pipeline/success?action=job&id=xxx&jobName=yyy - данные job
 * - GET /api/pipeline/success?action=pipeline&id=xxx - полные данные pipeline
 */
export function createPipelineRouteHandler<TInput = unknown>(
	options: PipelineRouteHandlerOptions<TInput>,
): PipelineRouteHandlers {
	const { manager, storage, pipeline, waitUntil, enableDebugEndpoints = false, getJobOptions } = options;

	// Регистрируем pipeline при создании
	manager.registerPipeline(pipeline);

	const pipelineType = pipeline.name;

	return {
		POST: async (request: Request) => {
			return handleStartPipeline(request, manager, pipelineType, {
				waitUntil,
				enableAdminStart: enableDebugEndpoints,
				getJobOptions: getJobOptions as ((input: unknown, request: Request) => Promise<Record<string, unknown>> | Record<string, unknown>) | undefined,
			});
		},

		GET: async (request: Request) => {
			const { searchParams } = new URL(request.url);
			const action = searchParams.get('action') ?? 'status';

			switch (action) {
				case 'status':
					return handleGetStatus(request, manager);
				case 'result':
					return handleGetResult(request, manager);
				case 'job':
					if (!enableDebugEndpoints) {
						return new Response(
							JSON.stringify({
								success: false,
								error: 'Debug endpoints are disabled. Set enableDebugEndpoints: true to enable.',
							}),
							{ status: 403, headers: { 'Content-Type': 'application/json' } },
						);
					}
					return handleGetJob(request, storage);
				case 'pipeline':
					if (!enableDebugEndpoints) {
						return new Response(
							JSON.stringify({
								success: false,
								error: 'Debug endpoints are disabled. Set enableDebugEndpoints: true to enable.',
							}),
							{ status: 403, headers: { 'Content-Type': 'application/json' } },
						);
					}
					return handleGetPipeline(request, storage);
				case 'list':
					return handleGetList(request, storage, pipelineType);
				default:
					return new Response(
						JSON.stringify({
							success: false,
							error: `Unknown action: ${action}. Valid actions: status, result, list`,
						}),
						{
							status: 400,
							headers: { 'Content-Type': 'application/json' },
						},
					);
			}
		},
	};
}


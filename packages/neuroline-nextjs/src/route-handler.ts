import type { PipelineManager, PipelineStorage, PipelineConfig } from 'neuroline';
import {
	handleStartPipeline,
	handleGetStatus,
	handleGetResult,
	handleGetList,
	handleGetJob,
	handleGetPipeline,
} from './handlers';

export interface PipelineRouteHandlerOptions {
	/** PipelineManager инстанс */
	manager: PipelineManager;
	/** Storage для списка */
	storage: PipelineStorage;
	/** Конфигурация pipeline для этого route */
	pipeline: PipelineConfig;
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
 * - GET /api/pipeline/success?action=job&id=xxx&jobName=yyy - данные job
 * - GET /api/pipeline/success?action=pipeline&id=xxx - полные данные pipeline
 * - GET /api/pipeline/success?action=list&page=1&limit=10 - список (фильтр по типу)
 */
export function createPipelineRouteHandler(
	options: PipelineRouteHandlerOptions,
): PipelineRouteHandlers {
	const { manager, storage, pipeline } = options;

	// Регистрируем pipeline при создании
	manager.registerPipeline(pipeline);

	const pipelineType = pipeline.name;

	return {
		POST: async (request: Request) => {
			return handleStartPipeline(request, manager, pipelineType);
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
					return handleGetJob(request, storage);
				case 'pipeline':
					return handleGetPipeline(request, storage);
				case 'list':
					return handleGetList(request, storage, pipelineType);
				default:
					return new Response(
						JSON.stringify({
							success: false,
							error: `Unknown action: ${action}. Valid actions: status, result, job, pipeline, list`,
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


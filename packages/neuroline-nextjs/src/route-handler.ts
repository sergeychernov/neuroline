import { NextRequest } from 'next/server';
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
	/** Конфигурации pipeline для регистрации */
	pipelines?: PipelineConfig[];
}

export interface PipelineRouteHandlers {
	/** POST handler - запуск pipeline */
	POST: (request: NextRequest) => Promise<Response>;
	/** GET handler - получение данных (status, result, list) */
	GET: (request: NextRequest) => Promise<Response>;
}

/**
 * Создаёт обработчики для Next.js App Router
 *
 * @example
 * ```typescript
 * // app/api/pipeline/route.ts
 * import { createPipelineRouteHandler } from 'neuroline-nextjs';
 * import { manager, storage, pipelines } from '@/lib/pipeline';
 *
 * const handlers = createPipelineRouteHandler({ manager, storage, pipelines });
 *
 * export const POST = handlers.POST;
 * export const GET = handlers.GET;
 * ```
 *
 * Endpoints:
 * - POST /api/pipeline - запуск pipeline
 * - GET /api/pipeline?action=status&id=xxx - статус
 * - GET /api/pipeline?action=result&id=xxx - результаты
 * - GET /api/pipeline?action=job&id=xxx&jobName=yyy - данные job
 * - GET /api/pipeline?action=pipeline&id=xxx - полные данные pipeline
 * - GET /api/pipeline?action=list&page=1&limit=10 - список
 */
export function createPipelineRouteHandler(
	options: PipelineRouteHandlerOptions,
): PipelineRouteHandlers {
	const { manager, storage, pipelines } = options;

	// Регистрируем pipeline при создании
	if (pipelines) {
		for (const config of pipelines) {
			manager.registerPipeline(config);
		}
	}

	return {
		POST: async (request: NextRequest) => {
			return handleStartPipeline(request, manager);
		},

		GET: async (request: NextRequest) => {
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
					return handleGetList(request, storage);
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


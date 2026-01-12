import { NextRequest, NextResponse } from 'next/server';
import type { PipelineManager, PipelineStorage, PipelineConfig } from 'neuroline';
import {
	handleStartPipeline,
	handleGetStatus,
	handleGetResult,
	handleGetList,
} from './handlers';
import type { ApiResponse } from './types';

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
	POST: (request: NextRequest) => Promise<NextResponse<ApiResponse>>;
	/** GET handler - получение данных (status, result, list) */
	GET: (request: NextRequest) => Promise<NextResponse<ApiResponse>>;
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
				case 'list':
					return handleGetList(request, storage);
				default:
					return NextResponse.json(
						{
							success: false,
							error: `Unknown action: ${action}. Valid actions: status, result, list`,
						},
						{ status: 400 },
					);
			}
		},
	};
}


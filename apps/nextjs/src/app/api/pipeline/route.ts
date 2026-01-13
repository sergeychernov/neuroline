/**
 * Pipeline API Route
 *
 * Endpoints:
 * - POST /api/pipeline - запуск pipeline
 * - GET /api/pipeline?action=status&id=xxx - статус
 * - GET /api/pipeline?action=result&id=xxx - результаты
 * - GET /api/pipeline?action=job&id=xxx&jobName=yyy - данные job
 * - GET /api/pipeline?action=pipeline&id=xxx - полные данные pipeline
 * - GET /api/pipeline?action=list&page=1&limit=10 - список
 */

import { createPipelineRouteHandler } from 'neuroline-nextjs';
import { getPipelineManager, pipelines } from '@/lib/pipeline-server';

const { manager, storage } = getPipelineManager();

const handlers = createPipelineRouteHandler({
	manager,
	storage,
	pipelines,
});

export const POST = handlers.POST;
export const GET = handlers.GET;

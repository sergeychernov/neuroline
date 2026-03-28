/**
 * Manual Demo Pipeline API Route
 *
 * Pipeline с manual job для демонстрации awaiting_manual / runManualJob.
 *
 * - POST /api/pipeline/manual-demo — запуск pipeline
 * - POST /api/pipeline/manual-demo?action=runManualJob&id=xxx — запуск manual job (body: { jobName })
 * - GET /api/pipeline/manual-demo?action=status&id=xxx — статус
 * - GET /api/pipeline/manual-demo?action=result&id=xxx — результаты
 */

import { waitUntil } from '@vercel/functions';
import { createPipelineRouteHandler } from 'neuroline-nextjs';
import { ensurePipelineStorageReady, getPipelineManager } from '@/lib/pipeline-server';
import { manualDemoPipeline } from 'demo-pipelines';

export const maxDuration = 60;

const { manager, storage } = getPipelineManager();

const handlers = createPipelineRouteHandler({
	manager,
	storage,
	pipeline: manualDemoPipeline,
	waitUntil,
	enableDebugEndpoints: true,
	getJobOptions: async () => ({
		compute: {
			multiplier: 2.0,
			iterationDelayMs: 80,
		},
	}),
});

export const POST = async (request: Request) => {
	await ensurePipelineStorageReady();
	return handlers.POST(request);
};

export const GET = async (request: Request) => {
	await ensurePipelineStorageReady();
	return handlers.GET(request);
};

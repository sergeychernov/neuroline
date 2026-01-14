/**
 * Demo Pipeline API Route
 *
 * Единый pipeline для демонстрации neuroline.
 * Параметр fail в input определяет, упадёт ли pipeline.
 *
 * Endpoints:
 * - POST /api/pipeline/demo - запуск demo pipeline
 * - GET /api/pipeline/demo?action=status&id=xxx - статус
 * - GET /api/pipeline/demo?action=result&id=xxx - результаты
 * - GET /api/pipeline/demo?action=job&id=xxx&jobName=yyy - данные job
 * - GET /api/pipeline/demo?action=pipeline&id=xxx - полные данные pipeline
 * - GET /api/pipeline/demo?action=list&page=1&limit=10 - список
 */

import { waitUntil } from '@vercel/functions';
import { createPipelineRouteHandler } from 'neuroline-nextjs';
import { ensurePipelineStorageReady, getPipelineManager } from '@/lib/pipeline-server';
import { demoPipeline } from 'demo-pipelines';
import type { PipelineConfig } from 'neuroline';

/**
 * Максимальное время выполнения функции (в секундах)
 * Для Vercel Pro: до 300 сек, для Hobby: до 60 сек
 */
export const maxDuration = 60;

const { manager, storage } = getPipelineManager();

const handlers = createPipelineRouteHandler({
	manager,
	storage,
	pipeline: demoPipeline as PipelineConfig,
	// waitUntil позволяет продолжить выполнение pipeline после отправки ответа
	// Это решает проблему "зависания" pipeline на Vercel
	waitUntil,
	// В демо-приложении включаем debug-эндпоинты для демонстрации функциональности
	enableDebugEndpoints: true,
});

export const POST = async (request: Request) => {
	await ensurePipelineStorageReady();
	return handlers.POST(request);
};

export const GET = async (request: Request) => {
	await ensurePipelineStorageReady();
	return handlers.GET(request);
};

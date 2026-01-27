/**
 * Demo Pipeline API Route
 *
 * Единый pipeline для демонстрации neuroline.
 * Параметр fail в input определяет, упадёт ли pipeline.
 *
 * Базовые endpoints:
 * - POST /api/pipeline/demo - запуск pipeline (body = TInput)
 * - GET /api/pipeline/demo?action=status&id=xxx - статус
 * - GET /api/pipeline/demo?action=result&id=xxx - результаты
 * - GET /api/pipeline/demo?action=list&page=1&limit=10 - список
 *
 * Admin endpoints (enableDebugEndpoints: true):
 * - POST /api/pipeline/demo?action=startWithOptions - запуск с явными jobOptions
 * - GET /api/pipeline/demo?action=job&id=xxx&jobName=yyy - данные job
 * - GET /api/pipeline/demo?action=pipeline&id=xxx - полные данные pipeline
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
	// В демо-приложении включаем admin-эндпоинты для демонстрации функциональности
	enableDebugEndpoints: true,
	// Асинхронное получение jobOptions для базового POST
	// В реальном приложении здесь можно получать данные из headers, cookies и т.д.
	getJobOptions: async (input, request) => {
		// Пример: те же опции, что передаются в админке через startWithOptions
		return {
			compute: {
				multiplier: 2.0,
				iterationDelayMs: 80,
			},
		};
	},
});

export const POST = async (request: Request) => {
	await ensurePipelineStorageReady();
	return handlers.POST(request);
};

export const GET = async (request: Request) => {
	await ensurePipelineStorageReady();
	return handlers.GET(request);
};

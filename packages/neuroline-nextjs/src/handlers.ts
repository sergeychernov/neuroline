import { NextRequest, NextResponse } from 'next/server';
import type { PipelineManager, PipelineStorage } from 'neuroline';
import type { StartPipelineBody, ApiResponse } from './types';

/**
 * Хендлер для POST /pipeline - запуск pipeline
 */
export async function handleStartPipeline(
	request: NextRequest,
	manager: PipelineManager,
): Promise<NextResponse<ApiResponse>> {
	try {
		const body: StartPipelineBody = await request.json();

		if (!body.pipelineType) {
			return NextResponse.json(
				{ success: false, error: 'pipelineType is required' },
				{ status: 400 },
			);
		}

		if (body.input === undefined) {
			return NextResponse.json(
				{ success: false, error: 'input is required' },
				{ status: 400 },
			);
		}

		const result = await manager.startPipeline(body.pipelineType, {
			data: body.input,
			jobOptions: body.jobOptions,
		});

		return NextResponse.json({
			success: true,
			data: result,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return NextResponse.json(
			{ success: false, error: message },
			{ status: 400 },
		);
	}
}

/**
 * Хендлер для GET /pipeline/status - получение статуса
 */
export async function handleGetStatus(
	request: NextRequest,
	manager: PipelineManager,
): Promise<NextResponse<ApiResponse>> {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');

		if (!id) {
			return NextResponse.json(
				{ success: false, error: 'id query parameter is required' },
				{ status: 400 },
			);
		}

		const status = await manager.getStatus(id);

		return NextResponse.json({
			success: true,
			data: status,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		const status = message.includes('not found') ? 404 : 400;
		return NextResponse.json(
			{ success: false, error: message },
			{ status },
		);
	}
}

/**
 * Хендлер для GET /pipeline/result - получение результатов
 */
export async function handleGetResult(
	request: NextRequest,
	manager: PipelineManager,
): Promise<NextResponse<ApiResponse>> {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');

		if (!id) {
			return NextResponse.json(
				{ success: false, error: 'id query parameter is required' },
				{ status: 400 },
			);
		}

		const result = await manager.getResult(id);

		return NextResponse.json({
			success: true,
			data: result,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		const status = message.includes('not found') ? 404 : 400;
		return NextResponse.json(
			{ success: false, error: message },
			{ status },
		);
	}
}

/**
 * Хендлер для GET /pipeline/list - список pipeline с пагинацией
 */
export async function handleGetList(
	request: NextRequest,
	storage: PipelineStorage,
): Promise<NextResponse<ApiResponse>> {
	try {
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get('page') ?? '1', 10);
		const limit = parseInt(searchParams.get('limit') ?? '10', 10);
		const pipelineType = searchParams.get('pipelineType') ?? undefined;

		const result = await storage.findAll({
			page: Math.max(1, page),
			limit: Math.min(100, Math.max(1, limit)),
			pipelineType,
		});

		return NextResponse.json({
			success: true,
			data: result,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return NextResponse.json(
			{ success: false, error: message },
			{ status: 500 },
		);
	}
}


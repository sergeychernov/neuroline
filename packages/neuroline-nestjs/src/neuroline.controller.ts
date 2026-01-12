import {
	Controller,
	Post,
	Get,
	Body,
	Query,
	HttpException,
	HttpStatus,
} from '@nestjs/common';
import { NeurolineService } from './neuroline.service';
import type { StartPipelineDto, ListQueryDto, ApiResponse } from './dto';

/**
 * Контроллер для Pipeline API
 *
 * Endpoints:
 * - POST /pipeline - запуск pipeline
 * - GET /pipeline/status?id=xxx - статус
 * - GET /pipeline/result?id=xxx - результаты
 * - GET /pipeline/list?page=1&limit=10 - список
 */
@Controller('pipeline')
export class NeurolineController {
	constructor(private readonly neurolineService: NeurolineService) { }

	/**
	 * POST /pipeline - запуск pipeline
	 */
	@Post()
	async startPipeline(@Body() dto: StartPipelineDto): Promise<ApiResponse> {
		try {
			if (!dto.pipelineType) {
				throw new HttpException('pipelineType is required', HttpStatus.BAD_REQUEST);
			}

			if (dto.input === undefined) {
				throw new HttpException('input is required', HttpStatus.BAD_REQUEST);
			}

			const result = await this.neurolineService.startPipeline(
				dto.pipelineType,
				dto.input,
				dto.jobOptions,
			);

			return { success: true, data: result };
		} catch (error) {
			if (error instanceof HttpException) throw error;
			const message = error instanceof Error ? error.message : 'Unknown error';
			throw new HttpException(message, HttpStatus.BAD_REQUEST);
		}
	}

	/**
	 * GET /pipeline/status?id=xxx - получить статус
	 */
	@Get('status')
	async getStatus(@Query('id') id: string): Promise<ApiResponse> {
		try {
			if (!id) {
				throw new HttpException('id query parameter is required', HttpStatus.BAD_REQUEST);
			}

			const status = await this.neurolineService.getStatus(id);
			return { success: true, data: status };
		} catch (error) {
			if (error instanceof HttpException) throw error;
			const message = error instanceof Error ? error.message : 'Unknown error';
			const status = message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
			throw new HttpException(message, status);
		}
	}

	/**
	 * GET /pipeline/result?id=xxx - получить результаты
	 */
	@Get('result')
	async getResult(@Query('id') id: string): Promise<ApiResponse> {
		try {
			if (!id) {
				throw new HttpException('id query parameter is required', HttpStatus.BAD_REQUEST);
			}

			const result = await this.neurolineService.getResult(id);
			return { success: true, data: result };
		} catch (error) {
			if (error instanceof HttpException) throw error;
			const message = error instanceof Error ? error.message : 'Unknown error';
			const status = message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
			throw new HttpException(message, status);
		}
	}

	/**
	 * GET /pipeline/list?page=1&limit=10&pipelineType=xxx - список с пагинацией
	 */
	@Get('list')
	async getList(@Query() query: ListQueryDto): Promise<ApiResponse> {
		try {
			const page = query.page ? parseInt(query.page, 10) : 1;
			const limit = query.limit ? parseInt(query.limit, 10) : 10;

			const result = await this.neurolineService.getList(page, limit, query.pipelineType);
			return { success: true, data: result };
		} catch (error) {
			if (error instanceof HttpException) throw error;
			const message = error instanceof Error ? error.message : 'Unknown error';
			throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}
}


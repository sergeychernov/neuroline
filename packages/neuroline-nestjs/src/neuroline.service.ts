import { Injectable, Inject } from '@nestjs/common';
import type {
	PipelineManager,
	PipelineStorage,
	StartPipelineResponse,
	PipelineStatusResponse,
	PipelineResultResponse,
	PaginatedResult,
	PipelineState,
} from 'neuroline';
import { NEUROLINE_MANAGER, NEUROLINE_STORAGE } from './constants';

/**
 * Сервис для работы с Neuroline
 *
 * Предоставляет доступ к PipelineManager и PipelineStorage в других сервисах.
 * Автоматически доступен при использовании NeurolineModule.forRootAsync().
 * 
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(private readonly neuroline: NeurolineService) {}
 * 
 *   async doSomething() {
 *     const status = await this.neuroline.getStatus(pipelineId);
 *     // или напрямую через manager
 *     const manager = this.neuroline.getManager();
 *   }
 * }
 * ```
 */
@Injectable()
export class NeurolineService {
	constructor(
		@Inject(NEUROLINE_MANAGER)
		private readonly manager: PipelineManager,
		@Inject(NEUROLINE_STORAGE)
		private readonly storage: PipelineStorage,
	) {}

	/**
	 * Запустить pipeline
	 */
	async startPipeline(
		pipelineType: string,
		input: unknown,
		jobOptions?: Record<string, unknown>,
	): Promise<StartPipelineResponse> {
		return this.manager.startPipeline(pipelineType, {
			data: input,
			jobOptions,
		});
	}

	/**
	 * Получить статус pipeline
	 */
	async getStatus(pipelineId: string): Promise<PipelineStatusResponse> {
		return this.manager.getStatus(pipelineId);
	}

	/**
	 * Получить результат (артефакт) конкретной job
	 * 
	 * @param pipelineId - ID пайплайна
	 * @param jobName - имя job (опционально, по умолчанию — последняя job)
	 */
	async getResult(pipelineId: string, jobName?: string): Promise<PipelineResultResponse> {
		return this.manager.getResult(pipelineId, jobName);
	}

	/**
	 * Получить список pipeline с пагинацией
	 */
	async getList(
		page: number = 1,
		limit: number = 10,
		pipelineType?: string,
	): Promise<PaginatedResult<PipelineState>> {
		return this.storage.findAll({
			page: Math.max(1, page),
			limit: Math.min(100, Math.max(1, limit)),
			pipelineType,
		});
	}

	/**
	 * Получить полное состояние pipeline
	 */
	async getPipeline(pipelineId: string): Promise<PipelineState | null> {
		return this.manager.getPipeline(pipelineId);
	}

	/**
	 * Получить manager напрямую
	 */
	getManager(): PipelineManager {
		return this.manager;
	}

	/**
	 * Получить storage напрямую
	 */
	getStorage(): PipelineStorage {
		return this.storage;
	}
}

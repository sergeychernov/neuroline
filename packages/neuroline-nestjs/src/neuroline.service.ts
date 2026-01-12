import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import type {
  PipelineManager,
  PipelineStorage,
  PipelineConfig,
  StartPipelineResponse,
  PipelineStatusResponse,
  PipelineResultResponse,
  PaginatedResult,
  PipelineState,
} from 'neuroline';
import { NEUROLINE_OPTIONS } from './constants';

export interface NeurolineModuleOptions {
  /** PipelineManager инстанс */
  manager: PipelineManager;
  /** Storage инстанс */
  storage: PipelineStorage;
  /** Конфигурации pipeline для регистрации */
  pipelines?: PipelineConfig[];
}

@Injectable()
export class NeurolineService implements OnModuleInit {
  private readonly manager: PipelineManager;
  private readonly storage: PipelineStorage;

  constructor(
    @Inject(NEUROLINE_OPTIONS)
    private readonly options: NeurolineModuleOptions,
  ) {
    this.manager = options.manager;
    this.storage = options.storage;
  }

  onModuleInit() {
    // Регистрируем pipeline при инициализации модуля
    if (this.options.pipelines) {
      for (const config of this.options.pipelines) {
        this.manager.registerPipeline(config);
      }
    }
  }

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
   * Получить результаты pipeline
   */
  async getResult(pipelineId: string): Promise<PipelineResultResponse> {
    return this.manager.getResult(pipelineId);
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

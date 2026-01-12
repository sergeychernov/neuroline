import { Module, DynamicModule, Provider, Type, InjectionToken } from '@nestjs/common';
import type { PipelineManager, PipelineStorage, PipelineConfig } from 'neuroline';
import { NeurolineController } from './neuroline.controller';
import { NeurolineService, NeurolineModuleOptions } from './neuroline.service';
import { NEUROLINE_OPTIONS } from './constants';

/**
 * Опции для статической регистрации модуля
 */
export interface NeurolineModuleRegisterOptions {
  /** PipelineManager инстанс */
  manager: PipelineManager;
  /** Storage инстанс */
  storage: PipelineStorage;
  /** Конфигурации pipeline */
  pipelines?: PipelineConfig[];
  /** Глобальный модуль */
  isGlobal?: boolean;
}

/**
 * Опции для асинхронной регистрации модуля
 */
export interface NeurolineModuleAsyncOptions {
  /** Глобальный модуль */
  isGlobal?: boolean;
  /** Модули для импорта */
  imports?: Type<unknown>[];
  /** Фабрика для создания опций */
  useFactory: (...args: unknown[]) => Promise<NeurolineModuleOptions> | NeurolineModuleOptions;
  /** Зависимости для инъекции в фабрику */
  inject?: InjectionToken[];
}

/**
 * Neuroline Module для NestJS
 *
 * @example
 * ```typescript
 * // Статическая регистрация
 * @Module({
 *   imports: [
 *     NeurolineModule.register({
 *       manager: new PipelineManager({ storage }),
 *       storage,
 *       pipelines: [myPipeline],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 *
 * // Асинхронная регистрация (с MongoDB)
 * @Module({
 *   imports: [
 *     NeurolineModule.registerAsync({
 *       imports: [MongooseModule],
 *       useFactory: async (pipelineModel: Model<MongoPipelineDocument>) => {
 *         const storage = new MongoPipelineStorage(pipelineModel);
 *         const manager = new PipelineManager({ storage });
 *         return { manager, storage, pipelines: [myPipeline] };
 *       },
 *       inject: [getModelToken('Pipeline')],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class NeurolineModule {
  /**
   * Статическая регистрация модуля
   */
  static register(options: NeurolineModuleRegisterOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: NEUROLINE_OPTIONS,
      useValue: options,
    };

    return {
      module: NeurolineModule,
      global: options.isGlobal,
      controllers: [NeurolineController],
      providers: [optionsProvider, NeurolineService],
      exports: [NeurolineService],
    };
  }

  /**
   * Асинхронная регистрация модуля
   */
  static registerAsync(options: NeurolineModuleAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: NEUROLINE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    };

    return {
      module: NeurolineModule,
      global: options.isGlobal,
      imports: options.imports ?? [],
      controllers: [NeurolineController],
      providers: [optionsProvider, NeurolineService],
      exports: [NeurolineService],
    };
  }
}

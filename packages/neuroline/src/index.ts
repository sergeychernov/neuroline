/**
 * Neuroline - Pipeline Manager
 * Фреймворк-агностик библиотека для оркестрации пайплайнов
 */

// Types
export * from './types';

// Core
export { PipelineManager } from './manager';
export type { PipelineManagerOptions, StaleJobsWatchdogOptions } from './manager';

// Storage
export { InMemoryPipelineStorage } from './storage';
export type { PipelineStorage, PaginatedResult, PaginationParams } from './storage';

// MongoDB экспорты доступны через 'neuroline/mongo':
// import { MongoPipelineStorage, PipelineSchema } from 'neuroline/mongo';


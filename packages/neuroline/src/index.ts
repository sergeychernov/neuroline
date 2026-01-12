/**
 * Neuroline - Pipeline Manager
 * Фреймворк-агностик библиотека для оркестрации пайплайнов
 */

// Types
export * from './types';

// Core
export { PipelineManager } from './manager';
export type { PipelineManagerOptions } from './manager';

// Storage
export { InMemoryPipelineStorage } from './storage';
export type { PipelineStorage, PaginatedResult, PaginationParams } from './storage';

// MongoDB (optional) - также доступно через 'neuroline/mongo'
export { MongoPipelineStorage } from './mongo-storage';
export { PipelineSchema } from './mongoose-schema';
export type { MongoPipelineDocument, MongoPipelineJobState } from './mongo-storage';

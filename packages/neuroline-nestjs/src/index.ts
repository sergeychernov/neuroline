/**
 * Neuroline NestJS Module
 * Интеграция neuroline с NestJS
 */

// Module
export {
	NeurolineModule,
	type PipelineControllerOptions,
	type NeurolineModuleAsyncOptions,
	type NeurolineLogger,
} from './neuroline.module';

// Реэкспорт типов для watchdog из neuroline
export type { StaleJobsWatchdogOptions } from 'neuroline';

// Service
export { NeurolineService } from './neuroline.service';

// DI токены
export { NEUROLINE_MANAGER, NEUROLINE_STORAGE } from './constants';

// DTO типы
export type { ApiResponse, StartWithOptionsBody, GetQueryParams } from './dto';

// Реэкспорт из neuroline/mongo для удобства
export {
	MongoPipelineStorage,
	PipelineSchema,
	PipelineJobStateSchema,
	type MongoPipelineDocument,
	type MongoPipelineJobState,
} from 'neuroline/mongo';

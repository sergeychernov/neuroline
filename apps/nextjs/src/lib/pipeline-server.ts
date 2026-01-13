/**
 * Серверная конфигурация Pipeline Manager
 * Этот файл используется только на сервере (API routes)
 */

import { PipelineManager, InMemoryPipelineStorage, type PipelineConfig } from 'neuroline';
import { successPipeline, errorPipeline } from '../pipelines';

// ============================================================================
// Singleton instances
// ============================================================================

let managerInstance: PipelineManager | null = null;
let storageInstance: InMemoryPipelineStorage | null = null;

/**
 * Получает или создаёт singleton инстансы PipelineManager и Storage
 */
export function getPipelineManager() {
	if (!managerInstance) {
		storageInstance = new InMemoryPipelineStorage();
		managerInstance = new PipelineManager({
			storage: storageInstance,
			logger: {
				info: (msg, data) => console.log(`[INFO] ${msg}`, data),
				error: (msg, data) => console.error(`[ERROR] ${msg}`, data),
				warn: (msg, data) => console.warn(`[WARN] ${msg}`, data),
			},
		});
	}
	return { manager: managerInstance, storage: storageInstance! };
}

// ============================================================================
// Pipelines
// ============================================================================

/**
 * Все зарегистрированные pipeline конфигурации
 */
export const pipelines: PipelineConfig[] = [
	successPipeline as PipelineConfig,
	errorPipeline as PipelineConfig,
];

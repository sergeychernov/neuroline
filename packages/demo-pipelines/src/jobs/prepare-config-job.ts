import type { JobDefinition } from 'neuroline';
import { delay } from '../utils';

// ============================================================================
// Types
// ============================================================================

/** Входные данные для prepare-config job */
export interface PrepareConfigJobInput {
	iterations: number;
}

/** Артефакт (результат) prepare-config job */
export interface PrepareConfigJobArtifact {
	chunkSize: number;
	strategy: 'parallel' | 'sequential';
	thresholds: number[];
}

/** Опции для prepare-config job */
export interface PrepareConfigJobOptions {
	/** Задержка подготовки в мс (по умолчанию 2000) */
	delayMs?: number;
}

// ============================================================================
// Job Definition
// ============================================================================

/**
 * Prepare Config Job — подготовка конфигурации вычислений
 *
 * Симулирует тяжёлую операцию (загрузка модели, расчёт параметров).
 * Результат зависит только от iterations — идеальный кандидат для cacheable.
 * При повторном запуске с тем же iterations результат берётся из кеша мгновенно.
 */
export const prepareConfigJob: JobDefinition<PrepareConfigJobInput, PrepareConfigJobArtifact, PrepareConfigJobOptions> = {
	name: 'prepare-config',
	async execute(input, options, ctx) {
		const delayMs = options?.delayMs ?? 2000;

		ctx.logger.info('Подготовка конфигурации вычислений', {
			iterations: input.iterations,
			delayMs,
		});

		// Симулируем тяжёлую операцию (загрузка модели / расчёт параметров)
		await delay(delayMs);

		const chunkSize = Math.ceil(input.iterations / 3);
		const strategy = input.iterations > 5 ? 'parallel' : 'sequential';

		const thresholds: number[] = [];
		for (let i = 1; i <= input.iterations; i++) {
			thresholds.push(Math.round(Math.pow(i, 1.5) * 100) / 100);
		}

		ctx.logger.info('Конфигурация подготовлена', { chunkSize, strategy });

		return {
			chunkSize,
			strategy,
			thresholds,
		};
	},
};

import type { JobDefinition } from 'neuroline';
import { delay } from '../utils';

// ============================================================================
// Types
// ============================================================================

/** Входные данные для transform job */
export interface TransformJobInput {
	values: number[];
	processId: string;
}

/** Артефакт (результат) transform job */
export interface TransformJobArtifact {
	transformed: number[];
	stats: {
		min: number;
		max: number;
		avg: number;
		sum: number;
		count: number;
	};
	transformedAt: number;
}

/** Опции для transform job */
export interface TransformJobOptions {
	/** Задержка трансформации в мс (по умолчанию 1200) */
	delayMs?: number;
	/** Функция трансформации: square, double, normalize */
	transformType?: 'square' | 'double' | 'normalize';
}

// ============================================================================
// Job Definition
// ============================================================================

/**
 * Transform Job — трансформирует массив данных
 * Применяет математические преобразования и собирает статистику
 */
export const transformJob: JobDefinition<TransformJobInput, TransformJobArtifact, TransformJobOptions> = {
	name: 'transform',
	async execute(input, options, ctx) {
		const delayMs = options?.delayMs ?? 1200;
		const transformType = options?.transformType ?? 'double';

		ctx.logger.info('Начинаю трансформацию', {
			processId: input.processId,
			valuesCount: input.values.length,
			transformType,
		});

		// Симулируем время трансформации
		await delay(delayMs);

		// Применяем трансформацию
		let transformed: number[];
		switch (transformType) {
			case 'square':
				transformed = input.values.map((v) => Math.round(v * v * 100) / 100);
				break;
			case 'normalize':
				const max = Math.max(...input.values);
				transformed = input.values.map((v) => Math.round((v / max) * 100) / 100);
				break;
			case 'double':
			default:
				transformed = input.values.map((v) => Math.round(v * 2 * 100) / 100);
				break;
		}

		// Вычисляем статистику
		const sum = transformed.reduce((acc, v) => acc + v, 0);
		const stats = {
			min: Math.min(...transformed),
			max: Math.max(...transformed),
			avg: Math.round((sum / transformed.length) * 100) / 100,
			sum: Math.round(sum * 100) / 100,
			count: transformed.length,
		};

		ctx.logger.info('Трансформация завершена', { stats });

		return {
			transformed,
			stats,
			transformedAt: Date.now(),
		};
	},
};

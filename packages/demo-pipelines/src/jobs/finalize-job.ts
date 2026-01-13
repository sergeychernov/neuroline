import type { JobDefinition } from 'neuroline';
import { delay } from '../utils';

// ============================================================================
// Types
// ============================================================================

/** Входные данные для finalize job */
export interface FinalizeJobInput {
	processId: string;
	computeResult: number;
	transformStats: {
		min: number;
		max: number;
		avg: number;
		sum: number;
		count: number;
	};
}

/** Артефакт (результат) finalize job */
export interface FinalizeJobArtifact {
	summary: {
		processId: string;
		finalScore: number;
		grade: 'A' | 'B' | 'C' | 'D' | 'F';
		completedAt: number;
	};
	metadata: {
		processingTime: string;
		dataPoints: number;
	};
}

/** Опции для finalize job */
export interface FinalizeJobOptions {
	/** Задержка финализации в мс (по умолчанию 1000) */
	delayMs?: number;
}

// ============================================================================
// Job Definition
// ============================================================================

/**
 * Finalize Job — собирает итоговый результат pipeline
 * Агрегирует данные из предыдущих jobs и формирует summary
 */
export const finalizeJob: JobDefinition<FinalizeJobInput, FinalizeJobArtifact, FinalizeJobOptions> = {
	name: 'finalize',
	async execute(input, options, ctx) {
		const delayMs = options?.delayMs ?? 1000;

		ctx.logger.info('Начинаю финализацию', { processId: input.processId });

		// Симулируем время финализации
		await delay(delayMs);

		// Вычисляем итоговый балл на основе результатов
		const { computeResult, transformStats } = input;
		const finalScore = Math.round(
			(computeResult * 0.3 + transformStats.avg * 0.4 + transformStats.sum * 0.3) / 10,
		);

		// Определяем грейд
		let grade: 'A' | 'B' | 'C' | 'D' | 'F';
		if (finalScore >= 90) grade = 'A';
		else if (finalScore >= 80) grade = 'B';
		else if (finalScore >= 70) grade = 'C';
		else if (finalScore >= 60) grade = 'D';
		else grade = 'F';

		const result: FinalizeJobArtifact = {
			summary: {
				processId: input.processId,
				finalScore,
				grade,
				completedAt: Date.now(),
			},
			metadata: {
				processingTime: `${delayMs}ms`,
				dataPoints: transformStats.count,
			},
		};

		ctx.logger.info('Финализация завершена', {
			finalScore,
			grade,
			dataPoints: transformStats.count,
		});

		return result;
	},
};

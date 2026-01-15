import type { JobDefinition } from 'neuroline';
import { delay } from '../utils';

// ============================================================================
// Types
// ============================================================================

/** Входные данные для unstable job */
export interface UnstableJobInput {
	processId: string;
	/** Сколько раз job должна упасть перед успешным завершением (по умолчанию 0 — не падать) */
	failCount?: number;
}

/** Артефакт (результат) unstable job */
export interface UnstableJobArtifact {
	/** Job завершилась успешно */
	passed: boolean;
	/** ProcessId из входных данных */
	processId: string;
	/** Сколько попыток потребовалось для успешного завершения */
	attemptsNeeded: number;
}

/** Опции для unstable job (не используются) */
export type UnstableJobOptions = undefined;

// Счётчик попыток для каждого processId (эмуляция нестабильности)
const attemptCounters = new Map<string, number>();

// ============================================================================
// Job Definition
// ============================================================================

/**
 * Unstable Job — нестабильная job для демонстрации retry
 * Падает `failCount` раз, затем успешно завершается
 * Использует in-memory счётчик для отслеживания попыток
 */
export const unstableJob: JobDefinition<UnstableJobInput, UnstableJobArtifact, UnstableJobOptions> = {
	name: 'unstable-task',
	async execute(input, _options, ctx) {
		const failCount = input.failCount ?? 0;

		// Получаем или инициализируем счётчик попыток для этого processId
		const attemptKey = `${ctx.pipelineId}:${input.processId}`;
		const currentAttempt = (attemptCounters.get(attemptKey) ?? 0) + 1;
		attemptCounters.set(attemptKey, currentAttempt);

		ctx.logger.info('Начинаю выполнение нестабильной задачи', {
			processId: input.processId,
			failCount,
			currentAttempt,
			willFail: currentAttempt <= failCount,
		});

		// Симулируем работу
		await delay(1000);

		// Если ещё не достигли нужного количества падений — падаем
		if (currentAttempt <= failCount) {
			ctx.logger.warn(`Попытка ${currentAttempt}/${failCount + 1} — ошибка`, {
				processId: input.processId,
				remainingFails: failCount - currentAttempt,
			});

			throw new Error(`Временная ошибка (попытка ${currentAttempt}/${failCount + 1})`);
		}

		// Успешное завершение
		ctx.logger.info('Нестабильная задача выполнена успешно', {
			processId: input.processId,
			attemptsNeeded: currentAttempt,
		});

		// Очищаем счётчик после успешного завершения
		attemptCounters.delete(attemptKey);

		return {
			passed: true,
			processId: input.processId,
			attemptsNeeded: currentAttempt,
		};
	},
};

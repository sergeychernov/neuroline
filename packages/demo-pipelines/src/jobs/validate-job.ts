import type { JobDefinition } from 'neuroline';
import { delay } from '../utils';

// ============================================================================
// Types
// ============================================================================

/** Входные данные для validate job */
export interface ValidateJobInput {
	processId: string;
	inputSeed: number;
}

/** Артефакт (результат) validate job */
export interface ValidateJobArtifact {
	valid: boolean;
	validatedAt: number;
	checksPassed: string[];
}

/** Опции для validate job */
export interface ValidateJobOptions {
	/** Задержка валидации в мс (по умолчанию 800) */
	delayMs?: number;
	/** Строгий режим валидации */
	strictMode?: boolean;
}

// ============================================================================
// Job Definition
// ============================================================================

/**
 * Validate Job — валидирует инициализированные данные
 * Выполняет серию проверок с задержкой
 */
export const validateJob: JobDefinition<ValidateJobInput, ValidateJobArtifact, ValidateJobOptions> = {
	name: 'validate',
	async execute(input, options, ctx) {
		const delayMs = options?.delayMs ?? 800;
		const strictMode = options?.strictMode ?? false;

		ctx.logger.info('Начинаю валидацию', { processId: input.processId, strictMode });

		const checksPassed: string[] = [];

		// Проверка 1: processId существует
		if (input.processId) {
			checksPassed.push('process_id_exists');
		}

		// Проверка 2: seed валиден
		if (input.inputSeed > 0) {
			checksPassed.push('seed_positive');
		}

		// Проверка 3: формат processId
		if (input.processId.startsWith('proc_')) {
			checksPassed.push('process_id_format');
		}

		// Симулируем время валидации
		await delay(delayMs);

		// В строгом режиме нужно больше проверок
		const requiredChecks = strictMode ? 3 : 2;
		const valid = checksPassed.length >= requiredChecks;

		ctx.logger.info('Валидация завершена', {
			valid,
			checksCount: checksPassed.length,
			requiredChecks,
		});

		return {
			valid,
			validatedAt: Date.now(),
			checksPassed,
		};
	},
};

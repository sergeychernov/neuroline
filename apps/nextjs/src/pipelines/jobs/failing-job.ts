import type { JobDefinition } from 'neuroline';

/**
 * Утилита для создания задержки
 */
const delay = (ms: number): Promise<void> => 
    new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================================
// Types
// ============================================================================

/** Входные данные для failing job */
export interface FailingJobInput {
    processId: string;
    shouldFail?: boolean;
}

/** Артефакт (результат) failing job - никогда не возвращается */
export interface FailingJobArtifact {
    neverReached: true;
}

/** Опции для failing job */
export interface FailingJobOptions {
    /** Задержка перед падением в мс (по умолчанию 1500) */
    delayMs?: number;
    /** Сообщение об ошибке */
    errorMessage?: string;
}

// ============================================================================
// Job Definition
// ============================================================================

/**
 * Failing Job — job, которая всегда падает с ошибкой
 * Используется для демонстрации обработки ошибок в pipeline
 */
export const failingJob: JobDefinition<FailingJobInput, FailingJobArtifact, FailingJobOptions> = {
    name: 'failing-task',
    async execute(input, options, ctx) {
        const delayMs = options?.delayMs ?? 1500;
        const errorMessage = options?.errorMessage ?? 'Критическая ошибка обработки данных';
        
        ctx.logger.info('Начинаю выполнение задачи', { processId: input.processId });
        
        // Симулируем работу перед падением
        await delay(delayMs);
        
        ctx.logger.warn('Обнаружена проблема, операция будет прервана', {
            processId: input.processId,
        });
        
        // Симулируем ещё немного работы
        await delay(500);
        
        ctx.logger.error('Невозможно продолжить выполнение', { 
            reason: 'simulated_failure',
        });
        
        // Бросаем ошибку
        throw new Error(errorMessage);
    },
};

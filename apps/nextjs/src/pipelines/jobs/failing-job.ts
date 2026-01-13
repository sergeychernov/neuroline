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

/** Артефакт (результат) failing job */
export interface FailingJobArtifact {
    /** Job завершилась успешно (shouldFail было false) */
    passed: boolean;
    /** ProcessId из входных данных */
    processId: string;
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
 * Failing Job — условно падающая job
 * Если input.shouldFail === true — падает с ошибкой
 * Иначе — успешно завершается
 */
export const failingJob: JobDefinition<FailingJobInput, FailingJobArtifact, FailingJobOptions> = {
    name: 'failing-task',
    async execute(input, options, ctx) {
        const delayMs = options?.delayMs ?? 1500;
        const errorMessage = options?.errorMessage ?? 'Критическая ошибка обработки данных';
        const shouldFail = input.shouldFail ?? false;
        
        ctx.logger.info('Начинаю выполнение задачи', { 
            processId: input.processId,
            shouldFail,
        });
        
        // Симулируем работу
        await delay(delayMs);
        
        if (shouldFail) {
            ctx.logger.warn('Обнаружена проблема, операция будет прервана', {
                processId: input.processId,
            });
            
            // Симулируем ещё немного работы перед падением
            await delay(500);
            
            ctx.logger.error('Невозможно продолжить выполнение', { 
                reason: 'simulated_failure',
            });
            
            // Бросаем ошибку
            throw new Error(errorMessage);
        }
        
        ctx.logger.info('Задача выполнена успешно', { 
            processId: input.processId,
        });
        
        return {
            passed: true,
            processId: input.processId,
        };
    },
};

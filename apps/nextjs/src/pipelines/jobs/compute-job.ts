import type { JobDefinition } from 'neuroline';

/**
 * Утилита для создания задержки
 */
const delay = (ms: number): Promise<void> => 
    new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================================
// Types
// ============================================================================

/** Входные данные для compute job */
export interface ComputeJobInput {
    seed: number;
    iterations?: number;
}

/** Артефакт (результат) compute job */
export interface ComputeJobArtifact {
    result: number;
    iterationsPerformed: number;
    computeTimeMs: number;
    intermediateValues: number[];
}

/** Опции для compute job */
export interface ComputeJobOptions {
    /** Задержка между итерациями в мс (по умолчанию 100) */
    iterationDelayMs?: number;
    /** Множитель вычислений */
    multiplier?: number;
}

// ============================================================================
// Job Definition
// ============================================================================

/**
 * Compute Job — выполняет вычисления над данными
 * Симулирует тяжёлые вычисления с помощью итераций и задержек
 */
export const computeJob: JobDefinition<ComputeJobInput, ComputeJobArtifact, ComputeJobOptions> = {
    name: 'compute',
    async execute(input, options, ctx) {
        const iterations = input.iterations ?? 10;
        const iterationDelayMs = options?.iterationDelayMs ?? 100;
        const multiplier = options?.multiplier ?? 1.5;
        
        ctx.logger.info('Начинаю вычисления', { 
            seed: input.seed, 
            iterations,
            multiplier,
        });
        
        const startTime = Date.now();
        const intermediateValues: number[] = [];
        
        let result = input.seed;
        
        // Выполняем итеративные вычисления
        for (let i = 0; i < iterations; i++) {
            // Простые математические операции
            result = Math.round((result * multiplier + i) * 100) / 100;
            intermediateValues.push(result);
            
            // Небольшая задержка между итерациями
            await delay(iterationDelayMs);
            
            if (i % 3 === 0) {
                ctx.logger.info(`Итерация ${i + 1}/${iterations}`, { currentValue: result });
            }
        }
        
        const computeTimeMs = Date.now() - startTime;
        
        ctx.logger.info('Вычисления завершены', { 
            result, 
            computeTimeMs,
            iterationsPerformed: iterations,
        });
        
        return {
            result,
            iterationsPerformed: iterations,
            computeTimeMs,
            intermediateValues,
        };
    },
};

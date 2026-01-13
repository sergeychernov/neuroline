import type { JobDefinition } from 'neuroline';

/**
 * Утилита для создания задержки
 */
const delay = (ms: number): Promise<void> => 
    new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================================
// Types
// ============================================================================

/** Входные данные для init job */
export interface InitJobInput {
    seed: number;
    name: string;
}

/** Артефакт (результат) init job */
export interface InitJobArtifact {
    initialized: boolean;
    timestamp: number;
    processId: string;
    inputSeed: number;
}

/** Опции для init job */
export interface InitJobOptions {
    /** Задержка инициализации в мс (по умолчанию 1000) */
    delayMs?: number;
}

// ============================================================================
// Job Definition
// ============================================================================

/**
 * Init Job — инициализирует процесс обработки
 * Симулирует подготовку ресурсов с задержкой
 */
export const initJob: JobDefinition<InitJobInput, InitJobArtifact, InitJobOptions> = {
    name: 'init',
    async execute(input, options, ctx) {
        const delayMs = options?.delayMs ?? 1000;
        
        ctx.logger.info('Начинаю инициализацию', { seed: input.seed, delayMs });
        
        // Симулируем время инициализации
        await delay(delayMs);
        
        // Генерируем processId на основе seed и времени
        const processId = `proc_${input.seed.toString(36)}_${Date.now().toString(36)}`;
        
        ctx.logger.info('Инициализация завершена', { processId });
        
        return {
            initialized: true,
            timestamp: Date.now(),
            processId,
            inputSeed: input.seed,
        };
    },
};

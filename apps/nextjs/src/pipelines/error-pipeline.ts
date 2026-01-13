import type { PipelineConfig, JobInPipeline, PipelineStage } from 'neuroline';
import { initJob, type InitJobArtifact } from './jobs/init-job';
import { validateJob } from './jobs/validate-job';
import { computeJob, type ComputeJobArtifact } from './jobs/compute-job';
import { failingJob } from './jobs/failing-job';

// ============================================================================
// Pipeline Input Types
// ============================================================================

/** Входные данные для error pipeline */
export interface ErrorPipelineInput {
    /** Начальное значение для вычислений */
    seed: number;
    /** Имя процесса */
    name: string;
    /** Количество итераций для compute job */
    iterations?: number;
}

// ============================================================================
// Synapses (трансформация данных между jobs)
// ============================================================================

/**
 * Synapse: PipelineInput -> Init
 * Передаёт seed и name из входных данных pipeline
 */
const inputToInit: JobInPipeline['synapses'] = (ctx) => {
    const input = ctx.pipelineInput as ErrorPipelineInput;
    return {
        seed: input.seed,
        name: input.name,
    };
};

/**
 * Synapse: Init -> Validate
 * Передаёт processId и seed из артефакта init job
 */
const initToValidate: JobInPipeline['synapses'] = (ctx) => {
    const initArtifact = ctx.getArtifact<InitJobArtifact>('init');
    return {
        processId: initArtifact?.processId ?? 'unknown',
        inputSeed: initArtifact?.inputSeed ?? 0,
    };
};

/**
 * Synapse: Init -> Compute
 * Передаёт seed и iterations из pipelineInput
 */
const inputToCompute: JobInPipeline['synapses'] = (ctx) => {
    const input = ctx.pipelineInput as ErrorPipelineInput;
    return {
        seed: input.seed,
        iterations: input.iterations ?? 10,
    };
};

/**
 * Synapse: Compute -> Failing
 * Передаёт processId для failing job
 */
const toFailing: JobInPipeline['synapses'] = (ctx) => {
    const initArtifact = ctx.getArtifact<InitJobArtifact>('init');
    return {
        processId: initArtifact?.processId ?? 'unknown',
        shouldFail: true,
    };
};

// ============================================================================
// Pipeline Configuration
// ============================================================================

/**
 * Error Pipeline — выполняется ~5 секунд, затем падает с ошибкой
 * 
 * Структура stages:
 * 1. [init] - инициализация (1 сек)
 * 2. [validate, compute] - параллельно валидация и вычисления (1 сек)
 * 3. [failing-task] - задача, которая падает (2 сек)
 * 
 * Общее время до ошибки: ~4-5 секунд
 */
export const errorPipeline: PipelineConfig<ErrorPipelineInput> = {
    name: 'error-pipeline',
    stages: [
        // Stage 1: Инициализация
        { job: initJob, synapses: inputToInit },
        
        // Stage 2: Параллельно валидация и вычисления
        [
            { job: validateJob, synapses: initToValidate },
            { job: computeJob, synapses: inputToCompute },
        ],
        
        // Stage 3: Падающая задача
        { job: failingJob, synapses: toFailing },
    ] as PipelineStage[],
    computeInputHash: (input) => `error_${input.seed}_${input.name}`,
};

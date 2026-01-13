import type { PipelineConfig, JobInPipeline, PipelineStage } from 'neuroline';
import { initJob, type InitJobInput, type InitJobArtifact } from './jobs/init-job';
import { validateJob, type ValidateJobArtifact } from './jobs/validate-job';
import { computeJob, type ComputeJobArtifact } from './jobs/compute-job';
import { transformJob, type TransformJobArtifact } from './jobs/transform-job';
import { finalizeJob } from './jobs/finalize-job';

// ============================================================================
// Pipeline Input Types
// ============================================================================

/** Входные данные для success pipeline */
export interface SuccessPipelineInput {
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
	const input = ctx.pipelineInput as SuccessPipelineInput;
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
	const input = ctx.pipelineInput as SuccessPipelineInput;
	return {
		seed: input.seed,
		iterations: input.iterations ?? 10,
	};
};

/**
 * Synapse: Compute -> Transform
 * Передаёт промежуточные значения из compute job
 */
const computeToTransform: JobInPipeline['synapses'] = (ctx) => {
	const initArtifact = ctx.getArtifact<InitJobArtifact>('init');
	const computeArtifact = ctx.getArtifact<ComputeJobArtifact>('compute');
	return {
		processId: initArtifact?.processId ?? 'unknown',
		values: computeArtifact?.intermediateValues ?? [],
	};
};

/**
 * Synapse: Transform -> Finalize
 * Собирает данные из всех предыдущих jobs
 */
const toFinalize: JobInPipeline['synapses'] = (ctx) => {
	const initArtifact = ctx.getArtifact<InitJobArtifact>('init');
	const computeArtifact = ctx.getArtifact<ComputeJobArtifact>('compute');
	const transformArtifact = ctx.getArtifact<TransformJobArtifact>('transform');
	return {
		processId: initArtifact?.processId ?? 'unknown',
		computeResult: computeArtifact?.result ?? 0,
		transformStats: transformArtifact?.stats ?? { min: 0, max: 0, avg: 0, sum: 0, count: 0 },
	};
};

// ============================================================================
// Pipeline Configuration
// ============================================================================

/**
 * Success Pipeline — успешно выполняется за ~5 секунд
 * 
 * Структура stages:
 * 1. [init] - инициализация (1 сек)
 * 2. [validate, compute] - параллельно валидация и вычисления (1 сек)
 * 3. [transform] - трансформация данных (1.2 сек)
 * 4. [finalize] - финализация и сборка результата (1 сек)
 * 
 * Общее время: ~4-5 секунд
 */
export const successPipeline: PipelineConfig<SuccessPipelineInput> = {
	name: 'success-pipeline',
	stages: [
		// Stage 1: Инициализация
		{ job: initJob, synapses: inputToInit },

		// Stage 2: Параллельно валидация и вычисления
		[
			{ job: validateJob, synapses: initToValidate },
			{ job: computeJob, synapses: inputToCompute },
		],

		// Stage 3: Трансформация данных
		{ job: transformJob, synapses: computeToTransform },

		// Stage 4: Финализация
		{ job: finalizeJob, synapses: toFinalize },
	] as PipelineStage[],
	computeInputHash: (input) => `success_${input.seed}_${input.name}`,
};

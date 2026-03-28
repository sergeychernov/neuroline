import type { PipelineConfig, SynapseContext } from 'neuroline';
import { initJob, type InitJobArtifact } from './jobs/init-job';
import { validateJob } from './jobs/validate-job';
import { computeJob, type ComputeJobArtifact } from './jobs/compute-job';
import { transformJob, type TransformJobArtifact } from './jobs/transform-job';
import { finalizeJob } from './jobs/finalize-job';
import type { DemoPipelineInput } from './demo-pipeline';

// ============================================================================
// Synapses
// ============================================================================

const inputToInit = (ctx: SynapseContext<DemoPipelineInput>) => {
	const input = ctx.pipelineInput;
	return { seed: input.seed, name: input.name };
};

const initToValidate = (ctx: SynapseContext<DemoPipelineInput>) => {
	const a = ctx.getArtifact<InitJobArtifact>('init');
	return { processId: a?.processId ?? 'unknown', inputSeed: a?.inputSeed ?? 0 };
};

const inputToCompute = (ctx: SynapseContext<DemoPipelineInput>) => {
	const input = ctx.pipelineInput;
	return { seed: input.seed, iterations: input.iterations ?? 10 };
};

const computeToTransform = (ctx: SynapseContext<DemoPipelineInput>) => {
	const initArtifact = ctx.getArtifact<InitJobArtifact>('init');
	const computeArtifact = ctx.getArtifact<ComputeJobArtifact>('compute');
	return {
		processId: initArtifact?.processId ?? 'unknown',
		values: computeArtifact?.intermediateValues ?? [],
	};
};

const toFinalize = (ctx: SynapseContext<DemoPipelineInput>) => {
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
 * Manual Demo Pipeline — демонстрация manual jobs
 *
 * Структура stages:
 * 1. [init] — инициализация
 * 2. [validate, compute] — параллельно
 * 3. [transform] — manual: true, ждёт ручного запуска
 * 4. [finalize] — финализация
 *
 * Pipeline остановится на stage 3 (статус awaiting_manual).
 * Для продолжения нужно вызвать runManualJob('transform').
 */
export const manualDemoPipeline: PipelineConfig<DemoPipelineInput> = {
	name: 'manual-demo-pipeline',
	stages: [
		{ job: initJob, synapses: inputToInit },
		[
			{ job: validateJob, synapses: initToValidate },
			{ job: computeJob, synapses: inputToCompute },
		],
		{ job: transformJob, synapses: computeToTransform, manual: true },
		{ job: finalizeJob, synapses: toFinalize },
	],
	computeInputHash: (input) =>
		`manual_${input.seed}_${input.name}`,
};

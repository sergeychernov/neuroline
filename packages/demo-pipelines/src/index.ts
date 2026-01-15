/**
 * Demo Pipelines
 *
 * Общий пакет с демо pipelines для тестирования neuroline.
 * Используется в apps/nextjs и apps/nestjs.
 */

// ============================================================================
// Jobs
// ============================================================================

export {
	initJob,
	type InitJobInput,
	type InitJobArtifact,
	type InitJobOptions,
	validateJob,
	type ValidateJobInput,
	type ValidateJobArtifact,
	type ValidateJobOptions,
	computeJob,
	type ComputeJobInput,
	type ComputeJobArtifact,
	type ComputeJobOptions,
	transformJob,
	type TransformJobInput,
	type TransformJobArtifact,
	type TransformJobOptions,
	failingJob,
	type FailingJobInput,
	type FailingJobArtifact,
	type FailingJobOptions,
	unstableJob,
	type UnstableJobInput,
	type UnstableJobArtifact,
	type UnstableJobOptions,
	finalizeJob,
	type FinalizeJobInput,
	type FinalizeJobArtifact,
	type FinalizeJobOptions,
} from './jobs';

// ============================================================================
// Pipelines
// ============================================================================

export { demoPipeline, type DemoPipelineInput } from './demo-pipeline';

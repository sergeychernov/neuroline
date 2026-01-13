/**
 * Neuroline Test Pipelines
 * 
 * Тестовые pipelines для демонстрации работы библиотеки.
 * Каждый pipeline использует setTimeout для симуляции асинхронной работы,
 * не зависит от сети и файловой системы.
 */

// ============================================================================
// Jobs
// ============================================================================

export { initJob, type InitJobInput, type InitJobArtifact, type InitJobOptions } from './jobs/init-job';
export { validateJob, type ValidateJobInput, type ValidateJobArtifact, type ValidateJobOptions } from './jobs/validate-job';
export { computeJob, type ComputeJobInput, type ComputeJobArtifact, type ComputeJobOptions } from './jobs/compute-job';
export { transformJob, type TransformJobInput, type TransformJobArtifact, type TransformJobOptions } from './jobs/transform-job';
export { finalizeJob, type FinalizeJobInput, type FinalizeJobArtifact, type FinalizeJobOptions } from './jobs/finalize-job';
export { failingJob, type FailingJobInput, type FailingJobArtifact, type FailingJobOptions } from './jobs/failing-job';

// ============================================================================
// Pipelines
// ============================================================================

export { successPipeline, type SuccessPipelineInput } from './success-pipeline';
export { errorPipeline, type ErrorPipelineInput } from './error-pipeline';

// ============================================================================
// All Pipelines (для регистрации в manager)
// ============================================================================

import { successPipeline } from './success-pipeline';
import { errorPipeline } from './error-pipeline';

/** Все тестовые pipelines для регистрации */
export const testPipelines = [successPipeline, errorPipeline];

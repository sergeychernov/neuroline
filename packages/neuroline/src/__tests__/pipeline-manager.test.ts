import { describe, it, expect } from 'vitest';

import type { PipelineConfig, JobDefinition } from '../types';
import { PipelineManager } from '../manager';
import { InMemoryPipelineStorage } from '../storage';

const asStageJob = <TInput, TOutput, TOptions>(
	job: JobDefinition<TInput, TOutput, TOptions>,
): JobDefinition => job;

const runPipeline = async <TInput>(
	manager: PipelineManager,
	pipelineType: string,
	input: TInput,
): Promise<{ pipelineId: string; isNew: boolean }> => {
	let executionPromise: Promise<void> | null = null;
	const response = await manager.startPipeline(
		pipelineType,
		{ data: input },
		{
			onExecutionStart: (promise) => {
				executionPromise = promise;
			},
		},
	);

	if (!executionPromise) {
		throw new Error('Execution promise was not provided');
	}

	await executionPromise;
	return response;
};

describe('PipelineManager', () => {
	it('выполняет pipeline и сохраняет артефакты', async () => {
		const storage = new InMemoryPipelineStorage();
		const manager = new PipelineManager({ storage });

		const fetchJob: JobDefinition<{ seed: number }, { value: number }> = {
			name: 'fetch',
			execute: async (input) => ({ value: input.seed + 1 }),
		};

		const transformJob: JobDefinition<{ value: number }, number> = {
			name: 'transform',
			execute: async (input) => input.value * 2,
		};

		const config: PipelineConfig<{ seed: number }> = {
			name: 'demo',
			stages: [
				asStageJob(fetchJob),
				{
					job: asStageJob(transformJob),
					synapses: (ctx) => ({
						value: ctx.getArtifact<{ value: number }>('fetch')?.value ?? 0,
					}),
				},
			],
		};

		manager.registerPipeline(config);
		const response = await runPipeline(manager, 'demo', { seed: 1 });

		const pipeline = await storage.findById(response.pipelineId);
		expect(pipeline).not.toBeNull();
		expect(pipeline?.status).toBe('done');
		expect(pipeline?.jobs.map((job) => job.status)).toEqual(['done', 'done']);
		expect(pipeline?.jobs[0].artifact).toEqual({ value: 2 });
		expect(pipeline?.jobs[1].input).toEqual({ value: 2 });

		const result = await manager.getResult(response.pipelineId);
		expect(result.jobName).toBe('transform');
		expect(result.artifact).toBe(4);
	});

	it('делает ретраи и сохраняет retryCount', async () => {
		const storage = new InMemoryPipelineStorage();
		const manager = new PipelineManager({ storage });

		let attempts = 0;
		const retryJob: JobDefinition<number, number> = {
			name: 'retry-job',
			execute: async (input) => {
				if (attempts < 1) {
					attempts += 1;
					throw new Error('boom');
				}
				return input + 1;
			},
		};

		const config: PipelineConfig<number> = {
			name: 'retry-pipeline',
			stages: [
				{
					job: asStageJob(retryJob),
					retries: 1,
					retryDelay: 1,
				},
			],
		};

		manager.registerPipeline(config);
		const response = await runPipeline(manager, 'retry-pipeline', 10);

		const pipeline = await storage.findById(response.pipelineId);
		expect(pipeline?.status).toBe('done');
		expect(pipeline?.jobs[0].retryCount).toBe(1);
		expect(pipeline?.jobs[0].maxRetries).toBe(1);
		expect(attempts).toBe(1);
	});

	it('инвалидирует pipeline при изменении конфигурации', async () => {
		const storage = new InMemoryPipelineStorage();
		const manager = new PipelineManager({ storage });

		const jobA: JobDefinition<number, number> = {
			name: 'job-a',
			execute: async (input) => input + 1,
		};

		const jobB: JobDefinition<number, number> = {
			name: 'job-b',
			execute: async (input) => input + 2,
		};

		manager.registerPipeline({
			name: 'hash-pipeline',
			stages: [asStageJob(jobA)],
		});

		const firstRun = await runPipeline(manager, 'hash-pipeline', 1);

		manager.registerPipeline({
			name: 'hash-pipeline',
			stages: [asStageJob(jobB)],
		});

		const secondRun = await runPipeline(manager, 'hash-pipeline', 1);

		expect(firstRun.pipelineId).toBe(secondRun.pipelineId);
		expect(secondRun.isNew).toBe(true);

		const pipeline = await storage.findById(secondRun.pipelineId);
		expect(pipeline?.jobs).toHaveLength(1);
		expect(pipeline?.jobs[0].name).toBe('job-b');
	});

	it('возвращает информацию об ошибке в статусе', async () => {
		const storage = new InMemoryPipelineStorage();
		const manager = new PipelineManager({ storage });

		const failJob: JobDefinition<void, void> = {
			name: 'fail-job',
			execute: async () => {
				throw new Error('fail');
			},
		};

		manager.registerPipeline({
			name: 'error-pipeline',
			stages: [asStageJob(failJob)],
		});

		const response = await runPipeline(manager, 'error-pipeline', undefined);
		const status = await manager.getStatus(response.pipelineId);

		expect(status.status).toBe('error');
		expect(status.error?.jobName).toBe('fail-job');
	});
});

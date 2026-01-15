import { describe, it, expect } from 'vitest';

import type { PipelineState } from '../types';
import { InMemoryPipelineStorage } from '../storage';

const createState = (overrides: Partial<PipelineState>): PipelineState => ({
	pipelineId: overrides.pipelineId ?? 'pipeline-id',
	pipelineType: overrides.pipelineType ?? 'demo',
	status: overrides.status ?? 'processing',
	currentJobIndex: overrides.currentJobIndex ?? 0,
	input: overrides.input ?? {},
	jobOptions: overrides.jobOptions,
	jobs: overrides.jobs ?? [{ name: 'job', status: 'pending' }],
	configHash: overrides.configHash ?? 'hash',
	createdAt: overrides.createdAt,
	updatedAt: overrides.updatedAt,
});

describe('InMemoryPipelineStorage', () => {
	it('таймаутит зависшие jobs и обновляет статус pipeline', async () => {
		const storage = new InMemoryPipelineStorage();

		const pipeline = createState({
			pipelineId: 'stale-pipeline',
			status: 'processing',
			jobs: [
				{
					name: 'job-1',
					status: 'processing',
					startedAt: new Date(Date.now() - 60_000),
				},
			],
		});

		await storage.create(pipeline);
		const timedOut = await storage.findAndTimeoutStaleJobs(1000);

		const updated = await storage.findById('stale-pipeline');
		expect(timedOut).toBe(1);
		expect(updated?.status).toBe('error');
		expect(updated?.jobs[0].status).toBe('error');
		expect(updated?.jobs[0].error?.message).toContain('timed out');
	});

	it('поддерживает пагинацию и фильтрацию по типу', async () => {
		const storage = new InMemoryPipelineStorage();

		await storage.create(createState({ pipelineId: 'p1', pipelineType: 'type-a' }));
		await storage.create(createState({ pipelineId: 'p2', pipelineType: 'type-b' }));
		await storage.create(createState({ pipelineId: 'p3', pipelineType: 'type-a' }));

		const page = await storage.findAll({ page: 1, limit: 2 });
		expect(page.total).toBe(3);
		expect(page.items).toHaveLength(2);
		expect(page.totalPages).toBe(2);

		const filtered = await storage.findAll({ pipelineType: 'type-a' });
		expect(filtered.total).toBe(2);
		expect(filtered.items.every((item) => item.pipelineType === 'type-a')).toBe(true);
	});
});

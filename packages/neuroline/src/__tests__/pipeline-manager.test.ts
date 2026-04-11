import crypto from 'node:crypto';

import { describe, it, expect } from 'vitest';

import type { PipelineConfig, JobDefinition } from '../types';
import { PipelineManager } from '../manager';
import { InMemoryPipelineStorage } from '../storage';

const asStageJob = <TInput, TOutput, TOptions>(
	job: JobDefinition<TInput, TOutput, TOptions>,
): JobDefinition => job as unknown as JobDefinition;

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

	it('делает ретраи и сохраняет retryCount и errors', async () => {
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
		// Ошибка первой попытки сохранена в errors
		expect(pipeline?.jobs[0].errors).toHaveLength(1);
		expect(pipeline?.jobs[0].errors?.[0].message).toBe('boom');
		expect(pipeline?.jobs[0].errors?.[0].attempt).toBe(0);
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

	it('дедуплицирует cacheable job через встроенный кеш storage', async () => {
		const storage = new InMemoryPipelineStorage();
		const manager = new PipelineManager({ storage });

		let executeCount = 0;

		const cacheableJob: JobDefinition<number, number> = {
			name: 'cacheable-job',
			execute: async (input) => {
				executeCount++;
				return input * 10;
			},
		};

		const config: PipelineConfig<number> = {
			name: 'cache-test',
			stages: [
				{ job: asStageJob(cacheableJob), cacheable: true },
			],
		};

		manager.registerPipeline(config);

		const first = await runPipeline(manager, 'cache-test', 5);
		expect(executeCount).toBe(1);

		const pipeline1 = await storage.findById(first.pipelineId);
		expect(pipeline1?.jobs[0].artifact).toBe(50);
		expect(pipeline1?.jobs[0].inputHash).toBeDefined();

		// Удаляем pipeline и запускаем заново с тем же input
		await storage.delete(first.pipelineId);

		const second = await runPipeline(manager, 'cache-test', 5);

		// Job не должна выполняться повторно — результат из кеша
		expect(executeCount).toBe(1);

		const pipeline2 = await storage.findById(second.pipelineId);
		expect(pipeline2?.jobs[0].artifact).toBe(50);
	});

	it('downstream job получает артефакт cacheable job из кеша через synapses', async () => {
		const storage = new InMemoryPipelineStorage();
		const manager = new PipelineManager({ storage });

		let cacheableExecuteCount = 0;

		const cacheableJob: JobDefinition<number, { value: number }> = {
			name: 'cacheable-job',
			execute: async (input) => {
				cacheableExecuteCount++;
				return { value: input * 10 };
			},
		};

		const downstreamJob: JobDefinition<{ upstream: number }, number> = {
			name: 'downstream-job',
			execute: async (input) => input.upstream + 1,
		};

		const config: PipelineConfig<number> = {
			name: 'cache-synapse-test',
			stages: [
				{ job: asStageJob(cacheableJob), cacheable: true },
				{
					job: asStageJob(downstreamJob),
					synapses: (ctx) => ({
						upstream: ctx.getArtifact<{ value: number }>('cacheable-job')?.value ?? 0,
					}),
				},
			],
		};

		manager.registerPipeline(config);

		const first = await runPipeline(manager, 'cache-synapse-test', 5);
		expect(cacheableExecuteCount).toBe(1);

		const pipeline1 = await storage.findById(first.pipelineId);
		expect(pipeline1?.jobs[0].artifact).toEqual({ value: 50 });
		expect(pipeline1?.jobs[1].artifact).toBe(51);

		await storage.delete(first.pipelineId);

		const second = await runPipeline(manager, 'cache-synapse-test', 5);

		expect(cacheableExecuteCount).toBe(1);

		const pipeline2 = await storage.findById(second.pipelineId);
		expect(pipeline2?.jobs[0].artifact).toEqual({ value: 50 });
		expect(pipeline2?.jobs[1].artifact).toBe(51);
	});

	it('restart cacheable job перевыполняет и обновляет кеш', async () => {
		const storage = new InMemoryPipelineStorage();
		const manager = new PipelineManager({ storage });

		let executeCount = 0;

		const cacheableJob: JobDefinition<number, number> = {
			name: 'cacheable-job',
			execute: async (input) => {
				executeCount++;
				return input * 10 + executeCount;
			},
		};

		const config: PipelineConfig<number> = {
			name: 'restart-cache-test',
			stages: [
				{ job: asStageJob(cacheableJob), cacheable: true },
			],
		};

		manager.registerPipeline(config);

		const first = await runPipeline(manager, 'restart-cache-test', 5);
		expect(executeCount).toBe(1);

		const pipeline1 = await storage.findById(first.pipelineId);
		expect(pipeline1?.jobs[0].artifact).toBe(51);

		// Restart — cacheable job должна перевыполниться, несмотря на наличие кеша
		let restartPromise: Promise<void> | null = null;
		await manager.restartPipelineFromJob(first.pipelineId, 'cacheable-job', {
			onExecutionStart: (p) => { restartPromise = p; },
		});
		await restartPromise;

		expect(executeCount).toBe(2);

		const pipeline2 = await storage.findById(first.pipelineId);
		expect(pipeline2?.jobs[0].artifact).toBe(52);

		// Кеш должен быть обновлён новым артефактом
		const cached = await storage.findCachedArtifact('cacheable-job', pipeline2!.jobs[0].inputHash!);
		expect(cached?.artifact).toBe(52);
	});

	describe('manual jobs', () => {
		it('manual job получает статус awaiting_manual при создании pipeline', async () => {
			const storage = new InMemoryPipelineStorage();
			const manager = new PipelineManager({ storage });

			const autoJob: JobDefinition<number, number> = {
				name: 'auto-job',
				execute: async (input) => input + 1,
			};

			const manualJob: JobDefinition<number, number> = {
				name: 'manual-job',
				execute: async (input) => input * 10,
			};

			const config: PipelineConfig<number> = {
				name: 'manual-pipeline',
				stages: [
					asStageJob(autoJob),
					{ job: asStageJob(manualJob), manual: true },
				],
			};

			manager.registerPipeline(config);

			let executionPromise: Promise<void> | null = null;
			const response = await manager.startPipeline(
				'manual-pipeline',
				{ data: 5 },
				{ onExecutionStart: (p) => { executionPromise = p; } },
			);

			// Даём время auto-job завершиться
			await new Promise((resolve) => setTimeout(resolve, 50));

			const pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.status).toBe('awaiting_manual');
			expect(pipeline?.jobs[0].status).toBe('done');
			expect(pipeline?.jobs[0].artifact).toBe(6); // 5 + 1
			expect(pipeline?.jobs[1].status).toBe('awaiting_manual');
			expect(pipeline?.currentJobIndex).toBe(1);

			const statusWhilePaused = await manager.getStatus(response.pipelineId);
			expect(statusWhilePaused.currentJobName).toBe('manual-job');

			// Запускаем manual job
			await manager.runManualJob(response.pipelineId, 'manual-job');
			await executionPromise;

			const finalPipeline = await storage.findById(response.pipelineId);
			expect(finalPipeline?.status).toBe('done');
			expect(finalPipeline?.jobs[1].status).toBe('done');
			expect(finalPipeline?.jobs[1].artifact).toBe(60); // 6 * 10
		});

		it('mixed stage: auto jobs выполняются, manual ждёт', async () => {
			const storage = new InMemoryPipelineStorage();
			const manager = new PipelineManager({ storage });

			const autoJob: JobDefinition<number, number> = {
				name: 'auto-in-stage',
				execute: async (input) => input + 1,
			};

			const manualJob: JobDefinition<number, number> = {
				name: 'manual-in-stage',
				execute: async (input) => input * 2,
			};

			const config: PipelineConfig<number> = {
				name: 'mixed-stage',
				stages: [
					[
						asStageJob(autoJob),
						{ job: asStageJob(manualJob), synapses: (ctx) => ctx.pipelineInput as number, manual: true },
					],
				],
			};

			manager.registerPipeline(config);

			let executionPromise: Promise<void> | null = null;
			const response = await manager.startPipeline(
				'mixed-stage',
				{ data: 10 },
				{ onExecutionStart: (p) => { executionPromise = p; } },
			);

			// Даём время auto-job завершиться
			await new Promise((resolve) => setTimeout(resolve, 50));

			let pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.status).toBe('awaiting_manual');
			expect(pipeline?.jobs[0].status).toBe('done');
			expect(pipeline?.jobs[0].artifact).toBe(11);
			expect(pipeline?.jobs[1].status).toBe('awaiting_manual');
			expect(pipeline?.currentJobIndex).toBe(1);

			const statusWhilePaused = await manager.getStatus(response.pipelineId);
			expect(statusWhilePaused.currentJobName).toBe('manual-in-stage');

			// Запускаем manual job
			await manager.runManualJob(response.pipelineId, 'manual-in-stage');
			await executionPromise;

			pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.status).toBe('done');
			expect(pipeline?.jobs[1].status).toBe('done');
			expect(pipeline?.jobs[1].artifact).toBe(20); // 10 * 2
		});

		it('runManualJob выбрасывает ошибку если job не в статусе awaiting_manual', async () => {
			const storage = new InMemoryPipelineStorage();
			const manager = new PipelineManager({ storage });

			const autoJob: JobDefinition<void, void> = {
				name: 'auto',
				execute: async () => {},
			};

			manager.registerPipeline({
				name: 'no-manual',
				stages: [asStageJob(autoJob)],
			});

			const response = await runPipeline(manager, 'no-manual', undefined);

			await expect(
				manager.runManualJob(response.pipelineId, 'auto'),
			).rejects.toThrow('not awaiting manual execution');
		});

		it('после «рестарта» runManualJob для поздней manual job начинает с первого незавершённого stage', async () => {
			const storage = new InMemoryPipelineStorage();

			const autoJob: JobDefinition<number, number> = {
				name: 'auto-pre',
				execute: async (input) => input + 1,
			};

			const manualA: JobDefinition<number, number> = {
				name: 'manual-a',
				execute: async (input) => input * 2,
			};

			const manualB: JobDefinition<{ v: number }, number> = {
				name: 'manual-b',
				execute: async (input) => input.v + 100,
			};

			const config: PipelineConfig<number> = {
				name: 'recover-manual-order',
				stages: [
					asStageJob(autoJob),
					{ job: asStageJob(manualA), manual: true },
					{
						job: asStageJob(manualB),
						manual: true,
						synapses: (ctx) => ({
							v: ctx.getArtifact<number>('manual-a') ?? 0,
						}),
					},
				],
			};

			const configHash = crypto
				.createHash('sha256')
				.update('auto-pre,manual-a,manual-b')
				.digest('hex')
				.slice(0, 16);

			await storage.create({
				pipelineId: 'recover-manual-pid',
				pipelineType: 'recover-manual-order',
				status: 'awaiting_manual',
				currentJobIndex: 1,
				input: 3,
				jobs: [
					{ name: 'auto-pre', status: 'done', errors: [], artifact: 4 },
					{ name: 'manual-a', status: 'awaiting_manual', errors: [] },
					{ name: 'manual-b', status: 'awaiting_manual', errors: [] },
				],
				configHash,
			});

			const manager = new PipelineManager({ storage });
			manager.registerPipeline(config);

			let executionPromise: Promise<void> | null = null;
			await manager.runManualJob('recover-manual-pid', 'manual-b', {
				onExecutionStart: (p) => {
					executionPromise = p;
				},
			});

			expect(executionPromise).not.toBeNull();

			// Цикл дошёл до первой незавершённой manual job и снова выставил awaiting_manual
			for (let i = 0; i < 100; i++) {
				const p = await storage.findById('recover-manual-pid');
				if (p?.status === 'awaiting_manual') break;
				await new Promise((r) => setTimeout(r, 20));
			}

			await manager.runManualJob('recover-manual-pid', 'manual-a');
			await executionPromise;

			const finalPipeline = await storage.findById('recover-manual-pid');
			expect(finalPipeline?.status).toBe('done');
			expect(finalPipeline?.jobs[1].artifact).toBe(8);
			expect(finalPipeline?.jobs[2].artifact).toBe(108);
		});

		it('промоут manual job до достижения stage — job выполняется автоматически', async () => {
			const storage = new InMemoryPipelineStorage();
			const manager = new PipelineManager({ storage });

			const gate = { resolve: null as (() => void) | null };

			const slowJob: JobDefinition<number, number> = {
				name: 'slow-job',
				execute: async (input) => {
					await new Promise<void>((resolve) => { gate.resolve = resolve; });
					return input + 1;
				},
			};

			const manualJob: JobDefinition<number, number> = {
				name: 'future-manual',
				execute: async (input) => input * 100,
			};

			const config: PipelineConfig<number> = {
				name: 'early-promote',
				stages: [
					asStageJob(slowJob),
					{ job: asStageJob(manualJob), manual: true },
				],
			};

			manager.registerPipeline(config);

			let executionPromise: Promise<void> | null = null;
			const response = await manager.startPipeline(
				'early-promote',
				{ data: 1 },
				{ onExecutionStart: (p) => { executionPromise = p; } },
			);

			// Ждём пока slow-job начнёт выполняться
			while (!gate.resolve) {
				await new Promise((r) => setTimeout(r, 10));
			}

			// Pipeline processing, slow-job ещё идёт
			// Промоутим manual job заранее
			await manager.runManualJob(response.pipelineId, 'future-manual');

			// Теперь разблокируем slow-job
			gate.resolve();
			await executionPromise;

			const pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.status).toBe('done');
			expect(pipeline?.jobs[0].status).toBe('done');
			expect(pipeline?.jobs[1].status).toBe('done');
			expect(pipeline?.jobs[1].artifact).toBe(200); // 2 * 100
		});

		it('manual job доступна через synapses для следующих jobs', async () => {
			const storage = new InMemoryPipelineStorage();
			const manager = new PipelineManager({ storage });

			const manualJob: JobDefinition<number, { value: number }> = {
				name: 'manual-first',
				execute: async (input) => ({ value: input + 10 }),
			};

			const consumerJob: JobDefinition<{ fromManual: number }, number> = {
				name: 'consumer',
				execute: async (input) => input.fromManual * 3,
			};

			const config: PipelineConfig<number> = {
				name: 'manual-synapse',
				stages: [
					{ job: asStageJob(manualJob), manual: true },
					{
						job: asStageJob(consumerJob),
						synapses: (ctx) => ({
							fromManual: ctx.getArtifact<{ value: number }>('manual-first')?.value ?? 0,
						}),
					},
				],
			};

			manager.registerPipeline(config);

			let executionPromise: Promise<void> | null = null;
			const response = await manager.startPipeline(
				'manual-synapse',
				{ data: 5 },
				{ onExecutionStart: (p) => { executionPromise = p; } },
			);

			await new Promise((resolve) => setTimeout(resolve, 50));

			let pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.status).toBe('awaiting_manual');

			await manager.runManualJob(response.pipelineId, 'manual-first');
			await executionPromise;

			pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.status).toBe('done');
			expect(pipeline?.jobs[0].artifact).toEqual({ value: 15 });
			expect(pipeline?.jobs[1].artifact).toBe(45); // 15 * 3
		});
	});

	describe('restartPipelineFromJob', () => {
		it('перезапускает pipeline с указанной job', async () => {
			const storage = new InMemoryPipelineStorage();
			const manager = new PipelineManager({ storage });

			let transformCallCount = 0;

			const fetchJob: JobDefinition<{ seed: number }, { value: number }> = {
				name: 'fetch',
				execute: async (input) => ({ value: input.seed + 1 }),
			};

			const transformJob: JobDefinition<{ value: number }, number> = {
				name: 'transform',
				execute: async (input) => {
					transformCallCount++;
					return input.value * 2;
				},
			};

			const config: PipelineConfig<{ seed: number }> = {
				name: 'restart-demo',
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
			const response = await runPipeline(manager, 'restart-demo', { seed: 1 });

			expect(transformCallCount).toBe(1);

			// Перезапускаем с job transform
			let restartPromise: Promise<void> | null = null;
			const restartResponse = await manager.restartPipelineFromJob(
				response.pipelineId,
				'transform',
				{
					onExecutionStart: (promise) => {
						restartPromise = promise;
					},
				},
			);

			expect(restartResponse.fromJobName).toBe('transform');
			expect(restartResponse.fromJobIndex).toBe(1);
			expect(restartResponse.jobsToRerun).toBe(1);

			await restartPromise;

			// transform должен быть вызван повторно
			expect(transformCallCount).toBe(2);

			const pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.status).toBe('done');
			expect(pipeline?.jobs[1].artifact).toBe(4);
		});

		it('сохраняет артефакты jobs до точки перезапуска для synapses', async () => {
			const storage = new InMemoryPipelineStorage();
			const manager = new PipelineManager({ storage });

			let fetchCallCount = 0;
			let receivedValueInTransform: number | undefined;

			const fetchJob: JobDefinition<number, { value: number }> = {
				name: 'fetch',
				execute: async (input) => {
					fetchCallCount++;
					return { value: input + 10 };
				},
			};

			const transformJob: JobDefinition<{ value: number }, number> = {
				name: 'transform',
				execute: async (input) => {
					receivedValueInTransform = input.value;
					return input.value * 3;
				},
			};

			const config: PipelineConfig<number> = {
				name: 'synapse-restart',
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
			const response = await runPipeline(manager, 'synapse-restart', 5);

			expect(fetchCallCount).toBe(1);
			expect(receivedValueInTransform).toBe(15); // 5 + 10

			// Перезапускаем с transform — fetch НЕ должен вызываться повторно
			let restartPromise: Promise<void> | null = null;
			await manager.restartPipelineFromJob(response.pipelineId, 'transform', {
				onExecutionStart: (promise) => {
					restartPromise = promise;
				},
			});
			await restartPromise;

			// fetch НЕ вызван повторно
			expect(fetchCallCount).toBe(1);
			// transform получил правильное значение из сохранённого артефакта
			expect(receivedValueInTransform).toBe(15);

			const pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.jobs[1].artifact).toBe(45); // 15 * 3
		});

		it('заменяет существующие jobOptions новыми', async () => {
			const storage = new InMemoryPipelineStorage();
			const manager = new PipelineManager({ storage });

			let receivedOptions: { multiplier?: number; offset?: number } | undefined;

			const processJob: JobDefinition<number, number, { multiplier?: number; offset?: number }> = {
				name: 'process',
				execute: async (input, options) => {
					receivedOptions = options;
					const mult = options?.multiplier ?? 1;
					const off = options?.offset ?? 0;
					return input * mult + off;
				},
			};

			const config: PipelineConfig<number> = {
				name: 'options-restart',
				stages: [asStageJob(processJob)],
			};

			manager.registerPipeline(config);

			// Первый запуск с multiplier: 2 и offset: 100
			let executionPromise: Promise<void> | null = null;
			const response = await manager.startPipeline(
				'options-restart',
				{ data: 10, jobOptions: { process: { multiplier: 2, offset: 100 } } },
				{ onExecutionStart: (p) => { executionPromise = p; } },
			);
			await executionPromise;

			expect(receivedOptions?.multiplier).toBe(2);
			expect(receivedOptions?.offset).toBe(100);

			let pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.jobs[0].artifact).toBe(120); // 10 * 2 + 100

			// Перезапускаем только с multiplier: 5 (offset должен исчезнуть)
			let restartPromise: Promise<void> | null = null;
			await manager.restartPipelineFromJob(response.pipelineId, 'process', {
				jobOptions: { process: { multiplier: 5 } },
				onExecutionStart: (promise) => {
					restartPromise = promise;
				},
			});
			await restartPromise;

			expect(receivedOptions?.multiplier).toBe(5);
			expect(receivedOptions?.offset).toBeUndefined(); // offset не унаследован

			pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.jobs[0].artifact).toBe(50); // 10 * 5 + 0
		});

		it('выбрасывает ошибку при перезапуске processing pipeline', async () => {
			const storage = new InMemoryPipelineStorage();
			const manager = new PipelineManager({ storage });

			const slowJob: JobDefinition<void, void> = {
				name: 'slow-job',
				execute: async () => {
					await new Promise((resolve) => setTimeout(resolve, 100));
				},
			};

			manager.registerPipeline({
				name: 'slow-pipeline',
				stages: [asStageJob(slowJob)],
			});

			// Запускаем, но НЕ ждём завершения
			const response = await manager.startPipeline('slow-pipeline', { data: undefined });

			// Пытаемся перезапустить пока выполняется
			await expect(
				manager.restartPipelineFromJob(response.pipelineId, 'slow-job'),
			).rejects.toThrow('is currently processing');
		});

		it('выбрасывает ошибку если job не найдена', async () => {
			const storage = new InMemoryPipelineStorage();
			const manager = new PipelineManager({ storage });

			const simpleJob: JobDefinition<void, void> = {
				name: 'simple',
				execute: async () => { },
			};

			manager.registerPipeline({
				name: 'simple-pipeline',
				stages: [asStageJob(simpleJob)],
			});

			const response = await runPipeline(manager, 'simple-pipeline', undefined);

			await expect(
				manager.restartPipelineFromJob(response.pipelineId, 'non-existent'),
			).rejects.toThrow('not found');
		});

		it('перезапускает только указанную job из stage, сохраняя артефакты остальных', async () => {
			const storage = new InMemoryPipelineStorage();
			const manager = new PipelineManager({ storage });

			let jobACount = 0;
			let jobBCount = 0;

			const jobA: JobDefinition<number, number> = {
				name: 'parallel-a',
				execute: async (input) => {
					jobACount++;
					return input + 1;
				},
			};

			const jobB: JobDefinition<number, number> = {
				name: 'parallel-b',
				execute: async (input) => {
					jobBCount++;
					return input + 2;
				},
			};

			const config: PipelineConfig<number> = {
				name: 'parallel-restart',
				stages: [
					// Stage с двумя параллельными jobs
					[asStageJob(jobA), asStageJob(jobB)],
				],
			};

			manager.registerPipeline(config);
			const response = await runPipeline(manager, 'parallel-restart', 10);

			expect(jobACount).toBe(1);
			expect(jobBCount).toBe(1);

			let pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.jobs[0].artifact).toBe(11); // parallel-a: 10 + 1
			expect(pipeline?.jobs[1].artifact).toBe(12); // parallel-b: 10 + 2

			// Перезапускаем только parallel-a — parallel-b не должна перезапуститься
			let restartPromise: Promise<void> | null = null;
			const restartResponse = await manager.restartPipelineFromJob(
				response.pipelineId,
				'parallel-a',
				{
					onExecutionStart: (promise) => {
						restartPromise = promise;
					},
				},
			);

			// Перезапускается только 1 job (parallel-a), parallel-b уже done и сохраняет артефакт
			expect(restartResponse.jobsToRerun).toBe(1);
			await restartPromise;

			// Только parallel-a вызвана повторно, parallel-b сохранила артефакт
			expect(jobACount).toBe(2);
			expect(jobBCount).toBe(1); // НЕ перезапущена!

			pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.jobs[0].artifact).toBe(11); // parallel-a: перезапущена
			expect(pipeline?.jobs[1].artifact).toBe(12); // parallel-b: артефакт сохранён
		});

		it('перезапускает все jobs начиная с указанной (включая следующие stages)', async () => {
			const storage = new InMemoryPipelineStorage();
			const manager = new PipelineManager({ storage });

			let jobACount = 0;
			let jobBCount = 0;
			let jobCCount = 0;

			const jobA: JobDefinition<number, number> = {
				name: 'stage1-job',
				execute: async (input) => {
					jobACount++;
					return input + 1;
				},
			};

			const jobB: JobDefinition<number, number> = {
				name: 'stage2-job-a',
				execute: async (input) => {
					jobBCount++;
					return input + 10;
				},
			};

			const jobC: JobDefinition<number, number> = {
				name: 'stage2-job-b',
				execute: async (input) => {
					jobCCount++;
					return input + 100;
				},
			};

			const config: PipelineConfig<number> = {
				name: 'multi-stage-restart',
				stages: [
					asStageJob(jobA),
					[asStageJob(jobB), asStageJob(jobC)], // параллельный stage
				],
			};

			manager.registerPipeline(config);
			const response = await runPipeline(manager, 'multi-stage-restart', 5);

			expect(jobACount).toBe(1);
			expect(jobBCount).toBe(1);
			expect(jobCCount).toBe(1);

			// Перезапускаем stage2-job-b — stage2-job-a сохранит артефакт
			let restartPromise: Promise<void> | null = null;
			await manager.restartPipelineFromJob(response.pipelineId, 'stage2-job-b', {
				onExecutionStart: (promise) => {
					restartPromise = promise;
				},
			});
			await restartPromise;

			// Только stage2-job-b перезапущена
			expect(jobACount).toBe(1); // stage1 не перезапущен
			expect(jobBCount).toBe(1); // stage2-job-a не перезапущена (done)
			expect(jobCCount).toBe(2); // stage2-job-b перезапущена
		});

		it('перезапускает упавший pipeline после ошибки', async () => {
			const storage = new InMemoryPipelineStorage();
			const manager = new PipelineManager({ storage });

			let shouldFail = true;

			const unstableJob: JobDefinition<number, number> = {
				name: 'unstable',
				execute: async (input) => {
					if (shouldFail) {
						throw new Error('temporary failure');
					}
					return input * 10;
				},
			};

			manager.registerPipeline({
				name: 'unstable-pipeline',
				stages: [asStageJob(unstableJob)],
			});

			// Первый запуск — упадёт
			const response = await runPipeline(manager, 'unstable-pipeline', 5);

			let pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.status).toBe('error');
			expect(pipeline?.jobs[0].status).toBe('error');

			// "Исправляем" проблему
			shouldFail = false;

			// Перезапускаем
			let restartPromise: Promise<void> | null = null;
			await manager.restartPipelineFromJob(response.pipelineId, 'unstable', {
				onExecutionStart: (promise) => {
					restartPromise = promise;
				},
			});
			await restartPromise;

			pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.status).toBe('done');
			expect(pipeline?.jobs[0].status).toBe('done');
			expect(pipeline?.jobs[0].artifact).toBe(50);
		});

		it('сбрасывает retry счётчик при перезапуске и даёт все попытки заново', async () => {
			const storage = new InMemoryPipelineStorage();
			const manager = new PipelineManager({ storage });

			let totalAttempts = 0;
			let failCount = 3; // Первые 3 попытки провалятся

			const retryJob: JobDefinition<number, number> = {
				name: 'retry-job',
				execute: async (input) => {
					totalAttempts++;
					if (failCount > 0) {
						failCount--;
						throw new Error(`fail #${totalAttempts}`);
					}
					return input * 10;
				},
			};

			const config: PipelineConfig<number> = {
				name: 'retry-restart',
				stages: [
					{
						job: asStageJob(retryJob),
						retries: 2, // 3 попытки всего (1 + 2 ретрая)
						retryDelay: 1,
					},
				],
			};

			manager.registerPipeline(config);

			// Первый запуск — все 3 попытки провалятся
			const response = await runPipeline(manager, 'retry-restart', 5);

			expect(totalAttempts).toBe(3);

			let pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.status).toBe('error');
			expect(pipeline?.jobs[0].status).toBe('error');
			expect(pipeline?.jobs[0].retryCount).toBe(2); // 2 ретрая выполнено
			expect(pipeline?.jobs[0].errors).toHaveLength(3); // 3 ошибки записаны

			// Теперь failCount = 0, следующая попытка успешна
			// Перезапускаем — должны получить ещё 3 попытки

			let restartPromise: Promise<void> | null = null;
			await manager.restartPipelineFromJob(response.pipelineId, 'retry-job', {
				onExecutionStart: (promise) => {
					restartPromise = promise;
				},
			});
			await restartPromise;

			// Была вызвана ещё 1 попытка (успешная)
			expect(totalAttempts).toBe(4);

			pipeline = await storage.findById(response.pipelineId);
			expect(pipeline?.status).toBe('done');
			expect(pipeline?.jobs[0].status).toBe('done');
			expect(pipeline?.jobs[0].artifact).toBe(50);
			// retryCount = 0 (успешно с первой попытки после перезапуска)
			expect(pipeline?.jobs[0].retryCount).toBe(0);
			// errors очищены при перезапуске
			expect(pipeline?.jobs[0].errors).toHaveLength(0);
		});
	});
});

import type { PipelineConfig, JobDefinition, SynapseContext } from 'neuroline';

// ============================================================================
// Jobs
// ============================================================================

/**
 * Job: Получение данных
 */
const fetchDataJob: JobDefinition<{ url: string }, { data: string; fetchedAt: Date }> = {
  name: 'fetch-data',
  async execute(input, options, ctx) {
    ctx.logger.info('Fetching data', { url: input.url });

    // Симуляция запроса
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      data: `Data from ${input.url}`,
      fetchedAt: new Date(),
    };
  },
};

/**
 * Job: Валидация данных
 */
const validateJob: JobDefinition<{ data: string }, { valid: boolean; length: number }> = {
  name: 'validate',
  async execute(input, options, ctx) {
    ctx.logger.info('Validating data', { length: input.data.length });

    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      valid: input.data.length > 0,
      length: input.data.length,
    };
  },
};

/**
 * Job: Обработка данных
 */
const processJob: JobDefinition<{ data: string }, { processed: string }> = {
  name: 'process',
  async execute(input, options, ctx) {
    ctx.logger.info('Processing data');

    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      processed: input.data.toUpperCase(),
    };
  },
};

/**
 * Job: Отправка уведомления
 */
const notifyJob: JobDefinition<{ message: string }, { notified: boolean }> = {
  name: 'notify',
  async execute(input, options, ctx) {
    ctx.logger.info('Sending notification', { message: input.message });

    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      notified: true,
    };
  },
};

/**
 * Job: Сохранение результата
 */
const saveJob: JobDefinition<{ data: unknown }, { savedAt: Date; id: string }> = {
  name: 'save',
  async execute(input, options, ctx) {
    ctx.logger.info('Saving result');

    await new Promise((resolve) => setTimeout(resolve, 600));

    return {
      savedAt: new Date(),
      id: `record_${Date.now()}`,
    };
  },
};

// ============================================================================
// Pipeline Configurations
// ============================================================================

/**
 * Демо pipeline: последовательная обработка
 */
export const demoPipeline: PipelineConfig<{ url: string }> = {
  name: 'demo-pipeline',
  stages: [
    // Stage 1: Получение данных
    fetchDataJob,

    // Stage 2: Валидация
    {
      job: validateJob,
      synapses: (ctx) => ({
        data: ctx.getArtifact<{ data: string }>('fetch-data')?.data ?? '',
      }),
    },

    // Stage 3: Обработка
    {
      job: processJob,
      synapses: (ctx) => ({
        data: ctx.getArtifact<{ data: string }>('fetch-data')?.data ?? '',
      }),
    },

    // Stage 4: Сохранение
    {
      job: saveJob,
      synapses: (ctx) => ({
        data: ctx.getArtifact('process'),
      }),
    },
  ],
};

/**
 * Pipeline с параллельными jobs
 */
export const parallelPipeline: PipelineConfig<{ url: string; userId: string }> = {
  name: 'parallel-pipeline',
  stages: [
    // Stage 1: Получение данных
    fetchDataJob,

    // Stage 2: Параллельные jobs (валидация + уведомление)
    [
      {
        job: validateJob,
        synapses: (ctx) => ({
          data: ctx.getArtifact<{ data: string }>('fetch-data')?.data ?? '',
        }),
      },
      {
        job: notifyJob,
        synapses: (ctx: SynapseContext<{ url: string; userId: string }>) => ({
          message: `Processing started for user ${ctx.pipelineInput.userId}`,
        }),
      },
    ],

    // Stage 3: Обработка
    {
      job: processJob,
      synapses: (ctx) => ({
        data: ctx.getArtifact<{ data: string }>('fetch-data')?.data ?? '',
      }),
    },

    // Stage 4: Параллельное сохранение и уведомление
    [
      {
        job: saveJob,
        synapses: (ctx) => ({
          data: ctx.getArtifact('process'),
        }),
      },
      {
        job: notifyJob,
        synapses: (ctx: SynapseContext<{ url: string; userId: string }>) => ({
          message: `Processing completed for user ${ctx.pipelineInput.userId}`,
        }),
      },
    ],
  ],
};


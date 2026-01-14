[English](#neuroline) | [Русский](#neuroline-1)

# Neuroline

[![Demo](https://img.shields.io/badge/Demo-neuroline.vercel.app-blue)](https://neuroline.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-sergeychernov/neuroline-black)](https://github.com/sergeychernov/neuroline)

Framework-agnostic pipeline orchestration library with support for:
- Sequential and parallel job execution
- Persistent state storage (MongoDB, in-memory, or custom)
- Type-safe jobs with synapses for data transformation
- Idempotency (re-running with same input data returns existing pipeline)

## Installation

```bash
yarn add neuroline
```

For MongoDB storage:
```bash
yarn add neuroline mongoose
```

## Quick Start

### 1. Creating a Job

A Job is a pure function with a defined interface:

```typescript
import type { JobDefinition, JobContext } from 'neuroline';

interface MyJobInput {
    url: string;
}

interface MyJobOutput {
    data: string;
    fetchedAt: Date;
}

interface MyJobOptions {
    timeout?: number;
}

export const fetchDataJob: JobDefinition<MyJobInput, MyJobOutput, MyJobOptions> = {
    name: 'fetch-data',

    async execute(input, options, ctx) {
        ctx.logger.info('Fetching data', { url: input.url });

        const timeout = options?.timeout ?? 5000;
        const response = await fetch(input.url, { signal: AbortSignal.timeout(timeout) });
        const data = await response.text();

        ctx.logger.info('Data fetched', { length: data.length });

        return {
            data,
            fetchedAt: new Date(),
        };
    },
};
```

### 2. Pipeline Configuration

```typescript
import type { PipelineConfig, SynapseContext } from 'neuroline';
import { fetchDataJob, processDataJob, saveResultJob } from './jobs';

interface PipelineInput {
    url: string;
    userId: string;
}

export const myPipelineConfig: PipelineConfig<PipelineInput> = {
    name: 'my-neuroline',

    stages: [
        // Stage 1: single job
        fetchDataJob,

        // Stage 2: two jobs execute in parallel
        [
            {
                job: processDataJob,
                // synapses transform data for the job
                synapses: (ctx: SynapseContext<PipelineInput>) => ({
                    rawData: ctx.getArtifact<{ data: string }>('fetch-data')?.data ?? '',
                    userId: ctx.pipelineInput.userId,
                }),
            },
            {
                job: notifyJob,
                synapses: (ctx) => ({
                    userId: ctx.pipelineInput.userId,
                    message: 'Processing started',
                }),
            },
        ],

        // Stage 3: final job
        {
            job: saveResultJob,
            synapses: (ctx) => ({
                processedData: ctx.getArtifact('process-data'),
                userId: ctx.pipelineInput.userId,
            }),
        },
    ],

    // Optional: custom hash function
    computeInputHash: (input) => `${input.userId}-${input.url}`,
};
```

### 3. Creating and Using PipelineManager

#### With In-Memory Storage (for testing)

```typescript
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';
import { myPipelineConfig } from './pipelines';

const storage = new InMemoryPipelineStorage();
const manager = new PipelineManager({
    storage,
    logger: console, // or your logger
});

// Register pipeline
manager.registerPipeline(myPipelineConfig);

// Start pipeline
const { pipelineId, isNew } = await manager.startPipeline('my-neuroline', {
    data: { url: 'https://api.example.com/data', userId: 'user-123' },
    jobOptions: {
        'fetch-data': { timeout: 10000 },
    },
});

// Poll status
const status = await manager.getStatus(pipelineId);
console.log(status);
// { status: 'processing', currentJobIndex: 1, totalJobs: 4, currentJobName: 'process-data' }

// Get result (artifact) of a specific job (default = last job)
const result = await manager.getResult(pipelineId);
console.log(result);
// { pipelineId: '...', jobName: 'save-result', status: 'done', artifact: {...} }

// Get result (artifact) by job name
const computeResult = await manager.getResult(pipelineId, 'process-data');
console.log(computeResult);
// { pipelineId: '...', jobName: 'process-data', status: 'done', artifact: {...} }
```

#### With MongoDB Storage

```typescript
import mongoose from 'mongoose';
import { PipelineManager } from 'neuroline';
import { MongoPipelineStorage, PipelineSchema } from 'neuroline/mongo';

// Create model
const PipelineModel = mongoose.model('Pipeline', PipelineSchema);

// Create manager
const storage = new MongoPipelineStorage(PipelineModel);
const manager = new PipelineManager({ storage, logger: console });

manager.registerPipeline(myPipelineConfig);
```

## API Reference

### PipelineManager

#### `constructor(options: PipelineManagerOptions)`

```typescript
interface PipelineManagerOptions {
    storage: PipelineStorage;  // Required
    logger?: JobLogger;        // Optional
}
```

#### `registerPipeline(config: PipelineConfig): void`

Registers a pipeline configuration. Must be called before `startPipeline`.

#### `startPipeline<TData>(pipelineType: string, input: PipelineInput<TData>): Promise<StartPipelineResponse>`

Starts a pipeline or returns existing one (if found by input data hash).

```typescript
interface PipelineInput<TData> {
    data: TData;                              // Input data
    jobOptions?: Record<string, unknown>;     // Options for jobs (key = job name)
}

interface StartPipelineResponse {
    pipelineId: string;  // ID for polling
    isNew: boolean;      // true if created, false if already existed
}
```

#### `getStatus(pipelineId: string): Promise<PipelineStatusResponse>`

Returns current pipeline status.

```typescript
interface PipelineStatusResponse {
    status: 'processing' | 'done' | 'error';
    currentJobIndex: number;
    totalJobs: number;
    currentJobName?: string;
    error?: { message: string; jobName?: string };
}
```

#### `getResult(pipelineId: string, jobName?: string): Promise<PipelineResultResponse>`

Returns result (artifact) for a single job. If `jobName` is not provided, returns the last job result.

```typescript
interface PipelineResultResponse {
    pipelineId: string;
    jobName: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    artifact: unknown | null | undefined; // undefined = not yet executed, null = executed but no result
}
```

#### `getPipeline(pipelineId: string): Promise<PipelineState | null>`

Returns full pipeline state (for debugging).

### JobDefinition

```typescript
interface JobDefinition<TInput, TOutput, TOptions> {
    name: string;
    execute: (
        input: TInput,
        options: TOptions | undefined,
        context: JobContext
    ) => Promise<TOutput | null>;
}
```

#### JobContext

```typescript
interface JobContext {
    pipelineId: string;
    jobIndex: number;
    logger: {
        info: (msg: string, data?: Record<string, unknown>) => void;
        error: (msg: string, data?: Record<string, unknown>) => void;
        warn: (msg: string, data?: Record<string, unknown>) => void;
    };
}
```

### PipelineConfig

```typescript
interface PipelineConfig<TInput> {
    name: string;
    stages: PipelineStage[];
    computeInputHash?: (input: TInput) => string;
}

// Stage: single job or array of jobs (parallel)
type PipelineStage = StageItem | StageItem[];

// StageItem: JobDefinition or JobInPipeline
type StageItem = JobDefinition | JobInPipeline;

interface JobInPipeline<TInput, TOutput, TOptions> {
    job: JobDefinition<TInput, TOutput, TOptions>;
    synapses?: (ctx: SynapseContext) => TInput;
}
```

### SynapseContext

Context for `synapses` function:

```typescript
interface SynapseContext<TPipelineInput> {
    pipelineInput: TPipelineInput;
    getArtifact: <T>(jobName: string) => T | undefined;
}
```

## Storage

### InMemoryPipelineStorage

Built-in in-memory storage for testing and prototyping.

```typescript
import { InMemoryPipelineStorage } from 'neuroline';

const storage = new InMemoryPipelineStorage();

// For testing
storage.clear();           // Clear all data
storage.getAll();          // Get all pipelines
```

### MongoPipelineStorage

MongoDB storage (requires `mongoose` as peer dependency).

```typescript
import mongoose from 'mongoose';
import { MongoPipelineStorage, PipelineSchema } from 'neuroline/mongo';

const PipelineModel = mongoose.model('Pipeline', PipelineSchema);
const storage = new MongoPipelineStorage(PipelineModel);
```

### Custom Storage

Implement the `PipelineStorage` interface:

```typescript
import type { PipelineStorage, PipelineState, JobStatus, PipelineStatus } from 'neuroline';

class MyCustomStorage implements PipelineStorage {
    async findById(pipelineId: string): Promise<PipelineState | null> { ... }
    async findAll(params?: PaginationParams): Promise<PaginatedResult<PipelineState>> { ... }
    async create(state: PipelineState): Promise<PipelineState> { ... }
    async delete(pipelineId: string): Promise<boolean> { ... }
    async updateStatus(pipelineId: string, status: PipelineStatus): Promise<void> { ... }
    async updateJobStatus(pipelineId: string, jobIndex: number, status: JobStatus, startedAt?: Date): Promise<void> { ... }
    async updateJobArtifact(pipelineId: string, jobIndex: number, artifact: unknown, finishedAt: Date): Promise<void> { ... }
    async updateJobError(pipelineId: string, jobIndex: number, error: { message: string; stack?: string }, finishedAt: Date): Promise<void> { ... }
    async updateCurrentJobIndex(pipelineId: string, jobIndex: number): Promise<void> { ... }
    async updateJobInput(pipelineId: string, jobIndex: number, input: unknown, options?: unknown): Promise<void> { ... }
}
```

## NestJS Integration

```typescript
import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PipelineManager } from 'neuroline';
import { MongoPipelineStorage, PipelineSchema } from 'neuroline/mongo';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: 'Pipeline', schema: PipelineSchema },
        ]),
    ],
})
export class PipelineModule implements OnModuleInit {
    private manager: PipelineManager;

    constructor(
        @InjectModel('Pipeline') private pipelineModel: Model<any>,
        private logger: Logger,
    ) {
        const storage = new MongoPipelineStorage(this.pipelineModel);
        this.manager = new PipelineManager({
            storage,
            logger: {
                info: (msg, data) => this.logger.log({ msg, ...data }),
                error: (msg, data) => this.logger.error({ msg, ...data }),
                warn: (msg, data) => this.logger.warn({ msg, ...data }),
            },
        });
    }

    onModuleInit() {
        this.manager.registerPipeline(myPipelineConfig);
    }
}
```

## Stages and Parallel Execution

```
Pipeline
├── Stage 1: [jobA]                    ← sequential
├── Stage 2: [jobB, jobC, jobD]        ← parallel within stage
├── Stage 3: [jobE]                    ← sequential
└── Stage 4: [jobF, jobG]              ← parallel within stage
```

- **Stages** execute **sequentially** (Stage 2 starts only after Stage 1 completes)
- **Jobs within a stage** execute **in parallel**
- If any job in a stage fails, the entire pipeline is marked as `error`

## Idempotency

Pipelines are identified by input data hash:

```typescript
// First call — creates pipeline
const { pipelineId, isNew } = await manager.startPipeline('my-pipeline', { data: { url: 'https://example.com' } });
// isNew = true

// Repeated call with same data — returns existing pipeline
const result2 = await manager.startPipeline('my-pipeline', { data: { url: 'https://example.com' } });
// result2.pipelineId === pipelineId
// result2.isNew = false
```

For custom hashing:

```typescript
const config: PipelineConfig<MyInput> = {
    name: 'my-pipeline',
    stages: [...],
    computeInputHash: (input) => `${input.userId}-${input.date}`,
};
```

## Invalidation on Configuration Changes

When the pipeline structure changes (adding/removing/renaming jobs), old records are automatically invalidated:

```typescript
// Version 1: pipeline with two jobs
const configV1: PipelineConfig = {
    name: 'my-pipeline',
    stages: [jobA, jobB],
};
manager.registerPipeline(configV1);

// Start — creates record in storage
await manager.startPipeline('my-pipeline', { data: { id: 1 } });
// Pipeline saved with configHash = hash(['jobA', 'jobB'])

// Version 2: added jobC
const configV2: PipelineConfig = {
    name: 'my-pipeline',
    stages: [jobA, jobB, jobC],
};
manager.registerPipeline(configV2);

// Start with same data
await manager.startPipeline('my-pipeline', { data: { id: 1 } });
// configHash changed → old record deleted → pipeline starts fresh
```

This is useful when:
- Adding new jobs to pipeline
- Removing obsolete jobs
- Changing execution order
- Renaming jobs

## Types

All types are available for import:

```typescript
import type {
    // Job
    JobDefinition,
    JobContext,
    JobLogger,
    JobStatus,
    JobState,          // JobState<TInput, TOutput, TOptions> with generics

    // Pipeline
    PipelineConfig,
    PipelineStage,
    PipelineInput,
    PipelineStatus,
    PipelineState,

    // Synapse
    SynapseContext,
    JobInPipeline,
    StageItem,

    // Responses
    StartPipelineResponse,
    PipelineStatusResponse,
    PipelineResultResponse,

    // Storage
    PipelineStorage,
    PaginatedResult,
    PaginationParams,
} from 'neuroline';

// MongoDB types (separate import)
import type {
    MongoPipelineDocument,
    MongoPipelineJobState,
} from 'neuroline/mongo';
```

### JobState with Generics

`JobState` now supports generic types for input, output (artifact), and options:

```typescript
interface JobState<TInput = unknown, TOutput = unknown, TOptions = unknown> {
    name: string;
    status: JobStatus;
    input?: TInput;      // Input data (computed by synapses)
    options?: TOptions;  // Job options (from jobOptions)
    artifact?: TOutput;  // Output data (result of execute)
    error?: { message: string; stack?: string };
    startedAt?: Date;
    finishedAt?: Date;
}
```

## Client API (neuroline/client)

Client module for browser-side interaction with Pipeline API.

**Note:** One client = one pipeline. The URL determines which pipeline to run.

### PipelineClient

```typescript
import { PipelineClient } from 'neuroline/client';

// Client for a specific pipeline
const client = new PipelineClient({ baseUrl: '/api/pipeline/my-pipeline' });

// Start pipeline
const { pipelineId, isNew } = await client.start({
  input: { userId: 123 },
  jobOptions: { 'fetch-data': { timeout: 5000 } },
});

// Get status
const status = await client.getStatus(pipelineId);

// Get result (artifact) of the last job
const result = await client.getResult(pipelineId);

// Get job details (input, options, artifact)
const jobDetails = await client.getJobDetails(pipelineId, 'fetch-data');
```

### Polling

```typescript
// Manual polling
const { stop, completed } = client.poll(pipelineId, (event) => {
  console.log('Status:', event.status.status);
});

// Wait for completion
const finalEvent = await completed;

// Or stop polling manually
stop();
```

### Start with Polling

```typescript
// Client for specific pipeline
const client = new PipelineClient({ baseUrl: '/api/pipeline/my-pipeline' });

// Start pipeline and immediately begin polling
const { pipelineId, stop, completed } = await client.startAndPoll(
  {
    input: { url: 'https://example.com' },
  },
  (event) => {
    // Called on each poll
    console.log('Progress:', event.status.currentJobIndex, '/', event.status.totalJobs);
  },
  (error) => {
    // Called on error
    console.error('Pipeline error:', error);
  }
);
```

### React Hook Factory

```typescript
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createUsePipelineHook, PipelineClient } from 'neuroline/client';

// Create hook with React dependencies
const usePipeline = createUsePipelineHook({ useState, useCallback, useEffect, useRef });

// In component
function MyComponent() {
  // One client per pipeline
  const client = useMemo(() => new PipelineClient({ baseUrl: '/api/pipeline/my-pipeline' }), []);
  const { start, status, isRunning, error } = usePipeline(client);

  const handleStart = async () => {
    await start({ input: { userId: 123 } });
  };

  return (
    <div>
      <button onClick={handleStart} disabled={isRunning}>Start</button>
      {status && <div>Status: {status.status}</div>}
    </div>
  );
}
```

## Exports

| Import path | Contents |
|-------------|----------|
| `neuroline` | Core: types, `PipelineManager`, `InMemoryPipelineStorage` |
| `neuroline/mongo` | MongoDB: `MongoPipelineStorage`, `PipelineSchema`, document types |
| `neuroline/client` | Client: `PipelineClient`, `createUsePipelineHook`, types |

## License

UNLICENSED

---

# Neuroline

[![Demo](https://img.shields.io/badge/Demo-neuroline.vercel.app-blue)](https://neuroline.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-sergeychernov/neuroline-black)](https://github.com/sergeychernov/neuroline)

Фреймворк-агностик библиотека для оркестрации пайплайнов с поддержкой:
- Последовательного и параллельного выполнения jobs
- Персистентного хранения состояния (MongoDB, in-memory, или кастомное)
- Типобезопасных jobs с synapses для трансформации данных
- Идемпотентности (повторный запуск с теми же входными данными возвращает существующий pipeline)

## Установка

```bash
yarn add neuroline
```

Для MongoDB хранилища:
```bash
yarn add neuroline mongoose
```

## Быстрый старт

### 1. Создание Job

Job — это чистая функция с определённым интерфейсом:

```typescript
import type { JobDefinition, JobContext } from 'neuroline';

interface MyJobInput {
    url: string;
}

interface MyJobOutput {
    data: string;
    fetchedAt: Date;
}

interface MyJobOptions {
    timeout?: number;
}

export const fetchDataJob: JobDefinition<MyJobInput, MyJobOutput, MyJobOptions> = {
    name: 'fetch-data',

    async execute(input, options, ctx) {
        ctx.logger.info('Fetching data', { url: input.url });

        const timeout = options?.timeout ?? 5000;
        const response = await fetch(input.url, { signal: AbortSignal.timeout(timeout) });
        const data = await response.text();

        ctx.logger.info('Data fetched', { length: data.length });

        return {
            data,
            fetchedAt: new Date(),
        };
    },
};
```

### 2. Конфигурация Pipeline

```typescript
import type { PipelineConfig, SynapseContext } from 'neuroline';
import { fetchDataJob, processDataJob, saveResultJob } from './jobs';

interface PipelineInput {
    url: string;
    userId: string;
}

export const myPipelineConfig: PipelineConfig<PipelineInput> = {
    name: 'my-neuroline',

    stages: [
        // Stage 1: одна job
        fetchDataJob,

        // Stage 2: две jobs выполняются параллельно
        [
            {
                job: processDataJob,
                // synapses трансформирует данные для job
                synapses: (ctx: SynapseContext<PipelineInput>) => ({
                    rawData: ctx.getArtifact<{ data: string }>('fetch-data')?.data ?? '',
                    userId: ctx.pipelineInput.userId,
                }),
            },
            {
                job: notifyJob,
                synapses: (ctx) => ({
                    userId: ctx.pipelineInput.userId,
                    message: 'Processing started',
                }),
            },
        ],

        // Stage 3: финальная job
        {
            job: saveResultJob,
            synapses: (ctx) => ({
                processedData: ctx.getArtifact('process-data'),
                userId: ctx.pipelineInput.userId,
            }),
        },
    ],

    // Опционально: кастомная функция хеширования
    computeInputHash: (input) => `${input.userId}-${input.url}`,
};
```

### 3. Создание и использование PipelineManager

#### С In-Memory хранилищем (для тестов)

```typescript
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';
import { myPipelineConfig } from './pipelines';

const storage = new InMemoryPipelineStorage();
const manager = new PipelineManager({
    storage,
    logger: console, // или ваш логгер
});

// Регистрация pipeline
manager.registerPipeline(myPipelineConfig);

// Запуск pipeline
const { pipelineId, isNew } = await manager.startPipeline('my-neuroline', {
    data: { url: 'https://api.example.com/data', userId: 'user-123' },
    jobOptions: {
        'fetch-data': { timeout: 10000 },
    },
});

// Polling статуса
const status = await manager.getStatus(pipelineId);
console.log(status);
// { status: 'processing', currentJobIndex: 1, totalJobs: 4, currentJobName: 'process-data' }

// Получение результата (артефакта) конкретной job (по умолчанию — последней)
const result = await manager.getResult(pipelineId);
console.log(result);
// { pipelineId: '...', jobName: 'save-result', status: 'done', artifact: {...} }

// Получение результата (артефакта) по имени job
const computeResult = await manager.getResult(pipelineId, 'process-data');
console.log(computeResult);
// { pipelineId: '...', jobName: 'process-data', status: 'done', artifact: {...} }
```

#### С MongoDB хранилищем

```typescript
import mongoose from 'mongoose';
import { PipelineManager } from 'neuroline';
import { MongoPipelineStorage, PipelineSchema } from 'neuroline/mongo';

// Создание модели
const PipelineModel = mongoose.model('Pipeline', PipelineSchema);

// Создание manager
const storage = new MongoPipelineStorage(PipelineModel);
const manager = new PipelineManager({ storage, logger: console });

manager.registerPipeline(myPipelineConfig);
```

## API Reference

### PipelineManager

#### `constructor(options: PipelineManagerOptions)`

```typescript
interface PipelineManagerOptions {
    storage: PipelineStorage;  // Обязательно
    logger?: JobLogger;        // Опционально
}
```

#### `registerPipeline(config: PipelineConfig): void`

Регистрирует конфигурацию pipeline. Должен быть вызван до `startPipeline`.

#### `startPipeline<TData>(pipelineType: string, input: PipelineInput<TData>): Promise<StartPipelineResponse>`

Запускает pipeline или возвращает существующий (если найден по хешу входных данных).

```typescript
interface PipelineInput<TData> {
    data: TData;                              // Входные данные
    jobOptions?: Record<string, unknown>;     // Опции для jobs (ключ = имя job)
}

interface StartPipelineResponse {
    pipelineId: string;  // ID для polling
    isNew: boolean;      // true если создан, false если уже существовал
}
```

#### `getStatus(pipelineId: string): Promise<PipelineStatusResponse>`

Возвращает текущий статус pipeline.

```typescript
interface PipelineStatusResponse {
    status: 'processing' | 'done' | 'error';
    currentJobIndex: number;
    totalJobs: number;
    currentJobName?: string;
    error?: { message: string; jobName?: string };
}
```

#### `getResult(pipelineId: string, jobName?: string): Promise<PipelineResultResponse>`

Возвращает результат (артефакт) одной job. Если `jobName` не передан, возвращает результат последней job.

```typescript
interface PipelineResultResponse {
    pipelineId: string;
    jobName: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    artifact: unknown | null | undefined; // undefined = ещё не выполнена, null = выполнена без результата
}
```

#### `getPipeline(pipelineId: string): Promise<PipelineState | null>`

Возвращает полное состояние pipeline (для отладки).

### JobDefinition

```typescript
interface JobDefinition<TInput, TOutput, TOptions> {
    name: string;
    execute: (
        input: TInput,
        options: TOptions | undefined,
        context: JobContext
    ) => Promise<TOutput | null>;
}
```

#### JobContext

```typescript
interface JobContext {
    pipelineId: string;
    jobIndex: number;
    logger: {
        info: (msg: string, data?: Record<string, unknown>) => void;
        error: (msg: string, data?: Record<string, unknown>) => void;
        warn: (msg: string, data?: Record<string, unknown>) => void;
    };
}
```

### PipelineConfig

```typescript
interface PipelineConfig<TInput> {
    name: string;
    stages: PipelineStage[];
    computeInputHash?: (input: TInput) => string;
}

// Stage: одна job или массив jobs (параллельно)
type PipelineStage = StageItem | StageItem[];

// StageItem: JobDefinition или JobInPipeline
type StageItem = JobDefinition | JobInPipeline;

interface JobInPipeline<TInput, TOutput, TOptions> {
    job: JobDefinition<TInput, TOutput, TOptions>;
    synapses?: (ctx: SynapseContext) => TInput;
}
```

### SynapseContext

Контекст для функции `synapses`:

```typescript
interface SynapseContext<TPipelineInput> {
    pipelineInput: TPipelineInput;
    getArtifact: <T>(jobName: string) => T | undefined;
}
```

## Хранилище (Storage)

### InMemoryPipelineStorage

Встроенное in-memory хранилище для тестов и прототипирования.

```typescript
import { InMemoryPipelineStorage } from 'neuroline';

const storage = new InMemoryPipelineStorage();

// Для тестов
storage.clear();           // Очистить все данные
storage.getAll();          // Получить все pipelines
```

### MongoPipelineStorage

MongoDB хранилище (требует `mongoose` как peer dependency).

```typescript
import mongoose from 'mongoose';
import { MongoPipelineStorage, PipelineSchema } from 'neuroline/mongo';

const PipelineModel = mongoose.model('Pipeline', PipelineSchema);
const storage = new MongoPipelineStorage(PipelineModel);
```

### Кастомное хранилище

Реализуйте интерфейс `PipelineStorage`:

```typescript
import type { PipelineStorage, PipelineState, JobStatus, PipelineStatus, PaginatedResult, PaginationParams } from 'neuroline';

class MyCustomStorage implements PipelineStorage {
    async findById(pipelineId: string): Promise<PipelineState | null> { ... }
    async findAll(params?: PaginationParams): Promise<PaginatedResult<PipelineState>> { ... }
    async create(state: PipelineState): Promise<PipelineState> { ... }
    async delete(pipelineId: string): Promise<boolean> { ... }
    async updateStatus(pipelineId: string, status: PipelineStatus): Promise<void> { ... }
    async updateJobStatus(pipelineId: string, jobIndex: number, status: JobStatus, startedAt?: Date): Promise<void> { ... }
    async updateJobArtifact(pipelineId: string, jobIndex: number, artifact: unknown, finishedAt: Date): Promise<void> { ... }
    async updateJobError(pipelineId: string, jobIndex: number, error: { message: string; stack?: string }, finishedAt: Date): Promise<void> { ... }
    async updateCurrentJobIndex(pipelineId: string, jobIndex: number): Promise<void> { ... }
    async updateJobInput(pipelineId: string, jobIndex: number, input: unknown, options?: unknown): Promise<void> { ... }
}
```

## Интеграция с NestJS

```typescript
import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PipelineManager } from 'neuroline';
import { MongoPipelineStorage, PipelineSchema } from 'neuroline/mongo';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: 'Pipeline', schema: PipelineSchema },
        ]),
    ],
})
export class PipelineModule implements OnModuleInit {
    private manager: PipelineManager;

    constructor(
        @InjectModel('Pipeline') private pipelineModel: Model<any>,
        private logger: Logger,
    ) {
        const storage = new MongoPipelineStorage(this.pipelineModel);
        this.manager = new PipelineManager({
            storage,
            logger: {
                info: (msg, data) => this.logger.log({ msg, ...data }),
                error: (msg, data) => this.logger.error({ msg, ...data }),
                warn: (msg, data) => this.logger.warn({ msg, ...data }),
            },
        });
    }

    onModuleInit() {
        this.manager.registerPipeline(myPipelineConfig);
    }
}
```

## Stages и параллельное выполнение

```
Pipeline
├── Stage 1: [jobA]                    ← последовательно
├── Stage 2: [jobB, jobC, jobD]        ← параллельно внутри stage
├── Stage 3: [jobE]                    ← последовательно
└── Stage 4: [jobF, jobG]              ← параллельно внутри stage
```

- **Stages** выполняются **последовательно** (Stage 2 начнётся только после завершения Stage 1)
- **Jobs внутри stage** выполняются **параллельно**
- Если любая job в stage завершается с ошибкой, весь pipeline помечается как `error`

## Idempotency (идемпотентность)

Pipeline идентифицируется по хешу входных данных:

```typescript
// Первый вызов — создаёт pipeline
const { pipelineId, isNew } = await manager.startPipeline('my-pipeline', { data: { url: 'https://example.com' } });
// isNew = true

// Повторный вызов с теми же данными — возвращает существующий
const result2 = await manager.startPipeline('my-pipeline', { data: { url: 'https://example.com' } });
// result2.pipelineId === pipelineId
// result2.isNew = false
```

Для кастомного хеширования:

```typescript
const config: PipelineConfig<MyInput> = {
    name: 'my-pipeline',
    stages: [...],
    computeInputHash: (input) => `${input.userId}-${input.date}`,
};
```

## Инвалидация при изменении конфигурации

При изменении структуры pipeline (добавление/удаление/переименование jobs) старые записи автоматически инвалидируются:

```typescript
// Версия 1: pipeline с двумя jobs
const configV1: PipelineConfig = {
    name: 'my-pipeline',
    stages: [jobA, jobB],
};
manager.registerPipeline(configV1);

// Запускаем — создаётся запись в storage
await manager.startPipeline('my-pipeline', { data: { id: 1 } });
// Pipeline сохраняется с configHash = hash(['jobA', 'jobB'])

// Версия 2: добавили jobC
const configV2: PipelineConfig = {
    name: 'my-pipeline',
    stages: [jobA, jobB, jobC],
};
manager.registerPipeline(configV2);

// Запускаем с теми же данными
await manager.startPipeline('my-pipeline', { data: { id: 1 } });
// configHash изменился → старая запись удаляется → pipeline запускается заново
```

Это полезно при:
- Добавлении новых jobs в pipeline
- Удалении устаревших jobs
- Изменении порядка выполнения
- Переименовании jobs

## Типы

Все типы доступны для импорта:

```typescript
import type {
    // Job
    JobDefinition,
    JobContext,
    JobLogger,
    JobStatus,
    JobState,          // JobState<TInput, TOutput, TOptions> с generics

    // Pipeline
    PipelineConfig,
    PipelineStage,
    PipelineInput,
    PipelineStatus,
    PipelineState,

    // Synapse
    SynapseContext,
    JobInPipeline,
    StageItem,

    // Responses
    StartPipelineResponse,
    PipelineStatusResponse,
    PipelineResultResponse,

    // Storage
    PipelineStorage,
    PaginatedResult,
    PaginationParams,
} from 'neuroline';

// MongoDB типы (отдельный импорт)
import type {
    MongoPipelineDocument,
    MongoPipelineJobState,
} from 'neuroline/mongo';
```

### JobState с Generics

`JobState` теперь поддерживает generic типы для input, output (artifact) и options:

```typescript
interface JobState<TInput = unknown, TOutput = unknown, TOptions = unknown> {
    name: string;
    status: JobStatus;
    input?: TInput;      // Входные данные (вычисленные synapses)
    options?: TOptions;  // Опции job (из jobOptions)
    artifact?: TOutput;  // Выходные данные (результат execute)
    error?: { message: string; stack?: string };
    startedAt?: Date;
    finishedAt?: Date;
}
```

## Клиентский API (neuroline/client)

Клиентский модуль для взаимодействия с Pipeline API из браузера.

**Примечание:** Один клиент = один pipeline. URL определяет какой pipeline запускается.

### PipelineClient

```typescript
import { PipelineClient } from 'neuroline/client';

// Клиент для конкретного pipeline
const client = new PipelineClient({ baseUrl: '/api/pipeline/my-pipeline' });

// Запуск pipeline
const { pipelineId, isNew } = await client.start({
  input: { userId: 123 },
  jobOptions: { 'fetch-data': { timeout: 5000 } },
});

// Получение статуса
const status = await client.getStatus(pipelineId);

// Получение результата (артефакта) последней job
const result = await client.getResult(pipelineId);

// Получение деталей job (input, options, artifact)
const jobDetails = await client.getJobDetails(pipelineId, 'fetch-data');
```

### Polling

```typescript
// Ручной polling
const { stop, completed } = client.poll(pipelineId, (event) => {
  console.log('Статус:', event.status.status);
});

// Ожидание завершения
const finalEvent = await completed;

// Или ручная остановка polling
stop();
```

### Запуск с Polling

```typescript
// Клиент для конкретного pipeline
const client = new PipelineClient({ baseUrl: '/api/pipeline/my-pipeline' });

// Запуск pipeline и немедленное начало polling
const { pipelineId, stop, completed } = await client.startAndPoll(
  {
    input: { url: 'https://example.com' },
  },
  (event) => {
    // Вызывается на каждый poll
    console.log('Прогресс:', event.status.currentJobIndex, '/', event.status.totalJobs);
  },
  (error) => {
    // Вызывается при ошибке
    console.error('Ошибка pipeline:', error);
  }
);
```

### Фабрика React хука

```typescript
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createUsePipelineHook, PipelineClient } from 'neuroline/client';

// Создание хука с зависимостями React
const usePipeline = createUsePipelineHook({ useState, useCallback, useEffect, useRef });

// В компоненте
function MyComponent() {
  // Один клиент на pipeline
  const client = useMemo(() => new PipelineClient({ baseUrl: '/api/pipeline/my-pipeline' }), []);
  const { start, status, isRunning, error } = usePipeline(client);

  const handleStart = async () => {
    await start({ input: { userId: 123 } });
  };

  return (
    <div>
      <button onClick={handleStart} disabled={isRunning}>Запуск</button>
      {status && <div>Статус: {status.status}</div>}
    </div>
  );
}
```

## Exports

| Import path | Содержимое |
|-------------|------------|
| `neuroline` | Core: типы, `PipelineManager`, `InMemoryPipelineStorage` |
| `neuroline/mongo` | MongoDB: `MongoPipelineStorage`, `PipelineSchema`, типы документов |
| `neuroline/client` | Client: `PipelineClient`, `createUsePipelineHook`, типы |

## License

UNLICENSED

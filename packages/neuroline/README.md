# Pipeline Manager

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

// Получение результатов
const result = await manager.getResult(pipelineId);
console.log(result);
// { status: 'done', artifacts: [...], jobNames: ['fetch-data', 'process-data', 'notify', 'save-result'] }
```

#### С MongoDB хранилищем

```typescript
import mongoose from 'mongoose';
import { PipelineManager, MongoPipelineStorage, PipelineSchema } from 'neuroline';
// или: import { MongoPipelineStorage, PipelineSchema } from 'neuroline/mongo';

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

#### `getResult(pipelineId: string): Promise<PipelineResultResponse>`

Возвращает результаты (артефакты) всех jobs.

```typescript
interface PipelineResultResponse {
    status: 'processing' | 'done' | 'error';
    artifacts: (unknown | null | undefined)[];  // undefined = ещё не выполнена
    jobNames: string[];
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
import { MongoPipelineStorage, PipelineSchema } from 'neuroline';

const PipelineModel = mongoose.model('Pipeline', PipelineSchema);
const storage = new MongoPipelineStorage(PipelineModel);
```

### Кастомное хранилище

Реализуйте интерфейс `PipelineStorage`:

```typescript
import type { PipelineStorage, PipelineState, JobStatus, PipelineStatus } from 'neuroline';

class MyCustomStorage implements PipelineStorage {
    async findById(pipelineId: string): Promise<PipelineState | null> { ... }
    async create(state: PipelineState): Promise<PipelineState> { ... }
    async updateStatus(pipelineId: string, status: PipelineStatus): Promise<void> { ... }
    async updateJobStatus(pipelineId: string, jobIndex: number, status: JobStatus, startedAt?: Date): Promise<void> { ... }
    async updateJobArtifact(pipelineId: string, jobIndex: number, artifact: unknown, finishedAt: Date): Promise<void> { ... }
    async updateJobError(pipelineId: string, jobIndex: number, error: { message: string; stack?: string }, finishedAt: Date): Promise<void> { ... }
    async updateCurrentJobIndex(pipelineId: string, jobIndex: number): Promise<void> { ... }
}
```

## Интеграция с NestJS

```typescript
import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PipelineManager, MongoPipelineStorage, PipelineSchema } from 'neuroline';

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
    JobState,

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

    // MongoDB
    MongoPipelineDocument,
    MongoPipelineJobState,
} from neuroline';
```

## Exports

| Import path | Содержимое |
|-------------|------------|
| `neuroline` | Всё: типы, классы, MongoDB |
| `neuroline/mongo` | Только MongoDB: `MongoPipelineStorage`, `PipelineSchema`, типы документов |

## License

UNLICENSED


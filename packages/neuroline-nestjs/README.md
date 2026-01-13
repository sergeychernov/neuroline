[English](#neuroline-nestjs) | [Русский](#neuroline-nestjs-1)

# neuroline-nestjs

[![npm](https://img.shields.io/npm/v/neuroline-nestjs)](https://www.npmjs.com/package/neuroline-nestjs)
[![Demo](https://img.shields.io/badge/Demo-neuroline.vercel.app-blue)](https://neuroline.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-sergeychernov/neuroline-black)](https://github.com/sergeychernov/neuroline)

NestJS integration for Neuroline — provides `createPipelineController` factory for creating API controllers compatible with `PipelineClient`.

## Installation

```bash
yarn add neuroline neuroline-nestjs
# or
npm install neuroline neuroline-nestjs
```

## Features

- **Controller Factory** — `createPipelineController` creates a controller for a specific pipeline
- **PipelineClient Compatible** — API format matches `neuroline/client` expectations
- **One Controller = One Pipeline** — clean separation, easy to add multiple pipelines
- **Full TypeScript Support** — type-safe configuration

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';
import { createPipelineController } from 'neuroline-nestjs';
import { myPipeline } from './pipelines';

// Create storage and manager
const storage = new InMemoryPipelineStorage();
const manager = new PipelineManager({ storage });

// Create controller for the pipeline
const MyPipelineController = createPipelineController({
  path: 'api/pipeline/my-pipeline',
  manager,
  storage,
  pipeline: myPipeline,
});

@Module({
  controllers: [MyPipelineController],
})
export class AppModule {}
```

## API Endpoints

The created controller exposes the following endpoints:

### POST `/api/pipeline/my-pipeline`

Start a new pipeline.

**Request:**
```bash
curl -X POST http://localhost:3000/api/pipeline/my-pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "input": { "seed": 123, "name": "test" },
    "jobOptions": {
      "compute": { "multiplier": 2.0 }
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pipelineId": "demo_123_test_ok",
    "isNew": true
  }
}
```

### GET `/api/pipeline/my-pipeline?action=status&id=xxx`

Get pipeline status.

**Request:**
```bash
curl "http://localhost:3000/api/pipeline/my-pipeline?action=status&id=demo_123_test_ok"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pipelineId": "demo_123_test_ok",
    "pipelineType": "my-pipeline",
    "status": "processing",
    "stages": [...]
  }
}
```

### GET `/api/pipeline/my-pipeline?action=result&id=xxx`

Get pipeline results (artifacts).

**Request:**
```bash
curl "http://localhost:3000/api/pipeline/my-pipeline?action=result&id=demo_123_test_ok"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pipelineId": "demo_123_test_ok",
    "status": "done",
    "artifacts": {
      "init": { "initialized": true, "processId": "..." },
      "compute": { "result": 456.78 }
    }
  }
}
```

### GET `/api/pipeline/my-pipeline?action=job&id=xxx&jobName=yyy`

Get specific job details (input, options, artifact).

**Request:**
```bash
curl "http://localhost:3000/api/pipeline/my-pipeline?action=job&id=demo_123_test_ok&jobName=compute"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "compute",
    "status": "done",
    "input": { "seed": 123, "iterations": 10 },
    "options": { "multiplier": 2.0 },
    "artifact": { "result": 456.78 }
  }
}
```

### GET `/api/pipeline/my-pipeline?action=list&page=1&limit=10`

List pipelines with pagination.

**Request:**
```bash
curl "http://localhost:3000/api/pipeline/my-pipeline?action=list&page=1&limit=10"
```

## Multiple Pipelines

```typescript
import { Module } from '@nestjs/common';
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';
import { createPipelineController } from 'neuroline-nestjs';
import { demoPipeline, analyticsPipeline } from './pipelines';

const storage = new InMemoryPipelineStorage();
const manager = new PipelineManager({ storage });

const DemoController = createPipelineController({
  path: 'api/pipeline/demo',
  manager,
  storage,
  pipeline: demoPipeline,
});

const AnalyticsController = createPipelineController({
  path: 'api/pipeline/analytics',
  manager,
  storage,
  pipeline: analyticsPipeline,
});

@Module({
  controllers: [DemoController, AnalyticsController],
})
export class AppModule {}
```

## With MongoDB Storage

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule, getModelToken, InjectModel } from '@nestjs/mongoose';
import { PipelineManager } from 'neuroline';
import { MongoPipelineStorage, PipelineSchema, MongoPipelineDocument } from 'neuroline/mongo';
import { createPipelineController } from 'neuroline-nestjs';
import { myPipeline } from './pipelines';
import { Model } from 'mongoose';

// Note: With Mongoose, you need to create the controller after model is available
// This requires a slightly different setup

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/neuroline'),
    MongooseModule.forFeature([{ name: 'Pipeline', schema: PipelineSchema }]),
  ],
})
export class AppModule {
  constructor(
    @InjectModel('Pipeline') pipelineModel: Model<MongoPipelineDocument>,
  ) {
    const storage = new MongoPipelineStorage(pipelineModel);
    const manager = new PipelineManager({ storage });
    
    // Register pipeline
    manager.registerPipeline(myPipeline);
  }
}
```

## Using with PipelineClient

The API format is fully compatible with `PipelineClient` from `neuroline/client`:

```typescript
import { PipelineClient } from 'neuroline/client';

const client = new PipelineClient({
  baseUrl: 'http://localhost:3000/api/pipeline/demo',
});

// Start pipeline and poll for updates
const { pipelineId, completed } = await client.startAndPoll(
  { input: { seed: 123, name: 'test' } },
  (event) => {
    console.log('Status:', event.status.status);
    console.log('Artifacts:', event.result.artifacts);
  },
);

await completed;
console.log('Pipeline finished!');
```

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `createPipelineController` | Function | Factory for creating pipeline controllers |
| `CreatePipelineControllerOptions` | Type | Options for the factory |
| `NeurolineService` | Class | Service for custom implementations |
| `ApiResponse` | Type | Standard API response type |

## Migration from v0.1.x

In v0.2.0, the API changed from module-based to factory-based:

**Before (v0.1.x):**
```typescript
// Old API - deprecated
NeurolineModule.register({
  manager,
  storage,
  pipelines: [myPipeline],
});
```

**After (v0.2.0):**
```typescript
// New API
const MyController = createPipelineController({
  path: 'api/pipeline/my-pipeline',
  manager,
  storage,
  pipeline: myPipeline,
});

@Module({
  controllers: [MyController],
})
export class AppModule {}
```

## License

UNLICENSED

---

# neuroline-nestjs

[![npm](https://img.shields.io/npm/v/neuroline-nestjs)](https://www.npmjs.com/package/neuroline-nestjs)
[![Demo](https://img.shields.io/badge/Demo-neuroline.vercel.app-blue)](https://neuroline.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-sergeychernov/neuroline-black)](https://github.com/sergeychernov/neuroline)

Интеграция NestJS для Neuroline — предоставляет фабрику `createPipelineController` для создания API-контроллеров, совместимых с `PipelineClient`.

## Установка

```bash
yarn add neuroline neuroline-nestjs
# или
npm install neuroline neuroline-nestjs
```

## Возможности

- **Фабрика контроллеров** — `createPipelineController` создаёт контроллер для конкретного pipeline
- **Совместимость с PipelineClient** — формат API соответствует ожиданиям `neuroline/client`
- **Один контроллер = один pipeline** — чистое разделение, легко добавить несколько pipelines
- **Полная поддержка TypeScript** — типобезопасная конфигурация

## Быстрый старт

```typescript
import { Module } from '@nestjs/common';
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';
import { createPipelineController } from 'neuroline-nestjs';
import { myPipeline } from './pipelines';

// Создаём storage и manager
const storage = new InMemoryPipelineStorage();
const manager = new PipelineManager({ storage });

// Создаём контроллер для pipeline
const MyPipelineController = createPipelineController({
  path: 'api/pipeline/my-pipeline',
  manager,
  storage,
  pipeline: myPipeline,
});

@Module({
  controllers: [MyPipelineController],
})
export class AppModule {}
```

## API Эндпоинты

Созданный контроллер предоставляет следующие эндпоинты:

### POST `/api/pipeline/my-pipeline`

Запустить новый pipeline.

**Запрос:**
```bash
curl -X POST http://localhost:3000/api/pipeline/my-pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "input": { "seed": 123, "name": "test" },
    "jobOptions": {
      "compute": { "multiplier": 2.0 }
    }
  }'
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "pipelineId": "demo_123_test_ok",
    "isNew": true
  }
}
```

### GET `/api/pipeline/my-pipeline?action=status&id=xxx`

Получить статус pipeline.

**Запрос:**
```bash
curl "http://localhost:3000/api/pipeline/my-pipeline?action=status&id=demo_123_test_ok"
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "pipelineId": "demo_123_test_ok",
    "pipelineType": "my-pipeline",
    "status": "processing",
    "stages": [...]
  }
}
```

### GET `/api/pipeline/my-pipeline?action=result&id=xxx`

Получить результаты pipeline (артефакты).

**Запрос:**
```bash
curl "http://localhost:3000/api/pipeline/my-pipeline?action=result&id=demo_123_test_ok"
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "pipelineId": "demo_123_test_ok",
    "status": "done",
    "artifacts": {
      "init": { "initialized": true, "processId": "..." },
      "compute": { "result": 456.78 }
    }
  }
}
```

### GET `/api/pipeline/my-pipeline?action=job&id=xxx&jobName=yyy`

Получить детали конкретной job (input, options, artifact).

**Запрос:**
```bash
curl "http://localhost:3000/api/pipeline/my-pipeline?action=job&id=demo_123_test_ok&jobName=compute"
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "name": "compute",
    "status": "done",
    "input": { "seed": 123, "iterations": 10 },
    "options": { "multiplier": 2.0 },
    "artifact": { "result": 456.78 }
  }
}
```

### GET `/api/pipeline/my-pipeline?action=list&page=1&limit=10`

Список pipelines с пагинацией.

**Запрос:**
```bash
curl "http://localhost:3000/api/pipeline/my-pipeline?action=list&page=1&limit=10"
```

## Несколько Pipelines

```typescript
import { Module } from '@nestjs/common';
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';
import { createPipelineController } from 'neuroline-nestjs';
import { demoPipeline, analyticsPipeline } from './pipelines';

const storage = new InMemoryPipelineStorage();
const manager = new PipelineManager({ storage });

const DemoController = createPipelineController({
  path: 'api/pipeline/demo',
  manager,
  storage,
  pipeline: demoPipeline,
});

const AnalyticsController = createPipelineController({
  path: 'api/pipeline/analytics',
  manager,
  storage,
  pipeline: analyticsPipeline,
});

@Module({
  controllers: [DemoController, AnalyticsController],
})
export class AppModule {}
```

## Использование с PipelineClient

Формат API полностью совместим с `PipelineClient` из `neuroline/client`:

```typescript
import { PipelineClient } from 'neuroline/client';

const client = new PipelineClient({
  baseUrl: 'http://localhost:3000/api/pipeline/demo',
});

// Запускаем pipeline и получаем обновления
const { pipelineId, completed } = await client.startAndPoll(
  { input: { seed: 123, name: 'test' } },
  (event) => {
    console.log('Статус:', event.status.status);
    console.log('Артефакты:', event.result.artifacts);
  },
);

await completed;
console.log('Pipeline завершён!');
```

## Экспорты

| Экспорт | Тип | Описание |
|---------|-----|----------|
| `createPipelineController` | Function | Фабрика для создания контроллеров |
| `CreatePipelineControllerOptions` | Type | Опции для фабрики |
| `NeurolineService` | Class | Сервис для кастомных реализаций |
| `ApiResponse` | Type | Стандартный тип ответа API |

## Миграция с v0.1.x

В v0.2.0 API изменился с модульного на фабричный:

**До (v0.1.x):**
```typescript
// Старый API - устарел
NeurolineModule.register({
  manager,
  storage,
  pipelines: [myPipeline],
});
```

**После (v0.2.0):**
```typescript
// Новый API
const MyController = createPipelineController({
  path: 'api/pipeline/my-pipeline',
  manager,
  storage,
  pipeline: myPipeline,
});

@Module({
  controllers: [MyController],
})
export class AppModule {}
```

## Лицензия

UNLICENSED

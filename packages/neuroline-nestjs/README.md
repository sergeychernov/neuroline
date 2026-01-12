[English](#neuroline-nestjs) | [Русский](#neuroline-nestjs-1)

# neuroline-nestjs

NestJS integration package for Neuroline - provides module, controller, and service for pipeline orchestration.

## Installation

```bash
yarn add neuroline neuroline-nestjs
```

## Features

- **Dynamic Module** - flexible configuration with sync/async registration
- **REST API Controller** - ready-to-use endpoints for pipeline management
- **Service Layer** - encapsulated business logic for working with PipelineManager
- **TypeScript Support** - full type safety with DTO validation

## Quick Start

### Basic Setup (In-Memory Storage)

```typescript
import { Module } from '@nestjs/common';
import { NeurolineModule } from 'neuroline-nestjs';
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';
import { myPipelineConfig } from './pipelines';

const storage = new InMemoryPipelineStorage();
const manager = new PipelineManager({ storage });

@Module({
  imports: [
    NeurolineModule.register({
      manager,
      storage,
      pipelines: [myPipelineConfig],
    }),
  ],
})
export class AppModule {}
```

### With MongoDB Storage

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { NeurolineModule } from 'neuroline-nestjs';
import { PipelineManager, MongoPipelineStorage, PipelineSchema } from 'neuroline';
import { myPipelineConfig } from './pipelines';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/neuroline'),
    MongooseModule.forFeature([
      { name: 'Pipeline', schema: PipelineSchema },
    ]),
    NeurolineModule.registerAsync({
      imports: [MongooseModule],
      useFactory: (pipelineModel) => {
        const storage = new MongoPipelineStorage(pipelineModel);
        const manager = new PipelineManager({ storage });
        return {
          manager,
          storage,
          pipelines: [myPipelineConfig],
        };
      },
      inject: [getModelToken('Pipeline')],
    }),
  ],
})
export class AppModule {}
```

## API Endpoints

The module provides the following REST endpoints:

### POST `/pipeline/:type/start`

Start a new pipeline or return existing one.

**Request:**
```bash
curl -X POST http://localhost:3000/pipeline/my-pipeline/start \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "url": "https://api.example.com/data",
      "userId": "user-123"
    },
    "jobOptions": {
      "fetch-data": { "timeout": 10000 }
    }
  }'
```

**Response:**
```json
{
  "pipelineId": "abc123xyz",
  "isNew": true
}
```

### GET `/pipeline/:id/status`

Get current pipeline status.

**Request:**
```bash
curl http://localhost:3000/pipeline/abc123xyz/status
```

**Response:**
```json
{
  "status": "processing",
  "currentJobIndex": 1,
  "totalJobs": 4,
  "currentJobName": "process-data"
}
```

### GET `/pipeline/:id/result`

Get pipeline results (artifacts).

**Request:**
```bash
curl http://localhost:3000/pipeline/abc123xyz/result
```

**Response:**
```json
{
  "status": "done",
  "artifacts": [
    { "data": "...", "fetchedAt": "2024-01-01T00:00:00Z" },
    { "processed": "..." }
  ],
  "jobNames": ["fetch-data", "process-data"]
}
```

### GET `/pipeline/:id`

Get full pipeline state (for debugging).

**Request:**
```bash
curl http://localhost:3000/pipeline/abc123xyz
```

### GET `/pipelines`

List all pipelines with pagination.

**Request:**
```bash
curl "http://localhost:3000/pipelines?page=1&limit=10"
```

**Response:**
```json
{
  "items": [...],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

## Module Configuration

### Sync Registration

```typescript
NeurolineModule.register({
  manager: PipelineManager,        // Required
  storage: PipelineStorage,        // Required
  pipelines: PipelineConfig[],     // Optional
});
```

### Async Registration

```typescript
NeurolineModule.registerAsync({
  imports: [SomeModule],
  useFactory: (dep1, dep2) => ({
    manager: new PipelineManager({ ... }),
    storage: new CustomStorage(),
    pipelines: [config1, config2],
  }),
  inject: [Dep1, Dep2],
});
```

## Custom Controller

If you need custom endpoints, you can use `NeurolineService` directly:

```typescript
import { Controller, Get } from '@nestjs/common';
import { NeurolineService } from 'neuroline-nestjs';

@Controller('custom-pipelines')
export class CustomPipelineController {
  constructor(private readonly neurolineService: NeurolineService) {}

  @Get('active')
  async getActivePipelines() {
    return this.neurolineService.listPipelines({
      page: 1,
      limit: 100,
      // Custom filtering logic here
    });
  }
}
```

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `NeurolineModule` | Module | Dynamic module for NestJS |
| `NeurolineController` | Controller | REST API endpoints |
| `NeurolineService` | Service | Business logic layer |
| `StartPipelineDto` | DTO | Validation for start endpoint |
| `ListPipelinesDto` | DTO | Validation for list endpoint |

## License

UNLICENSED

---

# neuroline-nestjs

Пакет интеграции с NestJS для Neuroline - предоставляет модуль, контроллер и сервис для оркестрации пайплайнов.

## Установка

```bash
yarn add neuroline neuroline-nestjs
```

## Возможности

- **Динамический модуль** - гибкая конфигурация с синхронной/асинхронной регистрацией
- **REST API контроллер** - готовые эндпоинты для управления пайплайнами
- **Слой сервиса** - инкапсулированная бизнес-логика для работы с PipelineManager
- **TypeScript поддержка** - полная типобезопасность с валидацией DTO

## Быстрый старт

### Базовая настройка (In-Memory хранилище)

```typescript
import { Module } from '@nestjs/common';
import { NeurolineModule } from 'neuroline-nestjs';
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';
import { myPipelineConfig } from './pipelines';

const storage = new InMemoryPipelineStorage();
const manager = new PipelineManager({ storage });

@Module({
  imports: [
    NeurolineModule.register({
      manager,
      storage,
      pipelines: [myPipelineConfig],
    }),
  ],
})
export class AppModule {}
```

### С MongoDB хранилищем

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { NeurolineModule } from 'neuroline-nestjs';
import { PipelineManager, MongoPipelineStorage, PipelineSchema } from 'neuroline';
import { myPipelineConfig } from './pipelines';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/neuroline'),
    MongooseModule.forFeature([
      { name: 'Pipeline', schema: PipelineSchema },
    ]),
    NeurolineModule.registerAsync({
      imports: [MongooseModule],
      useFactory: (pipelineModel) => {
        const storage = new MongoPipelineStorage(pipelineModel);
        const manager = new PipelineManager({ storage });
        return {
          manager,
          storage,
          pipelines: [myPipelineConfig],
        };
      },
      inject: [getModelToken('Pipeline')],
    }),
  ],
})
export class AppModule {}
```

## API Эндпоинты

Модуль предоставляет следующие REST эндпоинты:

### POST `/pipeline/:type/start`

Запустить новый pipeline или вернуть существующий.

**Запрос:**
```bash
curl -X POST http://localhost:3000/pipeline/my-pipeline/start \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "url": "https://api.example.com/data",
      "userId": "user-123"
    },
    "jobOptions": {
      "fetch-data": { "timeout": 10000 }
    }
  }'
```

**Ответ:**
```json
{
  "pipelineId": "abc123xyz",
  "isNew": true
}
```

### GET `/pipeline/:id/status`

Получить текущий статус pipeline.

**Запрос:**
```bash
curl http://localhost:3000/pipeline/abc123xyz/status
```

**Ответ:**
```json
{
  "status": "processing",
  "currentJobIndex": 1,
  "totalJobs": 4,
  "currentJobName": "process-data"
}
```

### GET `/pipeline/:id/result`

Получить результаты pipeline (артефакты).

**Запрос:**
```bash
curl http://localhost:3000/pipeline/abc123xyz/result
```

**Ответ:**
```json
{
  "status": "done",
  "artifacts": [
    { "data": "...", "fetchedAt": "2024-01-01T00:00:00Z" },
    { "processed": "..." }
  ],
  "jobNames": ["fetch-data", "process-data"]
}
```

### GET `/pipeline/:id`

Получить полное состояние pipeline (для отладки).

**Запрос:**
```bash
curl http://localhost:3000/pipeline/abc123xyz
```

### GET `/pipelines`

Список всех pipelines с пагинацией.

**Запрос:**
```bash
curl "http://localhost:3000/pipelines?page=1&limit=10"
```

**Ответ:**
```json
{
  "items": [...],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

## Конфигурация модуля

### Синхронная регистрация

```typescript
NeurolineModule.register({
  manager: PipelineManager,        // Обязательно
  storage: PipelineStorage,        // Обязательно
  pipelines: PipelineConfig[],     // Опционально
});
```

### Асинхронная регистрация

```typescript
NeurolineModule.registerAsync({
  imports: [SomeModule],
  useFactory: (dep1, dep2) => ({
    manager: new PipelineManager({ ... }),
    storage: new CustomStorage(),
    pipelines: [config1, config2],
  }),
  inject: [Dep1, Dep2],
});
```

## Кастомный контроллер

Если вам нужны свои эндпоинты, вы можете использовать `NeurolineService` напрямую:

```typescript
import { Controller, Get } from '@nestjs/common';
import { NeurolineService } from 'neuroline-nestjs';

@Controller('custom-pipelines')
export class CustomPipelineController {
  constructor(private readonly neurolineService: NeurolineService) {}

  @Get('active')
  async getActivePipelines() {
    return this.neurolineService.listPipelines({
      page: 1,
      limit: 100,
      // Ваша логика фильтрации здесь
    });
  }
}
```

## Экспорты

| Экспорт | Тип | Описание |
|---------|-----|----------|
| `NeurolineModule` | Module | Динамический модуль для NestJS |
| `NeurolineController` | Controller | REST API эндпоинты |
| `NeurolineService` | Service | Слой бизнес-логики |
| `StartPipelineDto` | DTO | Валидация для старта pipeline |
| `ListPipelinesDto` | DTO | Валидация для списка pipelines |

## License

UNLICENSED

NestJS module and controllers for Neuroline pipeline APIs with DI support.

[English](#neuroline-nestjs) | [Русский](#neuroline-nestjs-1)

# neuroline-nestjs

[![npm](https://img.shields.io/npm/v/neuroline-nestjs)](https://www.npmjs.com/package/neuroline-nestjs)
[![Demo](https://img.shields.io/badge/Demo-neuroline.vercel.app-blue)](https://neuroline.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-sergeychernov/neuroline-black)](https://github.com/sergeychernov/neuroline)

NestJS integration for Neuroline — dynamic module with full DI support for creating pipeline API controllers.

## Installation

```bash
yarn add neuroline neuroline-nestjs
# or
npm install neuroline neuroline-nestjs
```

## Features

- **Dynamic Module** — `NeurolineModule.forRootAsync()` with full NestJS DI support
- **Auto-generated Controllers** — no boilerplate, just configuration
- **Guards Support** — apply guards per controller
- **PipelineClient Compatible** — API format matches `neuroline/client` expectations
- **NeurolineService** — access manager/storage in your services
- **MongoDB Re-exports** — `MongoPipelineStorage`, `PipelineSchema` included

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import {
  NeurolineModule,
  MongoPipelineStorage,
  PipelineSchema,
} from 'neuroline-nestjs';
import { myPipeline } from './pipelines';
import { AuthGuard } from './guards';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/neuroline'),
    MongooseModule.forFeature([{ name: 'Pipeline', schema: PipelineSchema }]),

    NeurolineModule.forRootAsync({
      imports: [MongooseModule],
      useFactory: (model) => new MongoPipelineStorage(model),
      inject: [getModelToken('Pipeline')],
      controllers: [
        {
          path: 'api/v1/my-pipeline',
          pipeline: myPipeline,
          guards: [AuthGuard],       // guards for entire controller
          adminGuards: [AdminGuard], // guards for admin endpoints
          // Get jobOptions from request context
          getJobOptions: async (input, request) => {
            const user = request.user;
            return {
              myJob: { userId: user?.id, apiKey: process.env.API_KEY },
            };
          },
        },
      ],
    }),
  ],
})
export class AppModule {}
```

## Using NeurolineService

```typescript
import { Injectable } from '@nestjs/common';
import { NeurolineService } from 'neuroline-nestjs';

@Injectable()
export class MyService {
  constructor(private readonly neuroline: NeurolineService) {}

  async runPipeline(data: any) {
    const { pipelineId } = await this.neuroline.startPipeline('my-pipeline', data);
    return pipelineId;
  }

  async checkStatus(pipelineId: string) {
    return this.neuroline.getStatus(pipelineId);
  }
}
```

## Direct DI Access

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { NEUROLINE_MANAGER, NEUROLINE_STORAGE } from 'neuroline-nestjs';
import type { PipelineManager, PipelineStorage } from 'neuroline';

@Injectable()
export class MyService {
  constructor(
    @Inject(NEUROLINE_MANAGER) private readonly manager: PipelineManager,
    @Inject(NEUROLINE_STORAGE) private readonly storage: PipelineStorage,
  ) {}
}
```

## API Endpoints

The generated controllers expose the following endpoints:

### POST `/api/v1/my-pipeline`

Start a new pipeline. Request body = `TInput` directly.

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/my-pipeline \
  -H "Content-Type: application/json" \
  -d '{ "seed": 123, "name": "test" }'
```

`jobOptions` are obtained on the server via `getJobOptions(input, request)`.

**Response:**
```json
{
  "success": true,
  "data": {
    "pipelineId": "abc123",
    "isNew": true
  }
}
```

### POST `/api/v1/my-pipeline?action=startWithOptions`

Admin endpoint: start pipeline with explicit `jobOptions`. Requires `adminGuards`.

**Request:**
```bash
curl -X POST "http://localhost:3000/api/v1/my-pipeline?action=startWithOptions" \
  -H "Content-Type: application/json" \
  -d '{
    "input": { "seed": 123, "name": "test" },
    "jobOptions": {
      "compute": { "multiplier": 2.0 }
    }
  }'
```

### GET `?action=status&id=xxx`

Get pipeline status.

### GET `?action=result&id=xxx[&jobName=yyy]`

Get job result (artifact). If `jobName` is not provided, returns the last job result.

### GET `?action=list&page=1&limit=10`

List pipelines with pagination.

### Admin Endpoints

These endpoints return full pipeline/job data (input, options, artifacts) or allow passing `jobOptions` directly. They are **disabled by default**. Enable with `adminGuards`.

| Endpoint | Description |
|----------|-------------|
| `POST ?action=startWithOptions` | Start pipeline with explicit jobOptions |
| `GET ?action=job&id=xxx&jobName=yyy` | Job details (input, options, artifact) |
| `GET ?action=pipeline&id=xxx` | Full pipeline state |

```typescript
// Admin доступен только авторизованным
adminGuards: [AdminGuard]

// Admin доступен всем (открытый доступ)
adminGuards: []

// Admin отключён (по умолчанию)
// просто не указывайте adminGuards
```

## Multiple Pipelines

```typescript
NeurolineModule.forRootAsync({
  imports: [MongooseModule],
  useFactory: (model) => new MongoPipelineStorage(model),
  inject: [getModelToken('Pipeline')],
  controllers: [
    {
      path: 'api/v1/demo',
      pipeline: demoPipeline,
    },
    {
      path: 'api/v1/analytics',
      pipeline: analyticsPipeline,
      guards: [AdminGuard],
    },
  ],
})
```

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `NeurolineModule` | Class | Dynamic module with `forRootAsync()` |
| `NeurolineService` | Class | Service for accessing manager/storage |
| `NEUROLINE_MANAGER` | Token | DI token for PipelineManager |
| `NEUROLINE_STORAGE` | Token | DI token for PipelineStorage |
| `MongoPipelineStorage` | Class | MongoDB storage (re-export) |
| `PipelineSchema` | Schema | Mongoose schema (re-export) |
| `PipelineControllerOptions` | Type | Controller configuration |
| `NeurolineModuleAsyncOptions` | Type | Module configuration |

## License

UNLICENSED

---

# neuroline-nestjs

[![npm](https://img.shields.io/npm/v/neuroline-nestjs)](https://www.npmjs.com/package/neuroline-nestjs)
[![Demo](https://img.shields.io/badge/Demo-neuroline.vercel.app-blue)](https://neuroline.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-sergeychernov/neuroline-black)](https://github.com/sergeychernov/neuroline)

Интеграция NestJS для Neuroline — динамический модуль с полной поддержкой DI для создания API-контроллеров.

## Установка

```bash
yarn add neuroline neuroline-nestjs
# или
npm install neuroline neuroline-nestjs
```

## Возможности

- **Динамический модуль** — `NeurolineModule.forRootAsync()` с полной поддержкой NestJS DI
- **Автогенерация контроллеров** — без boilerplate, только конфигурация
- **Поддержка Guards** — применяйте guards для каждого контроллера
- **Совместимость с PipelineClient** — формат API соответствует `neuroline/client`
- **NeurolineService** — доступ к manager/storage в ваших сервисах
- **Реэкспорт MongoDB** — `MongoPipelineStorage`, `PipelineSchema` включены

## Быстрый старт

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import {
  NeurolineModule,
  MongoPipelineStorage,
  PipelineSchema,
} from 'neuroline-nestjs';
import { myPipeline } from './pipelines';
import { AuthGuard } from './guards';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/neuroline'),
    MongooseModule.forFeature([{ name: 'Pipeline', schema: PipelineSchema }]),

    NeurolineModule.forRootAsync({
      imports: [MongooseModule],
      useFactory: (model) => new MongoPipelineStorage(model),
      inject: [getModelToken('Pipeline')],
      controllers: [
        {
          path: 'api/v1/my-pipeline',
          pipeline: myPipeline,
          guards: [AuthGuard],       // guards для всего контроллера
          adminGuards: [AdminGuard], // guards для admin-эндпоинтов
          // Получение jobOptions из контекста запроса
          getJobOptions: async (input, request) => {
            const user = request.user;
            return {
              myJob: { userId: user?.id, apiKey: process.env.API_KEY },
            };
          },
        },
      ],
    }),
  ],
})
export class AppModule {}
```

## Использование NeurolineService

```typescript
import { Injectable } from '@nestjs/common';
import { NeurolineService } from 'neuroline-nestjs';

@Injectable()
export class MyService {
  constructor(private readonly neuroline: NeurolineService) {}

  async runPipeline(data: any) {
    const { pipelineId } = await this.neuroline.startPipeline('my-pipeline', data);
    return pipelineId;
  }

  async checkStatus(pipelineId: string) {
    return this.neuroline.getStatus(pipelineId);
  }
}
```

## Прямой доступ через DI

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { NEUROLINE_MANAGER, NEUROLINE_STORAGE } from 'neuroline-nestjs';
import type { PipelineManager, PipelineStorage } from 'neuroline';

@Injectable()
export class MyService {
  constructor(
    @Inject(NEUROLINE_MANAGER) private readonly manager: PipelineManager,
    @Inject(NEUROLINE_STORAGE) private readonly storage: PipelineStorage,
  ) {}
}
```

## API Эндпоинты

Сгенерированные контроллеры предоставляют следующие эндпоинты:

### POST `/api/v1/my-pipeline`

Запустить новый pipeline. Тело запроса = `TInput` напрямую.

**Запрос:**
```bash
curl -X POST http://localhost:3000/api/v1/my-pipeline \
  -H "Content-Type: application/json" \
  -d '{ "seed": 123, "name": "test" }'
```

`jobOptions` получаются на сервере через `getJobOptions(input, request)`.

**Ответ:**
```json
{
  "success": true,
  "data": {
    "pipelineId": "abc123",
    "isNew": true
  }
}
```

### POST `/api/v1/my-pipeline?action=startWithOptions`

Admin-эндпоинт: запуск pipeline с явными `jobOptions`. Требует `adminGuards`.

**Запрос:**
```bash
curl -X POST "http://localhost:3000/api/v1/my-pipeline?action=startWithOptions" \
  -H "Content-Type: application/json" \
  -d '{
    "input": { "seed": 123, "name": "test" },
    "jobOptions": {
      "compute": { "multiplier": 2.0 }
    }
  }'
```

### GET `?action=status&id=xxx`

Получить статус pipeline.

### GET `?action=result&id=xxx[&jobName=yyy]`

Получить результат job (артефакт). Если `jobName` не передан, возвращается результат последней job.

### GET `?action=list&page=1&limit=10`

Список pipelines с пагинацией.

### Admin-эндпоинты

Эти эндпоинты возвращают полные данные pipeline/job (input, options, artifacts) или позволяют передавать `jobOptions` напрямую. **Отключены по умолчанию**. Включите через `adminGuards`.

| Эндпоинт | Описание |
|----------|----------|
| `POST ?action=startWithOptions` | Запуск pipeline с явными jobOptions |
| `GET ?action=job&id=xxx&jobName=yyy` | Детали job (input, options, artifact) |
| `GET ?action=pipeline&id=xxx` | Полное состояние pipeline |

```typescript
// Admin доступен только авторизованным
adminGuards: [AdminGuard]

// Admin доступен всем (открытый доступ)
adminGuards: []

// Admin отключён (по умолчанию)
// просто не указывайте adminGuards
```

## Несколько Pipelines

```typescript
NeurolineModule.forRootAsync({
  imports: [MongooseModule],
  useFactory: (model) => new MongoPipelineStorage(model),
  inject: [getModelToken('Pipeline')],
  controllers: [
    {
      path: 'api/v1/demo',
      pipeline: demoPipeline,
    },
    {
      path: 'api/v1/analytics',
      pipeline: analyticsPipeline,
      guards: [AdminGuard],
    },
  ],
})
```

## Экспорты

| Экспорт | Тип | Описание |
|---------|-----|----------|
| `NeurolineModule` | Class | Динамический модуль с `forRootAsync()` |
| `NeurolineService` | Class | Сервис для доступа к manager/storage |
| `NEUROLINE_MANAGER` | Token | DI токен для PipelineManager |
| `NEUROLINE_STORAGE` | Token | DI токен для PipelineStorage |
| `MongoPipelineStorage` | Class | MongoDB storage (реэкспорт) |
| `PipelineSchema` | Schema | Mongoose схема (реэкспорт) |
| `PipelineControllerOptions` | Type | Конфигурация контроллера |
| `NeurolineModuleAsyncOptions` | Type | Конфигурация модуля |

## Лицензия

UNLICENSED

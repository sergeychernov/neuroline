[English](#neuroline-nextjs) | [Русский](#neuroline-nextjs-1)

# neuroline-nextjs

[![Demo](https://img.shields.io/badge/Demo-neuroline.vercel.app-blue)](https://neuroline.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-sergeychernov/neuroline-black)](https://github.com/sergeychernov/neuroline)

Next.js App Router integration for Neuroline - provides route handlers for API routes.

## Installation

```bash
yarn add neuroline neuroline-nextjs
```

## Features

- **App Router Support** - native Next.js 14+ App Router integration
- **Type-Safe Handlers** - full TypeScript support with NextRequest/Response
- **One Route = One Pipeline** - each route handles exactly one pipeline type
- **Job Details API** - get input, options, and artifacts for individual jobs
- **Stateless Design** - works with serverless deployments

## Quick Start

### 1. Create Pipeline Manager

```typescript
// lib/neuroline.ts
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';

const storage = new InMemoryPipelineStorage();
export const manager = new PipelineManager({ storage });
export { storage };
```

### 2. Create API Route Handler

Create a separate route for each pipeline. For example `app/api/pipeline/my-pipeline/route.ts`:

```typescript
import { createPipelineRouteHandler } from 'neuroline-nextjs';
import { manager, storage } from '@/lib/neuroline';
import { myPipelineConfig } from '@/pipelines';

const handlers = createPipelineRouteHandler({
    manager,
    storage,
    pipeline: myPipelineConfig, // One pipeline per route
});

export const GET = handlers.GET;
export const POST = handlers.POST;
```

That's it! Your pipeline API is ready at `/api/pipeline/my-pipeline`.

## API Endpoints

Each route handles one pipeline. The URL determines which pipeline to use.

### POST `/api/pipeline/my-pipeline`

Start a new pipeline or return existing one.

**Request body:**
```typescript
{
  input: unknown;        // Input data
  jobOptions?: Record<string, unknown>;  // Optional job options
}
```

**Example:**
```typescript
const response = await fetch('/api/pipeline/my-pipeline', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: {
      url: 'https://api.example.com/data',
      userId: 'user-123',
    },
    jobOptions: {
      'fetch-data': { timeout: 10000 },
    },
  }),
});

const result = await response.json();
// { success: true, data: { pipelineId: "abc123", isNew: true } }
```

### GET `/api/pipeline/my-pipeline?action=status&id=:id`

Get current pipeline status.

**Example:**
```typescript
const response = await fetch('/api/pipeline/my-pipeline?action=status&id=abc123');
const { data } = await response.json();
// { status: "processing", currentJobIndex: 1, totalJobs: 4, stages: [...] }
```

### GET `/api/pipeline/my-pipeline?action=result&id=:id[&jobName=:name]`

Get a job result (artifact). If `jobName` is not provided, returns the last job result.

**Example:**
```typescript
// Last job result
const response = await fetch('/api/pipeline/my-pipeline?action=result&id=abc123');
const { data } = await response.json();
// { pipelineId: "abc123", jobName: "save-result", status: "done", artifact: {...} }

// Result by job name
const response2 = await fetch('/api/pipeline/my-pipeline?action=result&id=abc123&jobName=fetch-data');
const { data: jobResult } = await response2.json();
// { pipelineId: "abc123", jobName: "fetch-data", status: "done", artifact: {...} }
```

### Debug Endpoints

The following endpoints return sensitive data (input, options, artifacts) and are **disabled by default**. To enable them, set `enableDebugEndpoints: true`.

⚠️ **WARNING**: Do not enable in production unless you have proper authentication/authorization!

#### GET `/api/pipeline/my-pipeline?action=job&id=:id&jobName=:name`

Get detailed job data including input and options.

**Example:**
```typescript
const response = await fetch('/api/pipeline/my-pipeline?action=job&id=abc123&jobName=fetch-data');
const { data } = await response.json();
// { name: "fetch-data", status: "done", input: {...}, options: {...}, artifact: {...} }
```

#### GET `/api/pipeline/my-pipeline?action=pipeline&id=:id`

Get full pipeline state.

**Example:**
```typescript
const response = await fetch('/api/pipeline/my-pipeline?action=pipeline&id=abc123');
const { data } = await response.json();
// Full PipelineState object
```

### GET `/api/pipeline/my-pipeline?action=list`

Get paginated list of pipelines of this type.

**Query parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)

**Example:**
```typescript
const response = await fetch('/api/pipeline/my-pipeline?action=list&page=1&limit=10');
const { data } = await response.json();
// { items: [...], total: 50, page: 1, limit: 10, totalPages: 5 }
```

## With MongoDB Storage

For production, use MongoDB storage:

```typescript
// lib/neuroline.ts
import mongoose from 'mongoose';
import { PipelineManager, MongoPipelineStorage, PipelineSchema } from 'neuroline';
import { myPipelineConfig } from './pipelines';

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI!);

// Create model
const PipelineModel = mongoose.model('Pipeline', PipelineSchema);

// Create manager
const storage = new MongoPipelineStorage(PipelineModel);
export const manager = new PipelineManager({ storage });

manager.registerPipeline(myPipelineConfig);
```

## Client-Side Usage

Use `neuroline/client` for client-side integration. One client per pipeline:

```typescript
'use client';

import { useMemo, useState, useCallback } from 'react';
import { PipelineClient } from 'neuroline/client';

export function PipelineDemo() {
  // Client URL points to specific pipeline route
  const client = useMemo(() => new PipelineClient({ baseUrl: '/api/pipeline/my-pipeline' }), []);
  const [status, setStatus] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleStart = useCallback(async () => {
    setIsRunning(true);
    
    const { pipelineId, stop, completed } = await client.startAndPoll(
      {
        input: { url: 'https://api.example.com/data' },
      },
      (event) => setStatus(event.status),
      (error) => console.error(error),
    );

    await completed;
    setIsRunning(false);
  }, [client]);

  return (
    <div>
      <button onClick={handleStart} disabled={isRunning}>
        Start Pipeline
      </button>
      {status && (
        <div>
          Status: {status.status}
          {status.currentJobName && ` - ${status.currentJobName}`}
        </div>
      )}
    </div>
  );
}
```

## Configuration Options

```typescript
createPipelineRouteHandler({
  manager: PipelineManager,     // Required - pipeline manager instance
  storage: PipelineStorage,     // Required - storage for job details and list
  pipeline: PipelineConfig,     // Required - pipeline config for this route
  enableDebugEndpoints: false,  // Optional - enable action=job and action=pipeline (default: false)
});
```

### Enabling Debug Endpoints

For development or internal tools, you can enable debug endpoints:

```typescript
const handlers = createPipelineRouteHandler({
  manager,
  storage,
  pipeline: myPipeline,
  enableDebugEndpoints: process.env.NODE_ENV === 'development',
});
```

## Error Handling

The handler automatically returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad request (invalid input)
- `404` - Pipeline not found
- `500` - Internal server error

All errors return JSON format:

```json
{
  "error": "Error message"
}
```

## Serverless Deployment

This package is fully compatible with serverless deployments (Vercel, Netlify, etc.):

```typescript
// Use MongoDB or external storage
// In-memory storage will not persist across function invocations
const storage = new MongoPipelineStorage(PipelineModel);
const manager = new PipelineManager({ storage });
```

## API Reference

### `createPipelineRouteHandler(options)`

Creates GET and POST handlers for Next.js App Router.

**Parameters:**
- `manager: PipelineManager` - Required. The pipeline manager instance.
- `storage: PipelineStorage` - Required. Storage for job details and list operations.
- `pipeline: PipelineConfig` - Required. Pipeline config for this route.

**Returns:**
```typescript
{
  GET: (request: NextRequest) => Promise<Response>,
  POST: (request: NextRequest) => Promise<Response>
}
```

### Multiple Pipelines

Create separate routes for each pipeline:

```
app/
  api/
    pipeline/
      my-pipeline/
        route.ts    → handles /api/pipeline/my-pipeline
      another/
        route.ts    → handles /api/pipeline/another
```

Each route exports handlers for its specific pipeline.

### Individual Handlers

You can also use individual handlers for custom routing:

```typescript
import {
  handleStartPipeline,
  handleGetStatus,
  handleGetResult,
  handleGetJob,
  handleGetPipeline,
  handleGetList,
} from 'neuroline-nextjs';
```

## License

UNLICENSED

---

# neuroline-nextjs

[![Demo](https://img.shields.io/badge/Demo-neuroline.vercel.app-blue)](https://neuroline.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-sergeychernov/neuroline-black)](https://github.com/sergeychernov/neuroline)

Интеграция с Next.js App Router для Neuroline - предоставляет обработчики маршрутов для API.

## Установка

```bash
yarn add neuroline neuroline-nextjs
```

## Возможности

- **Поддержка App Router** - нативная интеграция с Next.js 14+ App Router
- **Типобезопасные обработчики** - полная поддержка TypeScript с NextRequest/Response
- **Один route = один pipeline** - каждый маршрут обрабатывает ровно один тип pipeline
- **API деталей job** - получение input, options и артефактов для отдельных jobs
- **Stateless дизайн** - работает с serverless деплоями

## Быстрый старт

### 1. Создайте Pipeline Manager

```typescript
// lib/neuroline.ts
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';

const storage = new InMemoryPipelineStorage();
export const manager = new PipelineManager({ storage });
export { storage };
```

### 2. Создайте обработчик API маршрута

Создайте отдельный маршрут для каждого pipeline. Например `app/api/pipeline/my-pipeline/route.ts`:

```typescript
import { createPipelineRouteHandler } from 'neuroline-nextjs';
import { manager, storage } from '@/lib/neuroline';
import { myPipelineConfig } from '@/pipelines';

const handlers = createPipelineRouteHandler({
    manager,
    storage,
    pipeline: myPipelineConfig, // Один pipeline на route
});

export const GET = handlers.GET;
export const POST = handlers.POST;
```

Готово! Ваш pipeline API доступен по адресу `/api/pipeline/my-pipeline`.

## API Эндпоинты

Каждый route обрабатывает один pipeline. URL определяет какой pipeline использовать.

### POST `/api/pipeline/my-pipeline`

Запустить новый pipeline или вернуть существующий.

**Тело запроса:**
```typescript
{
  input: unknown;        // Входные данные
  jobOptions?: Record<string, unknown>;  // Опционально: опции для jobs
}
```

**Пример:**
```typescript
const response = await fetch('/api/pipeline/my-pipeline', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: {
      url: 'https://api.example.com/data',
      userId: 'user-123',
    },
    jobOptions: {
      'fetch-data': { timeout: 10000 },
    },
  }),
});

const result = await response.json();
// { success: true, data: { pipelineId: "abc123", isNew: true } }
```

### GET `/api/pipeline/my-pipeline?action=status&id=:id`

Получить текущий статус pipeline.

**Пример:**
```typescript
const response = await fetch('/api/pipeline/my-pipeline?action=status&id=abc123');
const { data } = await response.json();
// { status: "processing", currentJobIndex: 1, totalJobs: 4, stages: [...] }
```

### GET `/api/pipeline/my-pipeline?action=result&id=:id[&jobName=:name]`

Получить результат (артефакт) job. Если `jobName` не передан, возвращается результат последней job.

**Пример:**
```typescript
// Результат последней job
const response = await fetch('/api/pipeline/my-pipeline?action=result&id=abc123');
const { data } = await response.json();
// { pipelineId: "abc123", jobName: "save-result", status: "done", artifact: {...} }

// Результат по имени job
const response2 = await fetch('/api/pipeline/my-pipeline?action=result&id=abc123&jobName=fetch-data');
const { data: jobResult } = await response2.json();
// { pipelineId: "abc123", jobName: "fetch-data", status: "done", artifact: {...} }
```

### Debug-эндпоинты

Следующие эндпоинты возвращают чувствительные данные (input, options, artifacts) и **отключены по умолчанию**. Для включения установите `enableDebugEndpoints: true`.

⚠️ **ВНИМАНИЕ**: Не включайте в production без надлежащей аутентификации/авторизации!

#### GET `/api/pipeline/my-pipeline?action=job&id=:id&jobName=:name`

Получить детальные данные job включая input и options.

**Пример:**
```typescript
const response = await fetch('/api/pipeline/my-pipeline?action=job&id=abc123&jobName=fetch-data');
const { data } = await response.json();
// { name: "fetch-data", status: "done", input: {...}, options: {...}, artifact: {...} }
```

#### GET `/api/pipeline/my-pipeline?action=pipeline&id=:id`

Получить полное состояние pipeline.

**Пример:**
```typescript
const response = await fetch('/api/pipeline/my-pipeline?action=pipeline&id=abc123');
const { data } = await response.json();
// Полный объект PipelineState
```

### GET `/api/pipeline/my-pipeline?action=list`

Получить пагинированный список pipelines этого типа.

**Query-параметры:**
- `page` - Номер страницы (по умолчанию: 1)
- `limit` - Элементов на странице (по умолчанию: 10, макс: 100)

**Пример:**
```typescript
const response = await fetch('/api/pipeline/my-pipeline?action=list&page=1&limit=10');
const { data } = await response.json();
// { items: [...], total: 50, page: 1, limit: 10, totalPages: 5 }
```

## С MongoDB хранилищем

Для продакшена используйте MongoDB:

```typescript
// lib/neuroline.ts
import mongoose from 'mongoose';
import { PipelineManager, MongoPipelineStorage, PipelineSchema } from 'neuroline';
import { myPipelineConfig } from './pipelines';

// Подключение к MongoDB
await mongoose.connect(process.env.MONGODB_URI!);

// Создание модели
const PipelineModel = mongoose.model('Pipeline', PipelineSchema);

// Создание manager
const storage = new MongoPipelineStorage(PipelineModel);
export const manager = new PipelineManager({ storage });

manager.registerPipeline(myPipelineConfig);
```

## Использование на клиенте

Используйте `neuroline/client` для клиентской интеграции. Один клиент на pipeline:

```typescript
'use client';

import { useMemo, useState, useCallback } from 'react';
import { PipelineClient } from 'neuroline/client';

export function PipelineDemo() {
  // URL клиента указывает на конкретный route pipeline
  const client = useMemo(() => new PipelineClient({ baseUrl: '/api/pipeline/my-pipeline' }), []);
  const [status, setStatus] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleStart = useCallback(async () => {
    setIsRunning(true);
    
    const { pipelineId, stop, completed } = await client.startAndPoll(
      {
        input: { url: 'https://api.example.com/data' },
      },
      (event) => setStatus(event.status),
      (error) => console.error(error),
    );

    await completed;
    setIsRunning(false);
  }, [client]);

  return (
    <div>
      <button onClick={handleStart} disabled={isRunning}>
        Запустить Pipeline
      </button>
      {status && (
        <div>
          Статус: {status.status}
          {status.currentJobName && ` - ${status.currentJobName}`}
        </div>
      )}
    </div>
  );
}
```

## Опции конфигурации

```typescript
createPipelineRouteHandler({
  manager: PipelineManager,     // Обязательно - экземпляр pipeline manager
  storage: PipelineStorage,     // Обязательно - хранилище для деталей job и списка
  pipeline: PipelineConfig,     // Обязательно - конфиг pipeline для этого route
  enableDebugEndpoints: false,  // Опционально - включить action=job и action=pipeline (по умолчанию: false)
});
```

### Включение debug-эндпоинтов

Для разработки или внутренних инструментов можно включить debug-эндпоинты:

```typescript
const handlers = createPipelineRouteHandler({
  manager,
  storage,
  pipeline: myPipeline,
  enableDebugEndpoints: process.env.NODE_ENV === 'development',
});
```

## Обработка ошибок

Обработчик автоматически возвращает соответствующие HTTP коды:

- `200` - Успех
- `400` - Неверный запрос (невалидные данные)
- `404` - Pipeline не найден
- `500` - Внутренняя ошибка сервера

Все ошибки возвращаются в JSON формате:

```json
{
  "error": "Сообщение об ошибке"
}
```

## Serverless деплой

Этот пакет полностью совместим с serverless деплоями (Vercel, Netlify и др.):

```typescript
// Используйте MongoDB или внешнее хранилище
// In-memory хранилище не сохраняется между вызовами функций
const storage = new MongoPipelineStorage(PipelineModel);
const manager = new PipelineManager({ storage });
```

## API Reference

### `createPipelineRouteHandler(options)`

Создаёт GET и POST обработчики для Next.js App Router.

**Параметры:**
- `manager: PipelineManager` - Обязательно. Экземпляр pipeline manager.
- `storage: PipelineStorage` - Обязательно. Хранилище для деталей job и операций списка.
- `pipeline: PipelineConfig` - Обязательно. Конфиг pipeline для этого route.

**Возвращает:**
```typescript
{
  GET: (request: NextRequest) => Promise<Response>,
  POST: (request: NextRequest) => Promise<Response>
}
```

### Несколько Pipelines

Создайте отдельные routes для каждого pipeline:

```
app/
  api/
    pipeline/
      my-pipeline/
        route.ts    → обрабатывает /api/pipeline/my-pipeline
      another/
        route.ts    → обрабатывает /api/pipeline/another
```

Каждый route экспортирует обработчики для своего конкретного pipeline.

### Отдельные обработчики

Вы также можете использовать отдельные обработчики для кастомной маршрутизации:

```typescript
import {
  handleStartPipeline,
  handleGetStatus,
  handleGetResult,
  handleGetJob,
  handleGetPipeline,
  handleGetList,
} from 'neuroline-nextjs';
```

## License

UNLICENSED

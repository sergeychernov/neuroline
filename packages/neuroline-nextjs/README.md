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
- **Single Endpoint Design** - all operations via query parameters
- **Job Details API** - get input, options, and artifacts for individual jobs
- **Stateless Design** - works with serverless deployments

## Quick Start

### 1. Create Pipeline Manager

```typescript
// lib/neuroline.ts
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';
import { myPipelineConfig } from './pipelines';

const storage = new InMemoryPipelineStorage();
export const manager = new PipelineManager({ storage });

// Register your pipelines
manager.registerPipeline(myPipelineConfig);
```

### 2. Create API Route Handler

Create a route at `app/api/pipeline/route.ts`:

```typescript
import { createPipelineRouteHandler } from 'neuroline-nextjs';
import { manager, storage } from '@/lib/neuroline';

const handlers = createPipelineRouteHandler({
    manager,
    storage,
    // Optional: register pipelines here
    pipelines: [myPipelineConfig, anotherPipelineConfig],
});

export const GET = handlers.GET;
export const POST = handlers.POST;
```

That's it! Your pipeline API is ready.

## API Endpoints

The handler provides a single endpoint with query parameters:

### POST `/api/pipeline`

Start a new pipeline or return existing one.

**Request body:**
```typescript
{
  pipelineType: string;  // Pipeline type name
  input: unknown;        // Input data
  jobOptions?: Record<string, unknown>;  // Optional job options
}
```

**Example:**
```typescript
const response = await fetch('/api/pipeline', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pipelineType: 'my-pipeline',
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

### GET `/api/pipeline?action=status&id=:id`

Get current pipeline status.

**Example:**
```typescript
const response = await fetch('/api/pipeline?action=status&id=abc123');
const { data } = await response.json();
// { status: "processing", currentJobIndex: 1, totalJobs: 4, stages: [...] }
```

### GET `/api/pipeline?action=result&id=:id`

Get pipeline results (artifacts).

**Example:**
```typescript
const response = await fetch('/api/pipeline?action=result&id=abc123');
const { data } = await response.json();
// { status: "done", artifacts: { "job-name": {...} }, jobNames: [...] }
```

### GET `/api/pipeline?action=job&id=:id&jobName=:name`

Get detailed job data including input and options.

**Example:**
```typescript
const response = await fetch('/api/pipeline?action=job&id=abc123&jobName=fetch-data');
const { data } = await response.json();
// { name: "fetch-data", status: "done", input: {...}, options: {...}, artifact: {...} }
```

### GET `/api/pipeline?action=pipeline&id=:id`

Get full pipeline state.

**Example:**
```typescript
const response = await fetch('/api/pipeline?action=pipeline&id=abc123');
const { data } = await response.json();
// Full PipelineState object
```

### GET `/api/pipeline?action=list`

Get paginated list of pipelines.

**Query parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `pipelineType` - Filter by pipeline type (optional)

**Example:**
```typescript
const response = await fetch('/api/pipeline?action=list&page=1&limit=10');
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

Use `neuroline/client` for client-side integration:

```typescript
'use client';

import { useMemo, useState, useCallback } from 'react';
import { PipelineClient } from 'neuroline/client';

export function PipelineDemo() {
  const client = useMemo(() => new PipelineClient({ baseUrl: '/api/pipeline' }), []);
  const [status, setStatus] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleStart = useCallback(async () => {
    setIsRunning(true);
    
    const { pipelineId, stop, completed } = await client.startAndPoll(
      {
        pipelineType: 'my-pipeline',
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
  manager: PipelineManager,        // Required - pipeline manager instance
  storage: PipelineStorage,        // Required - storage for job details and list
  pipelines?: PipelineConfig[],    // Optional - pipelines to register on init
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
- `pipelines?: PipelineConfig[]` - Optional. Pipelines to register on initialization.

**Returns:**
```typescript
{
  GET: (request: NextRequest) => Promise<Response>,
  POST: (request: NextRequest) => Promise<Response>
}
```

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
- **Единый эндпоинт** - все операции через query-параметры
- **API деталей job** - получение input, options и артефактов для отдельных jobs
- **Stateless дизайн** - работает с serverless деплоями

## Быстрый старт

### 1. Создайте Pipeline Manager

```typescript
// lib/neuroline.ts
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';
import { myPipelineConfig } from './pipelines';

const storage = new InMemoryPipelineStorage();
export const manager = new PipelineManager({ storage });

// Зарегистрируйте ваши pipelines
manager.registerPipeline(myPipelineConfig);
```

### 2. Создайте обработчик API маршрута

Создайте маршрут в `app/api/pipeline/route.ts`:

```typescript
import { createPipelineRouteHandler } from 'neuroline-nextjs';
import { manager, storage } from '@/lib/neuroline';

const handlers = createPipelineRouteHandler({
    manager,
    storage,
    // Опционально: регистрация pipelines
    pipelines: [myPipelineConfig, anotherPipelineConfig],
});

export const GET = handlers.GET;
export const POST = handlers.POST;
```

Готово! Ваш pipeline API готов к использованию.

## API Эндпоинты

Обработчик предоставляет единый эндпоинт с query-параметрами:

### POST `/api/pipeline`

Запустить новый pipeline или вернуть существующий.

**Тело запроса:**
```typescript
{
  pipelineType: string;  // Имя типа pipeline
  input: unknown;        // Входные данные
  jobOptions?: Record<string, unknown>;  // Опционально: опции для jobs
}
```

**Пример:**
```typescript
const response = await fetch('/api/pipeline', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pipelineType: 'my-pipeline',
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

### GET `/api/pipeline?action=status&id=:id`

Получить текущий статус pipeline.

**Пример:**
```typescript
const response = await fetch('/api/pipeline?action=status&id=abc123');
const { data } = await response.json();
// { status: "processing", currentJobIndex: 1, totalJobs: 4, stages: [...] }
```

### GET `/api/pipeline?action=result&id=:id`

Получить результаты pipeline (артефакты).

**Пример:**
```typescript
const response = await fetch('/api/pipeline?action=result&id=abc123');
const { data } = await response.json();
// { status: "done", artifacts: { "job-name": {...} }, jobNames: [...] }
```

### GET `/api/pipeline?action=job&id=:id&jobName=:name`

Получить детальные данные job включая input и options.

**Пример:**
```typescript
const response = await fetch('/api/pipeline?action=job&id=abc123&jobName=fetch-data');
const { data } = await response.json();
// { name: "fetch-data", status: "done", input: {...}, options: {...}, artifact: {...} }
```

### GET `/api/pipeline?action=pipeline&id=:id`

Получить полное состояние pipeline.

**Пример:**
```typescript
const response = await fetch('/api/pipeline?action=pipeline&id=abc123');
const { data } = await response.json();
// Полный объект PipelineState
```

### GET `/api/pipeline?action=list`

Получить пагинированный список pipelines.

**Query-параметры:**
- `page` - Номер страницы (по умолчанию: 1)
- `limit` - Элементов на странице (по умолчанию: 10, макс: 100)
- `pipelineType` - Фильтр по типу pipeline (опционально)

**Пример:**
```typescript
const response = await fetch('/api/pipeline?action=list&page=1&limit=10');
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

Используйте `neuroline/client` для клиентской интеграции:

```typescript
'use client';

import { useMemo, useState, useCallback } from 'react';
import { PipelineClient } from 'neuroline/client';

export function PipelineDemo() {
  const client = useMemo(() => new PipelineClient({ baseUrl: '/api/pipeline' }), []);
  const [status, setStatus] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleStart = useCallback(async () => {
    setIsRunning(true);
    
    const { pipelineId, stop, completed } = await client.startAndPoll(
      {
        pipelineType: 'my-pipeline',
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
  manager: PipelineManager,        // Обязательно - экземпляр pipeline manager
  storage: PipelineStorage,        // Обязательно - хранилище для деталей job и списка
  pipelines?: PipelineConfig[],    // Опционально - pipelines для регистрации при инициализации
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
- `pipelines?: PipelineConfig[]` - Опционально. Pipelines для регистрации при инициализации.

**Возвращает:**
```typescript
{
  GET: (request: NextRequest) => Promise<Response>,
  POST: (request: NextRequest) => Promise<Response>
}
```

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

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
- **Type-Safe Handlers** - full TypeScript support with NextRequest/NextResponse
- **Automatic Routing** - catch-all route handler for all pipeline operations
- **Stateless Design** - no server-side state, works with serverless deployments

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

Create a catch-all route at `app/api/pipeline/[...path]/route.ts`:

```typescript
import { createPipelineHandlers } from 'neuroline-nextjs';
import { manager } from '@/lib/neuroline';

const handlers = createPipelineHandlers({
    manager,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
```

That's it! Your pipeline API is ready.

## API Endpoints

The handler provides the following endpoints:

### POST `/api/pipeline/:type/start`

Start a new pipeline or return existing one.

**Example:**
```typescript
const response = await fetch('/api/pipeline/my-pipeline/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: {
      url: 'https://api.example.com/data',
      userId: 'user-123',
    },
    jobOptions: {
      'fetch-data': { timeout: 10000 },
    },
  }),
});

const result = await response.json();
// { pipelineId: "abc123", isNew: true }
```

### GET `/api/pipeline/:id/status`

Get current pipeline status.

**Example:**
```typescript
const response = await fetch('/api/pipeline/abc123/status');
const status = await response.json();
// { status: "processing", currentJobIndex: 1, totalJobs: 4, ... }
```

### GET `/api/pipeline/:id/result`

Get pipeline results (artifacts).

**Example:**
```typescript
const response = await fetch('/api/pipeline/abc123/result');
const result = await response.json();
// { status: "done", artifacts: [...], jobNames: [...] }
```

### GET `/api/pipeline/:id`

Get full pipeline state.

**Example:**
```typescript
const response = await fetch('/api/pipeline/abc123');
const pipeline = await response.json();
// Full PipelineState object
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

### React Hook Example

```typescript
'use client';

import { useState, useEffect } from 'react';

export function usePipeline(pipelineId: string | null) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pipelineId) return;

    const pollStatus = async () => {
      const response = await fetch(`/api/pipeline/${pipelineId}/status`);
      const data = await response.json();
      setStatus(data);

      if (data.status === 'processing') {
        setTimeout(pollStatus, 1000);
      }
    };

    pollStatus();
  }, [pipelineId]);

  const startPipeline = async (type: string, input: any) => {
    setLoading(true);
    const response = await fetch(`/api/pipeline/${type}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: input }),
    });
    const data = await response.json();
    setLoading(false);
    return data.pipelineId;
  };

  return { status, loading, startPipeline };
}
```

### Component Example

```typescript
'use client';

import { usePipeline } from './usePipeline';

export function PipelineDemo() {
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const { status, loading, startPipeline } = usePipeline(pipelineId);

  const handleStart = async () => {
    const id = await startPipeline('my-pipeline', {
      url: 'https://api.example.com/data',
    });
    setPipelineId(id);
  };

  return (
    <div>
      <button onClick={handleStart} disabled={loading}>
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
createPipelineHandlers({
  manager: PipelineManager,        // Required
  storage?: PipelineStorage,       // Optional - for list operations
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

### `createPipelineHandlers(options)`

Creates GET and POST handlers for Next.js App Router.

**Parameters:**
- `manager: PipelineManager` - Required. The pipeline manager instance.
- `storage?: PipelineStorage` - Optional. Storage for list operations.

**Returns:**
```typescript
{
  GET: (request: NextRequest) => Promise<NextResponse>,
  POST: (request: NextRequest) => Promise<NextResponse>
}
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
- **Типобезопасные обработчики** - полная поддержка TypeScript с NextRequest/NextResponse
- **Автоматическая маршрутизация** - catch-all обработчик для всех операций с пайплайнами
- **Stateless дизайн** - без серверного состояния, работает с serverless деплоями

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

Создайте catch-all маршрут в `app/api/pipeline/[...path]/route.ts`:

```typescript
import { createPipelineHandlers } from 'neuroline-nextjs';
import { manager } from '@/lib/neuroline';

const handlers = createPipelineHandlers({
    manager,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
```

Готово! Ваш pipeline API готов к использованию.

## API Эндпоинты

Обработчик предоставляет следующие эндпоинты:

### POST `/api/pipeline/:type/start`

Запустить новый pipeline или вернуть существующий.

**Пример:**
```typescript
const response = await fetch('/api/pipeline/my-pipeline/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: {
      url: 'https://api.example.com/data',
      userId: 'user-123',
    },
    jobOptions: {
      'fetch-data': { timeout: 10000 },
    },
  }),
});

const result = await response.json();
// { pipelineId: "abc123", isNew: true }
```

### GET `/api/pipeline/:id/status`

Получить текущий статус pipeline.

**Пример:**
```typescript
const response = await fetch('/api/pipeline/abc123/status');
const status = await response.json();
// { status: "processing", currentJobIndex: 1, totalJobs: 4, ... }
```

### GET `/api/pipeline/:id/result`

Получить результаты pipeline (артефакты).

**Пример:**
```typescript
const response = await fetch('/api/pipeline/abc123/result');
const result = await response.json();
// { status: "done", artifacts: [...], jobNames: [...] }
```

### GET `/api/pipeline/:id`

Получить полное состояние pipeline.

**Пример:**
```typescript
const response = await fetch('/api/pipeline/abc123');
const pipeline = await response.json();
// Полный объект PipelineState
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

### Пример React хука

```typescript
'use client';

import { useState, useEffect } from 'react';

export function usePipeline(pipelineId: string | null) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pipelineId) return;

    const pollStatus = async () => {
      const response = await fetch(`/api/pipeline/${pipelineId}/status`);
      const data = await response.json();
      setStatus(data);

      if (data.status === 'processing') {
        setTimeout(pollStatus, 1000);
      }
    };

    pollStatus();
  }, [pipelineId]);

  const startPipeline = async (type: string, input: any) => {
    setLoading(true);
    const response = await fetch(`/api/pipeline/${type}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: input }),
    });
    const data = await response.json();
    setLoading(false);
    return data.pipelineId;
  };

  return { status, loading, startPipeline };
}
```

### Пример компонента

```typescript
'use client';

import { usePipeline } from './usePipeline';

export function PipelineDemo() {
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const { status, loading, startPipeline } = usePipeline(pipelineId);

  const handleStart = async () => {
    const id = await startPipeline('my-pipeline', {
      url: 'https://api.example.com/data',
    });
    setPipelineId(id);
  };

  return (
    <div>
      <button onClick={handleStart} disabled={loading}>
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
createPipelineHandlers({
  manager: PipelineManager,        // Обязательно
  storage?: PipelineStorage,       // Опционально - для операций списка
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

### `createPipelineHandlers(options)`

Создаёт GET и POST обработчики для Next.js App Router.

**Параметры:**
- `manager: PipelineManager` - Обязательно. Экземпляр pipeline manager.
- `storage?: PipelineStorage` - Опционально. Хранилище для операций списка.

**Возвращает:**
```typescript
{
  GET: (request: NextRequest) => Promise<NextResponse>,
  POST: (request: NextRequest) => Promise<NextResponse>
}
```

## License

UNLICENSED

# Neuroline Monorepo

[![Demo](https://img.shields.io/badge/Demo-neuroline.vercel.app-blue)](https://neuroline.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-sergeychernov/neuroline-black)](https://github.com/sergeychernov/neuroline)

Мультипакетный репозиторий для оркестрации и визуализации pipeline.

## 📦 Пакеты

| Пакет | Описание |
|-------|----------|
| `neuroline` | Фреймворк-агностик библиотека для оркестрации pipeline |
| `neuroline-ui` | React компоненты для визуализации pipeline |
| `neuroline-nextjs` | Хелперы для Next.js App Router |
| `neuroline-nestjs` | Модуль и контроллер для NestJS |

## 🚀 Приложения

| Приложение | Описание |
|------------|----------|
| `@neuroline/nextjs` | Демо Next.js с визуализацией |
| `@neuroline/nestjs-example` | Пример бекенда на NestJS |

## 🧠 Концепция

Pipeline — это последовательность **stages**, каждый из которых содержит одну или несколько **jobs**.
Jobs внутри stage выполняются параллельно, а stages — последовательно.

Каждая Job похожа на **нейрон**:
- Принимает входные данные (от предыдущих jobs или input pipeline)
- Обрабатывает их (execute функция)
- Возвращает результат (артефакт) для следующих jobs

```
Pipeline
├── Stage 1: [fetch-data]              ← последовательно
├── Stage 2: [validate, notify-start]  ← параллельно
├── Stage 3: [transform-data]          ← последовательно
├── Stage 4: [save-to-db, update-cache]← параллельно
└── Stage 5: [notify-complete]         ← последовательно
```

## 🚀 Быстрый старт

```bash
# Установка зависимостей
yarn install

# Сборка всех пакетов
yarn build:packages

# Запуск Next.js демо (порт 3000)
yarn dev

# Запуск NestJS бекенда (порт 3003)
yarn dev:nestjs

# Запуск Storybook (порт 6006)
yarn storybook
```

## 📡 API Endpoints

Оба хелпера (`neuroline-nextjs` и `neuroline-nestjs`) предоставляют одинаковый API:

### POST /pipeline - Запуск pipeline

```bash
curl -X POST http://localhost:3003/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "pipelineType": "demo-pipeline",
    "input": { "url": "https://api.example.com/data" }
  }'
```

### GET /pipeline/status?id=xxx - Статус

```bash
curl "http://localhost:3003/pipeline/status?id=abc123"
```

### GET /pipeline/result?id=xxx - Результаты

```bash
curl "http://localhost:3003/pipeline/result?id=abc123"
```

### GET /pipeline/list?page=1&limit=10 - Список с пагинацией

```bash
curl "http://localhost:3003/pipeline/list?page=1&limit=10"
```

## 🔧 Использование

### Next.js (App Router)

```typescript
// app/api/pipeline/route.ts
import { createPipelineRouteHandler } from 'neuroline-nextjs';
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';
import { myPipeline } from '@/pipelines';

const storage = new InMemoryPipelineStorage();
const manager = new PipelineManager({ storage });

const handlers = createPipelineRouteHandler({
  manager,
  storage,
  pipelines: [myPipeline],
});

// GET /api/pipeline?action=status&id=xxx
// GET /api/pipeline?action=result&id=xxx
// GET /api/pipeline?action=list&page=1&limit=10
export const GET = handlers.GET;

// POST /api/pipeline
export const POST = handlers.POST;
```

### NestJS

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';
import { NeurolineModule } from 'neuroline-nestjs';
import { myPipeline } from './pipelines';

const storage = new InMemoryPipelineStorage();
const manager = new PipelineManager({ storage });

@Module({
  imports: [
    NeurolineModule.register({
      manager,
      storage,
      pipelines: [myPipeline],
    }),
  ],
})
export class AppModule {}
```

Endpoints доступны автоматически:
- `POST /pipeline` - запуск
- `GET /pipeline/status?id=xxx` - статус
- `GET /pipeline/result?id=xxx` - результаты
- `GET /pipeline/list?page=1&limit=10` - список

### NestJS с MongoDB

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { PipelineManager, MongoPipelineStorage, PipelineSchema } from 'neuroline';
import { NeurolineModule } from 'neuroline-nestjs';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/neuroline'),
    MongooseModule.forFeature([{ name: 'Pipeline', schema: PipelineSchema }]),
    NeurolineModule.registerAsync({
      imports: [MongooseModule],
      useFactory: (pipelineModel) => {
        const storage = new MongoPipelineStorage(pipelineModel);
        const manager = new PipelineManager({ storage });
        return { manager, storage, pipelines: [myPipeline] };
      },
      inject: [getModelToken('Pipeline')],
    }),
  ],
})
export class AppModule {}
```

## 📁 Структура

```
neuroline/
├── packages/
│   ├── neuroline/           # Основная библиотека
│   │   ├── src/
│   │   │   ├── manager.ts   # PipelineManager
│   │   │   ├── storage.ts   # InMemoryStorage
│   │   │   ├── mongo-storage.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── neuroline-ui/        # UI компоненты
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── PipelineViewer.tsx
│   │   │   │   ├── JobNode.tsx
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── neuroline-nextjs/    # Next.js хелперы
│   │   ├── src/
│   │   │   ├── handlers.ts
│   │   │   ├── route-handler.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── neuroline-nestjs/    # NestJS модуль
│       ├── src/
│       │   ├── neuroline.module.ts
│       │   ├── neuroline.controller.ts
│       │   ├── neuroline.service.ts
│       │   └── index.ts
│       └── package.json
│
├── apps/
│   ├── nextjs/              # Next.js демо
│   │   └── src/app/
│   │
│   └── nestjs/              # NestJS пример
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   └── pipelines/
│       └── package.json
│
├── package.json
└── README.md
```

## 🚢 Деплой

### Vercel (Next.js)

Репозиторий настроен для автоматического деплоя на Vercel при пуше в `main`.

### Docker (NestJS)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN yarn install && yarn build:packages
WORKDIR /app/apps/nestjs
RUN yarn build
CMD ["yarn", "start:prod"]
```

## 📚 Документация

- [neuroline](packages/neuroline/README.md) - Pipeline Manager
- [neuroline-nestjs](apps/nestjs/README.md) - NestJS Example

## 📝 Лицензия

UNLICENSED

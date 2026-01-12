# NestJS Neuroline Example

Пример бекенд-приложения на NestJS с использованием `neuroline` и `neuroline-nestjs`.

## Запуск

```bash
# Из корня монорепозитория
yarn workspace @neuroline/nestjs-example dev

# Или напрямую
cd apps/nestjs
yarn dev
```

Сервер запустится на `http://localhost:3003`

## API Endpoints

### POST /pipeline - Запуск pipeline

```bash
curl -X POST http://localhost:3003/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "pipelineType": "demo-pipeline",
    "input": { "url": "https://api.example.com/data" }
  }'
```

Ответ:
```json
{
  "success": true,
  "data": {
    "pipelineId": "abc123",
    "isNew": true
  }
}
```

### GET /pipeline/status?id=xxx - Статус pipeline

```bash
curl "http://localhost:3003/pipeline/status?id=abc123"
```

Ответ:
```json
{
  "success": true,
  "data": {
    "pipelineId": "abc123",
    "pipelineType": "demo-pipeline",
    "status": "processing",
    "currentJobIndex": 1,
    "totalJobs": 4,
    "currentJobName": "validate",
    "stages": [
      { "jobs": [{ "name": "fetch-data", "status": "done" }] },
      { "jobs": [{ "name": "validate", "status": "processing" }] },
      { "jobs": [{ "name": "process", "status": "pending" }] },
      { "jobs": [{ "name": "save", "status": "pending" }] }
    ]
  }
}
```

### GET /pipeline/result?id=xxx - Результаты pipeline

```bash
curl "http://localhost:3003/pipeline/result?id=abc123"
```

Ответ:
```json
{
  "success": true,
  "data": {
    "status": "done",
    "artifacts": [
      { "data": "...", "fetchedAt": "2024-01-01T00:00:00Z" },
      { "valid": true, "length": 100 },
      { "processed": "..." },
      { "savedAt": "2024-01-01T00:00:01Z", "id": "record_123" }
    ],
    "jobNames": ["fetch-data", "validate", "process", "save"]
  }
}
```

### GET /pipeline/list - Список pipeline

```bash
curl "http://localhost:3003/pipeline/list?page=1&limit=10"
```

Ответ:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

## Доступные Pipeline

### demo-pipeline

Простой последовательный pipeline:
1. `fetch-data` - получение данных
2. `validate` - валидация
3. `process` - обработка
4. `save` - сохранение

```bash
curl -X POST http://localhost:3003/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "pipelineType": "demo-pipeline",
    "input": { "url": "https://api.example.com" }
  }'
```

### parallel-pipeline

Pipeline с параллельными jobs:
1. `fetch-data` - получение данных
2. `validate` + `notify` (параллельно)
3. `process` - обработка
4. `save` + `notify` (параллельно)

```bash
curl -X POST http://localhost:3003/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "pipelineType": "parallel-pipeline",
    "input": { "url": "https://api.example.com", "userId": "user-123" }
  }'
```

## Структура проекта

```
apps/nestjs/
├── src/
│   ├── main.ts           # Entry point
│   ├── app.module.ts     # Главный модуль
│   └── pipelines/
│       └── index.ts      # Конфигурации pipeline
├── nest-cli.json
├── package.json
└── tsconfig.json
```

## Использование с MongoDB

Для production рекомендуется использовать MongoDB:

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
        return { manager, storage, pipelines: [demoPipeline] };
      },
      inject: [getModelToken('Pipeline')],
    }),
  ],
})
export class AppModule {}
```


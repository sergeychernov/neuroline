[English](#neuroline-ui) | [Русский](#neuroline-ui-1)

# neuroline-ui

React components for visualizing Neuroline pipelines with Material-UI.

## Installation

```bash
yarn add neuroline-ui @mui/material @emotion/react @emotion/styled
```

**Note:** This package has peer dependencies on React, MUI, and Emotion.

## Features

- **PipelineViewer** - visual representation of pipeline execution flow
- **JobNode** - individual job status display with timing information
- **StageColumn** - stage grouping with parallel job visualization
- **StatusBadge** - color-coded status indicators
- **TypeScript Support** - full type safety
- **Storybook** - interactive component documentation

## Quick Start

```typescript
'use client';

import { PipelineViewer } from 'neuroline-ui';
import { useEffect, useState } from 'react';

export function PipelineDemo() {
  const [status, setStatus] = useState(null);
  const [pipelineId, setPipelineId] = useState<string | null>(null);

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

  const handleStart = async () => {
    const response = await fetch('/api/pipeline/my-pipeline/start', {
      method: 'POST',
      body: JSON.stringify({ data: { url: 'https://example.com' } }),
    });
    const result = await response.json();
    setPipelineId(result.pipelineId);
  };

  return (
    <div>
      <button onClick={handleStart}>Start Pipeline</button>
      {status && <PipelineViewer status={status} showTiming />}
    </div>
  );
}
```

## Components

### PipelineViewer

Main component for visualizing pipeline execution.

```typescript
import { PipelineViewer } from 'neuroline-ui';

<PipelineViewer
  status={{
    status: 'processing',
    currentJobIndex: 2,
    totalJobs: 5,
    stages: [
      {
        jobs: [
          {
            name: 'fetch-data',
            status: 'done',
            startedAt: '2024-01-01T00:00:00Z',
            finishedAt: '2024-01-01T00:00:02Z',
          },
        ],
      },
      {
        jobs: [
          {
            name: 'process-data',
            status: 'processing',
            startedAt: '2024-01-01T00:00:02Z',
          },
          {
            name: 'notify',
            status: 'processing',
            startedAt: '2024-01-01T00:00:02Z',
          },
        ],
      },
    ],
  }}
  showTiming={true}
  onJobClick={(payload) => console.log('Job clicked:', payload)}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `ExtendedPipelineStatus` | Required | Pipeline status with stages |
| `showTiming` | `boolean` | `false` | Show execution timing for jobs |
| `onJobClick` | `(payload: JobClickPayload) => void` | - | Click handler for job nodes |

### JobNode

Individual job display component.

```typescript
import { JobNode } from 'neuroline-ui';

<JobNode
  name="fetch-data"
  status="done"
  startedAt="2024-01-01T00:00:00Z"
  finishedAt="2024-01-01T00:00:02Z"
  showTiming={true}
  onClick={() => console.log('Clicked')}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | Required | Job name |
| `status` | `'pending' \| 'processing' \| 'done' \| 'error'` | Required | Job status |
| `startedAt` | `string` | - | ISO date string |
| `finishedAt` | `string` | - | ISO date string |
| `error` | `{ message: string }` | - | Error information |
| `showTiming` | `boolean` | `false` | Show timing info |
| `onClick` | `() => void` | - | Click handler |

### StageColumn

Stage grouping component for parallel jobs.

```typescript
import { StageColumn } from 'neuroline-ui';

<StageColumn
  stageIndex={1}
  jobs={[
    { name: 'job1', status: 'done' },
    { name: 'job2', status: 'done' },
  ]}
  showTiming={true}
  onJobClick={(payload) => console.log(payload)}
/>
```

### StatusBadge

Status indicator with color coding.

```typescript
import { StatusBadge } from 'neuroline-ui';

<StatusBadge status="processing" />
```

**Status colors:**
- `pending` - Gray
- `processing` - Blue (animated)
- `done` - Green
- `error` - Red

## Types

```typescript
import type {
  ExtendedPipelineStatus,
  JobInStage,
  StageStatus,
  JobClickPayload,
} from 'neuroline-ui';
```

### ExtendedPipelineStatus

```typescript
interface ExtendedPipelineStatus {
  status: 'processing' | 'done' | 'error';
  currentJobIndex?: number;
  totalJobs?: number;
  currentJobName?: string;
  stages: StageStatus[];
  error?: { message: string; jobName?: string };
}
```

### JobInStage

```typescript
interface JobInStage {
  name: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  startedAt?: string;
  finishedAt?: string;
  error?: { message: string; stack?: string };
}
```

### JobClickPayload

```typescript
interface JobClickPayload {
  jobName: string;
  status: string;
  stageIndex: number;
  timing?: {
    startedAt?: string;
    finishedAt?: string;
    duration?: number;
  };
}
```

## Styling

All components use MUI's `sx` prop and support theme customization.

### Custom Theme

```typescript
import { ThemeProvider, createTheme } from '@mui/material';
import { PipelineViewer } from 'neuroline-ui';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    success: { main: '#2e7d32' },
    error: { main: '#d32f2f' },
  },
});

<ThemeProvider theme={theme}>
  <PipelineViewer status={status} />
</ThemeProvider>
```

## Storybook

Run Storybook for interactive component documentation:

```bash
yarn workspace neuroline-ui storybook
```

This will start Storybook on `http://localhost:6006` with live examples of all components.

## Integration Examples

### With Next.js App Router

```typescript
'use client';

import { PipelineViewer } from 'neuroline-ui';
import { Box, Container, Typography } from '@mui/material';

export default function PipelinePage({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const pollStatus = async () => {
      const res = await fetch(`/api/pipeline/${params.id}/status`);
      const data = await res.json();
      setStatus(data);

      if (data.status === 'processing') {
        setTimeout(pollStatus, 1000);
      }
    };

    pollStatus();
  }, [params.id]);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Pipeline: {params.id}
      </Typography>
      {status && (
        <PipelineViewer
          status={status}
          showTiming
          onJobClick={(payload) => {
            console.log('Job clicked:', payload);
          }}
        />
      )}
    </Container>
  );
}
```

### With NestJS Backend

```typescript
'use client';

import { PipelineViewer } from 'neuroline-ui';
import { useState } from 'react';

export function PipelineMonitor() {
  const [pipelineId, setPipelineId] = useState('');
  const [status, setStatus] = useState(null);

  const loadStatus = async () => {
    const res = await fetch(`http://localhost:3000/pipeline/${pipelineId}/status`);
    const data = await res.json();
    setStatus(data);
  };

  return (
    <div>
      <input
        value={pipelineId}
        onChange={(e) => setPipelineId(e.target.value)}
        placeholder="Pipeline ID"
      />
      <button onClick={loadStatus}>Load Status</button>
      {status && <PipelineViewer status={status} showTiming />}
    </div>
  );
}
```

## Development

Build the package:

```bash
yarn workspace neuroline-ui build
```

Watch mode:

```bash
yarn workspace neuroline-ui dev
```

## License

UNLICENSED

---

# neuroline-ui

React компоненты для визуализации Neuroline пайплайнов с Material-UI.

## Установка

```bash
yarn add neuroline-ui @mui/material @emotion/react @emotion/styled
```

**Примечание:** Этот пакет имеет peer-зависимости от React, MUI и Emotion.

## Возможности

- **PipelineViewer** - визуальное представление процесса выполнения pipeline
- **JobNode** - отображение статуса отдельной job с информацией о времени
- **StageColumn** - группировка stage с визуализацией параллельных jobs
- **StatusBadge** - цветные индикаторы статуса
- **TypeScript поддержка** - полная типобезопасность
- **Storybook** - интерактивная документация компонентов

## Быстрый старт

```typescript
'use client';

import { PipelineViewer } from 'neuroline-ui';
import { useEffect, useState } from 'react';

export function PipelineDemo() {
  const [status, setStatus] = useState(null);
  const [pipelineId, setPipelineId] = useState<string | null>(null);

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

  const handleStart = async () => {
    const response = await fetch('/api/pipeline/my-pipeline/start', {
      method: 'POST',
      body: JSON.stringify({ data: { url: 'https://example.com' } }),
    });
    const result = await response.json();
    setPipelineId(result.pipelineId);
  };

  return (
    <div>
      <button onClick={handleStart}>Запустить Pipeline</button>
      {status && <PipelineViewer status={status} showTiming />}
    </div>
  );
}
```

## Компоненты

### PipelineViewer

Основной компонент для визуализации выполнения pipeline.

```typescript
import { PipelineViewer } from 'neuroline-ui';

<PipelineViewer
  status={{
    status: 'processing',
    currentJobIndex: 2,
    totalJobs: 5,
    stages: [
      {
        jobs: [
          {
            name: 'fetch-data',
            status: 'done',
            startedAt: '2024-01-01T00:00:00Z',
            finishedAt: '2024-01-01T00:00:02Z',
          },
        ],
      },
      {
        jobs: [
          {
            name: 'process-data',
            status: 'processing',
            startedAt: '2024-01-01T00:00:02Z',
          },
          {
            name: 'notify',
            status: 'processing',
            startedAt: '2024-01-01T00:00:02Z',
          },
        ],
      },
    ],
  }}
  showTiming={true}
  onJobClick={(payload) => console.log('Job clicked:', payload)}
/>
```

**Пропсы:**

| Проп | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `status` | `ExtendedPipelineStatus` | Обязательно | Статус pipeline со stages |
| `showTiming` | `boolean` | `false` | Показывать время выполнения jobs |
| `onJobClick` | `(payload: JobClickPayload) => void` | - | Обработчик клика по job |

### JobNode

Компонент отображения отдельной job.

```typescript
import { JobNode } from 'neuroline-ui';

<JobNode
  name="fetch-data"
  status="done"
  startedAt="2024-01-01T00:00:00Z"
  finishedAt="2024-01-01T00:00:02Z"
  showTiming={true}
  onClick={() => console.log('Clicked')}
/>
```

**Пропсы:**

| Проп | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `name` | `string` | Обязательно | Имя job |
| `status` | `'pending' \| 'processing' \| 'done' \| 'error'` | Обязательно | Статус job |
| `startedAt` | `string` | - | ISO строка даты |
| `finishedAt` | `string` | - | ISO строка даты |
| `error` | `{ message: string }` | - | Информация об ошибке |
| `showTiming` | `boolean` | `false` | Показывать время |
| `onClick` | `() => void` | - | Обработчик клика |

### StageColumn

Компонент группировки stage для параллельных jobs.

```typescript
import { StageColumn } from 'neuroline-ui';

<StageColumn
  stageIndex={1}
  jobs={[
    { name: 'job1', status: 'done' },
    { name: 'job2', status: 'done' },
  ]}
  showTiming={true}
  onJobClick={(payload) => console.log(payload)}
/>
```

### StatusBadge

Индикатор статуса с цветовым кодированием.

```typescript
import { StatusBadge } from 'neuroline-ui';

<StatusBadge status="processing" />
```

**Цвета статусов:**
- `pending` - Серый
- `processing` - Синий (анимированный)
- `done` - Зелёный
- `error` - Красный

## Типы

```typescript
import type {
  ExtendedPipelineStatus,
  JobInStage,
  StageStatus,
  JobClickPayload,
} from 'neuroline-ui';
```

### ExtendedPipelineStatus

```typescript
interface ExtendedPipelineStatus {
  status: 'processing' | 'done' | 'error';
  currentJobIndex?: number;
  totalJobs?: number;
  currentJobName?: string;
  stages: StageStatus[];
  error?: { message: string; jobName?: string };
}
```

### JobInStage

```typescript
interface JobInStage {
  name: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  startedAt?: string;
  finishedAt?: string;
  error?: { message: string; stack?: string };
}
```

### JobClickPayload

```typescript
interface JobClickPayload {
  jobName: string;
  status: string;
  stageIndex: number;
  timing?: {
    startedAt?: string;
    finishedAt?: string;
    duration?: number;
  };
}
```

## Стилизация

Все компоненты используют `sx` проп MUI и поддерживают кастомизацию темы.

### Кастомная тема

```typescript
import { ThemeProvider, createTheme } from '@mui/material';
import { PipelineViewer } from 'neuroline-ui';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    success: { main: '#2e7d32' },
    error: { main: '#d32f2f' },
  },
});

<ThemeProvider theme={theme}>
  <PipelineViewer status={status} />
</ThemeProvider>
```

## Storybook

Запустите Storybook для интерактивной документации:

```bash
yarn workspace neuroline-ui storybook
```

Это запустит Storybook на `http://localhost:6006` с живыми примерами всех компонентов.

## Примеры интеграции

### С Next.js App Router

```typescript
'use client';

import { PipelineViewer } from 'neuroline-ui';
import { Box, Container, Typography } from '@mui/material';

export default function PipelinePage({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const pollStatus = async () => {
      const res = await fetch(`/api/pipeline/${params.id}/status`);
      const data = await res.json();
      setStatus(data);

      if (data.status === 'processing') {
        setTimeout(pollStatus, 1000);
      }
    };

    pollStatus();
  }, [params.id]);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Pipeline: {params.id}
      </Typography>
      {status && (
        <PipelineViewer
          status={status}
          showTiming
          onJobClick={(payload) => {
            console.log('Job clicked:', payload);
          }}
        />
      )}
    </Container>
  );
}
```

### С NestJS бэкендом

```typescript
'use client';

import { PipelineViewer } from 'neuroline-ui';
import { useState } from 'react';

export function PipelineMonitor() {
  const [pipelineId, setPipelineId] = useState('');
  const [status, setStatus] = useState(null);

  const loadStatus = async () => {
    const res = await fetch(`http://localhost:3000/pipeline/${pipelineId}/status`);
    const data = await res.json();
    setStatus(data);
  };

  return (
    <div>
      <input
        value={pipelineId}
        onChange={(e) => setPipelineId(e.target.value)}
        placeholder="Pipeline ID"
      />
      <button onClick={loadStatus}>Загрузить статус</button>
      {status && <PipelineViewer status={status} showTiming />}
    </div>
  );
}
```

## Разработка

Сборка пакета:

```bash
yarn workspace neuroline-ui build
```

Режим watch:

```bash
yarn workspace neuroline-ui dev
```

## License

UNLICENSED

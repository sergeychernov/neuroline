[English](#neuroline-ui) | [Русский](#neuroline-ui-1)

# neuroline-ui

[![Demo](https://img.shields.io/badge/Demo-neuroline.vercel.app-blue)](https://neuroline.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-sergeychernov/neuroline-black)](https://github.com/sergeychernov/neuroline)

React components for visualizing Neuroline pipelines with Material-UI.

## Installation

```bash
yarn add neuroline-ui @mui/material @emotion/react @emotion/styled @mui/icons-material
```

**Note:** This package has peer dependencies on React, MUI, and Emotion.

## Features

- **PipelineViewer** - visual representation of pipeline execution flow
- **JobNode** - individual job status display with timing information
- **JobDetailsPanel** - detailed job information with tabs for artifact, input, options
- **StageColumn** - stage grouping with parallel job visualization
- **StatusBadge** - color-coded status indicators
- **ArtifactView** - job artifact display
- **InputView** - job input data display with edit button
- **OptionsView** - job options display with edit button
- **TypeScript Support** - full type safety
- **Storybook** - interactive component documentation

## Quick Start

```typescript
'use client';

import { PipelineViewer, JobDetailsPanel } from 'neuroline-ui';
import type { PipelineDisplayData, JobDisplayInfo } from 'neuroline-ui';
import { useEffect, useState, useCallback } from 'react';

export function PipelineDemo() {
  const [pipeline, setPipeline] = useState<PipelineDisplayData | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDisplayInfo | null>(null);

  useEffect(() => {
    // Fetch pipeline status
    fetch('/api/pipeline/status')
      .then(res => res.json())
      .then(setPipeline);
  }, []);

  const handleJobClick = useCallback((job: JobDisplayInfo) => {
    setSelectedJob(job);
  }, []);

  return (
    <div>
      {pipeline && (
        <PipelineViewer
          pipeline={pipeline}
          onJobClick={handleJobClick}
          selectedJobName={selectedJob?.name}
          showArtifacts
        />
      )}
      {selectedJob && (
        <JobDetailsPanel
          job={selectedJob}
          onInputEditClick={(job) => console.log('Edit input:', job)}
          onOptionsEditClick={(job) => console.log('Edit options:', job)}
        />
      )}
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
  pipeline={{
    pipelineId: 'pl_123',
    pipelineType: 'data-processing',
    status: 'processing',
    stages: [
      {
        index: 0,
        jobs: [
          {
            name: 'fetch-data',
            status: 'done',
            startedAt: new Date('2024-01-01T00:00:00Z'),
            finishedAt: new Date('2024-01-01T00:00:02Z'),
            artifact: { size: 2048 },
          },
        ],
      },
      {
        index: 1,
        jobs: [
          {
            name: 'process-data',
            status: 'processing',
            startedAt: new Date('2024-01-01T00:00:02Z'),
            input: { records: 150 },
            options: { batchSize: 50 },
          },
        ],
      },
    ],
  }}
  showArtifacts={true}
  showInput={true}
  onJobClick={(job) => console.log('Job clicked:', job)}
  selectedJobName="fetch-data"
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pipeline` | `PipelineDisplayData` | Required | Pipeline data with stages |
| `showArtifacts` | `boolean` | `false` | Show artifacts in job nodes |
| `showInput` | `boolean` | `false` | Show pipeline input |
| `onJobClick` | `(job: JobDisplayInfo) => void` | - | Click handler for job nodes |
| `selectedJobName` | `string` | - | Name of currently selected job |

### JobDetailsPanel

Panel for displaying detailed job information with tabs.

```typescript
import { JobDetailsPanel } from 'neuroline-ui';

<JobDetailsPanel
  job={{
    name: 'process-data',
    status: 'done',
    startedAt: new Date(),
    finishedAt: new Date(),
    artifact: { processed: true, count: 150 },
    input: { records: 150, format: 'json' },
    options: { batchSize: 50, parallel: true },
  }}
  onInputEditClick={(job) => console.log('Edit input:', job)}
  onOptionsEditClick={(job) => console.log('Edit options:', job)}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `job` | `JobDisplayInfo` | Required | Job to display |
| `onInputEditClick` | `(job: JobDisplayInfo) => void` | - | Edit input callback |
| `onOptionsEditClick` | `(job: JobDisplayInfo) => void` | - | Edit options callback |

### JobNode

Individual job display component.

```typescript
import { JobNode } from 'neuroline-ui';

<JobNode
  job={{
    name: 'fetch-data',
    status: 'done',
    startedAt: new Date(),
    finishedAt: new Date(),
    artifact: { size: 2048 },
  }}
  isSelected={true}
  showArtifact={true}
  onClick={(job) => console.log('Clicked:', job)}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `job` | `JobDisplayInfo` | Required | Job data |
| `isSelected` | `boolean` | `false` | Highlight as selected |
| `showArtifact` | `boolean` | `false` | Show artifact preview |
| `onClick` | `(job: JobDisplayInfo) => void` | - | Click handler |

### StageColumn

Stage grouping component for parallel jobs.

```typescript
import { StageColumn } from 'neuroline-ui';

<StageColumn
  stage={{
    index: 1,
    jobs: [
      { name: 'job1', status: 'done' },
      { name: 'job2', status: 'done' },
    ],
  }}
  showArtifacts={true}
  selectedJobName="job1"
  onJobClick={(job) => console.log(job)}
/>
```

### StatusBadge

Status indicator with color coding.

```typescript
import { StatusBadge } from 'neuroline-ui';

<StatusBadge status="processing" size="small" />
```

**Status colors:**
- `pending` - Gray
- `processing` - Cyan (animated)
- `done` - Green
- `error` - Red

### ArtifactView

Display job artifact data.

```typescript
import { ArtifactView } from 'neuroline-ui';

<ArtifactView artifact={{ processed: true, count: 150 }} />
```

### InputView

Display job input data with optional edit button.

```typescript
import { InputView } from 'neuroline-ui';

<InputView
  input={{ records: 150, format: 'json' }}
  onEditClick={() => console.log('Edit input')}
/>
```

### OptionsView

Display job options with optional edit button.

```typescript
import { OptionsView } from 'neuroline-ui';

<OptionsView
  options={{ batchSize: 50, parallel: true }}
  onEditClick={() => console.log('Edit options')}
/>
```

## Types

```typescript
import type {
  PipelineDisplayData,
  StageDisplayInfo,
  JobDisplayInfo,
  JobStatus,
  PipelineStatus,
  SerializableValue,
} from 'neuroline-ui';
```

### JobDisplayInfo

```typescript
interface JobDisplayInfo {
  name: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  startedAt?: Date;
  finishedAt?: Date;
  error?: { message: string; stack?: string };
  artifact?: SerializableValue;
  input?: SerializableValue;
  options?: SerializableValue;
}
```

### StageDisplayInfo

```typescript
interface StageDisplayInfo {
  index: number;
  jobs: JobDisplayInfo[];
}
```

### PipelineDisplayData

```typescript
interface PipelineDisplayData {
  pipelineId: string;
  pipelineType: string;
  status: 'processing' | 'done' | 'error';
  stages: StageDisplayInfo[];
  input?: SerializableValue;
  error?: { message: string; jobName?: string };
}
```

### SerializableValue

```typescript
type SerializableValue = Record<string, unknown> | string | number | boolean | null;
```

## Styling

All components use MUI's `sx` prop and support theme customization.

### Custom Theme

```typescript
import { ThemeProvider, createTheme } from '@mui/material';
import { PipelineViewer } from 'neuroline-ui';

const theme = createTheme({
  palette: {
    primary: { main: '#7c4dff' },
    success: { main: '#00e676' },
    error: { main: '#ff1744' },
    info: { main: '#00e5ff' },
  },
});

<ThemeProvider theme={theme}>
  <PipelineViewer pipeline={pipeline} />
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

import { PipelineViewer, JobDetailsPanel } from 'neuroline-ui';
import type { PipelineDisplayData, JobDisplayInfo } from 'neuroline-ui';
import { Container, Typography } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';

export default function PipelinePage({ params }: { params: { id: string } }) {
  const [pipeline, setPipeline] = useState<PipelineDisplayData | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDisplayInfo | null>(null);

  useEffect(() => {
    const pollStatus = async () => {
      const res = await fetch(`/api/pipeline/${params.id}/status`);
      const data = await res.json();
      setPipeline(data);

      if (data.status === 'processing') {
        setTimeout(pollStatus, 1000);
      }
    };

    pollStatus();
  }, [params.id]);

  const handleJobClick = useCallback((job: JobDisplayInfo) => {
    setSelectedJob(job);
  }, []);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Pipeline: {params.id}
      </Typography>
      {pipeline && (
        <PipelineViewer
          pipeline={pipeline}
          onJobClick={handleJobClick}
          selectedJobName={selectedJob?.name}
          showArtifacts
        />
      )}
      {selectedJob && <JobDetailsPanel job={selectedJob} />}
    </Container>
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

[![Demo](https://img.shields.io/badge/Demo-neuroline.vercel.app-blue)](https://neuroline.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-sergeychernov/neuroline-black)](https://github.com/sergeychernov/neuroline)

React компоненты для визуализации Neuroline пайплайнов с Material-UI.

## Установка

```bash
yarn add neuroline-ui @mui/material @emotion/react @emotion/styled @mui/icons-material
```

**Примечание:** Этот пакет имеет peer-зависимости от React, MUI и Emotion.

## Возможности

- **PipelineViewer** - визуальное представление процесса выполнения pipeline
- **JobNode** - отображение статуса отдельной job с информацией о времени
- **JobDetailsPanel** - детальная информация о job с табами для artifact, input, options
- **StageColumn** - группировка stage с визуализацией параллельных jobs
- **StatusBadge** - цветные индикаторы статуса
- **ArtifactView** - отображение артефакта job
- **InputView** - отображение входных данных job с кнопкой редактирования
- **OptionsView** - отображение опций job с кнопкой редактирования
- **TypeScript поддержка** - полная типобезопасность
- **Storybook** - интерактивная документация компонентов

## Быстрый старт

```typescript
'use client';

import { PipelineViewer, JobDetailsPanel } from 'neuroline-ui';
import type { PipelineDisplayData, JobDisplayInfo } from 'neuroline-ui';
import { useEffect, useState, useCallback } from 'react';

export function PipelineDemo() {
  const [pipeline, setPipeline] = useState<PipelineDisplayData | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDisplayInfo | null>(null);

  useEffect(() => {
    // Получение статуса pipeline
    fetch('/api/pipeline/status')
      .then(res => res.json())
      .then(setPipeline);
  }, []);

  const handleJobClick = useCallback((job: JobDisplayInfo) => {
    setSelectedJob(job);
  }, []);

  return (
    <div>
      {pipeline && (
        <PipelineViewer
          pipeline={pipeline}
          onJobClick={handleJobClick}
          selectedJobName={selectedJob?.name}
          showArtifacts
        />
      )}
      {selectedJob && (
        <JobDetailsPanel
          job={selectedJob}
          onInputEditClick={(job) => console.log('Редактировать input:', job)}
          onOptionsEditClick={(job) => console.log('Редактировать options:', job)}
        />
      )}
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
  pipeline={{
    pipelineId: 'pl_123',
    pipelineType: 'data-processing',
    status: 'processing',
    stages: [
      {
        index: 0,
        jobs: [
          {
            name: 'fetch-data',
            status: 'done',
            startedAt: new Date('2024-01-01T00:00:00Z'),
            finishedAt: new Date('2024-01-01T00:00:02Z'),
            artifact: { size: 2048 },
          },
        ],
      },
      {
        index: 1,
        jobs: [
          {
            name: 'process-data',
            status: 'processing',
            startedAt: new Date('2024-01-01T00:00:02Z'),
            input: { records: 150 },
            options: { batchSize: 50 },
          },
        ],
      },
    ],
  }}
  showArtifacts={true}
  showInput={true}
  onJobClick={(job) => console.log('Job clicked:', job)}
  selectedJobName="fetch-data"
/>
```

**Пропсы:**

| Проп | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `pipeline` | `PipelineDisplayData` | Обязательно | Данные pipeline со stages |
| `showArtifacts` | `boolean` | `false` | Показывать артефакты в job nodes |
| `showInput` | `boolean` | `false` | Показывать входные данные pipeline |
| `onJobClick` | `(job: JobDisplayInfo) => void` | - | Обработчик клика по job |
| `selectedJobName` | `string` | - | Имя выбранной job |

### JobDetailsPanel

Панель для отображения детальной информации о job с табами.

```typescript
import { JobDetailsPanel } from 'neuroline-ui';

<JobDetailsPanel
  job={{
    name: 'process-data',
    status: 'done',
    startedAt: new Date(),
    finishedAt: new Date(),
    artifact: { processed: true, count: 150 },
    input: { records: 150, format: 'json' },
    options: { batchSize: 50, parallel: true },
  }}
  onInputEditClick={(job) => console.log('Редактировать input:', job)}
  onOptionsEditClick={(job) => console.log('Редактировать options:', job)}
/>
```

**Пропсы:**

| Проп | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `job` | `JobDisplayInfo` | Обязательно | Job для отображения |
| `onInputEditClick` | `(job: JobDisplayInfo) => void` | - | Callback редактирования input |
| `onOptionsEditClick` | `(job: JobDisplayInfo) => void` | - | Callback редактирования options |

### JobNode

Компонент отображения отдельной job.

```typescript
import { JobNode } from 'neuroline-ui';

<JobNode
  job={{
    name: 'fetch-data',
    status: 'done',
    startedAt: new Date(),
    finishedAt: new Date(),
    artifact: { size: 2048 },
  }}
  isSelected={true}
  showArtifact={true}
  onClick={(job) => console.log('Clicked:', job)}
/>
```

**Пропсы:**

| Проп | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `job` | `JobDisplayInfo` | Обязательно | Данные job |
| `isSelected` | `boolean` | `false` | Подсветить как выбранную |
| `showArtifact` | `boolean` | `false` | Показывать превью артефакта |
| `onClick` | `(job: JobDisplayInfo) => void` | - | Обработчик клика |

### StageColumn

Компонент группировки stage для параллельных jobs.

```typescript
import { StageColumn } from 'neuroline-ui';

<StageColumn
  stage={{
    index: 1,
    jobs: [
      { name: 'job1', status: 'done' },
      { name: 'job2', status: 'done' },
    ],
  }}
  showArtifacts={true}
  selectedJobName="job1"
  onJobClick={(job) => console.log(job)}
/>
```

### StatusBadge

Индикатор статуса с цветовым кодированием.

```typescript
import { StatusBadge } from 'neuroline-ui';

<StatusBadge status="processing" size="small" />
```

**Цвета статусов:**
- `pending` - Серый
- `processing` - Бирюзовый (анимированный)
- `done` - Зелёный
- `error` - Красный

### ArtifactView

Отображение артефакта job.

```typescript
import { ArtifactView } from 'neuroline-ui';

<ArtifactView artifact={{ processed: true, count: 150 }} />
```

### InputView

Отображение входных данных job с опциональной кнопкой редактирования.

```typescript
import { InputView } from 'neuroline-ui';

<InputView
  input={{ records: 150, format: 'json' }}
  onEditClick={() => console.log('Редактировать input')}
/>
```

### OptionsView

Отображение опций job с опциональной кнопкой редактирования.

```typescript
import { OptionsView } from 'neuroline-ui';

<OptionsView
  options={{ batchSize: 50, parallel: true }}
  onEditClick={() => console.log('Редактировать options')}
/>
```

## Типы

```typescript
import type {
  PipelineDisplayData,
  StageDisplayInfo,
  JobDisplayInfo,
  JobStatus,
  PipelineStatus,
  SerializableValue,
} from 'neuroline-ui';
```

### JobDisplayInfo

```typescript
interface JobDisplayInfo {
  name: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  startedAt?: Date;
  finishedAt?: Date;
  error?: { message: string; stack?: string };
  artifact?: SerializableValue;
  input?: SerializableValue;
  options?: SerializableValue;
}
```

### StageDisplayInfo

```typescript
interface StageDisplayInfo {
  index: number;
  jobs: JobDisplayInfo[];
}
```

### PipelineDisplayData

```typescript
interface PipelineDisplayData {
  pipelineId: string;
  pipelineType: string;
  status: 'processing' | 'done' | 'error';
  stages: StageDisplayInfo[];
  input?: SerializableValue;
  error?: { message: string; jobName?: string };
}
```

### SerializableValue

```typescript
type SerializableValue = Record<string, unknown> | string | number | boolean | null;
```

## Стилизация

Все компоненты используют `sx` проп MUI и поддерживают кастомизацию темы.

### Кастомная тема

```typescript
import { ThemeProvider, createTheme } from '@mui/material';
import { PipelineViewer } from 'neuroline-ui';

const theme = createTheme({
  palette: {
    primary: { main: '#7c4dff' },
    success: { main: '#00e676' },
    error: { main: '#ff1744' },
    info: { main: '#00e5ff' },
  },
});

<ThemeProvider theme={theme}>
  <PipelineViewer pipeline={pipeline} />
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

import { PipelineViewer, JobDetailsPanel } from 'neuroline-ui';
import type { PipelineDisplayData, JobDisplayInfo } from 'neuroline-ui';
import { Container, Typography } from '@mui/material';
import { useState, useEffect, useCallback } from 'react';

export default function PipelinePage({ params }: { params: { id: string } }) {
  const [pipeline, setPipeline] = useState<PipelineDisplayData | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDisplayInfo | null>(null);

  useEffect(() => {
    const pollStatus = async () => {
      const res = await fetch(`/api/pipeline/${params.id}/status`);
      const data = await res.json();
      setPipeline(data);

      if (data.status === 'processing') {
        setTimeout(pollStatus, 1000);
      }
    };

    pollStatus();
  }, [params.id]);

  const handleJobClick = useCallback((job: JobDisplayInfo) => {
    setSelectedJob(job);
  }, []);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Pipeline: {params.id}
      </Typography>
      {pipeline && (
        <PipelineViewer
          pipeline={pipeline}
          onJobClick={handleJobClick}
          selectedJobName={selectedJob?.name}
          showArtifacts
        />
      )}
      {selectedJob && <JobDetailsPanel job={selectedJob} />}
    </Container>
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

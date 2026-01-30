[English](#neuroline-monorepo) | [Русский](#neuroline-monorepo-1)

# Neuroline Monorepo

[![Demo](https://img.shields.io/badge/Demo-neuroline.vercel.app-blue)](https://neuroline.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-sergeychernov/neuroline-black)](https://github.com/sergeychernov/neuroline)

Monorepo for Neuroline pipeline orchestration: core library, UI, and framework integrations.

## Features

- **Typed Jobs** — JobDefinition with input/output/options types
- **Stages** — Sequential stages with parallel jobs inside
- **Synapses** — Data transformation between jobs
- **Retry** — Automatic retry with configurable delay
- **Restart** — Restart failed pipelines from any job
- **Storage** — In-memory (tests) or MongoDB (production)
- **Watchdog** — Background monitoring for stale jobs

## Packages

- `neuroline` — Core orchestration with typed jobs and pluggable storage. Docs: `packages/neuroline/README.md`
- `neuroline-ui` — React UI components for pipeline visualization. Docs: `packages/neuroline-ui/README.md`
- `neuroline-nextjs` — Next.js App Router API handlers. Docs: `packages/neuroline-nextjs/README.md`
- `neuroline-nestjs` — NestJS module and controllers. Docs: `packages/neuroline-nestjs/README.md`

## Apps

- `apps/nextjs` — Next.js demo with pipeline visualization.
- `apps/nestjs` — NestJS backend example (see `apps/nestjs/README.md`).

## Quick start

```bash
yarn install
yarn build:packages
yarn dev
```

Other commands: `yarn dev:nestjs`, `yarn storybook`.

## Documentation

Full usage and API details live in the package READMEs listed above.

## License

UNLICENSED

# Neuroline Monorepo

Мультипакетный репозиторий Neuroline: ядро оркестрации, UI и интеграции с фреймворками.

## Возможности

- **Типизированные Jobs** — JobDefinition с типами input/output/options
- **Stages** — Последовательные stages с параллельными jobs внутри
- **Synapses** — Трансформация данных между jobs
- **Retry** — Автоматический retry с настраиваемой задержкой
- **Restart** — Перезапуск упавших pipelines с любой job
- **Storage** — In-memory (тесты) или MongoDB (продакшн)
- **Watchdog** — Фоновый мониторинг зависших jobs

## Пакеты

- `neuroline` — ядро оркестрации с типизированными jobs и хранилищами. Документация: `packages/neuroline/README.md`
- `neuroline-ui` — React UI компоненты визуализации. Документация: `packages/neuroline-ui/README.md`
- `neuroline-nextjs` — хендлеры API для Next.js App Router. Документация: `packages/neuroline-nextjs/README.md`
- `neuroline-nestjs` — модуль и контроллеры для NestJS. Документация: `packages/neuroline-nestjs/README.md`

## Приложения

- `apps/nextjs` — демо Next.js с визуализацией.
- `apps/nestjs` — пример бекенда на NestJS (см. `apps/nestjs/README.md`).

## Быстрый старт

```bash
yarn install
yarn build:packages
yarn dev
```

Другие команды: `yarn dev:nestjs`, `yarn storybook`.

## Документация

Подробности по использованию и API см. в README пакетов выше.

## Лицензия

UNLICENSED

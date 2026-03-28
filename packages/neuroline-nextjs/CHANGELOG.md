# Changelog

All notable changes to this package are documented in this file.

## [0.8.0] - 2026-03-28

### Breaking

- Updated peer dependency: `neuroline@^0.10.0`.

### Changed

- `pipeline` option in `createPipelineRouteHandler` is now typed as
  `PipelineConfig<TInput>`.
- `getJobOptions(input, request)` now receives the same inferred `TInput` as
  the passed pipeline config.

---

# История изменений

Все значимые изменения этого пакета фиксируются в этом файле.

## [0.8.0] - 2026-03-28

### Ломающее изменение

- Обновлена peer-зависимость: `neuroline@^0.10.0`.

### Изменения

- Опция `pipeline` в `createPipelineRouteHandler` теперь типизирована как
  `PipelineConfig<TInput>`.
- `getJobOptions(input, request)` теперь получает тот же `TInput`, который
  выведен из переданного конфига pipeline.

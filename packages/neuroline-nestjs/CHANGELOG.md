# Changelog

All notable changes to this package are documented in this file.

## [0.8.0] - 2026-03-28

### Breaking

- Updated peer dependency: `neuroline@^0.10.0`.

### Changed

- `pipeline` in `PipelineControllerOptions<TInput>` is now typed as
  `PipelineConfig<TInput>`.
- `getJobOptions(input, request)` now uses the same inferred `TInput` as the
  configured pipeline.

---

# История изменений

Все значимые изменения этого пакета фиксируются в этом файле.

## [0.8.0] - 2026-03-28

### Ломающее изменение

- Обновлена peer-зависимость: `neuroline@^0.10.0`.

### Изменения

- `pipeline` в `PipelineControllerOptions<TInput>` теперь типизирован как
  `PipelineConfig<TInput>`.
- `getJobOptions(input, request)` теперь использует тот же `TInput`, который
  выводится из настроенного pipeline.

# Changelog

All notable changes to this package are documented in this file.

## [0.10.0] - 2026-03-28

### Breaking

- `JobInPipeline` generic order changed from
  `JobInPipeline<TInput, TOutput, TOptions, TPipelineInput>` to
  `JobInPipeline<TPipelineInput, TInput, TOutput, TOptions>`.

### Changed

- `PipelineConfig<TInput>` now propagates `TInput` to stage synapses context
  (`ctx.pipelineInput`) by default.
- Added internal helper alias `AnyJobInPipeline<TPipelineInput>` to keep core
  implementation concise.

### Migration

If you used explicit `JobInPipeline<...>` generics, update argument order:

```ts
// before
type X = JobInPipeline<MyInput, MyOutput, MyOptions, MyPipelineInput>;

// after
type X = JobInPipeline<MyPipelineInput, MyInput, MyOutput, MyOptions>;
```

---

# История изменений

Все значимые изменения этого пакета фиксируются в этом файле.

## [0.10.0] - 2026-03-28

### Ломающее изменение

- Порядок generic-параметров `JobInPipeline` изменён с
  `JobInPipeline<TInput, TOutput, TOptions, TPipelineInput>` на
  `JobInPipeline<TPipelineInput, TInput, TOutput, TOptions>`.

### Изменения

- `PipelineConfig<TInput>` теперь по умолчанию прокидывает `TInput` в контекст
  `synapses` (`ctx.pipelineInput`) через stages.
- Добавлен внутренний алиас `AnyJobInPipeline<TPipelineInput>` для более
  лаконичной реализации ядра.

### Миграция

Если вы явно использовали `JobInPipeline<...>`, обновите порядок аргументов:

```ts
// было
type X = JobInPipeline<MyInput, MyOutput, MyOptions, MyPipelineInput>;

// стало
type X = JobInPipeline<MyPipelineInput, MyInput, MyOutput, MyOptions>;
```

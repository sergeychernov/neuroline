/**
 * Типы для neuroline-ui
 * Повторяем нужные типы из neuroline для независимости
 */

/** Статус отдельной job */
export type JobStatus = 'pending' | 'processing' | 'done' | 'error';

/** Статус всего пайплайна */
export type PipelineStatus = 'processing' | 'done' | 'error';

/** Тип для сериализуемых данных */
export type SerializableValue = Record<string, unknown> | string | number | boolean | null;

/** Информация о job для отображения */
export interface JobDisplayInfo {
  /** Имя job */
  name: string;
  /** Статус выполнения */
  status: JobStatus;
  /** Время начала */
  startedAt?: Date;
  /** Время завершения */
  finishedAt?: Date;
  /** Ошибка (если есть) */
  error?: { message: string; stack?: string };
  /** Артефакт (результат) - любые сериализуемые данные */
  artifact?: SerializableValue;
  /** Входные данные job (результат synapses) */
  input?: SerializableValue;
  /** Опции job */
  options?: SerializableValue;
  /** Количество выполненных ретраев (0 = первая попытка) */
  retryCount?: number;
  /** Максимальное количество ретраев для этой job */
  maxRetries?: number;
}

/** Stage для отображения */
export interface StageDisplayInfo {
  /** Индекс stage */
  index: number;
  /** Jobs в этом stage */
  jobs: JobDisplayInfo[];
}

/** Данные для визуализации pipeline */
export interface PipelineDisplayData {
  /** ID пайплайна */
  pipelineId: string;
  /** Тип пайплайна */
  pipelineType: string;
  /** Статус пайплайна */
  status: PipelineStatus;
  /** Stages */
  stages: StageDisplayInfo[];
  /** Входные данные */
  input?: Record<string, unknown> | string | number | boolean | null;
  /** Ошибка */
  error?: { message: string; jobName?: string };
}

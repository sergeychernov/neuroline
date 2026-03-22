'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Box, Container, Typography, Paper, CircularProgress } from '@mui/material';
import {
  PipelineViewer,
  JobDetailsPanel,
  type PipelineDisplayData,
  type JobDisplayInfo,
} from 'neuroline-ui';
import type { SerializableValue } from 'neuroline-ui';
import { PipelineClient } from 'neuroline/client';
import type { PipelineStatusResponse } from 'neuroline';
import { PipelineControlPanel } from './components/PipelineControlPanel';
import type { DemoPipelineInput } from 'demo-pipelines';

// ============================================================================
// Helpers
// ============================================================================

/** Тип stage из PipelineStatusResponse */
type StageInfo = PipelineStatusResponse['stages'][number];

/** Тип job из stage */
type JobInfo = StageInfo['jobs'][number];

/** Событие обновления (только статус) */
interface UpdateEvent {
  status: PipelineStatusResponse;
}

/** Сводка покрытия из vitest */
interface CoverageSummary {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
  updatedAt?: string;
}

/**
 * Преобразует PipelineUpdateEvent в PipelineDisplayData
 * Артефакты не включаются — их можно получить через getResult() или getJobDetails()
 */
function convertToDisplayData(event: UpdateEvent): PipelineDisplayData {
  const { status } = event;

  return {
    pipelineId: status.pipelineId,
    pipelineType: status.pipelineType,
    status: status.status,
    input: undefined, // Input не доступен через status API
    stages: status.stages.map((stage: StageInfo, index: number) => ({
      index,
      jobs: stage.jobs.map((job: JobInfo) => ({
        name: job.name,
        status: job.status,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        errors: job.errors,
        artifact: undefined, // Артефакты получаются через отдельный запрос getJobDetails()
        input: undefined, // Для получения input нужен отдельный запрос
        options: undefined,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
      })),
    })),
    error: status.error,
  };
}

// ============================================================================
// Component
// ============================================================================

export default function HomePage() {
  const [pipeline, setPipeline] = useState<PipelineDisplayData | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDisplayInfo | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPipelineType, setCurrentPipelineType] = useState<string | undefined>();
  const [mounted, setMounted] = useState(false);
  const [coverage, setCoverage] = useState<CoverageSummary | null>(null);
  const [coverageStatus, setCoverageStatus] = useState<'loading' | 'available' | 'unavailable' | 'error'>('loading');
  const [coverageMessage, setCoverageMessage] = useState<string | null>(null);

  const stopRef = useRef<(() => void) | null>(null);
  const currentPipelineIdRef = useRef<string | null>(null);
  const currentClientRef = useRef<PipelineClient | null>(null);

  // Клиенты для разных API
  const nextjsClient = useMemo(() => new PipelineClient({ baseUrl: '/api/pipeline/demo' }), []);
  const nextjsManualClient = useMemo(() => new PipelineClient({ baseUrl: '/api/pipeline/manual-demo' }), []);
  const nestjsClient = useMemo(
    () => new PipelineClient({ baseUrl: 'http://localhost:3003/api/pipeline/demo' }),
    [],
  );
  const nestjsManualClient = useMemo(
    () => new PipelineClient({ baseUrl: 'http://localhost:3003/api/pipeline/manual-demo' }),
    [],
  );

  // Инициализация на клиенте
  useEffect(() => {
    setMounted(true);
    return () => {
      stopRef.current?.();
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadCoverage = async () => {
      try {
        const response = await fetch('/api/coverage/neuroline', { cache: 'no-store' });
        const data = await response.json();
        if (!isActive) return;

        if (data?.available && data?.summary) {
          setCoverage({
            lines: data.summary.lines ?? 0,
            statements: data.summary.statements ?? 0,
            functions: data.summary.functions ?? 0,
            branches: data.summary.branches ?? 0,
            updatedAt: data.updatedAt,
          });
          setCoverageStatus('available');
          setCoverageMessage(null);
        } else {
          setCoverage(null);
          setCoverageStatus('unavailable');
          setCoverageMessage(data?.message ?? 'Нет данных');
        }
      } catch {
        if (!isActive) return;
        setCoverage(null);
        setCoverageStatus('error');
        setCoverageMessage('Ошибка загрузки');
      }
    };

    loadCoverage();

    return () => {
      isActive = false;
    };
  }, []);

  const handleJobClick = useCallback(
    async (job: JobDisplayInfo) => {
      // Сразу показываем job с базовой информацией
      setSelectedJob(job);

      // Если есть pipelineId и клиент, запрашиваем полные детали job (input, options, artifact)
      const pipelineId = currentPipelineIdRef.current;
      const client = currentClientRef.current;
      if (pipelineId && client) {
        try {
          const details = await client.getJobDetails(pipelineId, job.name);
          // Обновляем selectedJob с полными данными
          const detailsForDisplay: Partial<JobDisplayInfo> = {
            ...details,
            input: details.input as SerializableValue | undefined,
            options: details.options as SerializableValue | undefined,
            artifact: details.artifact as SerializableValue | undefined,
          };

          setSelectedJob({
            ...job,
            ...detailsForDisplay,
          });
        } catch (e) {
          console.error('Failed to fetch job details:', e);
        }
      }
    },
    [],
  );

  const handleUpdate = useCallback((event: UpdateEvent) => {
    const displayData = convertToDisplayData(event);
    setPipeline(displayData);

    if (event.status.status !== 'processing') {
      setIsRunning(false);
    }
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error('Pipeline error:', error);
    setIsRunning(false);
  }, []);

  const handleJobRetry = useCallback(
    async (job: JobDisplayInfo) => {
      const pipelineId = currentPipelineIdRef.current;
      const client = currentClientRef.current;

      if (!pipelineId || !client) {
        console.error('No pipeline or client available for retry');
        return;
      }

      // Нельзя перезапустить если pipeline ещё выполняется
      if (isRunning) {
        console.warn('Cannot retry while pipeline is running');
        return;
      }

      try {
        setIsRunning(true);
        stopRef.current?.();

        const polling = await client.restartAndPoll(
          pipelineId,
          job.name,
          undefined, // jobOptions
          handleUpdate,
          handleError,
        );

        stopRef.current = polling.stop;
        polling.completed.catch(() => {});
      } catch (e) {
        console.error('Failed to restart pipeline:', e);
        setIsRunning(false);
      }
    },
    [isRunning, handleUpdate, handleError],
  );

  const handleRunManualJob = useCallback(
    async (job: JobDisplayInfo) => {
      const pipelineId = currentPipelineIdRef.current;
      const client = currentClientRef.current;

      if (!pipelineId || !client) {
        console.error('No pipeline or client available for manual run');
        return;
      }

      try {
        setIsRunning(true);
        stopRef.current?.();

        const polling = await client.runManualJobAndPoll(
          pipelineId,
          job.name,
          handleUpdate,
          handleError,
        );

        stopRef.current = polling.stop;
        polling.completed.catch(() => {});
      } catch (e) {
        console.error('Failed to run manual job:', e);
        setIsRunning(false);
      }
    },
    [handleUpdate, handleError],
  );

  const startPipeline = useCallback(
    async (
      client: PipelineClient,
      pipelineTypeLabel: string,
      options: { fail?: boolean; unstableFailCount?: number } = {},
    ) => {
      // Остановить предыдущий polling
      stopRef.current?.();

      setIsRunning(true);
      setCurrentPipelineType(pipelineTypeLabel);
      setSelectedJob(null);
      setPipeline(null);
      currentClientRef.current = client;

      const input: DemoPipelineInput = {
        seed: Math.floor(Math.random() * 1000),
        name: `test-${Date.now()}`,
        iterations: 10,
        fail: options.fail ?? false,
        unstableFailCount: options.unstableFailCount ?? 0,
      };

      try {
        // Используем admin endpoint (startAndPollWithOptions) для передачи jobOptions
        const polling = await client.startAndPollWithOptions(
          {
            input,
            jobOptions: {
              compute: {
                multiplier: 2.0,
                iterationDelayMs: 80,
              },
            },
          },
          handleUpdate,
          handleError,
        );

        currentPipelineIdRef.current = polling.pipelineId;
        stopRef.current = polling.stop;
        polling.completed.catch(() => {});
      } catch (e) {
        console.error('Failed to start pipeline', e);
        setIsRunning(false);
      }
    },
    [handleUpdate, handleError],
  );

  /**
   * Запуск pipeline через базовый endpoint (без jobOptions)
   * Демонстрирует body = TInput напрямую
   */
  const startPipelineBasic = useCallback(
    async (
      client: PipelineClient,
      pipelineTypeLabel: string,
      options: { fail?: boolean; unstableFailCount?: number } = {},
    ) => {
      // Остановить предыдущий polling
      stopRef.current?.();

      setIsRunning(true);
      setCurrentPipelineType(pipelineTypeLabel);
      setSelectedJob(null);
      setPipeline(null);
      currentClientRef.current = client;

      const input: DemoPipelineInput = {
        seed: Math.floor(Math.random() * 1000),
        name: `test-${Date.now()}`,
        iterations: 10,
        fail: options.fail ?? false,
        unstableFailCount: options.unstableFailCount ?? 0,
      };

      try {
        // Базовый endpoint: body = TInput напрямую (без jobOptions)
        // jobOptions получаются на сервере через getJobOptions
        const polling = await client.startAndPoll(
          input,
          handleUpdate,
          handleError,
        );

        currentPipelineIdRef.current = polling.pipelineId;
        stopRef.current = polling.stop;
        polling.completed.catch(() => {});
      } catch (e) {
        console.error('Failed to start pipeline', e);
        setIsRunning(false);
      }
    },
    [handleUpdate, handleError],
  );

  // Next.js handlers
  const handleNextjsSuccess = useCallback(
    () => startPipeline(nextjsClient, 'nextjs-success', { fail: false }),
    [nextjsClient, startPipeline],
  );

  const handleNextjsSuccessBasic = useCallback(
    () => startPipelineBasic(nextjsClient, 'nextjs-success-basic', { fail: false }),
    [nextjsClient, startPipelineBasic],
  );

  const handleNextjsError = useCallback(
    () => startPipeline(nextjsClient, 'nextjs-error', { fail: true }),
    [nextjsClient, startPipeline],
  );

  const handleNextjsRetry = useCallback(
    () => startPipeline(nextjsClient, 'nextjs-retry', { unstableFailCount: 1 }),
    [nextjsClient, startPipeline],
  );

  const handleNextjsManual = useCallback(
    () => startPipeline(nextjsManualClient, 'nextjs-manual'),
    [nextjsManualClient, startPipeline],
  );

  // NestJS handlers
  const handleNestjsSuccess = useCallback(
    () => startPipeline(nestjsClient, 'nestjs-success', { fail: false }),
    [nestjsClient, startPipeline],
  );

  const handleNestjsSuccessBasic = useCallback(
    () => startPipelineBasic(nestjsClient, 'nestjs-success-basic', { fail: false }),
    [nestjsClient, startPipelineBasic],
  );

  const handleNestjsError = useCallback(
    () => startPipeline(nestjsClient, 'nestjs-error', { fail: true }),
    [nestjsClient, startPipeline],
  );

  const handleNestjsRetry = useCallback(
    () => startPipeline(nestjsClient, 'nestjs-retry', { unstableFailCount: 1 }),
    [nestjsClient, startPipeline],
  );

  const handleNestjsManual = useCallback(
    () => startPipeline(nestjsManualClient, 'nestjs-manual'),
    [nestjsManualClient, startPipeline],
  );

  const coverageText = useMemo(() => {
    const formatPercent = (value: number) => `${Math.round(value)}%`;

    if (coverageStatus === 'loading') {
      return 'Покрытие тестами: загрузка...';
    }
    if (coverageStatus === 'error') {
      return `Покрытие тестами: ${coverageMessage ?? 'Ошибка загрузки'}`;
    }
    if (coverageStatus === 'unavailable' || !coverage) {
      return `Покрытие тестами: ${coverageMessage ?? 'Нет данных'}`;
    }

    const updatedAt = coverage.updatedAt
      ? ` (обновлено ${new Date(coverage.updatedAt).toLocaleString('ru-RU')})`
      : '';

    return `Покрытие тестами: ${formatPercent(coverage.lines)} строк, ${formatPercent(
      coverage.statements,
    )} выражений, ${formatPercent(coverage.functions)} функций, ${formatPercent(
      coverage.branches,
    )} ветвей${updatedAt}`;
  }, [coverage, coverageMessage, coverageStatus]);

  // Loading state
  if (!mounted) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #050508 0%, #0a0a12 50%, #0f0f1a 100%)',
        }}
      >
        <CircularProgress sx={{ color: '#7c4dff' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `
					radial-gradient(ellipse at 10% 20%, rgba(124, 77, 255, 0.12) 0%, transparent 50%),
					radial-gradient(ellipse at 90% 80%, rgba(0, 229, 255, 0.08) 0%, transparent 50%),
					linear-gradient(135deg, #050508 0%, #0a0a12 50%, #0f0f1a 100%)
				`,
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        {/* Заголовок */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2rem', md: '3.5rem' },
              fontWeight: 800,
              mb: 2,
              background: 'linear-gradient(135deg, #7c4dff 0%, #00e5ff 50%, #00e676 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 60px rgba(124, 77, 255, 0.3)',
            }}
          >
            NEUROLINE
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: 'text.secondary',
              fontWeight: 400,
              letterSpacing: '0.05em',
              mb: 1,
            }}
          >
            Pipeline Orchestration Visualizer
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            Каждая Job — как нейрон: принимает входные данные, обрабатывает и передаёт результат дальше
          </Typography>
        </Box>

        {/* Панель управления */}
        <PipelineControlPanel
          onNextjsSuccess={handleNextjsSuccess}
          onNextjsSuccessBasic={handleNextjsSuccessBasic}
          onNextjsError={handleNextjsError}
          onNextjsRetry={handleNextjsRetry}
          onNextjsManual={handleNextjsManual}
          onNestjsSuccess={handleNestjsSuccess}
          onNestjsSuccessBasic={handleNestjsSuccessBasic}
          onNestjsError={handleNestjsError}
          onNestjsRetry={handleNestjsRetry}
          onNestjsManual={handleNestjsManual}
          isRunning={isRunning}
          currentPipelineType={currentPipelineType}
        />

        {/* Визуализация Pipeline */}
        {pipeline ? (
          <PipelineViewer
            pipeline={pipeline}
            onJobClick={handleJobClick}
            onJobRetry={handleJobRetry}
            onJobRunManual={handleRunManualJob}
            selectedJobName={selectedJob?.name}
          />
        ) : (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              backgroundColor: 'rgba(19, 19, 26, 0.6)',
              border: '1px solid rgba(160, 160, 160, 0.2)',
            }}
          >
            {isRunning ? (
              <>
                <CircularProgress sx={{ color: '#7c4dff', mb: 2 }} />
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  Запуск pipeline...
                </Typography>
              </>
            ) : (
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                Нажмите кнопку для запуска pipeline
              </Typography>
            )}
          </Paper>
        )}

        {/* Детали выбранной Job */}
        {selectedJob && (
          <JobDetailsPanel
            job={selectedJob}
            onInputEditClick={(job) => {
              console.log('Edit input for job:', job.name, job.input);
              // TODO: открыть модальное окно для редактирования input
            }}
            onOptionsEditClick={(job) => {
              console.log('Edit options for job:', job.name, job.options);
              // TODO: открыть модальное окно для редактирования options
            }}
          />
        )}

        {/* Инструкция */}
        <Paper
          elevation={0}
          sx={{
            mt: 4,
            p: 3,
            backgroundColor: 'rgba(19, 19, 26, 0.6)',
            border: '1px solid rgba(160, 160, 160, 0.2)',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
            📖 Как это работает
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Neuroline состоит из нескольких пакетов. Ядро задаёт модель pipeline (<strong>stages</strong> выполняются
            последовательно, внутри stage <strong>jobs</strong> выполняются параллельно), а интеграции и UI добавляют
            удобные способы запуска и визуализации.
          </Typography>
          <Box
            component="ul"
            sx={{
              m: 0,
              pl: 2.5,
              color: 'text.secondary',
              '& li': { mb: 1.25 },
              '& a': { textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
            }}
          >
            <Box component="li">
              <Box
                component="a"
                href="https://www.npmjs.com/package/neuroline"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: '#7c4dff' }}
              >
                <strong>neuroline</strong>
              </Box>{' '}
              — core: PipelineManager, типы, storage (in-memory / Mongo через <strong>neuroline/mongo</strong>) и клиент
              для опроса API (<strong>neuroline/client</strong>).
              <Box component="div" sx={{ mt: 0.5, fontSize: '0.85rem', color: 'text.secondary' }}>
                {coverageText}
              </Box>
            </Box>
            <Box component="li">
              <Box
                component="a"
                href="https://www.npmjs.com/package/neuroline-ui"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: '#00e5ff' }}
              >
                <strong>neuroline-ui</strong>
              </Box>{' '}
              — React + MUI компоненты для визуализации pipeline как «нейросети»: граф jobs, статусы, артефакты и детали
              выполнения.
            </Box>
            <Box component="li">
              <Box
                component="a"
                href="https://www.npmjs.com/package/neuroline-nextjs"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: '#00e676' }}
              >
                <strong>neuroline-nextjs</strong>
              </Box>{' '}
              — интеграция для Next.js App Router: готовые route handlers (GET/POST) для запуска pipeline и получения
              статуса/результатов.
            </Box>
            <Box component="li">
              <Box
                component="a"
                href="https://www.npmjs.com/package/neuroline-nestjs"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: '#ffd54f' }}
              >
                <strong>neuroline-nestjs</strong>
              </Box>{' '}
              — интеграция для NestJS: createPipelineController для создания API-контроллеров.
            </Box>
          </Box>
        </Paper>

        {/* Футер */}
        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Построено с использованием{' '}
            <Box
              component="a"
              href="https://www.npmjs.com/package/neuroline"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: '#7c4dff', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              neuroline
            </Box>{' '}
            +{' '}
            <Box
              component="a"
              href="https://www.npmjs.com/package/neuroline-ui"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: '#00e5ff', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              neuroline-ui
            </Box>{' '}
            +{' '}
            <Box component="span" sx={{ color: '#00e676' }}>
              Next.js
            </Box>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
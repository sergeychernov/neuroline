'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Container, Typography, Paper, CircularProgress } from '@mui/material';
import {
  PipelineViewer,
  JobDetailsPanel,
  type PipelineDisplayData,
  type JobDisplayInfo,
} from 'neuroline-ui';
import { PipelineManager, InMemoryPipelineStorage, type PipelineConfig } from 'neuroline';
import type { SerializableValue } from 'neuroline-ui';
import { PipelineControlPanel } from './components/PipelineControlPanel';
import {
  successPipeline,
  errorPipeline,
  type SuccessPipelineInput,
  type ErrorPipelineInput,
} from '../pipelines';

// ============================================================================
// Pipeline Manager Singleton
// ============================================================================

let managerInstance: PipelineManager | null = null;
let storageInstance: InMemoryPipelineStorage | null = null;

function getPipelineManager() {
  if (!managerInstance) {
    storageInstance = new InMemoryPipelineStorage();
    managerInstance = new PipelineManager({
      storage: storageInstance,
      logger: {
        info: (msg, data) => console.log(`[INFO] ${msg}`, data),
        error: (msg, data) => console.error(`[ERROR] ${msg}`, data),
        warn: (msg, data) => console.warn(`[WARN] ${msg}`, data),
      },
    });
    managerInstance.registerPipeline(successPipeline as PipelineConfig);
    managerInstance.registerPipeline(errorPipeline as PipelineConfig);
  }
  return { manager: managerInstance, storage: storageInstance! };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Преобразует PipelineStatusResponse в PipelineDisplayData
 */
async function fetchPipelineDisplay(
  manager: PipelineManager,
  storage: InMemoryPipelineStorage,
  pipelineId: string,
): Promise<PipelineDisplayData | null> {
  try {
    const status = await manager.getStatus(pipelineId);
    const result = await manager.getResult(pipelineId);
    const state = await storage.findById(pipelineId);

    if (!status || !state) return null;

    // Создаём Map для быстрого поиска job state по имени
    const jobStateByName = new Map(state.jobs.map((j) => [j.name, j]));

    const displayData: PipelineDisplayData = {
      pipelineId: status.pipelineId,
      pipelineType: status.pipelineType,
      status: status.status,
      input: state.input as SerializableValue,
      stages: status.stages.map((stage, index) => ({
        index,
        jobs: stage.jobs.map((job) => {
          const jobState = jobStateByName.get(job.name);
          return {
            name: job.name,
            status: job.status,
            startedAt: job.startedAt,
            finishedAt: job.finishedAt,
            error: job.error,
            artifact: result.artifacts[job.name] as SerializableValue | undefined,
            input: jobState?.input as SerializableValue | undefined,
            options: jobState?.options as SerializableValue | undefined,
          };
        }),
      })),
      error: status.error,
    };

    return displayData;
  } catch (e) {
    console.error('Failed to fetch pipeline display', e);
    return null;
  }
}

// ============================================================================
// Component
// ============================================================================

export default function HomePage() {
  const [pipeline, setPipeline] = useState<PipelineDisplayData | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDisplayInfo | null>(null);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPipelineType, setCurrentPipelineType] = useState<string | undefined>();
  const [mounted, setMounted] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const currentPipelineIdRef = useRef<string | null>(null);

  // Инициализация на клиенте
  useEffect(() => {
    setMounted(true);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleJobClick = useCallback((job: JobDisplayInfo) => {
    setSelectedJob(job);
  }, []);

  const startPolling = useCallback((pipelineId: string) => {
    const { manager, storage } = getPipelineManager();

    // Очищаем предыдущий polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    currentPipelineIdRef.current = pipelineId;

    const poll = async () => {
      if (currentPipelineIdRef.current !== pipelineId) return;

      const displayData = await fetchPipelineDisplay(manager, storage, pipelineId);
      if (!displayData) return;

      setPipeline(displayData);

      if (displayData.status !== 'processing') {
        setIsRunning(false);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    };

    // Первый запрос сразу
    poll();

    // Потом каждые 500ms
    pollingRef.current = setInterval(poll, 500);
  }, []);

  const handleStartSuccess = useCallback(async () => {
    const { manager } = getPipelineManager();

    setIsRunning(true);
    setCurrentPipelineType('success-pipeline');
    setSelectedJob(null);
    setPipeline(null);

    const input: SuccessPipelineInput = {
      seed: Math.floor(Math.random() * 1000),
      name: `test-${Date.now()}`,
      iterations: 10,
    };

    try {
      const { pipelineId } = await manager.startPipeline('success-pipeline', {
        data: input,
        // Options для конкретных jobs (ключ = имя job)
        jobOptions: {
          compute: {
            multiplier: 2.0,
            iterationDelayMs: 80,
          },
        },
      });
      startPolling(pipelineId);
    } catch (e) {
      console.error('Failed to start success pipeline', e);
      setIsRunning(false);
    }
  }, [startPolling]);

  const handleStartError = useCallback(async () => {
    const { manager } = getPipelineManager();

    setIsRunning(true);
    setCurrentPipelineType('error-pipeline');
    setSelectedJob(null);
    setPipeline(null);

    const input: ErrorPipelineInput = {
      seed: Math.floor(Math.random() * 1000),
      name: `test-${Date.now()}`,
      iterations: 10,
    };

    try {
      const { pipelineId } = await manager.startPipeline('error-pipeline', { data: input });
      startPolling(pipelineId);
    } catch (e) {
      console.error('Failed to start error pipeline', e);
      setIsRunning(false);
    }
  }, [startPolling]);

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
          showArtifacts={showArtifacts}
          onShowArtifactsChange={setShowArtifacts}
          showInput={showInput}
          onShowInputChange={setShowInput}
          onStartSuccess={handleStartSuccess}
          onStartError={handleStartError}
          isRunning={isRunning}
          currentPipelineType={currentPipelineType}
        />

        {/* Визуализация Pipeline */}
        {pipeline ? (
          <PipelineViewer
            pipeline={pipeline}
            onJobClick={handleJobClick}
            selectedJobName={selectedJob?.name}
            showArtifacts={showArtifacts}
            showInput={showInput}
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
        {selectedJob && <JobDetailsPanel job={selectedJob} />}

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
            <strong>neuroline</strong> — это библиотека для оркестрации pipeline на сервере.
            Каждый pipeline состоит из <strong>stages</strong>, которые выполняются последовательно.
            Внутри каждого stage может быть одна или несколько <strong>jobs</strong>, которые выполняются параллельно.
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            <strong>neuroline-ui</strong> визуализирует pipeline как сеть «нейронов» — каждая job
            имеет входные данные (от предыдущих jobs или input pipeline), выполняет обработку
            и выдаёт результат (артефакт) для следующих jobs.
          </Typography>
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

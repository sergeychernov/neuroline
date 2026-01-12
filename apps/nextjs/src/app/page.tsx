'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  TextField,
  Stack,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  PipelineViewer,
  type PipelineDisplayData,
  type JobDisplayInfo,
} from 'neuroline-ui';

// Демо данные для симуляции pipeline
const createDemoPipeline = (status: 'processing' | 'done' | 'error'): PipelineDisplayData => {
  const now = Date.now();

  const basePipeline: PipelineDisplayData = {
    pipelineId: `pl_${now.toString(36)}`,
    pipelineType: 'data-processing-pipeline',
    status,
    input: {
      url: 'https://api.example.com/data',
      userId: 'user-123',
      options: { timeout: 5000 },
    },
    stages: [
      {
        index: 0,
        jobs: [
          {
            name: 'fetch-data',
            status: 'done',
            startedAt: new Date(now - 15000),
            finishedAt: new Date(now - 12000),
            artifact: { data: '{"users": [...]}', size: 2048 },
          },
        ],
      },
      {
        index: 1,
        jobs: [
          {
            name: 'validate-schema',
            status: 'done',
            startedAt: new Date(now - 12000),
            finishedAt: new Date(now - 10000),
            artifact: { valid: true, recordCount: 150 },
          },
          {
            name: 'notify-start',
            status: 'done',
            startedAt: new Date(now - 12000),
            finishedAt: new Date(now - 11000),
            artifact: { notified: true },
          },
        ],
      },
      {
        index: 2,
        jobs: [
          {
            name: 'transform-data',
            status: status === 'processing' ? 'processing' : 'done',
            startedAt: new Date(now - 8000),
            finishedAt: status !== 'processing' ? new Date(now - 3000) : undefined,
            artifact: status !== 'processing' ? { transformed: true } : undefined,
          },
        ],
      },
      {
        index: 3,
        jobs: [
          {
            name: 'save-to-db',
            status: status === 'done' ? 'done' : status === 'error' ? 'error' : 'pending',
            startedAt: status !== 'processing' ? new Date(now - 3000) : undefined,
            finishedAt: status === 'done' ? new Date(now - 1000) : status === 'error' ? new Date(now - 500) : undefined,
            artifact: status === 'done' ? { savedCount: 150 } : undefined,
            error: status === 'error' ? { message: 'Database connection timeout' } : undefined,
          },
          {
            name: 'update-cache',
            status: status === 'done' ? 'done' : 'pending',
            startedAt: status === 'done' ? new Date(now - 3000) : undefined,
            finishedAt: status === 'done' ? new Date(now - 2000) : undefined,
          },
        ],
      },
      {
        index: 4,
        jobs: [
          {
            name: 'notify-complete',
            status: status === 'done' ? 'done' : 'pending',
            startedAt: status === 'done' ? new Date(now - 1000) : undefined,
            finishedAt: status === 'done' ? new Date(now - 500) : undefined,
          },
        ],
      },
    ],
    error: status === 'error' ? { message: 'Database connection timeout', jobName: 'save-to-db' } : undefined,
  };

  return basePipeline;
};

export default function HomePage() {
  const [pipeline, setPipeline] = useState<PipelineDisplayData | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDisplayInfo | null>(null);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [isPolling, setIsPolling] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Инициализация на клиенте (избегаем hydration mismatch)
  useEffect(() => {
    setMounted(true);
    setPipeline(createDemoPipeline('processing'));
  }, []);

  // Симуляция polling (в реальном приложении это будет API вызов)
  useEffect(() => {
    if (!mounted || !pipeline || !isPolling || pipeline.status !== 'processing') return;

    const timer = setTimeout(() => {
      // Случайно выбираем следующий статус
      const rand = Math.random();
      if (rand > 0.7) {
        setPipeline(createDemoPipeline('done'));
        setIsPolling(false);
      } else if (rand > 0.9) {
        setPipeline(createDemoPipeline('error'));
        setIsPolling(false);
      }
      // Иначе продолжаем processing
    }, 2000);

    return () => clearTimeout(timer);
  }, [mounted, isPolling, pipeline?.status]);

  const handleJobClick = useCallback((job: JobDisplayInfo) => {
    setSelectedJob(job);
  }, []);

  const handleNewPipeline = useCallback((status: 'processing' | 'done' | 'error') => {
    setPipeline(createDemoPipeline(status));
    setSelectedJob(null);
    setIsPolling(status === 'processing');
  }, []);

  // Не рендерим до монтирования (избегаем hydration mismatch)
  if (!mounted || !pipeline) {
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
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            backgroundColor: 'rgba(19, 19, 26, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(124, 77, 255, 0.2)',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, color: '#7c4dff' }}>
            Демонстрация
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <Button
              variant="contained"
              onClick={() => handleNewPipeline('processing')}
              startIcon={isPolling ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{
                background: 'linear-gradient(135deg, #00e5ff 0%, #00b2cc 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #6effff 0%, #00e5ff 100%)',
                },
              }}
            >
              Новый Pipeline (processing)
            </Button>
            <Button
              variant="contained"
              onClick={() => handleNewPipeline('done')}
              sx={{
                background: 'linear-gradient(135deg, #00e676 0%, #00c853 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #69f0ae 0%, #00e676 100%)',
                },
              }}
            >
              Завершённый Pipeline
            </Button>
            <Button
              variant="contained"
              onClick={() => handleNewPipeline('error')}
              sx={{
                background: 'linear-gradient(135deg, #ff1744 0%, #d50000 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #ff5252 0%, #ff1744 100%)',
                },
              }}
            >
              Pipeline с ошибкой
            </Button>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Chip
              label={showArtifacts ? '📦 Артефакты: ON' : '📦 Артефакты: OFF'}
              onClick={() => setShowArtifacts(!showArtifacts)}
              sx={{
                cursor: 'pointer',
                backgroundColor: showArtifacts ? 'rgba(124, 77, 255, 0.2)' : 'rgba(160, 160, 160, 0.15)',
                color: showArtifacts ? '#7c4dff' : 'text.secondary',
                border: `1px solid ${showArtifacts ? 'rgba(124, 77, 255, 0.3)' : 'rgba(160, 160, 160, 0.3)'}`,
              }}
            />
            <Chip
              label={showInput ? '📥 Input: ON' : '📥 Input: OFF'}
              onClick={() => setShowInput(!showInput)}
              sx={{
                cursor: 'pointer',
                backgroundColor: showInput ? 'rgba(0, 230, 118, 0.2)' : 'rgba(160, 160, 160, 0.15)',
                color: showInput ? '#00e676' : 'text.secondary',
                border: `1px solid ${showInput ? 'rgba(0, 230, 118, 0.3)' : 'rgba(160, 160, 160, 0.3)'}`,
              }}
            />
          </Stack>
        </Paper>

        {/* Визуализация Pipeline */}
        <PipelineViewer
          pipeline={pipeline}
          onJobClick={handleJobClick}
          selectedJobName={selectedJob?.name}
          showArtifacts={showArtifacts}
          showInput={showInput}
        />

        {/* Детали выбранной Job */}
        {selectedJob && (
          <Paper
            elevation={0}
            sx={{
              mt: 4,
              p: 3,
              backgroundColor: 'rgba(124, 77, 255, 0.1)',
              border: '1px solid rgba(124, 77, 255, 0.3)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, color: '#7c4dff' }}>
              📋 Детали Job: {selectedJob.name}
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Chip
                label={`Статус: ${selectedJob.status}`}
                sx={{
                  backgroundColor: 'rgba(0, 229, 255, 0.2)',
                  color: '#00e5ff',
                }}
              />
              {selectedJob.startedAt && (
                <Chip
                  label={`Начало: ${new Date(selectedJob.startedAt).toLocaleTimeString()}`}
                  variant="outlined"
                />
              )}
              {selectedJob.finishedAt && (
                <Chip
                  label={`Конец: ${new Date(selectedJob.finishedAt).toLocaleTimeString()}`}
                  variant="outlined"
                />
              )}
            </Stack>

            {selectedJob.artifact && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  Артефакт:
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#00e676',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {JSON.stringify(selectedJob.artifact, null, 2)}
                </Paper>
              </Box>
            )}

            {selectedJob.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {selectedJob.error.message}
              </Alert>
            )}
          </Paper>
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

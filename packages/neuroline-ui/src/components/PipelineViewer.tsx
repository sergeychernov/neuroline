import React, { useMemo } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import type { PipelineDisplayData, JobDisplayInfo } from '../types';
import { StageColumn } from './StageColumn';
import { StatusBadge } from './StatusBadge';

export interface PipelineViewerProps {
  pipeline: PipelineDisplayData;
  onJobClick?: (job: JobDisplayInfo) => void;
  selectedJobName?: string;
}

/**
 * Главный компонент визуализации Pipeline
 * Отображает stages как колонки, соединённые линиями
 */
export const PipelineViewer: React.FC<PipelineViewerProps> = ({
  pipeline,
  onJobClick,
  selectedJobName,
}) => {
  // Подсчёт статистики
  const stats = useMemo(() => {
    const allJobs = pipeline.stages.flatMap((s) => s.jobs);
    return {
      total: allJobs.length,
      done: allJobs.filter((j) => j.status === 'done').length,
      processing: allJobs.filter((j) => j.status === 'processing').length,
      error: allJobs.filter((j) => j.status === 'error').length,
      pending: allJobs.filter((j) => j.status === 'pending').length,
    };
  }, [pipeline.stages]);

  const progress = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        backgroundColor: 'transparent',
        background: `
          radial-gradient(circle at 10% 20%, rgba(124, 77, 255, 0.06) 0%, transparent 40%),
          radial-gradient(circle at 90% 80%, rgba(0, 229, 255, 0.04) 0%, transparent 40%),
          linear-gradient(180deg, #0a0a0f 0%, #0f0f18 100%)
        `,
        borderRadius: 4,
        border: '1px solid rgba(124, 77, 255, 0.15)',
        minHeight: 400,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Заголовок */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography
            variant="h5"
            sx={{
              color: '#fff',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #7c4dff 0%, #00e5ff 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {pipeline.pipelineType}
          </Typography>
          <StatusBadge status={pipeline.status} size="medium" />
        </Box>

        {/* Прогресс-бар */}
        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              height: 4,
              backgroundColor: 'rgba(124, 77, 255, 0.2)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${progress}%`,
                background:
                  pipeline.status === 'error'
                    ? 'linear-gradient(90deg, #ff1744, #ff5722)'
                    : 'linear-gradient(90deg, #7c4dff, #00e5ff)',
                borderRadius: 2,
                transition: 'width 0.5s ease-out',
              }}
            />
          </Box>
        </Box>

        {/* Статистика */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            label={`${stats.done}/${stats.total} jobs`}
            size="small"
            sx={{
              backgroundColor: 'rgba(0, 230, 118, 0.15)',
              color: '#00e676',
              border: '1px solid rgba(0, 230, 118, 0.3)',
            }}
          />
          <Chip
            label={`${pipeline.stages.length} stages`}
            size="small"
            sx={{
              backgroundColor: 'rgba(124, 77, 255, 0.15)',
              color: '#7c4dff',
              border: '1px solid rgba(124, 77, 255, 0.3)',
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
            ID: {pipeline.pipelineId.slice(0, 12)}...
          </Typography>
        </Box>
      </Box>

      {/* Stages */}
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          overflowX: 'auto',
          pb: 2,
          position: 'relative',
          alignItems: 'flex-start',
        }}
      >
        {pipeline.stages.map((stage, index) => (
          <React.Fragment key={stage.index}>
            <StageColumn
              stage={stage}
              onJobClick={onJobClick}
              selectedJobName={selectedJobName}
            />

            {/* Коннектор между stages */}
            {index < pipeline.stages.length - 1 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  alignSelf: 'center',
                  mt: 5,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 2,
                    background:
                      stage.jobs.every((j) => j.status === 'done')
                        ? 'linear-gradient(90deg, #00e676 0%, #00e5ff 100%)'
                        : 'linear-gradient(90deg, rgba(124, 77, 255, 0.3) 0%, rgba(0, 229, 255, 0.3) 100%)',
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      right: -6,
                      top: -4,
                      border: '5px solid transparent',
                      borderLeft: `8px solid ${stage.jobs.every((j) => j.status === 'done') ? '#00e5ff' : 'rgba(0, 229, 255, 0.3)'
                        }`,
                    },
                  }}
                />
              </Box>
            )}
          </React.Fragment>
        ))}
      </Box>

      {/* Ошибка pipeline */}
      {pipeline.error && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mt: 3,
            backgroundColor: 'rgba(255, 23, 68, 0.1)',
            border: '1px solid rgba(255, 23, 68, 0.3)',
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: '#ff1744' }}>
            ⚠ Ошибка в job "{pipeline.error.jobName}": {pipeline.error.message}
          </Typography>
        </Paper>
      )}
    </Paper>
  );
};

export default PipelineViewer;


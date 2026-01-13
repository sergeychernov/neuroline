import React from 'react';
import { Box, Typography, Paper, Tooltip, Collapse, IconButton, keyframes } from '@mui/material';
import type { JobDisplayInfo } from '../types';
import { StatusBadge } from './StatusBadge';

export interface JobNodeProps {
  job: JobDisplayInfo;
  isSelected?: boolean;
  onClick?: (job: JobDisplayInfo) => void;
  showArtifact?: boolean;
}

const pulse = keyframes`
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.4);
  }
  50% { 
    box-shadow: 0 0 0 10px rgba(0, 229, 255, 0);
  }
`;

const glow = keyframes`
  0%, 100% { 
    filter: brightness(1);
  }
  50% { 
    filter: brightness(1.2);
  }
`;

const statusColors = {
  pending: {
    border: 'rgba(160, 160, 160, 0.3)',
    bg: 'rgba(19, 19, 26, 0.8)',
    glow: 'transparent',
  },
  processing: {
    border: 'rgba(0, 229, 255, 0.5)',
    bg: 'rgba(0, 229, 255, 0.08)',
    glow: 'rgba(0, 229, 255, 0.3)',
  },
  done: {
    border: 'rgba(0, 230, 118, 0.5)',
    bg: 'rgba(0, 230, 118, 0.08)',
    glow: 'rgba(0, 230, 118, 0.2)',
  },
  error: {
    border: 'rgba(255, 23, 68, 0.5)',
    bg: 'rgba(255, 23, 68, 0.08)',
    glow: 'rgba(255, 23, 68, 0.3)',
  },
};

/**
 * Компонент "нейрон" - отображение отдельной Job
 */
export const JobNode: React.FC<JobNodeProps> = ({
  job,
  isSelected = false,
  onClick,
  showArtifact = false,
}) => {
  const colors = statusColors[job.status];
  const isProcessing = job.status === 'processing';

  const formatDuration = () => {
    if (!job.startedAt) return null;
    // Преобразуем даты — могут быть как Date, так и строки из JSON
    const start = job.startedAt instanceof Date ? job.startedAt : new Date(job.startedAt);
    const end = job.finishedAt
      ? job.finishedAt instanceof Date
        ? job.finishedAt
        : new Date(job.finishedAt)
      : new Date();
    const ms = end.getTime() - start.getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const duration = formatDuration();

  return (
    <Paper
      elevation={0}
      onClick={() => onClick?.(job)}
      sx={{
        p: 2,
        minWidth: 180,
        maxWidth: 220,
        backgroundColor: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: 3,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        animation: isProcessing ? `${pulse} 2s ease-in-out infinite` : undefined,
        boxShadow: isSelected
          ? `0 0 20px ${colors.glow}, inset 0 0 30px ${colors.glow}`
          : `0 4px 20px rgba(0, 0, 0, 0.3)`,
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        '&:hover': onClick
          ? {
              transform: 'scale(1.03)',
              boxShadow: `0 0 25px ${colors.glow}`,
              borderColor: colors.border.replace('0.3', '0.6').replace('0.5', '0.8'),
            }
          : {},
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background:
            job.status === 'done'
              ? 'linear-gradient(90deg, #00e676, #00e5ff)'
              : job.status === 'processing'
              ? 'linear-gradient(90deg, #00e5ff, #7c4dff, #00e5ff)'
              : job.status === 'error'
              ? 'linear-gradient(90deg, #ff1744, #ff5722)'
              : 'transparent',
          backgroundSize: isProcessing ? '200% 100%' : '100% 100%',
          animation: isProcessing ? `${glow} 1.5s linear infinite` : undefined,
        },
      }}
    >
      {/* Заголовок */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 700,
            color: '#fff',
            wordBreak: 'break-word',
            lineHeight: 1.3,
          }}
        >
          {job.name}
        </Typography>
      </Box>

      {/* Статус */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <StatusBadge status={job.status} size="small" />
        {duration && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {duration}
          </Typography>
        )}
      </Box>

      {/* Ошибка */}
      {job.error && (
        <Tooltip title={job.error.stack || job.error.message} arrow>
          <Typography
            variant="caption"
            sx={{
              color: '#ff1744',
              display: 'block',
              mt: 1,
              p: 1,
              backgroundColor: 'rgba(255, 23, 68, 0.1)',
              borderRadius: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            ⚠ {job.error.message}
          </Typography>
        </Tooltip>
      )}

      {/* Артефакт (если нужно показать) */}
      {showArtifact && job.artifact !== undefined && (
        <Box
          sx={{
            mt: 1.5,
            p: 1,
            backgroundColor: 'rgba(124, 77, 255, 0.1)',
            borderRadius: 1,
            border: '1px solid rgba(124, 77, 255, 0.2)',
          }}
        >
          <Typography variant="caption" sx={{ color: '#7c4dff', display: 'block', mb: 0.5 }}>
            Результат:
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: 80,
              overflow: 'auto',
              display: 'block',
            }}
          >
            {typeof job.artifact === 'object'
              ? JSON.stringify(job.artifact, null, 2).slice(0, 200)
              : String(job.artifact).slice(0, 200)}
          </Typography>
        </Box>
      )}

      {/* Декоративные "коннекторы" как у нейрона */}
      <Box
        sx={{
          position: 'absolute',
          left: -8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: colors.border,
          border: `2px solid ${colors.bg}`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          right: -8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: job.status === 'done' ? '#00e676' : colors.border,
          border: `2px solid ${colors.bg}`,
        }}
      />
    </Paper>
  );
};

export default JobNode;


import React from 'react';
import { Box, Typography, Paper, Tooltip, Chip, SvgIcon, keyframes } from '@mui/material';
import type { JobDisplayInfo } from '../types';
import { StatusBadge } from './StatusBadge';

/** Replay icon (inline to avoid tree-shaking issues) */
const ReplayIcon: React.FC<{ sx?: object }> = ({ sx }) => (
  <SvgIcon sx={sx}>
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
  </SvgIcon>
);

export interface JobNodeProps {
  job: JobDisplayInfo;
  isSelected?: boolean;
  onClick?: (job: JobDisplayInfo) => void;
  /** Callback при клике на кнопку retry */
  onRetry?: (job: JobDisplayInfo) => void;
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
 * "Neuron" component for rendering a single job
 */
export const JobNode: React.FC<JobNodeProps> = ({
  job,
  isSelected = false,
  onClick,
  onRetry,
}) => {
  const colors = statusColors[job.status];
  const isProcessing = job.status === 'processing';

  const formatDuration = () => {
    if (!job.startedAt) return null;
    // Normalize dates - can be Date or JSON strings
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
      {/* Header */}
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

      {/* Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        {job.errors.length > 0 ? (
          <Tooltip
            title={
              <Typography variant="caption" sx={{ whiteSpace: 'pre-line' }}>
                {/* Показываем последнюю ошибку */}
                {`${job.errors.at(-1)?.message ?? ''}\n${job.errors.at(-1)?.stack ?? ''}`}
              </Typography>
            }
            arrow
          >
            <Box component="span">
              <StatusBadge status={job.status} size="small" />
            </Box>
          </Tooltip>
        ) : (
          <StatusBadge status={job.status} size="small" />
        )}
        {duration && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {duration}
          </Typography>
        )}
        {/* Retry button - show if onRetry provided OR retries configured/happened */}
        {(onRetry || (job.retryCount ?? 0) > 0 || job.maxRetries !== undefined) && (() => {
          const isDisabled = job.status === 'processing' || job.status === 'pending';
          const canRetry = onRetry && !isDisabled;
          const hasRetryInfo = (job.retryCount ?? 0) > 0 || job.maxRetries !== undefined;
          const showLabel = hasRetryInfo;

          return (
            <Tooltip
              title={
                job.status === 'pending'
                  ? 'Not started yet'
                  : job.status === 'processing'
                    ? hasRetryInfo
                      ? `Retry ${job.retryCount ?? 0} of ${job.maxRetries ?? 0} (in progress)`
                      : 'In progress'
                    : canRetry
                      ? hasRetryInfo
                        ? `Retry (${job.retryCount ?? 0}/${job.maxRetries ?? 0}) — click to restart`
                        : 'Click to restart'
                      : `Retry ${job.retryCount ?? 0} of ${job.maxRetries ?? 0}`
              }
              arrow
            >
              <Chip
                icon={<ReplayIcon sx={{ fontSize: 14 }} />}
                label={showLabel ? `${job.retryCount ?? 0}/${job.maxRetries ?? 0}` : undefined}
                size="small"
                disabled={isDisabled}
                onClick={
                  canRetry
                    ? (e) => {
                      e.stopPropagation();
                      onRetry(job);
                    }
                    : undefined
                }
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  backgroundColor: 'rgba(255, 152, 0, 0.2)',
                  color: '#ff9800',
                  border: '1px solid rgba(255, 152, 0, 0.4)',
                  cursor: canRetry ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  // Если нет label — компактный вид
                  ...(!showLabel && {
                    minWidth: 24,
                    '& .MuiChip-label': {
                      display: 'none',
                    },
                    '& .MuiChip-icon': {
                      margin: 0,
                    },
                  }),
                  '&.Mui-disabled': {
                    opacity: 0.5,
                    color: '#ff9800',
                  },
                  '&:hover': canRetry
                    ? {
                      backgroundColor: 'rgba(255, 152, 0, 0.35)',
                      borderColor: 'rgba(255, 152, 0, 0.7)',
                    }
                    : {},
                  '& .MuiChip-icon': {
                    color: 'inherit',
                    marginLeft: '4px',
                  },
                  '& .MuiChip-label': {
                    paddingLeft: '4px',
                    paddingRight: '6px',
                  },
                }}
              />
            </Tooltip>
          );
        })()}
      </Box>

      {/* Decorative connectors like a neuron */}
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


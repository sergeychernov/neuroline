import React from 'react';
import { Chip, keyframes } from '@mui/material';
import type { JobStatus, PipelineStatus } from '../types';

export interface StatusBadgeProps {
  status: JobStatus | PipelineStatus;
  size?: 'small' | 'medium';
}

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const statusConfig: Record<
  JobStatus | PipelineStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: {
    label: 'Ожидание',
    color: '#a0a0a0',
    bgColor: 'rgba(160, 160, 160, 0.15)',
  },
  processing: {
    label: 'Выполняется',
    color: '#00e5ff',
    bgColor: 'rgba(0, 229, 255, 0.15)',
  },
  done: {
    label: 'Готово',
    color: '#00e676',
    bgColor: 'rgba(0, 230, 118, 0.15)',
  },
  error: {
    label: 'Ошибка',
    color: '#ff1744',
    bgColor: 'rgba(255, 23, 68, 0.15)',
  },
};

/**
 * Компонент для отображения статуса Job/Pipeline
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'small' }) => {
  const config = statusConfig[status];

  return (
    <Chip
      label={config.label}
      size={size}
      sx={{
        color: config.color,
        backgroundColor: config.bgColor,
        border: `1px solid ${config.color}40`,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.625rem' : '0.75rem',
        height: size === 'small' ? 20 : 24,
        animation: status === 'processing' ? `${pulse} 1.5s ease-in-out infinite` : undefined,
        '& .MuiChip-label': {
          px: 1,
        },
      }}
    />
  );
};

export default StatusBadge;


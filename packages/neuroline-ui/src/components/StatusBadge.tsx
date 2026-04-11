import React from 'react';
import { Chip, SvgIcon, keyframes, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { JobStatus, PipelineStatus } from '../types';

export interface StatusBadgeProps {
  status: JobStatus | PipelineStatus;
  size?: 'small' | 'medium';
  /** `icon` — только компактная иконка без текста (для compact / one-line в JobNode) */
  variant?: 'default' | 'icon';
  /** Не задавать нативный `title` у варианта `icon` (подсказку даёт родитель, например MUI Tooltip) */
  suppressNativeTitle?: boolean;
}

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

/** Вращение по часовой стрелке — совпадает с дугой иконки refresh */
const spinCw = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const statusBadgeLabels: Record<JobStatus | PipelineStatus, string> = {
  pending: 'Pending',
  awaiting_manual: 'Awaiting manual',
  processing: 'Processing',
  done: 'Done',
  error: 'Error',
};

/** Визуал для тёмной темы (неон) */
const statusBadgeDarkVisuals: Record<
  JobStatus | PipelineStatus,
  { color: string; bgColor: string }
> = {
  pending: {
    color: '#a0a0a0',
    bgColor: 'rgba(160, 160, 160, 0.15)',
  },
  awaiting_manual: {
    color: '#ffab00',
    bgColor: 'rgba(255, 171, 0, 0.15)',
  },
  processing: {
    color: '#00e5ff',
    bgColor: 'rgba(0, 229, 255, 0.15)',
  },
  done: {
    color: '#00e676',
    bgColor: 'rgba(0, 230, 118, 0.15)',
  },
  error: {
    color: '#ff1744',
    bgColor: 'rgba(255, 23, 68, 0.15)',
  },
};

function getStatusBadgeVisuals(
  theme: Theme,
  status: JobStatus | PipelineStatus,
): { color: string; bgColor: string } {
  if (theme.palette.mode === 'dark') {
    return statusBadgeDarkVisuals[status];
  }
  const p = theme.palette;
  switch (status) {
    case 'pending':
      return {
        color: p.text.secondary,
        bgColor: alpha(p.common.black, 0.08),
      };
    case 'awaiting_manual':
      return {
        color: p.warning.dark,
        bgColor: alpha(p.warning.main, 0.2),
      };
    case 'processing':
      return {
        color: p.secondary.dark,
        bgColor: alpha(p.secondary.main, 0.2),
      };
    case 'done':
      return {
        color: p.success.dark,
        bgColor: alpha(p.success.main, 0.2),
      };
    case 'error':
      return {
        color: p.error.dark,
        bgColor: alpha(p.error.main, 0.16),
      };
    default:
      return statusBadgeDarkVisuals[status];
  }
}

/** Подпись статуса для aria / Tooltip (совпадает с подписью бейджа) */
export function getStatusBadgeLabel(status: JobStatus | PipelineStatus): string {
  return statusBadgeLabels[status];
}

/** Компактные SVG-иконки по статусу (viewBox 0 0 24 24) */
const StatusGlyph: React.FC<{
  status: JobStatus | PipelineStatus;
}> = ({ status }) => {
  const base = { fontSize: 14, display: 'block' as const };

  switch (status) {
    case 'pending':
      return (
        <SvgIcon sx={base} viewBox="0 0 24 24">
          <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </SvgIcon>
      );
    case 'awaiting_manual':
      return (
        <SvgIcon sx={base} viewBox="0 0 24 24">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </SvgIcon>
      );
    case 'processing':
      return (
        <SvgIcon
          sx={{
            ...base,
            animation: `${spinCw} 1.2s linear infinite`,
          }}
          viewBox="0 0 24 24"
        >
          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
        </SvgIcon>
      );
    case 'done':
      return (
        <SvgIcon sx={base} viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </SvgIcon>
      );
    case 'error':
      return (
        <SvgIcon sx={base} viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </SvgIcon>
      );
  }
};

/**
 * Component for displaying job/pipeline status
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'small',
  variant = 'default',
  suppressNativeTitle = false,
}) => {
  const theme = useTheme();
  const visuals = getStatusBadgeVisuals(theme, status);
  const label = statusBadgeLabels[status];
  const isIcon = variant === 'icon';

  if (isIcon) {
    return (
      <Chip
        icon={<StatusGlyph status={status} />}
        aria-label={label}
        title={suppressNativeTitle ? undefined : label}
        size="small"
        sx={{
          color: visuals.color,
          backgroundColor: visuals.bgColor,
          border: `1px solid ${alpha(visuals.color, 0.45)}`,
          height: 20,
          minWidth: 20,
          width: 20,
          padding: 0,
          '& .MuiChip-icon': {
            margin: 0,
            color: 'inherit',
          },
          '& .MuiChip-label': {
            display: 'none',
            padding: 0,
            width: 0,
          },
        }}
      />
    );
  }

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        color: visuals.color,
        backgroundColor: visuals.bgColor,
        border: `1px solid ${alpha(visuals.color, 0.45)}`,
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

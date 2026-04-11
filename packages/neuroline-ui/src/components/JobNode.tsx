import React, { useMemo } from 'react';
import { Box, Typography, Paper, Tooltip, Chip, SvgIcon, keyframes, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import type { JobDisplayInfo, JobNodeDisplayMode } from '../types';
import { StatusBadge, getStatusBadgeLabel } from './StatusBadge';

/** Replay icon (inline to avoid tree-shaking issues) */
const ReplayIcon: React.FC<{ sx?: object }> = ({ sx }) => (
  <SvgIcon sx={sx}>
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
  </SvgIcon>
);

/** Play icon — green triangle for manual job run */
const PlayIcon: React.FC<{ sx?: object }> = ({ sx }) => (
  <SvgIcon sx={sx}>
    <path d="M8 5v14l11-7z" />
  </SvgIcon>
);

export interface JobNodeProps {
  job: JobDisplayInfo;
  isSelected?: boolean;
  onClick?: (job: JobDisplayInfo) => void;
  /** Callback при клике на кнопку retry */
  onRetry?: (job: JobDisplayInfo) => void;
  /** Callback при клике на кнопку run для manual job (awaiting_manual) */
  onRunManual?: (job: JobDisplayInfo) => void;
  /**
   * Режим отображения: details — полное имя и длительность;
   * compact — аббревиатура имени, без времени;
   * one-line — аббревиатура, всё в одну строку (время показывается при наличии).
   */
  jobDisplay?: JobNodeDisplayMode;
  /** Растянуть карточку на ширину родителя (например в StageColumnDenseLayout + one-line) */
  fullWidth?: boolean;
}

/**
 * Аббревиатура из имён вида very-long-job-name → VLJN (первая буква/цифра каждого сегмента).
 * Учитывает kebab-case, snake_case, точки и границы camelCase.
 */
export function jobNameToAbbreviation(name: string): string {
  const spaced = name
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[\s_\-./]+/g, ' ')
    .trim();
  const parts = spaced.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return name.slice(0, 8).toUpperCase();
  }
  if (parts.length === 1) {
    const w = parts[0].replace(/[^a-zA-Z0-9]/g, '');
    if (!w) return name.slice(0, 8).toUpperCase();
    return w[0].toUpperCase();
  }
  return parts
    .map((p) => {
      const m = p.match(/[a-zA-Z0-9]/);
      return m ? m[0].toUpperCase() : '';
    })
    .join('');
}

const glow = keyframes`
  0%, 100% { 
    filter: brightness(1);
  }
  50% { 
    filter: brightness(1.2);
  }
`;

/** Как у Tooltip на Chip-кнопках retry / run manual: MUI, стрелка, те же задержка и анимация */
const jobNodeChipTooltipProps = { arrow: true as const };

const statusColors = {
  pending: {
    border: 'rgba(160, 160, 160, 0.3)',
    bg: 'rgba(19, 19, 26, 0.8)',
    glow: 'transparent',
  },
  awaiting_manual: {
    border: 'rgba(255, 171, 0, 0.5)',
    bg: 'rgba(255, 171, 0, 0.08)',
    glow: 'rgba(255, 171, 0, 0.25)',
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

function jobNodeStatusSurface(
  theme: Theme,
  status: JobDisplayInfo['status'],
): { border: string; hoverBorder: string; bg: string; glow: string } {
  if (theme.palette.mode === 'dark') {
    const dark = statusColors[status];
    return {
      ...dark,
      hoverBorder: dark.border.replace('0.3', '0.6').replace('0.5', '0.8'),
    };
  }
  const p = theme.palette;
  const light: Record<
    JobDisplayInfo['status'],
    { border: string; hoverBorder: string; bg: string; glow: string }
  > = {
    pending: {
      border: alpha(p.text.secondary, 0.55),
      hoverBorder: alpha(p.text.secondary, 0.85),
      bg: alpha(p.common.black, 0.06),
      glow: 'transparent',
    },
    awaiting_manual: {
      border: alpha(p.warning.dark, 0.78),
      hoverBorder: alpha(p.warning.dark, 1),
      bg: alpha(p.warning.main, 0.16),
      glow: alpha(p.warning.dark, 0.38),
    },
    processing: {
      border: alpha(p.secondary.dark, 0.88),
      hoverBorder: alpha(p.secondary.dark, 1),
      bg: alpha(p.secondary.main, 0.14),
      glow: alpha(p.secondary.dark, 0.42),
    },
    done: {
      border: alpha(p.success.dark, 0.88),
      hoverBorder: alpha(p.success.dark, 1),
      bg: alpha(p.success.main, 0.14),
      glow: alpha(p.success.dark, 0.35),
    },
    error: {
      border: alpha(p.error.dark, 0.88),
      hoverBorder: alpha(p.error.dark, 1),
      bg: alpha(p.error.main, 0.12),
      glow: alpha(p.error.dark, 0.42),
    },
  };
  return light[status];
}

/**
 * "Neuron" component for rendering a single job
 */
export const JobNode: React.FC<JobNodeProps> = ({
  job,
  isSelected = false,
  onClick,
  onRetry,
  onRunManual,
  jobDisplay = 'details',
  fullWidth = false,
}) => {
  const theme = useTheme();
  const colors = jobNodeStatusSurface(theme, job.status);
  const processingPulse = useMemo(
    () =>
      keyframes`
  0%, 100% { 
    box-shadow: 0 0 0 0 ${alpha(theme.palette.secondary.main, theme.palette.mode === 'light' ? 0.32 : 0.4)};
  }
  50% { 
    box-shadow: 0 0 0 10px ${alpha(theme.palette.secondary.main, 0)};
  }
`,
    [theme.palette.mode, theme.palette.secondary.main],
  );
  const isProcessing = job.status === 'processing';
  const isOneLine = jobDisplay === 'one-line';
  const isCompact = jobDisplay === 'compact';
  const stretch = fullWidth && isOneLine;
  const useAbbrev = isCompact || isOneLine;
  const titleLabel = useAbbrev ? jobNameToAbbreviation(job.name) : job.name;
  const showDuration = !isCompact;

  const formatDuration = () => {
    if (!job.startedAt) return null;
    const start = job.startedAt instanceof Date ? job.startedAt : new Date(job.startedAt);
    const rawEnd = job.finishedAt
      ? job.finishedAt instanceof Date
        ? job.finishedAt
        : new Date(job.finishedAt)
      : null;
    const end = rawEnd && rawEnd.getTime() >= start.getTime() ? rawEnd : new Date();
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
      sx={(t) => ({
        p: isOneLine ? 0.5 : isCompact ? 0.35 : 0.3,
        minWidth: stretch ? 0 : isOneLine ? 'auto' : isCompact ? 96 : 120,
        maxWidth: stretch ? 'none' : isOneLine ? 520 : isCompact ? 168 : 220,
        width: stretch ? '100%' : undefined,
        boxSizing: stretch ? 'border-box' : undefined,
        backgroundColor: colors.bg,
        border: `0.5px solid ${colors.border}`,
        borderRadius: 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        animation: isProcessing ? `${processingPulse} 2s ease-in-out infinite` : undefined,
        boxShadow: isSelected
          ? `0 0 20px ${colors.glow}, inset 0 0 30px ${colors.glow}`
          : `0 4px 20px ${t.palette.mode === 'light' ? alpha(t.palette.common.black, 0.12) : 'rgba(0, 0, 0, 0.3)'}`,
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        '&:hover': onClick
          ? {
            transform: 'scale(1.03)',
            boxShadow: `0 0 25px ${colors.glow}`,
            borderColor: colors.hoverBorder,
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
              ? `linear-gradient(90deg, ${t.palette.success.main}, ${t.palette.secondary.main})`
              : job.status === 'processing'
                ? `linear-gradient(90deg, ${t.palette.secondary.main}, ${t.palette.primary.main}, ${t.palette.secondary.main})`
                : job.status === 'awaiting_manual'
                  ? `linear-gradient(90deg, ${t.palette.warning.main}, ${t.palette.warning.light})`
                  : job.status === 'error'
                    ? `linear-gradient(90deg, ${t.palette.error.main}, ${t.palette.error.light})`
                    : 'transparent',
          backgroundSize: isProcessing ? '200% 100%' : '100% 100%',
          animation: isProcessing ? `${glow} 1.5s linear infinite` : undefined,
        },
      })}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: isOneLine ? 'row' : 'column',
          alignItems: isOneLine ? 'center' : 'stretch',
          justifyContent: stretch ? 'flex-start' : undefined,
          gap: isOneLine ? 1 : 0,
          width: '100%',
          minWidth: 0,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: isOneLine ? 0 : isCompact ? 0.75 : 1.5,
            flexShrink: isOneLine ? 0 : undefined,
            flex: stretch ? '1 1 auto' : undefined,
            minWidth: stretch ? 0 : undefined,
            overflow: stretch ? 'hidden' : undefined,
          }}
        >
          {useAbbrev ? (
            <Tooltip title={job.name} arrow placement="top">
              <Typography
                variant="body1"
                component="span"
                noWrap={isOneLine}
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  lineHeight: 1.3,
                  letterSpacing: '0.06em',
                  cursor: 'inherit',
                  display: stretch ? 'block' : 'inline-block',
                  maxWidth: stretch ? 'none' : isOneLine ? 120 : '100%',
                }}
                fontSize={isCompact ? 10 : 12}
              >
                {titleLabel}
              </Typography>
            </Tooltip>
          ) : (
            <Typography
              variant="body1"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                wordBreak: 'break-word',
                lineHeight: 1.3,
              }}
              fontSize={12}
            >
              {job.name}
            </Typography>
          )}
        </Box>

        {/* Status */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: isOneLine ? 0.5 : 1,
            mb: isOneLine ? 0 : isCompact ? 0.5 : 1,
            flexWrap: isOneLine ? 'nowrap' : 'wrap',
            flex: isOneLine && !stretch ? '1 1 auto' : undefined,
            flexShrink: stretch ? 0 : undefined,
            minWidth: 0,
            ml: stretch ? 'auto' : undefined,
          }}
        >
        {job.errors.length > 0 ? (
          <Tooltip
            {...jobNodeChipTooltipProps}
            title={
              [job.errors.at(-1)?.message, job.errors.at(-1)?.stack].filter(Boolean).join('\n') ||
              getStatusBadgeLabel(job.status)
            }
            slotProps={{
              tooltip: {
                sx: { whiteSpace: 'pre-line', maxWidth: 360 },
              },
            }}
          >
            <Box component="span">
              <StatusBadge
                status={job.status}
                size="small"
                variant={useAbbrev ? 'icon' : 'default'}
                suppressNativeTitle={useAbbrev}
              />
            </Box>
          </Tooltip>
        ) : useAbbrev ? (
          <Tooltip {...jobNodeChipTooltipProps} title={getStatusBadgeLabel(job.status)}>
            <Box component="span">
              <StatusBadge
                status={job.status}
                size="small"
                variant="icon"
                suppressNativeTitle
              />
            </Box>
          </Tooltip>
        ) : (
          <StatusBadge status={job.status} size="small" variant="default" />
        )}
        {showDuration && duration && (
          <Typography
            variant="caption"
            noWrap={isOneLine}
            sx={{ color: 'text.secondary', flexShrink: isOneLine ? 0 : undefined }}
          >
            {duration}
          </Typography>
        )}
        {/* Run manual button - show for awaiting_manual if onRunManual provided */}
        {job.status === 'awaiting_manual' && onRunManual && (
          <Tooltip {...jobNodeChipTooltipProps} title="Click to run">
            <Chip
              icon={<PlayIcon sx={{ fontSize: 14 }} />}
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onRunManual(job);
              }}
              sx={{
                height: 20,
                fontSize: '0.7rem',
                backgroundColor: 'rgba(0, 230, 118, 0.2)',
                color: '#00e676',
                border: '1px solid rgba(0, 230, 118, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: 24,
                '& .MuiChip-label': {
                  display: 'none',
                },
                '& .MuiChip-icon': {
                  margin: 0,
                  color: 'inherit',
                },
                '&:hover': {
                  backgroundColor: 'rgba(0, 230, 118, 0.35)',
                  borderColor: 'rgba(0, 230, 118, 0.7)',
                },
              }}
            />
          </Tooltip>
        )}
        {/* Retry button — не показываем при awaiting_manual (там только run manual по доке) */}
        {job.status !== 'awaiting_manual' &&
          (onRetry || (job.retryCount ?? 0) > 0 || job.maxRetries !== undefined) &&
          (() => {
          const isDisabled = job.status === 'processing' || job.status === 'pending';
          const canRetry = onRetry && !isDisabled;
          const hasRetryInfo = (job.retryCount ?? 0) > 0 || job.maxRetries !== undefined;
          const showLabel = hasRetryInfo;

          return (
            <Tooltip
              {...jobNodeChipTooltipProps}
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
      </Box>

      {/* Decorative connectors like a neuron */}
      {!stretch && (
        <>
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
            sx={(t) => ({
              position: 'absolute',
              right: -8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: job.status === 'done' ? t.palette.success.main : colors.border,
              border: `2px solid ${colors.bg}`,
            })}
          />
        </>
      )}
    </Paper>
  );
};

export default JobNode;


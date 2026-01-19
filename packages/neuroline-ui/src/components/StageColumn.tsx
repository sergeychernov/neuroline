import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import type { StageDisplayInfo, JobDisplayInfo } from '../types';
import { JobNode } from './JobNode';

export interface StageColumnProps {
  stage: StageDisplayInfo;
  onJobClick?: (job: JobDisplayInfo) => void;
  selectedJobName?: string;
}

/**
 * Stage column - contains one or more jobs (parallel)
 */
export const StageColumn: React.FC<StageColumnProps> = ({
  stage,
  onJobClick,
  selectedJobName,
}) => {
  const isParallel = stage.jobs.length > 1;

  // Determine stage status
  const stageStatus = (() => {
    if (stage.jobs.some((j) => j.status === 'error')) return 'error';
    if (stage.jobs.some((j) => j.status === 'processing')) return 'processing';
    if (stage.jobs.every((j) => j.status === 'done')) return 'done';
    return 'pending';
  })();

  const statusColors = {
    pending: '#a0a0a0',
    processing: '#00e5ff',
    done: '#00e676',
    error: '#ff1744',
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {/* Stage header */}
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 0.5,
          backgroundColor: 'rgba(19, 19, 26, 0.6)',
          border: `1px solid ${statusColors[stageStatus]}30`,
          borderRadius: 2,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: statusColors[stageStatus],
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Stage {stage.index + 1}
          {isParallel && (
            <Box
              component="span"
              sx={{
                ml: 1,
                px: 0.5,
                py: 0.25,
                backgroundColor: 'rgba(124, 77, 255, 0.2)',
                borderRadius: 0.5,
                fontSize: '0.6rem',
              }}
            >
              ∥ {stage.jobs.length}
            </Box>
          )}
        </Typography>
      </Paper>

      {/* Jobs */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          position: 'relative',
        }}
      >
        {/* Line for parallel jobs */}
        {isParallel && (
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: 'rgba(124, 77, 255, 0.2)',
              transform: 'translateX(-50%)',
              zIndex: 0,
            }}
          />
        )}

        {stage.jobs.map((job) => (
          <JobNode
            key={job.name}
            job={job}
            isSelected={job.name === selectedJobName}
            onClick={onJobClick}
          />
        ))}
      </Box>
    </Box>
  );
};

export default StageColumn;


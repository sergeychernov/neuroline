import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import type { StageDisplayInfo } from '../../../types';
import {
	STAGE_COLUMN_DENSE_INSET,
	STAGE_COLUMN_STATUS_COLORS,
	type StageColumnAggregateStatus,
} from './stageColumnDerived';

export interface StageColumnHeaderProps {
	stage: StageDisplayInfo;
	isParallel: boolean;
	stageStatus: StageColumnAggregateStatus;
	density: 'default' | 'dense';
	/**
	 * Встроенный заголовок без отдельной рамки — для единого контейнера (StageColumnDenseLayout).
	 */
	embedded?: boolean;
}

export const StageColumnHeader: React.FC<StageColumnHeaderProps> = ({
	stage,
	isParallel,
	stageStatus,
	density,
	embedded = false,
}) => {
	const isDense = density === 'dense';
	const color = STAGE_COLUMN_STATUS_COLORS[stageStatus];

	const title = (
		<Typography
			variant="caption"
			component="div"
			sx={{
				color,
				fontWeight: 700,
				textTransform: 'uppercase',
				letterSpacing: isDense ? '0.01em' : '0.1em',
				fontSize: isDense ? '0.65rem' : undefined,
				lineHeight: isDense ? 1.15 : undefined,
			}}
		>
			Stage {stage.index + 1}
			{isParallel && (
				<Box
					component="span"
					sx={{
						ml: isDense ? 0.5 : 1,
						px: isDense ? 0.35 : 0.5,
						py: isDense ? 0.1 : 0.25,
						backgroundColor: 'rgba(124, 77, 255, 0.2)',
						borderRadius: 0.5,
						fontSize: isDense ? '0.55rem' : '0.6rem',
					}}
				>
					∥ {stage.jobs.length}
				</Box>
			)}
		</Typography>
	);

	if (embedded) {
		return (
			<Box
				sx={{
					width: '100%',
					minWidth: 0,
					px: isDense ? STAGE_COLUMN_DENSE_INSET : 1.5,
					...(isDense
						? { pt: STAGE_COLUMN_DENSE_INSET, pb: 0 }
						: { py: 0.75 }),
					borderBottom: `1px solid ${color}22`,
				}}
			>
				{title}
			</Box>
		);
	}

	return (
		<Paper
			elevation={0}
			sx={{
				px: isDense ? 1.5 : 2,
				py: isDense ? 0.35 : 0.5,
				backgroundColor: 'rgba(19, 19, 26, 0.6)',
				border: `1px solid ${color}30`,
				borderRadius: 2,
			}}
		>
			{title}
		</Paper>
	);
};

import React from 'react';
import { Box } from '@mui/material';
import type { StageDisplayInfo } from '../../../types';
import { StageColumnHeader } from './StageColumnHeader';
import type { StageColumnAggregateStatus } from './stageColumnDerived';

export interface StageColumnStackedLayoutProps {
	stage: StageDisplayInfo;
	isParallel: boolean;
	stageStatus: StageColumnAggregateStatus;
	children: React.ReactNode;
}

/**
 * Стандартная колонка stage: заголовок и jobs по центру.
 */
export const StageColumnStackedLayout: React.FC<StageColumnStackedLayoutProps> = ({
	stage,
	isParallel,
	stageStatus,
	children,
}) => (
	<Box
		sx={{
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			gap: 2,
		}}
	>
		<StageColumnHeader
			stage={stage}
			isParallel={isParallel}
			stageStatus={stageStatus}
			density="default"
		/>
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</Box>
	</Box>
);

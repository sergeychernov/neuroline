import React from 'react';
import { Box } from '@mui/material';
import type { StageDisplayInfo } from '../../../types';
import {
	STAGE_COLUMN_DENSE_INSET,
	STAGE_COLUMN_DENSE_VERTICAL_GUTTER,
	STAGE_COLUMN_STATUS_COLORS,
	type StageColumnAggregateStatus,
} from './stageColumnDerived';
import { StageColumnHeader } from './StageColumnHeader';

export interface StageColumnDenseLayoutProps {
	stage: StageDisplayInfo;
	isParallel: boolean;
	stageStatus: StageColumnAggregateStatus;
	children: React.ReactNode;
	/** Растянуть на ширину родителя (в `PipelineViewerVerticalLayout` родитель по содержимому — не на весь экран) */
	fillHorizontal?: boolean;
}

/**
 * Плотная колонка stage: один внешний контейнер, заголовок без отдельной рамки,
 * дочерние JobNode с fullWidth растягиваются на ширину контейнера (равная самой широкой строке).
 */
export const StageColumnDenseLayout: React.FC<StageColumnDenseLayoutProps> = ({
	stage,
	isParallel,
	stageStatus,
	children,
	fillHorizontal = false,
}) => {
	const color = STAGE_COLUMN_STATUS_COLORS[stageStatus];

	return (
		<Box
			sx={{
				display: fillHorizontal ? 'grid' : 'inline-grid',
				gridTemplateColumns: fillHorizontal ? 'minmax(0, 1fr)' : 'minmax(0, max-content)',
				width: fillHorizontal ? '100%' : undefined,
				maxWidth: '100%',
				backgroundColor: 'rgba(19, 19, 26, 0.75)',
				border: `1px solid ${color}40`,
				borderRadius: 1,
				overflow: 'hidden',
			}}
		>
			<StageColumnHeader
				stage={stage}
				isParallel={isParallel}
				stageStatus={stageStatus}
				density="dense"
				embedded
			/>
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'stretch',
					gap: 0.5,
					px: STAGE_COLUMN_DENSE_INSET,
					pb: STAGE_COLUMN_DENSE_INSET,
					pt: STAGE_COLUMN_DENSE_VERTICAL_GUTTER,
					minWidth: 0,
					width: '100%',
				}}
			>
				{children}
			</Box>
		</Box>
	);
};

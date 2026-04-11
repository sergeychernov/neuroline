import React from 'react';
import { Box, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { StageDisplayInfo } from '../../../types';
import {
	STAGE_COLUMN_DENSE_INSET,
	STAGE_COLUMN_DENSE_VERTICAL_GUTTER,
	getStageColumnStatusColor,
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
	const theme = useTheme();
	const color = getStageColumnStatusColor(theme, stageStatus);

	return (
		<Box
			sx={(theme) => ({
				display: fillHorizontal ? 'grid' : 'inline-grid',
				gridTemplateColumns: fillHorizontal ? 'minmax(0, 1fr)' : 'minmax(0, max-content)',
				width: fillHorizontal ? '100%' : undefined,
				maxWidth: '100%',
				backgroundColor:
					theme.palette.mode === 'dark'
						? 'rgba(19, 19, 26, 0.75)'
						: alpha(theme.palette.common.black, 0.045),
				border: `1px solid ${alpha(color, 0.25)}`,
				borderRadius: 1,
				overflow: 'hidden',
			})}
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

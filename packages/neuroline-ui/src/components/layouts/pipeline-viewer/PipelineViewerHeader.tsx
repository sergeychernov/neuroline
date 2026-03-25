import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import type { PipelineDisplayData } from '../../../types';
import { StatusBadge } from '../../StatusBadge';
import type { PipelineViewerStats } from './usePipelineViewerStats';

export interface PipelineViewerHeaderProps {
	pipeline: PipelineDisplayData;
	stats: PipelineViewerStats;
	/** Плотность шапки: detailed — как раньше; compact — меньше отступы и типографика */
	density: 'detailed' | 'compact';
}

/**
 * Заголовок пайплайна: тип, статус, прогресс, чипы.
 */
export const PipelineViewerHeader: React.FC<PipelineViewerHeaderProps> = ({
	pipeline,
	stats,
	density,
}) => {
	const progress = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
	const isCompact = density === 'compact';

	return (
		<Box sx={{ mb: isCompact ? 2 : 4 }}>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: isCompact ? 1.5 : 2, mb: isCompact ? 1 : 2 }}>
				<Typography
					variant={isCompact ? 'h6' : 'h5'}
					sx={{
						color: '#fff',
						fontWeight: 700,
						background: 'linear-gradient(135deg, #7c4dff 0%, #00e5ff 100%)',
						backgroundClip: 'text',
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
					}}
				>
					{pipeline.pipelineType}
				</Typography>
				<StatusBadge status={pipeline.status} size={isCompact ? 'small' : 'medium'} variant={isCompact ? 'icon' : 'default'} />
			</Box>

			{!isCompact &&
				<Box sx={{ mb: 1 }}>
					<Box
						sx={{
							height: 4,
							backgroundColor: 'rgba(124, 77, 255, 0.2)',
							borderRadius: 2,
							overflow: 'hidden',
						}}
					>
						<Box
							sx={{
								height: '100%',
								width: `${progress}%`,
								background:
									pipeline.status === 'error'
										? 'linear-gradient(90deg, #ff1744, #ff5722)'
										: 'linear-gradient(90deg, #7c4dff, #00e5ff)',
								borderRadius: 2,
								transition: 'width 0.5s ease-out',
							}}
						/>
					</Box>
				</Box>
			}

			<Box sx={{ display: 'flex', gap: isCompact ? 1 : 2, flexWrap: 'wrap' }}>
				{!isCompact
					&& <Chip
						label={`${stats.done}/${stats.total} jobs`}
						size="small"
						sx={{
							backgroundColor: 'rgba(0, 230, 118, 0.15)',
							color: '#00e676',
							border: '1px solid rgba(0, 230, 118, 0.3)',
						}}
					/>
				}
				{!isCompact
					&& <Chip
						label={`${pipeline.stages.length} stages`}
						size="small"
						sx={{
							backgroundColor: 'rgba(124, 77, 255, 0.15)',
							color: '#7c4dff',
							border: '1px solid rgba(124, 77, 255, 0.3)',
						}}
					/>
				}
				<Typography
					variant="caption"
					sx={{ color: 'text.secondary', alignSelf: 'center', fontSize: isCompact ? '0.65rem' : undefined }}
				>
					ID: {pipeline.pipelineId}
				</Typography>
			</Box>
		</Box>
	);
};

import React from 'react';
import { Box } from '@mui/material';
import { JobNode } from '../../JobNode';
import { getStageColumnDerived } from '../stage-column/stageColumnDerived';
import { StageColumnStackedLayout } from '../stage-column/StageColumnStackedLayout';
import { PipelineViewerPaper } from './PipelineViewerPaper';
import { PipelineViewerHeader } from './PipelineViewerHeader';
import { usePipelineViewerStats } from './usePipelineViewerStats';
import type { PipelineViewerLayoutProps } from './pipelineViewerLayoutTypes';

/**
 * Горизонтальный ряд стадий, компактная шапка, карточки job в режиме compact.
 */
export const PipelineViewerCompactLayout: React.FC<PipelineViewerLayoutProps> = ({
	pipeline,
	onJobClick,
	onJobRetry,
	onJobRunManual,
	selectedJobName,
}) => {
	const stats = usePipelineViewerStats(pipeline);

	return (
		<PipelineViewerPaper sx={{ p: 2 }}>
			<PipelineViewerHeader pipeline={pipeline} stats={stats} density="detailed" />

			<Box
				sx={{
					display: 'flex',
					gap: 2,
					overflowX: 'auto',
					pb: 1,
					position: 'relative',
					alignItems: 'flex-start',
				}}
			>
				{pipeline.stages.map((stage, index) => {
					const { isParallel, stageStatus } = getStageColumnDerived(stage);
					return (
						<React.Fragment key={stage.index}>
							<StageColumnStackedLayout
								stage={stage}
								isParallel={isParallel}
								stageStatus={stageStatus}
							>
								{stage.jobs.map((job) => (
									<JobNode
										key={job.name}
										job={job}
										isSelected={job.name === selectedJobName}
										onClick={onJobClick}
										onRetry={onJobRetry}
										onRunManual={onJobRunManual}
										jobDisplay="compact"
									/>
								))}
							</StageColumnStackedLayout>

							{index < pipeline.stages.length - 1 && (
								<Box
									sx={{
										display: 'flex',
										alignItems: 'center',
										alignSelf: 'center',
										mt: 4,
									}}
								>
									<Box
										sx={{
											width: 32,
											height: 2,
											background: stage.jobs.every((j) => j.status === 'done')
												? 'linear-gradient(90deg, #00e676 0%, #00e5ff 100%)'
												: 'linear-gradient(90deg, rgba(124, 77, 255, 0.3) 0%, rgba(0, 229, 255, 0.3) 100%)',
											position: 'relative',
											'&::after': {
												content: '""',
												position: 'absolute',
												right: -5,
												top: -3,
												border: '4px solid transparent',
												borderLeft: `7px solid ${
													stage.jobs.every((j) => j.status === 'done')
														? '#00e5ff'
														: 'rgba(0, 229, 255, 0.3)'
												}`,
											},
										}}
									/>
								</Box>
							)}
						</React.Fragment>
					);
				})}
			</Box>
		</PipelineViewerPaper>
	);
};

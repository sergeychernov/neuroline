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
 * Горизонтальный ряд стадий, полная шапка, карточки job в режиме details.
 */
export const PipelineViewerDetailedLayout: React.FC<PipelineViewerLayoutProps> = ({
	pipeline,
	onJobClick,
	onJobRetry,
	onJobRunManual,
	selectedJobName,
}) => {
	const stats = usePipelineViewerStats(pipeline);

	return (
		<PipelineViewerPaper>
			<PipelineViewerHeader pipeline={pipeline} stats={stats} density="detailed" />

			<Box
				sx={{
					display: 'flex',
					gap: 3,
					overflowX: 'auto',
					pb: 2,
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
										jobDisplay="details"
									/>
								))}
							</StageColumnStackedLayout>

							{index < pipeline.stages.length - 1 && (
								<Box
									sx={{
										display: 'flex',
										alignItems: 'center',
										alignSelf: 'center',
										mt: 5,
									}}
								>
									<Box
										sx={{
											width: 40,
											height: 2,
											background: stage.jobs.every((j) => j.status === 'done')
												? 'linear-gradient(90deg, #00e676 0%, #00e5ff 100%)'
												: 'linear-gradient(90deg, rgba(124, 77, 255, 0.3) 0%, rgba(0, 229, 255, 0.3) 100%)',
											position: 'relative',
											'&::after': {
												content: '""',
												position: 'absolute',
												right: -6,
												top: -4,
												border: '5px solid transparent',
												borderLeft: `8px solid ${
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

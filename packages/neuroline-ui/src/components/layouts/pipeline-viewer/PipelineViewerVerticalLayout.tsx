import React from 'react';
import { Box } from '@mui/material';
import { JobNode } from '../../JobNode';
import { getStageColumnDerived } from '../stage-column/stageColumnDerived';
import { StageColumnDenseLayout } from '../stage-column/StageColumnDenseLayout';
import { PipelineViewerPaper } from './PipelineViewerPaper';
import { PipelineViewerHeader } from './PipelineViewerHeader';
import { usePipelineViewerStats } from './usePipelineViewerStats';
import type { PipelineViewerLayoutProps } from './pipelineViewerLayoutTypes';

/**
 * Вертикальная цепочка стадий, компактная шапка, карточки job в режиме one-line.
 * Ширина блока — по самому широкому внутреннему элементу (не на весь экран); `maxWidth: 100%` — уместиться в popup.
 */
export const PipelineViewerVerticalLayout: React.FC<PipelineViewerLayoutProps> = ({
	pipeline,
	onJobClick,
	onJobRetry,
	onJobRunManual,
	selectedJobName,
}) => {
	const stats = usePipelineViewerStats(pipeline);

	return (
		<Box
			sx={{
				display: 'inline-flex',
				flexDirection: 'column',
				alignItems: 'stretch',
				maxWidth: '100%',
				minWidth: 0,
				verticalAlign: 'top',
			}}
		>
			<PipelineViewerPaper
				sx={{
					p: 2,
					minHeight: 320,
					width: '100%',
					maxWidth: '100%',
					boxSizing: 'border-box',
					minWidth: 0,
				}}
			>
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'stretch',
						width: '100%',
						minWidth: 0,
					}}
				>
					<PipelineViewerHeader pipeline={pipeline} stats={stats} density="compact" />

					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'stretch',
							gap: 0,
							position: 'relative',
							width: '100%',
							minWidth: 0,
						}}
					>
					{pipeline.stages.map((stage) => {
						const { isParallel, stageStatus } = getStageColumnDerived(stage);
						return (
							<StageColumnDenseLayout
								key={stage.index}
								stage={stage}
								isParallel={isParallel}
								stageStatus={stageStatus}
								fillHorizontal
							>
								{stage.jobs.map((job) => (
									<JobNode
										key={job.name}
										job={job}
										isSelected={job.name === selectedJobName}
										onClick={onJobClick}
										onRetry={onJobRetry}
										onRunManual={onJobRunManual}
										jobDisplay="one-line"
										fullWidth
									/>
								))}
							</StageColumnDenseLayout>
						);
					})}
					</Box>
				</Box>
			</PipelineViewerPaper>
		</Box>
	);
};

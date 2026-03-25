import React from 'react';
import type { PipelineDisplayData, JobDisplayInfo, PipelineViewerVariant } from '../types';
import { PipelineViewerDetailedLayout } from './layouts/pipeline-viewer/PipelineViewerDetailedLayout';
import { PipelineViewerCompactLayout } from './layouts/pipeline-viewer/PipelineViewerCompactLayout';
import { PipelineViewerVerticalLayout } from './layouts/pipeline-viewer/PipelineViewerVerticalLayout';

export interface PipelineViewerProps {
	pipeline: PipelineDisplayData;
	onJobClick?: (job: JobDisplayInfo) => void;
	/** Callback при клике на кнопку retry job */
	onJobRetry?: (job: JobDisplayInfo) => void;
	/** Callback при клике на кнопку run для manual job */
	onJobRunManual?: (job: JobDisplayInfo) => void;
	selectedJobName?: string;
	/** Вариант вёрстки: detailed — полный вид; compact — плотнее; vertical — стадии столбцом */
	variant?: PipelineViewerVariant;
}

/**
 * Main pipeline visualization component
 * Renders stages as columns connected by lines (variant зависит от выбранного layout)
 */
export const PipelineViewer: React.FC<PipelineViewerProps> = ({
	pipeline,
	onJobClick,
	onJobRetry,
	onJobRunManual,
	selectedJobName,
	variant = 'detailed',
}) => {
	const common = {
		pipeline,
		onJobClick,
		onJobRetry,
		onJobRunManual,
		selectedJobName,
	};
	switch (variant) {
		case 'compact':
			return <PipelineViewerCompactLayout {...common} />;
		case 'vertical':
			return <PipelineViewerVerticalLayout {...common} />;
		case 'detailed':
		default:
			return <PipelineViewerDetailedLayout {...common} />;
	}
};

export default PipelineViewer;

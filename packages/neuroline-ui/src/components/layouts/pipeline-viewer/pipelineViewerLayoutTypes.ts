import type { JobDisplayInfo, PipelineDisplayData } from '../../../types';

/** Общие пропсы для layout-компонентов внутри PipelineViewer */
export interface PipelineViewerLayoutProps {
	pipeline: PipelineDisplayData;
	onJobClick?: (job: JobDisplayInfo) => void;
	onJobRetry?: (job: JobDisplayInfo) => void;
	onJobRunManual?: (job: JobDisplayInfo) => void;
	selectedJobName?: string;
}

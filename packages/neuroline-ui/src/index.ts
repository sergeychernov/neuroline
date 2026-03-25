/**
 * Neuroline UI - React компоненты для визуализации Pipeline
 * Каждая Job отображается как "нейрон" с входными/выходными данными
 */

// Types
export * from './types';

// Components
export * from './components/PipelineViewer';
export * from './components/JobNode';
export * from './components/job-details/JobDetailsPanel';
export * from './components/job-details/ArtifactView';
export * from './components/job-details/ErrorView';
export * from './components/job-details/InputView';
export * from './components/job-details/OptionsView';
export {
	getStageColumnDerived,
	STAGE_COLUMN_DENSE_INSET,
	STAGE_COLUMN_DENSE_VERTICAL_GUTTER,
	STAGE_COLUMN_STATUS_COLORS,
	type StageColumnAggregateStatus,
} from './components/layouts/stage-column/stageColumnDerived';
export { StageColumnHeader } from './components/layouts/stage-column/StageColumnHeader';
export { StageColumnStackedLayout } from './components/layouts/stage-column/StageColumnStackedLayout';
export { StageColumnDenseLayout } from './components/layouts/stage-column/StageColumnDenseLayout';
export * from './components/StatusBadge';

// Theme
export * from './theme';

//
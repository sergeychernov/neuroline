import type { StageDisplayInfo } from '../../../types';

/** Агрегированный статус stage по jobs */
export type StageColumnAggregateStatus =
	| 'pending'
	| 'awaiting_manual'
	| 'processing'
	| 'done'
	| 'error';

/** Зазор от разделителя под заголовком до первой job (dense) */
export const STAGE_COLUMN_DENSE_VERTICAL_GUTTER = 0.2;

/** Внутренний отступ карточки от рамки (как `px`/`pb` у блока с JobNode) — сверху до заголовка тот же визуальный зазор */
export const STAGE_COLUMN_DENSE_INSET = 0.75;

export const STAGE_COLUMN_STATUS_COLORS: Record<StageColumnAggregateStatus, string> = {
	pending: '#a0a0a0',
	awaiting_manual: '#ffab00',
	processing: '#00e5ff',
	done: '#00e676',
	error: '#ff1744',
};

export function getStageColumnDerived(stage: StageDisplayInfo): {
	isParallel: boolean;
	stageStatus: StageColumnAggregateStatus;
} {
	const isParallel = stage.jobs.length > 1;
	let stageStatus: StageColumnAggregateStatus = 'pending';
	if (stage.jobs.some((j) => j.status === 'error')) {
		stageStatus = 'error';
	} else if (stage.jobs.some((j) => j.status === 'processing')) {
		stageStatus = 'processing';
	} else if (stage.jobs.some((j) => j.status === 'awaiting_manual')) {
		stageStatus = 'awaiting_manual';
	} else if (stage.jobs.every((j) => j.status === 'done')) {
		stageStatus = 'done';
	}
	return { isParallel, stageStatus };
}

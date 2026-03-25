import { useMemo } from 'react';
import flatMap from 'lodash/flatMap';
import countBy from 'lodash/countBy';
import type { PipelineDisplayData } from '../../../types';

export interface PipelineViewerStats {
	total: number;
	done: number;
	processing: number;
	error: number;
	pending: number;
}

/**
 * Агрегированная статистика по jobs пайплайна (прогресс, чипы).
 */
export function usePipelineViewerStats(pipeline: PipelineDisplayData): PipelineViewerStats {
	return useMemo(() => {
		const allJobs = flatMap(pipeline.stages, (s) => s.jobs);
		const counts = countBy(allJobs, 'status');
		return {
			total: allJobs.length,
			done: counts.done ?? 0,
			processing: counts.processing ?? 0,
			error: counts.error ?? 0,
			pending: counts.pending ?? 0,
		};
	}, [pipeline.stages]);
}

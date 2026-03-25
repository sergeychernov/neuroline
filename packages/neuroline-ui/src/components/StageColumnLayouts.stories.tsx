import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { fn } from 'storybook/test';
import { JobNode } from './JobNode';
import { getStageColumnDerived } from './layouts/stage-column/stageColumnDerived';
import { StageColumnStackedLayout } from './layouts/stage-column/StageColumnStackedLayout';
import { StageColumnDenseLayout } from './layouts/stage-column/StageColumnDenseLayout';
import type { JobNodeDisplayMode, StageDisplayInfo } from '../types';

/** Сборка колонки stage для демо в Storybook (как в PipelineViewer) */
function StageColumnDemo(props: {
	stage: StageDisplayInfo;
	layout: 'stacked' | 'dense';
	jobDisplay?: JobNodeDisplayMode;
	selectedJobName?: string;
}) {
	const { stage, layout, jobDisplay = 'details', selectedJobName } = props;
	const { isParallel, stageStatus } = getStageColumnDerived(stage);
	const fullWidth = layout === 'dense' && jobDisplay === 'one-line';
	const nodes = stage.jobs.map((job) => (
		<JobNode
			key={job.name}
			job={job}
			isSelected={job.name === selectedJobName}
			onClick={fn()}
			jobDisplay={jobDisplay}
			fullWidth={fullWidth}
		/>
	));
	if (layout === 'dense') {
		return (
			<StageColumnDenseLayout stage={stage} isParallel={isParallel} stageStatus={stageStatus}>
				{nodes}
			</StageColumnDenseLayout>
		);
	}
	return (
		<StageColumnStackedLayout stage={stage} isParallel={isParallel} stageStatus={stageStatus}>
			{nodes}
		</StageColumnStackedLayout>
	);
}

const meta: Meta<typeof StageColumnDemo> = {
	component: StageColumnDemo,
	title: 'Layouts/StageColumn',
	parameters: {
		layout: 'centered',
		backgrounds: {
			default: 'dark',
			values: [{ name: 'dark', value: '#0a0a12' }],
		},
	},
	argTypes: {
		layout: {
			control: 'select',
			options: ['stacked', 'dense'],
		},
		jobDisplay: {
			control: 'select',
			options: ['details', 'compact', 'one-line'],
		},
	},
	args: {
		layout: 'stacked',
		jobDisplay: 'details',
	},
};

export default meta;
type Story = StoryObj<typeof StageColumnDemo>;

const now = Date.now();

export const SingleJob: Story = {
	args: {
		stage: {
			index: 0,
			jobs: [
				{
					name: 'fetch-data',
					status: 'done',
					startedAt: new Date(now - 5000),
					finishedAt: new Date(),
					artifact: { size: 2048 },
					errors: [],
				},
			],
		},
	},
};

export const DenseLayout: Story = {
	args: {
		layout: 'dense',
		jobDisplay: 'one-line',
		stage: {
			index: 1,
			jobs: [
				{
					name: 'validate-schema',
					status: 'done',
					startedAt: new Date(now - 4000),
					finishedAt: new Date(now - 2000),
					errors: [],
				},
				{
					name: 'notify-start',
					status: 'processing',
					startedAt: new Date(now - 4000),
					errors: [],
				},
			],
		},
	},
};

export const ParallelJobs: Story = {
	args: {
		stage: {
			index: 1,
			jobs: [
				{
					name: 'validate-schema',
					status: 'done',
					startedAt: new Date(now - 4000),
					finishedAt: new Date(now - 2000),
					artifact: { valid: true },
					errors: [],
				},
				{
					name: 'notify-start',
					status: 'done',
					startedAt: new Date(now - 4000),
					finishedAt: new Date(now - 3000),
					artifact: { notified: true },
					errors: [],
				},
			],
		},
	},
};

export const Processing: Story = {
	args: {
		stage: {
			index: 2,
			jobs: [
				{
					name: 'transform-data',
					status: 'processing',
					startedAt: new Date(now - 2000),
					errors: [],
				},
			],
		},
	},
};

export const WithError: Story = {
	args: {
		stage: {
			index: 3,
			jobs: [
				{
					name: 'save-to-db',
					status: 'error',
					startedAt: new Date(now - 3000),
					finishedAt: new Date(now - 1000),
					errors: [{ message: 'Connection timeout', attempt: 0 }],
				},
				{
					name: 'update-cache',
					status: 'pending',
					errors: [],
				},
			],
		},
	},
};

export const Pending: Story = {
	args: {
		stage: {
			index: 4,
			jobs: [
				{
					name: 'notify-complete',
					status: 'pending',
					errors: [],
				},
			],
		},
	},
};

export const WithSelectedJob: Story = {
	args: {
		stage: {
			index: 1,
			jobs: [
				{
					name: 'validate-schema',
					status: 'done',
					startedAt: new Date(now - 4000),
					finishedAt: new Date(now - 2000),
					errors: [],
				},
				{
					name: 'notify-start',
					status: 'done',
					startedAt: new Date(now - 4000),
					finishedAt: new Date(now - 3000),
					errors: [],
				},
			],
		},
		selectedJobName: 'validate-schema',
	},
};

export const WithArtifacts: Story = {
	args: {
		stage: {
			index: 0,
			jobs: [
				{
					name: 'fetch-data',
					status: 'done',
					startedAt: new Date(now - 5000),
					finishedAt: new Date(),
					artifact: {
						data: '{"users": [...]}',
						size: 2048,
						format: 'json',
					},
					errors: [],
				},
			],
		},
	},
};

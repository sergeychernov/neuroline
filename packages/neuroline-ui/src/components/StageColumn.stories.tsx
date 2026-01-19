import type { Meta, StoryObj } from '@storybook/react';
import { StageColumn } from './StageColumn';
import type { StageDisplayInfo } from '../types';

const meta: Meta<typeof StageColumn> = {
	component: StageColumn,
	title: 'Components/StageColumn',
	parameters: {
		layout: 'centered',
		backgrounds: {
			default: 'dark',
			values: [{ name: 'dark', value: '#0a0a12' }],
		},
	},
};

export default meta;
type Story = StoryObj<typeof StageColumn>;

const now = Date.now();

/** Stage with one job */
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

/** Stage with parallel jobs */
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

/** Stage in progress */
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

/** Stage with error */
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

/** Stage pending */
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

/** Stage with selected job */
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

/** Stage with artefacts */
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
		showArtifacts: true,
	},
};

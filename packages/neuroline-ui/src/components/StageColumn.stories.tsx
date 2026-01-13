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

/** Stage с одной job */
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
				},
			],
		},
	},
};

/** Stage с параллельными jobs */
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
				},
				{
					name: 'notify-start',
					status: 'done',
					startedAt: new Date(now - 4000),
					finishedAt: new Date(now - 3000),
					artifact: { notified: true },
				},
			],
		},
	},
};

/** Stage в процессе выполнения */
export const Processing: Story = {
	args: {
		stage: {
			index: 2,
			jobs: [
				{
					name: 'transform-data',
					status: 'processing',
					startedAt: new Date(now - 2000),
				},
			],
		},
	},
};

/** Stage с ошибкой */
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
					error: { message: 'Connection timeout' },
				},
				{
					name: 'update-cache',
					status: 'pending',
				},
			],
		},
	},
};

/** Stage ожидает выполнения */
export const Pending: Story = {
	args: {
		stage: {
			index: 4,
			jobs: [
				{
					name: 'notify-complete',
					status: 'pending',
				},
			],
		},
	},
};

/** Stage с выбранной job */
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
				},
				{
					name: 'notify-start',
					status: 'done',
					startedAt: new Date(now - 4000),
					finishedAt: new Date(now - 3000),
				},
			],
		},
		selectedJobName: 'validate-schema',
	},
};

/** Stage с артефактами */
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
				},
			],
		},
		showArtifacts: true,
	},
};

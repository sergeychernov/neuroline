import type { Meta, StoryObj } from '@storybook/react';
import { ErrorView } from './ErrorView';

const meta: Meta<typeof ErrorView> = {
	component: ErrorView,
	title: 'Components/ErrorView',
	parameters: {
		layout: 'padded',
		backgrounds: {
			default: 'dark',
			values: [{ name: 'dark', value: '#0a0a12' }],
		},
	},
};

export default meta;
type Story = StoryObj<typeof ErrorView>;

/** Single error with message and stack */
export const WithStack: Story = {
	args: {
		errors: [
			{
				message: 'Input validation error',
				stack: [
					'Error: Validation failed',
					'    at validateInput (src/validators/input.ts:42:11)',
					'    at runJob (src/pipeline/runner.ts:120:5)',
					'    at async execute (src/pipeline/manager.ts:88:3)',
				].join('\n'),
				attempt: 0,
			},
		],
	},
};

/** Single error - message only */
export const MessageOnly: Story = {
	args: {
		errors: [
			{
				message: 'Unknown execution error',
				attempt: 0,
			},
		],
	},
};

/** Error with logs and data inside error object */
export const WithLogsAndData: Story = {
	args: {
		errors: [
			{
				message: 'Job execution failed',
				stack: [
					'Error: Pipeline failed',
					'    at executeJob (src/pipeline/runner.ts:251:9)',
					'    at async runStage (src/pipeline/stages.ts:64:3)',
				].join('\n'),
				attempt: 0,
				logs: [
					'[2026-01-19T10:42:14.021Z] Starting job: transform-data',
					'[2026-01-19T10:42:14.188Z] Received 128 items',
					'[2026-01-19T10:42:15.404Z] Validation error: missing "target"',
				],
				data: {
					jobId: 'job-42',
					retry: 2,
					context: {
						stage: 'transform',
						received: 128,
					},
				},
			},
		],
	},
};

/** Multiple errors from retries - shows attempt selector, each with own logs/data */
export const WithRetries: Story = {
	args: {
		errors: [
			{
				message: 'Connection timeout',
				stack: 'Error: Connection timeout\n    at fetch (src/api.ts:15:5)',
				attempt: 0,
				logs: [
					'[10:00:01] Connecting to server...',
					'[10:00:31] Connection timed out after 30s',
				],
				data: { endpoint: 'https://api.example.com', timeout: 30000 },
			},
			{
				message: 'Service unavailable',
				stack: 'Error: Service unavailable\n    at fetch (src/api.ts:15:5)',
				attempt: 1,
				logs: [
					'[10:00:35] Retrying connection...',
					'[10:00:36] Server returned 503',
				],
				data: { statusCode: 503, retryAfter: 60 },
			},
			{
				message: 'Max retries exceeded',
				stack: 'Error: Max retries exceeded\n    at retry (src/utils.ts:42:11)',
				attempt: 2,
				logs: [
					'[10:01:36] Final retry attempt...',
					'[10:01:37] All retries exhausted',
				],
			},
		],
	},
};

/** Success after retry - errors from failed attempts preserved */
export const SuccessAfterRetry: Story = {
	args: {
		errors: [
			{
				message: 'Temporary failure (job succeeded on retry)',
				stack: 'Error: Temporary failure\n    at process (src/job.ts:10:5)',
				attempt: 0,
			},
		],
	},
};

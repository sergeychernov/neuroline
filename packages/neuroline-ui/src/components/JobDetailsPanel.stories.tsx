import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { JobDetailsPanel } from './JobDetailsPanel';
import type { JobDisplayInfo } from '../types';

const meta: Meta<typeof JobDetailsPanel> = {
	component: JobDetailsPanel,
	title: 'Components/JobDetailsPanel',
	parameters: {
		layout: 'padded',
		backgrounds: {
			default: 'dark',
			values: [
				{ name: 'dark', value: '#0a0a12' },
			],
		},
	},
	argTypes: {
		onInputEditClick: { action: 'onInputEditClick' },
		onOptionsEditClick: { action: 'onOptionsEditClick' },
	},
};

export default meta;
type Story = StoryObj<typeof JobDetailsPanel>;

const baseJob: JobDisplayInfo = {
	name: 'fetch-data',
	status: 'done',
	startedAt: new Date(Date.now() - 5000),
	finishedAt: new Date(),
	artifact: { data: '{"users": [...]}', size: 2048 },
};

/** Job завершённая успешно с артефактом */
export const Done: Story = {
	args: {
		job: baseJob,
	},
};

/** Job в процессе выполнения */
export const Processing: Story = {
	args: {
		job: {
			name: 'transform-data',
			status: 'processing',
			startedAt: new Date(Date.now() - 3000),
		},
	},
};

/** Job ожидает выполнения */
export const Pending: Story = {
	args: {
		job: {
			name: 'save-to-db',
			status: 'pending',
		},
	},
};

/** Job с ошибкой */
export const Error: Story = {
	args: {
		job: {
			name: 'save-to-db',
			status: 'error',
			startedAt: new Date(Date.now() - 2000),
			finishedAt: new Date(),
			error: { message: 'Database connection timeout' },
		},
	},
};

/** Job с большим артефактом */
export const LargeArtifact: Story = {
	args: {
		job: {
			name: 'process-users',
			status: 'done',
			startedAt: new Date(Date.now() - 10000),
			finishedAt: new Date(),
			artifact: {
				users: [
					{ id: 1, name: 'John Doe', email: 'john@example.com' },
					{ id: 2, name: 'Jane Smith', email: 'jane@example.com' },
				],
				metadata: {
					total: 150,
					processed: 150,
					skipped: 0,
				},
				timing: {
					fetchMs: 234,
					transformMs: 567,
					saveMs: 890,
				},
			},
		},
	},
};

/** Job со всеми табами: artifact, input, options */
export const AllTabs: Story = {
	args: {
		job: {
			name: 'process-order',
			status: 'done',
			startedAt: new Date(Date.now() - 8000),
			finishedAt: new Date(),
			input: {
				orderId: 'ORD-12345',
				userId: 'user-789',
				items: [
					{ productId: 'PROD-1', quantity: 2 },
					{ productId: 'PROD-2', quantity: 1 },
				],
			},
			options: {
				retryCount: 3,
				timeout: 5000,
				priority: 'high',
				notifyOnComplete: true,
			},
			artifact: {
				processed: true,
				totalAmount: 299.99,
				discountApplied: 15,
				finalAmount: 254.99,
			},
		},
		onInputEditClick: fn(),
		onOptionsEditClick: fn(),
	},
};

/** Job только с input (без артефакта) */
export const OnlyInput: Story = {
	args: {
		job: {
			name: 'validate-order',
			status: 'processing',
			startedAt: new Date(Date.now() - 2000),
			input: {
				orderId: 'ORD-99999',
				items: [{ productId: 'PROD-5', quantity: 10 }],
				couponCode: 'SAVE20',
			},
		},
		onInputEditClick: fn(),
	},
};

/** Job с input и options, но без артефакта */
export const InputAndOptions: Story = {
	args: {
		job: {
			name: 'send-notification',
			status: 'pending',
			input: {
				recipientEmail: 'user@example.com',
				templateId: 'order-confirmation',
			},
			options: {
				channel: 'email',
				priority: 'normal',
				retryOnFail: true,
			},
		},
		onInputEditClick: fn(),
		onOptionsEditClick: fn(),
	},
};

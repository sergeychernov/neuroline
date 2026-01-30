import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { OptionsView } from './OptionsView';

const meta: Meta<typeof OptionsView> = {
	component: OptionsView,
	title: 'Components/OptionsView',
	parameters: {
		layout: 'padded',
		backgrounds: {
			default: 'dark',
			values: [{ name: 'dark', value: '#0a0a12' }],
		},
	},
	argTypes: {
		onEditClick: { action: 'onEditClick' },
	},
};

export default meta;
type Story = StoryObj<typeof OptionsView>;

/** HTTP request options */
export const HttpOptions: Story = {
	args: {
		options: {
			timeout: 5000,
			retries: 3,
			followRedirects: true,
		},
		onEditClick: fn(),
	},
};

/** Database options */
export const DatabaseOptions: Story = {
	args: {
		options: {
			connectionPool: 10,
			upsert: true,
			batchSize: 100,
		},
		onEditClick: fn(),
	},
};

/** Notification options */
export const NotificationOptions: Story = {
	args: {
		options: {
			channel: 'email',
			priority: 'high',
			retryOnFail: true,
			maxRetries: 5,
		},
		onEditClick: fn(),
	},
};

/** Null value */
export const NullOptions: Story = {
	args: {
		options: null,
	},
};

/** Without edit button */
export const WithoutEditButton: Story = {
	args: {
		options: {
			timeout: 5000,
		},
	},
};

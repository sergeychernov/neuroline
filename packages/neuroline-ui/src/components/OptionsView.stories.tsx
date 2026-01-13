import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
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

/** Опции HTTP-запроса */
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

/** Опции базы данных */
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

/** Опции уведомлений */
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

/** Null значение */
export const NullOptions: Story = {
	args: {
		options: null,
	},
};

/** Без кнопки редактирования */
export const WithoutEditButton: Story = {
	args: {
		options: {
			timeout: 5000,
		},
	},
};

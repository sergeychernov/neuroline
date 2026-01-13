import type { Meta, StoryObj } from '@storybook/react';
import { ArtifactView } from './ArtifactView';

const meta: Meta<typeof ArtifactView> = {
	component: ArtifactView,
	title: 'Components/ArtifactView',
	parameters: {
		layout: 'padded',
		backgrounds: {
			default: 'dark',
			values: [{ name: 'dark', value: '#0a0a12' }],
		},
	},
};

export default meta;
type Story = StoryObj<typeof ArtifactView>;

/** Простой объект */
export const SimpleObject: Story = {
	args: {
		artifact: {
			success: true,
			count: 42,
		},
	},
};

/** Сложный вложенный объект */
export const NestedObject: Story = {
	args: {
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
		},
	},
};

/** Строковое значение */
export const StringValue: Story = {
	args: {
		artifact: 'Операция завершена успешно',
	},
};

/** Числовое значение */
export const NumberValue: Story = {
	args: {
		artifact: 42,
	},
};

/** Boolean значение */
export const BooleanValue: Story = {
	args: {
		artifact: true,
	},
};

/** Null значение */
export const NullValue: Story = {
	args: {
		artifact: null,
	},
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { InputView } from './InputView';

const meta: Meta<typeof InputView> = {
	component: InputView,
	title: 'Components/InputView',
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
type Story = StoryObj<typeof InputView>;

/** Input data from synapses */
export const SynapsesInput: Story = {
	args: {
		input: {
			url: 'https://api.example.com/data',
			headers: { Authorization: 'Bearer ***' },
			method: 'GET',
		},
		onEditClick: fn(),
	},
};

/** Input data with order parameters */
export const OrderInput: Story = {
	args: {
		input: {
			orderId: 'ORD-12345',
			userId: 'user-789',
			items: [
				{ productId: 'PROD-1', quantity: 2 },
				{ productId: 'PROD-2', quantity: 1 },
			],
		},
		onEditClick: fn(),
	},
};

/** Simple string */
export const StringInput: Story = {
	args: {
		input: 'user@example.com',
		onEditClick: fn(),
	},
};

/** Null value */
export const NullInput: Story = {
	args: {
		input: null,
	},
};

/** Without edit button */
export const WithoutEditButton: Story = {
	args: {
		input: {
			url: 'https://api.example.com/data',
		},
	},
};

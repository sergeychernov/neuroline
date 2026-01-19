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

/** Message and stack */
export const WithStack: Story = {
	args: {
		error: {
			message: 'Input validation error',
			stack: [
				'Error: Validation failed',
				'    at validateInput (src/validators/input.ts:42:11)',
				'    at runJob (src/pipeline/runner.ts:120:5)',
				'    at async execute (src/pipeline/manager.ts:88:3)',
			].join('\n'),
		},
	},
};

/** Message only */
export const MessageOnly: Story = {
	args: {
		error: {
			message: 'Unknown execution error',
		},
	},
};

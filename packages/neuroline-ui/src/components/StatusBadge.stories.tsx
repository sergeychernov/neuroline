import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Stack } from '@mui/material';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
	component: StatusBadge,
	title: 'Components/StatusBadge',
	parameters: {
		layout: 'centered',
		backgrounds: {
			default: 'dark',
			values: [{ name: 'dark', value: '#0a0a12' }],
		},
	},
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

/** Status: Pending */
export const Pending: Story = {
	args: {
		status: 'pending',
		size: 'small',
	},
};

/** Status: Processing (with animation) */
export const Processing: Story = {
	args: {
		status: 'processing',
		size: 'small',
	},
};

/** Status: Done */
export const Done: Story = {
	args: {
		status: 'done',
		size: 'small',
	},
};

/** Status: Error */
export const Error: Story = {
	args: {
		status: 'error',
		size: 'small',
	},
};

/** Size: Medium */
export const MediumSize: Story = {
	args: {
		status: 'done',
		size: 'medium',
	},
};

/** All statuses together */
export const AllStatuses: Story = {
	render: () => (
		<Stack spacing={2}>
			<Box>
				<StatusBadge status="pending" size="small" />
			</Box>
			<Box>
				<StatusBadge status="processing" size="small" />
			</Box>
			<Box>
				<StatusBadge status="done" size="small" />
			</Box>
			<Box>
				<StatusBadge status="error" size="small" />
			</Box>
		</Stack>
	),
};

/** Size comparison */
export const SizeComparison: Story = {
	render: () => (
		<Stack direction="row" spacing={2} alignItems="center">
			<StatusBadge status="done" size="small" />
			<StatusBadge status="done" size="medium" />
		</Stack>
	),
};

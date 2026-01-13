import type { Meta, StoryObj } from '@storybook/react';
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

/** Статус: Ожидание */
export const Pending: Story = {
	args: {
		status: 'pending',
		size: 'small',
	},
};

/** Статус: Выполняется (с анимацией) */
export const Processing: Story = {
	args: {
		status: 'processing',
		size: 'small',
	},
};

/** Статус: Готово */
export const Done: Story = {
	args: {
		status: 'done',
		size: 'small',
	},
};

/** Статус: Ошибка */
export const Error: Story = {
	args: {
		status: 'error',
		size: 'small',
	},
};

/** Размер: Medium */
export const MediumSize: Story = {
	args: {
		status: 'done',
		size: 'medium',
	},
};

/** Все статусы рядом */
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

/** Сравнение размеров */
export const SizeComparison: Story = {
	render: () => (
		<Stack direction="row" spacing={2} alignItems="center">
			<StatusBadge status="done" size="small" />
			<StatusBadge status="done" size="medium" />
		</Stack>
	),
};

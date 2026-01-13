import React from 'react';
import { Box, Paper, Typography, IconButton, Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import type { SerializableValue } from '../types';

export interface InputViewProps {
	/** Входные данные job (результат synapses) */
	input: SerializableValue;
	/** Callback при клике на кнопку редактирования */
	onEditClick?: () => void;
}

/**
 * Компонент отображения входных данных Job
 */
export const InputView: React.FC<InputViewProps> = ({ input, onEditClick }) => {
	if (input === null || input === undefined) {
		return (
			<Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
				Нет данных
			</Typography>
		);
	}

	return (
		<Box>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
				<Typography variant="body2" sx={{ color: 'text.secondary' }}>
					Входные данные (результат synapses):
				</Typography>
				{onEditClick && (
					<IconButton
						size="small"
						onClick={onEditClick}
						sx={{
							color: '#00e5ff',
							'&:hover': {
								backgroundColor: 'rgba(0, 229, 255, 0.1)',
							},
						}}
					>
						<EditIcon fontSize="small" />
					</IconButton>
				)}
			</Stack>
			<Paper
				sx={{
					p: 2,
					backgroundColor: 'rgba(0, 0, 0, 0.3)',
					fontFamily: 'monospace',
					fontSize: '0.8rem',
					color: '#00e5ff',
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-all',
					maxHeight: 300,
					overflow: 'auto',
				}}
			>
				{typeof input === 'object'
					? JSON.stringify(input, null, 2)
					: String(input)}
			</Paper>
		</Box>
	);
};

export default InputView;

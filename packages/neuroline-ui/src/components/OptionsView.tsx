import React from 'react';
import { Box, Paper, Typography, IconButton, Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import type { SerializableValue } from '../types';

export interface OptionsViewProps {
	/** Опции job */
	options: SerializableValue;
	/** Callback при клике на кнопку редактирования */
	onEditClick?: () => void;
}

/**
 * Компонент отображения опций Job
 */
export const OptionsView: React.FC<OptionsViewProps> = ({ options, onEditClick }) => {
	if (options === null || options === undefined) {
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
					Конфигурация job:
				</Typography>
				{onEditClick && (
					<IconButton
						size="small"
						onClick={onEditClick}
						sx={{
							color: '#7c4dff',
							'&:hover': {
								backgroundColor: 'rgba(124, 77, 255, 0.1)',
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
					color: '#7c4dff',
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-all',
					maxHeight: 300,
					overflow: 'auto',
				}}
			>
				{typeof options === 'object'
					? JSON.stringify(options, null, 2)
					: String(options)}
			</Paper>
		</Box>
	);
};

export default OptionsView;

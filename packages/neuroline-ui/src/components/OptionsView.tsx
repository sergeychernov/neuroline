import React from 'react';
import { Box, Paper, Typography, IconButton, Stack, SvgIcon } from '@mui/material';
import type { SerializableValue } from '../types';

/** Иконка Edit (inline для избежания проблем с tree-shaking) */
const EditIcon: React.FC<{ fontSize?: 'small' | 'medium' | 'large' }> = ({ fontSize = 'medium' }) => (
	<SvgIcon fontSize={fontSize}>
		<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
	</SvgIcon>
);

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

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import type { SerializableValue } from '../types';

export interface ArtifactViewProps {
	/** Артефакт (результат выполнения job) */
	artifact: SerializableValue;
}

/**
 * Компонент отображения артефакта Job
 */
export const ArtifactView: React.FC<ArtifactViewProps> = ({ artifact }) => {
	if (artifact === null || artifact === undefined) {
		return (
			<Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
				Нет данных
			</Typography>
		);
	}

	return (
		<Box>
			<Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
				Результат выполнения:
			</Typography>
			<Paper
				sx={{
					p: 2,
					backgroundColor: 'rgba(0, 0, 0, 0.3)',
					fontFamily: 'monospace',
					fontSize: '0.8rem',
					color: '#00e676',
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-all',
					maxHeight: 300,
					overflow: 'auto',
				}}
			>
				{typeof artifact === 'object'
					? JSON.stringify(artifact, null, 2)
					: String(artifact)}
			</Paper>
		</Box>
	);
};

export default ArtifactView;

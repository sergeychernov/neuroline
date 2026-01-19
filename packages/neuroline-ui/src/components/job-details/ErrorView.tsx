import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export interface ErrorViewProps {
	/** Job execution error */
	error: { message: string; stack?: string };
}

/**
 * Component for displaying a job error
 */
export const ErrorView: React.FC<ErrorViewProps> = ({ error }) => {
	const stack = error.stack?.trim();
	const details = stack ? `${error.message}\n\n${stack}` : error.message;

	return (
		<Box>
			<Typography variant="body2" sx={{ color: '#ff1744', mb: 1 }}>
				Error details:
			</Typography>
			<Paper
				sx={{
					p: 2,
					backgroundColor: 'rgba(255, 23, 68, 0.08)',
					border: '1px solid rgba(255, 23, 68, 0.3)',
					fontFamily: 'monospace',
					fontSize: '0.8rem',
					color: '#ff1744',
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-all',
					maxHeight: 300,
					overflow: 'auto',
				}}
			>
				{details}
			</Paper>
		</Box>
	);
};

export default ErrorView;

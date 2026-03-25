import React from 'react';
import { Paper } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

const baseSx: SxProps<Theme> = {
	p: 4,
	backgroundColor: 'transparent',
	background: `
		radial-gradient(circle at 10% 20%, rgba(124, 77, 255, 0.06) 0%, transparent 40%),
		radial-gradient(circle at 90% 80%, rgba(0, 229, 255, 0.04) 0%, transparent 40%),
		linear-gradient(180deg, #0a0a0f 0%, #0f0f18 100%)
	`,
	borderRadius: 4,
	border: '1px solid rgba(124, 77, 255, 0.15)',
	minHeight: 400,
	position: 'relative',
	overflow: 'hidden',
};

export interface PipelineViewerPaperProps {
	children: React.ReactNode;
	/** Дополнительные / переопределяющие sx для корневого Paper */
	sx?: SxProps<Theme>;
}

export const PipelineViewerPaper: React.FC<PipelineViewerPaperProps> = ({ children, sx }) => (
	<Paper elevation={0} sx={(sx ? [baseSx, sx] : baseSx) as SxProps<Theme>}>
		{children}
	</Paper>
);

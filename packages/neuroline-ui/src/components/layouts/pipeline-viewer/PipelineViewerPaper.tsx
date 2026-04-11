import React from 'react';
import { Paper, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

function paperSx(theme: Theme): SystemStyleObject<Theme> {
	const isDark = theme.palette.mode === 'dark';
	const p = theme.palette.primary.main;
	const s = theme.palette.secondary.main;
	const top = theme.palette.background.default;
	const bottom = isDark ? '#0f0f18' : alpha(theme.palette.common.black, 0.02);

	return {
		p: 4,
		backgroundColor: 'transparent',
		background: `
			radial-gradient(circle at 10% 20%, ${alpha(p, isDark ? 0.06 : 0.1)} 0%, transparent 40%),
			radial-gradient(circle at 90% 80%, ${alpha(s, isDark ? 0.04 : 0.08)} 0%, transparent 40%),
			linear-gradient(180deg, ${top} 0%, ${bottom} 100%)
		`,
		borderRadius: 1,
		border: `1px solid ${alpha(p, isDark ? 0.15 : 0.32)}`,
		minHeight: 400,
		position: 'relative',
		overflow: 'hidden',
	};
}

export interface PipelineViewerPaperProps {
	children: React.ReactNode;
	/** Дополнительные / переопределяющие sx для корневого Paper */
	sx?: SxProps<Theme>;
}

export const PipelineViewerPaper: React.FC<PipelineViewerPaperProps> = ({ children, sx }) => {
	const theme = useTheme();
	const base = paperSx(theme);
	return (
		<Paper elevation={0} sx={sx ? ([base, sx] as SxProps<Theme>) : base}>
			{children}
		</Paper>
	);
};

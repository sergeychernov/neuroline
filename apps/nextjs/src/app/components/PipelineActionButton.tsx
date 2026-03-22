'use client';

import type { ComponentType } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import type { SvgIconProps } from '@mui/material/SvgIcon';

export interface PipelineActionButtonProps {
	label: string;
	onClick: () => void;
	/** Основной цвет (#rrggbb) */
	color: string;
	variant: 'contained' | 'outlined';
	icon: ComponentType<SvgIconProps>;
	loading?: boolean;
	disabled?: boolean;
}

/**
 * Кнопка действия на панели запуска demo pipelines
 */
export function PipelineActionButton({
	label,
	onClick,
	color,
	variant,
	icon: Icon,
	loading = false,
	disabled = false,
}: PipelineActionButtonProps) {
	const sx: SxProps<Theme> =
		variant === 'contained'
			? {
					px: 2,
					py: 0.75,
					fontSize: '0.8rem',
					color: '#fff',
					background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.82)} 100%)`,
					'&:hover': {
						background: `linear-gradient(135deg, ${alpha(color, 0.95)} 0%, ${color} 100%)`,
					},
					'&:disabled': {
						background: alpha(color, 0.35),
						color: 'rgba(255,255,255,0.5)',
					},
				}
			: {
					px: 2,
					py: 0.75,
					fontSize: '0.8rem',
					borderColor: color,
					color,
					'&:hover': {
						borderColor: alpha(color, 0.95),
						backgroundColor: alpha(color, 0.12),
					},
					'&:disabled': {
						borderColor: alpha(color, 0.35),
						color: alpha(color, 0.5),
					},
				};

	return (
		<Button
			variant={variant}
			size="small"
			onClick={onClick}
			disabled={disabled}
			startIcon={
				loading ? (
					<CircularProgress size={14} color="inherit" />
				) : (
					<Icon sx={{ fontSize: 18 }} />
				)
			}
			sx={sx}
		>
			{label}
		</Button>
	);
}

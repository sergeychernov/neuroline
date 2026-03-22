'use client';

import { useMemo } from 'react';
import { Box, Paper, Stack, Typography, Divider } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ReplayIcon from '@mui/icons-material/Replay';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { ComponentType } from 'react';
import { PipelineActionButton } from './PipelineActionButton';

// ============================================================================
// Types
// ============================================================================

export interface PipelineControlPanelProps {
	/** Запуск Next.js success pipeline (admin endpoint с jobOptions) */
	onNextjsSuccess: () => void;
	/** Запуск Next.js success pipeline (базовый endpoint без jobOptions) */
	onNextjsSuccessBasic: () => void;
	/** Запуск Next.js error pipeline */
	onNextjsError: () => void;
	/** Запуск Next.js pipeline с retry (unstableFailCount = 1) */
	onNextjsRetry: () => void;
	/** Запуск Next.js pipeline с manual job */
	onNextjsManual: () => void;
	/** Запуск NestJS success pipeline (admin endpoint с jobOptions) */
	onNestjsSuccess: () => void;
	/** Запуск NestJS success pipeline (базовый endpoint без jobOptions) */
	onNestjsSuccessBasic: () => void;
	/** Запуск NestJS error pipeline */
	onNestjsError: () => void;
	/** Запуск NestJS pipeline с retry (unstableFailCount = 1) */
	onNestjsRetry: () => void;
	/** Запуск NestJS pipeline с manual job */
	onNestjsManual: () => void;
	/** Pipeline в процессе выполнения */
	isRunning: boolean;
	/** Текущий тип pipeline */
	currentPipelineType?: string;
}

interface PipelineControlButtonDef {
	slug: string;
	label: string;
	color: string;
	icon: ComponentType<SvgIconProps>;
}

// ============================================================================
// Конфиг кнопок (общий для Next.js и NestJS)
// ============================================================================

const PIPELINE_CONTROL_BUTTONS: PipelineControlButtonDef[] = [
	{ slug: 'success', label: 'Success', color: '#00e676', icon: CheckCircleOutlineIcon },
	{ slug: 'success-basic', label: 'Basic', color: '#00e676', icon: CheckCircleOutlineIcon },
	{ slug: 'error', label: 'Error', color: '#ff1744', icon: ErrorOutlineIcon },
	{ slug: 'retry', label: 'Retry', color: '#ff9800', icon: ReplayIcon },
	{ slug: 'manual', label: 'Manual', color: '#7c4dff', icon: PlayArrowIcon },
];

// ============================================================================
// Component
// ============================================================================

/**
 * Панель управления pipelines
 * Кнопки запуска
 */
export function PipelineControlPanel({
	onNextjsSuccess,
	onNextjsSuccessBasic,
	onNextjsError,
	onNextjsRetry,
	onNextjsManual,
	onNestjsSuccess,
	onNestjsSuccessBasic,
	onNestjsError,
	onNestjsRetry,
	onNestjsManual,
	isRunning,
	currentPipelineType,
}: PipelineControlPanelProps) {
	const nextHandlers = useMemo(
		() => ({
			success: onNextjsSuccess,
			'success-basic': onNextjsSuccessBasic,
			error: onNextjsError,
			retry: onNextjsRetry,
			manual: onNextjsManual,
		}),
		[
			onNextjsSuccess,
			onNextjsSuccessBasic,
			onNextjsError,
			onNextjsRetry,
			onNextjsManual,
		],
	);

	const nestHandlers = useMemo(
		() => ({
			success: onNestjsSuccess,
			'success-basic': onNestjsSuccessBasic,
			error: onNestjsError,
			retry: onNestjsRetry,
			manual: onNestjsManual,
		}),
		[
			onNestjsSuccess,
			onNestjsSuccessBasic,
			onNestjsError,
			onNestjsRetry,
			onNestjsManual,
		],
	);

	return (
		<Paper
			elevation={0}
			sx={{
				p: 2,
				mb: 4,
				backgroundColor: 'rgba(19, 19, 26, 0.6)',
				backdropFilter: 'blur(20px)',
				border: '1px solid rgba(124, 77, 255, 0.2)',
			}}
		>
			<Stack spacing={2}>
				<Stack
					direction={{ xs: 'column', md: 'row' }}
					spacing={2}
					alignItems={{ xs: 'stretch', md: 'center' }}
					justifyContent="space-between"
				>
					<Box>
						<Typography
							variant="caption"
							sx={{
								color: '#00e676',
								fontWeight: 600,
								mb: 1,
								display: 'block',
								letterSpacing: '0.05em',
							}}
						>
							NEXT.JS API
						</Typography>
						<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
							{PIPELINE_CONTROL_BUTTONS.map((def) => (
								<PipelineActionButton
									key={`nextjs-${def.slug}`}
									label={def.label}
									onClick={nextHandlers[def.slug as keyof typeof nextHandlers]}
									color={def.color}
									variant="contained"
									icon={def.icon}
									loading={isRunning && currentPipelineType === `nextjs-${def.slug}`}
									disabled={isRunning}
								/>
							))}
						</Stack>
					</Box>

					<Divider
						orientation="vertical"
						flexItem
						sx={{
							display: { xs: 'none', md: 'block' },
							borderColor: 'rgba(160, 160, 160, 0.2)',
						}}
					/>

					<Box>
						<Typography
							variant="caption"
							sx={{
								color: '#ffd54f',
								fontWeight: 600,
								mb: 1,
								display: 'block',
								letterSpacing: '0.05em',
							}}
						>
							NESTJS API (localhost:3003)
						</Typography>
						<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
							{PIPELINE_CONTROL_BUTTONS.map((def) => (
								<PipelineActionButton
									key={`nestjs-${def.slug}`}
									label={def.label}
									onClick={nestHandlers[def.slug as keyof typeof nestHandlers]}
									color={def.color}
									variant="outlined"
									icon={def.icon}
									loading={isRunning && currentPipelineType === `nestjs-${def.slug}`}
									disabled={isRunning}
								/>
							))}
						</Stack>
					</Box>
				</Stack>
			</Stack>
		</Paper>
	);
}

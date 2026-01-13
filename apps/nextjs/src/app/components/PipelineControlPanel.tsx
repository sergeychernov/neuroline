'use client';

import { Box, Button, Paper, Stack, Chip, CircularProgress } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// ============================================================================
// Types
// ============================================================================

export interface PipelineControlPanelProps {
	/** Показывать артефакты */
	showArtifacts: boolean;
	/** Callback изменения showArtifacts */
	onShowArtifactsChange: (value: boolean) => void;
	/** Показывать input */
	showInput: boolean;
	/** Callback изменения showInput */
	onShowInputChange: (value: boolean) => void;
	/** Запуск success pipeline */
	onStartSuccess: () => void;
	/** Запуск error pipeline */
	onStartError: () => void;
	/** Pipeline в процессе выполнения */
	isRunning: boolean;
	/** Текущий тип pipeline */
	currentPipelineType?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Панель управления pipelines
 * Кнопки запуска и настройки отображения
 */
export function PipelineControlPanel({
	showArtifacts,
	onShowArtifactsChange,
	showInput,
	onShowInputChange,
	onStartSuccess,
	onStartError,
	isRunning,
	currentPipelineType,
}: PipelineControlPanelProps) {
	const isSuccessRunning = isRunning && currentPipelineType === 'demo-success';
	const isErrorRunning = isRunning && currentPipelineType === 'demo-error';

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
			<Stack
				direction={{ xs: 'column', sm: 'row' }}
				spacing={2}
				alignItems={{ xs: 'stretch', sm: 'center' }}
				justifyContent="space-between"
			>
				{/* Кнопки запуска */}
				<Stack direction="row" spacing={1.5}>
					<Button
						variant="contained"
						size="small"
						onClick={onStartSuccess}
						disabled={isRunning}
						startIcon={
							isSuccessRunning ? (
								<CircularProgress size={14} color="inherit" />
							) : (
								<CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
							)
						}
						sx={{
							px: 2,
							py: 0.75,
							fontSize: '0.8rem',
							background: 'linear-gradient(135deg, #00e676 0%, #00c853 100%)',
							'&:hover': {
								background: 'linear-gradient(135deg, #69f0ae 0%, #00e676 100%)',
							},
							'&:disabled': {
								background: 'rgba(0, 230, 118, 0.3)',
								color: 'rgba(255,255,255,0.5)',
							},
						}}
					>
						Success Pipeline
					</Button>
					<Button
						variant="contained"
						size="small"
						onClick={onStartError}
						disabled={isRunning}
						startIcon={
							isErrorRunning ? (
								<CircularProgress size={14} color="inherit" />
							) : (
								<ErrorOutlineIcon sx={{ fontSize: 18 }} />
							)
						}
						sx={{
							px: 2,
							py: 0.75,
							fontSize: '0.8rem',
							background: 'linear-gradient(135deg, #ff1744 0%, #d50000 100%)',
							'&:hover': {
								background: 'linear-gradient(135deg, #ff5252 0%, #ff1744 100%)',
							},
							'&:disabled': {
								background: 'rgba(255, 23, 68, 0.3)',
								color: 'rgba(255,255,255,0.5)',
							},
						}}
					>
						Error Pipeline
					</Button>
				</Stack>

				{/* Настройки отображения */}
				<Stack direction="row" spacing={1}>
					<Chip
						size="small"
						label={showArtifacts ? '📦 ON' : '📦 OFF'}
						onClick={() => onShowArtifactsChange(!showArtifacts)}
						sx={{
							cursor: 'pointer',
							height: 28,
							fontSize: '0.75rem',
							backgroundColor: showArtifacts
								? 'rgba(124, 77, 255, 0.2)'
								: 'rgba(160, 160, 160, 0.1)',
							color: showArtifacts ? '#7c4dff' : 'text.secondary',
							border: `1px solid ${showArtifacts ? 'rgba(124, 77, 255, 0.3)' : 'rgba(160, 160, 160, 0.2)'
								}`,
							'&:hover': {
								backgroundColor: showArtifacts
									? 'rgba(124, 77, 255, 0.3)'
									: 'rgba(160, 160, 160, 0.2)',
							},
						}}
					/>
					<Chip
						size="small"
						label={showInput ? '📥 ON' : '📥 OFF'}
						onClick={() => onShowInputChange(!showInput)}
						sx={{
							cursor: 'pointer',
							height: 28,
							fontSize: '0.75rem',
							backgroundColor: showInput
								? 'rgba(0, 230, 118, 0.2)'
								: 'rgba(160, 160, 160, 0.1)',
							color: showInput ? '#00e676' : 'text.secondary',
							border: `1px solid ${showInput ? 'rgba(0, 230, 118, 0.3)' : 'rgba(160, 160, 160, 0.2)'
								}`,
							'&:hover': {
								backgroundColor: showInput
									? 'rgba(0, 230, 118, 0.3)'
									: 'rgba(160, 160, 160, 0.2)',
							},
						}}
					/>
				</Stack>
			</Stack>
		</Paper>
	);
}

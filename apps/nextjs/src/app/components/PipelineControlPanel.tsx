'use client';

import { Box, Button, Paper, Stack, Chip, CircularProgress, Typography, Divider } from '@mui/material';
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
	/** Запуск Next.js success pipeline */
	onNextjsSuccess: () => void;
	/** Запуск Next.js error pipeline */
	onNextjsError: () => void;
	/** Запуск NestJS success pipeline */
	onNestjsSuccess: () => void;
	/** Запуск NestJS error pipeline */
	onNestjsError: () => void;
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
	onNextjsSuccess,
	onNextjsError,
	onNestjsSuccess,
	onNestjsError,
	isRunning,
	currentPipelineType,
}: PipelineControlPanelProps) {
	const isNextjsSuccessRunning = isRunning && currentPipelineType === 'nextjs-success';
	const isNextjsErrorRunning = isRunning && currentPipelineType === 'nextjs-error';
	const isNestjsSuccessRunning = isRunning && currentPipelineType === 'nestjs-success';
	const isNestjsErrorRunning = isRunning && currentPipelineType === 'nestjs-error';

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
				{/* Кнопки запуска */}
				<Stack
					direction={{ xs: 'column', md: 'row' }}
					spacing={2}
					alignItems={{ xs: 'stretch', md: 'center' }}
					justifyContent="space-between"
				>
					{/* Next.js API */}
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
						<Stack direction="row" spacing={1}>
							<Button
								variant="contained"
								size="small"
								onClick={onNextjsSuccess}
								disabled={isRunning}
								startIcon={
									isNextjsSuccessRunning ? (
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
								Success
							</Button>
							<Button
								variant="contained"
								size="small"
								onClick={onNextjsError}
								disabled={isRunning}
								startIcon={
									isNextjsErrorRunning ? (
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
								Error
							</Button>
						</Stack>
					</Box>

					{/* Разделитель */}
					<Divider
						orientation="vertical"
						flexItem
						sx={{
							display: { xs: 'none', md: 'block' },
							borderColor: 'rgba(160, 160, 160, 0.2)',
						}}
					/>

					{/* NestJS API */}
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
						<Stack direction="row" spacing={1}>
							<Button
								variant="outlined"
								size="small"
								onClick={onNestjsSuccess}
								disabled={isRunning}
								startIcon={
									isNestjsSuccessRunning ? (
										<CircularProgress size={14} color="inherit" />
									) : (
										<CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
									)
								}
								sx={{
									px: 2,
									py: 0.75,
									fontSize: '0.8rem',
									borderColor: '#ffd54f',
									color: '#ffd54f',
									'&:hover': {
										borderColor: '#ffee58',
										backgroundColor: 'rgba(255, 213, 79, 0.1)',
									},
									'&:disabled': {
										borderColor: 'rgba(255, 213, 79, 0.3)',
										color: 'rgba(255, 213, 79, 0.5)',
									},
								}}
							>
								Success
							</Button>
							<Button
								variant="outlined"
								size="small"
								onClick={onNestjsError}
								disabled={isRunning}
								startIcon={
									isNestjsErrorRunning ? (
										<CircularProgress size={14} color="inherit" />
									) : (
										<ErrorOutlineIcon sx={{ fontSize: 18 }} />
									)
								}
								sx={{
									px: 2,
									py: 0.75,
									fontSize: '0.8rem',
									borderColor: '#ffd54f',
									color: '#ffd54f',
									'&:hover': {
										borderColor: '#ffee58',
										backgroundColor: 'rgba(255, 213, 79, 0.1)',
									},
									'&:disabled': {
										borderColor: 'rgba(255, 213, 79, 0.3)',
										color: 'rgba(255, 213, 79, 0.5)',
									},
								}}
							>
								Error
							</Button>
						</Stack>
					</Box>

					{/* Разделитель */}
					<Divider
						orientation="vertical"
						flexItem
						sx={{
							display: { xs: 'none', md: 'block' },
							borderColor: 'rgba(160, 160, 160, 0.2)',
						}}
					/>

					{/* Настройки отображения */}
					<Box>
						<Typography
							variant="caption"
							sx={{
								color: 'text.secondary',
								fontWeight: 600,
								mb: 1,
								display: 'block',
								letterSpacing: '0.05em',
							}}
						>
							ОТОБРАЖЕНИЕ
						</Typography>
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
					</Box>
				</Stack>
			</Stack>
		</Paper>
	);
}

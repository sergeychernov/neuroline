import React, { useState } from 'react';
import { Box, Paper, Typography, Stack, Chip, Alert, Tabs, Tab } from '@mui/material';
import type { JobDisplayInfo } from '../types';
import { ArtifactView } from './ArtifactView';
import { InputView } from './InputView';
import { OptionsView } from './OptionsView';

export interface JobDetailsPanelProps {
	/** Job для отображения деталей */
	job: JobDisplayInfo;
	/** Callback при клике на редактирование Input */
	onInputEditClick?: (job: JobDisplayInfo) => void;
	/** Callback при клике на редактирование Options */
	onOptionsEditClick?: (job: JobDisplayInfo) => void;
}

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
	return (
		<Box
			role="tabpanel"
			hidden={value !== index}
			sx={{ pt: 2 }}
		>
			{value === index && children}
		</Box>
	);
};

/**
 * Панель с детальной информацией о выбранной Job
 */
export const JobDetailsPanel: React.FC<JobDetailsPanelProps> = ({
	job,
	onInputEditClick,
	onOptionsEditClick,
}) => {
	const [tabIndex, setTabIndex] = useState(0);

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setTabIndex(newValue);
	};

	// Определяем какие табы показывать
	const hasArtifact = job.artifact !== undefined;
	const hasInput = job.input !== undefined;
	const hasOptions = job.options !== undefined;
	const hasTabs = hasArtifact || hasInput || hasOptions;

	return (
		<Paper
			elevation={0}
			sx={{
				mt: 4,
				p: 3,
				backgroundColor: 'rgba(124, 77, 255, 0.1)',
				border: '1px solid rgba(124, 77, 255, 0.3)',
			}}
		>
			<Typography variant="h6" sx={{ mb: 2, color: '#7c4dff' }}>
				📋 Детали Job: {job.name}
			</Typography>
			<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
				<Chip
					label={`Статус: ${job.status}`}
					sx={{
						backgroundColor: 'rgba(0, 229, 255, 0.2)',
						color: '#00e5ff',
					}}
				/>
				{job.startedAt && (
					<Chip
						label={`Начало: ${new Date(job.startedAt).toLocaleTimeString()}`}
						variant="outlined"
					/>
				)}
				{job.finishedAt && (
					<Chip
						label={`Конец: ${new Date(job.finishedAt).toLocaleTimeString()}`}
						variant="outlined"
					/>
				)}
			</Stack>

			{job.error && (
				<Alert severity="error" sx={{ mt: 2 }}>
					{job.error.message}
				</Alert>
			)}

			{hasTabs && (
				<Box sx={{ mt: 3 }}>
					<Tabs
						value={tabIndex}
						onChange={handleTabChange}
						sx={{
							borderBottom: 1,
							borderColor: 'rgba(124, 77, 255, 0.3)',
							'& .MuiTab-root': {
								color: 'text.secondary',
								'&.Mui-selected': {
									color: '#7c4dff',
								},
							},
							'& .MuiTabs-indicator': {
								backgroundColor: '#7c4dff',
							},
						}}
					>
						{hasArtifact && <Tab label="📦 Артефакт" />}
						{hasInput && <Tab label="📥 Input" />}
						{hasOptions && <Tab label="⚙️ Options" />}
					</Tabs>

					{/* Вычисляем реальный индекс таба */}
					{hasArtifact && (
						<TabPanel value={tabIndex} index={0}>
							<ArtifactView artifact={job.artifact!} />
						</TabPanel>
					)}
					{hasInput && (
						<TabPanel value={tabIndex} index={hasArtifact ? 1 : 0}>
							<InputView
								input={job.input!}
								onEditClick={onInputEditClick ? () => onInputEditClick(job) : undefined}
							/>
						</TabPanel>
					)}
					{hasOptions && (
						<TabPanel
							value={tabIndex}
							index={(hasArtifact ? 1 : 0) + (hasInput ? 1 : 0)}
						>
							<OptionsView
								options={job.options!}
								onEditClick={onOptionsEditClick ? () => onOptionsEditClick(job) : undefined}
							/>
						</TabPanel>
					)}
				</Box>
			)}
		</Paper>
	);
};

export default JobDetailsPanel;

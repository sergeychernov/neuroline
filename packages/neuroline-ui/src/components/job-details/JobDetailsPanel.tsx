import React, { useState } from 'react';
import { Box, Paper, Typography, Stack, Chip, Tabs, Tab } from '@mui/material';
import type { JobDisplayInfo } from '../../types';
import { ArtifactView } from './ArtifactView';
import { ErrorView } from './ErrorView';
import { InputView } from './InputView';
import { OptionsView } from './OptionsView';

export interface JobDetailsPanelProps {
	/** Job to display details for */
	job: JobDisplayInfo;
	/** Callback on input edit click */
	onInputEditClick?: (job: JobDisplayInfo) => void;
	/** Callback on options edit click */
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
 * Panel with detailed info about a selected job
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

	// Determine which tabs to show
	const hasArtifact = job.artifact !== undefined;
	const hasInput = job.input !== undefined;
	const hasOptions = job.options !== undefined;
	const hasError = job.error !== undefined;
	const hasTabs = hasArtifact || hasInput || hasOptions || hasError;
	const errorTabIndex = (hasArtifact ? 1 : 0) + (hasInput ? 1 : 0) + (hasOptions ? 1 : 0);

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
				📋 Job details: {job.name}
			</Typography>
			<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
				<Chip
					label={`Status: ${job.status}`}
					sx={{
						backgroundColor: 'rgba(0, 229, 255, 0.2)',
						color: '#00e5ff',
					}}
				/>
				{job.startedAt && (
					<Chip
						label={`Started: ${new Date(job.startedAt).toLocaleTimeString()}`}
						variant="outlined"
					/>
				)}
				{job.finishedAt && (
					<Chip
						label={`Finished: ${new Date(job.finishedAt).toLocaleTimeString()}`}
						variant="outlined"
					/>
				)}
			</Stack>

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
						{hasArtifact && <Tab label="📦 Artefact" />}
						{hasInput && <Tab label="📥 Input" />}
						{hasOptions && <Tab label="⚙️ Options" />}
						{hasError && <Tab label="⚠️ Error" />}
					</Tabs>

					{/* Compute actual tab index */}
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
					{hasError && (
						<TabPanel value={tabIndex} index={errorTabIndex}>
							<ErrorView error={job.error!} />
						</TabPanel>
					)}
				</Box>
			)}
		</Paper>
	);
};

export default JobDetailsPanel;

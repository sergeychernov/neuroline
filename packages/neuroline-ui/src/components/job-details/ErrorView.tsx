import React, { useState, useMemo } from 'react';
import { Box, Paper, Typography, Tabs, Tab, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import type { JobError } from '../../types';

export interface ErrorViewProps {
	/** История ошибок job (включая промежуточные при ретраях) */
	errors: JobError[];
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

interface ErrorDetailsPanelProps {
	label: string;
	content: string;
}

const ErrorDetailsPanel: React.FC<ErrorDetailsPanelProps> = ({ label, content }) => {
	return (
		<Box>
			<Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
				{label}
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
				{content}
			</Paper>
		</Box>
	);
};

interface ErrorMessageViewProps {
	message: string;
}

const ErrorMessageView: React.FC<ErrorMessageViewProps> = ({ message }) => {
	return (
		<ErrorDetailsPanel label="Error message:" content={message} />
	);
};

interface ErrorStackViewProps {
	stack: string;
}

const ErrorStackView: React.FC<ErrorStackViewProps> = ({ stack }) => {
	return (
		<ErrorDetailsPanel label="Stack trace:" content={stack} />
	);
};

interface ErrorLogsViewProps {
	logs: string[];
}

const ErrorLogsView: React.FC<ErrorLogsViewProps> = ({ logs }) => {
	return (
		<ErrorDetailsPanel label="Logs:" content={logs.join('\n')} />
	);
};

interface ErrorDataViewProps {
	data: unknown;
}

const ErrorDataView: React.FC<ErrorDataViewProps> = ({ data }) => {
	if (data === null || data === undefined) {
		return (
			<Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
				No data
			</Typography>
		);
	}

	const content = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);

	return (
		<ErrorDetailsPanel label="Error data:" content={content} />
	);
};

/**
 * Component for displaying job errors history
 * Supports multiple errors (from retries) with attempt selector
 * Each error can have its own logs and data
 */
export const ErrorView: React.FC<ErrorViewProps> = ({ errors }) => {
	// Выбранный attempt (индекс в массиве errors)
	const [selectedErrorIndex, setSelectedErrorIndex] = useState(errors.length - 1);
	const [tabIndex, setTabIndex] = useState(0);

	const hasMultipleErrors = errors.length > 1;
	const currentError = errors[selectedErrorIndex] ?? errors[errors.length - 1];

	const stack = currentError?.stack?.trim();
	const hasStack = Boolean(stack);
	// Берём logs и data из текущей выбранной ошибки
	const logs = currentError?.logs;
	const data = currentError?.data;
	const hasLogs = Boolean(logs?.length);
	const hasData = data !== undefined;

	// Формируем табы для текущей ошибки
	const tabs = useMemo(() => [
		{
			key: 'message',
			label: '📝 Message',
			content: <ErrorMessageView message={currentError?.message ?? 'Unknown error'} />,
		},
		...(hasStack
			? [
				{
					key: 'stack',
					label: '🧵 Stack',
					content: <ErrorStackView stack={stack!} />,
				},
			]
			: []),
		...(hasLogs
			? [
				{
					key: 'logs',
					label: '📄 Logs',
					content: <ErrorLogsView logs={logs!} />,
				},
			]
			: []),
		...(hasData
			? [
				{
					key: 'data',
					label: '🧪 Data',
					content: <ErrorDataView data={data ?? null} />,
				},
			]
			: []),
	], [currentError, hasStack, hasLogs, hasData, stack, logs, data]);

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setTabIndex(newValue);
	};

	const handleErrorSelect = (event: { target: { value: unknown } }) => {
		setSelectedErrorIndex(event.target.value as number);
		setTabIndex(0); // Сбрасываем на первый таб при смене ошибки
	};

	return (
		<Box>
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
				<Typography variant="body2" sx={{ color: '#ff1744' }}>
					Error details:
				</Typography>
				{hasMultipleErrors && (
					<FormControl size="small" sx={{ minWidth: 150 }}>
						<InputLabel sx={{ color: 'text.secondary' }}>Attempt</InputLabel>
						<Select
							value={selectedErrorIndex}
							label="Attempt"
							onChange={handleErrorSelect}
							sx={{
								color: '#ff1744',
								'& .MuiOutlinedInput-notchedOutline': {
									borderColor: 'rgba(255, 23, 68, 0.3)',
								},
								'&:hover .MuiOutlinedInput-notchedOutline': {
									borderColor: 'rgba(255, 23, 68, 0.5)',
								},
								'&.Mui-focused .MuiOutlinedInput-notchedOutline': {
									borderColor: '#ff1744',
								},
							}}
						>
							{errors.map((err, idx) => (
								<MenuItem key={idx} value={idx}>
									Attempt {err.attempt ?? idx} {idx === errors.length - 1 ? '(latest)' : ''}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				)}
			</Box>
			<Tabs
				value={tabIndex}
				onChange={handleTabChange}
				sx={{
					borderBottom: 1,
					borderColor: 'rgba(255, 23, 68, 0.3)',
					'& .MuiTab-root': {
						color: 'text.secondary',
						'&.Mui-selected': {
							color: '#ff1744',
						},
					},
					'& .MuiTabs-indicator': {
						backgroundColor: '#ff1744',
					},
				}}
			>
				{tabs.map((tab) => (
					<Tab key={tab.key} label={tab.label} />
				))}
			</Tabs>
			{tabs.map((tab, index) => (
				<TabPanel key={tab.key} value={tabIndex} index={index}>
					{tab.content}
				</TabPanel>
			))}
		</Box>
	);
};

export default ErrorView;

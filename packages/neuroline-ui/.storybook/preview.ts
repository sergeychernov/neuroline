import type { Preview } from '@storybook/react-vite';
import { CssBaseline, ThemeProvider } from '@mui/material';
import React from 'react';
import { createNeurolineTheme, type NeurolineThemeMode } from '../src/theme';

const preview: Preview = {
	tags: ['autodocs'],
	globalTypes: {
		neurolineTheme: {
			description: 'Тема MUI для компонентов',
			defaultValue: 'dark',
			toolbar: {
				title: 'Тема',
				icon: 'contrast',
				items: [
					{ value: 'dark', title: 'Тёмная', icon: 'moon' },
					{ value: 'light', title: 'Светлая', icon: 'sun' },
				],
				dynamicTitle: true,
			},
		},
	},
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		backgrounds: {
			default: 'canvas',
			values: [
				{ name: 'canvas', value: 'transparent' },
				{ name: 'dark', value: '#0a0a0f' },
				{ name: 'light', value: '#f4f4f8' },
			],
		},
		docs: {
			canvas: {
				background: 'transparent',
			},
		},
	},
	decorators: [
		(Story, context) => {
			const raw = context.globals.neurolineTheme as string | undefined;
			const mode: NeurolineThemeMode = raw === 'light' ? 'light' : 'dark';
			const theme = createNeurolineTheme(mode);
			const bg = theme.palette.background.default;
			return React.createElement(
				ThemeProvider,
				{ theme },
				React.createElement(CssBaseline),
				React.createElement(
					'div',
					{ style: { backgroundColor: bg, padding: '20px', minHeight: '100px' } },
					React.createElement(Story),
				),
			);
		},
	],
};

export default preview;

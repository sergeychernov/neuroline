import { createTheme } from '@mui/material/styles';
import type { Theme, ThemeOptions } from '@mui/material/styles';

export type NeurolineThemeMode = 'light' | 'dark';

const neurolineTypography: NonNullable<ThemeOptions['typography']> = {
	fontFamily: '"JetBrains Mono", "Fira Code", "Roboto Mono", monospace',
	h1: {
		fontSize: '2.5rem',
		fontWeight: 700,
		letterSpacing: '-0.02em',
	},
	h2: {
		fontSize: '2rem',
		fontWeight: 600,
		letterSpacing: '-0.01em',
	},
	h3: {
		fontSize: '1.5rem',
		fontWeight: 600,
	},
	h6: {
		fontSize: '1rem',
		fontWeight: 600,
	},
	body1: {
		fontSize: '0.875rem',
		lineHeight: 1.7,
	},
	body2: {
		fontSize: '0.75rem',
		lineHeight: 1.6,
	},
	caption: {
		fontSize: '0.625rem',
		letterSpacing: '0.05em',
	},
};

const neurolineShape: NonNullable<ThemeOptions['shape']> = {
	borderRadius: 3,
};

const neurolineComponentsBase: ThemeOptions['components'] = {
	MuiButton: {
		styleOverrides: {
			root: {
				textTransform: 'none',
				fontWeight: 600,
				borderRadius: 2,
			},
		},
	},
	MuiPaper: {
		styleOverrides: {
			root: {
				backgroundImage: 'none',
			},
		},
	},
	MuiChip: {
		styleOverrides: {
			root: {
				fontWeight: 600,
				fontSize: '0.75rem',
			},
		},
	},
};

export const neurolineDarkThemeOptions: ThemeOptions = {
	palette: {
		mode: 'dark',
		primary: {
			main: '#7c4dff',
			light: '#b47cff',
			dark: '#3f1dcb',
		},
		secondary: {
			main: '#00e5ff',
			light: '#6effff',
			dark: '#00b2cc',
		},
		background: {
			default: '#0a0a0f',
			paper: '#13131a',
		},
		text: {
			primary: '#e8e8e8',
			secondary: '#a0a0a0',
		},
		success: {
			main: '#00e676',
		},
		warning: {
			main: '#ffab00',
		},
		error: {
			main: '#ff1744',
		},
		info: {
			main: '#00b8d4',
		},
	},
	typography: neurolineTypography,
	shape: neurolineShape,
	components: {
		...neurolineComponentsBase,
		MuiCard: {
			styleOverrides: {
				root: {
					backgroundImage: 'none',
					border: '1px solid rgba(124, 77, 255, 0.2)',
				},
			},
		},
	},
};

export const neurolineLightThemeOptions: ThemeOptions = {
	palette: {
		mode: 'light',
		primary: {
			main: '#5c3fb5',
			light: '#8b6ce8',
			dark: '#3d2a7a',
		},
		secondary: {
			main: '#006b78',
			light: '#00838f',
			dark: '#00454d',
		},
		background: {
			default: '#f4f4f8',
			paper: '#ffffff',
		},
		text: {
			primary: '#0a0a12',
			secondary: '#3a3a48',
		},
		success: {
			main: '#1b6e36',
			light: '#2e8b47',
			dark: '#0f4a22',
		},
		warning: {
			main: '#e65100',
			light: '#ef6c00',
			dark: '#bf360c',
		},
		error: {
			main: '#b71c1c',
			light: '#c62828',
			dark: '#7f1010',
		},
		info: {
			main: '#006978',
			light: '#00838f',
			dark: '#00424a',
		},
	},
	typography: neurolineTypography,
	shape: neurolineShape,
	components: {
		...neurolineComponentsBase,
		MuiCard: {
			styleOverrides: {
				root: {
					backgroundImage: 'none',
					border: '1px solid rgba(109, 79, 199, 0.22)',
				},
			},
		},
	},
};

/**
 * Готовые опции MUI: тёмная тема (как раньше — алиас для обратной совместимости).
 */
export const neurolineThemeOptions: ThemeOptions = neurolineDarkThemeOptions;

/**
 * Собирает тему Neuroline UI в указанном режиме (для ThemeProvider).
 */
export function createNeurolineTheme(mode: NeurolineThemeMode): Theme {
	return createTheme(
		mode === 'light' ? neurolineLightThemeOptions : neurolineDarkThemeOptions,
	);
}

export default neurolineThemeOptions;

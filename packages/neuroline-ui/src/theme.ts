import type { ThemeOptions } from '@mui/material/styles';

export const neurolineThemeOptions: ThemeOptions = {
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
  typography: {
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
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(124, 77, 255, 0.2)',
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
  },
};

export default neurolineThemeOptions;

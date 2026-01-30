import type { Preview } from '@storybook/react-vite';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import React from 'react';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7c4dff',
    },
    secondary: {
      main: '#00e5ff',
    },
    background: {
      default: '#0a0a0f',
      paper: '#13131a',
    },
  },
  typography: {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
});

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0a0a0f' },
        { name: 'light', value: '#ffffff' },
      ],
    },
    docs: {
      canvas: {
        background: '#0a0a0f',
      },
    },
  },
  decorators: [
    (Story) =>
      React.createElement(
        ThemeProvider,
        { theme },
        React.createElement(CssBaseline),
        React.createElement(
          'div',
          { style: { backgroundColor: '#0a0a0f', padding: '20px', minHeight: '100px' } },
          React.createElement(Story)
        )
      ),
  ],
};

export default preview;


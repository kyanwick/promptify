'use client';
import { createTheme } from '@mui/material/styles';

// 60-20-10 Color Rule
// 60% Dominant: #006e61 (Teal) - Backgrounds, main sections
// 30% Secondary: #4f2c00 (Brown) - Text, supporting elements
// 10% Accent: #ffc600 (Gold) - CTAs, highlights

const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
  },
  defaultColorScheme: 'light',
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: '#ffc600', // 10% accent - buttons, highlights
          light: '#ffd633',
          dark: '#cc9e00',
          contrastText: '#4f2c00',
        },
        secondary: {
          main: '#4f2c00', // 30% secondary - supporting elements
          light: '#f5e6d3', // Light warm beige for user prompt backgrounds
          dark: '#2a1800',
          contrastText: '#4f2c00',
        },
        info: {
          main: '#006e61', // Teal for user prompt borders
          light: '#26a69a',
          dark: '#00564d',
        },
        background: {
          default: '#e6f5f3', // 60% dominant - light teal background
          paper: '#ffffff',
        },
        text: {
          primary: '#4f2c00', // Brown for primary text
          secondary: '#7a4500',
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: '#ffc600', // 10% accent - buttons, highlights
          light: '#ffd633',
          dark: '#cc9e00',
          contrastText: '#1a1a1a',
        },
        secondary: {
          main: '#ffd633', // Lighter gold for secondary in dark mode
          light: '#4d4d3d', // Muted olive-gold for user prompt backgrounds
          dark: '#cc9e00',
          contrastText: '#1a1a1a',
        },
        info: {
          main: '#80cbc4', // Soft teal for user prompt borders
          light: '#b2dfdb',
          dark: '#4db6ac',
        },
        background: {
          default: '#303030', // 60% dominant - dark teal background
          paper: '#393939', // Medium teal for cards
        },
        text: {
          primary: '#ffffff',
          secondary: '#e6f5f3',
        },
      },
    },
  },
  typography: {
    fontFamily: 'Outfit, sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;


'use client';
import { createTheme } from '@mui/material/styles';

// Create a theme instance
const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: '#3C50E0',
        },
        secondary: {
          main: '#80CAEE',
        },
        background: {
          default: '#F1F5F9',
          paper: '#FFFFFF',
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: '#3C50E0',
        },
        secondary: {
          main: '#80CAEE',
        },
        background: {
          default: '#1C2434',
          paper: '#24303F',
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

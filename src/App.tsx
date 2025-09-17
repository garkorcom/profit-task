import React, { useEffect } from 'react';
import { AuthProvider } from './auth/AuthContext';
import AppRouter from './router/AppRouter';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { TimeTrackingProvider } from './contexts/TimeTrackingContext';
import { CommandPaletteProvider } from './contexts/CommandPaletteContext';
import FirestoreConnectionMonitor from './components/FirestoreConnectionMonitor';
import { initializeMobileOptimizations } from './utils/mobileOptimizations';
import './utils/createTestEstimate'; // Импортируем для доступа из консоли
import './utils/cleanOldContractors'; // Импортируем для очистки старых контрагентов
import './utils/recalculateAllEstimates'; // Импортируем утилиту пересчета смет

// Enhanced mobile-first theme with better performance
const theme = createTheme({
  palette: {
    primary: { 
      main: '#2e7d32',
      light: '#60ad5e',
      dark: '#005005'
    },
    secondary: {
      main: '#00bcd4',
      light: '#62efff',
      dark: '#008ba3'
    },
    success: {
      main: '#4caf50',
      light: '#80e27e',
      dark: '#087f23'
    },
    warning: {
      main: '#ff9800',
      light: '#ffcc80',
      dark: '#c66900'
    },
    info: {
      main: '#2196f3',
      light: '#6ec6ff',
      dark: '#0069c0'
    },
    error: {
      main: '#f44336',
      light: '#ff7961',
      dark: '#ba000d'
    },
    background: { 
      default: '#fafafa',
      paper: '#ffffff'
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0'
    }
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 }
  },
  shape: {
    borderRadius: 8
  },
  // Mobile-optimized breakpoints
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 768, // Standard tablet breakpoint
      lg: 1024,
      xl: 1200
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', // Faster transitions for mobile
          minHeight: 44, // Better touch targets
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          // Optimize for mobile scrolling
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden'
        }
      }
    },
    // Optimize Material-UI for mobile performance
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation'
        }
      }
    },
    MuiTouchRipple: {
      styleOverrides: {
        root: {
          // Faster ripple for mobile
          '& .MuiTouchRipple-ripple': {
            animationDuration: '300ms'
          }
        }
      }
    }
  }
});

function App() {
  // Initialize mobile optimizations on app start
  useEffect(() => {
    initializeMobileOptimizations();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <TimeTrackingProvider>
          <CommandPaletteProvider>
            <AppRouter />
            <FirestoreConnectionMonitor />
          </CommandPaletteProvider>
        </TimeTrackingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
export default App;
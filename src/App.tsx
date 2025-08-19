import React from 'react';
import { AuthProvider } from './auth/AuthContext';
import AppRouter from './router/AppRouter';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    background: { default: '#f4f6f8' },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}
export default App;
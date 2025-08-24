import React from 'react';
import { Button, Typography, Container, Paper } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { login } from './AuthContext';

const LoginPage: React.FC = () => {
  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: '20vh', p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">Вход в систему</Typography>
        <Button onClick={login} variant="contained" startIcon={<GoogleIcon />} sx={{ mt: 3, mb: 2 }}>
          Войти через Google
        </Button>
      </Paper>
    </Container>
  );
};
export default LoginPage;

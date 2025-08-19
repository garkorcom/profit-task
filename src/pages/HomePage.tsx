import React from 'react';
import { Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Панель управления</Typography>
      <Typography paragraph>Добро пожаловать, {currentUser?.displayName || 'Пользователь'}!</Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => navigate('/tasks')}>К задачам</Button>
        <Button variant="contained" onClick={() => navigate('/warehouse')}>На склад</Button>
      </Box>
    </Box>
  );
};
export default HomePage;
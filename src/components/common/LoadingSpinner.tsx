import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner: React.FC = () => (
  <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" sx={{ p: 4, minHeight: '100vh' }}>
    <CircularProgress />
    <Typography variant="body2" sx={{ mt: 2 }}>Загрузка...</Typography>
  </Box>
);
export default LoadingSpinner;
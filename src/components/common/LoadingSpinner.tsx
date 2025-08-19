import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const LoadingSpinner: React.FC = () => (
  <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 4 }}>
    <CircularProgress />
  </Box>
);
export default LoadingSpinner;
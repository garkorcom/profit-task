import React from 'react';
import { Box, Typography } from '@mui/material';
import { Inventory as InventoryIcon } from '@mui/icons-material';

const WarehousePage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4">
        <InventoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Склад
      </Typography>
      <Typography>Страница склада временно недоступна</Typography>
    </Box>
  );
};

export default WarehousePage;
export {};



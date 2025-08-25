import React, { useState } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, Typography } from '@mui/material';

const TestStartWork: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Тест диалога</Typography>
      
      <Button 
        variant="contained" 
        color="primary" 
        onClick={() => {
          console.log('Button clicked, opening dialog');
          setOpen(true);
        }}
      >
        Открыть диалог
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Тестовый диалог</DialogTitle>
        <DialogContent>
          <Typography>Диалог работает!</Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TestStartWork;




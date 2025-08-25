import React from 'react';
import { Box, Typography, Button, Container, Paper, Stack, Alert } from '@mui/material';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { PlayArrow as PlayArrowIcon, Stop as StopIcon } from '@mui/icons-material';
import TimeTrackingButton from '../components/TimeTrackingButton';

const SimpleTestPage: React.FC = () => {
  const { isWorking, currentSession, elapsedSeconds } = useTimeTracking();

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 3, mt: 3 }}>
        <Stack spacing={3}>
          <Typography variant="h4" align="center">Тестовая страница учета времени</Typography>

          {!isWorking ? (
            <Box textAlign="center">
              <Typography sx={{ mb: 2 }}>Нажмите, чтобы начать работу.</Typography>
              <TimeTrackingButton 
                variant="contained" 
                size="large"
                startIcon={<PlayArrowIcon />}
                buttonText="Начать работу"
              />
            </Box>
          ) : (
            <Box textAlign="center">
              <Alert severity="success">Работа в процессе</Alert>
              <Typography variant="h5" sx={{ my: 2 }}>
                Проект: {currentSession?.projectName}
              </Typography>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Задача: {currentSession?.taskName}
              </Typography>
              <Typography variant="h3" fontFamily="monospace">
                {formatTime(elapsedSeconds)}
              </Typography>
              <Button 
                variant="contained" 
                color="error" 
                size="large"
                startIcon={<StopIcon />}
                href="/time-tracking"
                sx={{ mt: 2 }}
              >
                Завершить работу
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};

export default SimpleTestPage;

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Box,
  Typography,
  Button,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  Stop as StopIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { useTimeTracking } from '../contexts/TimeTrackingContext';

const ActiveWorkSession: React.FC = () => {
  const { isWorking, currentSession, elapsedSeconds, stopWork, pauseWork, resumeWork, isPaused } = useTimeTracking();

  if (!isWorking || !currentSession) return null;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    if (window.confirm('Завершить работу и сохранить время в табель?')) {
      try {
        await stopWork();
      } catch (error) {
        console.error('Failed to stop work:', error);
        alert('Ошибка при завершении работы');
      }
    }
  };

  return (
    <Card 
      sx={{ 
        mb: 3, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {!isPaused && (
        <LinearProgress 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0,
            height: 3,
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
            },
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          }} 
        />
      )}
      
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <TimerIcon />
              <Typography variant="h6">
                {isPaused ? 'Работа на паузе' : 'Идет учет времени'}
              </Typography>
            </Box>
            
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>
              <strong>Проект:</strong> {currentSession.projectName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              <strong>Задача:</strong> {currentSession.taskName}
            </Typography>
            
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
              Начало: {currentSession.startTime.toLocaleTimeString('ru-RU')}
            </Typography>
          </Box>
          
          <Box textAlign="center">
            <Typography 
              variant="h3" 
              fontWeight="bold"
              sx={{ 
                fontFamily: 'monospace',
                textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {formatTime(elapsedSeconds)}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Время работы
            </Typography>
          </Box>
        </Box>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box>
          <IconButton 
            color="inherit" 
            onClick={() => isPaused ? resumeWork() : pauseWork()}
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
              }
            }}
          >
            {isPaused ? <PlayIcon /> : <PauseIcon />}
          </IconButton>
        </Box>
        
        <Button
          variant="contained"
          color="error"
          startIcon={<StopIcon />}
          onClick={handleStop}
          sx={{ 
            backgroundColor: 'rgba(244, 67, 54, 0.9)',
            '&:hover': {
              backgroundColor: 'rgba(244, 67, 54, 1)',
            }
          }}
        >
          Завершить работу
        </Button>
      </CardActions>
    </Card>
  );
};

export default ActiveWorkSession;

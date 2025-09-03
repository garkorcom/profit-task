import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  Tooltip,
  Badge,
  Collapse,
  Alert,
  Divider,
} from '@mui/material';
import {
  Timer as TimerIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  AccessTime as ClockIcon,
  Work as WorkIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { useNavigate } from 'react-router-dom';

interface TimeIndicatorProps {
  variant?: 'desktop' | 'mobile';
}

const TimeIndicator: React.FC<TimeIndicatorProps> = ({ variant = 'desktop' }) => {
  const navigate = useNavigate();
  const { 
    isWorking, 
    currentSession, 
    elapsedSeconds, 
    isPaused,
    stopWork,
    pauseWork,
    resumeWork 
  } = useTimeTracking();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [localTime, setLocalTime] = useState(elapsedSeconds);

  useEffect(() => {
    setLocalTime(elapsedSeconds);
  }, [elapsedSeconds]);

  useEffect(() => {
    if (!isWorking || isPaused) return;
    
    const interval = setInterval(() => {
      setLocalTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isWorking, isPaused]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    const confirmStop = window.confirm(
      `Завершить учет времени?\n\nПроект: ${currentSession?.projectName}\nЗадача: ${currentSession?.taskName}\nВремя: ${formatTime(localTime)}`
    );
    
    if (confirmStop) {
      await stopWork();
      setDialogOpen(false);
      navigate('/time-tracking');
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resumeWork();
    } else {
      pauseWork();
    }
  };

  if (!isWorking || !currentSession) {
    return null;
  }

  // Mobile variant - compact chip
  if (variant === 'mobile') {
    return (
      <>
        <Badge 
          color={isPaused ? "warning" : "success"} 
          variant="dot"
          sx={{
            '& .MuiBadge-dot': {
              animation: isPaused ? 'none' : 'pulse 2s infinite',
            },
            '@keyframes pulse': {
              '0%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.7, transform: 'scale(1.2)' },
              '100%': { opacity: 1, transform: 'scale(1)' },
            },
          }}
        >
          <Chip
            icon={<TimerIcon />}
            label={formatTime(localTime)}
            color={isPaused ? "warning" : "success"}
            size="small"
            onClick={() => setDialogOpen(true)}
            sx={{
              cursor: 'pointer',
              fontWeight: 'bold',
              minWidth: 80,
              '& .MuiChip-label': {
                fontSize: '0.875rem',
              },
            }}
          />
        </Badge>

        {/* Mobile Dialog */}
        <Dialog 
          open={dialogOpen} 
          onClose={() => setDialogOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Учет времени</Typography>
              <IconButton size="small" onClick={() => setDialogOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Card variant="outlined">
              <CardContent>
                <Box textAlign="center">
                  <Typography variant="h3" color={isPaused ? "warning.main" : "success.main"}>
                    {formatTime(localTime)}
                  </Typography>
                  {isPaused && (
                    <Chip label="На паузе" color="warning" size="small" sx={{ mt: 1 }} />
                  )}
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>Проект:</strong> {currentSession.projectName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Задача:</strong> {currentSession.taskName}
                </Typography>
              </CardContent>
            </Card>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
            <Button
              variant="outlined"
              color={isPaused ? "success" : "warning"}
              startIcon={isPaused ? <PlayIcon /> : <PauseIcon />}
              onClick={handlePauseResume}
            >
              {isPaused ? 'Продолжить' : 'Пауза'}
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<StopIcon />}
              onClick={handleStop}
            >
              Завершить
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  // Desktop variant - expandable indicator
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 80,
        right: 20,
        zIndex: 1200,
        minWidth: showDetails ? 320 : 160,
        transition: 'all 0.3s ease',
      }}
    >
      <Card
        elevation={4}
        sx={{
          background: isPaused 
            ? 'linear-gradient(135deg, #ffa726 0%, #ff9800 100%)'
            : 'linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)',
          color: 'white',
          cursor: 'pointer',
        }}
        onClick={() => setShowDetails(!showDetails)}
      >
        <CardContent sx={{ py: 1.5, px: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <Badge
                variant="dot"
                color="error"
                invisible={isPaused}
                sx={{
                  '& .MuiBadge-dot': {
                    animation: 'pulse 2s infinite',
                  },
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.3 },
                    '100%': { opacity: 1 },
                  },
                }}
              >
                <ClockIcon />
              </Badge>
              <Typography variant="h6" fontWeight="bold">
                {formatTime(localTime)}
              </Typography>
            </Box>
            {isPaused && (
              <Chip 
                label="ПАУЗА" 
                size="small" 
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
            )}
          </Box>

          <Collapse in={showDetails}>
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Проект
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {currentSession.projectName}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Задача
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {currentSession.taskName}
                </Typography>
              </Box>

              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Начало работы
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {new Date(currentSession.startTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Typography>
              </Box>

              <Box display="flex" gap={1} mt={2}>
                <Tooltip title={isPaused ? "Продолжить" : "Пауза"}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePauseResume();
                    }}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)',
                      },
                    }}
                  >
                    {isPaused ? <PlayIcon /> : <PauseIcon />}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Завершить работу">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStop();
                    }}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255,0,0,0.3)',
                      },
                    }}
                  >
                    <StopIcon />
                  </IconButton>
                </Tooltip>

                <Box flex={1} />

                <Tooltip title="Перейти к учету времени">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/time-tracking');
                    }}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)',
                      },
                    }}
                  >
                    <WorkIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {showDetails && (
        <Alert 
          severity="info" 
          sx={{ 
            mt: 1,
            '& .MuiAlert-message': {
              fontSize: '0.75rem',
            },
          }}
        >
          Кликните для сворачивания. Используйте кнопки для управления.
        </Alert>
      )}
    </Box>
  );
};

export default TimeIndicator;

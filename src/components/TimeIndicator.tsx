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
  SwapHoriz as SwitchIcon,
  TrendingUp as SmartIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { useNavigate } from 'react-router-dom';
import { useCommandPalette } from '../contexts/CommandPaletteContext';
import { useSmartSuggestions } from '../hooks/useSmartSuggestions';
import { useAuth } from '../auth/AuthContext';

interface TimeIndicatorProps {
  variant?: 'desktop' | 'mobile';
}

const TimeIndicator: React.FC<TimeIndicatorProps> = ({ variant = 'desktop' }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { openPalette } = useCommandPalette();
  const { 
    isWorking, 
    currentSession, 
    elapsedSeconds, 
    isPaused,
    stopWork,
    pauseWork,
    resumeWork,
    switchWork,
    isStartingWork 
  } = useTimeTracking();
  
  // Получаем умные предложения для быстрого переключения
  const { suggestions } = useSmartSuggestions(currentUser?.uid || '', {
    limit: 3,
    contextAware: true,
    minSessions: 1
  });
  
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
      await stopWork(undefined, undefined, undefined, true);
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

  // Функция быстрого переключения на рекомендуемую задачу
  const handleQuickSwitch = async () => {
    if (suggestions.length === 0) {
      openPalette();
      return;
    }

    const topSuggestion = suggestions[0];
    
    try {
      const taskData = {
        project: {
          id: topSuggestion.projectId || '',
          name: topSuggestion.projectName || 'Проект'
        },
        startMethod: 'quick_switch' as const
      };

      // Добавляем задачу, смету или услугу в зависимости от типа
      if (topSuggestion.type === 'task' && topSuggestion.task) {
        (taskData as any).task = topSuggestion.task;
      } else if (topSuggestion.type === 'estimate' && topSuggestion.estimate) {
        (taskData as any).estimate = topSuggestion.estimate;
      } else if (topSuggestion.type === 'service' && topSuggestion.service) {
        (taskData as any).estimate = topSuggestion.estimate;
        (taskData as any).service = topSuggestion.service;
      }

      await switchWork(taskData);
      console.log('🔄 Быстрое переключение через TimeIndicator');
      
      // Показываем детали после переключения
      setShowDetails(true);
    } catch (error) {
      console.error('Error switching task:', error);
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
          <DialogActions sx={{ flexDirection: 'column', gap: 1, pb: 2, px: 2 }}>
            {/* Основные кнопки управления */}
            <Box display="flex" gap={1} width="100%">
              <Button
                variant="outlined"
                color={isPaused ? "success" : "warning"}
                startIcon={isPaused ? <PlayIcon /> : <PauseIcon />}
                onClick={handlePauseResume}
                fullWidth
              >
                {isPaused ? 'Продолжить' : 'Пауза'}
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleStop}
                fullWidth
              >
                Завершить
              </Button>
            </Box>
            
            {/* T3 кнопки быстрого переключения */}
            <Box display="flex" gap={1} width="100%">
              <Button
                variant="outlined"
                startIcon={isStartingWork ? <TimerIcon /> : suggestions.length > 0 ? <SwitchIcon /> : <SmartIcon />}
                onClick={handleQuickSwitch}
                disabled={isStartingWork}
                fullWidth
                sx={{ fontSize: '0.875rem' }}
              >
                {isStartingWork 
                  ? 'Переключение...' 
                  : suggestions.length > 0 
                    ? `→ ${suggestions[0]?.name?.substring(0, 15)}${suggestions[0]?.name?.length > 15 ? '...' : ''}`
                    : 'Выбрать задачу'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<MenuIcon />}
                onClick={() => {
                  setDialogOpen(false);
                  openPalette();
                }}
                sx={{ minWidth: 'fit-content', px: 2 }}
              >
                ⌘K
              </Button>
            </Box>
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

                {/* T3 кнопка быстрого переключения */}
                <Tooltip title={
                  suggestions.length > 0 
                    ? `Переключить на: ${suggestions[0].name}`
                    : "Выбрать задачу (Ctrl+K)"
                }>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickSwitch();
                    }}
                    disabled={isStartingWork}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)',
                      },
                      position: 'relative'
                    }}
                  >
                    {isStartingWork ? (
                      <TimerIcon sx={{ animation: 'spin 1s linear infinite' }} />
                    ) : suggestions.length > 0 ? (
                      <>
                        <SwitchIcon />
                        <SmartIcon 
                          sx={{ 
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            fontSize: 10,
                            color: '#ffc107'
                          }} 
                        />
                      </>
                    ) : (
                      <MenuIcon />
                    )}
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
          {suggestions.length > 0 
            ? `🚀 T3: Переключение на "${suggestions[0].name}" одним кликом`
            : "Кликните для сворачивания. Ctrl+K для выбора задач."
          }
        </Alert>
      )}
      
      {/* CSS анимации */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </Box>
  );
};

export default TimeIndicator;

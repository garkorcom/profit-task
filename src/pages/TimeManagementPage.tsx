/**
 * TimeManagementPage - централизованная страница управления временем
 * Единая точка доступа ко всем функциям учета времени:
 * 1. Текущая активная сессия работы
 * 2. История записей времени
 * 3. Быстрый запуск работы
 * 4. Валидация и редактирование записей
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Divider,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  PlayArrowOutlined as ResumeIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Timer as TimerIcon,
  Assignment as TaskIcon,
  Work as ProjectIcon
} from '@mui/icons-material';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { useAuth } from '../auth/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Централизованная страница управления временем
 * Заменяет TimeControlPage и другие разрозненные интерфейсы
 */
export const TimeManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    isWorking,
    isPaused,
    currentEntry,
    currentTask,
    elapsedSeconds,
    timeEntries,
    isLoadingTimeEntries,
    stopWork,
    pauseWork,
    resumeWork,
    openTimeEntryModal
  } = useTimeTracking();

  const [actionLoading, setActionLoading] = useState(false);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (startTime: string, endTime?: string): string => {
    try {
      const start = new Date(startTime);
      const end = endTime ? new Date(endTime) : new Date();
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return '00:00:00';
      }
      
      const diffInSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
      return formatTime(Math.max(0, diffInSeconds));
    } catch (error) {
      return '00:00:00';
    }
  };

  const handleQuickStart = () => {
    openTimeEntryModal();
  };

  const handleStopWork = async () => {
    setActionLoading(true);
    try {
      await stopWork();
    } catch (error) {
      console.error('Error stopping work:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseResume = async () => {
    setActionLoading(true);
    try {
      if (isPaused) {
        await resumeWork();
      } else {
        await pauseWork();
      }
    } catch (error) {
      console.error('Error pausing/resuming work:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'primary';
      default: return 'default';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active': return 'Активная';
      case 'paused': return 'Приостановлена';
      case 'completed': return 'Завершена';
      default: return 'Неизвестно';
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Необходимо войти в систему для управления временем
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Управление временем
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Централизованное управление учетом рабочего времени
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
        {/* Текущая активная сессия */}
        <Box sx={{ flex: { lg: 2 } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimerIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ flex: 1 }}>
                  Текущая сессия
                </Typography>
                {!isWorking && (
                  <Button
                    variant="contained"
                    startIcon={<StartIcon />}
                    onClick={handleQuickStart}
                    disabled={actionLoading}
                  >
                    Начать работу
                  </Button>
                )}
              </Box>

              {isWorking && currentEntry ? (
                <Box>
                  <Paper sx={{ p: 3, mb: 2, bgcolor: isPaused ? 'warning.50' : 'success.50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h4" sx={{ fontFamily: 'monospace', mr: 2 }}>
                        {formatTime(elapsedSeconds)}
                      </Typography>
                      <Chip 
                        label={isPaused ? 'Приостановлена' : 'Активная'} 
                        color={isPaused ? 'warning' : 'success'}
                        icon={isPaused ? <PauseIcon /> : <TimerIcon />}
                      />
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Задача
                      </Typography>
                      <Typography variant="body1">
                        {currentTask?.task || currentEntry.taskName || 'Неизвестная задача'}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Проект
                      </Typography>
                      <Typography variant="body1">
                        {currentEntry.projectName || 'Не указан'}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant={isPaused ? 'contained' : 'outlined'}
                        startIcon={isPaused ? <ResumeIcon /> : <PauseIcon />}
                        onClick={handlePauseResume}
                        disabled={actionLoading}
                      >
                        {isPaused ? 'Возобновить' : 'Приостановить'}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<StopIcon />}
                        onClick={handleStopWork}
                        disabled={actionLoading}
                      >
                        Завершить
                      </Button>
                    </Box>
                  </Paper>
                </Box>
              ) : (
                <Alert severity="info">
                  Нет активной сессии работы. Нажмите "Начать работу" для запуска нового таймера.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Быстрые действия */}
        <Box sx={{ flex: { lg: 1 } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Быстрые действия
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<StartIcon />}
                  onClick={handleQuickStart}
                  disabled={isWorking}
                >
                  Начать новую работу
                </Button>
                
                <Divider />
                
                <Typography variant="subtitle2" color="text.secondary">
                  Статистика
                </Typography>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Записей за сегодня
                  </Typography>
                  <Typography variant="h6">
                    {timeEntries?.filter(entry => {
                      try {
                        if (!entry?.startTime) return false;
                        const entryDate = new Date(entry.startTime);
                        const today = new Date();
                        return !isNaN(entryDate.getTime()) && entryDate.toDateString() === today.toDateString();
                      } catch (error) {
                        return false;
                      }
                    }).length || 0}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Всего записей
                  </Typography>
                  <Typography variant="h6">
                    {timeEntries?.length || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* История записей времени */}
      <Box sx={{ mt: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HistoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ flex: 1 }}>
                  История записей времени
                </Typography>
              </Box>

              {isLoadingTimeEntries && <LinearProgress sx={{ mb: 2 }} />}

              {timeEntries && timeEntries.length > 0 ? (
                <List>
                  {timeEntries.slice(0, 10).filter(entry => entry && entry.id && entry.startTime).map((entry, index) => (
                    <React.Fragment key={entry.id}>
                      <ListItem>
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                          {entry.status === 'active' ? (
                            <TimerIcon color="success" />
                          ) : entry.status === 'paused' ? (
                            <PauseIcon color="warning" />
                          ) : (
                            <TaskIcon color="primary" />
                          )}
                        </Box>
                        
                        <ListItemText
                          primary={entry.taskName || 'Неизвестная задача'}
                          secondary={
                            <>
                              {entry.projectName && (
                                <span style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                  <ProjectIcon fontSize="small" style={{ marginRight: 4 }} />
                                  {entry.projectName}
                                </span>
                              )}
                              <span>
                                {(() => {
                                  try {
                                    const startDate = new Date(entry.startTime);
                                    if (isNaN(startDate.getTime()) || !entry.startTime) {
                                      return 'Неизвестное время';
                                    }
                                    return formatDistanceToNow(startDate, { 
                                      addSuffix: true, 
                                      locale: ru 
                                    });
                                  } catch (error) {
                                    return 'Неизвестное время';
                                  }
                                })()} • Длительность: {formatDuration(
                                  entry.startTime.toISOString(),
                                  entry.endTime?.toISOString()
                                )}
                              </span>
                            </>
                          }
                        />
                        
                        <Chip 
                          label={getStatusText(entry.status)} 
                          size="small"
                          color={getStatusColor(entry.status)}
                          sx={{ mr: 1 }}
                        />
                        
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            size="small"
                            onClick={() => console.log('Edit entry:', entry.id)}
                          >
                            <EditIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < Math.min(timeEntries.length - 1, 9) && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  Записи времени отсутствуют. Начните работу для создания первой записи.
                </Alert>
              )}
            </CardContent>
          </Card>
      </Box>
    </Container>
  );
};

export default TimeManagementPage;
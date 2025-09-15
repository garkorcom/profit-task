/**
 * GlobalTimerIndicator - глобальный индикатор активного таймера
 * Отображается в хедере приложения когда есть активная сессия работы
 * Позволяет быстро остановить/приостановить таймер из любого места
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Timer as TimerIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';

/**
 * Глобальный индикатор активной сессии работы
 * Фиксированное позиционирование в правом верхнем углу экрана
 */
export const GlobalTimerIndicator: React.FC = () => {
  const theme = useTheme();
  const { 
    isWorking, 
    isPaused, 
    currentEntry, 
    currentTask, 
    elapsedSeconds,
    stopWork,
    pauseWork,
    resumeWork
  } = useTimeTracking();

  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Не показывать если нет активной работы
  if (!isWorking || !currentEntry) return null;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = () => {
    setShowStopConfirm(true);
  };

  const handleConfirmStop = async () => {
    try {
      await stopWork(undefined, undefined, undefined, true);
      setShowStopConfirm(false);
    } catch (error) {
      console.error('Error stopping work:', error);
      // Можно добавить уведомление об ошибке
    }
  };

  const handlePauseResume = async () => {
    try {
      if (isPaused) {
        await resumeWork();
      } else {
        await pauseWork();
      }
    } catch (error) {
      console.error('Error pausing/resuming work:', error);
    }
  };

  const taskName = currentTask?.task || currentEntry.taskName || 'Неизвестная задача';

  return (
    <>
      {/* Глобальный индикатор - фиксированная позиция */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: theme.zIndex.appBar + 1,
          minWidth: 280,
          maxWidth: 400
        }}
      >
        <Card
          elevation={8}
          sx={{
            p: 2,
            background: isPaused 
              ? `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.8)}, ${alpha(theme.palette.warning.dark, 0.9)})`
              : `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.8)}, ${alpha(theme.palette.success.dark, 0.9)})`,
            color: 'white',
            border: `2px solid ${isPaused ? theme.palette.warning.light : theme.palette.success.light}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TimerIcon fontSize="small" />
            <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600 }}>
              {isPaused ? 'На паузе' : 'Активная работа'}
            </Typography>
            <Chip 
              label={formatTime(elapsedSeconds)} 
              size="small" 
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 'bold',
                fontFamily: 'monospace'
              }} 
            />
          </Box>

          <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
            {taskName}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title={isPaused ? 'Возобновить' : 'Приостановить'}>
                <IconButton
                  size="small"
                  onClick={handlePauseResume}
                  sx={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  {isPaused ? <PlayIcon /> : <PauseIcon />}
                </IconButton>
              </Tooltip>

              <Tooltip title="Подробности">
                <IconButton
                  size="small"
                  onClick={() => setShowDetails(true)}
                  sx={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  <VisibilityIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Tooltip title="Остановить работу">
              <IconButton
                size="small"
                onClick={handleStop}
                sx={{ color: 'rgba(255,255,255,0.9)' }}
              >
                <StopIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Card>
      </Box>

      {/* Диалог подтверждения остановки */}
      <Dialog open={showStopConfirm} onClose={() => setShowStopConfirm(false)}>
        <DialogTitle>Завершить работу?</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите завершить работу над задачей "{taskName}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Время работы: {formatTime(elapsedSeconds)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStopConfirm(false)}>Отмена</Button>
          <Button onClick={handleConfirmStop} variant="contained">
            Завершить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог с подробностями */}
      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Детали активной сессии</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Задача</Typography>
              <Typography>{taskName}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">Проект</Typography>
              <Typography>{currentEntry.projectName || 'Не указан'}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">Время работы</Typography>
              <Typography variant="h6" color="primary">{formatTime(elapsedSeconds)}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">Статус</Typography>
              <Chip 
                label={isPaused ? 'Приостановлена' : 'Активная'} 
                color={isPaused ? 'warning' : 'success'}
                size="small"
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">Время начала</Typography>
              <Typography>
                {new Date(currentEntry.startTime).toLocaleString('ru-RU')}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Stack,
  LinearProgress,
  Chip,
  Box,
  Divider,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  Timer as TimerIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  TrendingUp as EfficiencyIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { getTimeEntryStatistics, formatDuration, formatTimeHMS } from '../api/timeEntryEnhanced';
import { useAuth } from '../auth/AuthContext';

interface TimeStatisticsProps {
  entryId?: string;
  showDetails?: boolean;
}

export const TimeStatistics: React.FC<TimeStatisticsProps> = ({ 
  entryId, 
  showDetails = true 
}) => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryId || !currentUser) return;

    const loadStats = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const statistics = await getTimeEntryStatistics(currentUser.uid, entryId);
        setStats(statistics);
      } catch (err) {
        console.error('Error loading time statistics:', err);
        setError('Не удалось загрузить статистику');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    // Обновляем статистику каждые 30 секунд для активных сессий
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [entryId, currentUser]);

  if (!entryId || !stats) return null;
  
  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>Ошибка</AlertTitle>
        {error}
      </Alert>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'info';
      case 'approved': return 'success';
      default: return 'default';
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'success';
    if (efficiency >= 70) return 'warning';
    return 'error';
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          {/* Заголовок со статусом */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              <TimerIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
              Статистика времени
            </Typography>
            <Chip 
              label={stats.currentStatus}
              color={getStatusColor(stats.currentStatus)}
              size="small"
            />
          </Stack>

          <Divider />

          {/* Основные метрики */}
          <Stack spacing={2}>
            {/* Активное время */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  <PlayIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                  Активное время
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatDuration(stats.activeDuration)}
                </Typography>
              </Stack>
            </Box>

            {/* Время пауз */}
            {stats.pauseDuration > 0 && (
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    <PauseIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    Время пауз ({stats.pauseCount} пауз)
                  </Typography>
                  <Typography variant="body1" color="warning.main">
                    {formatDuration(stats.pauseDuration)}
                  </Typography>
                </Stack>
              </Box>
            )}

            {/* Общее время */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  <ScheduleIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                  Общее время
                </Typography>
                <Typography variant="body1">
                  {formatDuration(stats.totalDuration)}
                </Typography>
              </Stack>
            </Box>
          </Stack>

          {/* Эффективность */}
          {stats.totalDuration > 0 && (
            <>
              <Divider />
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    <EfficiencyIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    Эффективность
                  </Typography>
                  <Chip
                    label={`${stats.efficiency}%`}
                    color={getEfficiencyColor(stats.efficiency)}
                    size="small"
                  />
                </Stack>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.efficiency} 
                  color={getEfficiencyColor(stats.efficiency)}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Процент активного времени от общего
                </Typography>
              </Box>
            </>
          )}

          {/* Детальная информация */}
          {showDetails && (
            <>
              <Divider />
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  Начало: {stats.startTime.toLocaleString()}
                </Typography>
                {stats.endTime && (
                  <Typography variant="caption" color="text.secondary">
                    Завершение: {stats.endTime.toLocaleString()}
                  </Typography>
                )}
              </Stack>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default TimeStatistics;

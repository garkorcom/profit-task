/**
 * ============================================================================
 * SMART START WIDGET - ИНТЕЛЛЕКТУАЛЬНЫЙ ВИДЖЕТ БЫСТРОГО ЗАПУСКА (T3 Optimization)
 * ============================================================================
 * 
 * Компонент для дашборда, предоставляющий быстрый доступ к наиболее релевантным
 * задачам на основе AI-анализа пользовательского поведения.
 * 
 * КЛЮЧЕВЫЕ ВОЗМОЖНОСТИ:
 * ════════════════════════
 * 
 * 🚀 МОЛНИЕНОСНЫЙ ЗАПУСК:
 * ├─ Один клик для старта предложенных задач
 * ├─ Optimistic UI updates для мгновенного отклика
 * ├─ Smart suggestions с контекстной приоритизацией
 * └─ Автоматическое обновление предложений
 * 
 * 🧠 AI-АНАЛИЗ:
 * ├─ Recency: недавние задачи (72 часа)
 * ├─ Frequency: часто используемые задачи  
 * ├─ Context: время дня и день недели
 * └─ Smart scoring: 4-факторный алгоритм
 * 
 * 💡 UX ОПТИМИЗАЦИИ:
 * ├─ Skeleton loading для плавной загрузки
 * ├─ Error states с retry функциональностью
 * ├─ Empty states с полезными подсказками
 * └─ Responsive дизайн для всех устройств
 * 
 * 🎯 ПРОДОЛЖЕНИЕ РАБОТЫ:
 * ├─ "Продолжить: [Последняя задача]" если нет активной
 * ├─ "Переключить на:" для активных сессий
 * ├─ История последних 5 задач
 * └─ Контекстные иконки и метаданные
 * 
 * @version 1.0.0
 * @since 2024-09-09
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Avatar,
  Skeleton,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  SwapHoriz as SwitchIcon,
  Refresh as RefreshIcon,
  Schedule as TimeIcon,
  TrendingUp as TrendingIcon,
  WorkOutline as WorkIcon,
  Assessment as EstimateIcon,
  Build as ServiceIcon,
  Star as FavoriteIcon,
  AccessTime as RecentIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

import { useSmartSuggestions, TaskSuggestion } from '../hooks/useSmartSuggestions';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { useAuth } from '../auth/AuthContext';
import { formatDuration } from '../api/timeEntryUnified';

interface SmartStartWidgetProps {
  maxSuggestions?: number;
  showStats?: boolean;
  compact?: boolean;
  onStartTask?: (suggestion: TaskSuggestion) => void;
}

export const SmartStartWidget: React.FC<SmartStartWidgetProps> = ({
  maxSuggestions = 5,
  showStats = true,
  compact = false,
  onStartTask
}) => {
  const { currentUser } = useAuth();
  const { 
    isWorking, 
    currentEntry, 
    startWork, 
    switchWork, 
    isStartingWork 
  } = useTimeTracking();
  
  const { 
    suggestions, 
    isLoading, 
    error, 
    refresh, 
    stats 
  } = useSmartSuggestions(currentUser?.uid || '', {
    limit: maxSuggestions,
    contextAware: true,
    minSessions: 1
  });

  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);

  // Получение иконки по типу задачи
  const getTaskIcon = (suggestion: TaskSuggestion) => {
    switch (suggestion.type) {
      case 'task':
        return <WorkIcon />;
      case 'estimate':
        return <EstimateIcon />;
      case 'service':
        return <ServiceIcon />;
      default:
        return <WorkIcon />;
    }
  };

  // Получение цвета по срочности
  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  // Форматирование времени последнего использования
  const formatLastUsed = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins} мин назад`;
    } else if (diffHours < 24) {
      return `${diffHours} ч назад`;
    } else if (diffDays < 7) {
      return `${diffDays} д назад`;
    } else {
      return date.toLocaleDateString('ru-RU', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Обработка запуска/переключения задачи
  const handleStartTask = async (suggestion: TaskSuggestion) => {
    if (!currentUser) return;

    setStartingTaskId(suggestion.id);
    
    try {
      // Определяем объекты для startWork/switchWork
      const taskData = {
        project: {
          id: suggestion.projectId || '',
          name: suggestion.projectName || 'Проект',
          type: 'commercial_remodel' as const,
          status: 'active' as const,
          priority: 'medium' as const,
          startDate: new Date(),
          endDate: null,
          budget: 0,
          description: '',
          location: {
            address: '',
            city: '',
            country: ''
          },
          participants: [],
          financials: {
            totalBudget: 0,
            totalActual: 0,
            totalRemaining: 0,
            currency: 'USD'
          },
          createdBy: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        startMethod: 'smart_suggestion' as const
      };

      // Добавляем задачу, смету или услугу в зависимости от типа
      if (suggestion.type === 'task' && suggestion.task) {
        (taskData as any).task = suggestion.task;
      } else if (suggestion.type === 'estimate' && suggestion.estimate) {
        (taskData as any).estimate = suggestion.estimate;
      } else if (suggestion.type === 'service' && suggestion.service) {
        (taskData as any).estimate = suggestion.estimate;
        (taskData as any).service = suggestion.service;
      }

      // Запускаем или переключаем задачу
      if (isWorking) {
        await switchWork(taskData);
        console.log('🔄 Задача переключена через Smart Widget');
      } else {
        await startWork(taskData);
        console.log('🚀 Задача запущена через Smart Widget');
      }

      // Вызываем callback если есть
      onStartTask?.(suggestion);
      
    } catch (error) {
      console.error('Error starting task from widget:', error);
    } finally {
      setStartingTaskId(null);
    }
  };

  // Скелетон загрузки
  const LoadingSkeleton = () => (
    <Box>
      {Array.from({ length: compact ? 3 : 5 }).map((_, index) => (
        <Box key={index} display="flex" alignItems="center" mb={2}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Box flex={1}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Box>
          <Skeleton variant="rectangular" width={80} height={32} />
        </Box>
      ))}
    </Box>
  );

  // Error состояние
  const ErrorState = () => (
    <Alert 
      severity="warning" 
      action={
        <IconButton size="small" onClick={refresh}>
          <RefreshIcon />
        </IconButton>
      }
    >
      Не удалось загрузить предложения. Попробуйте обновить.
    </Alert>
  );

  // Empty состояние
  const EmptyState = () => (
    <Box textAlign="center" py={4}>
      <TrendingIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Пока нет предложений
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Начните работать с задачами, и мы покажем вам умные предложения
      </Typography>
      <Button 
        variant="outlined" 
        startIcon={<RefreshIcon />}
        onClick={refresh}
        size="small"
      >
        Обновить
      </Button>
    </Box>
  );

  return (
    <Card elevation={2}>
      <CardContent sx={{ pb: compact ? 2 : 3 }}>
        {/* Заголовок */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <TrendingIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="div">
              {isWorking ? 'Переключить на' : 'Быстрый старт'}
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            {showStats && stats.totalEntries > 0 && (
              <Chip 
                label={`${stats.uniqueTasks} задач`}
                size="small"
                variant="outlined"
              />
            )}
            <Tooltip title="Обновить предложения">
              <IconButton 
                size="small" 
                onClick={refresh}
                disabled={isLoading}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Контент */}
        {isLoading && <LoadingSkeleton />}
        
        {error && !isLoading && <ErrorState />}
        
        {!isLoading && !error && suggestions.length === 0 && <EmptyState />}
        
        {!isLoading && !error && suggestions.length > 0 && (
          <List disablePadding>
            {suggestions.map((suggestion, index) => (
              <React.Fragment key={suggestion.id}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{ 
                    px: 0,
                    py: compact ? 1 : 1.5,
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderRadius: 1
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        bgcolor: `${getUrgencyColor(suggestion.urgency)}.main`,
                        width: compact ? 32 : 40,
                        height: compact ? 32 : 40
                      }}
                    >
                      {getTaskIcon(suggestion)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2" noWrap>
                          {suggestion.name}
                        </Typography>
                        {suggestion.score > 80 && (
                          <FavoriteIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {suggestion.description && (
                          <Typography 
                            variant="caption" 
                            display="block" 
                            color="text.secondary"
                            sx={{ mb: 0.5 }}
                          >
                            {suggestion.description}
                          </Typography>
                        )}
                        
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                          <Chip
                            icon={<RecentIcon />}
                            label={formatLastUsed(suggestion.lastUsed)}
                            size="small"
                            variant="outlined"
                          />
                          
                          {suggestion.totalDuration > 0 && (
                            <Chip
                              icon={<TimeIcon />}
                              label={formatDuration(suggestion.totalDuration)}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          
                          <Chip
                            label={`${suggestion.sessionCount} сессий`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <Button
                      variant={index === 0 ? "contained" : "outlined"}
                      size="small"
                      startIcon={
                        startingTaskId === suggestion.id ? (
                          <CircularProgress size={16} />
                        ) : isWorking ? (
                          <SwitchIcon />
                        ) : (
                          <StartIcon />
                        )
                      }
                      onClick={() => handleStartTask(suggestion)}
                      disabled={isStartingWork || startingTaskId === suggestion.id}
                      sx={{ minWidth: 90 }}
                    >
                      {startingTaskId === suggestion.id 
                        ? 'Запуск...' 
                        : isWorking 
                          ? 'Переключить' 
                          : 'Старт'
                      }
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
                
                {index < suggestions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {/* Статистика (опционально) */}
        {showStats && !compact && suggestions.length > 0 && (
          <Box mt={2} pt={2} sx={{ borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              На основе {stats.totalEntries} записей времени. 
              Средний скор: {Math.round(stats.avgScore || 0)}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartStartWidget;
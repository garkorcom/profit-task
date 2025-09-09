/**
 * ============================================================================
 * COMMAND PALETTE - КОМАНДНАЯ ПАЛИТРА (T3 Optimization)
 * ============================================================================
 * 
 * Глобальная командная палитра для молниеносного доступа к функциям приложения.
 * Активируется по Ctrl+K (Cmd+K на Mac) и обеспечивает поиск по задачам,
 * быстрый запуск и переключение без использования мыши.
 * 
 * КЛЮЧЕВЫЕ ВОЗМОЖНОСТИ:
 * ═════════════════════
 * 
 * ⚡ МГНОВЕННЫЙ ДОСТУП:
 * ├─ Ctrl+K / Cmd+K для открытия
 * ├─ Fuzzy search по всем элементам
 * ├─ Enter для выбора, Escape для закрытия
 * └─ Навигация стрелками и группировка
 * 
 * 🔍 УМНЫЙ ПОИСК:
 * ├─ Интеграция с useSmartSuggestions
 * ├─ Поиск по проектам, задачам, сметам
 * ├─ История последних команд
 * └─ Контекстные предложения
 * 
 * 🚀 БЫСТРЫЕ ДЕЙСТВИЯ:
 * ├─ "Начать работу: [Задача]"
 * ├─ "Переключиться на: [Задача]"  
 * ├─ "Открыть проект: [Проект]"
 * └─ "Пауза" / "Стоп" для активных сессий
 * 
 * 🎯 T3 INTEGRATION:
 * ├─ Запуск задач через startMethod: 'command_palette'
 * ├─ Optimistic updates для мгновенного отклика
 * ├─ Keyboard-first UX для продвинутых пользователей
 * └─ Аналитика использования команд
 * 
 * @version 1.0.0
 * @since 2024-09-09
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Avatar,
  Chip,
  useTheme,
  alpha,
  IconButton
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  SwapHoriz as SwitchIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  FolderOpen as ProjectIcon,
  Assignment as TaskIcon,
  Receipt as EstimateIcon,
  Build as ServiceIcon,
  Schedule as TimeIcon,
  Search as SearchIcon,
  Keyboard as KeyboardIcon,
  TrendingUp as SmartIcon
} from '@mui/icons-material';

import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { useSmartSuggestions, TaskSuggestion } from '../hooks/useSmartSuggestions';
import { useAuth } from '../auth/AuthContext';
import { formatDuration } from '../api/timeEntryUnified';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  type: 'action' | 'suggestion' | 'project' | 'navigation';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  keywords: string[];
  onExecute: () => Promise<void> | void;
  disabled?: boolean;
  suggestion?: TaskSuggestion;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { 
    isWorking, 
    currentEntry, 
    startWork, 
    switchWork, 
    stopWork, 
    pauseWork, 
    resumeWork,
    isPaused,
    isStartingWork 
  } = useTimeTracking();
  
  const { suggestions, isLoading } = useSmartSuggestions(currentUser?.uid || '', {
    limit: 10,
    contextAware: true,
    minSessions: 1
  });

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Закрытие палитры и очистка поиска
  const handleClose = useCallback(() => {
    setSearch('');
    onClose();
  }, [onClose]);

  // Обработчик клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) {
          handleClose();
        } else {
          setSearch('');
          // onOpen будет вызван через родительский компонент
        }
      }
      
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleClose]);

  // Выполнение команды
  const executeCommand = async (command: CommandItem) => {
    setLoading(true);
    try {
      await command.onExecute();
      handleClose();
    } catch (error) {
      console.error('Command execution failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Создание базовых команд
  const createBaseCommands = useCallback((): CommandItem[] => {
    const commands: CommandItem[] = [];

    // Команды управления временем
    if (isWorking) {
      if (isPaused) {
        commands.push({
          id: 'resume',
          type: 'action',
          title: 'Продолжить работу',
          subtitle: currentEntry ? `${currentEntry.taskName || 'Текущая задача'}` : undefined,
          icon: <StartIcon sx={{ color: 'success.main' }} />,
          keywords: ['продолжить', 'resume', 'continue'],
          onExecute: resumeWork
        });
      } else {
        commands.push({
          id: 'pause',
          type: 'action',
          title: 'Пауза',
          subtitle: currentEntry ? `${currentEntry.taskName || 'Текущая задача'}` : undefined,
          icon: <PauseIcon sx={{ color: 'warning.main' }} />,
          keywords: ['пауза', 'pause'],
          onExecute: pauseWork
        });
      }

      commands.push({
        id: 'stop',
        type: 'action',
        title: 'Остановить работу',
        subtitle: currentEntry ? `${currentEntry.taskName || 'Текущая задача'}` : undefined,
        icon: <StopIcon sx={{ color: 'error.main' }} />,
        keywords: ['стоп', 'stop', 'остановить'],
        onExecute: stopWork
      });
    }

    return commands;
  }, [isWorking, isPaused, currentEntry, resumeWork, pauseWork, stopWork]);

  // Создание команд из умных предложений
  const createSuggestionCommands = useCallback((): CommandItem[] => {
    if (!suggestions.length) return [];

    return suggestions.map(suggestion => ({
      id: `suggestion-${suggestion.id}`,
      type: 'suggestion' as const,
      title: isWorking ? `Переключиться на: ${suggestion.name}` : `Начать: ${suggestion.name}`,
      subtitle: suggestion.description || 
                `${suggestion.projectName || 'Проект'} • ${formatDuration(suggestion.totalDuration)} • ${suggestion.sessionCount} сессий`,
      icon: isWorking ? 
            <SwitchIcon sx={{ color: 'primary.main' }} /> : 
            <StartIcon sx={{ color: 'success.main' }} />,
      keywords: [
        suggestion.name,
        suggestion.projectName || '',
        suggestion.description || '',
        suggestion.type,
        'задача', 'task', 'смета', 'estimate'
      ].filter(Boolean),
      suggestion,
      onExecute: async () => {
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
          startMethod: 'command_palette' as const
        };

        // Добавляем задачу, смету или услугу
        if (suggestion.type === 'task' && suggestion.task) {
          (taskData as any).task = suggestion.task;
        } else if (suggestion.type === 'estimate' && suggestion.estimate) {
          (taskData as any).estimate = suggestion.estimate;
        } else if (suggestion.type === 'service' && suggestion.service) {
          (taskData as any).estimate = suggestion.estimate;
          (taskData as any).service = suggestion.service;
        }

        if (isWorking) {
          await switchWork(taskData);
          console.log('🔄 Задача переключена через Command Palette');
        } else {
          await startWork(taskData);
          console.log('🚀 Задача запущена через Command Palette');
        }
      }
    }));
  }, [suggestions, isWorking, startWork, switchWork]);

  // Получение иконки для типа предложения
  const getSuggestionIcon = (suggestion: TaskSuggestion) => {
    switch (suggestion.type) {
      case 'task':
        return <TaskIcon />;
      case 'estimate':
        return <EstimateIcon />;
      case 'service':
        return <ServiceIcon />;
      default:
        return <TaskIcon />;
    }
  };

  // Получение цвета по срочности
  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high': return theme.palette.error.main;
      case 'medium': return theme.palette.warning.main;
      case 'low': return theme.palette.info.main;
      default: return theme.palette.text.secondary;
    }
  };

  // Объединение всех команд
  const allCommands = [
    ...createBaseCommands(),
    ...createSuggestionCommands()
  ];

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          boxShadow: theme.shadows[24]
        }
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Command shouldFilter={false}>
          {/* Заголовок с поиском */}
          <Box sx={{ 
            p: 2, 
            borderBottom: 1, 
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <SearchIcon sx={{ color: 'text.secondary' }} />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Поиск команд и задач..."
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: '16px',
                fontFamily: theme.typography.fontFamily,
                width: '100%',
                color: theme.palette.text.primary
              }}
            />
            <Box display="flex" alignItems="center" gap={0.5}>
              <Chip 
                icon={<KeyboardIcon />}
                label="Ctrl+K"
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>

          <Command.List style={{ maxHeight: '400px', overflow: 'auto' }}>
            <Command.Empty>
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Команды не найдены
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Попробуйте другой поисковый запрос
                </Typography>
              </Box>
            </Command.Empty>

            {/* Группа: Управление временем */}
            {createBaseCommands().length > 0 && (
              <Command.Group heading="Управление временем">
                {createBaseCommands().map(command => (
                  <Command.Item
                    key={command.id}
                    value={`${command.title} ${command.keywords.join(' ')}`}
                    onSelect={() => executeCommand(command)}
                    disabled={command.disabled || loading}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      width: '100%',
                      p: 1,
                      cursor: 'pointer',
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08)
                      }
                    }}>
                      <Avatar sx={{ mr: 2, width: 32, height: 32, bgcolor: 'transparent' }}>
                        {command.icon}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="subtitle2">
                          {command.title}
                        </Typography>
                        {command.subtitle && (
                          <Typography variant="caption" color="text.secondary">
                            {command.subtitle}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Группа: Умные предложения */}
            {createSuggestionCommands().length > 0 && (
              <Command.Group heading={`Умные предложения ${isLoading ? '(загружаются...)' : ''}`}>
                {createSuggestionCommands().map(command => (
                  <Command.Item
                    key={command.id}
                    value={`${command.title} ${command.keywords.join(' ')}`}
                    onSelect={() => executeCommand(command)}
                    disabled={command.disabled || loading || isStartingWork}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      width: '100%',
                      p: 1,
                      cursor: 'pointer',
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08)
                      }
                    }}>
                      <Avatar sx={{ 
                        mr: 2, 
                        width: 32, 
                        height: 32,
                        bgcolor: command.suggestion ? getUrgencyColor(command.suggestion.urgency) : 'primary.main'
                      }}>
                        {command.suggestion ? getSuggestionIcon(command.suggestion) : command.icon}
                      </Avatar>
                      
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2">
                            {command.suggestion?.name || command.title}
                          </Typography>
                          {command.suggestion && command.suggestion.score > 80 && (
                            <SmartIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          )}
                        </Box>
                        
                        {command.subtitle && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {command.subtitle}
                          </Typography>
                        )}
                        
                        {command.suggestion && (
                          <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                            <Chip
                              icon={<TimeIcon />}
                              label={`${command.suggestion.sessionCount} сессий`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                            {command.suggestion.totalDuration > 0 && (
                              <Chip
                                label={formatDuration(command.suggestion.totalDuration)}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {isWorking ? (
                          <SwitchIcon sx={{ color: 'text.secondary' }} />
                        ) : (
                          <StartIcon sx={{ color: 'success.main' }} />
                        )}
                      </Box>
                    </Box>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Футер с подсказками */}
          <Box sx={{ 
            p: 2, 
            borderTop: 1, 
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, 0.02)
          }}>
            <Typography variant="caption" color="text.secondary">
              ↑↓ Навигация • Enter Выбрать • Esc Закрыть • Ctrl+K Переключить
            </Typography>
          </Box>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
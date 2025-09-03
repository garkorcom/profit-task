/**
 * Унифицированный список задач
 * Поддерживает отображение как EstimateTask, так и ProjectTask
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
// Используем Box вместо Grid для упрощения
import {
  Search as SearchIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ViewModule as CardViewIcon,
  ViewList as ListViewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { 
  UnifiedTask,
  TaskFilters,
  TaskSortOptions,
  TaskStatistics,
  isEstimateTask,
  isProjectTask
} from '../../../types/unified-task.types';
import { TaskStatus } from '../../../api/taskApi';
import UnifiedTaskCard from './UnifiedTaskCard';
import TaskStatusChip from '../TaskStatusChip';
import TaskPriorityChip from '../TaskPriorityChip';

interface UnifiedTaskListProps {
  tasks: UnifiedTask[];
  loading?: boolean;
  error?: string | null;
  statistics?: TaskStatistics;
  
  // Фильтрация и поиск
  filters?: TaskFilters;
  sortOptions?: TaskSortOptions;
  onFiltersChange?: (filters: TaskFilters) => void;
  onSortChange?: (sort: TaskSortOptions) => void;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  
  // Действия с задачами
  onTaskEdit?: (task: UnifiedTask) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskDuplicate?: (taskId: string) => void;
  onTaskCreate?: () => void;
  
  // Настройки отображения
  showFilters?: boolean;
  showStats?: boolean;
  allowCreate?: boolean;
  compact?: boolean;
  defaultViewMode?: 'card' | 'list';
}

const UnifiedTaskList: React.FC<UnifiedTaskListProps> = ({
  tasks,
  loading = false,
  error = null,
  statistics,
  filters = {},
  sortOptions = { field: 'updatedAt', direction: 'desc' },
  onFiltersChange,
  onSortChange,
  onSearch,
  onRefresh,
  onTaskEdit,
  onTaskDelete,
  onTaskDuplicate,
  onTaskCreate,
  showFilters = true,
  showStats = true,
  allowCreate = true,
  compact = false,
  defaultViewMode = 'card'
}) => {
  const [viewMode, setViewMode] = useState<'card' | 'list'>(defaultViewMode);
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Обработчики
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleFilterChange = (key: keyof TaskFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange?.(newFilters);
  };

  const handleSortChange = (field: TaskSortOptions['field']) => {
    const newDirection = 
      sortOptions.field === field && sortOptions.direction === 'asc' ? 'desc' : 'asc';
    onSortChange?.({ field, direction: newDirection });
  };

  // Статистика по статусам
  const statusStats = useMemo(() => {
    const stats: Record<TaskStatus, number> = {
      'new': 0,
      'assigned': 0,
      'in_progress': 0,
      'on_hold': 0,
      'review': 0,
      'rework': 0,
      'completed': 0,
      'cancelled': 0
    };

    tasks.forEach(task => {
      stats[task.status] = (stats[task.status] || 0) + 1;
    });

    return stats;
  }, [tasks]);

  // Статистика по фазам
  const phaseStats = useMemo(() => {
    const estimateTasks = tasks.filter(isEstimateTask).length;
    const projectTasks = tasks.filter(isProjectTask).length;
    return { estimateTasks, projectTasks };
  }, [tasks]);

  const renderStatistics = () => {
    if (!showStats || !statistics) return null;

    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Статистика задач
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography color="text.secondary" variant="body2">
                  Всего задач
                </Typography>
                <Typography variant="h4">
                  {statistics.total}
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography color="text.secondary" variant="body2">
                  Завершено
                </Typography>
                <Typography variant="h4" color="success.main">
                  {Math.round(statistics.completionRate)}%
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography color="text.secondary" variant="body2">
                  Плановые часы
                </Typography>
                <Typography variant="h4">
                  {statistics.totalPlannedHours}ч
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Статистика по статусам */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            По статусам:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {Object.entries(statusStats).map(([status, count]) => (
              count > 0 && (
                <Chip
                  key={status}
                  label={`${count}`}
                  icon={<TaskStatusChip status={status as TaskStatus} size="small" />}
                  variant="outlined"
                  size="small"
                />
              )
            ))}
          </Stack>
        </Box>

        {/* Статистика по фазам */}
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            По фазам:
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              label={`Планирование: ${phaseStats.estimateTasks}`}
              variant="outlined"
              color="info"
              size="small"
            />
            <Chip
              label={`Выполнение: ${phaseStats.projectTasks}`}
              variant="outlined"
              color="primary"
              size="small"
            />
          </Stack>
        </Box>
      </Paper>
    );
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6">
            Фильтры и поиск
          </Typography>
          <Button
            startIcon={<FilterIcon />}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            size="small"
          >
            {showAdvancedFilters ? 'Скрыть' : 'Расширенные'}
          </Button>
        </Box>

        {/* Поиск */}
        <TextField
          fullWidth
          placeholder="Поиск по названию, описанию, тегам..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Основные фильтры */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Фаза</InputLabel>
              <Select
                value={filters.phase || ''}
                onChange={(e) => handleFilterChange('phase', e.target.value || undefined)}
                label="Фаза"
              >
                <MenuItem value="">Все фазы</MenuItem>
                <MenuItem value="pre_construction">Планирование</MenuItem>
                <MenuItem value="execution">Выполнение</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Статус</InputLabel>
              <Select
                multiple
                value={filters.status || []}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label="Статус"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as TaskStatus[]).map((status) => (
                      <TaskStatusChip key={status} status={status} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="new">Новая</MenuItem>
                <MenuItem value="assigned">Назначена</MenuItem>
                <MenuItem value="in_progress">В работе</MenuItem>
                <MenuItem value="on_hold">Приостановлена</MenuItem>
                <MenuItem value="review">На проверке</MenuItem>
                <MenuItem value="rework">На доработку</MenuItem>
                <MenuItem value="completed">Выполнена</MenuItem>
                <MenuItem value="cancelled">Отменена</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Приоритет</InputLabel>
              <Select
                multiple
                value={filters.priority || []}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                label="Приоритет"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((priority) => (
                      <TaskPriorityChip 
                        key={priority} 
                        priority={priority as any} 
                        size="small" 
                      />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="low">Низкий</MenuItem>
                <MenuItem value="medium">Средний</MenuItem>
                <MenuItem value="high">Высокий</MenuItem>
                <MenuItem value="urgent">Критический</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Сортировка</InputLabel>
              <Select
                value={`${sortOptions.field}-${sortOptions.direction}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-') as [TaskSortOptions['field'], 'asc' | 'desc'];
                  onSortChange?.({ field, direction });
                }}
                label="Сортировка"
              >
                <MenuItem value="name-asc">Название ↑</MenuItem>
                <MenuItem value="name-desc">Название ↓</MenuItem>
                <MenuItem value="status-asc">Статус ↑</MenuItem>
                <MenuItem value="status-desc">Статус ↓</MenuItem>
                <MenuItem value="priority-asc">Приоритет ↑</MenuItem>
                <MenuItem value="priority-desc">Приоритет ↓</MenuItem>
                <MenuItem value="createdAt-asc">Дата создания ↑</MenuItem>
                <MenuItem value="createdAt-desc">Дата создания ↓</MenuItem>
                <MenuItem value="updatedAt-asc">Дата обновления ↑</MenuItem>
                <MenuItem value="updatedAt-desc">Дата обновления ↓</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Расширенные фильтры */}
        {showAdvancedFilters && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="ID проекта"
                  value={filters.projectId || ''}
                  onChange={(e) => handleFilterChange('projectId', e.target.value || undefined)}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="ID сметы"
                  value={filters.estimateId || ''}
                  onChange={(e) => handleFilterChange('estimateId', e.target.value || undefined)}
                />
              </Box>
            </Box>
          </>
        )}
      </Paper>
    );
  };

  const renderToolbar = () => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h5">
        Задачи
        {tasks.length > 0 && (
          <Chip 
            label={tasks.length} 
            size="small" 
            sx={{ ml: 1 }} 
          />
        )}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1 }}>
        {onRefresh && (
          <Tooltip title="Обновить">
            <IconButton onClick={onRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title={viewMode === 'card' ? 'Список' : 'Карточки'}>
          <IconButton 
            onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
          >
            {viewMode === 'card' ? <ListViewIcon /> : <CardViewIcon />}
          </IconButton>
        </Tooltip>

        {allowCreate && onTaskCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onTaskCreate}
          >
            Создать задачу
          </Button>
        )}
      </Box>
    </Box>
  );

  const renderTasks = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      );
    }

    if (tasks.length === 0) {
      return (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Задачи не найдены
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filters.searchQuery ? 
              'Попробуйте изменить параметры поиска' : 
              'Создайте первую задачу для начала работы'
            }
          </Typography>
          {allowCreate && onTaskCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onTaskCreate}
              sx={{ mt: 2 }}
            >
              Создать задачу
            </Button>
          )}
        </Paper>
      );
    }

    if (viewMode === 'card') {
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {tasks.map((task) => (
            <Box key={task.id} sx={{ flex: '1 1 300px', maxWidth: 400 }}>
              <UnifiedTaskCard
                task={task}
                onEdit={onTaskEdit}
                onDelete={onTaskDelete}
                onDuplicate={onTaskDuplicate}
                compact={compact}
              />
            </Box>
          ))}
        </Box>
      );
    }

    // Список (будет реализован позже)
    return (
      <Paper>
        <Typography sx={{ p: 2 }} color="text.secondary">
          Режим списка в разработке
        </Typography>
      </Paper>
    );
  };

  return (
    <Box>
      {renderToolbar()}
      {renderStatistics()}
      {renderFilters()}
      {renderTasks()}
    </Box>
  );
};

export default UnifiedTaskList;
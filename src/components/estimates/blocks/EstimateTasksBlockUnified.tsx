/**
 * Унифицированный блок задач для смет
 * Использует новую систему SSOT для управления EstimateTask
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  Alert,
  LinearProgress,
  Chip,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment as TaskIcon,
  Timeline as ProgressIcon,
  Settings as ConfigIcon
} from '@mui/icons-material';

// Импорты унифицированной системы
import { useTaskManagement } from '../../../hooks/useTaskManagement';
import {
  UnifiedTask,
  EstimateTaskUnified,
  CreateEstimateTaskDto,
  TaskFilters,
  isEstimateTask
} from '../../../types/unified-task.types';
import UnifiedTaskCard from '../../tasks/unified/UnifiedTaskCard';
import UnifiedTaskForm from '../../tasks/unified/UnifiedTaskForm';
import TaskConfigProvider from '../../tasks/unified/TaskConfigProvider';

interface EstimateTasksBlockUnifiedProps {
  estimate: any;
  block: any;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
  // Legacy props for backward compatibility
  estimateId?: string;
  readOnly?: boolean;
  onTasksChange?: (tasks: EstimateTaskUnified[]) => void;
}

const EstimateTasksBlockUnified: React.FC<EstimateTasksBlockUnifiedProps> = ({
  estimate,
  block,
  onSave,
  saving,
  estimateId,
  readOnly = false,
  onTasksChange
}) => {
  // Use estimateId from estimate if not provided directly
  const actualEstimateId = estimateId || estimate?.id;
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<EstimateTaskUnified | undefined>();
  const [showConfig, setShowConfig] = useState(false);

  // Используем унифицированную систему управления задачами
  const {
    tasks: allTasks,
    loading,
    error,
    statistics,
    createTask,
    updateTask,
    deleteTask,
    filterTasks,
    validateTask
  } = useTaskManagement({
    autoSync: true,
    enableRealTimeUpdates: true
  });

  // Фильтруем только задачи этой сметы
  const estimateTasks = useMemo(() => {
    return allTasks.filter((task): task is EstimateTaskUnified => 
      isEstimateTask(task) && task.estimateId === actualEstimateId
    );
  }, [allTasks, actualEstimateId]);

  // Устанавливаем фильтр для загрузки только задач этой сметы
  useEffect(() => {
    const filters: TaskFilters = {
      phase: 'pre_construction',
      estimateId: actualEstimateId
    };
    filterTasks(filters);
  }, [actualEstimateId, filterTasks]);

  // Уведомляем родительский компонент об изменениях
  useEffect(() => {
    onTasksChange?.(estimateTasks);
  }, [estimateTasks, onTasksChange]);

  // Статистика по задачам сметы
  const estimateStatistics = useMemo(() => {
    const total = estimateTasks.length;
    const completed = estimateTasks.filter(task => task.status === 'completed').length;
    const inProgress = estimateTasks.filter(task => 
      ['assigned', 'in_progress', 'review'].includes(task.status)
    ).length;
    
    const totalPlanned = estimateTasks.reduce((sum, task) => sum + task.plannedHours, 0);
    const totalActual = estimateTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
    
    // Группировка по includeMode
    const byIncludeMode = estimateTasks.reduce((acc, task) => {
      acc[task.includeMode] = (acc[task.includeMode] || 0) + 1;
      return acc;
    }, {} as Record<'COGS' | 'OH' | 'NONE', number>);

    return {
      total,
      completed,
      inProgress,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      totalPlanned,
      totalActual,
      byIncludeMode
    };
  }, [estimateTasks]);

  const handleCreateTask = () => {
    setEditingTask(undefined);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: UnifiedTask) => {
    if (isEstimateTask(task)) {
      setEditingTask(task);
      setShowTaskForm(true);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Удалить задачу? Это действие нельзя отменить.')) {
      try {
        await deleteTask(taskId);
      } catch (error) {
        console.error('Ошибка удаления задачи:', error);
      }
    }
  };

  const handleSubmitTask = async (data: CreateEstimateTaskDto | any) => {
    try {
      if (editingTask) {
        // Обновление существующей задачи
        await updateTask(editingTask.id, data);
      } else {
        // Создание новой задачи
        const createData: CreateEstimateTaskDto = {
          ...data,
          phase: 'pre_construction',
          estimateId: actualEstimateId,
          includeMode: data.includeMode || 'COGS'
        };
        await createTask(createData);
      }
      setShowTaskForm(false);
      setEditingTask(undefined);
    } catch (error) {
      console.error('Ошибка сохранения задачи:', error);
    }
  };

  const renderStatisticsCard = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TaskIcon />
            Задачи сметы
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Настройки задач">
              <IconButton size="small" onClick={() => setShowConfig(true)}>
                <ConfigIcon />
              </IconButton>
            </Tooltip>
            {!readOnly && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleCreateTask}
              >
                Добавить задачу
              </Button>
            )}
          </Box>
        </Box>

        {/* Статистика */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Прогресс выполнения
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {estimateStatistics.completed} из {estimateStatistics.total} 
              ({Math.round(estimateStatistics.completionRate)}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={estimateStatistics.completionRate}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Метрики */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            icon={<ProgressIcon />}
            label={`В работе: ${estimateStatistics.inProgress}`}
            variant="outlined"
            color="primary"
            size="small"
          />
          <Chip
            label={`Плановые часы: ${estimateStatistics.totalPlanned}ч`}
            variant="outlined"
            size="small"
          />
          {estimateStatistics.totalActual > 0 && (
            <Chip
              label={`Фактические часы: ${estimateStatistics.totalActual}ч`}
              variant="outlined"
              size="small"
            />
          )}
        </Box>

        {/* Распределение по типам включения */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Распределение по включению в расчеты:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {estimateStatistics.byIncludeMode.COGS > 0 && (
              <Chip
                label={`COGS: ${estimateStatistics.byIncludeMode.COGS}`}
                color="success"
                size="small"
              />
            )}
            {estimateStatistics.byIncludeMode.OH > 0 && (
              <Chip
                label={`OH: ${estimateStatistics.byIncludeMode.OH}`}
                color="warning"
                size="small"
              />
            )}
            {estimateStatistics.byIncludeMode.NONE > 0 && (
              <Chip
                label={`NONE: ${estimateStatistics.byIncludeMode.NONE}`}
                color="default"
                size="small"
              />
            )}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );

  const renderTaskList = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <LinearProgress sx={{ width: '100%' }} />
        </Box>
      );
    }

    if (estimateTasks.length === 0) {
      return (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <TaskIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Задачи не созданы
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Добавьте задачи для планирования работ по смете
            </Typography>
            {!readOnly && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateTask}
              >
                Добавить первую задачу
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {estimateTasks.map((task) => (
          <UnifiedTaskCard
            key={task.id}
            task={task}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
            showActions={!readOnly}
            compact={false}
          />
        ))}
      </Box>
    );
  };

  return (
    <TaskConfigProvider>
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStatisticsCard()}
        
        <Divider sx={{ my: 2 }} />
        
        {renderTaskList()}

        {/* Форма создания/редактирования задачи */}
        <UnifiedTaskForm
          open={showTaskForm}
          onClose={() => {
            setShowTaskForm(false);
            setEditingTask(undefined);
          }}
          onSubmit={handleSubmitTask}
          task={editingTask}
          mode={editingTask ? 'edit' : 'create'}
          defaultPhase="pre_construction"
          defaultEstimateId={actualEstimateId}
        />
      </Box>
    </TaskConfigProvider>
  );
};

export default EstimateTasksBlockUnified;
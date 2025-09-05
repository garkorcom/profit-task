/**
 * ============================================================================
 * СТРАНИЦА УПРАВЛЕНИЯ ЗАДАЧАМИ V2 - ПОЛНОСТЬЮ ПЕРЕРАБОТАННАЯ ВЕРСИЯ
 * ============================================================================
 * 
 * КЛЮЧЕВЫЕ ВОЗМОЖНОСТИ:
 * ═══════════════════════
 * 
 * 🎯 ИНТЕГРИРОВАННЫЙ УЧЕТ ВРЕМЕНИ:
 * ├─ Кнопка Start/Stop на каждой задаче
 * ├─ Визуальное выделение активной задачи (синяя рамка)
 * ├─ Chip "Активная" для текущей задачи
 * └─ Интеграция с TimeTrackingContext
 * 
 * 📊 СОВРЕМЕННАЯ АНАЛИТИКА:
 * ├─ Карточки статистики (всего, завершено, в работе, % выполнения)
 * ├─ Цветовая индикация статусов и приоритетов
 * ├─ Иконки для быстрого распознавания
 * └─ Real-time обновление показателей
 * 
 * 🔍 МОЩНЫЕ ФИЛЬТРЫ:
 * ├─ Поиск по тексту (название, описание, проект)
 * ├─ Фильтр по статусу (новые, в работе, завершенные и т.д.)
 * ├─ Фильтр по приоритету (низкий, средний, высокий, критический)
 * └─ Фильтр по проекту (все доступные проекты)
 * 
 * 💫 UX УЛУЧШЕНИЯ:
 * ├─ Grid layout для адаптивности
 * ├─ Floating Action Button для быстрого создания
 * ├─ Упрощенная форма создания/редактирования
 * ├─ Детальные карточки с полной информацией
 * └─ Понятные сообщения об ошибках и валидации
 * 
 * 🏗️ ТЕХНИЧЕСКАЯ АРХИТЕКТУРА:
 * ├─ V2 API интеграция (subscribeToProjects, addTask)
 * ├─ Строгая типизация (Project, Task из src/types/)
 * ├─ Оптимизированные re-renders через useMemo
 * ├─ Безопасная обработка ошибок
 * └─ Firestore совместимость (избегание undefined значений)
 * 
 * АВТОР: AI Assistant
 * ДАТА: 2025
 * ВЕРСИЯ: 2.0 (полная переработка)
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  FormHelperText,
  Stack,
  Paper,
  Divider,
  Avatar,
  CardActions,
  Fab,
  Tooltip,
  Alert,
  LinearProgress,
  Badge,
  Menu,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  useTheme,
  alpha
} from '@mui/material';
import { 
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as TaskIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Flag as FlagIcon,
  AccessTime as TimeIcon,
  CheckCircle as CompleteIcon,
  RadioButtonUnchecked as NewIcon,
  PlayCircleOutline as StartIcon,
  MoreVert as MoreIcon,
  FilterList as FilterIcon,
  Search as SearchIcon
} from '@mui/icons-material';

import { useAuth } from '../auth/AuthContext';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { TimeTrackingButton } from '../components/TimeTrackingButton';

import { getTasksStream, addTask, updateTask, deleteTask, TaskStatus, TaskPriority } from '../api/taskApi';
import { subscribeToProjects } from '../api/projectV2Api';
import { Project } from '../types/project.types';
import { Task } from '../types/task.types';

const TasksPage: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { isWorking, currentEntry } = useTimeTracking();
  
  // Data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  
  // Form state
  const [formData, setFormData] = useState({
    task: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: 'new' as TaskStatus,
    projectId: '',
    projectName: '',
    assigneeId: '',
    assigneeName: '',
    plannedDuration: 1,
    requirePhoto: false,
    questions: '',
    whatToBuy: '',
    tags: [] as string[]
  });
  
  // Notifications
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  const [confirm, setConfirm] = useState<{ open: boolean; taskId?: string }>({ open: false });

  // Load data
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribeTasks = getTasksStream(currentUser.uid, (data) => {
      console.log('📋 Задачи загружены:', data.length);
      setTasks(data);
    });
    
    const unsubscribeProjects = subscribeToProjects(currentUser.uid, (data) => {
      console.log('📁 Проекты загружены:', data.length);
      setProjects(data);
      setLoading(false);
    });
    
    return () => {
      unsubscribeTasks();
      unsubscribeProjects();
    };
  }, [currentUser]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = !searchQuery || 
        task.task?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.projectName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesProject = projectFilter === 'all' || task.projectId === projectFilter;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesProject;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, projectFilter]);

  // Task statistics
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const byStatus = tasks.reduce((acc, task) => {
      const status = task.status || 'new';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<TaskStatus, number>);
    
    const inProgress = byStatus.in_progress || 0;
    const completed = byStatus.completed || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, byStatus, inProgress, completed, completionRate };
  }, [tasks]);

  // Handlers
  const handleOpenDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        task: task.task || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'new',
        projectId: task.projectId || '',
        projectName: task.projectName || '',
        assigneeId: task.assigneeId || '',
        assigneeName: task.assigneeName || '',
        plannedDuration: task.plannedDuration || 1,
        requirePhoto: task.requirePhoto || false,
        questions: task.questions || '',
        whatToBuy: task.whatToBuy || '',
        tags: task.tags || []
      });
    } else {
      setEditingTask(null);
      setFormData({
        task: '',
        description: '',
        priority: 'medium',
        status: 'new',
        projectId: '',
        projectName: '',
        assigneeId: '',
        assigneeName: '',
        plannedDuration: 1,
        requirePhoto: false,
        questions: '',
        whatToBuy: '',
        tags: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
  };

  const handleSubmit = async () => {
    if (!currentUser || !formData.task.trim() || !formData.projectId) {
      setNotification({ 
        open: true, 
        message: 'Заполните название задачи и выберите проект', 
        severity: 'warning' 
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingTask) {
        await updateTask(currentUser.uid, editingTask.id, formData);
        setNotification({ open: true, message: 'Задача успешно обновлена!', severity: 'success' });
      } else {
        await addTask(currentUser.uid, formData);
        setNotification({ open: true, message: 'Задача успешно создана!', severity: 'success' });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Ошибка при сохранении задачи:', error);
      setNotification({ 
        open: true, 
        message: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`, 
        severity: 'error' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!currentUser) return;
    
    try {
      await deleteTask(currentUser.uid, taskId);
      setNotification({ open: true, message: 'Задача удалена!', severity: 'success' });
    } catch (error) {
      console.error('Ошибка при удалении задачи:', error);
      setNotification({ open: true, message: 'Ошибка при удалении задачи', severity: 'error' });
    }
  };

  // Get priority color
  const getPriorityColor = (priority?: TaskPriority) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  // Get status color and icon
  const getStatusInfo = (status?: TaskStatus) => {
    switch (status) {
      case 'completed': return { color: 'success', icon: <CompleteIcon />, label: 'Выполнено' };
      case 'in_progress': return { color: 'primary', icon: <PlayIcon />, label: 'В работе' };
      case 'on_hold': return { color: 'warning', icon: <PauseIcon />, label: 'Приостановлено' };
      case 'review': return { color: 'info', icon: <ScheduleIcon />, label: 'На проверке' };
      default: return { color: 'default', icon: <NewIcon />, label: 'Новая' };
    }
  };

  // Check if task can start work
  const canStartWork = (task: Task) => {
    return ['new', 'assigned', 'in_progress', 'rework'].includes(task.status || 'new');
  };

  const isSaveDisabled = !formData.task.trim() || !formData.projectId || submitting;

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Задачи
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Управление задачами и учет времени
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={projects.length === 0}
        >
          Новая задача
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <TaskIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{taskStats.total}</Typography>
                <Typography variant="body2" color="text.secondary">Всего задач</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'success.main' }}>
                <CompleteIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{taskStats.completed}</Typography>
                <Typography variant="body2" color="text.secondary">Завершено</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'info.main' }}>
                <PlayIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{taskStats.inProgress}</Typography>
                <Typography variant="body2" color="text.secondary">В работе</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'warning.main' }}>
                <FlagIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">{taskStats.completionRate}%</Typography>
                <Typography variant="body2" color="text.secondary">Выполнение</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Поиск задач..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.disabled' }} />
              }}
              sx={{ minWidth: 250 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Статус</InputLabel>
              <Select
                value={statusFilter}
                label="Статус"
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <MenuItem value="all">Все</MenuItem>
                <MenuItem value="new">Новые</MenuItem>
                <MenuItem value="assigned">Назначенные</MenuItem>
                <MenuItem value="in_progress">В работе</MenuItem>
                <MenuItem value="completed">Завершенные</MenuItem>
                <MenuItem value="on_hold">Приостановленные</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Приоритет</InputLabel>
              <Select
                value={priorityFilter}
                label="Приоритет"
                onChange={(e) => setPriorityFilter(e.target.value as any)}
              >
                <MenuItem value="all">Все</MenuItem>
                <MenuItem value="low">Низкий</MenuItem>
                <MenuItem value="medium">Средний</MenuItem>
                <MenuItem value="high">Высокий</MenuItem>
                <MenuItem value="critical">Критический</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Проект</InputLabel>
              <Select
                value={projectFilter}
                label="Проект"
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <MenuItem value="all">Все проекты</MenuItem>
                {projects.map(project => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <TaskIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {tasks.length === 0 ? 'Задач пока нет' : 'Задачи не найдены'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {tasks.length === 0 
                ? 'Создайте первую задачу для начала работы' 
                : 'Попробуйте изменить фильтры поиска'
              }
            </Typography>
            {tasks.length === 0 && (
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                disabled={projects.length === 0}
              >
                Создать первую задачу
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {filteredTasks.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            const statusInfo = getStatusInfo(task.status);
            const isCurrentTask = currentEntry?.taskId === task.id;
            
            return (
              <Card 
                key={task.id}
                sx={{ 
                  border: isCurrentTask ? `2px solid ${theme.palette.primary.main}` : undefined,
                  bgcolor: isCurrentTask ? alpha(theme.palette.primary.main, 0.05) : undefined
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6" component="h3">
                          {task.task}
                        </Typography>
                        {isCurrentTask && (
                          <Chip 
                            size="small" 
                            label="Активная" 
                            color="primary" 
                            icon={<TimeIcon />}
                          />
                        )}
                      </Box>
                      
                      {task.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {task.description}
                        </Typography>
                      )}
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        <Chip
                          size="small"
                          icon={statusInfo.icon}
                          label={statusInfo.label}
                          color={statusInfo.color as any}
                          variant={task.status === 'completed' ? 'filled' : 'outlined'}
                        />
                        
                        <Chip
                          size="small"
                          icon={<FlagIcon />}
                          label={task.priority || 'medium'}
                          color={getPriorityColor(task.priority) as any}
                          variant="outlined"
                        />
                        
                        {project && (
                          <Chip
                            size="small"
                            icon={<BusinessIcon />}
                            label={project.name}
                            variant="outlined"
                          />
                        )}
                        
                        {task.plannedDuration && (
                          <Chip
                            size="small"
                            icon={<ScheduleIcon />}
                            label={`${task.plannedDuration}ч`}
                            variant="outlined"
                          />
                        )}
                      </Box>

                      {(task.questions || task.whatToBuy) && (
                        <Box sx={{ mt: 2 }}>
                          {task.questions && (
                            <Typography variant="body2" color="text.secondary">
                              <strong>Вопросы:</strong> {task.questions}
                            </Typography>
                          )}
                          {task.whatToBuy && (
                            <Typography variant="body2" color="text.secondary">
                              <strong>Купить:</strong> {task.whatToBuy}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                    
                    <IconButton onClick={() => handleOpenDialog(task)}>
                      <EditIcon />
                    </IconButton>
                  </Box>
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <Box>
                      {canStartWork(task) && project && (
                        <TimeTrackingButton
                          project={project as any}
                          task={task as any}
                          estimate={null}
                          service={null}
                        />
                      )}
                    </Box>
                    
                    <IconButton 
                      color="error" 
                      onClick={() => setConfirm({ open: true, taskId: task.id })}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => handleOpenDialog()}
        disabled={projects.length === 0}
      >
        <AddIcon />
      </Fab>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTask ? 'Редактировать задачу' : 'Новая задача'}
        </DialogTitle>
        <DialogContent>
          {projects.length === 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              ⚠️ Нет доступных проектов. Создайте проект для создания задачи.
            </Alert>
          )}

          <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
            <TextField
              autoFocus
              label="Название задачи"
              fullWidth
              required
              value={formData.task}
              onChange={(e) => setFormData({...formData, task: e.target.value})}
            />

            <TextField
              label="Описание"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Проект</InputLabel>
                <Select
                  value={formData.projectId}
                  label="Проект"
                  onChange={(e) => {
                    const project = projects.find(p => p.id === e.target.value);
                    setFormData({
                      ...formData, 
                      projectId: e.target.value,
                      projectName: project?.name || ''
                    });
                  }}
                >
                  <MenuItem value="">
                    <em>Выберите проект</em>
                  </MenuItem>
                  {projects.map(project => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Приоритет</InputLabel>
                <Select
                  value={formData.priority}
                  label="Приоритет"
                  onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                >
                  <MenuItem value="low">Низкий</MenuItem>
                  <MenuItem value="medium">Средний</MenuItem>
                  <MenuItem value="high">Высокий</MenuItem>
                  <MenuItem value="critical">Критический</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select
                  value={formData.status}
                  label="Статус"
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                >
                  <MenuItem value="new">Новая</MenuItem>
                  <MenuItem value="assigned">Назначена</MenuItem>
                  <MenuItem value="in_progress">В работе</MenuItem>
                  <MenuItem value="on_hold">Приостановлена</MenuItem>
                  <MenuItem value="review">На проверке</MenuItem>
                  <MenuItem value="completed">Завершена</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Плановое время (часы)"
                type="number"
                value={formData.plannedDuration}
                onChange={(e) => setFormData({...formData, plannedDuration: Number(e.target.value)})}
                inputProps={{ min: 0.5, step: 0.5 }}
              />
            </Box>

            <TextField
              label="Вопросы и уточнения"
              fullWidth
              multiline
              rows={2}
              value={formData.questions}
              onChange={(e) => setFormData({...formData, questions: e.target.value})}
            />

            <TextField
              label="Что нужно купить"
              fullWidth
              multiline
              rows={2}
              value={formData.whatToBuy}
              onChange={(e) => setFormData({...formData, whatToBuy: e.target.value})}
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={isSaveDisabled}
          >
            {submitting ? 'Сохранение...' : (editingTask ? 'Сохранить' : 'Создать')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirm.open}
        message="Удалить эту задачу?"
        confirmText="Удалить"
        onConfirm={() => {
          if (confirm.taskId) {
            handleDelete(confirm.taskId);
          }
          setConfirm({ open: false });
        }}
        onClose={() => setConfirm({ open: false })}
      />

      {/* Notifications */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification({ ...notification, open: false })}
      />
    </Box>
  );
};

export default TasksPage;
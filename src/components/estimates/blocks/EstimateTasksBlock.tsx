/**
 * Блок "Задачи для сметы" для конструктора смет
 * Управление Pre-construction задачами с настройкой Include_Mode (COGS/OH/NONE)
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  CheckCircle as DoneIcon,
  Assignment as TaskIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { useAuth } from '../../../auth/AuthContext';
import { 
  Estimate, 
  BlockState, 
  EstimateTasksBlockData,
} from '../../../types/estimate.types';

interface EstimateTasksBlockProps {
  estimate: Estimate;
  block: BlockState;
  onSave: (data: EstimateTasksBlockData) => void;
  saving: boolean;
}

type IncludeMode = 'COGS' | 'OH' | 'NONE';
type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'done' | 'quality_assurance' | 'approved' | 'rejected';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface EstimateTaskItem {
  id: string;
  name: string;
  description?: string;
  plannedHours: number;
  actualHours?: number;
  assignedRole?: string;
  assignedUserId?: string;
  includeMode: IncludeMode;
  status: TaskStatus;
  priority: TaskPriority;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  tags?: string[];
  notes?: string;
}

const EstimateTasksBlock: React.FC<EstimateTasksBlockProps> = ({
  estimate,
  block,
  onSave,
  saving,
}) => {
  const { currentUser } = useAuth();
  const blockData = (block.data || {}) as EstimateTasksBlockData;
  
  // State
  const [tasks, setTasks] = useState<EstimateTaskItem[]>(blockData.tasks || []);
  const [defaultIncludeMode, setDefaultIncludeMode] = useState<IncludeMode>(
    blockData.defaultIncludeMode || 'COGS'
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EstimateTaskItem | null>(null);
  
  // Form state for task dialog
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    plannedHours: 0,
    assignedRole: '',
    includeMode: defaultIncludeMode,
    status: 'not_started' as TaskStatus,
    priority: 'medium' as TaskPriority,
    plannedStartDate: '',
    plannedEndDate: '',
    notes: '',
  });

  // Обновление tasks при изменении blockData
  useEffect(() => {
    setTasks(blockData.tasks || []);
  }, [blockData.tasks]);

  // Helpers
  const generateTaskId = () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'not_started': return 'default';
      case 'in_progress': return 'primary';
      case 'blocked': return 'error';
      case 'done': return 'success';
      case 'quality_assurance': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'not_started': return 'Не начата';
      case 'in_progress': return 'В работе';
      case 'blocked': return 'Заблокирована';
      case 'done': return 'Выполнена';
      case 'quality_assurance': return 'На проверке';
      case 'approved': return 'Одобрена';
      case 'rejected': return 'Отклонена';
      default: return status;
    }
  };

  const getIncludeModeColor = (mode: IncludeMode) => {
    switch (mode) {
      case 'COGS': return '#4caf50'; // Зеленый
      case 'OH': return '#ff9800';   // Оранжевый
      case 'NONE': return '#9e9e9e'; // Серый
      default: return '#9e9e9e';
    }
  };

  const getIncludeModeLabel = (mode: IncludeMode) => {
    switch (mode) {
      case 'COGS': return 'В себестоимость';
      case 'OH': return 'В накладные';
      case 'NONE': return 'Не учитывать';
      default: return mode;
    }
  };

  // Handlers
  const handleOpenDialog = (task?: EstimateTaskItem) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        name: task.name,
        description: task.description || '',
        plannedHours: task.plannedHours,
        assignedRole: task.assignedRole || '',
        includeMode: task.includeMode,
        status: task.status,
        priority: task.priority,
        plannedStartDate: task.plannedStartDate || '',
        plannedEndDate: task.plannedEndDate || '',
        notes: task.notes || '',
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        name: '',
        description: '',
        plannedHours: 1,
        assignedRole: '',
        includeMode: defaultIncludeMode,
        status: 'not_started',
        priority: 'medium',
        plannedStartDate: '',
        plannedEndDate: '',
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTask(null);
  };

  const handleSaveTask = () => {
    if (!taskForm.name.trim()) {
      alert('Название задачи обязательно');
      return;
    }

    const taskData: EstimateTaskItem = {
      id: editingTask?.id || generateTaskId(),
      name: taskForm.name.trim(),
      description: taskForm.description.trim() || undefined,
      plannedHours: taskForm.plannedHours,
      actualHours: editingTask?.actualHours || 0,
      assignedRole: taskForm.assignedRole.trim() || undefined,
      assignedUserId: editingTask?.assignedUserId,
      includeMode: taskForm.includeMode,
      status: taskForm.status,
      priority: taskForm.priority,
      plannedStartDate: taskForm.plannedStartDate || undefined,
      plannedEndDate: taskForm.plannedEndDate || undefined,
      actualStartDate: editingTask?.actualStartDate,
      actualEndDate: editingTask?.actualEndDate,
      tags: editingTask?.tags,
      notes: taskForm.notes.trim() || undefined,
    };

    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? taskData : t));
    } else {
      setTasks(prev => [...prev, taskData]);
    }

    handleCloseDialog();
  };

  const handleDeleteTask = (taskId: string) => {
    if (!window.confirm('Удалить задачу?')) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleQuickStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { 
            ...t, 
            status: newStatus,
            actualStartDate: newStatus === 'in_progress' && !t.actualStartDate ? new Date().toISOString() : t.actualStartDate,
            actualEndDate: newStatus === 'done' || newStatus === 'approved' ? new Date().toISOString() : undefined,
          }
        : t
    ));
  };

  const handleSaveBlock = () => {
    const totalPlannedHours = tasks.reduce((sum, task) => sum + task.plannedHours, 0);
    const totalActualHours = tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);

    const data: EstimateTasksBlockData = {
      tasks,
      defaultIncludeMode,
      totalPlannedHours,
      totalActualHours,
    };
    
    onSave(data);
  };

  // Metrics
  const totalPlannedHours = tasks.reduce((sum, task) => sum + task.plannedHours, 0);
  const totalActualHours = tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
  const completedTasks = tasks.filter(t => t.status === 'approved').length;
  const progressPct = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  const cogsTasks = tasks.filter(t => t.includeMode === 'COGS');
  const ohTasks = tasks.filter(t => t.includeMode === 'OH');
  const noneTasks = tasks.filter(t => t.includeMode === 'NONE');

  return (
    <Box>
      <Stack spacing={3}>
        {/* Header with metrics */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <TaskIcon sx={{ mr: 1 }} />
              Сводка по задачам
            </Typography>
            
            <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Chip 
                icon={<TaskIcon />}
                label={`Всего: ${tasks.length}`}
                color="primary"
                size="small"
              />
              <Chip 
                icon={<TimeIcon />}
                label={`План: ${totalPlannedHours}ч`}
                color="default"
                size="small"
              />
              <Chip 
                icon={<TimeIcon />}
                label={`Факт: ${totalActualHours}ч`}
                color="secondary"
                size="small"
              />
              <Chip 
                label={`Готово: ${completedTasks}/${tasks.length}`}
                color="success"
                size="small"
              />
            </Stack>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Прогресс выполнения: {progressPct.toFixed(1)}%
              </Typography>
              <LinearProgress variant="determinate" value={progressPct} />
            </Box>

            {/* Include Mode Distribution */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                label={`COGS: ${cogsTasks.length} (${cogsTasks.reduce((sum, t) => sum + t.plannedHours, 0)}ч)`}
                sx={{ backgroundColor: getIncludeModeColor('COGS'), color: 'white' }}
                size="small"
              />
              <Chip
                label={`OH: ${ohTasks.length} (${ohTasks.reduce((sum, t) => sum + t.plannedHours, 0)}ч)`}
                sx={{ backgroundColor: getIncludeModeColor('OH'), color: 'white' }}
                size="small"
              />
              <Chip
                label={`NONE: ${noneTasks.length} (${noneTasks.reduce((sum, t) => sum + t.plannedHours, 0)}ч)`}
                sx={{ backgroundColor: getIncludeModeColor('NONE'), color: 'white' }}
                size="small"
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Controls */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Добавить задачу
          </Button>
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Режим по умолчанию</InputLabel>
            <Select
              value={defaultIncludeMode}
              onChange={(e) => setDefaultIncludeMode(e.target.value as IncludeMode)}
              label="Режим по умолчанию"
            >
              <MenuItem value="COGS">В себестоимость (COGS)</MenuItem>
              <MenuItem value="OH">В накладные (OH)</MenuItem>
              <MenuItem value="NONE">Не учитывать (NONE)</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="COGS - включается в прямую себестоимость проекта. OH - включается в накладные расходы. NONE - только для производственных метрик, финансово не учитывается.">
            <IconButton size="small">
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Tasks Table */}
        {tasks.length === 0 ? (
          <Alert severity="info">
            Задачи не созданы. Нажмите "Добавить задачу" для создания задач подготовки сметы.
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Плановые часы</TableCell>
                  <TableCell>Роль</TableCell>
                  <TableCell>Режим учета</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Приоритет</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {task.name}
                      </Typography>
                      {task.description && (
                        <Typography variant="caption" color="text.secondary">
                          {task.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">
                          {task.plannedHours}ч
                        </Typography>
                        {task.actualHours && task.actualHours > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            (факт: {task.actualHours}ч)
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {task.assignedRole && (
                        <Chip
                          icon={<PersonIcon />}
                          label={task.assignedRole}
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getIncludeModeLabel(task.includeMode)}
                        size="small"
                        sx={{ 
                          backgroundColor: getIncludeModeColor(task.includeMode), 
                          color: 'white',
                          minWidth: 110
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(task.status)}
                        color={getStatusColor(task.status) as any}
                        size="small"
                        onClick={() => {
                          // Quick status change
                          const nextStatus = task.status === 'not_started' ? 'in_progress' :
                                           task.status === 'in_progress' ? 'done' :
                                           task.status === 'done' ? 'approved' : task.status;
                          if (nextStatus !== task.status) {
                            handleQuickStatusChange(task.id, nextStatus);
                          }
                        }}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.priority}
                        size="small"
                        color={task.priority === 'urgent' ? 'error' : 
                               task.priority === 'high' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenDialog(task)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Save Button */}
        <Box>
          <Button
            variant="contained"
            onClick={handleSaveBlock}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить блок'}
          </Button>
        </Box>
      </Stack>

      {/* Task Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTask ? 'Редактировать задачу' : 'Новая задача'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Название задачи"
              value={taskForm.name}
              onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
              required
              fullWidth
            />
            
            <TextField
              label="Описание"
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Плановые часы"
                type="number"
                value={taskForm.plannedHours}
                onChange={(e) => setTaskForm({ ...taskForm, plannedHours: Number(e.target.value) })}
                inputProps={{ min: 0, step: 0.25 }}
                sx={{ width: 150 }}
              />
              
              <TextField
                label="Роль исполнителя"
                value={taskForm.assignedRole}
                onChange={(e) => setTaskForm({ ...taskForm, assignedRole: e.target.value })}
                sx={{ flexGrow: 1 }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Режим учета</InputLabel>
                <Select
                  value={taskForm.includeMode}
                  onChange={(e) => setTaskForm({ ...taskForm, includeMode: e.target.value as IncludeMode })}
                  label="Режим учета"
                >
                  <MenuItem value="COGS">В себестоимость (COGS)</MenuItem>
                  <MenuItem value="OH">В накладные (OH)</MenuItem>
                  <MenuItem value="NONE">Не учитывать (NONE)</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Статус</InputLabel>
                <Select
                  value={taskForm.status}
                  onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}
                  label="Статус"
                >
                  <MenuItem value="not_started">Не начата</MenuItem>
                  <MenuItem value="in_progress">В работе</MenuItem>
                  <MenuItem value="blocked">Заблокирована</MenuItem>
                  <MenuItem value="done">Выполнена</MenuItem>
                  <MenuItem value="quality_assurance">На проверке</MenuItem>
                  <MenuItem value="approved">Одобрена</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Приоритет</InputLabel>
                <Select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                  label="Приоритет"
                >
                  <MenuItem value="low">Низкий</MenuItem>
                  <MenuItem value="medium">Средний</MenuItem>
                  <MenuItem value="high">Высокий</MenuItem>
                  <MenuItem value="urgent">Срочный</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Плановая дата начала"
                type="date"
                value={taskForm.plannedStartDate}
                onChange={(e) => setTaskForm({ ...taskForm, plannedStartDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 200 }}
              />
              
              <TextField
                label="Плановая дата окончания"
                type="date"
                value={taskForm.plannedEndDate}
                onChange={(e) => setTaskForm({ ...taskForm, plannedEndDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 200 }}
              />
            </Stack>

            <TextField
              label="Примечания"
              value={taskForm.notes}
              onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />

            {/* Info about Include Mode */}
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Режимы учета:</strong>
              </Typography>
              <Typography variant="body2" component="div">
                • <strong>COGS</strong> - время будет включено в прямую себестоимость проекта<br/>
                • <strong>OH</strong> - время будет включено в накладные расходы<br/>
                • <strong>NONE</strong> - время не влияет на финансовые показатели, только метрики
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Отмена
          </Button>
          <Button 
            onClick={handleSaveTask}
            variant="contained"
            disabled={!taskForm.name.trim()}
          >
            {editingTask ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EstimateTasksBlock;
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Button, Chip, Select, MenuItem, FormControl, InputLabel, TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Business as BusinessIcon, Work as WorkIcon, Add as AddIcon, Money as MoneyIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { Task } from '../types/task';
import { Contractor } from '../types/models';
import { Project } from '../types/project';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';
import ConfirmDialog from '../components/common/ConfirmDialog';
import TimeTrackingButton from '../components/TimeTrackingButton';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getPriorityColor, getStatusColor } from '../utils/taskUi';

const TasksPage: React.FC = () => {
  const { currentUser } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Task>>({});
  const [notification, setNotification] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [confirm, setConfirm] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
  const [filterProjectId, setFilterProjectId] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'contractorAsc' | 'contractorDesc'>('default');

  useEffect(() => {
    if (!currentUser) return;
    const unsubTasks = api.getTasksStream((data: Task[]) => {
      setTasks(data);
      setLoading(false);
    });
    const unsubProjects = api.getProjectsStream((data: Project[]) => setProjects(data));
    const unsubContractors = api.getContractorsStream((data: Contractor[]) => setContractors(data));
    return () => {
      unsubTasks();
      unsubProjects();
      unsubContractors();
    };
  }, [currentUser, api]);

  const handleOpenDialog = (task?: Task) => {
    setEditingTask(task || null);
    setFormData(task || {
      title: '',
      description: '',
      priority: 'medium',
      status: 'new',
      assigneeId: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentUser || !formData.title) return;
    try {
      if (editingTask) {
        await api.updateTask(editingTask.id!, formData);
        setNotification({ open: true, message: 'Задача обновлена!', severity: 'success' });
      } else {
        const newTask: Omit<Task, 'id'|'createdAt'|'updatedAt'|'completedAt'|'deletedAt'> = {
          ...formData,
          code: `T-${Date.now()}`,
          type: 'task',
          progress: 0,
          estimatedHours: 0,
          actualHours: 0,
          remainingHours: 0,
          createdBy: currentUser.uid,
          title: formData.title,
          projectId: formData.projectId || '',
          assigneeId: formData.assigneeId || '',
          status: formData.status || 'new',
          priority: formData.priority || 'medium',
        };
        await api.addTask(newTask);
        setNotification({ open: true, message: 'Задача создана!', severity: 'success' });
      }
      setDialogOpen(false);
    } catch (error) {
      setNotification({ open: true, message: 'Ошибка при сохранении задачи', severity: 'error' });
    }
  };
  
  const requestDelete = (id: string) => setConfirm({ open: true, id });
  
  const confirmDelete = async () => {
    if (confirm.open && confirm.id) {
      await api.deleteTask(confirm.id);
      setNotification({ open: true, message: 'Задача удалена', severity: 'success' });
      setConfirm({ open: false, id: null });
    }
  };

  const contractorMap = useMemo(() => {
    return contractors.reduce((acc, c) => {
      acc[c.id] = c.name;
      return acc;
    }, {} as Record<string, string>);
  }, [contractors]);

  const getContractorNameForTask = (task: Task): string => {
    const project = projects.find(p => p.id === task.projectId);
    const clientId = project?.clientId;
    return clientId ? (contractorMap[clientId] || '') : '';
  };

  const visibleTasks = tasks.filter(t => (!filterProjectId || t.projectId === filterProjectId));

  const sortedTasks = useMemo(() => {
    const list = [...visibleTasks];
    if (sortBy === 'contractorAsc' || sortBy === 'contractorDesc') {
      list.sort((a, b) => {
        const an = getContractorNameForTask(a).toLowerCase();
        const bn = getContractorNameForTask(b).toLowerCase();
        if (an === bn) return 0;
        const res = an < bn ? -1 : 1;
        return sortBy === 'contractorAsc' ? res : -res;
      });
    }
    return list;
  }, [visibleTasks, sortBy]);

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || projectId;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Задачи</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Новая задача
        </Button>
      </Box>
      
      <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel>Фильтр по проекту</InputLabel>
          <Select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            label="Фильтр по проекту"
          >
            <MenuItem value=""><em>Все проекты</em></MenuItem>
            {projects.map(p => (
              <MenuItem key={p.id} value={p.id!}>{p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel>Сортировка</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            label="Сортировка"
          >
            <MenuItem value="default">Без сортировки</MenuItem>
            <MenuItem value="contractorAsc">По контрагенту (А→Я)</MenuItem>
            <MenuItem value="contractorDesc">По контрагенту (Я→А)</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {sortedTasks.map(task => (
        <Card key={task.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box flex={1}>
                <Typography variant="h6" gutterBottom>{task.title}</Typography>
                {task.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {task.description}
                  </Typography>
                )}
                {task.projectId && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <WorkIcon sx={{ mr: 0.5, fontSize: 'small', verticalAlign: 'middle' }} />
                    {getProjectName(task.projectId)}
                  </Typography>
                )}
                {getContractorNameForTask(task) && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <BusinessIcon sx={{ mr: 0.5, fontSize: 'small', verticalAlign: 'middle' }} />
                    {getContractorNameForTask(task)}
                  </Typography>
                )}
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Chip label={task.priority} size="small" color={getPriorityColor(task.priority)} />
                  <Chip label={task.status} size="small" color={getStatusColor(task.status)} />
                </Box>
              </Box>
              <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
                <TimeTrackingButton 
                  size="small" 
                  buttonText="Начать работу"
                />
                <IconButton aria-label="edit-task" onClick={() => handleOpenDialog(task)} size="small">
                  <EditIcon />
                </IconButton>
                <IconButton aria-label="delete-task" onClick={() => requestDelete(task.id!)} size="small" color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}

      {/* Dialogs */}
      <Notification {...notification} onClose={() => setNotification({ ...notification, open: false })} />
      <ConfirmDialog
        open={confirm.open}
        title="Удалить задачу?"
        message="Вы уверены, что хотите удалить эту задачу?"
        onConfirm={confirmDelete}
        onClose={() => setConfirm({ open: false, id: null })}
      />
      
      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTask ? 'Редактировать задачу' : 'Новая задача'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Заголовок"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>Проект</InputLabel>
              <Select
                value={formData.projectId || ''}
                label="Проект"
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value as string })}
              >
                <MenuItem value=""><em>Не выбран</em></MenuItem>
                {projects.map(p => (
                  <MenuItem key={p.id} value={p.id!}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Описание"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />

            <Box display="flex" gap={2}>
              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select
                  value={formData.status || 'new'}
                  label="Статус"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                >
                  <MenuItem value="new">new</MenuItem>
                  <MenuItem value="in_progress">in_progress</MenuItem>
                  <MenuItem value="review">review</MenuItem>
                  <MenuItem value="testing">testing</MenuItem>
                  <MenuItem value="done">done</MenuItem>
                  <MenuItem value="cancelled">cancelled</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Приоритет</InputLabel>
                <Select
                  value={formData.priority || 'medium'}
                  label="Приоритет"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                >
                  <MenuItem value="low">low</MenuItem>
                  <MenuItem value="medium">medium</MenuItem>
                  <MenuItem value="high">high</MenuItem>
                  <MenuItem value="critical">critical</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.title}>Сохранить</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default TasksPage;
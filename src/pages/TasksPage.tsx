import React, { useState, useEffect } from 'react';
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

} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  Business as BusinessIcon, 
  Work as WorkIcon,

} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getTasksStream, addTask, updateTask, deleteTask, Task, TaskStatus, TaskPriority } from '../api/taskApi';


import { getContractorsStream, Contractor } from '../api/contractorApi';
import { getProjectsStream, Project } from '../api/projectApi';
import { useLocation, useNavigate } from 'react-router-dom';

const TasksPage: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation() as any;
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    task: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: 'new' as TaskStatus,
    contractorId: '',
    contractorName: '',
    projectId: '',
    projectName: '',
    estimateItemId: '',
    assigneeId: '',
    assigneeName: '',
    deadline: '',
    plannedDuration: 0,
    requirePhoto: false,
    questions: '',
    whatToBuy: '',
    tags: [] as string[]
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; taskId?: string }>({ open: false });
  const [filterContractorId, setFilterContractorId] = useState<string>('');


  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribeTasks = getTasksStream(currentUser.uid, (data) => {
      setTasks(data);
    });
    
    const unsubscribeContractors = getContractorsStream(currentUser.uid, (data) => {
      setContractors(data);
    });
    const unsubscribeProjects = getProjectsStream(currentUser.uid, (data) => {
      setProjects(data);
      setLoading(false);
    });
    
    return () => {
      unsubscribeTasks();
      unsubscribeContractors();
      unsubscribeProjects();
    };
  }, [currentUser]);

  useEffect(() => {
    if (loading) return;
    const newForId = location?.state?.newForContractorId as string | undefined;
    const newForProjectId = location?.state?.newForProjectId as string | undefined;
    if (newForId) {
      const prefill = contractors.find(c => c.id === newForId);
      setEditingTask(null);
      setFormData({
        task: '',
        description: '',
        priority: 'medium',
        status: 'new' as TaskStatus,
        contractorId: prefill?.id || newForId,
        contractorName: prefill?.name || '',
        projectId: '',
        projectName: '',
        estimateItemId: '',
        assigneeId: '',
        assigneeName: '',
        deadline: '',
        plannedDuration: 0,
        requirePhoto: false,
        questions: '',
        whatToBuy: '',
        tags: []
      });
      setOpenDialog(true);
      setFilterContractorId(newForId);
      navigate('/tasks', { replace: true, state: {} });
    } else if (newForProjectId) {
      const prefillProject = projects.find(p => p.id === newForProjectId);
      setEditingTask(null);
      setFormData({
        task: '',
        description: '',
        priority: 'medium',
        status: 'new' as TaskStatus,
        contractorId: '',
        contractorName: '',
        projectId: prefillProject?.id || newForProjectId,
        projectName: prefillProject?.name || '',
        estimateItemId: '',
        assigneeId: '',
        assigneeName: '',
        deadline: '',
        plannedDuration: 0,
        requirePhoto: false,
        questions: '',
        whatToBuy: '',
        tags: []
      });
      setOpenDialog(true);
      navigate('/tasks', { replace: true, state: {} });
    }
  }, [loading, contractors, projects, location, navigate]);

  const handleOpenDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        task: task.task,
        description: task.description || '',
        priority: (task.priority || 'medium') as TaskPriority,
        status: (task.status || 'new') as TaskStatus,
        contractorId: task.contractorId || '',
        contractorName: task.contractorName || '',
        projectId: task.projectId || '',
        projectName: task.projectName || '',
        estimateItemId: task.estimateItemId || '',
        assigneeId: task.assigneeId || '',
        assigneeName: task.assigneeName || '',
        deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
        plannedDuration: task.plannedDuration || 0,
        requirePhoto: task.requirePhoto || false,
        questions: task.questions || '',
        whatToBuy: task.whatToBuy || '',
        tags: task.tags || []
      });
    } else {
      setEditingTask(null);
      const prefillId = filterContractorId || '';
      const prefill = contractors.find(c => c.id === prefillId);
      setFormData({
        task: '',
        description: '',
        priority: 'medium' as TaskPriority,
        status: 'new' as TaskStatus,
        contractorId: prefill?.id || '',
        contractorName: prefill?.name || '',
        projectId: '',
        projectName: '',
        estimateItemId: '',
        assigneeId: '',
        assigneeName: '',
        deadline: '',
        plannedDuration: 0,
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
    setFormData({
      task: '',
      description: '',
      priority: 'medium',
      status: 'new' as TaskStatus,
      contractorId: '',
      contractorName: '',
      projectId: '',
      projectName: '',
      estimateItemId: '',
      assigneeId: '',
      assigneeName: '',
      deadline: '',
      plannedDuration: 0,
      requirePhoto: false,
      questions: '',
      whatToBuy: '',
      tags: []
    });
  };

  const handleSubmit = async () => {
    if (!currentUser || !formData.task.trim() || !formData.contractorId || !formData.projectId) return;

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
      setNotification({ open: true, message: 'Произошла ошибка при сохранении задачи', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const requestDelete = (taskId: string) => {
    setConfirm({ open: true, taskId });
  };

  const confirmDelete = async () => {
    if (!currentUser || !confirm.taskId) return;
    try {
      await deleteTask(currentUser.uid, confirm.taskId);
      setNotification({ open: true, message: 'Задача успешно удалена!', severity: 'success' });
    } catch (error) {
      console.error('Ошибка при удалении задачи:', error);
      setNotification({ open: true, message: 'Произошла ошибка при удалении задачи', severity: 'error' });
    } finally {
      setConfirm({ open: false });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'info';
      default: return 'default';
    }
  };

  const handleContractorChange = (contractorId: string) => {
    const selectedContractor = contractors.find(c => c.id === contractorId);
    setFormData({
      ...formData,
      contractorId: contractorId,
      contractorName: selectedContractor?.name || ''
    });
  };

  const visibleTasks = tasks.filter(t => !filterContractorId || t.contractorId === filterContractorId);

  const isSaveDisabled = !formData.task.trim() || !formData.contractorId || !formData.projectId || submitting || contractors.length === 0 || projects.length === 0;

  if (loading) return <LoadingSpinner />;
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Задачи</Typography>
      <Box display="flex" gap={2} alignItems="center" mb={2}>
        <Button 
          variant="contained" 
          onClick={() => handleOpenDialog()}
          disabled={contractors.length === 0}
        >
          + Новая задача
        </Button>
        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel>Фильтр по контрагенту</InputLabel>
          <Select
            value={filterContractorId}
            label="Фильтр по контрагенту"
            onChange={(e) => setFilterContractorId(e.target.value)}
          >
            <MenuItem value="">
              <em>Все</em>
            </MenuItem>
            {contractors.map(c => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      {visibleTasks.length > 0 ? visibleTasks.map(task => (
        <Card key={task.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box flex={1}>
                <Typography variant="h6" gutterBottom>{task.task}</Typography>
                {task.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {task.description}
                  </Typography>
                )}
                {task.contractorName && (
                  <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                    <BusinessIcon sx={{ mr: 0.5, fontSize: 'small', verticalAlign: 'middle' }} />
                    {task.contractorName}
                  </Typography>
                )}
                {task.projectName && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <WorkIcon sx={{ mr: 0.5, fontSize: 'small', verticalAlign: 'middle' }} />
                    Проект: {task.projectName}
                  </Typography>
                )}
                {task.whatToBuy && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Что купить: {task.whatToBuy}
                  </Typography>
                )}
                {task.questions && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Вопросы и уточнения: {task.questions}
                  </Typography>
                )}
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Chip 
                    label={task.priority || 'medium'} 
                    color={getPriorityColor(task.priority || 'medium')} 
                    size="small" 
                  />
                  <Chip 
                    label={task.status || 'pending'} 
                    color={getStatusColor(task.status || 'pending')} 
                    size="small" 
                  />
                </Box>
              </Box>
              <Box>
                <IconButton aria-label="edit-task" onClick={() => handleOpenDialog(task)} size="small">
                  <EditIcon />
                </IconButton>
                <IconButton aria-label="delete-task" onClick={() => requestDelete(task.id)} size="small" color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )) : <Typography>Задач пока нет.</Typography>}


      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTask ? 'Редактировать задачу' : 'Новая задача'}
        </DialogTitle>
        <DialogContent>
          {contractors.length === 0 && (
            <Typography color="warning.main" sx={{ mb: 1 }}>
              Сначала добавьте контрагента, чтобы создать задачу.
            </Typography>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Название задачи"
            fullWidth
            variant="outlined"
            value={formData.task}
            onChange={(e) => setFormData({...formData, task: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Описание"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Что купить"
            fullWidth
            variant="outlined"
            multiline
            rows={2}
            value={formData.whatToBuy}
            onChange={(e) => setFormData({...formData, whatToBuy: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Вопросы и уточнения"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={formData.questions}
            onChange={(e) => setFormData({...formData, questions: e.target.value})}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Приоритет</InputLabel>
            <Select
              value={formData.priority}
              label="Приоритет"
              onChange={(e) => setFormData({...formData, priority: e.target.value})}
            >
              <MenuItem value="low">Низкий</MenuItem>
              <MenuItem value="medium">Средний</MenuItem>
              <MenuItem value="high">Высокий</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Статус</InputLabel>
            <Select
              value={formData.status}
              label="Статус"
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <MenuItem value="pending">Ожидает</MenuItem>
              <MenuItem value="in_progress">В работе</MenuItem>
              <MenuItem value="completed">Завершено</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth required error={!formData.contractorId} sx={{ mb: 2 }}>
            <InputLabel>Контрагент</InputLabel>
            <Select
              value={formData.contractorId}
              label="Контрагент"
              onChange={(e) => handleContractorChange(e.target.value)}
              disabled={contractors.length === 0}
            >
              <MenuItem value="">
                <em>Не выбран</em>
              </MenuItem>
              {contractors.map(contractor => (
                <MenuItem key={contractor.id} value={contractor.id}>
                  {contractor.name}
                </MenuItem>
              ))}
            </Select>
            {!formData.contractorId && (
              <FormHelperText>Выберите контрагента</FormHelperText>
            )}
          </FormControl>
          <FormControl fullWidth required error={!formData.projectId}>
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
              disabled={projects.length === 0}
            >
              <MenuItem value="">
                <em>Не выбран</em>
              </MenuItem>
              {projects.map(project => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
            {!formData.projectId && (
              <FormHelperText>Выберите проект</FormHelperText>
            )}
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>Отмена</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={isSaveDisabled}>
            {submitting ? 'Сохранение...' : (editingTask ? 'Сохранить' : 'Создать')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        message="Удалить эту задачу?"
        confirmText="Удалить"
        onConfirm={confirmDelete}
        onClose={() => setConfirm({ open: false })}
      />

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
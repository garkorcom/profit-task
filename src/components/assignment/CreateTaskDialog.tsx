import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Grid,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import { 
  AssignmentTaskPriority, 
  CreateAssignmentTaskDto 
} from '../../types/taskAssignment';
import { useAuth } from '../../auth/AuthContext';
import { createAssignmentTask } from '../../api/taskAssignmentApi';
import { Project } from '../../api/projectApi';
import { getProjectsStream } from '../../api/projectApi';
import { getUsersStream } from '../../api/userApi';

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  open,
  onClose,
  onTaskCreated
}) => {
  const { currentUser } = useAuth();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [priority, setPriority] = useState<AssignmentTaskPriority>('medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [requireLocation, setRequireLocation] = useState(false);
  const [requireStartPhoto, setRequireStartPhoto] = useState(false);
  const [requireEndPhoto, setRequireEndPhoto] = useState(false);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    } else {
      // Reset form when dialog closes
      resetForm();
    }
  }, [open]);

  const loadData = async () => {
    if (!currentUser) return;
    
    setDataLoading(true);
    try {
      // Load projects
      const unsubscribeProjects = getProjectsStream(currentUser.uid, (projectsData) => {
        setProjects(projectsData);
      });

      // Load users (employees)
      const unsubscribeUsers = getUsersStream((usersData) => {
        const userOptions = usersData
          .filter(user => user.id !== currentUser.uid) // Exclude current user
          .map(user => ({
            id: user.id,
            name: user.displayName || user.email || 'Unknown User',
            email: user.email || ''
          }));
        setUsers(userOptions);
      });

      // Cleanup subscriptions on component unmount
      return () => {
        unsubscribeProjects();
        unsubscribeUsers();
      };
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Ошибка загрузки данных');
    } finally {
      setDataLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAssignedTo('');
    setProjectId('');
    setPriority('medium');
    setDueDate(null);
    setRequireLocation(false);
    setRequireStartPhoto(false);
    setRequireEndPhoto(false);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!currentUser) {
      setError('Пользователь не авторизован');
      return;
    }

    if (!title.trim()) {
      setError('Заголовок обязателен');
      return;
    }

    if (!assignedTo) {
      setError('Необходимо выбрать исполнителя');
      return;
    }

    if (!projectId) {
      setError('Необходимо выбрать проект');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedUser = users.find(u => u.id === assignedTo);
      const selectedProject = projects.find(p => p.id === projectId);

      if (!selectedUser || !selectedProject) {
        throw new Error('Выбранный пользователь или проект не найден');
      }

      const taskData: CreateAssignmentTaskDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        assignedTo,
        assignedToName: selectedUser.name,
        assignedBy: currentUser.uid,
        assignedByName: currentUser.displayName || currentUser.email || 'Unknown User',
        projectId,
        projectName: selectedProject.name,
        priority,
        dueDate: dueDate || undefined,
        requireLocation,
        requireStartPhoto,
        requireEndPhoto
      };

      await createAssignmentTask(taskData);
      
      onTaskCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      setError(error instanceof Error ? error.message : 'Ошибка создания задачи');
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find(u => u.id === assignedTo);
  const selectedProject = projects.find(p => p.id === projectId);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          component: 'form',
          onSubmit: handleSubmit
        }}
      >
        <DialogTitle>
          Создать задачу для сотрудника
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Title */}
            <Grid item xs={12}>
              <TextField
                label="Заголовок задачи"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                required
                autoFocus
                error={!title.trim() && error !== null}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                label="Описание задачи"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={3}
                placeholder="Подробное описание того, что нужно сделать..."
              />
            </Grid>

            {/* Assignee */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Исполнитель</InputLabel>
                <Select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  label="Исполнитель"
                  disabled={dataLoading}
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      <Box>
                        <Typography variant="body2">{user.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Project */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Проект</InputLabel>
                <Select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  label="Проект"
                  disabled={dataLoading}
                >
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Priority */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Приоритет</InputLabel>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as AssignmentTaskPriority)}
                  label="Приоритет"
                >
                  <MenuItem value="low">Низкий</MenuItem>
                  <MenuItem value="medium">Средний</MenuItem>
                  <MenuItem value="high">Высокий</MenuItem>
                  <MenuItem value="urgent">Срочный</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Due Date */}
            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Срок выполнения"
                value={dueDate}
                onChange={setDueDate}
                slotProps={{
                  textField: { fullWidth: true }
                }}
                minDateTime={new Date()}
              />
            </Grid>

            {/* Requirements */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Требования к выполнению
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={requireLocation}
                      onChange={(e) => setRequireLocation(e.target.checked)}
                    />
                  }
                  label="Требовать определение местоположения (GPS)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={requireStartPhoto}
                      onChange={(e) => setRequireStartPhoto(e.target.checked)}
                    />
                  }
                  label="Требовать фото перед началом работы"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={requireEndPhoto}
                      onChange={(e) => setRequireEndPhoto(e.target.checked)}
                    />
                  }
                  label="Требовать фото по завершению работы"
                />
              </Box>
            </Grid>

            {/* Preview */}
            {(selectedUser || selectedProject) && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Предварительный просмотр
                </Typography>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Задача:</strong> {title || 'Без названия'}
                  </Typography>
                  {selectedUser && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Исполнитель:</strong> {selectedUser.name}
                    </Typography>
                  )}
                  {selectedProject && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Проект:</strong> {selectedProject.name}
                    </Typography>
                  )}
                  {dueDate && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Срок:</strong> {dueDate.toLocaleDateString('ru-RU')}
                    </Typography>
                  )}
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading || dataLoading || !title.trim() || !assignedTo || !projectId}
            startIcon={loading && <CircularProgress size={16} />}
          >
            {loading ? 'Создание...' : 'Создать задачу'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default CreateTaskDialog;
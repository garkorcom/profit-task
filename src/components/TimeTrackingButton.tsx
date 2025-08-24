import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Alert,
  Box,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import type { ButtonProps as MUIButtonProps } from '@mui/material/Button';
import { PlayArrow as StartIcon, PhotoCamera as CameraIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { getProjectsStream, Project } from '../api/projectApi';
import { getTasksStream, Task } from '../api/taskApi';

interface TimeTrackingButtonProps extends Omit<MUIButtonProps, 'children'> {
  buttonText?: string;
}

const TimeTrackingButton: React.FC<TimeTrackingButtonProps> = ({
  buttonText = 'Начать учёт времени',
  onClick,
  disabled,
  ...restProps
}) => {
  const { currentUser } = useAuth();
  const { isWorking, startWork } = useTimeTracking();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [startPhoto, setStartPhoto] = useState<File | null>(null);

  useEffect(() => {
    if (!currentUser || !open) return;

    const unsubProjects = getProjectsStream(currentUser.uid, setProjects);
    const unsubTasks = getTasksStream(currentUser.uid, setTasks);

    return () => {
      unsubProjects && unsubProjects();
      unsubTasks && unsubTasks();
    };
  }, [currentUser, open]);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isWorking) {
      setError('Уже идет учет времени. Завершите текущую работу.');
      return;
    }
    onClick?.(event); // Call external onClick if provided
    setOpen(true);
    setActiveStep(0);
    setSelectedProject(null);
    setSelectedTask(null);
    setError(null);
  };

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
    setError(null);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setActiveStep(1);
    setError(null);
  };

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setActiveStep(2);
    setError(null);
  };

  const handleStart = async () => {
    if (!selectedProject || !selectedTask) return;
    if (!startPhoto) {
      setError('Добавьте фото ДО начала работ');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await startWork(
        selectedTask.id,
        startPhoto
      );
      setOpen(false);
    } catch (err: any) {
      setError(err.message || 'Ошибка при начале работы');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const activeProjects = projects.filter(p => p.status === 'active');
  const projectTasks = selectedProject
    ? tasks.filter(t => t.projectId === selectedProject.id && t.status !== 'completed' && t.status !== 'cancelled')
    : [];

  const steps = ['Выберите проект', 'Выберите задачу', 'Подтверждение'];

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={isWorking || disabled}
        {...restProps}
      >
        {isWorking ? 'Идет учет времени' : buttonText}
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Начать учет времени
          <Stepper activeStep={activeStep} sx={{ mt: 2 }}>
            {steps.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {activeStep === 0 && (
            <List>
              {activeProjects.map((project) => (
                <ListItemButton key={project.id} onClick={() => handleSelectProject(project)}>
                  <ListItemText primary={project.name} />
                </ListItemButton>
              ))}
            </List>
          )}

          {activeStep === 1 && (
            <List>
              {projectTasks.map((task) => (
                <ListItemButton key={task.id} onClick={() => handleSelectTask(task)}>
                  <ListItemText primary={task.task} />
                </ListItemButton>
              ))}
            </List>
          )}

          {activeStep === 2 && selectedProject && selectedTask && (
            <Box sx={{ p: 2 }}>
              <Typography>Проект: {selectedProject.name}</Typography>
              <Typography>Задача: {selectedTask.task}</Typography>
              <Button component="label" variant="outlined" startIcon={<CameraIcon />} sx={{ mt: 2 }}>
                {startPhoto ? `Фото выбрано: ${startPhoto.name}` : 'Добавить фото ДО'}
                <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => setStartPhoto(e.target.files?.[0] || null)} />
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {activeStep > 0 && <Button onClick={handleBack} disabled={loading}>Назад</Button>}
          <Button onClick={handleClose} disabled={loading}>Отмена</Button>
          {activeStep === 2 && (
            <Button
              onClick={handleStart}
              variant="contained"
              color="success"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <StartIcon />}
            >
              {loading ? 'Запуск...' : 'Начать работу'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TimeTrackingButton;

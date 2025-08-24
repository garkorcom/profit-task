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
import { PlayArrow as StartIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import type { Project } from '../api/projectApi';
import type { Task } from '../api/taskApi';
import { useApi } from '../hooks/useApi';

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
  const api = useApi();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || !open) return;
    const unsubProjects = api.getProjectsStream(setProjects);
    return () => {
      unsubProjects && unsubProjects();
    };
  }, [currentUser, open, api]);

  // Load tasks for selected project when step 2 is about to be used
  useEffect(() => {
    if (!open || !selectedProject) return;
    const unsubTasks = api.getTasksByProjectStream(selectedProject.id, setTasks);
    return () => {
      unsubTasks && unsubTasks();
    };
  }, [open, selectedProject, api]);

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

    setLoading(true);
    setError(null);

    try {
      await startWork(
        selectedProject.id,
        selectedProject.name,
        selectedTask.id,
        selectedTask.title
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
    ? tasks.filter(t => t.projectId === selectedProject.id && t.status !== 'done' && t.status !== 'cancelled')
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
                  <ListItemText primary={task.title} />
                </ListItemButton>
              ))}
            </List>
          )}

          {activeStep === 2 && selectedProject && selectedTask && (
            <Box sx={{ p: 2 }}>
              <Typography>Проект: {selectedProject.name}</Typography>
              <Typography>Задача: {selectedTask.title}</Typography>
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

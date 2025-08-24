import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
  Container,
} from '@mui/material';

import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Timer as TimerIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { getProjectsStream, Project } from '../api/projectApi';
import { getTasksStream, Task } from '../api/taskApi';
import LoadingSpinner from '../components/common/LoadingSpinner';

const TimeTrackingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    isWorking, 
    currentSession, 
    elapsedSeconds, 
    startWork, 
    stopWork,
    isPaused,
    pauseWork,
    resumeWork 
  } = useTimeTracking();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [starting, setStarting] = useState(false);

  // Load projects and tasks
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const unsubProjects = getProjectsStream(currentUser.uid, (data) => {
      setProjects(data);
      setLoading(false);
    });
    const unsubTasks = getTasksStream(currentUser.uid, setTasks);

    return () => {
      unsubProjects && unsubProjects();
      unsubTasks && unsubTasks();
    };
  }, [currentUser]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
    setSelectedProject(null);
    setSelectedTask(null);
  };

  const handleStartWork = async () => {
    if (!selectedProject || !selectedTask) {
      alert('Выберите проект и задачу');
      return;
    }

    setStarting(true);
    try {
      await startWork(
        selectedProject.id,
        selectedProject.name,
        selectedTask.id!,
        selectedTask.title
      );
      setDialogOpen(false);
      setSelectedProject(null);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error starting work:', error);
      alert('Ошибка при начале работы');
    } finally {
      setStarting(false);
    }
  };

  const handleStopWork = async () => {
    if (window.confirm('Завершить работу и сохранить время?')) {
      try {
        await stopWork();
      } catch (error) {
        console.error('Error stopping work:', error);
        alert('Ошибка при завершении работы');
      }
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    return (
      <Container>
        <Alert severity="warning">Необходимо войти в систему</Alert>
      </Container>
    );
  }

  const activeProjects = projects.filter(p => p.status === 'active');
  const projectTasks = selectedProject
    ? tasks.filter(t => t.projectId === selectedProject.id && t.status !== 'done' && t.status !== 'cancelled')
    : [];

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          <TimerIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Учет рабочего времени
        </Typography>

        {/* Current Work Session */}
        {isWorking && currentSession ? (
          <Card 
            sx={{ 
              mb: 4, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}
          >
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Активная работа
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Проект
                  </Typography>
                  <Typography variant="h6">
                    {currentSession.projectName}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Задача
                  </Typography>
                  <Typography variant="h6">
                    {currentSession.taskName}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="h2" sx={{ fontFamily: 'monospace' }}>
                  {formatTime(elapsedSeconds)}
                </Typography>
                <Typography variant="caption">
                  {isPaused ? 'На паузе' : 'Время работы'}
                </Typography>
              </Box>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button
                variant="contained"
                color="inherit"
                onClick={isPaused ? resumeWork : pauseWork}
                sx={{ mr: 2, color: '#764ba2' }}
              >
                {isPaused ? 'Продолжить' : 'Пауза'}
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleStopWork}
              >
                Завершить работу
              </Button>
            </CardActions>
          </Card>
        ) : (
          <Card sx={{ mb: 4 }}>
            <CardContent sx={{ textAlign: 'center', py: 5 }}>
              <TimerIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Нет активной работы
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Начните учет времени, выбрав проект и задачу
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<StartIcon />}
                onClick={handleOpenDialog}
                color="success"
              >
                Начать работу
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mb: 4 }}>
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {activeProjects.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Активных проектов
              </Typography>
            </Paper>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Незавершенных задач
              </Typography>
            </Paper>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {isWorking ? formatTime(elapsedSeconds) : '00:00:00'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Текущая сессия
              </Typography>
            </Paper>
          </Box>
        </Box>

        {/* Recent Projects */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Доступные проекты
            </Typography>
            <List>
              {activeProjects.length === 0 ? (
                <ListItem>
                  <ListItemText 
                    primary="Нет активных проектов"
                    secondary="Создайте проект для начала работы"
                  />
                </ListItem>
              ) : (
                activeProjects.map((project, index) => (
                  <React.Fragment key={project.id}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={project.name}
                        secondary={
                          <Box>
                            {project.contractorName && (
                              <Typography variant="caption" display="block">
                                Заказчик: {project.contractorName}
                              </Typography>
                            )}
                            <Typography variant="caption">
                              Задач: {tasks.filter(t => t.projectId === project.id && t.status !== 'done' && t.status !== 'cancelled').length}
                            </Typography>
                          </Box>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                      <Chip 
                        label={project.status} 
                        size="small"
                        color={project.status === 'active' ? 'success' : 'default'}
                      />
                    </ListItem>
                  </React.Fragment>
                ))
              )}
            </List>
          </CardContent>
        </Card>

        {/* Start Work Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={() => !starting && setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <StartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Начать учет времени
          </DialogTitle>
          <DialogContent>
            {/* Select Project */}
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Выберите проект:
            </Typography>
            <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
              {activeProjects.map(project => (
                <ListItem key={project.id} sx={{ p: 0, mb: 1 }}>
                  <ListItemButton
                    selected={selectedProject?.id === project.id}
                    onClick={() => setSelectedProject(project)}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemText
                      primary={project.name}
                      secondary={project.contractorName}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            {/* Select Task */}
            {selectedProject && (
              <>
                <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                  Выберите задачу:
                </Typography>
                {projectTasks.length === 0 ? (
                  <Alert severity="info">
                    В этом проекте нет активных задач
                  </Alert>
                ) : (
                  <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                    {projectTasks.map(task => (
                      <ListItem key={task.id} sx={{ p: 0, mb: 1 }}>
                        <ListItemButton
                          selected={selectedTask?.id === task.id}
                          onClick={() => setSelectedTask(task)}
                          sx={{ borderRadius: 1 }}
                        >
                          <ListItemText
                            primary={task.name}
                            secondary={task.description}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </>
            )}

            {/* Summary */}
            {selectedProject && selectedTask && (
              <Alert severity="success" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Проект:</strong> {selectedProject.name}
                </Typography>
                <Typography variant="body2">
                  <strong>Задача:</strong> {selectedTask.name}
                </Typography>
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={starting}>
              Отмена
            </Button>
            <Button
              onClick={handleStartWork}
              variant="contained"
              color="success"
              disabled={!selectedProject || !selectedTask || starting}
              startIcon={starting ? null : <StartIcon />}
            >
              {starting ? 'Запуск...' : 'Начать работу'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default TimeTrackingPage;

import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Alert,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Chip,
  Stack,
  IconButton,
  Fade,
  Slide,
  Avatar,
  Divider
} from '@mui/material';
import { 
  PlayArrow as StartIcon, 
  CameraAlt as CameraIcon, 
  LocationOn as LocationIcon,
  Business as ProjectIcon,
  Assignment as TaskIcon,
  Description as EstimateIcon,
  Build as ServiceIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Timer as TimerIcon,
  SkipNext as SkipIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { Project } from '../api/projectApi';
import { Task } from '../api/taskApi';
import { Estimate, EstimateItem, getEstimatesStream } from '../api/estimateApi';

interface StartWorkButtonProps {
  projects: Project[];
  tasks: Task[];
}

const StartWorkButton: React.FC<StartWorkButtonProps> = ({ projects, tasks }) => {
  const { currentUser } = useAuth();
  const { startWork, isWorking } = useTimeTracking();
  
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [selectedService, setSelectedService] = useState<EstimateItem | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [geoLocation, setGeoLocation] = useState<GeolocationPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { label: 'Проект', icon: <ProjectIcon /> },
    { label: 'Задача', icon: <TaskIcon /> },
    { label: 'Смета', icon: <EstimateIcon />, optional: true },
    { label: 'Услуга', icon: <ServiceIcon />, optional: true },
    { label: 'Детали', icon: <TimerIcon /> }
  ];

  const activeProjects = projects.filter(p => p.status === 'active');
  const projectTasks = selectedProject
    ? tasks.filter(t => t.projectId === selectedProject.id && t.status !== 'completed' && t.status !== 'cancelled')
    : [];

  // Load estimates when project is selected
  useEffect(() => {
    if (!selectedProject || !currentUser) {
      setEstimates([]);
      return;
    }

    const unsubscribe = getEstimatesStream(currentUser.uid, '', (estimatesList) => {
      const projectEstimates = estimatesList.filter(e => 
        !e.projectId || e.projectId === selectedProject.id || e.projectId === ''
      );
      
      setEstimates(projectEstimates.length > 0 ? projectEstimates : estimatesList);
    });

    return () => unsubscribe();
  }, [selectedProject, currentUser]);

  const handleOpen = () => {
    if (isWorking) {
      setError('Уже идет учет времени. Завершите текущую работу перед началом новой.');
      return;
    }
    setOpen(true);
    setActiveStep(0);
    setSelectedProject(null);
    setSelectedTask(null);
    setSelectedEstimate(null);
    setSelectedService(null);
    setEstimates([]);
    setPhotoFile(null);
    setGeoLocation(null);
    setError(null);
  };

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
    setError(null);
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedProject) {
      setError('Выберите проект');
      return;
    }
    if (activeStep === 1 && !selectedTask) {
      setError('Выберите задачу');
      return;
    }
    
    setError(null);
    
    // Skip estimate step if no estimates
    if (activeStep === 1 && estimates.length === 0) {
      setActiveStep(4); // Go to details
    } else if (activeStep === 2 && !selectedEstimate) {
      setActiveStep(4); // Skip to details if no estimate selected
    } else if (activeStep === 3 && !selectedService) {
      setActiveStep(4); // Skip to details if no service selected
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep === 4 && !selectedEstimate) {
      // If we skipped estimate, go back to task
      setActiveStep(1);
    } else {
      setActiveStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (activeStep === 2) {
      setSelectedEstimate(null);
      setSelectedService(null);
      setActiveStep(4);
    } else if (activeStep === 3) {
      setSelectedService(null);
      setActiveStep(4);
    }
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeoLocation(position);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Не удалось получить геолокацию');
        }
      );
    } else {
      setError('Геолокация не поддерживается браузером');
    }
  };

  const handleStart = async () => {
    if (!selectedProject || !selectedTask || !currentUser) {
      setError('Не все данные выбраны');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await startWork(
        selectedTask.id,
        photoFile || undefined,
        geoLocation || undefined,
        selectedEstimate?.id,
        selectedEstimate?.name || selectedEstimate?.number,
        selectedService?.id,
        selectedService?.name
      );
      setOpen(false);
    } catch (error) {
      console.error('Error starting work:', error);
      setError('Ошибка при начале работы');
    } finally {
      setLoading(false);
    }
  };

  const getTaskStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch(status) {
      case 'new': return 'info';
      case 'in_progress': return 'warning';
      case 'review': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        size="large"
        startIcon={<StartIcon />}
        onClick={handleOpen}
        disabled={isWorking}
        sx={{ 
          borderRadius: 2,
          py: 1.5,
          px: 3,
          boxShadow: 3,
          '&:hover': {
            boxShadow: 6
          }
        }}
      >
        Начать работу
      </Button>

      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' } as any}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h5" fontWeight="bold">
              Начать учет времени
            </Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Stepper activeStep={activeStep} orientation="vertical" sx={{ mt: 2 }}>
            {/* Step 0: Select Project */}
            <Step>
              <StepLabel icon={<ProjectIcon />}>
                Выберите проект
              </StepLabel>
              <StepContent>
                <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                  {activeProjects.map(project => (
                    <ListItemButton
                      key={project.id}
                      selected={selectedProject?.id === project.id}
                      onClick={() => {
                        setSelectedProject(project);
                        setSelectedTask(null);
                        handleNext();
                      }}
                      sx={{ 
                        borderRadius: 2, 
                        mb: 1,
                        border: selectedProject?.id === project.id ? 2 : 0,
                        borderColor: 'primary.main'
                      }}
                    >
                      <ListItemIcon>
                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                          <ProjectIcon />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText 
                        primary={project.name}
                        secondary={project.description}
                      />
                      {selectedProject?.id === project.id && (
                        <CheckIcon color="primary" />
                      )}
                    </ListItemButton>
                  ))}
                </List>
              </StepContent>
            </Step>

            {/* Step 1: Select Task */}
            <Step>
              <StepLabel icon={<TaskIcon />}>
                Выберите задачу
              </StepLabel>
              <StepContent>
                {selectedProject && (
                  <Box>
                    <Alert severity="info" icon={<ProjectIcon />} sx={{ mb: 2 }}>
                      Проект: <strong>{selectedProject.name}</strong>
                    </Alert>
                    
                    <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                      {projectTasks.map(task => (
                        <ListItemButton
                          key={task.id}
                          selected={selectedTask?.id === task.id}
                          onClick={() => {
                            setSelectedTask(task);
                            handleNext();
                          }}
                          sx={{ 
                            borderRadius: 2, 
                            mb: 1,
                            border: selectedTask?.id === task.id ? 2 : 0,
                            borderColor: 'primary.main'
                          }}
                        >
                          <ListItemIcon>
                            <Avatar sx={{ bgcolor: 'secondary.light' }}>
                              <TaskIcon />
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText 
                            primary={task.task}
                            secondary={
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip 
                                  label={task.status} 
                                  size="small" 
                                  color={getTaskStatusColor(task.status)}
                                />
                                <Typography variant="caption">
                                  Приоритет: {task.priority}
                                </Typography>
                              </Stack>
                            }
                          />
                          {selectedTask?.id === task.id && (
                            <CheckIcon color="primary" />
                          )}
                        </ListItemButton>
                      ))}
                    </List>

                    <Box sx={{ mt: 2 }}>
                      <Button onClick={handleBack}>
                        Назад
                      </Button>
                    </Box>
                  </Box>
                )}
              </StepContent>
            </Step>

            {/* Step 2: Select Estimate (Optional) */}
            <Step>
              <StepLabel icon={<EstimateIcon />} optional={
                <Typography variant="caption">Опционально</Typography>
              }>
                Выберите смету
              </StepLabel>
              <StepContent>
                {selectedTask && (
                  <Box>
                    <Alert severity="info" icon={<TaskIcon />} sx={{ mb: 2 }}>
                      Задача: <strong>{selectedTask.task}</strong>
                    </Alert>
                    
                    {estimates.length === 0 ? (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        Нет доступных смет. Продолжить без привязки к смете.
                      </Alert>
                    ) : (
                      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                        {estimates.map(estimate => (
                          <ListItemButton
                            key={estimate.id}
                            selected={selectedEstimate?.id === estimate.id}
                            onClick={() => {
                              setSelectedEstimate(estimate);
                              handleNext();
                            }}
                            sx={{ 
                              borderRadius: 2, 
                              mb: 1,
                              border: selectedEstimate?.id === estimate.id ? 2 : 0,
                              borderColor: 'primary.main'
                            }}
                          >
                            <ListItemIcon>
                              <Avatar sx={{ bgcolor: 'success.light' }}>
                                <EstimateIcon />
                              </Avatar>
                            </ListItemIcon>
                            <ListItemText 
                              primary={`Смета №${estimate.number}`}
                              secondary={
                                <Stack>
                                  <Typography variant="body2">
                                    {estimate.name || estimate.description}
                                  </Typography>
                                  <Typography variant="caption" color="primary">
                                    Сумма: {(estimate.total || 0).toFixed(2)} ₽
                                  </Typography>
                                </Stack>
                              }
                            />
                            {selectedEstimate?.id === estimate.id && (
                              <CheckIcon color="primary" />
                            )}
                          </ListItemButton>
                        ))}
                      </List>
                    )}

                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Button onClick={handleBack}>
                        Назад
                      </Button>
                      <Button 
                        variant="outlined" 
                        onClick={handleSkip}
                        startIcon={<SkipIcon />}
                      >
                        Пропустить
                      </Button>
                    </Stack>
                  </Box>
                )}
              </StepContent>
            </Step>

            {/* Step 3: Select Service (Optional) */}
            <Step>
              <StepLabel icon={<ServiceIcon />} optional={
                <Typography variant="caption">Опционально</Typography>
              }>
                Выберите услугу
              </StepLabel>
              <StepContent>
                {selectedEstimate && (
                  <Box>
                    <Alert severity="success" icon={<EstimateIcon />} sx={{ mb: 2 }}>
                      Смета: <strong>№{selectedEstimate.number}</strong>
                    </Alert>
                    
                    <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                      {selectedEstimate.items?.map(item => (
                        <ListItemButton
                          key={item.id}
                          selected={selectedService?.id === item.id}
                          onClick={() => {
                            setSelectedService(item);
                            handleNext();
                          }}
                          sx={{ 
                            borderRadius: 2, 
                            mb: 1,
                            border: selectedService?.id === item.id ? 2 : 0,
                            borderColor: 'primary.main'
                          }}
                        >
                          <ListItemIcon>
                            <Avatar sx={{ bgcolor: 'warning.light' }}>
                              <ServiceIcon />
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText 
                            primary={item.name}
                            secondary={
                              <Stack>
                                <Typography variant="body2">
                                  {item.quantity} {item.unit} × {(item.unitPrice || 0)} ₽
                                </Typography>
                                <Typography variant="caption" color="primary">
                                  Итого: {(item.total || 0).toFixed(2)} ₽
                                </Typography>
                              </Stack>
                            }
                          />
                          {selectedService?.id === item.id && (
                            <CheckIcon color="primary" />
                          )}
                        </ListItemButton>
                      ))}
                    </List>

                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Button onClick={handleBack}>
                        Назад
                      </Button>
                      <Button 
                        variant="outlined" 
                        onClick={handleSkip}
                        startIcon={<SkipIcon />}
                      >
                        Пропустить
                      </Button>
                    </Stack>
                  </Box>
                )}
              </StepContent>
            </Step>

            {/* Step 4: Details */}
            <Step>
              <StepLabel icon={<TimerIcon />}>
                Детали работы
              </StepLabel>
              <StepContent>
                <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
                  <Stack spacing={2}>
                    <Alert severity="success" icon={<CheckIcon />}>
                      <strong>Готово к началу работы!</strong>
                    </Alert>
                    
                    <Divider />
                    
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Проект:</Typography>
                      <Typography variant="body1">{selectedProject?.name}</Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Задача:</Typography>
                      <Typography variant="body1">{selectedTask?.task}</Typography>
                    </Box>
                    
                    {selectedEstimate && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Смета:</Typography>
                        <Typography variant="body1">№{selectedEstimate.number} - {selectedEstimate.name}</Typography>
                      </Box>
                    )}
                    
                    {selectedService && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Услуга:</Typography>
                        <Typography variant="body1">{selectedService.name}</Typography>
                      </Box>
                    )}
                    
                    <Divider />
                    
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="outlined"
                        startIcon={<CameraIcon />}
                        component="label"
                        fullWidth
                      >
                        {photoFile ? 'Фото загружено ✓' : 'Добавить фото'}
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoCapture}
                        />
                      </Button>
                      
                      <Button
                        variant="outlined"
                        startIcon={<LocationIcon />}
                        onClick={handleGetLocation}
                        fullWidth
                        color={geoLocation ? 'success' : 'primary'}
                      >
                        {geoLocation ? 'Локация получена ✓' : 'Получить локацию'}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>

                <Box sx={{ mt: 2 }}>
                  <Button onClick={handleBack} sx={{ mr: 2 }}>
                    Назад
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={loading}>
            Отмена
          </Button>
          {activeStep === 4 && (
            <Button
              variant="contained"
              onClick={handleStart}
              disabled={loading || !selectedProject || !selectedTask}
              startIcon={loading ? <CircularProgress size={20} /> : <StartIcon />}
              size="large"
              sx={{ px: 4 }}
            >
              {loading ? 'Начинаем...' : 'Начать работу'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StartWorkButton;
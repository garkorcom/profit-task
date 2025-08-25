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
} from '@mui/material';
import { PlayArrow as StartIcon, CameraAlt as CameraIcon, LocationOn as LocationIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { Project } from '../api/projectApi';
import { Task } from '../api/taskApi';
import { Estimate, EstimateItem, getEstimatesStream } from '../api/estimateApi';

interface StartWorkButtonProps {
  projects: Project[];
  tasks: Task[];
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

const StartWorkButton: React.FC<StartWorkButtonProps> = ({ 
  projects, 
  tasks, 
  variant = 'contained',
  size = 'medium',
  fullWidth = false 
}) => {
  const { currentUser } = useAuth();
  const { startWork, isWorking } = useTimeTracking();
  
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [selectedService, setSelectedService] = useState<EstimateItem | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [geoLocation, setGeoLocation] = useState<GeolocationPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'project' | 'task' | 'estimate' | 'service' | 'details'>('project');

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

    const unsubscribe = getEstimatesStream(currentUser.uid, selectedProject.id, (estimatesList) => {
      const approvedEstimates = estimatesList.filter(e => e.status === 'approved');
      setEstimates(approvedEstimates);
    });

    return () => unsubscribe();
  }, [selectedProject, currentUser]);

  const handleOpen = () => {
    if (isWorking) {
      setError('Уже идет учет времени. Завершите текущую работу перед началом новой.');
      return;
    }
    setOpen(true);
    setStep('project');
    setSelectedProject(null);
    setSelectedTask(null);
    setPhotoFile(null);
    setGeoLocation(null);
    setError(null);
  };

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
    setError(null);
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setStep('task');
    setError(null);
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    // If there are approved estimates, show estimate selection
    console.log('Estimates available:', estimates.length);
    if (estimates.length > 0) {
      setStep('estimate');
    } else {
      setStep('details');
    }
    setError(null);
  };

  const handleEstimateSelect = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setStep('service');
    setError(null);
  };

  const handleServiceSelect = (service: EstimateItem) => {
    setSelectedService(service);
    setStep('details');
    setError(null);
  };

  const handleGetLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLocation(position);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to get location:', error);
        setError('Не удалось получить геолокацию');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handleStart = async () => {
    if (!selectedProject || !selectedTask) return;
    if (!photoFile) {
      setError('Требуется добавить фото ДО начала работы');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await startWork(
        selectedTask.id,
        photoFile,
        geoLocation || undefined,
        selectedEstimate?.id,
        selectedEstimate?.name || selectedEstimate?.number,
        selectedService?.id,
        selectedService?.name
      );

      // Success - close dialog
      setOpen(false);
      setStep('project');
      setSelectedProject(null);
      setSelectedTask(null);
      setSelectedEstimate(null);
      setSelectedService(null);
      setPhotoFile(null);
      setGeoLocation(null);
    } catch (error: any) {
      console.error('Failed to start work:', error);
      setError(error.message || 'Ошибка при начале работы');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'task') {
      setStep('project');
      setSelectedTask(null);
      setEstimates([]);
    } else if (step === 'estimate') {
      setStep('task');
      setSelectedEstimate(null);
    } else if (step === 'service') {
      setStep('estimate');
      setSelectedService(null);
    } else if (step === 'details') {
      if (selectedService) {
        setStep('service');
      } else if (estimates.length > 0) {
        setStep('estimate');
      } else {
        setStep('task');
      }
    }
    setError(null);
  };

  if (!currentUser) return null;

  return (
    <>
      <Button
        variant={variant}
        color="success"
        size={size}
        fullWidth={fullWidth}
        startIcon={<StartIcon />}
        onClick={handleOpen}
        disabled={isWorking}
      >
        {isWorking ? 'Работа уже идет' : 'Начать зарабатывать'}
      </Button>

      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { minHeight: '400px' }
        }}
      >
        <DialogTitle>
          {step === 'project' && 'Выберите проект'}
          {step === 'task' && 'Выберите задачу'}
          {step === 'details' && 'Подготовка к работе'}
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Step 1: Select Project */}
          {step === 'project' && (
            <Box sx={{ pt: 2 }}>
              {activeProjects.length === 0 ? (
                <Alert severity="info">
                  Нет активных проектов. Создайте проект для начала работы.
                </Alert>
              ) : (
                <Box display="flex" flexDirection="column" gap={2}>
                  {activeProjects.map(project => (
                    <Card key={project.id}>
                      <CardActionArea onClick={() => handleProjectSelect(project)}>
                        <CardContent>
                          <Typography variant="h6">{project.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {project.contractorName || 'Без заказчика'}
                          </Typography>
                          {project.description && (
                            <Typography variant="caption" color="text.secondary">
                              {project.description}
                            </Typography>
                          )}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Step 2: Select Task */}
          {step === 'task' && selectedProject && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Проект: <strong>{selectedProject.name}</strong>
              </Alert>
              
              {projectTasks.length === 0 ? (
                <Alert severity="warning">
                  В этом проекте нет активных задач. Создайте задачу для начала работы.
                </Alert>
              ) : (
                <Box display="flex" flexDirection="column" gap={2}>
                  {projectTasks.map(task => (
                    <Card key={task.id}>
                      <CardActionArea onClick={() => handleTaskSelect(task)}>
                        <CardContent>
                          <Typography variant="h6">{task.task}</Typography>
                          {task.description && (
                            <Typography variant="body2" color="text.secondary">
                              {task.description}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Статус: {task.status === 'new' ? 'Ожидает' : 'В работе'}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Step 3: Select Estimate */}
          {step === 'estimate' && selectedTask && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Задача: <strong>{selectedTask.task}</strong>
              </Alert>
              
              <Typography variant="subtitle2" gutterBottom>
                Выберите смету:
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                {estimates.map(estimate => (
                  <Card key={estimate.id}>
                    <CardActionArea onClick={() => handleEstimateSelect(estimate)}>
                      <CardContent>
                        <Typography variant="h6">
                          Смета №{estimate.number}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {estimate.name || estimate.description}
                        </Typography>
                        <Typography variant="caption" color="primary">
                          Сумма: {(estimate.total || 0).toFixed(2)} ₽
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
                
                {/* Кнопка пропустить */}
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setSelectedEstimate(null);
                    setSelectedService(null);
                    setStep('details');
                  }}
                  sx={{ mt: 1 }}
                >
                  Работать без привязки к смете
                </Button>
              </Box>
            </Box>
          )}

          {/* Step 4: Select Service */}
          {step === 'service' && selectedEstimate && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Смета: <strong>№{selectedEstimate.number}</strong>
              </Alert>
              
              <Typography variant="subtitle2" gutterBottom>
                Выберите услугу/работу:
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={1} sx={{ maxHeight: 300, overflow: 'auto' }}>
                {(selectedEstimate.items || []).map(item => (
                  <Card key={item.id}>
                    <CardActionArea onClick={() => handleServiceSelect(item)}>
                      <CardContent>
                        <Typography variant="body1">
                          {item.name}
                        </Typography>
                        {item.description && (
                          <Typography variant="caption" color="text.secondary">
                            {item.description}
                          </Typography>
                        )}
                        <Typography variant="caption" color="primary">
                          {item.quantity} {item.unit} × {(item.unitPrice || 0)} ₽
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
                
                {/* Кнопка пропустить выбор услуги */}
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setSelectedService(null);
                    setStep('details');
                  }}
                  sx={{ mt: 1 }}
                >
                  Работать без выбора конкретной услуги
                </Button>
              </Box>
            </Box>
          )}

          {/* Step 5: Details */}
          {step === 'details' && selectedProject && selectedTask && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Проект:</strong> {selectedProject.name}
                </Typography>
                <Typography variant="body2">
                  <strong>Задача:</strong> {selectedTask.task}
                </Typography>
                {selectedEstimate && (
                  <Typography variant="body2">
                    <strong>Смета:</strong> №{selectedEstimate.number}
                  </Typography>
                )}
                {selectedService && (
                  <Typography variant="body2">
                    <strong>Услуга:</strong> {selectedService.name}
                  </Typography>
                )}
              </Alert>

              <Box display="flex" flexDirection="column" gap={2}>
                {/* Photo upload */}
                <Button
                  component="label"
                  variant="outlined"
                  fullWidth
                  startIcon={<CameraIcon />}
                  disabled={loading}
                >
                  {photoFile ? `Фото выбрано: ${photoFile.name}` : 'Добавить фото (опционально)'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  />
                </Button>

                {/* Geolocation */}
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<LocationIcon />}
                  onClick={handleGetLocation}
                  disabled={loading}
                  color={geoLocation ? 'success' : 'primary'}
                >
                  {loading ? (
                    <CircularProgress size={20} />
                  ) : geoLocation ? (
                    `Геолокация получена (${geoLocation.coords.latitude.toFixed(4)}, ${geoLocation.coords.longitude.toFixed(4)})`
                  ) : (
                    'Получить геолокацию (опционально)'
                  )}
                </Button>

                <Alert severity="info">
                  После начала работы будет запущен таймер учета времени. 
                  Вы сможете видеть активную сессию на главной странице.
                </Alert>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          {step !== 'project' && (
            <Button onClick={handleBack} disabled={loading}>
              Назад
            </Button>
          )}
          <Button onClick={handleClose} disabled={loading}>
            Отмена
          </Button>
          {step === 'details' && (
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

export default StartWorkButton;
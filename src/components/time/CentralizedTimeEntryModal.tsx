/**
 * CentralizedTimeEntryModal - централизованное модальное окно для управления временем
 * Заменяет все разрозненные модальные окна (StartWorkDialog, TimeValidationDialog и т.д.)
 * Единственное место для начала работы, ручного ввода времени и валидации
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Alert,
  Chip,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  Work as WorkIcon,
  Assignment as TaskIcon,
  Description as EstimateIcon,
  PlayArrow as StartIcon
} from '@mui/icons-material';
import { useAuth } from '../../auth/AuthContext';
import { useTimeTracking, ModalPrefillData } from '../../contexts/TimeTrackingContext';
import { Project, getProjectsStream } from '../../api/projectApi';
import { Task, getTasksStream } from '../../api/taskApi';
import { Estimate, EstimateItem, getEstimatesStream } from '../../legacy/api/estimateApi';

interface CentralizedTimeEntryModalProps {
  open: boolean;
  prefillData?: ModalPrefillData | null;
}

type ModalMode = 'start_work' | 'manual_entry' | 'validation';
type AccountingType = 'task' | 'estimate';

/**
 * Централизованное модальное окно для всех операций с временем
 */
export const CentralizedTimeEntryModal: React.FC<CentralizedTimeEntryModalProps> = ({
  open,
  prefillData
}) => {
  const { currentUser } = useAuth();
  const { 
    startWork,
    closeTimeEntryModal,
    isWorking
  } = useTimeTracking();

  // Состояние модального окна
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Данные для выбора
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);

  // Выбранные элементы
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [accountingType, setAccountingType] = useState<AccountingType>('task');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [selectedService, setSelectedService] = useState<EstimateItem | null>(null);

  // Загрузка данных при открытии модального окна
  useEffect(() => {
    if (!open || !currentUser) return;

    console.log('🎬 Loading data for centralized time entry modal');
    setLoading(true);
    setError(null);

    // Сброс состояния
    setActiveStep(0);
    setSelectedProject(null);
    setSelectedTask(null);
    setSelectedEstimate(null);
    setSelectedService(null);

    // Загрузка проектов
    const unsubProjects = getProjectsStream(currentUser.uid, (projectData) => {
      console.log('📁 Projects loaded for modal:', projectData.length);
      setProjects(projectData);
      setLoading(false);
    });

    // Загрузка задач  
    const unsubTasks = getTasksStream(currentUser.uid, (taskData) => {
      console.log('📝 Tasks loaded for modal:', taskData.length);
      setTasks(taskData);
    });

    // Загрузка смет
    const unsubEstimates = getEstimatesStream(currentUser.uid, '', (estimateData: Estimate[]) => {
      console.log('📊 Estimates loaded for modal:', estimateData.length);
      setEstimates(estimateData);
    });

    return () => {
      unsubProjects();
      unsubTasks();
      unsubEstimates();
    };
  }, [open, currentUser]);

  // Предзаполнение данными если переданы
  useEffect(() => {
    if (!prefillData || !open) return;

    console.log('🎯 Prefilling modal with data:', prefillData);

    // Предзаполнение проекта
    if (prefillData.project) {
      setSelectedProject(prefillData.project);
      setActiveStep(1);
    }

    // Предзаполнение задачи
    if (prefillData.task) {
      setSelectedTask(prefillData.task);
      setAccountingType('task');
      setActiveStep(2);
    }

    // Предзаполнение сметы
    if (prefillData.estimate) {
      setSelectedEstimate(prefillData.estimate);
      setAccountingType('estimate');
      setActiveStep(2);
    }
  }, [prefillData, open]);

  const handleClose = () => {
    setError(null);
    closeTimeEntryModal();
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setActiveStep(1);
  };

  const handleAccountingTypeSelect = (type: AccountingType) => {
    setAccountingType(type);
    setActiveStep(2);
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setActiveStep(3);
  };

  const handleEstimateSelect = (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setActiveStep(3);
  };

  const handleStartWork = async () => {
    if (!selectedProject) {
      setError('Выберите проект');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await startWork({
        project: selectedProject,
        task: accountingType === 'task' ? selectedTask || undefined : undefined,
        estimate: accountingType === 'estimate' ? selectedEstimate || undefined : undefined,
        service: selectedService || undefined
      });
      
      handleClose();
    } catch (error) {
      console.error('Error starting work:', error);
      setError(error instanceof Error ? error.message : 'Ошибка запуска работы');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task => 
    task.projectId === selectedProject?.id &&
    ['new', 'assigned', 'in_progress', 'rework'].includes(task.status || '')
  );

  const filteredEstimates = estimates.filter(estimate => 
    estimate.projectId === selectedProject?.id &&
    estimate.status === 'approved'
  );

  const canStart = selectedProject && (
    (accountingType === 'task' && selectedTask) ||
    (accountingType === 'estimate' && selectedEstimate)
  );

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <WorkIcon color="primary" />
        <Box component="span" sx={{ flex: 1 }}>
          Начать работу
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {isWorking && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            У вас уже есть активная сессия работы. Завершите её перед началом новой.
          </Alert>
        )}

        <Stepper activeStep={activeStep} orientation="vertical">
          {/* Шаг 1: Выбор проекта */}
          <Step>
            <StepLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WorkIcon fontSize="small" />
                Выберите проект
              </Box>
            </StepLabel>
            <StepContent>
              {loading ? (
                <Typography>Загрузка проектов...</Typography>
              ) : (
                <List dense>
                  {projects.map((project) => (
                    <ListItemButton
                      key={project.id}
                      selected={selectedProject?.id === project.id}
                      onClick={() => handleProjectSelect(project)}
                    >
                      <ListItemIcon>
                        <WorkIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={project.name}
                        secondary={project.description}
                      />
                      <Chip 
                        label={project.status === 'active' ? 'Активный' : project.status}
                        size="small"
                        color={project.status === 'active' ? 'success' : 'default'}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </StepContent>
          </Step>

          {/* Шаг 2: Тип учета времени */}
          <Step>
            <StepLabel>Тип учета времени</StepLabel>
            <StepContent>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Button
                  variant={accountingType === 'task' ? 'contained' : 'outlined'}
                  onClick={() => handleAccountingTypeSelect('task')}
                  startIcon={<TaskIcon />}
                >
                  По задачам
                </Button>
                <Button
                  variant={accountingType === 'estimate' ? 'contained' : 'outlined'}
                  onClick={() => handleAccountingTypeSelect('estimate')}
                  startIcon={<EstimateIcon />}
                >
                  По смете
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Шаг 3: Выбор задачи или сметы */}
          <Step>
            <StepLabel>
              {accountingType === 'task' ? 'Выберите задачу' : 'Выберите смету'}
            </StepLabel>
            <StepContent>
              {accountingType === 'task' ? (
                <List dense>
                  {filteredTasks.length === 0 ? (
                    <Typography color="text.secondary">
                      Нет доступных задач для этого проекта
                    </Typography>
                  ) : (
                    filteredTasks.map((task) => (
                      <ListItemButton
                        key={task.id}
                        selected={selectedTask?.id === task.id}
                        onClick={() => handleTaskSelect(task)}
                      >
                        <ListItemIcon>
                          <TaskIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={task.task}
                          secondary={task.description}
                        />
                        <Chip 
                          label={task.status}
                          size="small"
                          color={task.status === 'in_progress' ? 'primary' : 'default'}
                        />
                      </ListItemButton>
                    ))
                  )}
                </List>
              ) : (
                <List dense>
                  {filteredEstimates.length === 0 ? (
                    <Typography color="text.secondary">
                      Нет принятых смет для этого проекта
                    </Typography>
                  ) : (
                    filteredEstimates.map((estimate) => (
                      <ListItemButton
                        key={estimate.id}
                        selected={selectedEstimate?.id === estimate.id}
                        onClick={() => handleEstimateSelect(estimate)}
                      >
                        <ListItemIcon>
                          <EstimateIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={estimate.number}
                          secondary={`Версия ${estimate.version || '1.0'}`}
                        />
                        <Chip 
                          label="Принята"
                          size="small"
                          color="success"
                        />
                      </ListItemButton>
                    ))
                  )}
                </List>
              )}
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Отмена
        </Button>
        <Button
          onClick={handleStartWork}
          variant="contained"
          disabled={!canStart || loading || isWorking}
          startIcon={<StartIcon />}
        >
          {loading ? 'Запуск...' : 'Начать работу'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
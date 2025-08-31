import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, Box, Typography, Card, CardContent, Button, Stack, Alert, Chip,
  IconButton, List, ListItemText, Divider,
  Tab, Tabs, Stepper, Step, StepLabel, StepContent, ListItemButton, Fab,
  Dialog, DialogTitle
} from '@mui/material';
import {
  PlayArrow as PlayIcon, Stop as StopIcon, Pause as PauseIcon,
  Work as WorkIcon, Assignment as TaskIcon,
  ArrowBack as BackIcon, ArrowForward as NextIcon,
  Check as CheckIcon, Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { getTimeEntriesStream, TimeEntry } from '../api/timeEntryApi';
import { Project, getProjectsStream } from '../api/projectApi';
import { getTasksStream, Task } from '../api/taskApi';
import { getEstimatesStream, Estimate, EstimateItem } from '../legacy/api/estimateApi';
import { TimeTrackingButton } from '../components/TimeTrackingButton';
import TimeStatistics from '../components/TimeStatistics';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`time-control-tabpanel-${index}`}
      aria-labelledby={`time-control-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const TimeControlPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    isWorking, currentEntry, elapsedSeconds, stopWork, pauseWork, resumeWork, isPaused
  } = useTimeTracking();

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [selectedWorkProject, setSelectedWorkProject] = useState<Project | null>(null);
  const [accountingType, setAccountingType] = useState<'task' | 'estimate' | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [selectedService, setSelectedService] = useState<EstimateItem | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (currentUser) {
      const unsubscribes = [
        getProjectsStream(currentUser.uid, setProjects),
        getTasksStream(currentUser.uid, setTasks),
        getEstimatesStream(currentUser.uid, '', setEstimates),
        getTimeEntriesStream(currentUser.uid, {}, setTimeEntries)
      ];
      setLoading(false);
      return () => unsubscribes.forEach(unsub => unsub());
    }
  }, [currentUser]);

  const projectTasks = useMemo(() => tasks.filter(task => task.projectId === selectedWorkProject?.id), [tasks, selectedWorkProject]);
  const projectEstimates = useMemo(() => estimates.filter(estimate => estimate.projectId === selectedWorkProject?.id), [estimates, selectedWorkProject]);

  useEffect(() => {
    setSelectedTask(null);
    setSelectedEstimate(null);
    setSelectedService(null);
  }, [selectedWorkProject, accountingType]);

  // Эффект для автоматического пропуска шага выбора услуги
  useEffect(() => {
    if (activeStep === 3 && (accountingType !== 'estimate' || !selectedEstimate?.items || selectedEstimate.items.length === 0)) {
      handleNext();
    }
  }, [activeStep, accountingType, selectedEstimate]);

  const handleResetStepper = () => {
    setStartDialogOpen(false);
    setActiveStep(0);
    setSelectedWorkProject(null);
    setAccountingType(null);
    setSelectedTask(null);
    setSelectedEstimate(null);
    setSelectedService(null);
  };

  const handleNext = () => setActiveStep(prev => prev + 1);
  const handleBack = () => setActiveStep(prev => prev - 1);
  
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderCurrentSession = () => (
    <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">Идет учет времени</Typography>
            <Typography variant="h3" fontWeight="bold">{formatDuration(elapsedSeconds)}</Typography>
            <Stack direction="row" spacing={1} mt={1}>
              <Chip icon={<WorkIcon />} label={currentEntry?.projectName} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              <Chip icon={<TaskIcon />} label={currentEntry?.taskName} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
            </Stack>
          </Box>
          <Stack direction="row" spacing={1}>
            {isPaused ? (
              <Button variant="contained" startIcon={<PlayIcon />} onClick={resumeWork} sx={{ bgcolor: 'white', color: 'primary.main' }}>Продолжить</Button>
            ) : (
              <Button variant="contained" startIcon={<PauseIcon />} onClick={() => pauseWork()} sx={{ bgcolor: 'white', color: 'warning.main' }}>Пауза</Button>
            )}
            <Button variant="contained" startIcon={<StopIcon />} onClick={() => stopWork()} sx={{ bgcolor: 'white', color: 'error.main' }}>Завершить</Button>
          </Stack>
        </Stack>
        {currentEntry && <TimeStatistics entryId={currentEntry.id} />}
      </CardContent>
    </Card>
  );

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Выбор проекта
        return (
          <List>
            {projects.filter(p => p.status === 'active').map(project => (
              <ListItemButton key={project.id} selected={selectedWorkProject?.id === project.id} onClick={() => setSelectedWorkProject(project)}>
                <ListItemText primary={project.name} secondary={project.description} />
                {selectedWorkProject?.id === project.id && <CheckIcon color="primary" />}
              </ListItemButton>
            ))}
          </List>
        );
      case 1: // Выбор типа учета
        return (
          <Stack spacing={2}>
            <Card sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }} onClick={() => { setAccountingType('task'); handleNext(); }}>
              <CardContent>
                <Typography variant="h6">По задаче ({projectTasks.length})</Typography>
                <Typography variant="body2" color="text.secondary">Учет по конкретной задаче</Typography>
              </CardContent>
            </Card>
            <Card sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }} onClick={() => { setAccountingType('estimate'); handleNext(); }}>
              <CardContent>
                <Typography variant="h6">По смете ({projectEstimates.length})</Typography>
                <Typography variant="body2" color="text.secondary">Учет по смете или ее услуге</Typography>
              </CardContent>
            </Card>
          </Stack>
        );
      case 2: // Выбор задачи или сметы
        if (accountingType === 'task') {
          return (
            <List>
              {projectTasks.map(task => (
                <ListItemButton key={task.id} selected={selectedTask?.id === task.id} onClick={() => setSelectedTask(task)}>
                  <ListItemText primary={task.task} secondary={`Приоритет: ${task.priority}`} />
                  {selectedTask?.id === task.id && <CheckIcon color="primary" />}
                </ListItemButton>
              ))}
            </List>
          );
        }
        if (accountingType === 'estimate') {
          return (
            <List>
              {projectEstimates.map(estimate => (
                <ListItemButton key={estimate.id} selected={selectedEstimate?.id === estimate.id} onClick={() => setSelectedEstimate(estimate)}>
                  <ListItemText primary={`№${estimate.number} - ${estimate.name}`} secondary={`Сумма: ${estimate.total} ₽`} />
                  {selectedEstimate?.id === estimate.id && <CheckIcon color="primary" />}
                </ListItemButton>
              ))}
            </List>
          );
        }
        return null;
      case 3: // Выбор услуги (опционально)
        if (accountingType === 'estimate' && selectedEstimate?.items && selectedEstimate.items.length > 0) {
          return (
            <List>
              {selectedEstimate.items.map(item => (
                <ListItemButton key={item.id} selected={selectedService?.id === item.id} onClick={() => setSelectedService(item)}>
                  <ListItemText primary={item.name} secondary={`Итого: ${item.total} ₽`} />
                  {selectedService?.id === item.id && <CheckIcon color="primary" />}
                </ListItemButton>
              ))}
            </List>
          );
        }
        // Если услуг нет, показываем сообщение о пропуске
        return <Typography>Услуги не найдены, шаг пропускается...</Typography>;
      case 4: // Финальный шаг и кнопка старта
        return (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>Готовы начать?</Typography>
            <Typography color="text.secondary" mb={3}>
              Проект: {selectedWorkProject?.name} <br />
              {selectedTask ? `Задача: ${selectedTask.task}` : ''}
              {selectedEstimate ? `Смета: ${selectedEstimate.name}` : ''}
              {selectedService ? ` -> Услуга: ${selectedService.name}` : ''}
            </Typography>
            <TimeTrackingButton
              project={selectedWorkProject}
              task={selectedTask}
              estimate={selectedEstimate}
              service={selectedService}
              onStart={handleResetStepper}
            />
          </Box>
        );
      default:
        return 'Неизвестный шаг';
    }
  };

  const isNextDisabled = () => {
    if (activeStep === 0 && !selectedWorkProject) return true;
    if (activeStep === 1 && !accountingType) return true;
    if (activeStep === 2 && accountingType === 'task' && !selectedTask) return true;
    if (activeStep === 2 && accountingType === 'estimate' && !selectedEstimate) return true;
    return false;
  };
  
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold">Контроль времени</Typography>
        </Stack>

        {isWorking ? renderCurrentSession() : <Alert severity="info">Нет активных сессий. Нажмите кнопку "Старт", чтобы начать учет времени.</Alert>}

        {/* Табы */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', my: 3 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="История" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* Здесь будет история */}
        </TabPanel>
      </Box>

      {!isWorking && (
        <Fab color="primary" aria-label="start work" onClick={() => setStartDialogOpen(true)} sx={{ position: 'fixed', bottom: 80, right: 16 }}>
          <PlayIcon />
        </Fab>
      )}

      <Dialog open={startDialogOpen} onClose={handleResetStepper} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Начать учет времени</Typography>
            <IconButton onClick={handleResetStepper}><CloseIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <Stepper activeStep={activeStep} orientation="vertical" sx={{ p: 3 }}>
          <Step>
            <StepLabel>Шаг 1: Выберите проект</StepLabel>
            <StepContent>{renderStepContent(0)}</StepContent>
          </Step>
          <Step>
            <StepLabel>Шаг 2: Выберите тип</StepLabel>
            <StepContent>{renderStepContent(1)}</StepContent>
          </Step>
          <Step>
            <StepLabel>Шаг 3: {accountingType === 'task' ? 'Выберите задачу' : 'Выберите смету'}</StepLabel>
            <StepContent>{renderStepContent(2)}</StepContent>
          </Step>
          {accountingType === 'estimate' && (
            <Step>
              <StepLabel optional={<Typography variant="caption">Опционально</Typography>}>
                Шаг 4: Выберите услугу
              </StepLabel>
              <StepContent>{renderStepContent(3)}</StepContent>
            </Step>
          )}
          <Step>
            <StepLabel>Шаг {accountingType === 'estimate' ? '5' : '4'}: Старт</StepLabel>
            <StepContent>{renderStepContent(accountingType === 'estimate' ? 4 : 3)}</StepContent>
          </Step>
        </Stepper>
        <Divider />
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button disabled={activeStep === 0} onClick={handleBack} startIcon={<BackIcon />}>Назад</Button>
          <Button variant="contained" onClick={handleNext} endIcon={<NextIcon />} disabled={isNextDisabled()}>Далее</Button>
        </Box>
      </Dialog>
    </Container>
  );
};

export default TimeControlPage;

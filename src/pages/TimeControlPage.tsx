import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, Box, Typography, Card, CardContent, Button, Stack, Alert, Chip,
  IconButton, List, ListItemText, Divider,
  Tab, Tabs, Stepper, Step, StepLabel, StepContent, ListItemButton, Fab,
  Dialog, DialogTitle, useTheme, useMediaQuery, MobileStepper,
  SwipeableDrawer, AppBar, Toolbar, Avatar
} from '@mui/material';
import {
  PlayArrow as PlayIcon, Stop as StopIcon, Pause as PauseIcon,
  Work as WorkIcon, Assignment as TaskIcon,
  ArrowBack as BackIcon, ArrowForward as NextIcon,
  Check as CheckIcon, Close as CloseIcon, KeyboardArrowLeft,
  KeyboardArrowRight
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isVerySmall = useMediaQuery(theme.breakpoints.down(375));

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

  const renderCurrentSession = () => {
    if (isMobile) {
      return (
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent sx={{ p: isVerySmall ? 2 : 3 }}>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant={isVerySmall ? "subtitle1" : "h6"}>Идет учет времени</Typography>
              <Typography variant={isVerySmall ? "h4" : "h3"} fontWeight="bold" sx={{ my: 1 }}>
                {formatDuration(elapsedSeconds)}
              </Typography>
            </Box>
            <Stack direction={isVerySmall ? "column" : "row"} spacing={1} mb={2} justifyContent="center">
              <Chip 
                icon={<WorkIcon fontSize="small" />} 
                label={currentEntry?.projectName} 
                size={isVerySmall ? "small" : "medium"} 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: isVerySmall ? '0.7rem' : '0.8rem' }} 
              />
              <Chip 
                icon={<TaskIcon fontSize="small" />} 
                label={currentEntry?.taskName} 
                size={isVerySmall ? "small" : "medium"} 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: isVerySmall ? '0.7rem' : '0.8rem' }} 
              />
            </Stack>
            <Stack direction={isVerySmall ? "column" : "row"} spacing={1} justifyContent="center">
              {isPaused ? (
                <Button 
                  variant="contained" 
                  startIcon={<PlayIcon />} 
                  onClick={resumeWork} 
                  sx={{ bgcolor: 'white', color: 'primary.main', minHeight: 44, fontSize: isVerySmall ? '0.8rem' : '0.9rem' }}
                  fullWidth={isVerySmall}
                >
                  Продолжить
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  startIcon={<PauseIcon />} 
                  onClick={() => pauseWork()} 
                  sx={{ bgcolor: 'white', color: 'warning.main', minHeight: 44, fontSize: isVerySmall ? '0.8rem' : '0.9rem' }}
                  fullWidth={isVerySmall}
                >
                  Пауза
                </Button>
              )}
              <Button 
                variant="contained" 
                startIcon={<StopIcon />} 
                onClick={() => stopWork()} 
                sx={{ bgcolor: 'white', color: 'error.main', minHeight: 44, fontSize: isVerySmall ? '0.8rem' : '0.9rem' }}
                fullWidth={isVerySmall}
              >
                Завершить
              </Button>
            </Stack>
            {currentEntry && (
              <Box sx={{ mt: 2 }}>
                <TimeStatistics entryId={currentEntry.id} />
              </Box>
            )}
          </CardContent>
        </Card>
      );
    }
    
    return (
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
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Выбор проекта
        return (
          <List>
            {projects.filter(p => p.status === 'active').map(project => (
              <ListItemButton 
                key={project.id} 
                selected={selectedWorkProject?.id === project.id} 
                onClick={() => setSelectedWorkProject(project)}
                sx={{ 
                  minHeight: isMobile ? 64 : 56,
                  py: isMobile ? 2 : 1,
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
                  <WorkIcon fontSize="small" />
                </Avatar>
                <ListItemText 
                  primary={
                    <Typography 
                      variant={isMobile ? "body1" : "subtitle1"} 
                      sx={{ fontWeight: selectedWorkProject?.id === project.id ? 600 : 400 }}
                    >
                      {project.name}
                    </Typography>
                  } 
                  secondary={
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {project.description}
                    </Typography>
                  } 
                />
                {selectedWorkProject?.id === project.id && (
                  <CheckIcon color="primary" sx={{ ml: 1 }} />
                )}
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
                <ListItemButton 
                  key={task.id} 
                  selected={selectedTask?.id === task.id} 
                  onClick={() => setSelectedTask(task)}
                  sx={{ 
                    minHeight: isMobile ? 64 : 56,
                    py: isMobile ? 2 : 1,
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <Avatar sx={{ mr: 2, bgcolor: 'secondary.main', width: 32, height: 32 }}>
                    <TaskIcon fontSize="small" />
                  </Avatar>
                  <ListItemText 
                    primary={
                      <Typography 
                        variant={isMobile ? "body1" : "subtitle1"}
                        sx={{ 
                          fontWeight: selectedTask?.id === task.id ? 600 : 400,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {task.task}
                      </Typography>
                    } 
                    secondary={
                      <Chip 
                        label={`Приоритет: ${task.priority}`} 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          height: 20, 
                          fontSize: '0.7rem',
                          mt: 0.5
                        }}
                      />
                    } 
                  />
                  {selectedTask?.id === task.id && (
                    <CheckIcon color="primary" sx={{ ml: 1 }} />
                  )}
                </ListItemButton>
              ))}
            </List>
          );
        }
        if (accountingType === 'estimate') {
          return (
            <List>
              {projectEstimates.map(estimate => (
                <ListItemButton 
                  key={estimate.id} 
                  selected={selectedEstimate?.id === estimate.id} 
                  onClick={() => setSelectedEstimate(estimate)}
                  sx={{ 
                    minHeight: isMobile ? 64 : 56,
                    py: isMobile ? 2 : 1,
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <Avatar sx={{ mr: 2, bgcolor: 'info.main', width: 32, height: 32 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                      №{estimate.number}
                    </Typography>
                  </Avatar>
                  <ListItemText 
                    primary={
                      <Typography 
                        variant={isMobile ? "body1" : "subtitle1"}
                        sx={{ 
                          fontWeight: selectedEstimate?.id === estimate.id ? 600 : 400,
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {estimate.name}
                      </Typography>
                    } 
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Сумма: {estimate.total} ₽
                      </Typography>
                    } 
                  />
                  {selectedEstimate?.id === estimate.id && (
                    <CheckIcon color="primary" sx={{ ml: 1 }} />
                  )}
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
                <ListItemButton 
                  key={item.id} 
                  selected={selectedService?.id === item.id} 
                  onClick={() => setSelectedService(item)}
                  sx={{ 
                    minHeight: isMobile ? 64 : 56,
                    py: isMobile ? 2 : 1,
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <Avatar sx={{ mr: 2, bgcolor: 'success.main', width: 32, height: 32 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.6rem' }}>
                      Усл
                    </Typography>
                  </Avatar>
                  <ListItemText 
                    primary={
                      <Typography 
                        variant={isMobile ? "body1" : "subtitle1"}
                        sx={{ 
                          fontWeight: selectedService?.id === item.id ? 600 : 400,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {item.name}
                      </Typography>
                    } 
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Итого: {item.total} ₽
                      </Typography>
                    } 
                  />
                  {selectedService?.id === item.id && (
                    <CheckIcon color="primary" sx={{ ml: 1 }} />
                  )}
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
  
  const MobileStepContent = ({ step }: { step: number }) => {
    const content = renderStepContent(step);
    
    return (
      <Box sx={{ p: 2, minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', fontWeight: 600 }}>
          {step === 0 && 'Выберите проект'}
          {step === 1 && 'Выберите тип учета'}
          {step === 2 && (accountingType === 'task' ? 'Выберите задачу' : 'Выберите смету')}
          {step === 3 && 'Выберите услугу'}
          {step === 4 && 'Готовы начать?'}
        </Typography>
        
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {content}
        </Box>
      </Box>
    );
  };
  
  const MobileTimeStartDialog = () => (
    <SwipeableDrawer
      anchor="bottom"
      open={startDialogOpen}
      onClose={handleResetStepper}
      onOpen={() => setStartDialogOpen(true)}
      PaperProps={{
        sx: {
          height: '85vh',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }
      }}
    >
      <AppBar 
        position="static" 
        color="default" 
        elevation={0}
        sx={{ 
          borderTopLeftRadius: 16, 
          borderTopRightRadius: 16,
          bgcolor: 'background.paper'
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 600 }}>
            Начать учет времени
          </Typography>
          <IconButton 
            onClick={handleResetStepper}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <MobileStepContent step={activeStep} />
        
        <Box sx={{ p: 2, bgcolor: 'background.default' }}>
          <Stack spacing={2}>
            <MobileStepper
              variant="progress"
              steps={accountingType === 'estimate' ? 5 : 4}
              position="static"
              activeStep={activeStep}
              sx={{
                flexGrow: 1,
                bgcolor: 'transparent',
                '& .MuiMobileStepper-progress': {
                  width: '100%',
                }
              }}
              nextButton={
                <Button 
                  size="small" 
                  onClick={handleNext} 
                  disabled={isNextDisabled()}
                  sx={{ minWidth: 44, minHeight: 44 }}
                >
                  Далее
                  <KeyboardArrowRight />
                </Button>
              }
              backButton={
                <Button 
                  size="small" 
                  onClick={handleBack} 
                  disabled={activeStep === 0}
                  sx={{ minWidth: 44, minHeight: 44 }}
                >
                  <KeyboardArrowLeft />
                  Назад
                </Button>
              }
            />
            
            {activeStep === (accountingType === 'estimate' ? 4 : 3) && (
              <Box sx={{ textAlign: 'center', p: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Проект: {selectedWorkProject?.name}
                  {selectedTask && (
                    <><br />Задача: {selectedTask.task}</>
                  )}
                  {selectedEstimate && (
                    <><br />Смета: {selectedEstimate.name}</>
                  )}
                  {selectedService && (
                    <><br />Услуга: {selectedService.name}</>
                  )}
                </Typography>
                <TimeTrackingButton
                  project={selectedWorkProject}
                  task={selectedTask}
                  estimate={selectedEstimate}
                  service={selectedService}
                  onStart={handleResetStepper}
                />
              </Box>
            )}
          </Stack>
        </Box>
      </Box>
    </SwipeableDrawer>
  );

  return (
    <Container maxWidth={isMobile ? false : "xl"} disableGutters={isMobile}>
      <Box sx={{ py: isMobile ? 2 : 3, px: isMobile ? 2 : 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant={isMobile ? (isVerySmall ? "h5" : "h4") : "h4"} fontWeight="bold">
            Контроль времени
          </Typography>
        </Stack>

        {isWorking ? renderCurrentSession() : (
          <Alert 
            severity="info" 
            sx={{ 
              mb: 3,
              '& .MuiAlert-message': {
                fontSize: isMobile ? '0.9rem' : '1rem'
              }
            }}
          >
            Нет активных сессий. Нажмите кнопку "Старт", чтобы начать учет времени.
          </Alert>
        )}

        {/* Табы */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', my: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, v) => setTabValue(v)}
            variant={isMobile ? "fullWidth" : "standard"}
          >
            <Tab 
              label="История" 
              sx={{ 
                minHeight: isMobile ? 44 : 48,
                fontSize: isMobile ? '0.9rem' : '1rem'
              }} 
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* Здесь будет история */}
          <Typography color="text.secondary" align="center">
            История временных записей будет здесь
          </Typography>
        </TabPanel>
      </Box>

      {!isWorking && (
        <Fab 
          color="primary" 
          aria-label="start work" 
          onClick={() => setStartDialogOpen(true)} 
          sx={{ 
            position: 'fixed', 
            bottom: isMobile ? 80 : 16, 
            right: 16,
            width: isMobile ? 56 : 64,
            height: isMobile ? 56 : 64
          }}
        >
          <PlayIcon sx={{ fontSize: isMobile ? '1.5rem' : '2rem' }} />
        </Fab>
      )}

      {/* Мобильный диалог */}
      {isMobile ? (
        <MobileTimeStartDialog />
      ) : (

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
      )}
    </Container>
  );
};

export default TimeControlPage;

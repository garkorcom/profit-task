import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  LinearProgress,
  Tab,
  Tabs,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  ListItemButton,
  Fab,
  CircularProgress,
  AlertTitle
} from '@mui/material';
import {
  Timer as TimerIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  Assessment as ReportIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Work as WorkIcon,
  Assignment as TaskIcon,
  Description as EstimateIcon,
  Build as ServiceIcon,
  LocationOn as LocationIcon,
  CameraAlt as CameraIcon,
  Schedule as ScheduleIcon,
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  Person as PersonIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  SkipNext as SkipIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { 
  getTimeEntriesStream, 
  TimeEntry,
  deleteTimeEntry,
  updateTimeEntry
} from '../api/timeEntryApi';
import { getProjectsStream, Project } from '../api/projectApi';
import { getTasksStream, Task } from '../api/taskApi';
import { getEstimatesStream, Estimate } from '../api/estimateApi';
import { useFirebaseValidation } from '../utils/firebaseConverters';
// import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isThisWeek, isThisMonth } from 'date-fns';

// Временные функции для работы с датами
const format = (date: Date, formatString: string): string => {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  if (formatString === 'dd.MM.yyyy HH:mm') {
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }
  return `${year}-${month}-${day}`;
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
};

const isThisWeek = (date: Date, options?: any): boolean => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const d = new Date(date);
  return d >= weekStart && d < weekEnd;
};

const isThisMonth = (date: Date): boolean => {
  const now = new Date();
  const d = new Date(date);
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

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
    isWorking, 
    currentSession, 
    elapsedSeconds, 
    startWork, 
    stopWork, 
    pauseWork, 
    resumeWork, 
    isPaused 
  } = useTimeTracking();

  const [tabValue, setTabValue] = useState(0);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedEstimate, setSelectedEstimate] = useState<string>('all');
  
  // Состояния для диалога старта работы
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedWorkProject, setSelectedWorkProject] = useState<Project | null>(null);
  const [selectedWorkTask, setSelectedWorkTask] = useState<Task | null>(null);
  const [selectedWorkEstimate, setSelectedWorkEstimate] = useState<Estimate | null>(null);
  const [selectedWorkService, setSelectedWorkService] = useState<any>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [geoLocation, setGeoLocation] = useState<GeolocationPosition | null>(null);
  const [startingWork, setStartingWork] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [accountingType, setAccountingType] = useState<'task' | 'estimate' | null>(null);
  
  // Хук валидации
  const { validateTimeEntry } = useFirebaseValidation();
  
  // Фильтруем задачи и сметы для выбранного проекта
  const projectTasks = tasks.filter(t => t.projectId === selectedWorkProject?.id);
  const projectEstimates = estimates.filter(e => e.projectId === selectedWorkProject?.id);

  // Статистика
  const [stats, setStats] = useState({
    todayHours: 0,
    weekHours: 0,
    monthHours: 0,
    totalHours: 0,
    activeProjects: 0,
    completedTasks: 0,
    totalEarned: 0
  });

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribes: (() => void)[] = [];

    // Загрузка всех данных
    const loadData = async () => {
      setLoading(true);

      // Загрузка записей времени
      unsubscribes.push(
        getTimeEntriesStream(currentUser.uid, {}, (entries) => {
          setTimeEntries(entries);
          calculateStats(entries);
        })
      );

      // Загрузка проектов
      unsubscribes.push(
        getProjectsStream(currentUser.uid, (projectsList) => {
          setProjects(projectsList);
        })
      );

      // Загрузка задач
      unsubscribes.push(
        getTasksStream(currentUser.uid, (tasksList) => {
          setTasks(tasksList);
        })
      );

      // Загрузка смет
      unsubscribes.push(
        getEstimatesStream(currentUser.uid, '', (estimatesList) => {
          setEstimates(estimatesList);
        })
      );

      setLoading(false);
    };

    loadData();

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [currentUser]);

  const calculateStats = (entries: TimeEntry[]) => {
    const now = new Date();
    let todayHours = 0;
    let weekHours = 0;
    let monthHours = 0;
    let totalHours = 0;

    entries.forEach(entry => {
      const duration = entry.duration || 0;
      totalHours += duration;

      const entryDate = entry.startTime?.toDate ? entry.startTime.toDate() : new Date(entry.startTime);
      
      if (isToday(entryDate)) {
        todayHours += duration;
      }
      if (isThisWeek(entryDate, { weekStartsOn: 1 })) {
        weekHours += duration;
      }
      if (isThisMonth(entryDate)) {
        monthHours += duration;
      }
    });

    // Конвертация минут в часы
    setStats({
      todayHours: todayHours / 60,
      weekHours: weekHours / 60,
      monthHours: monthHours / 60,
      totalHours: totalHours / 60,
      activeProjects: projects.filter(p => p.status === 'active').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      totalEarned: (totalHours / 60) * 1000 // Примерная ставка 1000₽/час
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return 'Без проекта';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Неизвестный проект';
  };

  const getTaskName = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    return task?.task || 'Неизвестная задача';
  };

  const getEstimateName = (estimateId?: string) => {
    if (!estimateId) return '-';
    const estimate = estimates.find(e => e.id === estimateId);
    return estimate ? `№${estimate.number}` : '-';
  };

  const getFilteredEntries = () => {
    let filtered = [...timeEntries];

    // Фильтр по периоду
    if (selectedPeriod !== 'all') {
      const now = new Date();
      filtered = filtered.filter(entry => {
        const entryDate = entry.startTime?.toDate ? entry.startTime.toDate() : new Date(entry.startTime);
        
        switch (selectedPeriod) {
          case 'today':
            return isToday(entryDate);
          case 'week':
            return isThisWeek(entryDate, { weekStartsOn: 1 });
          case 'month':
            return isThisMonth(entryDate);
          default:
            return true;
        }
      });
    }

    // Фильтр по проекту
    if (selectedProject !== 'all') {
      filtered = filtered.filter(entry => entry.projectId === selectedProject);
    }

    // Фильтр по смете
    if (selectedEstimate !== 'all') {
      filtered = filtered.filter(entry => entry.estimateId === selectedEstimate);
    }

    // Сортировка по дате (новые сверху)
    filtered.sort((a, b) => {
      const dateA = a.startTime?.toDate ? a.startTime.toDate() : new Date(a.startTime);
      const dateB = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime);
      return dateB.getTime() - dateA.getTime();
    });

    return filtered;
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!currentUser || !window.confirm('Удалить запись времени?')) return;
    
    try {
      await deleteTimeEntry(currentUser.uid, entryId);
    } catch (error) {
      console.error('Error deleting time entry:', error);
    }
  };

  const handleStartWork = async () => {
    if (!selectedWorkProject || !currentUser) {
      setValidationErrors(['Выберите проект']);
      return;
    }
    
    // Нужна либо задача, либо смета
    if (!selectedWorkTask && !selectedWorkEstimate) {
      setValidationErrors(['Выберите задачу или смету']);
      return;
    }

    // Создаем объект для валидации
    const taskId = selectedWorkTask?.id || `estimate-${selectedWorkEstimate?.id}`;
    const taskName = selectedWorkTask?.task || 
                    selectedWorkService?.name || 
                    selectedWorkEstimate?.name || 
                    'Работа по смете';
    
    const estimateName = selectedWorkEstimate ? 
      `${selectedWorkEstimate.name || `Смета №${selectedWorkEstimate.number}`}` : 
      undefined;
    
    // Валидируем данные перед отправкой
    const entryToValidate = {
      taskId,
      taskName,
      employeeId: currentUser?.uid || '',
      employeeName: currentUser?.displayName || currentUser?.email || '',
      status: 'active' as const,
      projectId: selectedWorkProject?.id || '',
      projectName: selectedWorkProject?.name || '',
      estimateId: selectedWorkEstimate?.id,
      estimateName,
      serviceId: selectedWorkService?.id,
      serviceName: selectedWorkService?.name
    };
    
    const errors = validateTimeEntry(entryToValidate);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors([]);
    setStartingWork(true);
    
    try {
      await startWork(
        taskId,
        photoFile || undefined,
        geoLocation || undefined,
        selectedWorkEstimate?.id,
        estimateName,
        selectedWorkService?.id,
        selectedWorkService?.name
      );
      
      setStartDialogOpen(false);
      resetStartDialog();
    } catch (error) {
      console.error('Error starting work:', error);
      setValidationErrors([`Ошибка: ${(error as Error).message}`]);
    } finally {
      setStartingWork(false);
    }
  };

  const resetStartDialog = () => {
    setActiveStep(0);
    setSelectedWorkProject(null);
    setSelectedWorkTask(null);
    setSelectedWorkEstimate(null);
    setSelectedWorkService(null);
    setPhotoFile(null);
    setGeoLocation(null);
    setAccountingType(null);
    setValidationErrors([]);
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedWorkProject) return;
    
    // После выбора проекта
    if (activeStep === 0) {
      // Проверяем доступные варианты
      if (projectTasks.length === 0 && projectEstimates.length === 0) {
        // Нет ни задач, ни смет - показываем шаг с предложением создать
        setActiveStep(1);
      } else if (projectTasks.length > 0 && projectEstimates.length === 0) {
        // Есть только задачи - пропускаем выбор типа и идем сразу к задачам
        setAccountingType('task');
        setActiveStep(2);
      } else if (projectTasks.length === 0 && projectEstimates.length > 0) {
        // Есть только сметы - пропускаем выбор типа и идем сразу к сметам
        setAccountingType('estimate');
        setActiveStep(3);
      } else {
        // Есть и задачи, и сметы - показываем выбор типа
        setActiveStep(1);
      }
    }
    // На шаге выбора типа работы
    else if (activeStep === 1) {
      // Переход на соответствующий шаг
      setActiveStep(prev => prev + 1);
    } else if (activeStep === 2) {
      // После выбора задачи или сметы
      if (selectedWorkTask && !selectedWorkEstimate) {
        // Если выбрана только задача, переходим к деталям
        setActiveStep(5);
      } else if (!selectedWorkTask && selectedWorkEstimate) {
        // Если выбрана только смета, переходим к выбору услуги
        setActiveStep(4);
      } else if (selectedWorkTask && selectedWorkEstimate) {
        // Если выбраны оба, переходим к выбору услуги
        setActiveStep(4);
      }
    } else if (activeStep === 3 && !selectedWorkEstimate) {
      setActiveStep(5);
    } else if (activeStep === 4 && !selectedWorkService) {
      setActiveStep(5);
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep === 4 && !selectedWorkEstimate) {
      setActiveStep(1);
    } else {
      setActiveStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (activeStep === 2) {
      setSelectedWorkEstimate(null);
      setSelectedWorkService(null);
      setActiveStep(4);
    } else if (activeStep === 3) {
      setSelectedWorkService(null);
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
        }
      );
    }
  };

  const handleExport = () => {
    const entries = getFilteredEntries();
    const csvContent = [
      ['Дата', 'Проект', 'Задача', 'Смета', 'Услуга', 'Длительность', 'Статус'],
      ...entries.map(entry => [
        format(entry.startTime?.toDate ? entry.startTime.toDate() : new Date(entry.startTime), 'dd.MM.yyyy HH:mm'),
        getProjectName(entry.projectId),
        getTaskName(entry.taskId),
        getEstimateName(entry.estimateId),
        entry.serviceName || '-',
        formatMinutes(entry.duration || 0),
        entry.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `time-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold">
            <TimerIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
            Контроль времени
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
            >
              Обновить
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              Экспорт
            </Button>
          </Stack>
        </Stack>

        {/* Текущая сессия */}
        {isWorking && currentSession && (
          <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ color: 'white' }}>
                  <Typography variant="h6" gutterBottom>
                    Идет учет времени
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {formatDuration(elapsedSeconds)}
                  </Typography>
                  <Stack direction="row" spacing={2} mt={2}>
                    <Chip
                      icon={<WorkIcon />}
                      label={currentSession.projectName}
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                    <Chip
                      icon={<TaskIcon />}
                      label={currentSession.taskName}
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                    {currentSession.estimateName && (
                      <Chip
                        icon={<EstimateIcon />}
                        label={currentSession.estimateName}
                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                      />
                    )}
                    {currentSession.serviceName && (
                      <Chip
                        icon={<ServiceIcon />}
                        label={currentSession.serviceName}
                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                      />
                    )}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={2}>
                  {isPaused ? (
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<PlayIcon />}
                      onClick={resumeWork}
                      sx={{ bgcolor: 'white', color: 'primary.main' }}
                    >
                      Продолжить
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<PauseIcon />}
                      onClick={() => pauseWork()}
                      sx={{ bgcolor: 'white', color: 'warning.main' }}
                    >
                      Пауза
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<StopIcon />}
                    onClick={() => stopWork()}
                    sx={{ bgcolor: 'white', color: 'error.main' }}
                  >
                    Завершить
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Статистика */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
          <Box>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Сегодня
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.todayHours.toFixed(1)}ч
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.light' }}>
                    <TodayIcon />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Box>
          
          <Box>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Эта неделя
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.weekHours.toFixed(1)}ч
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.light' }}>
                    <DateRangeIcon />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Box>
          
          <Box>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Этот месяц
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.monthHours.toFixed(1)}ч
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'warning.light' }}>
                    <ScheduleIcon />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Box>
          
          <Box>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Заработано
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {stats.totalEarned.toFixed(0)}₽
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'error.light' }}>
                    <ReportIcon />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Табы */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="История" />
            <Tab label="Проекты" />
            <Tab label="Сметы" />
            <Tab label="Аналитика" />
          </Tabs>
        </Box>

        {/* История */}
        <TabPanel value={tabValue} index={0}>
          <Stack direction="row" spacing={2} mb={3}>
            <TextField
              select
              size="small"
              label="Период"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="today">Сегодня</MenuItem>
              <MenuItem value="week">Эта неделя</MenuItem>
              <MenuItem value="month">Этот месяц</MenuItem>
              <MenuItem value="all">Все время</MenuItem>
            </TextField>
            
            <TextField
              select
              size="small"
              label="Проект"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">Все проекты</MenuItem>
              {projects.map(project => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              select
              size="small"
              label="Смета"
              value={selectedEstimate}
              onChange={(e) => setSelectedEstimate(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">Все сметы</MenuItem>
              {estimates.map(estimate => (
                <MenuItem key={estimate.id} value={estimate.id}>
                  №{estimate.number} - {estimate.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Дата/Время</TableCell>
                  <TableCell>Проект</TableCell>
                  <TableCell>Задача</TableCell>
                  <TableCell>Смета</TableCell>
                  <TableCell>Услуга</TableCell>
                  <TableCell>Длительность</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredEntries().map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {format(
                        entry.startTime?.toDate ? entry.startTime.toDate() : new Date(entry.startTime),
                        'dd.MM.yyyy HH:mm'
                      )}
                    </TableCell>
                    <TableCell>{getProjectName(entry.projectId)}</TableCell>
                    <TableCell>{getTaskName(entry.taskId)}</TableCell>
                    <TableCell>
                      {entry.estimateId && (
                        <Chip 
                          size="small" 
                          label={getEstimateName(entry.estimateId)}
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>{entry.serviceName || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        label={formatMinutes(entry.duration || 0)}
                        color="success"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={entry.status}
                        color={entry.status === 'completed' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteEntry(entry.id!)}
                      >
                        <StopIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Проекты */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
            {projects.map(project => {
              const projectEntries = timeEntries.filter(e => e.projectId === project.id);
              const projectHours = projectEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
              const projectTasks = tasks.filter(t => t.projectId === project.id);
              
              return (
                <Card key={project.id}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {project.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {project.description}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Отработано:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {projectHours.toFixed(1)} часов
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Задач:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {projectTasks.length}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Статус:</Typography>
                          <Chip 
                            size="small" 
                            label={project.status}
                            color={project.status === 'active' ? 'success' : 'default'}
                          />
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
              );
            })}
          </Box>
        </TabPanel>

        {/* Сметы */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
            {estimates.map(estimate => {
              const estimateEntries = timeEntries.filter(e => e.estimateId === estimate.id);
              const estimateHours = estimateEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
              
              return (
                <Card key={estimate.id}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                          Смета №{estimate.number}
                        </Typography>
                        <Chip 
                          label={estimate.status}
                          color={estimate.status === 'approved' ? 'success' : 'default'}
                          size="small"
                        />
                      </Stack>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {estimate.name || estimate.description}
                      </Typography>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Проект:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {getProjectName(estimate.projectId)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Отработано:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {estimateHours.toFixed(1)} часов
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Сумма:</Typography>
                          <Typography variant="body2" fontWeight="bold" color="primary">
                            {(estimate.total || 0).toFixed(0)} ₽
                          </Typography>
                        </Stack>
                        
                        {estimate.items && estimate.items.length > 0 && (
                          <>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" fontWeight="bold">
                              Услуги:
                            </Typography>
                            <List dense>
                              {estimate.items.slice(0, 3).map(item => {
                                const serviceEntries = estimateEntries.filter(e => e.serviceId === item.id);
                                const serviceHours = serviceEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
                                
                                return (
                                  <ListItem key={item.id}>
                                    <ListItemText 
                                      primary={item.name}
                                      secondary={`${serviceHours.toFixed(1)}ч из ${item.quantity} ${item.unit}`}
                                    />
                                  </ListItem>
                                );
                              })}
                            </List>
                            {estimate.items.length > 3 && (
                              <Typography variant="caption" color="text.secondary">
                                и еще {estimate.items.length - 3} услуг...
                              </Typography>
                            )}
                          </>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
              );
            })}
          </Box>
        </TabPanel>

        {/* Аналитика */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Топ проекты по времени
                  </Typography>
                  <List>
                    {projects
                      .map(project => ({
                        ...project,
                        hours: timeEntries
                          .filter(e => e.projectId === project.id)
                          .reduce((sum, e) => sum + (e.duration || 0), 0) / 60
                      }))
                      .sort((a, b) => b.hours - a.hours)
                      .slice(0, 5)
                      .map((project, index) => (
                        <ListItem key={project.id}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: `primary.${index === 0 ? 'dark' : 'light'}` }}>
                              {index + 1}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={project.name}
                            secondary={`${project.hours.toFixed(1)} часов`}
                          />
                          <LinearProgress 
                            variant="determinate" 
                            value={(project.hours / stats.totalHours) * 100}
                            sx={{ width: 100 }}
                          />
                        </ListItem>
                      ))}
                  </List>
                </CardContent>
              </Card>
            </Box>

            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Топ задачи по времени
                  </Typography>
                  <List>
                    {tasks
                      .map(task => ({
                        ...task,
                        hours: timeEntries
                          .filter(e => e.taskId === task.id)
                          .reduce((sum, e) => sum + (e.duration || 0), 0) / 60
                      }))
                      .sort((a, b) => b.hours - a.hours)
                      .slice(0, 5)
                      .map((task, index) => (
                        <ListItem key={task.id}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: `success.${index === 0 ? 'dark' : 'light'}` }}>
                              {index + 1}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={task.task}
                            secondary={`${task.hours.toFixed(1)} часов`}
                          />
                        </ListItem>
                      ))}
                  </List>
                </CardContent>
              </Card>
            </Box>

            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Распределение по статусам
                  </Typography>
                  <Stack spacing={2} mt={3}>
                    {['completed', 'active', 'paused'].map(status => {
                      const statusEntries = timeEntries.filter(e => e.status === status);
                      const statusHours = statusEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
                      const percentage = stats.totalHours > 0 ? (statusHours / stats.totalHours) * 100 : 0;
                      
                      return (
                        <Box key={status}>
                          <Stack direction="row" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">
                              {status === 'completed' ? 'Завершено' : 
                               status === 'active' ? 'Активно' : 'На паузе'}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {statusHours.toFixed(1)}ч ({percentage.toFixed(0)}%)
                            </Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={percentage}
                            color={status === 'completed' ? 'success' : status === 'active' ? 'primary' : 'warning'}
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </TabPanel>
      </Box>

      {/* Плавающая кнопка для начала работы */}
      {!isWorking && (
        <Fab
          color="primary"
          aria-label="start work"
          onClick={() => setStartDialogOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: 1000
          }}
        >
          <PlayIcon />
        </Fab>
      )}

      {/* Диалог начала работы */}
      <Dialog
        open={startDialogOpen}
        onClose={() => setStartDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Начать учет времени</Typography>
            <IconButton onClick={() => setStartDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          {/* Показываем ошибки валидации */}
          {validationErrors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setValidationErrors([])}>
              <AlertTitle>Ошибки валидации</AlertTitle>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}
          
          <Stepper activeStep={activeStep} orientation="vertical" sx={{ mt: 2 }}>
            {/* Step 0: Выбор проекта */}
            <Step>
              <StepLabel>Выберите проект</StepLabel>
              <StepContent>
                <List sx={{ width: '100%' }}>
                  {projects.filter(p => p.status === 'active').map(project => (
                    <ListItemButton
                      key={project.id}
                      selected={selectedWorkProject?.id === project.id}
                      onClick={() => {
                        setSelectedWorkProject(project);
                        setSelectedWorkTask(null);
                        setSelectedWorkEstimate(null);
                        setSelectedWorkService(null);
                      }}
                      sx={{
                        borderRadius: 2,
                        mb: 1,
                        border: selectedWorkProject?.id === project.id ? 2 : 0,
                        borderColor: 'primary.main'
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                          <WorkIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={project.name}
                        secondary={project.description}
                      />
                      {selectedWorkProject?.id === project.id && (
                        <CheckIcon color="primary" />
                      )}
                    </ListItemButton>
                  ))}
                </List>
                {selectedWorkProject && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      endIcon={<NextIcon />}
                    >
                      Далее
                    </Button>
                  </Box>
                )}
              </StepContent>
            </Step>

            {/* Step 1: Выбор типа работы */}
            <Step>
              <StepLabel>Выберите тип учета</StepLabel>
              <StepContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Проект: <strong>{selectedWorkProject?.name}</strong>
                  {projectTasks.length > 0 && projectEstimates.length === 0 && (
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Автоматически выбран учет по задачам (сметы отсутствуют)
                      </Typography>
                    </Box>
                  )}
                  {projectTasks.length === 0 && projectEstimates.length > 0 && (
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Автоматически выбран учет по сметам (задачи отсутствуют)
                      </Typography>
                    </Box>
                  )}
                </Alert>
                
                <Stack spacing={2}>
                  <Card 
                    sx={{ 
                      cursor: projectTasks.length > 0 ? 'pointer' : 'default',
                      border: 2,
                      borderColor: 'transparent',
                      opacity: projectTasks.length === 0 ? 0.6 : 1,
                      '&:hover': projectTasks.length > 0 ? { borderColor: 'primary.main' } : {}
                    }}
                    onClick={() => projectTasks.length > 0 && setActiveStep(2)}
                  >
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <TaskIcon />
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="h6">По задаче</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Учет времени по конкретной задаче проекта
                          </Typography>
                        </Box>
                        {projectTasks.length > 0 ? (
                          <Chip 
                            label={`${projectTasks.length} ${projectTasks.length === 1 ? 'задача' : projectTasks.length < 5 ? 'задачи' : 'задач'}`}
                            color="primary"
                            size="small"
                          />
                        ) : (
                          <Chip 
                            label="Нет задач"
                            color="default"
                            size="small"
                          />
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    sx={{ 
                      cursor: projectEstimates.length > 0 ? 'pointer' : 'default',
                      border: 2,
                      borderColor: 'transparent',
                      opacity: projectEstimates.length === 0 ? 0.6 : 1,
                      '&:hover': projectEstimates.length > 0 ? { borderColor: 'success.main' } : {}
                    }}
                    onClick={() => projectEstimates.length > 0 && setActiveStep(3)}
                  >
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'success.main' }}>
                          <EstimateIcon />
                        </Avatar>
                        <Box flex={1}>
                          <Typography variant="h6">По смете</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Учет времени по смете и услугам
                          </Typography>
                        </Box>
                        {projectEstimates.length > 0 ? (
                          <Chip 
                            label={`${projectEstimates.length} ${projectEstimates.length === 1 ? 'смета' : projectEstimates.length < 5 ? 'сметы' : 'смет'}`}
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip 
                            label="Нет смет"
                            color="default"
                            size="small"
                          />
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Stack>
                
                {/* Предложение создать, если нет данных */}
                {projectTasks.length === 0 && projectEstimates.length === 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <AlertTitle>Нет доступных задач или смет</AlertTitle>
                    Для проекта "{selectedWorkProject?.name}" еще не созданы задачи или сметы.
                    <Box sx={{ mt: 1 }}>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => {
                          setStartDialogOpen(false);
                          // Переход на страницу задач
                          window.location.href = '/tasks';
                        }}
                      >
                        Создать задачу
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        sx={{ ml: 1 }}
                        onClick={() => {
                          setStartDialogOpen(false);
                          // Переход на страницу смет
                          window.location.href = '/mobile/estimate';
                        }}
                      >
                        Создать смету
                      </Button>
                    </Box>
                  </Alert>
                )}
                
                <Box sx={{ mt: 2 }}>
                  <Button onClick={handleBack} startIcon={<BackIcon />}>
                    Назад
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 2: Выбор задачи */}
            <Step>
              <StepLabel>Выберите задачу</StepLabel>
              <StepContent>
                {selectedWorkProject && (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Проект: <strong>{selectedWorkProject.name}</strong>
                    </Alert>
                    
                    <List sx={{ width: '100%' }}>
                      {tasks
                        .filter(t => t.projectId === selectedWorkProject.id && t.status !== 'completed')
                        .map(task => (
                          <ListItemButton
                            key={task.id}
                            selected={selectedWorkTask?.id === task.id}
                            onClick={() => setSelectedWorkTask(task)}
                            sx={{
                              borderRadius: 2,
                              mb: 1,
                              border: selectedWorkTask?.id === task.id ? 2 : 0,
                              borderColor: 'primary.main'
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'secondary.light' }}>
                                <TaskIcon />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={task.task}
                              secondary={
                                <Stack direction="row" spacing={1}>
                                  <Chip
                                    label={task.status || 'new'}
                                    size="small"
                                    color={task.status === 'in_progress' ? 'warning' : 'default'}
                                  />
                                  <Typography variant="caption">
                                    Приоритет: {task.priority}
                                  </Typography>
                                </Stack>
                              }
                            />
                            {selectedWorkTask?.id === task.id && (
                              <CheckIcon color="primary" />
                            )}
                          </ListItemButton>
                        ))}
                    </List>

                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Button onClick={() => setActiveStep(1)} startIcon={<BackIcon />}>
                        Назад
                      </Button>
                      {selectedWorkTask && (
                        <Button
                          variant="contained"
                          onClick={() => setActiveStep(5)}
                          endIcon={<NextIcon />}
                        >
                          Далее к деталям
                        </Button>
                      )}
                    </Stack>
                  </Box>
                )}
              </StepContent>
            </Step>

            {/* Step 3: Выбор сметы */}
            <Step>
              <StepLabel>
                Выберите смету
              </StepLabel>
              <StepContent>
                {selectedWorkProject && (
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Проект: <strong>{selectedWorkProject.name}</strong>
                    </Alert>

                    {estimates.filter(e => e.projectId === selectedWorkProject?.id || !e.projectId).length === 0 ? (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        Нет доступных смет для этого проекта
                      </Alert>
                    ) : (
                      <List sx={{ width: '100%' }}>
                        {estimates
                          .filter(e => e.projectId === selectedWorkProject?.id || !e.projectId)
                          .map(estimate => (
                            <ListItemButton
                              key={estimate.id}
                              selected={selectedWorkEstimate?.id === estimate.id}
                              onClick={() => {
                                setSelectedWorkEstimate(estimate);
                                setSelectedWorkTask(null); // Сбрасываем задачу при выборе сметы
                              }}
                              sx={{
                                borderRadius: 2,
                                mb: 1,
                                border: selectedWorkEstimate?.id === estimate.id ? 2 : 0,
                                borderColor: 'primary.main'
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'success.light' }}>
                                  <EstimateIcon />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={`Смета №${estimate.number}`}
                                secondary={
                                  <Box component="span">
                                    <Box component="span" display="block">
                                      {estimate.name || estimate.description}
                                    </Box>
                                    <Box component="span" display="block" color="primary.main">
                                      Сумма: {(estimate.total || 0).toFixed(2)} ₽
                                    </Box>
                                  </Box>
                                }
                              />
                              {selectedWorkEstimate?.id === estimate.id && (
                                <CheckIcon color="primary" />
                              )}
                            </ListItemButton>
                          ))}
                      </List>
                    )}

                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Button onClick={() => setActiveStep(1)} startIcon={<BackIcon />}>
                        Назад
                      </Button>
                      {selectedWorkEstimate && (
                        <Button
                          variant="contained"
                          onClick={() => setActiveStep(4)}
                          endIcon={<NextIcon />}
                        >
                          Выбрать услугу
                        </Button>
                      )}
                    </Stack>
                  </Box>
                )}
              </StepContent>
            </Step>

            {/* Step 4: Выбор услуги (опционально) */}
            <Step>
              <StepLabel optional={<Typography variant="caption">Опционально</Typography>}>
                Выберите услугу
              </StepLabel>
              <StepContent>
                {selectedWorkEstimate && (
                  <Box>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      Смета: <strong>№{selectedWorkEstimate.number}</strong>
                    </Alert>

                    <List sx={{ width: '100%' }}>
                      {selectedWorkEstimate.items?.map(item => (
                        <ListItemButton
                          key={item.id}
                          selected={selectedWorkService?.id === item.id}
                          onClick={() => setSelectedWorkService(item)}
                          sx={{
                            borderRadius: 2,
                            mb: 1,
                            border: selectedWorkService?.id === item.id ? 2 : 0,
                            borderColor: 'primary.main'
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'warning.light' }}>
                              <ServiceIcon />
                            </Avatar>
                          </ListItemAvatar>
                                                        <ListItemText
                                primary={item.name}
                                secondary={
                                  <Box component="span">
                                    <Box component="span" display="block">
                                      {item.quantity} {item.unit} × {(item.unitPrice || 0)} ₽
                                    </Box>
                                    <Box component="span" display="block" color="primary.main">
                                      Итого: {(item.total || 0).toFixed(2)} ₽
                                    </Box>
                                  </Box>
                                }
                          />
                          {selectedWorkService?.id === item.id && (
                            <CheckIcon color="primary" />
                          )}
                        </ListItemButton>
                      ))}
                    </List>

                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Button onClick={() => setActiveStep(3)} startIcon={<BackIcon />}>
                        Назад
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => setActiveStep(5)}
                        endIcon={<NextIcon />}
                      >
                        {selectedWorkService ? 'Далее к деталям' : 'Пропустить выбор услуги'}
                      </Button>
                    </Stack>
                  </Box>
                )}
              </StepContent>
            </Step>

            {/* Step 5: Детали */}
            <Step>
              <StepLabel>Детали работы</StepLabel>
              <StepContent>
                <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
                  <Stack spacing={2}>
                    <Alert severity="success">
                      <strong>Готово к началу работы!</strong>
                    </Alert>

                    <Divider />

                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Проект:</Typography>
                      <Typography variant="body1">{selectedWorkProject?.name}</Typography>
                    </Box>

                    {selectedWorkTask && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Задача:</Typography>
                        <Typography variant="body1">{selectedWorkTask.task}</Typography>
                      </Box>
                    )}

                    {selectedWorkEstimate && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Смета:</Typography>
                        <Typography variant="body1">
                          №{selectedWorkEstimate.number} - {selectedWorkEstimate.name}
                        </Typography>
                      </Box>
                    )}

                    {selectedWorkService && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Услуга:</Typography>
                        <Typography variant="body1">{selectedWorkService.name}</Typography>
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

                <Stack direction="row" spacing={2}>
                  <Button 
                    onClick={() => {
                      // Возвращаемся к соответствующему шагу
                      if (selectedWorkTask) {
                        setActiveStep(2);
                      } else if (selectedWorkEstimate) {
                        setActiveStep(4);
                      } else {
                        setActiveStep(1);
                      }
                    }} 
                    startIcon={<BackIcon />}
                  >
                    Назад
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleStartWork}
                    startIcon={startingWork ? <CircularProgress size={20} color="inherit" /> : <PlayIcon />}
                    disabled={!selectedWorkProject || (!selectedWorkTask && !selectedWorkEstimate) || startingWork}
                  >
                    {startingWork ? 'Начинаем...' : 'Начать работу'}
                  </Button>
                </Stack>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default TimeControlPage;

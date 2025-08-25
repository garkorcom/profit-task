import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
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
  Badge
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
  Person as PersonIcon
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
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isThisWeek, isThisMonth } from 'date-fns';

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
                      onClick={pauseWork}
                      sx={{ bgcolor: 'white', color: 'warning.main' }}
                    >
                      Пауза
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<StopIcon />}
                    onClick={stopWork}
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
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={3}>
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
          </Grid>
          
          <Grid item xs={12} md={3}>
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
          </Grid>
          
          <Grid item xs={12} md={3}>
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
          </Grid>
          
          <Grid item xs={12} md={3}>
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
          </Grid>
        </Grid>

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
          <Grid container spacing={3}>
            {projects.map(project => {
              const projectEntries = timeEntries.filter(e => e.projectId === project.id);
              const projectHours = projectEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
              const projectTasks = tasks.filter(t => t.projectId === project.id);
              
              return (
                <Grid item xs={12} md={6} key={project.id}>
                  <Card>
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
                </Grid>
              );
            })}
          </Grid>
        </TabPanel>

        {/* Сметы */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {estimates.map(estimate => {
              const estimateEntries = timeEntries.filter(e => e.estimateId === estimate.id);
              const estimateHours = estimateEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
              
              return (
                <Grid item xs={12} md={6} key={estimate.id}>
                  <Card>
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
                </Grid>
              );
            })}
          </Grid>
        </TabPanel>

        {/* Аналитика */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
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
            </Grid>

            <Grid item xs={12} md={4}>
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
            </Grid>

            <Grid item xs={12} md={4}>
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
            </Grid>
          </Grid>
        </TabPanel>
      </Box>
    </Container>
  );
};

export default TimeControlPage;

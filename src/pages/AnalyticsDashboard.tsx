import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  GridLegacy as Grid,
  Card,
  CardContent,
  CardHeader,
  Paper,
  LinearProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Button,
  ButtonGroup,
  Divider,
  Alert,
  AlertTitle,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assignment as TaskIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  CheckCircle as CompletedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CameraAlt as PhotoIcon,
  Speed as SpeedIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { 
  getProjectAnalyticsForAI,
  getEmployeePerformanceForAI,
  generateAIRecommendations,
  ProjectAnalytics,
  EmployeePerformance,
  AIRecommendation
} from '../api/aiApi';
import { getProjectsStream, Project } from '../api/projectApi';
import { getTasksStream, Task, TaskStatus } from '../api/taskApi';
import { getTimeEntriesStream, TimeEntry } from '../api/timeEntryApi';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Компонент для отображения метрики
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'primary'
}) => {
  const theme = useTheme();
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={`${color}.main`}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
            {trend && trendValue && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend === 'up' ? (
                  <TrendingUpIcon color="success" fontSize="small" />
                ) : trend === 'down' ? (
                  <TrendingDownIcon color="error" fontSize="small" />
                ) : null}
                <Typography
                  variant="caption"
                  color={trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'textSecondary'}
                  sx={{ ml: 0.5 }}
                >
                  {trendValue}
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: alpha(theme.palette[color].main, 0.1),
              color: `${color}.main`
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

// Компонент прогресс-бара для проекта
interface ProjectProgressProps {
  project: Project;
  analytics?: ProjectAnalytics;
}

const ProjectProgress: React.FC<ProjectProgressProps> = ({ project, analytics }) => {
  const progress = analytics 
    ? (analytics.completedTasks / analytics.totalTasks) * 100 
    : 0;
  
  const getProgressColor = () => {
    if (progress >= 75) return 'success';
    if (progress >= 50) return 'primary';
    if (progress >= 25) return 'warning';
    return 'error';
  };
  
  return (
    <Box mb={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle2">{project.name}</Typography>
        <Typography variant="caption" color="textSecondary">
          {analytics ? `${analytics.completedTasks}/${analytics.totalTasks}` : '0/0'}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        color={getProgressColor()}
        sx={{ height: 8, borderRadius: 1 }}
      />
      <Box display="flex" justifyContent="space-between" mt={0.5}>
        <Typography variant="caption" color="textSecondary">
          {progress.toFixed(0)}% завершено
        </Typography>
        {analytics && analytics.delayedTasks > 0 && (
          <Chip
            label={`${analytics.delayedTasks} просрочено`}
            size="small"
            color="error"
            variant="outlined"
          />
        )}
      </Box>
    </Box>
  );
};

const AnalyticsDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('month');
  
  // Данные
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projectAnalytics, setProjectAnalytics] = useState<Record<string, ProjectAnalytics>>({});
  const [employeePerformance, setEmployeePerformance] = useState<EmployeePerformance[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  
  // Загрузка данных
  useEffect(() => {
    if (!currentUser) return;
    
    const loadData = async () => {
      setLoading(true);
      
      // Подписка на проекты
      const unsubProjects = getProjectsStream(currentUser.uid, (data) => {
        setProjects(data);
        // Загружаем аналитику для каждого проекта
        data.forEach(async (project) => {
          try {
            const analytics = await getProjectAnalyticsForAI(currentUser.uid, project.id);
            setProjectAnalytics(prev => ({
              ...prev,
              [project.id]: analytics
            }));
          } catch (error) {
            console.error('Error loading project analytics:', error);
          }
        });
      });
      
      // Подписка на задачи
      const unsubTasks = getTasksStream(currentUser.uid, setTasks);
      
      // Подписка на TimeEntries
      const unsubTimeEntries = getTimeEntriesStream(
        currentUser.uid,
        {},
        setTimeEntries
      );
      
      // Загрузка производительности сотрудников
      try {
        const performance = await getEmployeePerformanceForAI(currentUser.uid);
        setEmployeePerformance(performance);
        
        // Генерация рекомендаций
        const recs = await generateAIRecommendations(currentUser.uid);
        setRecommendations(recs);
      } catch (error) {
        console.error('Error loading analytics:', error);
      }
      
      setLoading(false);
      
      return () => {
        unsubProjects();
        unsubTasks();
        unsubTimeEntries();
      };
    };
    
    loadData();
  }, [currentUser]);
  
  const handleRefresh = async () => {
    if (!currentUser) return;
    setRefreshing(true);
    
    try {
      const performance = await getEmployeePerformanceForAI(currentUser.uid);
      setEmployeePerformance(performance);
      
      const recs = await generateAIRecommendations(currentUser.uid);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
    
    setRefreshing(false);
  };
  
  // Расчет метрик
  const calculateMetrics = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const overdueTasks = tasks.filter(t => {
      if (!t.deadline || t.status === 'completed') return false;
      const deadline = t.deadline.toDate ? t.deadline.toDate() : new Date(t.deadline);
      return deadline < new Date();
    }).length;
    
    const totalTimeSpent = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const averageTaskTime = completedTasks > 0 ? totalTimeSpent / completedTasks : 0;
    
    const tasksWithPhoto = tasks.filter(t => t.requirePhoto).length;
    const tasksWithCompletePhoto = tasks.filter(t => {
      if (!t.requirePhoto) return false;
      return t.photoSessions && t.photoSessions.length > 0;
    }).length;
    const photoComplianceRate = tasksWithPhoto > 0 
      ? (tasksWithCompletePhoto / tasksWithPhoto) * 100 
      : 100;
    
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      totalTimeSpent,
      averageTaskTime,
      photoComplianceRate,
      completionRate
    };
  };
  
  const metrics = calculateMetrics();
  
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}ч ${mins}м`;
    }
    return `${mins}м`;
  };
  
  const getPriorityColor = (priority: AIRecommendation['priority']) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'success';
    }
  };
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <Box>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Аналитика и отчеты
        </Typography>
        <Box display="flex" gap={2}>
          <ButtonGroup size="small">
            <Button
              variant={timeRange === 'day' ? 'contained' : 'outlined'}
              onClick={() => setTimeRange('day')}
            >
              День
            </Button>
            <Button
              variant={timeRange === 'week' ? 'contained' : 'outlined'}
              onClick={() => setTimeRange('week')}
            >
              Неделя
            </Button>
            <Button
              variant={timeRange === 'month' ? 'contained' : 'outlined'}
              onClick={() => setTimeRange('month')}
            >
              Месяц
            </Button>
            <Button
              variant={timeRange === 'all' ? 'contained' : 'outlined'}
              onClick={() => setTimeRange('all')}
            >
              Все время
            </Button>
          </ButtonGroup>
          <Button
            startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Обновить
          </Button>
          <Button
            startIcon={<ExportIcon />}
            variant="outlined"
          >
            Экспорт
          </Button>
        </Box>
      </Box>
      
      {/* Основные метрики */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Всего задач"
            value={metrics.totalTasks}
            subtitle={`${metrics.inProgressTasks} в работе`}
            icon={<TaskIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Выполнено"
            value={metrics.completedTasks}
            subtitle={`${metrics.completionRate.toFixed(0)}% от общего`}
            icon={<CompletedIcon />}
            color="success"
            trend="up"
            trendValue="+12% за неделю"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Просрочено"
            value={metrics.overdueTasks}
            subtitle="Требуют внимания"
            icon={<WarningIcon />}
            color={metrics.overdueTasks > 0 ? 'error' : 'success'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Фотофиксация"
            value={`${metrics.photoComplianceRate.toFixed(0)}%`}
            subtitle="Соответствие требованиям"
            icon={<PhotoIcon />}
            color={metrics.photoComplianceRate >= 80 ? 'success' : 'warning'}
          />
        </Grid>
      </Grid>
      
      <Grid container spacing={3}>
        {/* Прогресс проектов */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Прогресс проектов"
              action={
                <IconButton size="small">
                  <CalendarIcon />
                </IconButton>
              }
            />
            <CardContent>
              {projects.length === 0 ? (
                <Typography color="textSecondary" align="center">
                  Нет активных проектов
                </Typography>
              ) : (
                projects.map(project => (
                  <ProjectProgress
                    key={project.id}
                    project={project}
                    analytics={projectAnalytics[project.id]}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Производительность сотрудников */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Производительность сотрудников"
              action={
                <IconButton size="small">
                  <PeopleIcon />
                </IconButton>
              }
            />
            <CardContent>
              {employeePerformance.length === 0 ? (
                <Typography color="textSecondary" align="center">
                  Нет данных о сотрудниках
                </Typography>
              ) : (
                <List dense>
                  {employeePerformance.slice(0, 5).map((employee) => (
                    <ListItem key={employee.employeeId}>
                      <ListItemAvatar>
                        <Avatar>
                          <PeopleIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={employee.employeeName}
                        secondary={
                          <Box>
                            <Typography variant="caption" component="div">
                              Выполнено: {employee.completedTasks}/{employee.totalTasks} задач
                            </Typography>
                            <Box display="flex" gap={1} mt={0.5}>
                              <Chip
                                label={`КПД: ${(employee.efficiency * 100).toFixed(0)}%`}
                                size="small"
                                color={employee.efficiency >= 0.8 ? 'success' : 'warning'}
                                variant="outlined"
                              />
                              {employee.photoComplianceRate < 1 && (
                                <Chip
                                  label={`Фото: ${(employee.photoComplianceRate * 100).toFixed(0)}%`}
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Временные затраты */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Временные затраты"
              action={
                <IconButton size="small">
                  <TimeIcon />
                </IconButton>
              }
            />
            <CardContent>
              <Box mb={2}>
                <Typography variant="h3" color="primary">
                  {formatDuration(metrics.totalTimeSpent)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Общее время работы
                </Typography>
              </Box>
              <Divider />
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Среднее время на задачу
                </Typography>
                <Typography variant="h5" color="secondary">
                  {formatDuration(metrics.averageTaskTime)}
                </Typography>
              </Box>
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Эффективность
                </Typography>
                <Box display="flex" alignItems="center">
                  <SpeedIcon color="action" sx={{ mr: 1 }} />
                  <LinearProgress
                    variant="determinate"
                    value={75}
                    sx={{ flex: 1, mr: 2 }}
                  />
                  <Typography variant="body2">75%</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Рекомендации ИИ */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Рекомендации системы"
              subheader="На основе анализа данных"
            />
            <CardContent>
              {recommendations.length === 0 ? (
                <Alert severity="success">
                  <AlertTitle>Все в порядке!</AlertTitle>
                  Критических проблем не обнаружено
                </Alert>
              ) : (
                <List dense>
                  {recommendations.slice(0, 5).map((rec, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ 
                            bgcolor: alpha(
                              theme.palette[getPriorityColor(rec.priority)].main, 
                              0.1
                            ) 
                          }}>
                            {rec.type === 'risk' ? <ErrorIcon color="error" /> :
                             rec.type === 'optimization' ? <TrendingUpIcon color="info" /> :
                             rec.type === 'quality' ? <WarningIcon color="warning" /> :
                             <TaskIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={rec.title}
                          secondary={
                            <Box>
                              <Typography variant="caption" component="div">
                                {rec.description}
                              </Typography>
                              {rec.suggestedActions && rec.suggestedActions.length > 0 && (
                                <Box mt={0.5}>
                                  <Typography variant="caption" color="primary">
                                    Рекомендации: {rec.suggestedActions[0]}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          }
                        />
                        <Chip
                          label={rec.priority}
                          size="small"
                          color={getPriorityColor(rec.priority)}
                          variant="outlined"
                        />
                      </ListItem>
                      {index < recommendations.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;

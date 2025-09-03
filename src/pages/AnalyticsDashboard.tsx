import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
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
  useMediaQuery,
  alpha,
  Tabs,
  Tab,
  Fab,
  Collapse
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
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
import { getTasksStream, Task } from '../api/taskApi';
import { getTimeEntriesStream, TimeEntry } from '../api/timeEntryUnified';
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Card sx={{ 
      height: '100%',
      minHeight: isMobile ? 120 : 140
    }}>
      <CardContent sx={{ p: isMobile ? 2 : 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1 }}>
            <Typography 
              color="textSecondary" 
              gutterBottom 
              variant={isMobile ? "caption" : "body2"}
              sx={{ fontWeight: 500 }}
            >
              {title}
            </Typography>
            <Typography 
              variant={isMobile ? "h5" : "h4"} 
              component="div" 
              color={`${color}.main`}
              sx={{ fontWeight: 600, lineHeight: 1.2 }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography 
                variant={isMobile ? "caption" : "body2"} 
                color="textSecondary" 
                sx={{ 
                  mt: 0.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {subtitle}
              </Typography>
            )}
            {trend && trendValue && (
              <Box display="flex" alignItems="center" mt={0.5}>
                {trend === 'up' ? (
                  <TrendingUpIcon color="success" fontSize={isMobile ? "small" : "small"} />
                ) : trend === 'down' ? (
                  <TrendingDownIcon color="error" fontSize={isMobile ? "small" : "small"} />
                ) : null}
                <Typography
                  variant="caption"
                  color={trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'textSecondary'}
                  sx={{ ml: 0.5, fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                >
                  {trendValue}
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: alpha(theme.palette[color].main, 0.1),
              color: `${color}.main`,
              width: isMobile ? 40 : 48,
              height: isMobile ? 40 : 48,
              ml: 1
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
    <Box mb={isMobile ? 2.5 : 2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography 
          variant={isMobile ? "body2" : "subtitle2"}
          sx={{ 
            fontWeight: 500,
            maxWidth: '70%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {project.name}
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500 }}>
          {analytics ? `${analytics.completedTasks}/${analytics.totalTasks}` : '0/0'}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        color={getProgressColor()}
        sx={{ 
          height: isMobile ? 6 : 8, 
          borderRadius: 1,
          bgcolor: alpha(theme.palette.grey[500], 0.12)
        }}
      />
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center"
        mt={0.5}
        sx={{
          flexDirection: isMobile && analytics?.delayedTasks ? 'column' : 'row',
          alignItems: isMobile && analytics?.delayedTasks ? 'flex-start' : 'center',
          gap: isMobile ? 0.5 : 0
        }}
      >
        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 500 }}>
          {progress.toFixed(0)}% завершено
        </Typography>
        {analytics && analytics.delayedTasks > 0 && (
          <Chip
            label={`${analytics.delayedTasks} просрочено`}
            size="small"
            color="error"
            variant="outlined"
            sx={{
              height: isMobile ? 20 : 24,
              fontSize: isMobile ? '0.65rem' : '0.75rem'
            }}
          />
        )}
      </Box>
    </Box>
  );
};

const AnalyticsDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isVerySmall = useMediaQuery(theme.breakpoints.down(375));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('month');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    metrics: true,
    projects: false,
    performance: false,
    time: false,
    recommendations: false
  });
  
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
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const MobileTimeRangePicker = () => (
    <Tabs
      value={timeRange}
      onChange={(e, newValue) => setTimeRange(newValue)}
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        '& .MuiTab-root': {
          minHeight: 40,
          minWidth: isMobile ? 70 : 90,
          fontSize: '0.8rem',
          textTransform: 'none'
        }
      }}
    >
      <Tab label="День" value="day" />
      <Tab label="Неделя" value="week" />
      <Tab label="Месяц" value="month" />
      <Tab label="Все" value="all" />
    </Tabs>
  );

  const MobileSection = ({ title, children, sectionKey }: {
    title: string;
    children: React.ReactNode;
    sectionKey: string;
  }) => (
    <Card sx={{ mb: 2 }}>
      <CardHeader
        title={
          <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        }
        action={
          <IconButton 
            size="small" 
            onClick={() => toggleSection(sectionKey)}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            {expandedSections[sectionKey] ? 
              <TrendingUpIcon sx={{ transform: 'rotate(-90deg)' }} /> : 
              <TrendingDownIcon sx={{ transform: 'rotate(-90deg)' }} />
            }
          </IconButton>
        }
        sx={{ pb: 1 }}
      />
      <Collapse in={expandedSections[sectionKey]}>
        <CardContent sx={{ pt: 0 }}>
          {children}
        </CardContent>
      </Collapse>
    </Card>
  );

  if (loading) return <LoadingSpinner />;
  
  if (isMobile) {
    return (
      <Box sx={{ pb: 10 }}>
        {/* Мобильный заголовок */}
        <Box sx={{ mb: 2 }}>
          <Typography variant={isVerySmall ? "h5" : "h4"} sx={{ mb: 1, fontWeight: 600 }}>
            Аналитика
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Button
              size="small"
              startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{ minHeight: 44 }}
            >
              Обновить
            </Button>
            <Button
              size="small"
              startIcon={<ExportIcon />}
              variant="outlined"
              sx={{ minHeight: 44 }}
            >
              Экспорт
            </Button>
          </Box>
          <MobileTimeRangePicker />
        </Box>

        {/* Мобильные метрики */}
        <MobileSection title="Основные метрики" sectionKey="metrics">
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <MetricCard
                title="Задачи"
                value={metrics.totalTasks}
                subtitle={`${metrics.inProgressTasks} в работе`}
                icon={<TaskIcon />}
                color="primary"
              />
            </Grid>
            <Grid item xs={6}>
              <MetricCard
                title="Выполнено"
                value={metrics.completedTasks}
                subtitle={`${metrics.completionRate.toFixed(0)}%`}
                icon={<CompletedIcon />}
                color="success"
                trend="up"
                trendValue="+12%"
              />
            </Grid>
            <Grid item xs={6}>
              <MetricCard
                title="Просрочено"
                value={metrics.overdueTasks}
                subtitle="Требуют внимания"
                icon={<WarningIcon />}
                color={metrics.overdueTasks > 0 ? 'error' : 'success'}
              />
            </Grid>
            <Grid item xs={6}>
              <MetricCard
                title="Фотофиксация"
                value={`${metrics.photoComplianceRate.toFixed(0)}%`}
                subtitle="Соответствие"
                icon={<PhotoIcon />}
                color={metrics.photoComplianceRate >= 80 ? 'success' : 'warning'}
              />
            </Grid>
          </Grid>
        </MobileSection>

        {/* Прогресс проектов */}
        <MobileSection title="Прогресс проектов" sectionKey="projects">
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
        </MobileSection>

        {/* Производительность сотрудников */}
        <MobileSection title="Производительность" sectionKey="performance">
          {employeePerformance.length === 0 ? (
            <Typography color="textSecondary" align="center">
              Нет данных о сотрудниках
            </Typography>
          ) : (
            <List dense>
              {employeePerformance.slice(0, 5).map((employee) => (
                <ListItem key={employee.employeeId} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ width: 40, height: 40 }}>
                      <PeopleIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={employee.employeeName}
                    secondary={
                      <Box>
                        <Typography variant="caption" component="div">
                          Выполнено: {employee.completedTasks}/{employee.totalTasks}
                        </Typography>
                        <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                          <Chip
                            label={`${(employee.efficiency * 100).toFixed(0)}%`}
                            size="small"
                            color={employee.efficiency >= 0.8 ? 'success' : 'warning'}
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                          {employee.photoComplianceRate < 1 && (
                            <Chip
                              label={`Фото: ${(employee.photoComplianceRate * 100).toFixed(0)}%`}
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ fontSize: '0.65rem', height: 20 }}
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
        </MobileSection>

        {/* Временные затраты */}
        <MobileSection title="Время работы" sectionKey="time">
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
              {formatDuration(metrics.totalTimeSpent)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Общее время работы
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="secondary" sx={{ fontWeight: 600 }}>
                {formatDuration(metrics.averageTaskTime)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Среднее время
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                75%
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Эффективность
              </Typography>
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={75}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </MobileSection>

        {/* Рекомендации ИИ */}
        <MobileSection title="Рекомендации" sectionKey="recommendations">
          {recommendations.length === 0 ? (
            <Alert severity="success">
              <AlertTitle>Все в порядке!</AlertTitle>
              Критических проблем не обнаружено
            </Alert>
          ) : (
            <List dense>
              {recommendations.slice(0, 3).map((rec, index) => (
                <React.Fragment key={index}>
                  <ListItem sx={{ px: 0, flexDirection: 'column', alignItems: 'stretch' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', mb: 1 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: alpha(
                            theme.palette[getPriorityColor(rec.priority)].main, 
                            0.1
                          ),
                          width: 32,
                          height: 32,
                          mr: 1.5
                        }}
                      >
                        {rec.type === 'risk' ? <ErrorIcon fontSize="small" color="error" /> :
                         rec.type === 'optimization' ? <TrendingUpIcon fontSize="small" color="info" /> :
                         rec.type === 'quality' ? <WarningIcon fontSize="small" color="warning" /> :
                         <TaskIcon fontSize="small" />}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                          {rec.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, lineHeight: 1.4 }}>
                          {rec.description}
                        </Typography>
                      </Box>
                      <Chip
                        label={rec.priority}
                        size="small"
                        color={getPriorityColor(rec.priority)}
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    </Box>
                    {rec.suggestedActions && rec.suggestedActions.length > 0 && (
                      <Box sx={{ ml: 5, mt: 1 }}>
                        <Typography variant="caption" color="primary" sx={{ fontStyle: 'italic' }}>
                          💡 {rec.suggestedActions[0]}
                        </Typography>
                      </Box>
                    )}
                  </ListItem>
                  {index < recommendations.slice(0, 3).length - 1 && <Divider sx={{ my: 1 }} />}
                </React.Fragment>
              ))}
            </List>
          )}
        </MobileSection>

        {/* Плавающая кнопка действий */}
        <Fab
          color="primary"
          aria-label="refresh"
          onClick={handleRefresh}
          disabled={refreshing}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: 1000
          }}
        >
          {refreshing ? <CircularProgress size={24} color="inherit" /> : <RefreshIcon />}
        </Fab>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: isMobile ? 10 : 2 }}>
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

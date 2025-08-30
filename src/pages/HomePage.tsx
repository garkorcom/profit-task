import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Container, Stack, IconButton, Chip,
  Paper, useTheme, useMediaQuery, Avatar, List, ListItem,
  ListItemText, ListItemAvatar, Card, CardContent, Fab, 
  Zoom, Fade, Grow, LinearProgress, Badge, Tooltip
} from '@mui/material';
import {
  PlayCircleOutline as StartWorkIcon,
  AddTask as NewTaskIcon,
  CreateNewFolder as NewProjectIcon,
  PostAdd as NewEstimateIcon,
  Folder as ProjectIcon,
  Assignment as TaskIcon,
  AccessTime as ClockIcon,
  Stop as StopIcon,
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Speed as SpeedIcon,
  AutoGraph as ChartIcon,
  WorkHistory as WorkIcon,
  EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { Project, getProjectsStream } from '../api/projectApi';
import { Task, getTasksStream } from '../api/taskApi';
import { TimeEntry, getTimeEntriesStream } from '../api/timeEntryApi';
import StartWorkDialog from '../components/StartWorkDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';

const HomePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isWorking, currentEntry, elapsedSeconds, stopWork } = useTimeTracking();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [startWorkOpen, setStartWorkOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const unsubProjects = getProjectsStream(currentUser.uid, setProjects);
    const unsubTasks = getTasksStream(currentUser.uid, setTasks);
    const unsubTime = getTimeEntriesStream(currentUser.uid, {}, (entries) => {
      setTimeEntries(entries);
      setLoading(false);
    });
    return () => {
      unsubProjects();
      unsubTasks();
      unsubTime();
    };
  }, [currentUser]);

  const stats = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekEntries = timeEntries.filter(e => (e.startTime.toDate ? e.startTime.toDate() : new Date(e.startTime)) > weekAgo);
    const weekHours = weekEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthEntries = timeEntries.filter(e => (e.startTime.toDate ? e.startTime.toDate() : new Date(e.startTime)) > monthAgo);
    const monthHours = monthEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
    
    return {
      activeProjects: projects.filter(p => p.status === 'active').length,
      totalProjects: projects.length,
      pendingTasks: tasks.filter(t => t.status === 'new' || t.status === 'assigned').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      totalTasks: tasks.length,
      weekHours: weekHours.toFixed(1),
      monthHours: monthHours.toFixed(1),
      weekEarned: (weekHours * 1200).toFixed(0),
      productivity: Math.min(100, Math.round((weekHours / 40) * 100))
    };
  }, [projects, tasks, timeEntries]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}ч ${m}м ${s}с`;
    if (m > 0) return `${m}м ${s}с`;
    return `${s}с`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return '🌙 Доброй ночи';
    if (hour < 12) return '☀️ Доброе утро';
    if (hour < 18) return '🌤️ Добрый день';
    return '🌆 Добрый вечер';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)',
        pb: 4 
      }}>
        {/* Header Hero Section */}
        <Box sx={{ 
          background: 'linear-gradient(135deg, #2e7d32 0%, #43a047 100%)', 
          color: 'white',
          pt: 4,
          pb: 8,
          mb: -4,
          borderRadius: '0 0 50px 50px',
          boxShadow: '0 10px 40px rgba(46, 125, 50, 0.3)'
        }}>
          <Container maxWidth="lg">
            <Fade in timeout={1000}>
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                  <Box>
                    <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" gutterBottom>
                      {getGreeting()}, {currentUser?.displayName || 'Пользователь'}!
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      {new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Уведомления">
                      <IconButton sx={{ color: 'white' }}>
                        <Badge badgeContent={3} color="error">
                          <NotificationsIcon />
                        </Badge>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Профиль">
                      <IconButton sx={{ color: 'white' }} onClick={() => navigate('/profile')}>
                        <PersonIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>

                {/* Work Timer Card */}
                {isWorking ? (
                  <Zoom in>
                    <Paper sx={{ 
                      p: 3, 
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 3,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                    }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="h6" color="success.main" fontWeight="bold">
                            <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            В работе
                          </Typography>
                          <Typography variant="h5" color="text.primary" fontWeight="bold" mt={1}>
                            {currentEntry?.taskName}
                          </Typography>
                          <Chip 
                            label={currentEntry?.projectName || 'Без проекта'} 
                            size="small" 
                            sx={{ mt: 1, backgroundColor: 'success.light', color: 'white' }}
                          />
                        </Box>
                        <Box textAlign="center">
                          <Typography variant="h2" color="success.main" fontWeight="bold">
                            {formatTime(elapsedSeconds)}
                          </Typography>
                          <Button 
                            variant="contained" 
                            color="error" 
                            startIcon={<StopIcon />} 
                            onClick={() => stopWork()}
                            size="large"
                            sx={{ mt: 2, borderRadius: 3 }}
                          >
                            Завершить
                          </Button>
                        </Box>
                      </Stack>
                      <LinearProgress 
                        variant="indeterminate" 
                        sx={{ mt: 2, borderRadius: 2, height: 6 }}
                        color="success"
                      />
                    </Paper>
                  </Zoom>
                ) : (
                  <Grow in>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<StartWorkIcon />}
                      onClick={() => setStartWorkOpen(true)}
                      sx={{
                        background: 'white',
                        color: 'success.main',
                        py: 2,
                        px: 4,
                        borderRadius: 3,
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                          background: 'white'
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Начать работу
                    </Button>
                  </Grow>
                )}
              </Box>
            </Fade>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ mt: 2 }}>
          {/* Statistics Cards */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: 'repeat(2, 1fr)', 
              md: 'repeat(4, 1fr)' 
            }, 
            gap: 3, 
            mb: 3 
          }}>
            {[
              { 
                icon: <SpeedIcon sx={{ fontSize: 30 }} />, 
                value: `${stats.productivity}%`, 
                label: 'Продуктивность',
                color: '#4caf50',
                gradient: 'linear-gradient(135deg, #66bb6a, #4caf50)'
              },
              { 
                icon: <ProjectIcon sx={{ fontSize: 30 }} />, 
                value: stats.activeProjects, 
                label: 'Активных проектов',
                subLabel: `из ${stats.totalProjects}`,
                color: '#2196f3',
                gradient: 'linear-gradient(135deg, #42a5f5, #2196f3)'
              },
              { 
                icon: <TaskIcon sx={{ fontSize: 30 }} />, 
                value: stats.pendingTasks, 
                label: 'Задач в работе',
                subLabel: `выполнено ${stats.completedTasks}`,
                color: '#ff9800',
                gradient: 'linear-gradient(135deg, #ffb74d, #ff9800)'
              },
              { 
                icon: <MoneyIcon sx={{ fontSize: 30 }} />, 
                value: `${stats.weekEarned}₽`, 
                label: 'За неделю',
                subLabel: `${stats.weekHours} часов`,
                color: '#9c27b0',
                gradient: 'linear-gradient(135deg, #ba68c8, #9c27b0)'
              }
            ].map((stat, index) => (
              <Box key={index}>
                <Grow in timeout={500 + index * 200}>
                  <Card sx={{ 
                    height: '100%',
                    background: 'white',
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                    }
                  }}>
                    <Box sx={{
                      background: stat.gradient,
                      height: 8
                    }} />
                    <CardContent>
                      <Stack spacing={2}>
                        <Avatar sx={{ 
                          background: stat.gradient,
                          width: 60, 
                          height: 60,
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                        }}>
                          {stat.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="h3" fontWeight="bold" color="text.primary">
                            {stat.value}
                          </Typography>
                          <Typography variant="body1" color="text.secondary">
                            {stat.label}
                          </Typography>
                          {stat.subLabel && (
                            <Typography variant="caption" color="text.disabled">
                              {stat.subLabel}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grow>
              </Box>
            ))}
          </Box>

          {/* Main Content Grid */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              md: 'repeat(3, 1fr)' 
            }, 
            gap: 3 
          }}>
            {/* Quick Actions */}
            <Box>
              <Fade in timeout={1000}>
                <Card sx={{ 
                  borderRadius: 3,
                  background: 'white',
                  height: '100%'
                }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" mb={3}>
                      <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'success.main' }} />
                      Быстрые действия
                    </Typography>
                    <Stack spacing={2}>
                      {[
                        { icon: <NewTaskIcon />, text: 'Создать задачу', path: '/tasks', color: 'primary' },
                        { icon: <NewProjectIcon />, text: 'Новый проект', path: '/projects', color: 'success' },
                        { icon: <NewEstimateIcon />, text: 'Создать смету', path: '/mobile/estimate', color: 'warning' },
                        { icon: <BusinessIcon />, text: 'Контрагенты', path: '/contractors', color: 'info' },
                        { icon: <ChartIcon />, text: 'Аналитика', path: '/analytics', color: 'secondary' },
                        { icon: <CalendarIcon />, text: 'Календарь', path: '/calendar', color: 'error' }
                      ].map((action, index) => (
                        <Button
                          key={index}
                          fullWidth
                          variant="outlined"
                          startIcon={action.icon}
                          onClick={() => navigate(action.path)}
                          sx={{
                            justifyContent: 'flex-start',
                            borderRadius: 2,
                            py: 1.5,
                            borderColor: `${action.color}.main`,
                            color: `${action.color}.main`,
                            '&:hover': {
                              background: `${action.color}.light`,
                              borderColor: `${action.color}.dark`,
                              transform: 'translateX(4px)'
                            },
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {action.text}
                        </Button>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Fade>
            </Box>

            {/* Recent Tasks */}
            <Box>
              <Fade in timeout={1200}>
                <Card sx={{ 
                  borderRadius: 3,
                  background: 'white',
                  height: '100%'
                }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" fontWeight="bold">
                        <TaskIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} />
                        Текущие задачи
                      </Typography>
                      <Chip label={`${tasks.length} всего`} size="small" color="warning" />
                    </Stack>
                    <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                      {tasks
                        .filter(t => t.status !== 'completed')
                        .slice(0, 6)
                        .map((task, index) => (
                          <Grow in timeout={1400 + index * 100} key={task.id}>
                            <ListItem
                              sx={{
                                borderRadius: 2,
                                mb: 1,
                                background: 'grey.50',
                                cursor: 'pointer',
                                '&:hover': {
                                  background: 'grey.100',
                                  transform: 'translateX(4px)'
                                },
                                transition: 'all 0.3s ease'
                              }}
                              onClick={() => navigate('/tasks')}
                            >
                              <ListItemAvatar>
                                <Avatar sx={{ background: 'warning.light' }}>
                                  <TaskIcon />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Typography variant="body2" fontWeight="bold">
                                    {task.task}
                                  </Typography>
                                }
                                secondary={
                                  <Stack direction="row" spacing={1} mt={0.5}>
                                    <Chip 
                                      label={task.projectName || 'Без проекта'} 
                                      size="small" 
                                      sx={{ height: 20 }}
                                    />
                                    <Chip 
                                      label={task.status} 
                                      size="small" 
                                      color={task.status === 'in_progress' ? 'success' : 'default'}
                                      sx={{ height: 20 }}
                                    />
                                  </Stack>
                                }
                              />
                            </ListItem>
                          </Grow>
                        ))}
                    </List>
                    {tasks.length === 0 && (
                      <Box textAlign="center" py={4}>
                        <TrophyIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                        <Typography color="text.secondary">
                          Все задачи выполнены!
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Fade>
            </Box>

            {/* Activity Feed */}
            <Box>
              <Fade in timeout={1400}>
                <Card sx={{ 
                  borderRadius: 3,
                  background: 'white',
                  height: '100%'
                }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" mb={3}>
                      <ClockIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'info.main' }} />
                      Недавняя активность
                    </Typography>
                    <Stack spacing={2}>
                      <Paper sx={{ p: 2, background: '#e3f2fd', borderLeft: '4px solid', borderColor: 'info.main' }}>
                        <Typography variant="body2" fontWeight="bold">Отработано сегодня</Typography>
                        <Typography variant="h5" color="info.main">{formatTime(elapsedSeconds)}</Typography>
                      </Paper>
                      <Paper sx={{ p: 2, background: '#e8f5e9', borderLeft: '4px solid', borderColor: 'success.main' }}>
                        <Typography variant="body2" fontWeight="bold">За эту неделю</Typography>
                        <Typography variant="h5" color="success.main">{stats.weekHours} часов</Typography>
                      </Paper>
                      <Paper sx={{ p: 2, background: '#fff3e0', borderLeft: '4px solid', borderColor: 'warning.main' }}>
                        <Typography variant="body2" fontWeight="bold">За месяц</Typography>
                        <Typography variant="h5" color="warning.main">{stats.monthHours} часов</Typography>
                      </Paper>
                      <Button 
                        fullWidth 
                        variant="outlined" 
                        onClick={() => navigate('/time-control')}
                        sx={{ mt: 2 }}
                      >
                        Посмотреть детальный отчет
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Fade>
            </Box>
          </Box>
        </Container>

        {/* Floating Action Button */}
        {!isWorking && (
          <Zoom in>
            <Fab
              color="success"
              size="large"
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)'
              }}
              onClick={() => setStartWorkOpen(true)}
            >
              <StartWorkIcon sx={{ fontSize: 32 }} />
            </Fab>
          </Zoom>
        )}
      </Box>

      <StartWorkDialog open={startWorkOpen} onClose={() => setStartWorkOpen(false)} />
    </>
  );
};

export default HomePage;
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
import { TimeEntry, getTimeEntriesStream } from '../api/timeEntryUnified';
import StartWorkDialog from '../components/StartWorkDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';

const HomePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isWorking, currentEntry, elapsedSeconds, stopWork } = useTimeTracking();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // 1024px для мобильной версии

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [startWorkOpen, setStartWorkOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    console.log('🚀 Loading HomePage data for user:', currentUser.uid);
    setLoading(true);
    
    let loadedCount = 0;
    const totalStreams = 3;
    
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalStreams) {
        console.log('✅ All HomePage streams loaded');
        setLoading(false);
      }
    };
    
    const unsubProjects = getProjectsStream(currentUser.uid, (data) => {
      console.log('📁 Projects loaded:', data.length);
      setProjects(data);
      checkAllLoaded();
    });
    
    const unsubTasks = getTasksStream(currentUser.uid, (data) => {
      console.log('📋 Tasks loaded:', data.length);
      setTasks(data);
      checkAllLoaded();
    });
    
    const unsubTime = getTimeEntriesStream(currentUser.uid, (entries) => {
      console.log('⏰ Time entries loaded:', entries.length);
      setTimeEntries(entries);
      checkAllLoaded();
    });
    
    return () => {
      console.log('🔌 Unsubscribing from HomePage streams');
      unsubProjects();
      unsubTasks();
      unsubTime();
    };
  }, [currentUser]);

  const stats = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekEntries = timeEntries.filter(e => {
      const startTime = (e.startTime as any)?.toDate ? (e.startTime as any).toDate() : new Date(e.startTime);
      return startTime > weekAgo;
    });
    const weekHours = weekEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthEntries = timeEntries.filter(e => {
      const startTime = (e.startTime as any)?.toDate ? (e.startTime as any).toDate() : new Date(e.startTime);
      return startTime > monthAgo;
    });
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

  console.log('🔍 HomePage Debug:', { 
    isMobile, 
    windowWidth: window.innerWidth,
    breakpointLg: theme.breakpoints.values.lg
  });

  // Форсируем мобильную версию для тестирования
  if (isMobile || true) {
    return (
      <>
        <Box sx={{ 
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)',
          pb: 12 // Space for bottom navigation
        }}>
          {/* Mobile Header with advanced design */}
          <Box sx={{ 
            background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 30%, #43a047 100%)', 
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 70% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              pointerEvents: 'none'
            }
          }}>
            <Box sx={{ position: 'relative', zIndex: 1, p: 2, pt: 3 }}>
              {/* Header top row */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box flex={1}>
                  <Typography variant="body1" fontWeight="600" sx={{ opacity: 0.95, mb: 0.5 }}>
                    {getGreeting()}
                  </Typography>
                  <Typography variant="h5" fontWeight="800" sx={{ 
                    letterSpacing: '-0.5px',
                    lineHeight: 1.2,
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    {currentUser?.displayName || 'Пользователь'}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    opacity: 0.8, 
                    display: 'block',
                    mt: 0.5,
                    fontWeight: 500
                  }}>
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </Typography>
                </Box>
                
                <Stack direction="row" spacing={0.5}>
                  <IconButton 
                    size="medium"
                    sx={{ 
                      color: 'white',
                      background: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.2)',
                        transform: 'scale(1.05)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => navigate('/notifications')}
                  >
                    <Badge badgeContent={3} color="error">
                      <NotificationsIcon fontSize="small" />
                    </Badge>
                  </IconButton>
                  <IconButton 
                    size="medium"
                    sx={{ 
                      color: 'white',
                      background: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.2)',
                        transform: 'scale(1.05)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => navigate('/profile')}
                  >
                    <PersonIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>

              {/* Work Status Card */}
              {isWorking ? (
                <Paper sx={{ 
                  p: 2.5, 
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 3,
                  textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  mt: 2
                }}>
                  <Stack spacing={2}>
                    <Box>
                      <Chip 
                        label="В работе" 
                        color="success" 
                        size="small"
                        sx={{ 
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          height: 24
                        }}
                      />
                    </Box>
                    <Typography variant="h3" color="success.main" fontWeight="900" sx={{
                      fontFamily: 'monospace',
                      letterSpacing: '1px',
                      textShadow: '0 2px 4px rgba(76, 175, 80, 0.2)'
                    }}>
                      {formatTime(elapsedSeconds)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{
                      fontWeight: 600,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.3
                    }}>
                      {currentEntry?.taskName}
                    </Typography>
                    <Button 
                      variant="contained" 
                      color="error" 
                      size="large"
                      startIcon={<StopIcon />} 
                      onClick={() => stopWork()}
                      fullWidth
                      sx={{
                        py: 1.5,
                        borderRadius: 2,
                        fontWeight: 700,
                        textTransform: 'none',
                        fontSize: '1rem',
                        boxShadow: '0 4px 16px rgba(244, 67, 54, 0.3)',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: '0 6px 20px rgba(244, 67, 54, 0.4)'
                        }
                      }}
                    >
                      Завершить работу
                    </Button>
                  </Stack>
                </Paper>
              ) : (
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<StartWorkIcon />}
                  onClick={() => setStartWorkOpen(true)}
                  sx={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: 'success.dark',
                    py: 2,
                    borderRadius: 3,
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    textTransform: 'none',
                    letterSpacing: '0.5px',
                    mt: 2,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(20px)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 1)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                    },
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  Начать работу
                </Button>
              )}
            </Box>
          </Box>

          {/* Main Content */}
          <Box sx={{ px: 2, py: 3 }}>
            {/* Stats Dashboard */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight="700" color="text.primary" sx={{ 
                mb: 2.5,
                fontSize: '1.1rem',
                letterSpacing: '-0.3px'
              }}>
                📊 Сводка
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: 2
              }}>
                {[
                  { 
                    icon: <SpeedIcon />, 
                    value: `${stats.productivity}%`, 
                    label: 'Продуктивность',
                    subLabel: 'эта неделя',
                    color: '#4caf50',
                    bgColor: '#e8f5e9',
                    gradient: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)'
                  },
                  { 
                    icon: <ProjectIcon />, 
                    value: stats.activeProjects, 
                    label: 'Проектов',
                    subLabel: `из ${stats.totalProjects} всего`,
                    color: '#2196f3',
                    bgColor: '#e3f2fd',
                    gradient: 'linear-gradient(135deg, #2196f3 0%, #42a5f5 100%)'
                  },
                  { 
                    icon: <TaskIcon />, 
                    value: stats.pendingTasks, 
                    label: 'Задач',
                    subLabel: `${stats.completedTasks} выполнено`,
                    color: '#ff9800',
                    bgColor: '#fff3e0',
                    gradient: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)'
                  },
                  { 
                    icon: <MoneyIcon />, 
                    value: `$${stats.weekEarned}`, 
                    label: 'Заработано',
                    subLabel: `${stats.weekHours} часов`,
                    color: '#9c27b0',
                    bgColor: '#f3e5f5',
                    gradient: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)'
                  }
                ].map((stat, index) => (
                  <Card key={index} sx={{ 
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative',
                    background: 'white',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
                    border: `1px solid ${stat.bgColor}`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                    }
                  }}>
                    <Box sx={{
                      background: stat.gradient,
                      height: 4,
                      width: '100%'
                    }} />
                    <CardContent sx={{ p: 2 }}>
                      <Stack spacing={1.5} alignItems="center" textAlign="center">
                        <Avatar sx={{ 
                          background: stat.gradient,
                          width: 44, 
                          height: 44,
                          boxShadow: `0 4px 16px ${stat.color}40`
                        }}>
                          {stat.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="h5" fontWeight="900" color="text.primary" sx={{
                            fontSize: '1.5rem',
                            lineHeight: 1
                          }}>
                            {stat.value}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            mt: 0.5
                          }}>
                            {stat.label}
                          </Typography>
                          {stat.subLabel && (
                            <Typography variant="caption" color="text.disabled" sx={{
                              fontSize: '0.7rem',
                              display: 'block',
                              mt: 0.3
                            }}>
                              {stat.subLabel}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>

            {/* Quick Actions Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight="700" color="text.primary" sx={{ 
                mb: 2.5,
                fontSize: '1.1rem',
                letterSpacing: '-0.3px'
              }}>
                ⚡ Быстрые действия
              </Typography>
              <Card sx={{ 
                borderRadius: 3,
                background: 'white',
                boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.06)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: 2
                  }}>
                    {[
                      { 
                        icon: <NewTaskIcon />, 
                        text: 'Новая задача', 
                        path: '/tasks',
                        color: '#1976d2',
                        bgColor: '#e3f2fd'
                      },
                      { 
                        icon: <NewProjectIcon />, 
                        text: 'Новый проект', 
                        path: '/projects',
                        color: '#388e3c',
                        bgColor: '#e8f5e9'
                      },
                      { 
                        icon: <NewEstimateIcon />, 
                        text: 'Создать смету', 
                        path: '/estimates/quick-create',
                        color: '#f57c00',
                        bgColor: '#fff3e0'
                      },
                      { 
                        icon: <BusinessIcon />, 
                        text: 'Контрагенты', 
                        path: '/counterparties',
                        color: '#7b1fa2',
                        bgColor: '#f3e5f5'
                      }
                    ].map((action, index) => (
                      <Button
                        key={index}
                        variant="outlined"
                        startIcon={action.icon}
                        onClick={() => navigate(action.path)}
                        sx={{
                          py: 2,
                          px: 2,
                          borderRadius: 2.5,
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          textTransform: 'none',
                          justifyContent: 'flex-start',
                          borderColor: action.bgColor,
                          color: action.color,
                          background: `${action.bgColor}20`,
                          '&:hover': {
                            borderColor: action.color,
                            background: action.bgColor,
                            transform: 'translateY(-1px)',
                            boxShadow: `0 4px 16px ${action.color}30`
                          },
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        {action.text}
                      </Button>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Time Tracking Summary */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight="700" color="text.primary" sx={{ 
                mb: 2.5,
                fontSize: '1.1rem',
                letterSpacing: '-0.3px'
              }}>
                ⏰ Активность
              </Typography>
              <Card sx={{ 
                borderRadius: 3,
                background: 'white',
                boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.06)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2.5}>
                    <Box sx={{ 
                      p: 2.5, 
                      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', 
                      borderRadius: 2.5,
                      border: '2px solid #2196f3',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                        animation: 'shimmer 3s infinite'
                      },
                      '@keyframes shimmer': {
                        '0%': { transform: 'translateX(-100%)' },
                        '100%': { transform: 'translateX(100%)' }
                      }
                    }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight="700" color="#1565c0">
                            Сегодня
                          </Typography>
                          <Typography variant="h4" color="#1976d2" fontWeight="900" sx={{
                            fontFamily: 'monospace',
                            letterSpacing: '1px'
                          }}>
                            {formatTime(elapsedSeconds)}
                          </Typography>
                        </Box>
                        <ClockIcon sx={{ fontSize: 40, color: '#42a5f5', opacity: 0.7 }} />
                      </Stack>
                    </Box>

                    <Box sx={{ 
                      p: 2.5, 
                      background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', 
                      borderRadius: 2.5,
                      border: '2px solid #4caf50'
                    }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight="700" color="#2e7d32">
                            Эта неделя
                          </Typography>
                          <Typography variant="h4" color="#388e3c" fontWeight="900">
                            {stats.weekHours} ч
                          </Typography>
                        </Box>
                        <ChartIcon sx={{ fontSize: 40, color: '#66bb6a', opacity: 0.7 }} />
                      </Stack>
                    </Box>

                    <Button 
                      variant="outlined" 
                      fullWidth
                      onClick={() => navigate('/time-control')}
                      sx={{ 
                        py: 1.5,
                        borderRadius: 2.5,
                        fontWeight: 600,
                        textTransform: 'none',
                        borderColor: '#e0e0e0',
                        color: '#666',
                        '&:hover': {
                          borderColor: '#2196f3',
                          color: '#2196f3',
                          background: '#f3f4f6'
                        }
                      }}
                    >
                      Подробный отчет →
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            {/* Tasks Section */}
            <Box>
              <Typography variant="h6" fontWeight="700" color="text.primary" sx={{ 
                mb: 2.5,
                fontSize: '1.1rem',
                letterSpacing: '-0.3px'
              }}>
                📋 Текущие задачи
              </Typography>
              <Card sx={{ 
                borderRadius: 3,
                background: 'white',
                boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.06)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="body1" fontWeight="600">
                      Активные задачи
                    </Typography>
                    <Chip 
                      label={tasks.filter(t => t.status !== 'completed').length} 
                      size="small" 
                      color="warning"
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                  
                  <Stack spacing={2}>
                    {tasks
                      .filter(t => t.status !== 'completed')
                      .slice(0, 4)
                      .map((task, index) => (
                        <Paper 
                          key={task.id}
                          elevation={0}
                          sx={{
                            p: 2.5,
                            background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
                            borderRadius: 2.5,
                            cursor: 'pointer',
                            border: '1px solid #e8e8e8',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                              borderColor: '#2196f3'
                            }
                          }}
                          onClick={() => navigate('/tasks')}
                        >
                          <Stack spacing={1.5}>
                            <Typography variant="body1" fontWeight="700" color="text.primary" sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.3
                            }}>
                              {task.task}
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              <Chip 
                                label={task.projectName || 'Без проекта'} 
                                size="small" 
                                sx={{ 
                                  height: 24,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: '#e3f2fd',
                                  color: '#1976d2'
                                }}
                              />
                              <Chip 
                                label={task.status === 'in_progress' ? 'В работе' : 'Новая'} 
                                size="small" 
                                color={task.status === 'in_progress' ? 'success' : 'default'}
                                sx={{ 
                                  height: 24,
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}
                              />
                            </Stack>
                          </Stack>
                        </Paper>
                      ))}
                    
                    {tasks.filter(t => t.status !== 'completed').length === 0 && (
                      <Box textAlign="center" py={4}>
                        <TrophyIcon sx={{ 
                          fontSize: 64, 
                          color: 'warning.main', 
                          mb: 2,
                          filter: 'drop-shadow(0 2px 8px rgba(255, 193, 7, 0.3))'
                        }} />
                        <Typography variant="h6" fontWeight="700" color="text.primary" mb={1}>
                          Отличная работа!
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Все задачи выполнены
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>
        <StartWorkDialog open={startWorkOpen} onClose={() => setStartWorkOpen(false)} />
      </>
    );
  }

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
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Уведомления">
                      <IconButton 
                        sx={{ 
                          color: 'white',
                          minWidth: 44,
                          minHeight: 44
                        }}
                        onClick={() => navigate('/notifications')}
                      >
                        <Badge badgeContent={3} color="error">
                          <NotificationsIcon />
                        </Badge>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Профиль">
                      <IconButton 
                        sx={{ 
                          color: 'white',
                          minWidth: 44,
                          minHeight: 44
                        }} 
                        onClick={() => navigate('/profile')}
                      >
                        <PersonIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>

                {/* Work Timer Card */}
                {isWorking ? (
                  <Zoom in>
                    <Paper sx={{ 
                      p: isMobile ? 2 : 3, 
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 3,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                    }}>
                      <Stack 
                        direction={isMobile ? "column" : "row"} 
                        justifyContent="space-between" 
                        alignItems={isMobile ? "stretch" : "center"}
                        spacing={isMobile ? 2 : 0}
                      >
                        <Box sx={{ textAlign: isMobile ? 'center' : 'left' }}>
                          <Typography variant="h6" color="success.main" fontWeight="bold">
                            <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            В работе
                          </Typography>
                          <Typography 
                            variant={isMobile ? "h6" : "h5"} 
                            color="text.primary" 
                            fontWeight="bold" 
                            mt={1}
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {currentEntry?.taskName}
                          </Typography>
                          <Chip 
                            label={currentEntry?.projectName || 'Без проекта'} 
                            size="small" 
                            sx={{ mt: 1, backgroundColor: 'success.light', color: 'white' }}
                          />
                        </Box>
                        <Box textAlign="center">
                          <Typography 
                            variant={isMobile ? "h3" : "h2"} 
                            color="success.main" 
                            fontWeight="bold"
                          >
                            {formatTime(elapsedSeconds)}
                          </Typography>
                          <Button 
                            variant="contained" 
                            color="error" 
                            startIcon={<StopIcon />} 
                            onClick={() => stopWork()}
                            size={isMobile ? "medium" : "large"}
                            sx={{ 
                              mt: 2, 
                              borderRadius: 3,
                              minHeight: 48,
                              px: isMobile ? 3 : 4
                            }}
                            fullWidth={isMobile}
                          >
                            Завершить
                          </Button>
                        </Box>
                      </Stack>
                      <LinearProgress 
                        variant="indeterminate" 
                        sx={{ mt: 2, borderRadius: 2, height: isMobile ? 4 : 6 }}
                        color="success"
                      />
                    </Paper>
                  </Zoom>
                ) : (
                  <Grow in>
                    <Button
                      variant="contained"
                      size={isMobile ? "medium" : "large"}
                      startIcon={<StartWorkIcon />}
                      onClick={() => setStartWorkOpen(true)}
                      sx={{
                        background: 'white',
                        color: 'success.main',
                        py: isMobile ? 1.5 : 2,
                        px: isMobile ? 3 : 4,
                        borderRadius: 3,
                        fontSize: isMobile ? '1rem' : '1.1rem',
                        fontWeight: 'bold',
                        minHeight: 48,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        '&:hover': {
                          transform: isMobile ? 'none' : 'translateY(-2px)',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                          background: 'white'
                        },
                        '&:active': {
                          transform: isMobile ? 'scale(0.98)' : 'translateY(-2px)'
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
                value: `$${stats.weekEarned}`, 
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
                        { icon: <NewEstimateIcon />, text: 'Создать смету', path: '/estimates/quick-create', color: 'warning' },
                        { icon: <BusinessIcon />, text: 'Контрагенты', path: '/counterparties', color: 'info' },
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
                            py: isMobile ? 2 : 1.5,
                            minHeight: 48,
                            borderColor: `${action.color}.main`,
                            color: `${action.color}.main`,
                            fontSize: isMobile ? '0.9rem' : '0.875rem',
                            '&:hover': {
                              background: `${action.color}.light`,
                              borderColor: `${action.color}.dark`,
                              transform: isMobile ? 'none' : 'translateX(4px)'
                            },
                            '&:active': {
                              transform: isMobile ? 'scale(0.98)' : 'translateX(4px)'
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
                                minHeight: isMobile ? 64 : 56,
                                py: isMobile ? 1 : 0.5,
                                '&:hover': {
                                  background: 'grey.100',
                                  transform: isMobile ? 'none' : 'translateX(4px)'
                                },
                                '&:active': {
                                  transform: isMobile ? 'scale(0.98)' : 'translateX(4px)'
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
                        sx={{ 
                          mt: 2,
                          minHeight: 48,
                          fontSize: isMobile ? '0.9rem' : '0.875rem'
                        }}
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

        {/* Floating Action Button - только для desktop */}
        {!isWorking && !isMobile && (
          <Zoom in>
            <Fab
              color="success"
              size="large"
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                width: 64,
                height: 64,
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
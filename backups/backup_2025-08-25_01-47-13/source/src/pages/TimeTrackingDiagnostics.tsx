import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Container,
  Card,
  CardContent,
  CardActions,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Build as BuildIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Timer as TimerIcon,
  BugReport as BugIcon,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { getProjectsStream, Project } from '../api/projectApi';
import { getTasksStream, Task } from '../api/taskApi';
import { getTimesheetsByEmployeeStream, TimesheetEntry } from '../api/employeeApi';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface DiagnosticResult {
  category: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: any;
  action?: () => void;
  actionLabel?: string;
}

const TimeTrackingDiagnostics: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    isWorking, 
    currentSession, 
    elapsedSeconds, 
    startWork, 
  } = useTimeTracking();

  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timesheet, setTimesheet] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);

  // Load data
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const unsubProjects = getProjectsStream(currentUser.uid, setProjects);
    const unsubTasks = getTasksStream(currentUser.uid, setTasks);
    const unsubTimesheet = getTimesheetsByEmployeeStream(
      currentUser.uid, 
      currentUser.uid, 
      setTimesheet
    );

    // Run diagnostics after data loads
    const timer = setTimeout(() => {
      runDiagnostics();
      setLoading(false);
    }, 2000);

    return () => {
      unsubProjects && unsubProjects();
      unsubTasks && unsubTasks();
      unsubTimesheet && unsubTimesheet();
      clearTimeout(timer);
    };
  }, [currentUser]);

  const runDiagnostics = async () => {
    const results: DiagnosticResult[] = [];

    // 1. Check authentication
    if (currentUser) {
      results.push({
        category: 'Аутентификация',
        status: 'success',
        message: `Пользователь авторизован: ${currentUser.email}`,
        details: { uid: currentUser.uid }
      });
    } else {
      results.push({
        category: 'Аутентификация',
        status: 'error',
        message: 'Пользователь не авторизован',
        action: () => window.location.href = '/login',
        actionLabel: 'Войти'
      });
    }

    // 2. Check localStorage
    const localSession = localStorage.getItem('workSession');
    if (localSession) {
      try {
        const session = JSON.parse(localSession);
        const startTime = new Date(session.startTime);
        const hoursDiff = (new Date().getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
          results.push({
            category: 'LocalStorage',
            status: 'warning',
            message: `Найдена устаревшая сессия (${Math.round(hoursDiff)} часов)`,
            details: session,
            action: () => {
              localStorage.removeItem('workSession');
              window.location.reload();
            },
            actionLabel: 'Очистить'
          });
        } else {
          results.push({
            category: 'LocalStorage',
            status: 'info',
            message: `Активная сессия в localStorage (${Math.round(hoursDiff * 10) / 10} часов)`,
            details: session
          });
        }
      } catch (error) {
        results.push({
          category: 'LocalStorage',
          status: 'error',
          message: 'Поврежденные данные в localStorage',
          action: () => {
            localStorage.removeItem('workSession');
            window.location.reload();
          },
          actionLabel: 'Очистить'
        });
      }
    } else {
      results.push({
        category: 'LocalStorage',
        status: 'success',
        message: 'LocalStorage чист'
      });
    }

    // 3. Check Context State
    if (isWorking && currentSession) {
      results.push({
        category: 'Контекст',
        status: 'info',
        message: `Активная работа: ${currentSession.taskName}`,
        details: {
          project: currentSession.projectName,
          elapsed: `${Math.floor(elapsedSeconds / 60)} минут`
        }
      });
    } else if (isWorking && !currentSession) {
      results.push({
        category: 'Контекст',
        status: 'error',
        message: 'Рассинхронизация: isWorking=true, но нет сессии',
        action: () => window.location.reload(),
        actionLabel: 'Перезагрузить'
      });
    } else {
      results.push({
        category: 'Контекст',
        status: 'success',
        message: 'Нет активной работы'
      });
    }

    // 4. Check Projects
    if (projects.length === 0) {
      results.push({
        category: 'Проекты',
        status: 'warning',
        message: 'Нет проектов',
        action: () => window.location.href = '/projects',
        actionLabel: 'Создать проект'
      });
    } else {
      const activeProjects = projects.filter(p => p.status === 'active');
      results.push({
        category: 'Проекты',
        status: 'success',
        message: `Найдено проектов: ${projects.length} (активных: ${activeProjects.length})`,
        details: { total: projects.length, active: activeProjects.length }
      });
    }

    // 5. Check Tasks
    if (tasks.length === 0) {
      results.push({
        category: 'Задачи',
        status: 'warning',
        message: 'Нет задач',
        action: () => window.location.href = '/tasks',
        actionLabel: 'Создать задачу'
      });
    } else {
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
      const pendingTasks = tasks.filter(t => t.status === 'new');
      
      results.push({
        category: 'Задачи',
        status: 'success',
        message: `Всего задач: ${tasks.length}`,
        details: {
          total: tasks.length,
          inProgress: inProgressTasks.length,
          pending: pendingTasks.length
        }
      });

      // Check for stuck tasks
      if (inProgressTasks.length > 1) {
        results.push({
          category: 'Задачи',
          status: 'warning',
          message: `Найдено ${inProgressTasks.length} задач "в работе" одновременно`,
          details: inProgressTasks.map(t => (t as any).task || (t as any).title || t.id),
          action: async () => {
            setFixing(true);
            for (const task of inProgressTasks) {
              if (currentSession?.taskId !== task.id) {
                await updateDoc(
                  doc(db, `users/${currentUser?.uid}/tasks`, task.id),
                  { status: 'pending' }
                );
              }
            }
            setFixing(false);
            runDiagnostics();
          },
          actionLabel: 'Исправить'
        });
      }
    }

    // 6. Check Firebase connection
    try {
      const testQuery = query(
        collection(db, `users/${currentUser?.uid}/tasks`),
        where('status', '==', 'test_connection')
      );
      await getDocs(testQuery);
      results.push({
        category: 'Firebase',
        status: 'success',
        message: 'Соединение с Firebase активно'
      });
    } catch (error: any) {
      results.push({
        category: 'Firebase',
        status: 'error',
        message: 'Проблема с подключением к Firebase',
        details: error.message
      });
    }

    // 7. Check Timesheet
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = timesheet.filter(e => new Date(e.date).toISOString().split('T')[0] === today);
    
    results.push({
      category: 'Табель',
      status: 'info',
      message: `Записей в табеле: ${timesheet.length}`,
      details: {
        total: timesheet.length,
        today: todayEntries.length,
        todayHours: todayEntries.reduce((sum, e) => sum + e.hours, 0)
      }
    });

    // 8. Check for orphaned sessions
    const orphanedTasks = tasks.filter(t => 
      t.status === 'in_progress' && 
      (!currentSession || currentSession.taskId !== t.id)
    );
    
    if (orphanedTasks.length > 0) {
      results.push({
        category: 'Синхронизация',
        status: 'warning',
        message: `Найдено ${orphanedTasks.length} задач без активной сессии`,
        details: orphanedTasks.map(t => ({ id: t.id, name: (t as any).task || (t as any).title || t.id })),
        action: async () => {
          setFixing(true);
          for (const task of orphanedTasks) {
            await updateDoc(
              doc(db, `users/${currentUser?.uid}/tasks`, task.id),
              { status: 'pending' }
            );
          }
          setFixing(false);
          runDiagnostics();
        },
        actionLabel: 'Сбросить статус'
      });
    }

    setDiagnostics(results);
  };

  const clearAllData = async () => {
    if (!window.confirm('Это очистит ВСЕ локальные данные. Продолжить?')) return;
    
    setFixing(true);
    try {
      // Clear localStorage
      localStorage.removeItem('workSession');
      localStorage.removeItem('selectedEmployee');
      localStorage.removeItem('selectedTaskForWork');
      
      // Reset all in_progress tasks
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
      for (const task of inProgressTasks) {
        await updateDoc(
          doc(db, `users/${currentUser?.uid}/tasks`, task.id),
          { status: 'pending' }
        );
      }
      
      // Stop current work if any (теперь завершение доступно только через UI с фото)
      
      // Reload page
      window.location.reload();
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Ошибка при очистке данных');
    } finally {
      setFixing(false);
    }
  };

  const testStartWork = async () => {
    if (projects.length === 0 || tasks.length === 0) {
      alert('Нужен хотя бы один проект и задача для теста');
      return;
    }
    
    const activeProject = projects.find(p => p.status === 'active') || projects[0];
    const availableTask = tasks.find(t => 
      t.projectId === activeProject.id && t.status !== 'completed' && t.status !== 'cancelled'
    ) || tasks[0];
    
    try {
      await startWork(
        availableTask.id!,
        new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      );
      alert('Тест успешен! Работа начата.');
      runDiagnostics();
    } catch (error: any) {
      alert(`Ошибка теста: ${error.message}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckIcon color="success" />;
      case 'error': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'info': return <InfoIcon color="info" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success.main';
      case 'error': return 'error.main';
      case 'warning': return 'warning.main';
      case 'info': return 'info.main';
      default: return 'text.primary';
    }
  };

  if (!currentUser) {
    return (
      <Container>
        <Alert severity="error">
          Необходимо войти в систему для доступа к диагностике
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const errorCount = diagnostics.filter(d => d.status === 'error').length;
  const warningCount = diagnostics.filter(d => d.status === 'warning').length;

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          <BugIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Диагностика модуля учета времени
        </Typography>

        {/* Summary */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h6">Статус системы:</Typography>
            {errorCount > 0 ? (
              <Chip label={`${errorCount} ошибок`} color="error" />
            ) : warningCount > 0 ? (
              <Chip label={`${warningCount} предупреждений`} color="warning" />
            ) : (
              <Chip label="Все в порядке" color="success" />
            )}
            <Box flex={1} />
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={runDiagnostics}
              disabled={fixing}
            >
              Перепроверить
            </Button>
          </Box>
        </Paper>

        {/* Current State */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <TimerIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Текущее состояние
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Учет времени
                </Typography>
                <Typography variant="body1">
                  {isWorking ? 'Активен' : 'Не активен'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Текущая задача
                </Typography>
                <Typography variant="body1">
                  {currentSession?.taskName || 'Нет'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Прошло времени
                </Typography>
                <Typography variant="body1">
                  {elapsedSeconds > 0 ? `${Math.floor(elapsedSeconds / 60)} мин` : '0 мин'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  LocalStorage
                </Typography>
                <Typography variant="body1">
                  {localStorage.getItem('workSession') ? 'Есть данные' : 'Пусто'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Diagnostic Results */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <BuildIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Результаты диагностики
            </Typography>
            <Divider sx={{ my: 2 }} />
            <List>
              {diagnostics.map((diag, index) => (
                <ListItem key={index} sx={{ alignItems: 'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getStatusIcon(diag.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography color={getStatusColor(diag.status)}>
                          {diag.category}
                        </Typography>
                        {diag.action && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={diag.action}
                            disabled={fixing}
                          >
                            {diag.actionLabel || 'Исправить'}
                          </Button>
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2">{diag.message}</Typography>
                        {diag.details && (
                          <Typography variant="caption" component="pre" sx={{ mt: 1 }}>
                            {JSON.stringify(diag.details, null, 2)}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <BuildIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Инструменты
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Alert severity="warning" sx={{ mb: 2 }}>
              Используйте эти инструменты только если понимаете, что делаете!
            </Alert>
          </CardContent>
          <CardActions sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<StorageIcon />}
              onClick={() => {
                const session = localStorage.getItem('workSession');
                if (session) {
                  alert(`LocalStorage:\n${JSON.stringify(JSON.parse(session), null, 2)}`);
                } else {
                  alert('LocalStorage пуст');
                }
              }}
            >
              Показать LocalStorage
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (window.confirm('Очистить localStorage?')) {
                  localStorage.removeItem('workSession');
                  runDiagnostics();
                }
              }}
              disabled={fixing}
            >
              Очистить LocalStorage
            </Button>
            <Button
              variant="outlined"
              color="success"
              onClick={testStartWork}
              disabled={fixing || isWorking}
            >
              Тест начала работы
            </Button>
            <Button
              variant="outlined"
              color="error"
              href="/time-tracking"
              disabled={fixing || !isWorking}
            >
              Перейти к завершению
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={clearAllData}
              disabled={fixing}
            >
              Полный сброс
            </Button>
          </CardActions>
        </Card>

        {/* Help */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <AlertTitle>Частые проблемы и решения</AlertTitle>
          <Typography variant="body2" component="div">
            <ul>
              <li><strong>Кнопка не работает:</strong> Проверьте наличие активных проектов и задач</li>
              <li><strong>Время не сохраняется:</strong> Проверьте подключение к Firebase</li>
              <li><strong>Задача застряла "в работе":</strong> Используйте кнопку "Исправить" в диагностике</li>
              <li><strong>Таймер не идет:</strong> Попробуйте перезагрузить страницу</li>
              <li><strong>Дублирование записей:</strong> Используйте "Полный сброс"</li>
            </ul>
          </Typography>
        </Alert>
      </Box>
    </Container>
  );
};

export default TimeTrackingDiagnostics;

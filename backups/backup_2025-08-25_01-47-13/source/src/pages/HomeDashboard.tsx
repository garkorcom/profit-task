import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Container,

  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Assignment as TaskIcon,
  Folder as ProjectIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as ClockIcon,
  AttachMoney as MoneyIcon,
  Engineering as WorkIcon,
  Description as EstimateIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { Project } from '../types/project';
import { Task } from '../types/task';
import { TimesheetEntry } from '../types/timesheet';
import LoadingSpinner from '../components/common/LoadingSpinner';
import TimeTrackingButton from '../components/TimeTrackingButton';
import { useApi } from '../hooks/useApi';

const HomeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { isWorking, currentSession, elapsedSeconds } = useTimeTracking();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const api = useApi();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timesheet, setTimesheet] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [createEstimateOpen, setCreateEstimateOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Helpers for safe date handling (Timestamp | Date | string)
  const toJsDate = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value?.toDate === 'function') {
      try {
        const d = value.toDate();
        return isNaN(d.getTime()) ? null : d;
      } catch { return null; }
    }
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };
  const toISODate = (value: any): string => {
    const d = toJsDate(value);
    return d ? d.toISOString().split('T')[0] : '';
  };

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    const unsubProjects = api.getProjectsStream((data: Project[]) => {
      setProjects(data);
      if (loading) setLoading(false);
    });
    const unsubTasks = api.getTasksStream(setTasks);
    const unsubTimesheet = currentUser?.uid ? api.getTimesheetsByEmployeeStream(currentUser.uid, (data: TimesheetEntry[]) => setTimesheet(data)) : undefined;
    return () => {
      unsubProjects && unsubProjects();
      unsubTasks && unsubTasks();
      unsubTimesheet && unsubTimesheet();
    };
  }, [currentUser, loading, api]);

  const stats = {
    activeProjects: projects.filter(p => p.status === 'active').length,
    totalProjects: projects.length,
    pendingTasks: tasks.filter(t => t.status === 'new').length,
    todayHours: timesheet
      .filter(e => toISODate(e.date) === toISODate(new Date()))
      .reduce((sum, e) => sum + e.hours, 0),
    weekHours: timesheet.filter(e => {
      const entryDate = toJsDate(e.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return !!entryDate && entryDate >= weekAgo;
    }).reduce((sum, e) => sum + e.hours, 0),
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}ч ${m}м` : `${m}м ${s}с`;
  };

  const handleCreateEstimate = () => {
    if (!selectedProjectId) return;
    navigate(`/projects/${selectedProjectId}/estimates/new`);
  };

  const quickActions = [
    { icon: <TaskIcon />, label: 'Новая задача', color: 'primary', onClick: () => navigate('/tasks') },
    { icon: <ProjectIcon />, label: 'Новый проект', color: 'secondary', onClick: () => navigate('/projects') },
    { icon: <EstimateIcon />, label: 'Создать смету', color: 'success', onClick: () => setCreateEstimateOpen(true) },
    { icon: <ClockIcon />, label: 'Табель', color: 'info', onClick: () => navigate(`/employees/${currentUser?.uid}/timesheet`) },
    { icon: <WorkIcon />, label: '🛠️ Инструменты', color: 'error', onClick: () => navigate('/dev-tools') },
  ];

  if (loading) return <LoadingSpinner />;
  if (!currentUser) return <Container><Alert severity="error">Пожалуйста, войдите в систему</Alert></Container>;

  return (
    <Box sx={{ pb: isMobile ? 2 : 0 }}>
      <Button variant="contained" color="secondary" fullWidth onClick={() => navigate('/simple-test')} sx={{ mb: 2, py: 1 }}>
        Перейти на простую тестовую страницу
      </Button>
      <Button variant="contained" color="warning" fullWidth onClick={() => navigate('/testhome')} sx={{ mb: 2, py: 1 }}>
        Перейти на тестовую страницу
      </Button>

      <Box sx={{ mb: 3, p: { xs: 2, sm: 3 }, background: isWorking ? 'linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)' : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', borderRadius: 2, color: 'white' }}>
        <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" gutterBottom>
          {isWorking ? '💼 Вы работаете!' : '👋 Добро пожаловать!'}
        </Typography>
        {isWorking && currentSession ? (
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>{currentSession.projectName} • {currentSession.taskName}</Typography>
            <Typography variant="h4" fontWeight="bold">{formatTime(elapsedSeconds)}</Typography>
            {/* Завершение через страницу учета времени, где требуется фото ПОСЛЕ */}
            <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={() => navigate('/time-tracking')}
                sx={{ mt: 2 }}
            >
                Завершить работу
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>Начните зарабатывать прямо сейчас</Typography>
            <TimeTrackingButton variant="contained" color="success" size={isMobile ? 'medium' : 'large'} buttonText="Начать зарабатывать" startIcon={<MoneyIcon />} />
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: { xs: 1.5, sm: 2 }, mb: 3 }}>
        <Paper sx={{ p: { xs: 2, sm: 2.5 }, cursor: 'pointer', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }} onClick={() => navigate('/projects')}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="caption" color="text.secondary">Проекты</Typography>
              <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">{stats.activeProjects}</Typography>
              <Typography variant="caption" color="text.secondary">из {stats.totalProjects}</Typography>
            </Box>
            <ProjectIcon color="primary" sx={{ fontSize: { xs: 32, sm: 40 } }} />
          </Box>
        </Paper>
        <Paper sx={{ p: { xs: 2, sm: 2.5 }, cursor: 'pointer', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }} onClick={() => navigate('/tasks')}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="caption" color="text.secondary">Задачи</Typography>
              <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">{stats.pendingTasks}</Typography>
              <Typography variant="caption" color="text.secondary">ожидают</Typography>
            </Box>
            <TaskIcon color="warning" sx={{ fontSize: { xs: 32, sm: 40 } }} />
          </Box>
        </Paper>
        <Paper sx={{ p: { xs: 2, sm: 2.5 }, cursor: 'pointer', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }} onClick={() => navigate('/time-tracking')}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="caption" color="text.secondary">Сегодня</Typography>
              <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">{stats.todayHours.toFixed(1)}</Typography>
              <Typography variant="caption" color="text.secondary">часов</Typography>
            </Box>
            <ClockIcon color="success" sx={{ fontSize: { xs: 32, sm: 40 } }} />
          </Box>
        </Paper>
        <Paper sx={{ p: { xs: 2, sm: 2.5 }, cursor: 'pointer', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }} onClick={() => navigate(`/employees/${currentUser.uid}/timesheet`)}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="caption" color="text.secondary">Неделя</Typography>
              <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">{stats.weekHours.toFixed(1)}</Typography>
              <Typography variant="caption" color="text.secondary">часов</Typography>
            </Box>
            <TrendingUpIcon color="info" sx={{ fontSize: { xs: 32, sm: 40 } }} />
          </Box>
        </Paper>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Быстрые действия</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1.5 }}>
            {quickActions.map((action, index) => (
              <Button key={index} variant="outlined" color={action.color as any} startIcon={action.icon} onClick={action.onClick} sx={{ py: { xs: 1.5, sm: 2 }, flexDirection: { xs: 'column', sm: 'row' }, '& .MuiButton-startIcon': { margin: { xs: 0, sm: '0 8px 0 -4px' }, '& > svg': { fontSize: { xs: 28, sm: 20 } } } }}>
                {action.label}
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Dialog open={createEstimateOpen} onClose={() => setCreateEstimateOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle>Создать смету</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Выберите проект</InputLabel>
            <Select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} label="Выберите проект">
              {projects.filter(p => p.status === 'active').map(project => (
                <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateEstimateOpen(false)}>Отмена</Button>
          <Button onClick={handleCreateEstimate} variant="contained" disabled={!selectedProjectId}>Создать</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HomeDashboard;

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Container, Stack,
  Paper, useTheme, useMediaQuery, Avatar, List, ListItem,
  ListItemText, ListItemAvatar
} from '@mui/material';
import {
  PlayCircleOutline as StartWorkIcon,
  AddTask as NewTaskIcon,
  CreateNewFolder as NewProjectIcon,
  PostAdd as NewEstimateIcon,
  Folder as ProjectIcon,
  Assignment as TaskIcon,
  AccessTime as ClockIcon,
  TrendingUp as TrendingUpIcon,
  Stop as StopIcon
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
    
    return {
      activeProjects: projects.filter(p => p.status === 'active').length,
      pendingTasks: tasks.filter(t => t.status === 'new' || t.status === 'assigned').length,
      weekHours: weekHours.toFixed(1),
      weekEarned: (weekHours * 1200).toFixed(0) // Примерная ставка
    };
  }, [projects, tasks, timeEntries]);
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box 
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' }, 
            gap: 3 
          }}
        >
          <Box sx={{ gridColumn: 'span 12' }}>
            <Paper sx={{ p: 4, background: isWorking ? 'linear-gradient(45deg, #66bb6a 30%, #43a047 90%)' : 'linear-gradient(45deg, #29b6f6 30%, #0288d1 90%)', color: 'white' }}>
              <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold">
                {isWorking ? `В работе: ${currentEntry?.taskName}` : `👋 Добро пожаловать, ${currentUser?.displayName || 'Пользователь'}!`}
              </Typography>
              {isWorking ? (
                <Box>
                  <Typography variant="h2" fontWeight="bold">{formatTime(elapsedSeconds)}</Typography>
                  <Button variant="contained" color="error" startIcon={<StopIcon />} onClick={() => stopWork()} sx={{ mt: 2 }}>
                    Остановить
                  </Button>
                </Box>
              ) : (
                <Typography>Готовы начать новый рабочий день?</Typography>
              )}
            </Paper>
          </Box>

          <Box sx={{ gridColumn: { xs: 'span 6', md: 'span 3' } }}><StatCard icon={<ProjectIcon />} value={stats.activeProjects} title="Активные проекты" color="primary" /></Box>
          <Box sx={{ gridColumn: { xs: 'span 6', md: 'span 3' } }}><StatCard icon={<TaskIcon />} value={stats.pendingTasks} title="Задачи в ожидании" color="warning" /></Box>
          <Box sx={{ gridColumn: { xs: 'span 6', md: 'span 3' } }}><StatCard icon={<ClockIcon />} value={`${stats.weekHours} ч.`} title="За неделю" color="info" /></Box>
          <Box sx={{ gridColumn: { xs: 'span 6', md: 'span 3' } }}><StatCard icon={<TrendingUpIcon />} value={`${stats.weekEarned} ₽`} title="Заработано" color="success" /></Box>

          <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 5' } }}>
            <Stack spacing={3}>
              <QuickActions onStartWork={() => setStartWorkOpen(true)} />
              <RecentTasks tasks={tasks} />
            </Stack>
          </Box>

          <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 7' } }}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" mb={2}>Лента активности</Typography>
              <Typography color="text.secondary">(Здесь будет лента последних событий)</Typography>
            </Paper>
          </Box>
        </Box>
      </Container>
      <StartWorkDialog open={startWorkOpen} onClose={() => setStartWorkOpen(false)} />
    </>
  );
};

const StatCard = ({ icon, value, title, color }: any) => (
  <Paper sx={{ p: 2 }}>
    <Stack direction="row" spacing={2} alignItems="center">
      <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>{icon}</Avatar>
      <Box>
        <Typography variant="h5" fontWeight="bold">{value}</Typography>
        <Typography color="text.secondary">{title}</Typography>
      </Box>
    </Stack>
  </Paper>
);

const QuickActions = ({ onStartWork }: { onStartWork: () => void }) => {
  const navigate = useNavigate();
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" mb={2}>Быстрые действия</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <Button variant="outlined" startIcon={<StartWorkIcon />} onClick={onStartWork}>Начать работу</Button>
        <Button variant="outlined" startIcon={<NewTaskIcon />} onClick={() => navigate('/tasks')}>Новая задача</Button>
        <Button variant="outlined" startIcon={<NewProjectIcon />} onClick={() => navigate('/projects')}>Новый проект</Button>
        <Button variant="outlined" startIcon={<NewEstimateIcon />} onClick={() => navigate('/mobile/estimate')}>Создать смету</Button>
      </Box>
    </Paper>
  );
};

const RecentTasks = ({ tasks }: { tasks: Task[] }) => {
  const recentTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'new' || t.status === 'assigned' || t.status === 'in_progress')
      .sort((a, b) => (b.updatedAt?.toDate() || 0) - (a.updatedAt?.toDate() || 0))
      .slice(0, 5);
  }, [tasks]);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" mb={1}>Последние задачи</Typography>
      <List>
        {recentTasks.map(task => (
          <ListItem key={task.id} disablePadding>
            <ListItemAvatar><Avatar><TaskIcon /></Avatar></ListItemAvatar>
            <ListItemText primary={task.task} secondary={task.projectName || 'Без проекта'} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default HomePage;
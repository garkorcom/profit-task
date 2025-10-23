import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Paper,
  Tabs,
  Tab,
  Button,
  Menu,
  MenuItem,
  Fab,
  Chip,
  FormControl,
  InputLabel,
  Select,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Assignment as TaskIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { 
  AssignmentTask, 
  AssignmentTaskStatus,
  AssignmentTaskPriority 
} from '../types/taskAssignment';
import {
  getMyAssignmentTasks,
  acknowledgeAssignmentTask,
  completeAssignmentTask
} from '../api/taskAssignmentApi';
import AssignmentTaskCard from '../components/assignment/AssignmentTaskCard';
import TaskDetailsDrawer from '../components/assignment/TaskDetailsDrawer';
import CreateTaskDialog from '../components/assignment/CreateTaskDialog';
import { Project } from '../api/projectApi';
import { getProjectsStream } from '../api/projectApi';

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
      id={`assignment-tabpanel-${index}`}
      aria-labelledby={`assignment-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const AssignmentTasksPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { startWork, pauseWork, isWorking, currentEntry } = useTimeTracking();
  
  const [tabValue, setTabValue] = useState(0);
  const [myTasks, setMyTasks] = useState<AssignmentTask[]>([]);
  const [assignedByMeTasks, setAssignedByMeTasks] = useState<AssignmentTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssignmentTaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<AssignmentTaskPriority | 'all'>('all');
  
  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedTask, setSelectedTask] = useState<AssignmentTask | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [detailsTask, setDetailsTask] = useState<AssignmentTask | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    
    loadTasks();
    loadProjects();
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTasks = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const myTasksData = await getMyAssignmentTasks(currentUser.uid);
      
      setMyTasks(myTasksData);
      // TODO: Implement getAssignedByMeTasks function
      setAssignedByMeTasks([]);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    if (!currentUser) return;
    
    const unsubscribe = getProjectsStream(currentUser.uid, (projectsData) => {
      setProjects(projectsData);
    });
    
    return unsubscribe;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleStartWork = async (task: AssignmentTask) => {
    try {
      const project = projects.find(p => p.id === task.projectId);
      if (!project) {
        throw new Error('Проект не найден');
      }

      // Если задача еще не подтверждена, подтверждаем ее
      if (task.status === 'assigned') {
        await acknowledgeAssignmentTask(task.id);
      }

      // Начинаем работу через TimeTrackingContext
      // Конвертируем простой проект в полный тип для TimeTrackingContext
      const fullProject: import('../types/project.types').Project = {
        id: project.id,
        name: project.name,
        description: project.description,
        type: 'commercial_new', // Дефолтное значение
        status: 'active', // Дефолтное значение
        priority: 'medium', // Дефолтное значение
        location: {
          address: '',
          city: '',
          country: ''
        },
        participants: [],
        permits: [],
        financials: {
          currency: 'RUB'
        },
        siteRules: {
          workHours: {},
          safetyRequirements: {
            ppeRequired: [],
            inductionRequired: false,
            insuranceCertRequired: false
          }
        },
        risks: [],
        documents: [],
        createdBy: '',
        createdAt: '',
        updatedAt: ''
      };
      
      await startWork({
        assignmentTask: task,
        project: fullProject,
        startMethod: 'manual',
        requireGPS: task.requireLocation,
        taskRequirements: {
          requireStartPhoto: task.requireStartPhoto,
          requireStartLocation: task.requireLocation
        },
        blockingValidation: true
      });

      // Обновляем список задач
      await loadTasks();
    } catch (error) {
      console.error('Error starting work:', error);
      alert(`Ошибка начала работы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  const handlePauseWork = async (task: AssignmentTask) => {
    try {
      await pauseWork('Работа приостановлена пользователем');
      await loadTasks();
    } catch (error) {
      console.error('Error pausing work:', error);
      alert(`Ошибка паузы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  const handleCompleteTask = async (task: AssignmentTask) => {
    try {
      await completeAssignmentTask(task.id);
      await loadTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      alert(`Ошибка завершения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  const handleOpenMenu = (task: AssignmentTask, anchorEl: HTMLElement) => {
    setSelectedTask(task);
    setMenuAnchorEl(anchorEl);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setSelectedTask(null);
  };

  const handleViewDetails = (task: AssignmentTask) => {
    setDetailsTask(task);
    setDetailsDrawerOpen(true);
  };

  const filterTasks = (tasks: AssignmentTask[]) => {
    return tasks.filter(task => {
      const matchesSearch = !searchTerm || 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  };

  const getTabLabel = (label: string, count: number) => (
    <Box display="flex" alignItems="center" gap={1}>
      {label}
      <Chip size="small" label={count} />
    </Box>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Загрузка задач...</Typography>
      </Container>
    );
  }

  const currentWorkingTaskId = currentEntry?.assignmentTaskId;
  const filteredMyTasks = filterTasks(myTasks);
  const filteredAssignedTasks = filterTasks(assignedByMeTasks);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Задачи сотрудникам
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Управление задачами для полевых сотрудников
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="large"
          onClick={() => setCreateDialogOpen(true)}
        >
          Создать задачу
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            placeholder="Поиск задач..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Статус</InputLabel>
            <Select
              value={statusFilter}
              label="Статус"
              onChange={(e) => setStatusFilter(e.target.value as AssignmentTaskStatus | 'all')}
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="assigned">Назначена</MenuItem>
              <MenuItem value="acknowledged">Подтверждена</MenuItem>
              <MenuItem value="started">Начата</MenuItem>
              <MenuItem value="in_progress">В работе</MenuItem>
              <MenuItem value="paused">На паузе</MenuItem>
              <MenuItem value="completed">Завершена</MenuItem>
              <MenuItem value="verified">Проверена</MenuItem>
              <MenuItem value="approved">Утверждена</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Приоритет</InputLabel>
            <Select
              value={priorityFilter}
              label="Приоритет"
              onChange={(e) => setPriorityFilter(e.target.value as AssignmentTaskPriority | 'all')}
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="low">Низкий</MenuItem>
              <MenuItem value="medium">Средний</MenuItem>
              <MenuItem value="high">Высокий</MenuItem>
              <MenuItem value="urgent">Срочный</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab 
            label={getTabLabel("Мои задачи", filteredMyTasks.length)} 
            icon={<TaskIcon />}
            iconPosition="start"
          />
          <Tab 
            label={getTabLabel("Назначенные мной", filteredAssignedTasks.length)}
            icon={<TaskIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* My Tasks Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {filteredMyTasks.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <TaskIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Нет задач
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  У вас пока нет назначенных задач
                </Typography>
              </Paper>
            </Grid>
          ) : (
            filteredMyTasks.map((task) => (
              <Grid item xs={12} sm={6} md={4} key={task.id}>
                <AssignmentTaskCard
                  task={task}
                  onStartWork={handleStartWork}
                  onPauseWork={handlePauseWork}
                  onCompleteTask={handleCompleteTask}
                  onViewDetails={handleViewDetails}
                  onOpenMenu={handleOpenMenu}
                  currentUserId={currentUser?.uid}
                  isWorking={currentWorkingTaskId === task.id}
                  canStartWork={!isWorking || currentWorkingTaskId === task.id}
                />
              </Grid>
            ))
          )}
        </Grid>
      </TabPanel>

      {/* Assigned by Me Tab */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {filteredAssignedTasks.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <TaskIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Нет задач
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Вы пока не назначали задач сотрудникам
                </Typography>
              </Paper>
            </Grid>
          ) : (
            filteredAssignedTasks.map((task) => (
              <Grid item xs={12} sm={6} md={4} key={task.id}>
                <AssignmentTaskCard
                  task={task}
                  onViewDetails={handleViewDetails}
                  onOpenMenu={handleOpenMenu}
                  currentUserId={currentUser?.uid}
                  canStartWork={false}
                />
              </Grid>
            ))
          )}
        </Grid>
      </TabPanel>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => {
          if (selectedTask) handleViewDetails(selectedTask);
          handleCloseMenu();
        }}>
          Просмотр деталей
        </MenuItem>
        <MenuItem onClick={handleCloseMenu}>
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleCloseMenu}>
          Комментарии
        </MenuItem>
      </Menu>

      {/* FAB for mobile */}
      <Fab
        color="primary"
        aria-label="add task"
        onClick={() => setCreateDialogOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
      >
        <AddIcon />
      </Fab>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onTaskCreated={loadTasks}
      />

      {/* Task Details Drawer */}
      <TaskDetailsDrawer
        open={detailsDrawerOpen}
        task={detailsTask}
        onClose={() => {
          setDetailsDrawerOpen(false);
          setDetailsTask(null);
        }}
        onStartWork={handleStartWork}
        onPauseWork={handlePauseWork}
        onCompleteTask={handleCompleteTask}
        currentUserId={currentUser?.uid}
        isWorking={currentWorkingTaskId === detailsTask?.id}
        canStartWork={!isWorking || currentWorkingTaskId === detailsTask?.id}
      />
    </Container>
  );
};

export default AssignmentTasksPage;
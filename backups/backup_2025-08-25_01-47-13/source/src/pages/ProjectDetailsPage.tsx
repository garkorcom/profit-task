import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Tabs, Tab, Alert, Chip, Button, Dialog, DialogTitle, DialogContent, FormControl, InputLabel, Select, MenuItem, TextField, DialogActions, List, ListItem, ListItemText, IconButton, ListItemIcon } from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Business as BusinessIcon, CalendarToday as CalendarIcon, AttachMoney as MoneyIcon, Add as AddIcon, People as PeopleIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { Project } from '../types/project';
import { Employee, TimesheetEntry } from '../api/employeeApi';
import { Task } from '../types/task';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useApi } from '../hooks/useApi';

const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const api = useApi();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [timesheet, setTimesheet] = useState<TimesheetEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<Partial<Task>>({ title: '', description: '' });
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [timeForm, setTimeForm] = useState<Partial<TimesheetEntry>>({ date: new Date(), hours: 1 });

  useEffect(() => {
    if (!currentUser || !projectId) {
      setLoading(false);
      setError("Проект не найден.");
      return;
    }

    const unsubscribe = api.getProjectStream(projectId, (data: Project | null) => {
      if (data) {
        setProject(data);
      } else {
        setError("Проект не найден или у вас нет доступа.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, projectId, api]);

  useEffect(() => {
    if (!project?.id) return;

    const unsubTimesheet = api.getTimesheetsByProjectStream(project.id, (data: TimesheetEntry[]) => setTimesheet(data));
    const unsubEmployees = api.getEmployeesStream((data: Employee[]) => setEmployees(data));
    const unsubTasks = api.getTasksByProjectStream(project.id, (data: Task[]) => setTasks(data));

    return () => {
      unsubTimesheet();
      unsubEmployees();
      unsubTasks();
    };
  }, [project, api]);

  const totalHours = useMemo(() => {
    return timesheet.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  }, [timesheet]);

  const teamHours = useMemo(() => {
    const hoursByEmployee: { [key: string]: { name: string, hours: number } } = {};
    timesheet.forEach(entry => {
      if (!hoursByEmployee[entry.employeeId]) {
        hoursByEmployee[entry.employeeId] = { name: (employees.find(e => e.id === entry.employeeId)?.fullName || 'Unknown'), hours: 0 };
      }
      hoursByEmployee[entry.employeeId].hours += entry.hours || 0;
    });
    return Object.values(hoursByEmployee).sort((a, b) => b.hours - a.hours);
  }, [timesheet, employees]);

  const handleAddTimeEntry = async () => {
    if (!currentUser || !project?.id || !timeForm.employeeId || !timeForm.hours) return;
    const employee = employees.find(e => e.id === timeForm.employeeId);
    if (!employee) return;

    const newEntry: Omit<TimesheetEntry, 'id' | 'createdAt' | 'updatedAt' | 'date' | 'approvedAt'> & { date: string } = {
      employeeId: timeForm.employeeId,
      projectId: project.id,
      date: (timeForm.date instanceof Date ? timeForm.date : new Date()).toISOString().slice(0, 10),
      hours: Number(timeForm.hours),
      description: timeForm.description || '',
      rate: 0,
      status: 'submitted',
    };
    
    await api.addTimesheetEntry(newEntry);
    setTimeDialogOpen(false);
    setTimeForm({ date: new Date(), hours: 1 });
  };

  const handleAddTask = async () => {
    if (!currentUser || !project?.id || !taskForm.title) return;
    
    const newTask: Omit<Task, 'id'|'createdAt'|'updatedAt'|'completedAt'|'deletedAt'> = {
      projectId: project.id,
      status: 'new',
      title: taskForm.title,
      code: `T-${Date.now()}`,
      type: 'task',
      priority: 'medium',
      progress: 0,
      estimatedHours: 0,
      actualHours: 0,
      remainingHours: 0,
      assigneeId: '',
      createdBy: currentUser.uid,
    };

    await api.addTask(newTask);
    setTaskDialogOpen(false);
    setTaskForm({ title: '', description: '' });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!project) return <Alert severity="warning">Проект не найден.</Alert>;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')} sx={{ mb: 2 }}>
        К списку проектов
      </Button>
      
      <Typography variant="h4" gutterBottom>{project.name}</Typography>
      <Typography variant="body1" color="text.secondary" mb={2}>{project.description}</Typography>
      
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Chip icon={<BusinessIcon />} label={`Клиент: ${project.clientId}`} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Chip icon={<CalendarIcon />} label={`Сроки: ${new Date(project.plannedStartDate).toLocaleDateString()} - ${project.plannedEndDate ? new Date(project.plannedEndDate).toLocaleDateString() : '...'}`} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Chip icon={<MoneyIcon />} label={`Бюджет: ${project.budget || 0} ${project.currency} / Факт: ${project.actualCost || 0} ${project.currency}`} color={ (project.actualCost || 0) > (project.budget || 0) ? 'error' : 'success'} />
        </Grid>
        <Grid item xs={12}>
          <Chip label={`Затрачено часов: ${totalHours}`} variant="outlined" />
        </Grid>
      </Grid>
      
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Обзор" />
        <Tab label="Задачи" />
        <Tab label="Команда" />
        <Tab label="Сметы" />
        <Tab label="Финансы" />
        <Tab label="Документы" />
        <Tab label="Учет времени" />
      </Tabs>
      
      <Box mt={3}>
        {activeTab === 0 && <Typography>Обзор проекта...</Typography>}
        {activeTab === 1 && (
           <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Задачи проекта</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTaskDialogOpen(true)}>
                Новая задача
              </Button>
            </Box>
            <List>
              {tasks.map(task => (
                <ListItem key={task.id} divider>
                  <ListItemText 
                    primary={task.title}
                    secondary={task.description}
                  />
                   <Chip label={task.status || 'new'} size="small" />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        {activeTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>Команда проекта</Typography>
            <List>
              {teamHours.map(member => (
                <ListItem key={member.name} divider>
                  <ListItemIcon>
                    <PeopleIcon />
                  </ListItemIcon>
                  <ListItemText primary={member.name} secondary={`Всего часов: ${member.hours.toFixed(2)}`} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        {activeTab === 3 && <Typography>Сметы проекта...</Typography>}
        {activeTab === 4 && <Typography>Финансы проекта...</Typography>}
        {activeTab === 5 && <Typography>Документы проекта...</Typography>}
        {activeTab === 6 && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Затраченное время</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTimeDialogOpen(true)}>
                Добавить время
              </Button>
            </Box>
            <List>
              {timesheet.map(entry => (
                <ListItem key={entry.id} divider>
                  <ListItemText 
                    primary={`${(employees.find(e => e.id === entry.employeeId)?.fullName || 'Unknown')} - ${entry.hours} ч.`}
                    secondary={`${new Date(entry.date).toLocaleDateString()} - ${entry.description || 'Без описания'}`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Box>

      <Dialog open={timeDialogOpen} onClose={() => setTimeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить запись о времени</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <FormControl fullWidth>
              <InputLabel>Сотрудник</InputLabel>
              <Select
                value={timeForm.employeeId || ''}
                label="Сотрудник"
                onChange={(e) => setTimeForm({ ...timeForm, employeeId: e.target.value })}
              >
                {employees.map(e => (
                  <MenuItem key={e.id} value={e.id}>{e.fullName}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Дата"
              type="date"
              value={timeForm.date instanceof Date ? timeForm.date.toISOString().slice(0, 10) : ''}
              onChange={(e) => setTimeForm({ ...timeForm, date: new Date(e.target.value) })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Часы"
              type="number"
              value={timeForm.hours}
              onChange={(e) => setTimeForm({ ...timeForm, hours: Number(e.target.value) })}
            />
            <TextField
              label="Описание работ"
              multiline
              rows={2}
              value={timeForm.description || ''}
              onChange={(e) => setTimeForm({ ...timeForm, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimeDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleAddTimeEntry} variant="contained">Сохранить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Новая задача в проекте "{project.name}"</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название задачи"
            fullWidth
            value={taskForm.title || ''}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            sx={{ mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Описание"
            fullWidth
            multiline
            rows={4}
            value={taskForm.description || ''}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleAddTask} variant="contained">Создать</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectDetailsPage;

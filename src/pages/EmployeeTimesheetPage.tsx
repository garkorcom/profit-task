import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
} from '@mui/material';
import { ArrowBack as BackIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { TimesheetEntry, Employee } from '../api/employeeApi';
import { Project } from '../api/projectApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useApi } from '../hooks/useApi';

const EmployeeTimesheetPage: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const api = useApi();
  
  const [timesheet, setTimesheet] = useState<TimesheetEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<TimesheetEntry>>({
    date: new Date(),
    hours: 8,
    projectId: '',
    description: ''
  });

  useEffect(() => {
    if (!currentUser || !employeeId) return;

    // Загружаем данные сотрудника
    const unsubEmployees = api.getEmployeesStream((employees: Employee[]) => {
      const emp = employees.find(e => e.id === employeeId);
      setEmployee(emp || null);
    });

    // Загружаем табель сотрудника
    const unsubTimesheet = api.getTimesheetsByEmployeeStream(
      employeeId,
      (entries: TimesheetEntry[]) => {
        setTimesheet(entries);
        setLoading(false);
      }
    );

    // Загружаем проекты
    const unsubProjects = api.getProjectsStream((data: Project[]) => setProjects(data));

    return () => {
      unsubEmployees();
      unsubTimesheet();
      unsubProjects();
    };
  }, [currentUser, employeeId]);

  const handleAddEntry = async () => {
    if (!currentUser || !employee || !form.projectId || !form.date || !form.hours) return;

    const project = projects.find(p => p.id === form.projectId);
    if (!project) return;

    try {
      const entryToSave: Omit<TimesheetEntry, 'id'> = {
        employeeId: employee.id,
        projectId: project.id,
        date: form.date || new Date(),
        hours: form.hours || 0,
        description: form.description || '',
        rate: 0,
        status: 'submitted',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await api.addTimesheetEntry(entryToSave as any);
      
      setDialogOpen(false);
      setForm({
        date: new Date(),
        hours: 8,
        projectId: '',
        description: ''
      });
    } catch (error) {
      console.error('Failed to add timesheet entry:', error);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!currentUser || !window.confirm('Удалить запись?')) return;
    
    try {
      await api.deleteTimesheetEntry(entryId);
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  // Группируем записи по месяцам
  const groupedByMonth = timesheet.reduce((acc, entry) => {
    const month = new Date(entry.date).toISOString().substring(0, 7); // YYYY-MM
    if (!acc[month]) acc[month] = [];
    acc[month].push(entry);
    return acc;
  }, {} as Record<string, TimesheetEntry[]>);

  // Считаем общее количество часов
  const totalHours = timesheet.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  
  // Считаем часы за текущий месяц
  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentMonthHours = (groupedByMonth[currentMonth] || [])
    .reduce((sum, entry) => sum + (entry.hours || 0), 0);

  if (loading) return <LoadingSpinner />;
  if (!employee) return <Typography>Сотрудник не найден</Typography>;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate('/employees')}>
          <BackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4">
            Табель: {employee.fullName}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {employee.position} {employee.department && `• ${employee.department}`}
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Добавить запись
        </Button>
      </Box>

      {/* Статистика */}
      <Box display="flex" gap={2} mb={3}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Часов за текущий месяц
          </Typography>
          <Typography variant="h4">
            {currentMonthHours}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Всего часов
          </Typography>
          <Typography variant="h4">
            {totalHours}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Записей в табеле
          </Typography>
          <Typography variant="h4">
            {timesheet.length}
          </Typography>
        </Paper>
      </Box>

      {/* Табель по месяцам */}
      {Object.entries(groupedByMonth)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, entries]) => {
          const monthHours = entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
          const monthName = new Date(month + '-01').toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
          });

          return (
            <Box key={month} mb={3}>
              <Box display="flex" alignItems="center" gap={2} mb={1}>
                <Typography variant="h6">
                  {monthName}
                </Typography>
                <Chip label={`${monthHours} ч.`} size="small" />
              </Box>
              
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Дата</TableCell>
                      <TableCell>Проект</TableCell>
                      <TableCell>Описание</TableCell>
                      <TableCell align="right">Часы</TableCell>
                      <TableCell align="center">Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {new Date(entry.date).toLocaleDateString('en-US')}
                          </TableCell>
                          <TableCell>{projects.find(p => p.id === entry.projectId)?.name || entry.projectId}</TableCell>
                          <TableCell>{entry.description || '—'}</TableCell>
                          <TableCell align="right">{entry.hours}</TableCell>
                          <TableCell align="center">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteEntry(entry.id || '')}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          );
        })}

      {timesheet.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Нет записей в табеле
          </Typography>
        </Paper>
      )}

      {/* Диалог добавления записи */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить запись в табель</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              type="date"
              label="Дата"
              value={form.date ? new Date(form.date).toISOString().split('T')[0] : ''}
              onChange={(e) => setForm({ ...form, date: new Date(e.target.value) })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            
            <FormControl fullWidth>
              <InputLabel>Проект</InputLabel>
              <Select
                value={form.projectId}
                label="Проект"
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              >
                {projects.map(p => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              type="number"
              label="Часы"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: parseFloat(e.target.value) })}
              inputProps={{ min: 0.5, max: 24, step: 0.5 }}
              fullWidth
            />

            <TextField
              label="Описание работы"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleAddEntry} 
            variant="contained"
            disabled={!form.projectId || !form.date || !form.hours}
          >
            Добавить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeTimesheetPage;



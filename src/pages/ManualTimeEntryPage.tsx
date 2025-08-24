import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, TextField, Button, FormControl, InputLabel, Select, MenuItem, Autocomplete } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { useApi } from '../hooks/useApi';
import { Project } from '../types/project';
import { Task } from '../types/task';
import { TimesheetEntry } from '../types/timesheet';
import { Employee } from '../api/employeeApi';

const ManualTimeEntryPage: React.FC = () => {
  const { currentUser } = useAuth();
  const api = useApi();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const initialFormState: Partial<TimesheetEntry> = {
    date: new Date(),
    hours: 1,
    employeeId: currentUser?.uid || '',
  };
  const [form, setForm] = useState<Partial<TimesheetEntry>>(initialFormState);

  useEffect(() => {
    if (!currentUser) return;
    api.getProjectsStream(setProjects);
    // Optionally load employees if needed later
    // api.getEmployeesStream(setEmployees);
  }, [currentUser, api]);

  useEffect(() => {
    if (selectedProjectId) {
      api.getTasksByProjectStream(selectedProjectId, setTasks);
    } else {
      setTasks([]);
    }
  }, [selectedProjectId, api]);

  const projectOptions = useMemo(() => projects.map(p => ({ label: p.name, id: p.id! })), [projects]);
  const taskOptions = useMemo(() => tasks.map(t => ({ label: t.title, id: t.id! })), [tasks]);

  const handleSave = async () => {
    if (!currentUser || !form.date || !form.hours || !form.projectId || !form.taskId || !form.employeeId) {
        alert('Пожалуйста, заполните все поля.');
        return;
    }
    
    const newEntry: Omit<TimesheetEntry, 'id'> = {
        employeeId: form.employeeId,
        projectId: form.projectId,
        taskId: form.taskId,
        date: form.date,
        hours: form.hours,
        description: form.description || '',
        status: 'submitted',
        rate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    try {
        await api.addTimesheetEntry(newEntry);
        alert('Время добавлено!');
        setForm(initialFormState);
        setSelectedProjectId(null);
    } catch (error) {
        alert('Ошибка при добавлении времени.');
        console.error(error);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Ручной ввод времени</Typography>
      <Box mt={3} display="flex" flexDirection="column" gap={2} maxWidth={600}>
        <TextField
          label="Дата"
          type="date"
          value={form.date instanceof Date ? form.date.toISOString().slice(0, 10) : ''}
          onChange={(e) => setForm({ ...form, date: new Date(e.target.value) })}
          InputLabelProps={{ shrink: true }}
        />
        <Autocomplete
          options={projectOptions}
          getOptionLabel={(option) => option.label}
          onChange={(e, value) => {
            setSelectedProjectId(value?.id || null);
            setForm({...form, projectId: value?.id, taskId: undefined});
          }}
          renderInput={(params) => <TextField {...params} label="Проект" />}
        />
        
        {selectedProjectId && (
            <Autocomplete
                options={taskOptions}
                getOptionLabel={(option) => option.label}
                onChange={(e, value) => setForm({...form, taskId: value?.id})}
                renderInput={(params) => <TextField {...params} label="Задача" />}
            />
        )}

        <TextField
          label="Отработанные часы"
          type="number"
          value={form.hours}
          onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })}
        />
        <TextField
          label="Комментарий"
          multiline
          rows={3}
          value={form.description || ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Button variant="contained" onClick={handleSave}>Сохранить</Button>
      </Box>
    </Box>
  );
};

export default ManualTimeEntryPage;

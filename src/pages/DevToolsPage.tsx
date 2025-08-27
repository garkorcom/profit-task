import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Alert, Stack, FormControl, InputLabel, Select, MenuItem, AlertTitle } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile } from '../api/userApi';
import { addProject, Project } from '../api/projectApi';
import { addTask, Task } from '../api/taskApi';
import { getTasksStream } from '../api/taskApi';
import { getEstimatesStream, Estimate } from '../api/estimateApi';
import { getProjectsStream } from '../api/projectApi';
import { db } from '../firebase/firebase';
import { writeBatch, doc } from 'firebase/firestore';

const DevToolsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    if (currentUser) {
      getUserProfile(currentUser.uid).then(profile => {
        setUserProfile(profile);
        setLoading(false);
      });
      const unsubTasks = getTasksStream(currentUser.uid, setTasks);
      const unsubEstimates = getEstimatesStream(currentUser.uid, '', setEstimates); // Загружаем все сметы
      const unsubProjects = getProjectsStream(currentUser.uid, (projectList) => {
        setProjects(projectList);
        // Выбираем первый проект по умолчанию
        if (projectList.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projectList[0].id);
        }
      });
      return () => {
        unsubTasks();
        unsubEstimates();
        unsubProjects();
      };
    }
  }, [currentUser, selectedProjectId]);

  const handleCreateTestProject = async () => {
    if (!currentUser) return;
    setMessage('Создание тестового проекта...');
    try {
      const newProject: Omit<Project, 'id'> = {
        name: `Тестовый проект ${new Date().toLocaleTimeString()}`,
        status: 'active',
        createdAt: new Date(),
      };
      await addProject(currentUser.uid, newProject);
      setMessage('Тестовый проект успешно создан!');
    } catch (error: any) {
      setMessage(`Ошибка при создании проекта: ${error.message}`);
    }
  };

  const handleCreateTestTask = async () => {
    if (!currentUser || !selectedProjectId) {
        setMessage('Ошибка: Сначала выберите или создайте проект.');
        return;
    }
    setMessage('Создание тестовой задачи...');
    try {
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      const newTask: Omit<Task, 'id'> = {
        task: `Тестовая задача ${new Date().toLocaleTimeString()}`,
        status: 'new',
        priority: 'medium',
        createdAt: new Date(),
        projectId: selectedProjectId, // Привязываем к проекту
        projectName: selectedProject?.name || ''
      };
      await addTask(currentUser.uid, newTask);
      setMessage('Тестовая задача успешно создана!');
    } catch (error: any) {
      setMessage(`Ошибка при создании задачи: ${error.message}`);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Инструменты разработчика</Typography>
      
      <Alert severity="warning" sx={{ mb: 3 }}>
        <AlertTitle>Внимание!</AlertTitle>
        Эта страница предназначена для тестирования и отладки. Не удаляйте ее.
      </Alert>

      {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Профиль пользователя</Typography>
        {loading ? <CircularProgress /> : <pre>{JSON.stringify(userProfile, null, 2)}</pre>}
      </Paper>

      <Stack spacing={2} direction="row" alignItems="center" sx={{ mb: 3 }}>
        <Button variant="contained" onClick={handleCreateTestProject}>Создать тестовый проект</Button>
        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel>Проект для задачи</InputLabel>
          <Select
            value={selectedProjectId}
            label="Проект для задачи"
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" color="secondary" onClick={handleCreateTestTask} disabled={!selectedProjectId}>
            Создать тестовую задачу
        </Button>
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Список задач ({tasks.length})</Typography>
        {tasks.length > 0 ? (
          <pre>{JSON.stringify(tasks, null, 2)}</pre>
        ) : (
          <Typography>Задачи не найдены.</Typography>
        )}
      </Paper>
      
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Список смет ({estimates.length})</Typography>
        {estimates.length > 0 ? (
          <pre>{JSON.stringify(estimates, null, 2)}</pre>
        ) : (
          <Typography>Сметы не найдены.</Typography>
        )}
      </Paper>
    </Box>
  );
};

export default DevToolsPage;

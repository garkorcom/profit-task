import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { getProjectsStream, Project } from '../api/projectApi';
import { getTasksStream, Task } from '../api/taskApi';
import { getEmployeesStream, Employee } from '../api/employeeApi';

const TestPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!currentUser) {
      setError('Пользователь не авторизован');
      return;
    }

    try {
      // Загружаем проекты
      const unsubProjects = getProjectsStream(currentUser.uid, (data) => {
        console.log('Проекты загружены:', data);
        setProjects(data);
      });

      // Загружаем задачи
      const unsubTasks = getTasksStream(currentUser.uid, (data) => {
        console.log('Задачи загружены:', data);
        setTasks(data);
      });

      // Загружаем сотрудников
      const unsubEmployees = getEmployeesStream(currentUser.uid, (data) => {
        console.log('Сотрудники загружены:', data);
        setEmployees(data);
      });

      return () => {
        unsubProjects();
        unsubTasks();
        unsubEmployees();
      };
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err);
      setError('Ошибка при загрузке данных: ' + err);
    }
  }, [currentUser]);

  const testStartWork = () => {
    console.log('Тест кнопки "Начать работу"');
    console.log('Текущий пользователь:', currentUser);
    console.log('localStorage:', {
      workSession: localStorage.getItem('workSession'),
      selectedEmployee: localStorage.getItem('selectedEmployee'),
      selectedTaskForWork: localStorage.getItem('selectedTaskForWork')
    });
  };

  const clearLocalStorage = () => {
    localStorage.clear();
    console.log('localStorage очищен');
    window.location.reload();
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Тестовая страница</Typography>
      
      {error && (
        <Card sx={{ mb: 2, bgcolor: 'error.light' }}>
          <CardContent>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Статус авторизации</Typography>
          <Typography>Email: {currentUser?.email || 'Не авторизован'}</Typography>
          <Typography>UID: {currentUser?.uid || 'Нет'}</Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Загруженные данные</Typography>
          <Typography>Проектов: {projects.length}</Typography>
          <Typography>Задач: {tasks.length}</Typography>
          <Typography>Сотрудников: {employees.length}</Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Проекты</Typography>
          {projects.map(p => (
            <Typography key={p.id}>- {p.name} (ID: {p.id})</Typography>
          ))}
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Задачи</Typography>
          {tasks.map(t => (
            <Typography key={t.id}>- {t.name} (Статус: {t.status})</Typography>
          ))}
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Действия</Typography>
          <Box display="flex" gap={2} mt={2}>
            <Button variant="contained" onClick={testStartWork}>
              Тест "Начать работу"
            </Button>
            <Button variant="outlined" color="error" onClick={clearLocalStorage}>
              Очистить localStorage
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TestPage;



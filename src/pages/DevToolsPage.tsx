import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Alert, Stack, FormControl, InputLabel, Select, MenuItem, AlertTitle } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile } from '../api/userApi';
import { addProject, Project } from '../api/projectApi';
import { addTask, Task } from '../api/taskApi';
import { getTasksStream } from '../api/taskApi';
import { getEstimatesStream, Estimate } from '../legacy/api/estimateApi';
import { getProjectsStream } from '../api/projectApi';
import { cleanOldContractors, previewOldContractors } from '../utils/cleanOldContractors';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningIcon from '@mui/icons-material/Warning';
import { Card, CardContent, CardActions, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText } from '@mui/material';

const DevToolsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Состояния для управления старыми контрагентами
  const [oldContractorsPreview, setOldContractorsPreview] = useState<any>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingContractors, setDeletingContractors] = useState(false);

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

  // Функции для работы со старыми контрагентами
  const handlePreviewOldContractors = async () => {
    if (!currentUser) return;
    
    setMessage('Загрузка старых контрагентов...');
    try {
      const result = await previewOldContractors(currentUser.uid);
      setOldContractorsPreview(result);
      setPreviewDialogOpen(true);
      setMessage(result.message);
    } catch (error: any) {
      setMessage(`Ошибка при загрузке контрагентов: ${error.message}`);
    }
  };

  const handleDeleteOldContractors = async () => {
    if (!currentUser) return;
    
    setDeletingContractors(true);
    setMessage('Удаление старых контрагентов...');
    
    try {
      const result = await cleanOldContractors(currentUser.uid);
      setMessage(`✅ ${result.message}`);
      setConfirmDeleteOpen(false);
      setPreviewDialogOpen(false);
      setOldContractorsPreview(null);
    } catch (error: any) {
      setMessage(`❌ Ошибка при удалении: ${error.message}`);
    } finally {
      setDeletingContractors(false);
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
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Список смет ({estimates.length})</Typography>
        {estimates.length > 0 ? (
          <pre>{JSON.stringify(estimates, null, 2)}</pre>
        ) : (
          <Typography>Сметы не найдены.</Typography>
        )}
      </Paper>
      
      {/* Секция управления старыми контрагентами */}
      <Card sx={{ mt: 3, border: '2px solid', borderColor: 'warning.main' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <WarningIcon color="warning" />
            <Typography variant="h6" color="warning.main">
              Управление старыми контрагентами
            </Typography>
          </Stack>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Внимание!</AlertTitle>
            Эти действия помогут очистить старые записи контрагентов (contractors) из базы данных.
            Убедитесь, что у вас есть резервная копия перед удалением.
          </Alert>
          
          <Typography variant="body2" color="text.secondary" mb={2}>
            Старые контрагенты могут появляться при создании проектов. 
            Используйте эти инструменты для их просмотра и удаления.
          </Typography>
        </CardContent>
        
        <CardActions>
          <Button
            variant="outlined"
            color="info"
            startIcon={<VisibilityIcon />}
            onClick={handlePreviewOldContractors}
          >
            Просмотреть старые контрагенты
          </Button>
        </CardActions>
      </Card>
      
      {/* Диалог предварительного просмотра */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <WarningIcon color="warning" />
            <Typography>Старые контрагенты</Typography>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          {oldContractorsPreview && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Найдено контрагентов: {oldContractorsPreview.count}
              </Alert>
              
              {oldContractorsPreview.contractors.length > 0 ? (
                <List>
                  {oldContractorsPreview.contractors.map((contractor: any) => (
                    <ListItem key={contractor.id}>
                      <ListItemText
                        primary={contractor.name || 'Без имени'}
                        secondary={
                          <>
                            ID: {contractor.id}
                            {contractor.email && ` | Email: ${contractor.email}`}
                            {contractor.phone && ` | Телефон: ${contractor.phone}`}
                            {contractor.type && ` | Тип: ${contractor.type}`}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  Старые контрагенты не найдены
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>
            Закрыть
          </Button>
          {oldContractorsPreview?.count > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setConfirmDeleteOpen(true)}
            >
              Удалить все ({oldContractorsPreview.count})
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Диалог подтверждения удаления */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <DeleteIcon color="error" />
            <Typography>Подтверждение удаления</Typography>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Это действие необратимо!</AlertTitle>
            Вы уверены, что хотите удалить {oldContractorsPreview?.count} старых контрагентов?
          </Alert>
          
          <Typography variant="body2">
            После удаления эти контрагенты больше не будут появляться при создании проектов.
          </Typography>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setConfirmDeleteOpen(false)}
            disabled={deletingContractors}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={deletingContractors ? <CircularProgress size={20} /> : <DeleteIcon />}
            onClick={handleDeleteOldContractors}
            disabled={deletingContractors}
          >
            {deletingContractors ? 'Удаление...' : 'Удалить безвозвратно'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DevToolsPage;

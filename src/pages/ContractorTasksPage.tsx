import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Chip, IconButton, Button } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { getTasksByContractorStream, Task, deleteTask, addTask } from '../api/taskApi';
import { useAuth } from '../auth/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getContractorStream, Contractor } from '../api/contractorApi';
import { Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon, Add as AddIcon } from '@mui/icons-material';
import { getPriorityColor, getStatusColor } from '../utils/taskUi';
import Notification from '../components/common/Notification';

const ContractorTasksPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { contractorId } = useParams<{ contractorId: string }>();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    if (!currentUser || !contractorId) return;
    const unsubTasks = getTasksByContractorStream(currentUser.uid, contractorId, (data) => {
      setTasks(data);
      setLoading(false);
    });
    const unsubContractor = getContractorStream(currentUser.uid, contractorId, (data) => {
      setContractor(data);
    });
    return () => {
      unsubTasks();
      unsubContractor();
    };
  }, [currentUser, contractorId]);

  const handleCreateQuick = async () => {
    if (!currentUser || !contractor) return;
    setCreating(true);
    const newTaskBase = {
      task: `Задача для ${contractor.name}`,
      priority: 'medium',
      status: 'pending',
      contractorId: contractor.id,
      contractorName: contractor.name,
    } as Partial<Task>;
    try {
      // Оптимистическое обновление списка
      const tempId = `temp-${Date.now()}`;
      setTasks(prev => [{ id: tempId, ...newTaskBase } as Task, ...prev]);

      const id = await addTask(currentUser.uid, newTaskBase as any);

      // Заменим временный id на реальный, если стрим ещё не доставил документ
      setTasks(prev => prev.map(t => (t.id === tempId ? { ...t, id } : t)));
      setNotification({ open: true, message: 'Задача создана', severity: 'success' });
    } catch (e) {
      console.error(e);
      // Откатим оптимистическое добавление
      setTasks(prev => prev.filter(t => !t.id.startsWith('temp-')));
      setNotification({ open: true, message: 'Не удалось создать задачу', severity: 'error' });
    } finally {
      setCreating(false);
    }
  };

  if (loading && !contractor) return <LoadingSpinner />;

  return (
    <Box>
      <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/contractors')}>
          К контрагентам
        </Button>
        <Typography variant="h5">
          Задачи: {contractor?.name || 'Контрагент'}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateQuick} disabled={creating || !contractor}>
          {creating ? 'Создание...' : 'Быстрая задача'}
        </Button>
      </Box>

      {loading ? (
        <LoadingSpinner />
      ) : tasks.length > 0 ? tasks.map(task => (
        <Card key={task.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box flex={1}>
                <Typography variant="h6" gutterBottom>{task.task}</Typography>
                {task.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {task.description}
                  </Typography>
                )}
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Chip label={task.priority || 'medium'} color={getPriorityColor(task.priority)} size="small" />
                  <Chip label={task.status || 'pending'} color={getStatusColor(task.status)} size="small" />
                </Box>
              </Box>
              <Box>
                <IconButton aria-label="edit-task" onClick={() => navigate('/tasks')} size="small">
                  <EditIcon />
                </IconButton>
                <IconButton aria-label="delete-task" onClick={async () => currentUser && await deleteTask(currentUser.uid, task.id)} size="small" color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )) : (
        <Typography>Задач для этого контрагента пока нет.</Typography>
      )}

      <Notification open={notification.open} message={notification.message} severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })} />
    </Box>
  );
};

export default ContractorTasksPage;

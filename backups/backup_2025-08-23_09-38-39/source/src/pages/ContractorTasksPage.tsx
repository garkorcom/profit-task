import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Chip, IconButton, Button } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Task } from '../types/task';
import { Contractor } from '../types/models';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon, Add as AddIcon } from '@mui/icons-material';
import { getPriorityColor, getStatusColor } from '../utils/taskUi';
import Notification from '../components/common/Notification';
import { useApi } from '../hooks/useApi';

const ContractorTasksPage: React.FC = () => {
  const { contractorId } = useParams<{ contractorId: string }>();
  const { currentUser } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    if (!currentUser || !contractorId) return;
    const unsubTasks = api.getTasksByProjectStream(contractorId, (data: Task[]) => {
      setTasks(data);
      setLoading(false);
    });
    // Assuming you have a getContractorStream in your api
    // const unsubContractor = api.getContractorStream(currentUser.uid, contractorId, (data) => {
    //   setContractor(data);
    // });
    return () => {
      unsubTasks();
      // unsubContractor();
    };
  }, [currentUser, contractorId, api]);

  const handleCreateQuick = async () => {
    if (!currentUser || !contractor) return;
    setCreating(true);
    const newTaskBase = {
      title: `Задача для ${contractor.name}`,
      priority: 'medium',
      status: 'new',
      projectId: '', // Needs to be assigned later
      code: `T-${Date.now()}`,
      type: 'task',
      progress: 0,
      estimatedHours: 0,
      actualHours: 0,
      remainingHours: 0,
      assigneeId: '',
      createdBy: currentUser.uid,
    } as Omit<Task, 'id'|'createdAt'|'updatedAt'|'deletedAt'|'completedAt'>;
    try {
      const tempId = `temp-${Date.now()}`;
      setTasks(prev => [{ id: tempId, ...newTaskBase } as unknown as Task, ...prev]);
      const id = await api.addTask(newTaskBase as any);
      setTasks(prev => prev.map(t => (t.id === tempId ? { ...t, id } : t)));
      setNotification({ open: true, message: 'Задача создана', severity: 'success' });
    } catch (e: any) {
      console.error(e);
      setTasks(prev => prev.filter(t => t.id && !t.id.startsWith('temp-')));
      setNotification({ open: true, message: 'Не удалось создать задачу', severity: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDialog = (task?: Task) => {
    // Dialog logic to be implemented
    console.log('Editing task:', task);
  };

  if (loading) return <LoadingSpinner />;
  if (!contractor) return <Typography>Контрагент не найден.</Typography>;

  return (
    <Box>
       <Box display="flex" alignItems="center" mb={2}>
        <IconButton onClick={() => navigate('/contractors')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ ml: 2 }}>
          Задачи для: {contractor.name}
        </Typography>
      </Box>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleCreateQuick}
        disabled={creating}
        sx={{ mb: 2 }}
      >
        {creating ? 'Создание...' : 'Быстро создать задачу'}
      </Button>

      <Box>
        {tasks.map((task) => (
          <Card key={task.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box flex={1}>
                  <Typography variant="h6" gutterBottom>{task.title}</Typography>
                  {task.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {task.description}
                    </Typography>
                  )}
                  <Box display="flex" gap={1}>
                    <Chip label={task.priority} size="small" color={getPriorityColor(task.priority)} />
                    <Chip label={task.status} size="small" color={getStatusColor(task.status)} />
                  </Box>
                </Box>
                <Box>
                  <Box display="flex" flexDirection="column" gap={1} alignItems="flex-end">
                    <IconButton aria-label="edit-task" onClick={() => handleOpenDialog(task)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton aria-label="delete-task" onClick={async () => currentUser && await api.deleteTask(task.id!)} size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Notification {...notification} onClose={() => setNotification(p => ({ ...p, open: false }))} />
    </Box>
  );
};

export default ContractorTasksPage;

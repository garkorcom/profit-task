import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Chip, IconButton, Button } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { getTasksByContractorStream, Task, deleteTask, addTask } from '../api/taskApi';
import { useAuth } from '../auth/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getContractorStream, Contractor } from '../api/contractorApi';
import { Edit as EditIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon, Add as AddIcon } from '@mui/icons-material';
import { getPriorityColor, getStatusColor } from '../utils/taskUi';

const ContractorTasksPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { contractorId } = useParams<{ contractorId: string }>();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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

  if (loading) return <LoadingSpinner />;

  const handleCreateQuick = async () => {
    if (!currentUser || !contractor) return;
    setCreating(true);
    try {
      await addTask(currentUser.uid, {
        task: `Задача для ${contractor.name}`,
        priority: 'medium',
        status: 'pending',
        contractorId: contractor.id,
        contractorName: contractor.name,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box>
      <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/contractors')}>
          К контрагентам
        </Button>
        <Typography variant="h5">
          Задачи: {contractor?.name || 'Контрагент'}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateQuick} disabled={creating}>
          {creating ? 'Создание...' : 'Быстрая задача'}
        </Button>
      </Box>

      {tasks.length > 0 ? tasks.map(task => (
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
    </Box>
  );
};

export default ContractorTasksPage;

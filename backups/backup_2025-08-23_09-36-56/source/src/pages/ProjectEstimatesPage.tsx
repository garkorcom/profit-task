import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, IconButton, Chip, Alert } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Estimate, getEstimatesStream, deleteEstimate } from '../api/estimateApi';
import { getProjectStream, Project } from '../api/projectApi'; // Assuming you have this
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';
import ConfirmDialog from '../components/common/ConfirmDialog';

const ProjectEstimatesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentUser, ownerUid } = useAuth();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<Estimate | null>(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    const uid = ownerUid || currentUser?.uid;
    if (!uid || !projectId) return;

    const unsubProject = getProjectStream(uid, projectId, setProject);
    const unsubEstimates = getEstimatesStream(uid, projectId, (data) => {
      setEstimates(data);
      setLoading(false);
    });

    return () => {
      unsubProject();
      unsubEstimates();
    };
  }, [currentUser, ownerUid, projectId]);

  const handleDelete = async () => {
    const uid = ownerUid || currentUser?.uid;
    if (!uid || !confirmDelete || !projectId) return;
    try {
      await deleteEstimate(uid, confirmDelete.id, projectId);
      setNotification({ open: true, message: 'Смета удалена', severity: 'success' });
    } catch (error) {
      setNotification({ open: true, message: 'Ошибка при удалении', severity: 'error' });
    }
    setConfirmDelete(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Сметы по проекту: {project?.name || '...'}
      </Typography>
      
      <Button 
        variant="contained" 
        startIcon={<AddIcon />} 
        onClick={() => navigate(`/projects/${projectId}/estimates/new/constructor`)}
        sx={{ mb: 2 }}
      >
        Создать смету
      </Button>

      {estimates.length === 0 ? (
        <Alert severity="info">Для этого проекта еще не создано ни одной сметы.</Alert>
      ) : (
        estimates.map((estimate) => (
          <Card key={estimate.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between">
                <Box>
                  <Typography variant="h6">{estimate.name || `Смета №${estimate.number}`}</Typography>
                  <Typography variant="body2" color="text.secondary">{estimate.description}</Typography>
                  <Chip label={`Сумма: ${(estimate.total || 0).toFixed(2)} ₽`} sx={{ mt: 1 }} />
                </Box>
                <Box>
                  <IconButton onClick={() => navigate(`/projects/${projectId}/estimates/${estimate.id}/constructor`)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => setConfirmDelete(estimate)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      <ConfirmDialog 
        open={!!confirmDelete}
        title="Удалить смету?"
        message={`Вы уверены, что хотите удалить смету №${confirmDelete?.number}?`}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />

      <Notification 
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification({ ...notification, open: false })}
      />
    </Box>
  );
};

export default ProjectEstimatesPage;

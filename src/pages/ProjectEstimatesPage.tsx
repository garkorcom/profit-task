import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, IconButton, Chip, Alert, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, PhoneAndroid as MobileIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Estimate, getEstimatesStream, deleteEstimate } from '../api/estimateApi';
import { createShipmentFromEstimate } from '../api/shipmentApi';
import { getWarehousesStream, Warehouse } from '../api/inventoryApi';
import { getProjectStream, Project } from '../api/projectApi'; // Assuming you have this
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';
import ConfirmDialog from '../components/common/ConfirmDialog';

const ProjectEstimatesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [shipmentDlg, setShipmentDlg] = useState<{ open: boolean; estimate: Estimate | null; warehouseId: string }>({ open: false, estimate: null, warehouseId: '' });
  const [confirmDelete, setConfirmDelete] = useState<Estimate | null>(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    if (!currentUser || !projectId) return;

    const unsubProject = getProjectStream(currentUser.uid, projectId, setProject);
    const unsubEstimates = getEstimatesStream(currentUser.uid, projectId, (data) => {
      setEstimates(data);
      setLoading(false);
    });

    return () => {
      unsubProject();
      unsubEstimates();
    };
  }, [currentUser, projectId]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = getWarehousesStream(currentUser.uid, setWarehouses);
    return () => unsub();
  }, [currentUser]);

  const openShipmentDialog = (estimate: Estimate) => {
    const defaultWh = warehouses[0]?.id || '';
    setShipmentDlg({ open: true, estimate, warehouseId: defaultWh });
  };

  const confirmCreateShipment = async () => {
    if (!currentUser || !shipmentDlg.estimate || !shipmentDlg.warehouseId) return;
    try {
      await createShipmentFromEstimate(currentUser.uid, shipmentDlg.estimate, shipmentDlg.warehouseId);
      setNotification({ open: true, message: 'Реализация создана', severity: 'success' });
      setShipmentDlg({ open: false, estimate: null, warehouseId: '' });
      navigate('/shipments');
    } catch (e: any) {
      setNotification({ open: true, message: e.message || 'Ошибка создания реализации', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !confirmDelete || !projectId) return;
    try {
      await deleteEstimate(currentUser.uid, confirmDelete.id, projectId);
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
        onClick={() => navigate(`/projects/${projectId}/estimates/new`)}
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
                  <Typography variant="h6">Смета №{estimate.number}</Typography>
                  <Typography variant="body2" color="text.secondary">{estimate.description}</Typography>
                  <Chip label={`Сумма: ${(estimate.total || 0).toFixed(2)} ₽`} sx={{ mt: 1 }} />
                </Box>
                <Box display="flex" gap={1}>
                  <IconButton onClick={() => navigate(`/projects/${projectId}/estimates/${estimate.id}`)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="primary" onClick={() => navigate(`/mobile/estimate/${estimate.id}`)}>
                    <MobileIcon />
                  </IconButton>
                  <IconButton onClick={() => setConfirmDelete(estimate)}>
                    <DeleteIcon />
                  </IconButton>
                  {estimate.status === 'approved' && (
                    <Button size="small" variant="contained" onClick={() => openShipmentDialog(estimate)}>Создать реализацию</Button>
                  )}
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

      <Dialog open={shipmentDlg.open} onClose={() => setShipmentDlg({ open: false, estimate: null, warehouseId: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Создать реализацию</DialogTitle>
        <DialogContent>
          {warehouses.length === 0 ? (
            <Alert severity="warning">Сначала создайте склад в разделе Справочники → Склады</Alert>
          ) : (
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel>Склад</InputLabel>
              <Select
                label="Склад"
                value={shipmentDlg.warehouseId}
                onChange={(e) => setShipmentDlg(prev => ({ ...prev, warehouseId: e.target.value }))}
              >
                {warehouses.map(w => (
                  <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShipmentDlg({ open: false, estimate: null, warehouseId: '' })}>Отмена</Button>
          <Button variant="contained" onClick={confirmCreateShipment} disabled={!shipmentDlg.warehouseId || warehouses.length === 0}>Создать</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectEstimatesPage;

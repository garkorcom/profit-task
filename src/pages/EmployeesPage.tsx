import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Assignment as TimesheetIcon, PlayArrow as StartWorkIcon, AdminPanelSettings as AdminIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { Employee } from '../api/employeeApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import TimeTrackingButton from '../components/TimeTrackingButton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

const EmployeesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const api = useApi();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Partial<Employee>>({});
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null);
  const [confirmAdmin, setConfirmAdmin] = useState<Employee | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = api.getEmployeesStream((data: Employee[]) => {
      setEmployees(data);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser, api]);

  const openDialog = (employee?: Employee) => {
    setEditing(employee || null);
    setForm(employee || { fullName: '', personnelNumber: '', position: '', department: '', isActive: true });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentUser || !form.fullName) return;
    try {
      if (editing) {
        await api.updateEmployee(editing.id, form);
      } else {
        await api.addEmployee(form as any);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to save employee:", error);
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !confirmDelete) return;
    await api.deleteEmployee(confirmDelete.id);
    setConfirmDelete(null);
  };

  const handleSetAdmin = async () => {
    if (!currentUser || !confirmAdmin) return;
    try {
      await api.updateEmployee(confirmAdmin.id, { role: 'admin' });
      setConfirmAdmin(null);
    } catch (error) {
      console.error("Failed to set admin role:", error);
    }
  };

  if (loading) return <LoadingSpinner />;

  const isADialogOpen = !!confirmDelete || !!confirmAdmin;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Сотрудники</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()}>
          Добавить сотрудника
        </Button>
      </Box>

      <Box display="flex" flexWrap="wrap" gap={2}>
        {employees.map((e) => (
          <Card key={e.id} sx={{ minWidth: 275 }}>
            <CardContent>
              <Typography variant="h5" component="div">{e.fullName}</Typography>
              <Typography sx={{ mb: 1.5 }} color="text.secondary">{e.position}</Typography>
              {e.department && <Chip label={e.department} size="small" />}
            </CardContent>
            <CardActions>
              <IconButton size="small" onClick={() => openDialog(e)}><EditIcon /></IconButton>
              <IconButton size="small" color="error" onClick={() => setConfirmDelete(e)}><DeleteIcon /></IconButton>
              <Button 
                size="small" 
                startIcon={<TimesheetIcon />}
                onClick={() => navigate(`/employees/${e.id}/timesheet`)}
              >
                Табель
              </Button>
              <TimeTrackingButton 
                size="small"
                color="success"
                startIcon={<StartWorkIcon />}
                buttonText="Начать работу"
              />
            </CardActions>
          </Card>
        ))}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{editing ? 'Редактировать' : 'Новый сотрудник'}</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="ФИО" fullWidth value={form.fullName || ''} onChange={(ev) => setForm({ ...form, fullName: ev.target.value })} />
          <TextField margin="dense" label="Табельный номер" fullWidth value={form.personnelNumber || ''} onChange={(ev) => setForm({ ...form, personnelNumber: ev.target.value })} />
          <TextField margin="dense" label="Должность" fullWidth value={form.position || ''} onChange={(ev) => setForm({ ...form, position: ev.target.value })} />
          <TextField margin="dense" label="Подразделение" fullWidth value={form.department || ''} onChange={(ev) => setForm({ ...form, department: ev.target.value })} />
          <TextField margin="dense" label="Email (для входа)" fullWidth value={form.email || ''} onChange={(ev) => setForm({ ...form, email: ev.target.value })} />
          {editing && (
            <Button 
              startIcon={<AdminIcon />} 
              onClick={() => {
                setConfirmAdmin(editing);
                setDialogOpen(false);
              }}
              sx={{ mt: 2 }}
            >
              Сделать администратором
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Удалить сотрудника?"
        message={`Вы уверены, что хотите удалить ${confirmDelete?.fullName}?`}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={!!confirmAdmin}
        title="Назначить администратором?"
        message={`Вы уверены, что хотите дать права администратора сотруднику ${confirmAdmin?.fullName}? Это действие нельзя будет отменить через интерфейс.`}
        onConfirm={handleSetAdmin}
        onClose={() => setConfirmAdmin(null)}
      />
    </Box>
  );
};

export default EmployeesPage;

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Button, Card, CardContent, CardActions, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Badge, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, FolderOpen as FolderIcon, Description as EstimateIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { Project, ProjectStatus, ProjectType } from '../types/project';
import { Contractor } from '../types/models';
import { useApi } from '../hooks/useApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useNavigate } from 'react-router-dom';

// Helpers to safely handle Firestore Timestamp | Date | string
const toJsDate = (value: any): Date | null => {
  if (!value) return null;
  // Firestore Timestamp
  if (typeof value?.toDate === 'function') {
    try { return value.toDate(); } catch { return null; }
  }
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' || typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const toInputDate = (value: any): string => {
  const d = toJsDate(value);
  return d ? d.toISOString().slice(0, 10) : '';
};

const formatDateDisplay = (value: any): string => {
  const d = toJsDate(value);
  return d ? d.toLocaleDateString() : '';
};

const statusOptions: { value: ProjectStatus; label: string; color: 'default' | 'info' | 'warning' | 'success'; }[] = [
  { value: 'planning', label: 'Запланирован', color: 'info' },
  { value: 'active', label: 'Активный', color: 'success' },
  { value: 'on_hold', label: 'Пауза', color: 'warning' },
  { value: 'completed', label: 'Завершён', color: 'default' },
  { value: 'cancelled', label: 'Отменен', color: 'default' }
];

const ProjectsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<Partial<Project>>({});
  const [confirm, setConfirm] = useState<Project | null>(null);
  const [notify, setNotify] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!currentUser) return;
    const unsubProjects = api.getProjectsStream((items: Project[]) => {
      setProjects(items);
    });
    const unsubContractors = api.getContractorsStream((items: Contractor[]) => {
      setContractors(items);
      setLoading(false);
    });

    return () => {
      unsubProjects && unsubProjects();
      unsubContractors && unsubContractors();
    };
  }, [currentUser, api]);

  const contractorMap = useMemo(() => {
    return contractors.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {} as Record<string, string>);
  }, [contractors]);

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm({});
  };
  
  const openDialog = (p?: Project) => {
    setEditing(p || null);
    setForm(p || {
      name: '', 
      code: `P-${Date.now()}`, 
      status: 'planning', 
      description: '', 
      clientId: '', 
      budget: 0,
      priority: 'medium',
      type: 'external',
      currency: 'USD',
      progress: 0,
      plannedStartDate: new Date(),
      plannedEndDate: new Date(),
      managerId: currentUser?.uid || '',
      createdBy: currentUser?.uid || '',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!currentUser || !form.name || !form.clientId) return;
    try {
      if (editing) {
        await api.updateProject(editing.id!, { ...form, updatedAt: new Date() });
        setNotify({ open: true, message: 'Проект обновлён', severity: 'success' });
      } else {
        const projectData: Omit<Project, 'id'|'createdAt'|'updatedAt'|'deletedAt'> = {
            name: form.name!,
            code: form.code!,
            status: form.status!,
            type: form.type!,
            priority: form.priority!,
            progress: 0,
            plannedStartDate: form.plannedStartDate!,
            plannedEndDate: form.plannedEndDate!,
            budget: form.budget!,
            actualCost: 0,
            currency: 'USD',
            clientId: form.clientId,
            managerId: currentUser.uid,
            createdBy: currentUser.uid,
        };
        await api.addProject(projectData);
        setNotify({ open: true, message: 'Проект создан', severity: 'success' });
      }
      closeDialog();
    } catch (e) {
      setNotify({ open: true, message: 'Ошибка при сохранении', severity: 'error' });
    }
  };
  
  const requestDelete = (p: Project) => setConfirm(p);

  const confirmDelete = async () => {
    if (!currentUser || !confirm) return;
    try {
      await api.deleteProject(confirm.id!);
      setNotify({ open: true, message: 'Проект удалён', severity: 'success' });
    } catch (e) {
      setNotify({ open: true, message: 'Ошибка при удалении', severity: 'error' });
    }
    setConfirm(null);
  };
  
  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Проекты</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()}>
          Новый проект
        </Button>
      </Box>
      
      <Box display="flex" flexDirection="column" gap={2}>
        {projects.map(p => (
          <Card key={p.id}>
            <CardContent>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6">{p.name} <Typography variant="caption" color="text.secondary">({p.code})</Typography></Typography>
                <Chip label={statusOptions.find(s => s.value === p.status)?.label} color={statusOptions.find(s => s.value === p.status)?.color} size="small" />
              </Box>
              <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                {p.type && (<Chip size="small" label={`Тип: ${p.type}`} variant="outlined" />)}
                {p.clientId && (<Chip size="small" label={`Клиент: ${contractorMap[p.clientId] || p.clientId}`} variant="outlined" />)}
                {formatDateDisplay(p.plannedStartDate) && (
                  <Chip size="small" label={`Старт: ${formatDateDisplay(p.plannedStartDate)}`} variant="outlined" />
                )}
                {formatDateDisplay(p.plannedEndDate) && (
                  <Chip size="small" label={`Финиш: ${formatDateDisplay(p.plannedEndDate)}`} variant="outlined" />
                )}
                {typeof p.budget === 'number' && (<Chip size="small" label={`Бюджет: ${p.budget} ${p.currency}`} variant="outlined" />)}
              </Box>
              {p.description && <Typography variant="body2" color="text.secondary" mt={1}>{p.description}</Typography>}
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end' }}>
              <IconButton size="small" onClick={() => navigate(`/projects/${p.id}`)} title="Открыть проект">
                <FolderIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => navigate(`/projects/${p.id}/estimates`)} title="Сметы">
                <Badge badgeContent={0} color="primary">
                  <EstimateIcon fontSize="small" />
                </Badge>
              </IconButton>
              <IconButton size="small" onClick={() => openDialog(p)} title="Редактировать">
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => requestDelete(p)} color="error" title="Удалить">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </CardActions>
          </Card>
        ))}
      </Box>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Редактировать проект' : 'Новый проект'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField label="Название проекта" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
            <Box display="flex" gap={2}>
              <TextField label="Код проекта" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} fullWidth />
              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select value={form.status || 'planning'} label="Статус" onChange={(e) => setForm({ ...form, status: e.target.value as Project['status'] })}>
                  {statusOptions.map(s => (<MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Тип</InputLabel>
                <Select
                  value={form.type || ''}
                  label="Тип"
                  onChange={(e) => setForm({ ...form, type: e.target.value as ProjectType })}
                >
                  <MenuItem value="internal">Внутренний</MenuItem>
                  <MenuItem value="external">Внешний</MenuItem>
                  <MenuItem value="support">Поддержка</MenuItem>
                  <MenuItem value="development">Разработка</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <FormControl fullWidth required>
              <InputLabel>Клиент</InputLabel>
              <Select value={form.clientId || ''} label="Клиент" onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <MenuItem value=""><em>Не выбран</em></MenuItem>
                {contractors.map(c => (<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
              </Select>
            </FormControl>
            <Box display="flex" gap={2}>
              <TextField
                label="Дата начала"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={toInputDate(form.plannedStartDate)}
                onChange={(e) => setForm({ ...form, plannedStartDate: new Date(e.target.value) })}
                fullWidth
              />
              <TextField
                label="Дата окончания"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={toInputDate(form.plannedEndDate)}
                onChange={(e) => setForm({ ...form, plannedEndDate: new Date(e.target.value) })}
                fullWidth
              />
            </Box>
            <TextField label="Бюджет" type="number" value={form.budget || ''} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} fullWidth />
            <TextField label="Описание" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={3} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Отмена</Button>
          <Button onClick={save} variant="contained" disabled={!form.name || !form.clientId}>Сохранить</Button>
        </DialogActions>
      </Dialog>
      
      <Notification
        open={notify.open}
        message={notify.message}
        severity={notify.severity}
        onClose={() => setNotify({ ...notify, open: false })}
      />
      
      <ConfirmDialog
        open={!!confirm}
        title="Удалить проект?"
        message={`Вы уверены, что хотите удалить проект "${confirm?.name}"? Все связанные задачи также будут удалены.`}
        onConfirm={confirmDelete}
        onClose={() => setConfirm(null)}
      />
    </Box>
  );
};

export default ProjectsPage;



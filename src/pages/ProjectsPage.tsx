import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Card, CardContent, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Chip, Alert, Badge } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Description as EstimateIcon } from '@mui/icons-material';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useAuth } from '../auth/AuthContext';
import { Project, ProjectStatus, addProject, deleteProject, getProjectsStream, updateProject } from '../api/projectApi';
import { Contractor, getContractorsStream } from '../api/contractorApi';
import { useNavigate } from 'react-router-dom';

const statusOptions: { value: ProjectStatus; label: string; color: 'default' | 'info' | 'warning' | 'success'; }[] = [
  { value: 'planned', label: 'Запланирован', color: 'info' },
  { value: 'active', label: 'Активный', color: 'success' },
  { value: 'paused', label: 'Пауза', color: 'warning' },
  { value: 'completed', label: 'Завершён', color: 'default' }
];

const ProjectsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  // REMOVE: const [estimatesCount, setEstimatesCount] = useState<Record<string, number>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<Partial<Project>>({ status: 'planned' });
  const [confirm, setConfirm] = useState<Project | null>(null);
  const [notify, setNotify] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '', severity: 'success' });

  // Быстрая загрузка проектов для мгновенного отображения страницы
  useEffect(() => {
    if (!currentUser) return;
    const unsubProjects = getProjectsStream(currentUser.uid, (items) => {
      setProjects(items);
      setLoading(false);
    });
    return () => { unsubProjects(); };
  }, [currentUser]);

  // Ленивая загрузка контрагентов — только при открытом диалоге создания/редактирования
  useEffect(() => {
    if (!currentUser || !dialogOpen) return;
    const unsubContractors = getContractorsStream(currentUser.uid, (items) => {
      setContractors(items);
    });
    return () => { unsubContractors && unsubContractors(); };
  }, [currentUser, dialogOpen]);

  const customerContractors = useMemo(() => contractors.filter(c => c.type === 'customer' || c.type === 'both'), [contractors]);
  const contractorMap = useMemo(() => Object.fromEntries(customerContractors.map(c => [c.id, c.name])), [customerContractors]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', code: '', status: 'planned', description: '', contractorId: '', contractorName: '', startDate: '', endDate: '', budget: undefined });
    setDialogOpen(true);
  };
  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({ ...p });
    setDialogOpen(true);
  };
  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const save = async () => {
    if (!currentUser || !form.name || !form.contractorId) return;
    try {
      const contractorName = contractorMap[form.contractorId] || '';
      if (editing) {
        await updateProject(currentUser.uid, editing.id, { ...form, contractorName });
        setNotify({ open: true, message: 'Проект обновлён', severity: 'success' });
      } else {
        await addProject(currentUser.uid, { ...(form as any), contractorName });
        setNotify({ open: true, message: 'Проект создан', severity: 'success' });
      }
      closeDialog();
    } catch (e) {
      console.error('Ошибка при сохранении проекта:', e);
      setNotify({ open: true, message: 'Ошибка при сохранении', severity: 'error' });
    }
  };

  const remove = async (p: Project) => {
    if (!currentUser) return;
    try {
      // Logic to delete estimates is now handled inside Estimate module or cloud function
      // For now, we assume estimates are deleted or handled elsewhere when a project is deleted.
      // A more robust solution would be a cloud function to clean up subcollections.
      
      await deleteProject(currentUser.uid, p.id);
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>Новый проект</Button>
      </Box>

      {projects.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">Проектов пока нет</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box display="flex" flexWrap="wrap" gap={2}>
          {projects.map(p => (
            <Box key={p.id} sx={{ width: { xs: '100%', md: 'calc(50% - 8px)', lg: 'calc(33.333% - 11px)' } }}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography 
                        variant="h6"
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/projects/${p.id}/estimates`)}
                        title="Открыть проект"
                      >
                        {p.name}
                      </Typography>
                      {p.code && <Typography variant="caption" color="text.secondary">Код: {p.code}</Typography>}
                    </Box>
                    <Box>
                      <IconButton 
                        size="small" 
                        onClick={() => navigate(`/projects/${p.id}/estimates`)}
                        title="Сметы"
                      >
                        <Badge badgeContent={p.estimatesCount || 0} color="primary">
                          <EstimateIcon fontSize="small" />
                        </Badge>
                      </IconButton>
                      <IconButton size="small" onClick={() => openEdit(p)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => setConfirm(p)}><DeleteIcon fontSize="small" /></IconButton>
                    </Box>
                  </Box>
                  <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                    {p.status && (
                      <Chip size="small" label={statusOptions.find(s => s.value === p.status)?.label || p.status} color={statusOptions.find(s => s.value === p.status)?.color || 'default'} />
                    )}
                    {p.contractorName && (<Chip size="small" label={`Контрагент: ${p.contractorName}`} variant="outlined" />)}
                    {p.startDate && (<Chip size="small" label={`Старт: ${p.startDate}`} variant="outlined" />)}
                    {p.endDate && (<Chip size="small" label={`Финиш: ${p.endDate}`} variant="outlined" />)}
                    {typeof p.budget === 'number' && (<Chip size="small" label={`Бюджет: ${p.budget} ₽`} variant="outlined" />)}
                  </Box>
                  {p.description && <Typography variant="body2" color="text.secondary" mt={1}>{p.description}</Typography>}
                  <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                    <Button 
                      variant="contained"
                      size="small"
                      onClick={() => navigate(`/projects/${p.id}/estimates`)}
                    >
                      Посмотреть проект
                    </Button>
                    <Button 
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/tasks', { state: { newForProjectId: p.id } })}
                    >
                      Добавить задачу
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Редактировать проект' : 'Новый проект'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {customerContractors.length === 0 && (
              <Alert severity="warning">
                Сначала добавьте клиента в справочнике контрагентов (тип: Клиент)
              </Alert>
            )}
            <TextField label="Название" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
            <Box display="flex" gap={2}>
              <TextField label="Код" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} fullWidth />
              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select value={(form.status as ProjectStatus) || 'planned'} label="Статус" onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                  {statusOptions.map(s => (<MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>))}
                </Select>
              </FormControl>
            </Box>
            <FormControl fullWidth required>
              <InputLabel>Клиент</InputLabel>
              <Select value={form.contractorId || ''} label="Клиент" onChange={(e) => setForm({ ...form, contractorId: e.target.value, contractorName: contractorMap[e.target.value] })}>
                <MenuItem value=""><em>Не выбран</em></MenuItem>
                {customerContractors.map(c => (<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
              </Select>
            </FormControl>
            <Box display="flex" gap={2}>
              <TextField label="Дата начала" type="date" InputLabelProps={{ shrink: true }} value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} fullWidth />
              <TextField label="Дата окончания" type="date" InputLabelProps={{ shrink: true }} value={form.endDate || ''} onChange={(e) => setForm({ ...form, endDate: e.target.value })} fullWidth />
            </Box>
            <TextField label="Бюджет" type="number" value={(form.budget as number) || ''} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} fullWidth />
            <TextField label="Описание" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={3} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Отмена</Button>
          <Button onClick={save} variant="contained" disabled={!form.name || !form.contractorId}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog 
        open={!!confirm}
        title="Удалить проект?"
        message={`Удалить проект "${confirm?.name}"?`}
        onConfirm={() => { if (confirm) { void remove(confirm); } }}
        onClose={() => setConfirm(null)}
      />
      <Notification open={notify.open} message={notify.message} severity={notify.severity} onClose={() => setNotify({ ...notify, open: false })} />
    </Box>
  );
};

export default ProjectsPage;



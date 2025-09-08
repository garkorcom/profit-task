/**
 * AdminRoleDashboard - Панель управления динамическими ролями RBAC
 * 
 * Позволяет администраторам создавать, редактировать и управлять
 * ролями в системе без изменения кода
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  Switch,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tab,
  Tabs,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import { hasAdminRights } from '../../auth/customClaims';
import { 
  getAllRoles, 
  createRole, 
  updateRole, 
  deactivateRole,
  getRBACStats 
} from '../../api/rbacApi';
import { Permission, getAllPermissions, permissionDescriptions } from '../../auth/permissions';
import { DynamicRole, RoleManagementRequest, RBACStats } from '../../types/rbac';

interface AdminRoleDashboardProps {}

export const AdminRoleDashboard: React.FC<AdminRoleDashboardProps> = () => {
  const { currentUser, customClaims } = useAuth();
  
  // Состояние компонента
  const [tabValue, setTabValue] = useState(0);
  const [roles, setRoles] = useState<DynamicRole[]>([]);
  const [stats, setStats] = useState<RBACStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Диалоги
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<DynamicRole | null>(null);

  // Форма создания/редактирования роли
  const [roleForm, setRoleForm] = useState<RoleManagementRequest>({
    name: '',
    displayName: '',
    description: '',
    permissions: [],
    parentRoleId: undefined,
    conditions: [],
    contextPermissions: [],
    color: '#2196f3',
    icon: 'account_circle',
    priority: 100
  });

  // Проверка прав доступа
  const hasAccess = hasAdminRights(customClaims);

  useEffect(() => {
    if (!hasAccess) {
      setError('У вас нет прав для управления ролями');
      setLoading(false);
      return;
    }

    loadData();
  }, [hasAccess]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, statsData] = await Promise.all([
        getAllRoles(),
        getRBACStats()
      ]);
      
      setRoles(rolesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading roles data:', error);
      setError('Не удалось загрузить данные ролей');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      await createRole(roleForm, currentUser!.uid);
      setSuccess('Роль успешно создана');
      setCreateDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error creating role:', error);
      setError('Не удалось создать роль');
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole) return;
    
    try {
      await updateRole(selectedRole.id, roleForm, currentUser!.uid);
      setSuccess('Роль успешно обновлена');
      setEditDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error updating role:', error);
      setError('Не удалось обновить роль');
    }
  };

  const handleDeactivateRole = async (roleId: string) => {
    if (!window.confirm('Вы уверены, что хотите деактивировать эту роль?')) {
      return;
    }
    
    try {
      await deactivateRole(roleId, currentUser!.uid);
      setSuccess('Роль деактивирована');
      await loadData();
    } catch (error) {
      console.error('Error deactivating role:', error);
      setError('Не удалось деактивировать роль');
    }
  };

  const resetForm = () => {
    setRoleForm({
      name: '',
      displayName: '',
      description: '',
      permissions: [],
      parentRoleId: undefined,
      conditions: [],
      contextPermissions: [],
      color: '#2196f3',
      icon: 'account_circle',
      priority: 100
    });
    setSelectedRole(null);
  };

  const openEditDialog = (role: DynamicRole) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions,
      parentRoleId: role.parentRoleId,
      conditions: role.conditions || [],
      contextPermissions: role.contextPermissions || [],
      color: role.color || '#2196f3',
      icon: role.icon || 'account_circle',
      priority: role.priority
    });
    setEditDialogOpen(true);
  };

  const handlePermissionToggle = (permission: Permission) => {
    const newPermissions = roleForm.permissions.includes(permission)
      ? roleForm.permissions.filter(p => p !== permission)
      : [...roleForm.permissions, permission];
    
    setRoleForm(prev => ({ ...prev, permissions: newPermissions }));
  };

  if (!hasAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          У вас нет прав для управления ролями. Обратитесь к администратору.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Управление ролями RBAC
      </Typography>

      {/* Статистика */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Всего ролей
              </Typography>
              <Typography variant="h5" component="div">
                {stats?.totalRoles || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Активных ролей
              </Typography>
              <Typography variant="h5" component="div">
                {stats?.activeRoles || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Пользователей с ролями
              </Typography>
              <Typography variant="h5" component="div">
                {stats?.totalUsers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Средняя сложность роли
              </Typography>
              <Typography variant="h5" component="div">
                {Math.round(stats?.averagePermissionsPerRole || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                разрешений
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
        <Tab label="Роли" icon={<AssignmentIcon />} />
        <Tab label="Статистика" icon={<TimelineIcon />} />
      </Tabs>

      {tabValue === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              Управление ролями
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Создать роль
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Описание</TableCell>
                  <TableCell>Разрешения</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Приоритет</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {role.color && (
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: role.color,
                              mr: 1
                            }}
                          />
                        )}
                        <Box>
                          <Typography variant="subtitle2">
                            {role.displayName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {role.name}
                          </Typography>
                          {role.isSystem && (
                            <Chip size="small" label="Системная" color="info" sx={{ ml: 1 }} />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {role.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={`${role.permissions.length} разрешений`}>
                        <Chip 
                          size="small" 
                          label={role.permissions.length}
                          color="primary"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={role.isActive ? 'Активная' : 'Неактивная'}
                        color={role.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{role.priority}</TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        onClick={() => openEditDialog(role)}
                        disabled={role.isSystem}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeactivateRole(role.id)}
                        disabled={role.isSystem || !role.isActive}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {tabValue === 1 && stats && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Популярные разрешения
              </Typography>
              {stats.mostUsedPermissions.map((perm, index) => (
                <Box key={perm.permission} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    {index + 1}. {permissionDescriptions[perm.permission]} ({perm.usage})
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Распределение пользователей по ролям
              </Typography>
              {stats.roleDistribution.slice(0, 10).map((dist) => {
                const role = roles.find(r => r.id === dist.roleId);
                return (
                  <Box key={dist.roleId} sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      {role?.displayName || dist.roleId}: {dist.userCount} пользователей
                    </Typography>
                  </Box>
                );
              })}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Диалог создания роли */}
      <RoleFormDialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          resetForm();
        }}
        onSave={handleCreateRole}
        roleForm={roleForm}
        setRoleForm={setRoleForm}
        onPermissionToggle={handlePermissionToggle}
        title="Создать новую роль"
        roles={roles}
      />

      {/* Диалог редактирования роли */}
      <RoleFormDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          resetForm();
        }}
        onSave={handleEditRole}
        roleForm={roleForm}
        setRoleForm={setRoleForm}
        onPermissionToggle={handlePermissionToggle}
        title="Редактировать роль"
        roles={roles}
      />

      {/* Уведомления */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Компонент формы роли
interface RoleFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  roleForm: RoleManagementRequest;
  setRoleForm: React.Dispatch<React.SetStateAction<RoleManagementRequest>>;
  onPermissionToggle: (permission: Permission) => void;
  title: string;
  roles: DynamicRole[];
}

const RoleFormDialog: React.FC<RoleFormDialogProps> = ({
  open,
  onClose,
  onSave,
  roleForm,
  setRoleForm,
  onPermissionToggle,
  title,
  roles
}) => {
  const [permissionTab, setPermissionTab] = useState(0);
  const allPermissions = getAllPermissions();
  
  // Группируем разрешения по категориям
  const permissionCategories = {
    'Проекты': allPermissions.filter(p => p.toLowerCase().includes('project')),
    'Задачи': allPermissions.filter(p => p.toLowerCase().includes('task')),
    'Пользователи': allPermissions.filter(p => p.toLowerCase().includes('user')),
    'Финансы': allPermissions.filter(p => p.toLowerCase().includes('finance') || p.toLowerCase().includes('labor') || p.toLowerCase().includes('cogs')),
    'Время': allPermissions.filter(p => p.toLowerCase().includes('time')),
    'Роли': allPermissions.filter(p => p.toLowerCase().includes('role') || p.toLowerCase().includes('rbac')),
    'Другие': allPermissions.filter(p => 
      !p.toLowerCase().includes('project') &&
      !p.toLowerCase().includes('task') &&
      !p.toLowerCase().includes('user') &&
      !p.toLowerCase().includes('finance') &&
      !p.toLowerCase().includes('labor') &&
      !p.toLowerCase().includes('cogs') &&
      !p.toLowerCase().includes('time') &&
      !p.toLowerCase().includes('role') &&
      !p.toLowerCase().includes('rbac')
    )
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Название роли"
              value={roleForm.name}
              onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
              margin="dense"
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Отображаемое название"
              value={roleForm.displayName}
              onChange={(e) => setRoleForm(prev => ({ ...prev, displayName: e.target.value }))}
              margin="dense"
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Описание"
              value={roleForm.description}
              onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
              margin="dense"
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="dense">
              <InputLabel>Родительская роль</InputLabel>
              <Select
                value={roleForm.parentRoleId || ''}
                onChange={(e) => setRoleForm(prev => ({ ...prev, parentRoleId: e.target.value || undefined }))}
              >
                <MenuItem value="">Нет</MenuItem>
                {roles.map(role => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Приоритет"
              type="number"
              value={roleForm.priority}
              onChange={(e) => setRoleForm(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
              margin="dense"
            />
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
          Разрешения ({roleForm.permissions.length})
        </Typography>

        {Object.entries(permissionCategories).map(([category, permissions]) => (
          <Accordion key={category}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                {category} ({permissions.filter(p => roleForm.permissions.includes(p)).length}/{permissions.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={1}>
                {permissions.map(permission => (
                  <Grid item xs={12} sm={6} key={permission}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={roleForm.permissions.includes(permission)}
                          onChange={() => onPermissionToggle(permission)}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2">
                          {permissionDescriptions[permission] || permission}
                        </Typography>
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button 
          onClick={onSave} 
          variant="contained"
          disabled={!roleForm.name || !roleForm.displayName}
        >
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminRoleDashboard;
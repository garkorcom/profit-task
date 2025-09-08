/**
 * Административная страница управления динамическими ролями RBAC
 * 
 * Функциональность:
 * - Просмотр всех ролей системы
 * - Создание новых динамических ролей  
 * - Редактирование существующих ролей
 * - Управление иерархией ролей
 * - Назначение ролей пользователям
 * - Настройка условных разрешений
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
  Alert,
  Tabs,
  Tab,
  Badge,
  Card,
  CardContent,
  CardActions,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Visibility as VisibilityIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import { hasPermission } from '../../auth/customClaims';
import * as rbacApi from '../../api/rbacApi';
import { DynamicRole, RoleManagementRequest, UserGroup, RBACStats } from '../../types/rbac';
import { Permission, getAllPermissions } from '../../auth/permissions';
import ConditionalPermissionsEditor from '../../components/admin/ConditionalPermissionsEditor';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function RoleManagementPage() {
  const { customClaims } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  
  // Состояние данных
  const [roles, setRoles] = useState<DynamicRole[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [rbacStats, setRbacStats] = useState<RBACStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Состояние диалогов
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<DynamicRole | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Состояние форм
  const [roleForm, setRoleForm] = useState<RoleManagementRequest>({
    name: '',
    displayName: '',
    description: '',
    permissions: [],
    parentRoleId: undefined,
    conditions: [],
    contextPermissions: [],
    effectiveFrom: undefined,
    effectiveTo: undefined,
    color: '#2e7d32',
    icon: 'security',
    priority: 0
  });
  
  const allPermissions = getAllPermissions();
  
  // Загрузка данных (должен быть перед любыми условными возвратами)
  useEffect(() => {
    if (hasPermission(customClaims, 'MANAGE_ROLES')) {
      loadData();
    }
  }, [customClaims]);
  
  // Проверяем права доступа
  if (!hasPermission(customClaims, 'MANAGE_ROLES')) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" icon={<SecurityIcon />}>
          У вас нет прав доступа к управлению ролями. Обратитесь к администратору.
        </Alert>
      </Container>
    );
  }
  
  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, groupsData, statsData] = await Promise.all([
        rbacApi.getAllRoles(),
        rbacApi.getAllUserGroups(),
        rbacApi.getRBACStats()
      ]);
      
      setRoles(rolesData);
      setUserGroups(groupsData);
      setRbacStats(statsData);
      setError('');
    } catch (error) {
      console.error('Error loading RBAC data:', error);
      setError('Ошибка загрузки данных RBAC');
    } finally {
      setLoading(false);
    }
  };
  
  // Обработчики событий
  const handleCreateRole = () => {
    setRoleForm({
      name: '',
      displayName: '',
      description: '',
      permissions: [],
      parentRoleId: undefined,
      conditions: [],
      contextPermissions: [],
      effectiveFrom: undefined,
      effectiveTo: undefined,
      color: '#2e7d32',
      icon: 'security',
      priority: 0
    });
    setCreateRoleOpen(true);
  };
  
  const handleEditRole = (role: DynamicRole) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions,
      parentRoleId: role.parentRoleId,
      conditions: role.conditions || [],
      contextPermissions: role.contextPermissions || [],
      effectiveFrom: role.effectiveFrom,
      effectiveTo: role.effectiveTo,
      color: role.color || '#2e7d32',
      icon: role.icon || 'security',
      priority: role.priority
    });
    setEditRoleOpen(true);
  };
  
  const handleSaveRole = async () => {
    try {
      if (selectedRole) {
        // Обновление роли
        await rbacApi.updateRole(selectedRole.id, roleForm, customClaims?.uid || 'system');
        setEditRoleOpen(false);
      } else {
        // Создание роли
        await rbacApi.createRole(roleForm, customClaims?.uid || 'system');
        setCreateRoleOpen(false);
      }
      
      await loadData();
      setSelectedRole(null);
    } catch (error) {
      console.error('Error saving role:', error);
      setError('Ошибка сохранения роли');
    }
  };
  
  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    
    try {
      await rbacApi.deactivateRole(selectedRole.id, customClaims?.uid || 'system');
      setDeleteConfirmOpen(false);
      setSelectedRole(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting role:', error);
      setError('Ошибка удаления роли');
    }
  };
  
  const handlePermissionChange = (permission: Permission, checked: boolean) => {
    const newPermissions = checked 
      ? [...roleForm.permissions, permission]
      : roleForm.permissions.filter(p => p !== permission);
    
    setRoleForm({ ...roleForm, permissions: newPermissions });
  };
  
  // Компонент статистики
  const StatsOverview = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SecurityIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Роли</Typography>
            </Box>
            <Typography variant="h4" component="div">
              {rbacStats?.activeRoles} / {rbacStats?.totalRoles}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Активные / Всего
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <GroupIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Пользователи</Typography>
            </Box>
            <Typography variant="h4" component="div">
              {rbacStats?.totalUsers}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              С множественными ролями: {rbacStats?.usersWithMultipleRoles}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <ScheduleIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Временные роли</Typography>
            </Box>
            <Typography variant="h4" component="div">
              {rbacStats?.temporaryRoleAssignments}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Активных назначений
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AssignmentIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Делегирования</Typography>
            </Box>
            <Typography variant="h4" component="div">
              {rbacStats?.activeDelegations}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Активных делегирований
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
  
  // Компонент таблицы ролей
  const RolesTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Название</TableCell>
            <TableCell>Описание</TableCell>
            <TableCell>Разрешения</TableCell>
            <TableCell>Статус</TableCell>
            <TableCell>Пользователи</TableCell>
            <TableCell>Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip 
                    label={role.displayName}
                    color={role.isSystem ? 'secondary' : 'primary'}
                    size="small"
                    sx={{ backgroundColor: role.color }}
                  />
                  {role.isSystem && (
                    <Tooltip title="Системная роль">
                      <WarningIcon color="warning" sx={{ ml: 1, fontSize: 16 }} />
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
              <TableCell>{role.description}</TableCell>
              <TableCell>
                <Badge badgeContent={role.permissions.length} color="primary">
                  <SecurityIcon />
                </Badge>
              </TableCell>
              <TableCell>
                <Chip 
                  label={role.isActive ? 'Активна' : 'Неактивна'}
                  color={role.isActive ? 'success' : 'default'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {rbacStats?.roleDistribution.find(rd => rd.roleId === role.id)?.userCount || 0}
              </TableCell>
              <TableCell>
                <Tooltip title="Просмотр">
                  <IconButton onClick={() => handleEditRole(role)} size="small">
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Редактировать">
                  <IconButton onClick={() => handleEditRole(role)} size="small">
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                {!role.isSystem && (
                  <Tooltip title="Удалить">
                    <IconButton 
                      onClick={() => {
                        setSelectedRole(role);
                        setDeleteConfirmOpen(true);
                      }} 
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
  
  // Диалог создания/редактирования роли
  const RoleDialog = ({ open, onClose, title }: { open: boolean; onClose: () => void; title: string }) => (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Внутреннее имя"
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Отображаемое имя"
              value={roleForm.displayName}
              onChange={(e) => setRoleForm({ ...roleForm, displayName: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Описание"
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Родительская роль</InputLabel>
              <Select
                value={roleForm.parentRoleId || ''}
                onChange={(e) => setRoleForm({ 
                  ...roleForm, 
                  parentRoleId: e.target.value || undefined 
                })}
              >
                <MenuItem value="">Нет</MenuItem>
                {roles.filter(r => r.id !== selectedRole?.id).map(role => (
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
              type="number"
              label="Приоритет"
              value={roleForm.priority}
              onChange={(e) => setRoleForm({ 
                ...roleForm, 
                priority: parseInt(e.target.value) || 0 
              })}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Разрешения ({roleForm.permissions.length})
            </Typography>
            <Paper sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
              <Grid container spacing={1}>
                {allPermissions.map(permission => (
                  <Grid item xs={12} sm={6} md={4} key={permission}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={roleForm.permissions.includes(permission)}
                          onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                          size="small"
                        />
                      }
                      label={permission}
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <ConditionalPermissionsEditor
              conditions={roleForm.conditions || []}
              onConditionsChange={(conditions) => setRoleForm({ ...roleForm, conditions })}
              contextPermissions={roleForm.contextPermissions || []}
              onContextPermissionsChange={(contextPermissions) => setRoleForm({ ...roleForm, contextPermissions })}
              availablePermissions={allPermissions}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} startIcon={<CancelIcon />}>
          Отмена
        </Button>
        <Button 
          onClick={handleSaveRole} 
          variant="contained" 
          startIcon={<SaveIcon />}
          disabled={!roleForm.name || !roleForm.displayName}
        >
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
  
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Загрузка данных RBAC...
        </Typography>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Управление ролями RBAC
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateRole}
          sx={{ ml: 'auto' }}
        >
          Создать роль
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      <StatsOverview />
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Роли" icon={<SecurityIcon />} />
          <Tab label="Группы пользователей" icon={<GroupIcon />} />
          <Tab label="Статистика" icon={<InfoIcon />} />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <RolesTable />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6">Группы пользователей</Typography>
          <Typography variant="body2" color="text.secondary">
            Функциональность групп будет реализована в следующих задачах.
          </Typography>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6">Детальная статистика RBAC</Typography>
          {rbacStats && (
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Наиболее используемые разрешения
                    </Typography>
                    {rbacStats.mostUsedPermissions.slice(0, 10).map((item, index) => (
                      <Box key={item.permission} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'between' }}>
                          <Typography variant="body2">{item.permission}</Typography>
                          <Typography variant="body2">{item.usage}</Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={(item.usage / rbacStats.totalRoles) * 100} 
                        />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Распределение ролей
                    </Typography>
                    {rbacStats.roleDistribution.slice(0, 10).map((item) => {
                      const role = roles.find(r => r.id === item.roleId);
                      return (
                        <Box key={item.roleId} sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'between' }}>
                            <Typography variant="body2">
                              {role?.displayName || item.roleId}
                            </Typography>
                            <Typography variant="body2">{item.userCount}</Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={(item.userCount / rbacStats.totalUsers) * 100} 
                          />
                        </Box>
                      );
                    })}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>
      </Paper>
      
      {/* Диалоги */}
      <RoleDialog 
        open={createRoleOpen} 
        onClose={() => setCreateRoleOpen(false)}
        title="Создание новой роли"
      />
      
      <RoleDialog 
        open={editRoleOpen} 
        onClose={() => setEditRoleOpen(false)}
        title="Редактирование роли"
      />
      
      {/* Диалог подтверждения удаления */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы действительно хотите удалить роль "{selectedRole?.displayName}"?
            Это действие необратимо.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleDeleteRole} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
/**
 * Компонент управления группами пользователей
 * 
 * Предоставляет интерфейс для создания, редактирования и управления
 * группами пользователей в системе RBAC
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  CircularProgress,
  Tooltip,
  Menu,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  ExpandMore as ExpandMoreIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  AssignmentInd as AssignmentIndIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import { hasPermission } from '../../auth/customClaims';
import { UserGroup, AutoAssignmentRule, GroupMembership } from '../../types/rbac';
import { Permission } from '../../auth/permissions';
import { 
  getAllRoles,
  createUserGroup,
  getAllUserGroups,
  updateUserGroup,
  deleteUserGroup,
  getAllMemberships,
  getGroupStatistics
} from '../../api/rbacApi';

interface UserGroupsManagementProps {
  onGroupSelect?: (group: UserGroup) => void;
}

export default function UserGroupsManagement({ onGroupSelect }: UserGroupsManagementProps) {
  const { customClaims } = useAuth();
  
  // Состояние групп
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояние для создания/редактирования группы
  const [groupDialog, setGroupDialog] = useState({
    open: false,
    isEdit: false,
    group: null as UserGroup | null
  });
  
  // Состояние формы
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    roles: [] as string[],
    additionalPermissions: [] as Permission[],
    autoAssignment: [] as AutoAssignmentRule[],
    parentGroupId: '',
    isActive: true
  });
  
  // Дополнительные состояния
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<GroupMembership[]>([]);
  const [selectedGroupStats, setSelectedGroupStats] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  
  // Пагинация
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Проверяем права доступа
  if (!hasPermission(customClaims, 'MANAGE_USER_GROUPS')) {
    return (
      <Alert severity="error">
        У вас нет прав доступа к управлению группами пользователей.
      </Alert>
    );
  }

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [groupsData, rolesData, membershipsData] = await Promise.all([
        getAllUserGroups(),
        getAllRoles(),
        getAllMemberships()
      ]);
      
      setGroups(groupsData);
      setAvailableRoles(rolesData);
      setMemberships(membershipsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Создание новой группы
  const handleCreateGroup = () => {
    setFormData({
      name: '',
      description: '',
      roles: [],
      additionalPermissions: [],
      autoAssignment: [],
      parentGroupId: '',
      isActive: true
    });
    setGroupDialog({ open: true, isEdit: false, group: null });
  };

  // Редактирование группы
  const handleEditGroup = (group: UserGroup) => {
    setFormData({
      name: group.name,
      description: group.description,
      roles: group.roles || [],
      additionalPermissions: group.additionalPermissions || [],
      autoAssignment: group.autoAssignment || [],
      parentGroupId: group.parentGroupId || '',
      isActive: group.isActive
    });
    setGroupDialog({ open: true, isEdit: true, group });
  };

  // Сохранение группы
  const handleSaveGroup = async () => {
    try {
      if (groupDialog.isEdit && groupDialog.group) {
        await updateUserGroup(groupDialog.group.id, {
          name: formData.name,
          description: formData.description,
          roles: formData.roles,
          additionalPermissions: formData.additionalPermissions,
          autoAssignment: formData.autoAssignment,
          parentGroupId: formData.parentGroupId || undefined,
          isActive: formData.isActive
        }, customClaims?.uid || 'system');
      } else {
        await createUserGroup({
          name: formData.name,
          description: formData.description,
          roles: formData.roles,
          additionalPermissions: formData.additionalPermissions,
          autoAssignment: formData.autoAssignment,
          parentGroupId: formData.parentGroupId || undefined
        }, customClaims?.uid || 'system');
      }
      
      setGroupDialog({ open: false, isEdit: false, group: null });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения группы');
    }
  };

  // Удаление группы
  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Вы действительно хотите удалить эту группу?')) return;
    
    try {
      await deleteUserGroup(groupId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления группы');
    }
  };

  // Просмотр статистики группы
  const handleViewStats = async (group: UserGroup) => {
    try {
      const stats = await getGroupStatistics(group.id);
      setSelectedGroupStats(stats);
      setSelectedGroup(group);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки статистики');
    }
  };

  // Добавление правила автоназначения
  const addAutoAssignmentRule = () => {
    const newRule: AutoAssignmentRule = {
      id: `rule_${Date.now()}`,
      field: 'department',
      operator: 'equals',
      value: '',
      description: ''
    };
    
    setFormData(prev => ({
      ...prev,
      autoAssignment: [...prev.autoAssignment, newRule]
    }));
  };

  // Удаление правила автоназначения
  const removeAutoAssignmentRule = (ruleId: string) => {
    setFormData(prev => ({
      ...prev,
      autoAssignment: prev.autoAssignment.filter(rule => rule.id !== ruleId)
    }));
  };

  // Обновление правила автоназначения
  const updateAutoAssignmentRule = (ruleId: string, updates: Partial<AutoAssignmentRule>) => {
    setFormData(prev => ({
      ...prev,
      autoAssignment: prev.autoAssignment.map(rule =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    }));
  };

  // Получение количества пользователей в группе
  const getGroupMemberCount = (groupId: string) => {
    return memberships.filter(m => m.groupId === groupId && m.isActive).length;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Заголовок и действия */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Управление группами пользователей
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{ mr: 1 }}
          >
            Обновить
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateGroup}
          >
            Создать группу
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Список групп */}
      <Grid container spacing={3}>
        {groups.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((group) => (
          <Grid item xs={12} md={6} lg={4} key={group.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {group.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {group.description}
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={(e) => {
                      setAnchorEl(e.currentTarget);
                      setSelectedGroup(group);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  <Chip
                    icon={<PeopleIcon />}
                    label={`${getGroupMemberCount(group.id)} участников`}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  {group.roles && group.roles.length > 0 && (
                    <Chip
                      label={`${group.roles.length} ролей`}
                      size="small"
                      color="primary"
                      sx={{ mr: 1 }}
                    />
                  )}
                  {!group.isActive && (
                    <Chip
                      label="Неактивна"
                      size="small"
                      color="error"
                    />
                  )}
                </Box>
                
                {group.parentGroupId && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Родительская группа: {groups.find(g => g.id === group.parentGroupId)?.name}
                  </Typography>
                )}
              </CardContent>
              
              <CardActions>
                <Button
                  size="small"
                  startIcon={<VisibilityIcon />}
                  onClick={() => handleViewStats(group)}
                >
                  Статистика
                </Button>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleEditGroup(group)}
                >
                  Изменить
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Пагинация */}
      <TablePagination
        component="div"
        count={groups.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        sx={{ mt: 2 }}
      />

      {/* Контекстное меню */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          if (selectedGroup) handleEditGroup(selectedGroup);
          setAnchorEl(null);
        }}>
          <EditIcon sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedGroup) handleViewStats(selectedGroup);
          setAnchorEl(null);
        }}>
          <VisibilityIcon sx={{ mr: 1 }} />
          Статистика
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedGroup) handleDeleteGroup(selectedGroup.id);
          setAnchorEl(null);
        }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Удалить
        </MenuItem>
      </Menu>

      {/* Диалог создания/редактирования группы */}
      <Dialog
        open={groupDialog.open}
        onClose={() => setGroupDialog({ open: false, isEdit: false, group: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {groupDialog.isEdit ? 'Редактировать группу' : 'Создать группу'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Название группы"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Родительская группа</InputLabel>
                <Select
                  value={formData.parentGroupId}
                  onChange={(e) => setFormData(prev => ({ ...prev, parentGroupId: e.target.value }))}
                >
                  <MenuItem value="">Нет</MenuItem>
                  {groups
                    .filter(g => g.id !== groupDialog.group?.id)
                    .map(group => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Описание"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Роли</InputLabel>
                <Select
                  multiple
                  value={formData.roles}
                  onChange={(e) => setFormData(prev => ({ ...prev, roles: e.target.value as string[] }))}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={availableRoles.find(r => r.id === value)?.name || value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {availableRoles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                }
                label="Группа активна"
              />
            </Grid>
          </Grid>

          {/* Правила автоназначения */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Правила автоназначения
            </Typography>
            
            {formData.autoAssignment.map((rule, index) => (
              <Paper key={rule.id} sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth>
                      <InputLabel>Поле</InputLabel>
                      <Select
                        value={rule.field}
                        onChange={(e) => updateAutoAssignmentRule(rule.id, { field: e.target.value as any })}
                      >
                        <MenuItem value="department">Отдел</MenuItem>
                        <MenuItem value="position">Должность</MenuItem>
                        <MenuItem value="location">Местоположение</MenuItem>
                        <MenuItem value="hireDate">Дата найма</MenuItem>
                        <MenuItem value="custom">Пользовательское поле</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <FormControl fullWidth>
                      <InputLabel>Оператор</InputLabel>
                      <Select
                        value={rule.operator}
                        onChange={(e) => updateAutoAssignmentRule(rule.id, { operator: e.target.value as any })}
                      >
                        <MenuItem value="equals">Равно</MenuItem>
                        <MenuItem value="contains">Содержит</MenuItem>
                        <MenuItem value="startsWith">Начинается с</MenuItem>
                        <MenuItem value="endsWith">Заканчивается на</MenuItem>
                        <MenuItem value="regex">Регулярное выражение</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Значение"
                      value={rule.value}
                      onChange={(e) => updateAutoAssignmentRule(rule.id, { value: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Описание"
                      value={rule.description}
                      onChange={(e) => updateAutoAssignmentRule(rule.id, { description: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={1}>
                    <IconButton
                      onClick={() => removeAutoAssignmentRule(rule.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </Paper>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={addAutoAssignmentRule}
              variant="outlined"
            >
              Добавить правило
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialog({ open: false, isEdit: false, group: null })}>
            Отмена
          </Button>
          <Button onClick={handleSaveGroup} variant="contained">
            {groupDialog.isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог статистики группы */}
      <Dialog
        open={Boolean(selectedGroupStats)}
        onClose={() => {
          setSelectedGroupStats(null);
          setSelectedGroup(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Статистика группы: {selectedGroup?.name}
        </DialogTitle>
        <DialogContent>
          {selectedGroupStats && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6">Участники</Typography>
                  <Typography variant="h4" color="primary">
                    {selectedGroupStats.totalMembers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Активных: {selectedGroupStats.activeMembers}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6">Разрешения</Typography>
                  <Typography variant="h4" color="primary">
                    {selectedGroupStats.totalPermissions}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Унаследованных: {selectedGroupStats.inheritedPermissions}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSelectedGroupStats(null);
            setSelectedGroup(null);
          }}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
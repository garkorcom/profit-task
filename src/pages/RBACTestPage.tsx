import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Avatar,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Security,
  VpnKey,
  Group,
  Person,
  Refresh,
} from '@mui/icons-material';
import { usePermissions } from '../auth/usePermissions';
import { 
  Permission, 
  UserRole, 
  rolePermissions, 
  roleDescriptions,
  permissionDescriptions,
  permissionGroups 
} from '../auth/permissions';
import { Can, PermissionGuard, RoleBased } from '../auth/PermissionGuard';
import { updateUserProfile } from '../api/userApi';
import { useAuth } from '../auth/AuthContext';

const RBACTestPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { role, permissions, hasPermission, loading: permissionsLoading } = usePermissions();
  const [testRole, setTestRole] = useState<UserRole | null>(null);
  const [updating, setUpdating] = useState(false);

  const handleRoleChange = (event: SelectChangeEvent<UserRole>) => {
    setTestRole(event.target.value as UserRole);
  };

  const handleUpdateRole = async () => {
    if (!currentUser || !testRole) return;
    
    setUpdating(true);
    try {
      await updateUserProfile(currentUser.uid, { role: testRole });
      // Перезагрузить страницу чтобы обновить разрешения
      window.location.reload();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Ошибка при обновлении роли');
    } finally {
      setUpdating(false);
    }
  };

  const displayRole = testRole || role;
  const displayPermissions = displayRole ? rolePermissions[displayRole] : [];

  if (permissionsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Тестирование системы RBAC
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        RBAC (Role-Based Access Control) — это система управления доступом на основе ролей. 
        Каждая роль имеет определенный набор разрешений, которые контролируют доступ к функциям приложения.
      </Alert>

      {/* Текущая роль пользователя */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Person sx={{ verticalAlign: 'middle', mr: 1 }} />
            Ваша текущая роль
          </Typography>
          
          {role && (
            <Box sx={{ mt: 2 }}>
              <Chip
                label={roleDescriptions[role].name}
                color="primary"
                sx={{ 
                  backgroundColor: roleDescriptions[role].color,
                  color: 'white',
                  fontSize: '1.1rem',
                  py: 2,
                }}
                avatar={
                  <Avatar sx={{ bgcolor: 'transparent', color: 'white' }}>
                    <Security />
                  </Avatar>
                }
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {roleDescriptions[role].description}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Изменение роли для тестирования */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Group sx={{ verticalAlign: 'middle', mr: 1 }} />
            Тестирование с другой ролью
          </Typography>
          
          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            Внимание! Изменение роли повлияет на ваши права доступа в системе.
          </Alert>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Выберите роль</InputLabel>
              <Select
                value={testRole || ''}
                onChange={handleRoleChange}
                label="Выберите роль"
              >
                <MenuItem value="">Не выбрано</MenuItem>
                {Object.keys(rolePermissions).map((r) => (
                  <MenuItem key={r} value={r}>
                    {roleDescriptions[r as UserRole].name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              onClick={handleUpdateRole}
              disabled={!testRole || updating}
              startIcon={updating ? <CircularProgress size={20} /> : <Refresh />}
            >
              {updating ? 'Обновление...' : 'Применить роль'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Таблица разрешений */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <VpnKey sx={{ verticalAlign: 'middle', mr: 1 }} />
            Разрешения роли {displayRole && `"${roleDescriptions[displayRole].name}"`}
          </Typography>
          
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Разрешение</TableCell>
                  <TableCell>Описание</TableCell>
                  <TableCell align="center">Доступ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.values(Permission).map((perm) => {
                  const hasAccess = displayPermissions.includes(perm);
                  return (
                    <TableRow key={perm}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {perm}
                        </Typography>
                      </TableCell>
                      <TableCell>{permissionDescriptions[perm]}</TableCell>
                      <TableCell align="center">
                        {hasAccess ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Cancel color="error" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Группы разрешений */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Группы разрешений
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
            {Object.entries(permissionGroups).map(([groupName, groupPerms]) => {
              const hasAllInGroup = groupPerms.every(p => displayPermissions.includes(p));
              const hasSomeInGroup = groupPerms.some(p => displayPermissions.includes(p));
              
              return (
                <Box key={groupName} sx={{ flex: '1 1 300px', minWidth: '250px', maxWidth: '400px' }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {groupName.replace(/([A-Z])/g, ' $1').trim()}
                      </Typography>
                      <Chip
                        label={
                          hasAllInGroup 
                            ? 'Полный доступ' 
                            : hasSomeInGroup 
                            ? 'Частичный доступ' 
                            : 'Нет доступа'
                        }
                        color={
                          hasAllInGroup 
                            ? 'success' 
                            : hasSomeInGroup 
                            ? 'warning' 
                            : 'error'
                        }
                        size="small"
                      />
                    </CardContent>
                  </Card>
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* Примеры использования компонентов защиты */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Примеры защищенных элементов
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" gutterBottom>
            Компонент Can (условный рендеринг):
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Can permission={Permission.CREATE_PROJECTS}>
              <Alert severity="success">
                ✅ У вас есть право создавать проекты
              </Alert>
            </Can>
            
            <Can 
              permission={Permission.DELETE_USERS}
              fallback={
                <Alert severity="error">
                  ❌ У вас нет права удалять пользователей
                </Alert>
              }
            >
              <Alert severity="success">
                ✅ У вас есть право удалять пользователей
              </Alert>
            </Can>
          </Box>
          
          <Typography variant="subtitle1" gutterBottom>
            Компонент RoleBased (проверка роли):
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <RoleBased roles={['owner', 'manager']}>
              <Alert severity="info">
                🎯 Этот блок видят только владельцы и менеджеры
              </Alert>
            </RoleBased>
            
            <RoleBased 
              roles={['contractor']}
              fallback={
                <Alert severity="warning">
                  ⚠️ Вы не являетесь подрядчиком
                </Alert>
              }
            >
              <Alert severity="info">
                🔨 Этот блок видят только подрядчики
              </Alert>
            </RoleBased>
          </Box>
          
          <Typography variant="subtitle1" gutterBottom>
            Компонент PermissionGuard:
          </Typography>
          
          <PermissionGuard 
            permission={Permission.MANAGE_FINANCES}
            showError={true}
          >
            <Alert severity="success">
              💰 У вас есть доступ к управлению финансами
            </Alert>
          </PermissionGuard>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RBACTestPage;

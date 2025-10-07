/**
 * UserAccountsPage - Страница управления пользовательскими аккаунтами
 * 
 * Функции:
 * - Просмотр всех пользователей
 * - Редактирование профилей
 * - Управление ролями и разрешениями
 * - Блокировка/разблокировка аккаунтов
 * - Сброс паролей
 * - Аудит активности
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Alert,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Avatar,
  Stack,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  LockReset as LockResetIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import { hasAdminRights } from '../../auth/customClaims';

// Типы для пользователей
interface UserAccount {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: 'active' | 'inactive' | 'blocked' | 'pending';
  lastLogin: string;
  createdAt: string;
  permissions: string[];
  department?: string;
  phone?: string;
  avatar?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

const UserAccountsPage: React.FC = () => {
  const { currentUser, customClaims, userProfile } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState(0);

  // Проверяем права либо через Custom Claims, либо через профиль (для резервного доступа)
  const hasAccess = hasAdminRights(customClaims) || 
    (userProfile?.role === 'owner' || userProfile?.role === 'manager');

  // Моковые данные пользователей для демонстрации
  const mockUsers: UserAccount[] = [
    {
      id: '1',
      email: 'admin@profit-task.com',
      displayName: 'Администратор Системы',
      role: 'admin',
      status: 'active',
      lastLogin: '2024-10-06T10:30:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      permissions: ['users:read', 'users:write', 'admin:full'],
      department: 'IT',
      phone: '+7 999 123-45-67',
      emailVerified: true,
      twoFactorEnabled: true
    },
    {
      id: '2',
      email: 'manager@profit-task.com',
      displayName: 'Менеджер Проектов',
      role: 'manager',
      status: 'active',
      lastLogin: '2024-10-06T09:15:00Z',
      createdAt: '2024-02-15T00:00:00Z',
      permissions: ['projects:read', 'projects:write', 'tasks:manage'],
      department: 'Управление',
      phone: '+7 999 234-56-78',
      emailVerified: true,
      twoFactorEnabled: false
    },
    {
      id: '3',
      email: 'contractor@profit-task.com',
      displayName: 'Подрядчик Иванов',
      role: 'contractor',
      status: 'active',
      lastLogin: '2024-10-05T16:45:00Z',
      createdAt: '2024-03-01T00:00:00Z',
      permissions: ['tasks:read', 'tasks:update'],
      department: 'Строительство',
      phone: '+7 999 345-67-89',
      emailVerified: true,
      twoFactorEnabled: false
    },
    {
      id: '4',
      email: 'inactive@profit-task.com',
      displayName: 'Неактивный Пользователь',
      role: 'user',
      status: 'inactive',
      lastLogin: '2024-09-01T12:00:00Z',
      createdAt: '2024-08-01T00:00:00Z',
      permissions: ['basic:read'],
      department: 'Другое',
      emailVerified: false,
      twoFactorEnabled: false
    }
  ];

  useEffect(() => {
    // Имитация загрузки данных
    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 1000);
  }, []);

  if (!hasAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>
            Доступ запрещен
          </Typography>
          <Typography>
            У вас нет прав администратора для доступа к управлению аккаунтами.
          </Typography>
        </Alert>
      </Box>
    );
  }

  const handleActionClick = (event: React.MouseEvent<HTMLElement>, user: UserAccount) => {
    setSelectedUser(user);
    setActionMenuAnchor(event.currentTarget);
  };

  const handleActionClose = () => {
    setActionMenuAnchor(null);
    setSelectedUser(null);
  };

  const handleEditUser = () => {
    setEditDialogOpen(true);
    handleActionClose();
  };

  const handleBlockUser = () => {
    if (selectedUser) {
      console.log('Блокировка пользователя:', selectedUser.email);
      // Здесь будет логика блокировки
    }
    handleActionClose();
  };

  const handleResetPassword = () => {
    if (selectedUser) {
      console.log('Сброс пароля для:', selectedUser.email);
      // Здесь будет логика сброса пароля
    }
    handleActionClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'blocked': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активен';
      case 'inactive': return 'Неактивен';
      case 'blocked': return 'Заблокирован';
      case 'pending': return 'Ожидает';
      default: return status;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'manager': return 'Менеджер';
      case 'contractor': return 'Подрядчик';
      case 'user': return 'Пользователь';
      default: return role;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Статистика пользователей
  const userStats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    blocked: users.filter(u => u.status === 'blocked').length,
    admins: users.filter(u => u.role === 'admin').length
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <PersonIcon sx={{ mr: 2, fontSize: 40 }} />
          Управление аккаунтами
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Управление пользователями, ролями и разрешениями
        </Typography>
      </Box>

      {/* Статистика */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary">{userStats.total}</Typography>
              <Typography variant="body2" color="textSecondary">Всего</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main">{userStats.active}</Typography>
              <Typography variant="body2" color="textSecondary">Активных</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="text.secondary">{userStats.inactive}</Typography>
              <Typography variant="body2" color="textSecondary">Неактивных</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="error.main">{userStats.blocked}</Typography>
              <Typography variant="body2" color="textSecondary">Заблокирован</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main">{userStats.admins}</Typography>
              <Typography variant="body2" color="textSecondary">Админов</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Фильтры и поиск */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Поиск по имени или email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Роль</InputLabel>
            <Select
              value={filterRole}
              label="Роль"
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <MenuItem value="all">Все роли</MenuItem>
              <MenuItem value="admin">Администратор</MenuItem>
              <MenuItem value="manager">Менеджер</MenuItem>
              <MenuItem value="contractor">Подрядчик</MenuItem>
              <MenuItem value="user">Пользователь</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Статус</InputLabel>
            <Select
              value={filterStatus}
              label="Статус"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">Все статусы</MenuItem>
              <MenuItem value="active">Активные</MenuItem>
              <MenuItem value="inactive">Неактивные</MenuItem>
              <MenuItem value="blocked">Заблокированные</MenuItem>
              <MenuItem value="pending">Ожидающие</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => console.log('Создание нового пользователя')}
          >
            Добавить пользователя
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => console.log('Экспорт пользователей')}
          >
            Экспорт
          </Button>
        </Stack>
      </Paper>

      {/* Таблица пользователей */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Пользователь</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Отдел</TableCell>
              <TableCell>Последний вход</TableCell>
              <TableCell>2FA</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Badge
                        badgeContent={user.role === 'admin' ? <AdminIcon fontSize="small" /> : null}
                        color="primary"
                      >
                        <Avatar src={user.avatar}>
                          {user.displayName.charAt(0)}
                        </Avatar>
                      </Badge>
                      <Box>
                        <Typography variant="subtitle2">
                          {user.displayName}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {user.email}
                        </Typography>
                        {user.phone && (
                          <Typography variant="caption" color="textSecondary">
                            {user.phone}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getRoleLabel(user.role)}
                      size="small"
                      color={user.role === 'admin' ? 'error' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(user.status)}
                      size="small"
                      color={getStatusColor(user.status) as any}
                    />
                  </TableCell>
                  <TableCell>{user.department || '-'}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(user.lastLogin)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.twoFactorEnabled ? 'Включена' : 'Отключена'}
                      size="small"
                      color={user.twoFactorEnabled ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={(e) => handleActionClick(e, user)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredUsers.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
          labelRowsPerPage="Строк на странице:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count}`}
        />
      </TableContainer>

      {/* Меню действий */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionClose}
      >
        <MenuItem onClick={() => console.log('Просмотр профиля')}>
          <ViewIcon sx={{ mr: 1 }} />
          Просмотр профиля
        </MenuItem>
        <MenuItem onClick={handleEditUser}>
          <EditIcon sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleResetPassword}>
          <LockResetIcon sx={{ mr: 1 }} />
          Сбросить пароль
        </MenuItem>
        <MenuItem onClick={handleBlockUser} sx={{ color: 'error.main' }}>
          <BlockIcon sx={{ mr: 1 }} />
          {selectedUser?.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}
        </MenuItem>
      </Menu>

      {/* Диалог редактирования пользователя */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Редактирование пользователя: {selectedUser?.displayName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Здесь будет форма редактирования пользователя */}
            <Alert severity="info">
              Форма редактирования пользователя будет реализована в следующей итерации.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Отмена
          </Button>
          <Button variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserAccountsPage;
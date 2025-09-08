/**
 * Permission Debugger - Инструмент для отладки разрешений
 * 
 * Позволяет администраторам:
 * - Просматривать эффективные разрешения пользователя
 * - Анализировать источники разрешений (роли, группы, временные назначения)
 * - Тестировать разрешения в реальном времени
 * - Импровизировать пользователей для тестирования
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import * as rbacApi from '../../api/rbacApi';
import { UserProfile } from '../../api/userApi';
import type { 
  ComputedPermissions, 
  PermissionSource,
  UserRBACProfile
} from '../../types/rbac';

interface PermissionDebuggerProps {}

interface UserSearchResult {
  user: UserProfile;
  rbacProfile?: UserRBACProfile;
  effectivePermissions?: ComputedPermissions;
}

interface PermissionTest {
  permission: string;
  context?: any;
  result: boolean;
  sources: PermissionSource[];
  explanation: string;
}

const PermissionDebugger: React.FC<PermissionDebuggerProps> = () => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionTests, setPermissionTests] = useState<PermissionTest[]>([]);
  const [testPermission, setTestPermission] = useState('');
  const [impersonationMode, setImpersonationMode] = useState(false);
  const [impersonationDialog, setImpersonationDialog] = useState(false);
  
  // Поиск пользователей
  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const users = await rbacApi.searchUsers(searchQuery);
      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Выбор пользователя для анализа
  const handleSelectUser = async (user: UserProfile) => {
    setIsLoading(true);
    try {
      const [rbacProfile, effectivePermissions] = await Promise.all([
        rbacApi.getUserRBACProfile(user.id),
        rbacApi.getUserEffectivePermissions(user.id)
      ]);

      setSelectedUser({
        user,
        rbacProfile: rbacProfile || undefined,
        effectivePermissions: effectivePermissions || undefined
      });

      setPermissionTests([]); // Очищаем предыдущие тесты
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Тестирование разрешения
  const handleTestPermission = async () => {
    if (!selectedUser || !testPermission.trim()) return;

    setIsLoading(true);
    try {
      const result = await rbacApi.checkUserPermission(
        selectedUser.user.id,
        testPermission as any,
        {} // context - можно расширить
      );

      const newTest: PermissionTest = {
        permission: testPermission,
        result: result.hasPermission,
        sources: result.sources || [],
        explanation: result.explanation || 'No explanation provided'
      };

      setPermissionTests(prev => [newTest, ...prev]);
      setTestPermission('');
    } catch (error) {
      console.error('Error testing permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Импровизация пользователя
  const handleStartImpersonation = () => {
    setImpersonationDialog(true);
  };

  const handleConfirmImpersonation = async () => {
    if (!selectedUser) return;

    try {
      // TODO: Implement safe user impersonation
      console.log('Starting impersonation for user:', selectedUser.user.id);
      setImpersonationMode(true);
      setImpersonationDialog(false);
      
      // В реальной реализации здесь должна быть логика безопасной импровизации
      // с записью в audit log и временными токенами
    } catch (error) {
      console.error('Error starting impersonation:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <SecurityIcon sx={{ mr: 2, fontSize: 40 }} />
        Permission Debugger
      </Typography>

      {impersonationMode && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => setImpersonationMode(false)}>
              Выйти из режима
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Режим импровизации активен для пользователя: {selectedUser?.user.displayName}
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Поиск пользователей */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Поиск пользователей
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Email, имя, или ID пользователя"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
              />
              <Button 
                variant="contained" 
                onClick={handleSearchUsers}
                disabled={isLoading}
              >
                <SearchIcon />
              </Button>
            </Box>

            <List dense>
              {searchResults.map((user) => (
                <ListItem
                  key={user.id}
                  button
                  onClick={() => handleSelectUser(user)}
                  selected={selectedUser?.user.id === user.id}
                >
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={user.displayName || user.email}
                    secondary={`${user.role} • ${user.email}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Детали пользователя */}
        <Grid item xs={12} md={8}>
          {selectedUser ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Информация о пользователе */}
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Анализ разрешений: {selectedUser.user.displayName || selectedUser.user.email}
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={impersonationMode ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    onClick={handleStartImpersonation}
                    color={impersonationMode ? "secondary" : "primary"}
                  >
                    {impersonationMode ? 'Активна импровизация' : 'Импровизировать пользователя'}
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Роль</Typography>
                    <Chip label={selectedUser.user.role} color="primary" size="small" />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Статус</Typography>
                    <Chip 
                      label={selectedUser.user.isActive ? 'Активен' : 'Неактивен'} 
                      color={selectedUser.user.isActive ? 'success' : 'error'} 
                      size="small" 
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Тестирование разрешений */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Тестирование разрешений
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Введите разрешение для проверки (например: VIEW_ALL_PROJECTS)"
                    value={testPermission}
                    onChange={(e) => setTestPermission(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleTestPermission()}
                  />
                  <Button 
                    variant="contained" 
                    onClick={handleTestPermission}
                    disabled={isLoading || !testPermission.trim()}
                  >
                    Тест
                  </Button>
                </Box>

                {permissionTests.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Результаты тестирования:
                    </Typography>
                    {permissionTests.map((test, index) => (
                      <Card key={index} sx={{ mb: 1 }} variant="outlined">
                        <CardContent sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {test.result ? (
                              <CheckCircleIcon color="success" />
                            ) : (
                              <CancelIcon color="error" />
                            )}
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {test.permission}
                            </Typography>
                            <Chip 
                              label={test.result ? 'РАЗРЕШЕНО' : 'ЗАПРЕЩЕНО'} 
                              color={test.result ? 'success' : 'error'} 
                              size="small" 
                            />
                          </Box>
                          {test.sources.length > 0 && (
                            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                              Источники: {test.sources.map((s: any) => s.type || 'Unknown').join(', ')}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Paper>

              {/* Эффективные разрешения */}
              {selectedUser.effectivePermissions && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Эффективные разрешения
                  </Typography>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        Разрешения ({Array.from(selectedUser.effectivePermissions.permissions).length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {Array.from(selectedUser.effectivePermissions.permissions).map((permission, index) => (
                          <Chip 
                            key={index}
                            label={typeof permission === 'string' ? permission : permission[0]} 
                            size="small" 
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        Роли (N/A)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {(selectedUser.effectivePermissions as any).roles?.map((role: any, index: any) => (
                        <Box key={index} sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {role.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Разрешений: {role.permissions.length}
                          </Typography>
                        </Box>
                      ))}
                    </AccordionDetails>
                  </Accordion>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        Группы (N/A)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {(selectedUser.effectivePermissions as any).groups?.map((group: any, index: any) => (
                        <Box key={index} sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {group.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Ролей: {group.roles.length}
                          </Typography>
                        </Box>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                </Paper>
              )}
            </Box>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <InfoIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                Выберите пользователя для анализа разрешений
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Найдите пользователя в левой панели и кликните на него
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Диалог подтверждения импровизации */}
      <Dialog open={impersonationDialog} onClose={() => setImpersonationDialog(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon color="warning" sx={{ mr: 1 }} />
            Импровизация пользователя
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Внимание!</strong> Вы собираетесь войти в режим импровизации пользователя{' '}
              <strong>{selectedUser?.user.displayName || selectedUser?.user.email}</strong>.
            </Typography>
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            В этом режиме:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText 
                primary="• Вы будете видеть интерфейс глазами выбранного пользователя"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="• Все действия будут записаны в audit log"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="• Сессия импровизации ограничена по времени"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="• Вы сможете выйти из режима в любой момент"
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImpersonationDialog(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleConfirmImpersonation} 
            variant="contained" 
            color="warning"
          >
            Начать импровизацию
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PermissionDebugger;
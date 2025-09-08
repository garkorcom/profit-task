/**
 * Session Manager Component
 * 
 * Модуль 16: Session Management
 * - Мониторинг активных сессий
 * - Принудительный logout
 * - Ограничение одновременных сессий
 * - Уведомления о подозрительной активности
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  FormControlLabel,
  Switch,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Smartphone as SmartphoneIcon,
  Tablet as TabletIcon,
  Logout as LogoutIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
  LocationOn as LocationIcon,
  AccessTime as AccessTimeIcon,
  Block as BlockIcon,
  Notifications as NotificationsIcon,
  Shield as ShieldIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';

interface UserSession {
  sessionId: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceName: string;
  browser: string;
  operatingSystem: string;
  ipAddress: string;
  location: {
    city: string;
    country: string;
    timezone: string;
  };
  isCurrentSession: boolean;
  isTrusted: boolean;
  loginTime: Date;
  lastActivity: Date;
  status: 'active' | 'idle' | 'suspicious' | 'terminated';
  mfaVerified: boolean;
  userAgent: string;
}

interface SecuritySettings {
  maxConcurrentSessions: number;
  sessionTimeout: number; // в минутах
  requireMFAForNewDevices: boolean;
  blockSuspiciousActivity: boolean;
  notifyNewLogins: boolean;
  autoLogoutIdleSessions: boolean;
  trustedDevicesEnabled: boolean;
}

interface SuspiciousActivity {
  id: string;
  type: 'unusual_location' | 'multiple_failed_attempts' | 'concurrent_sessions' | 'unknown_device';
  description: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
  isResolved: boolean;
  sessionId?: string;
}

const SessionManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Диалоги
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [sessionToTerminate, setSessionToTerminate] = useState<UserSession | null>(null);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  useEffect(() => {
    loadSessions();
    loadSecuritySettings();
    loadSuspiciousActivities();
  }, [currentUser]);

  const loadSessions = async () => {
    try {
      // TODO: Replace with actual API call
      const mockSessions: UserSession[] = [
        {
          sessionId: 'current_session',
          deviceType: 'desktop',
          deviceName: 'MacBook Pro',
          browser: 'Chrome 118',
          operatingSystem: 'macOS 14.0',
          ipAddress: '192.168.1.100',
          location: {
            city: 'Москва',
            country: 'Россия',
            timezone: 'Europe/Moscow'
          },
          isCurrentSession: true,
          isTrusted: true,
          loginTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          lastActivity: new Date(),
          status: 'active',
          mfaVerified: true,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        {
          sessionId: 'mobile_session',
          deviceType: 'mobile',
          deviceName: 'iPhone 14',
          browser: 'Safari Mobile',
          operatingSystem: 'iOS 17.0',
          ipAddress: '192.168.1.101',
          location: {
            city: 'Москва',
            country: 'Россия',
            timezone: 'Europe/Moscow'
          },
          isCurrentSession: false,
          isTrusted: true,
          loginTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
          lastActivity: new Date(Date.now() - 30 * 60 * 1000),
          status: 'idle',
          mfaVerified: true,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
        },
        {
          sessionId: 'suspicious_session',
          deviceType: 'desktop',
          deviceName: 'Unknown Computer',
          browser: 'Firefox 119',
          operatingSystem: 'Windows 11',
          ipAddress: '203.0.113.45',
          location: {
            city: 'Санкт-Петербург',
            country: 'Россия',
            timezone: 'Europe/Moscow'
          },
          isCurrentSession: false,
          isTrusted: false,
          loginTime: new Date(Date.now() - 10 * 60 * 1000),
          lastActivity: new Date(Date.now() - 5 * 60 * 1000),
          status: 'suspicious',
          mfaVerified: false,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0)'
        }
      ];
      
      setSessions(mockSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadSecuritySettings = async () => {
    try {
      // TODO: Replace with actual API call
      const mockSettings: SecuritySettings = {
        maxConcurrentSessions: 5,
        sessionTimeout: 480, // 8 часов
        requireMFAForNewDevices: true,
        blockSuspiciousActivity: true,
        notifyNewLogins: true,
        autoLogoutIdleSessions: true,
        trustedDevicesEnabled: true
      };
      
      setSecuritySettings(mockSettings);
    } catch (error) {
      console.error('Error loading security settings:', error);
    }
  };

  const loadSuspiciousActivities = async () => {
    try {
      // TODO: Replace with actual API call
      const mockActivities: SuspiciousActivity[] = [
        {
          id: 'activity_1',
          type: 'unusual_location',
          description: 'Вход с нового местоположения: Санкт-Петербург',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          severity: 'medium',
          isResolved: false,
          sessionId: 'suspicious_session'
        },
        {
          id: 'activity_2',
          type: 'multiple_failed_attempts',
          description: '3 неудачных попытки входа за последний час',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          severity: 'high',
          isResolved: false
        }
      ];
      
      setSuspiciousActivities(mockActivities);
    } catch (error) {
      console.error('Error loading suspicious activities:', error);
    }
  };

  const terminateSession = async (sessionId: string) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual Cloud Function call
      console.log('Terminating session:', sessionId);
      
      setSessions(prev => prev.filter(session => session.sessionId !== sessionId));
      setShowTerminateDialog(false);
      setSessionToTerminate(null);
      
    } catch (error) {
      console.error('Error terminating session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const terminateAllOtherSessions = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual Cloud Function call
      console.log('Terminating all other sessions');
      
      setSessions(prev => prev.filter(session => session.isCurrentSession));
      
    } catch (error) {
      console.error('Error terminating sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markActivityResolved = async (activityId: string) => {
    try {
      // TODO: Replace with actual API call
      setSuspiciousActivities(prev => 
        prev.map(activity => 
          activity.id === activityId 
            ? { ...activity, isResolved: true }
            : activity
        )
      );
    } catch (error) {
      console.error('Error resolving activity:', error);
    }
  };

  const updateSecuritySettings = async (newSettings: SecuritySettings) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual Cloud Function call
      console.log('Updating security settings:', newSettings);
      
      setSecuritySettings(newSettings);
      setShowSettingsDialog(false);
      
    } catch (error) {
      console.error('Error updating security settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <SmartphoneIcon />;
      case 'tablet':
        return <TabletIcon />;
      case 'desktop':
      default:
        return <ComputerIcon />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'idle':
        return 'info';
      case 'suspicious':
        return 'error';
      case 'terminated':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getSeverityColor = (severity: string): 'error' | 'warning' | 'info' => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      default:
        return 'info';
    }
  };

  if (!securitySettings) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Загрузка...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <SecurityIcon sx={{ mr: 2, fontSize: 40 }} />
        Управление сессиями
      </Typography>

      {/* Подозрительная активность */}
      {suspiciousActivities.filter(a => !a.isResolved).length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Обнаружена подозрительная активность! 
          </Typography>
          <Typography variant="body2">
            {suspiciousActivities.filter(a => !a.isResolved).length} неразрешенных инцидентов требуют вашего внимания.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Активные сессии */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Активные сессии ({sessions.length})
              </Typography>
              <Box>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => setShowSettingsDialog(true)}
                  sx={{ mr: 1 }}
                >
                  Настройки
                </Button>
                <Button 
                  variant="contained" 
                  color="error"
                  size="small"
                  onClick={terminateAllOtherSessions}
                  disabled={isLoading}
                >
                  Завершить все другие
                </Button>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Устройство</TableCell>
                    <TableCell>Местоположение</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Последняя активность</TableCell>
                    <TableCell align="right">Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.sessionId}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getDeviceIcon(session.deviceType)}
                          <Box sx={{ ml: 2 }}>
                            <Typography variant="body2">
                              {session.deviceName}
                              {session.isCurrentSession && (
                                <Chip label="Текущая" size="small" color="primary" sx={{ ml: 1 }} />
                              )}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {session.browser} • {session.operatingSystem}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LocationIcon fontSize="small" sx={{ mr: 1 }} />
                          <Box>
                            <Typography variant="body2">
                              {session.location.city}, {session.location.country}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {session.ipAddress}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={session.status}
                          color={getStatusColor(session.status)}
                          size="small"
                        />
                        {session.mfaVerified && (
                          <Chip 
                            label="MFA ✓"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ ml: 1 }}
                          />
                        )}
                        {session.isTrusted && (
                          <ShieldIcon 
                            fontSize="small" 
                            color="primary" 
                            sx={{ ml: 1 }}
                            titleAccess="Доверенное устройство"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AccessTimeIcon fontSize="small" sx={{ mr: 1 }} />
                          <Box>
                            <Typography variant="body2">
                              {session.lastActivity.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Вход: {session.loginTime.toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {!session.isCurrentSession && (
                          <Tooltip title="Завершить сессию">
                            <IconButton 
                              size="small"
                              color="error"
                              onClick={() => {
                                setSessionToTerminate(session);
                                setShowTerminateDialog(true);
                              }}
                            >
                              <LogoutIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Боковая панель с настройками и активностью */}
        <Grid item xs={12} lg={4}>
          {/* Подозрительная активность */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon sx={{ mr: 1 }} />
              Подозрительная активность
            </Typography>

            <List dense>
              {suspiciousActivities.slice(0, 5).map((activity) => (
                <ListItem key={activity.id}>
                  <ListItemIcon>
                    {activity.isResolved ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <ErrorIcon color={getSeverityColor(activity.severity)} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.description}
                    secondary={`${activity.timestamp.toLocaleString()} • ${activity.severity}`}
                    sx={{ 
                      textDecoration: activity.isResolved ? 'line-through' : 'none',
                      opacity: activity.isResolved ? 0.6 : 1
                    }}
                  />
                  {!activity.isResolved && (
                    <ListItemSecondaryAction>
                      <IconButton 
                        size="small" 
                        onClick={() => markActivityResolved(activity.id)}
                      >
                        <CheckCircleIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
              ))}
            </List>

            {suspiciousActivities.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                Подозрительной активности не обнаружено
              </Typography>
            )}
          </Paper>

          {/* Краткие настройки безопасности */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Настройки безопасности
            </Typography>

            <List dense>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Макс. сессий"
                  secondary={securitySettings.maxConcurrentSessions}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AccessTimeIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Таймаут сессии"
                  secondary={`${Math.floor(securitySettings.sessionTimeout / 60)} ч`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <NotificationsIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Уведомления о входах"
                  secondary={securitySettings.notifyNewLogins ? 'Включены' : 'Отключены'}
                />
              </ListItem>
            </List>

            <Button 
              variant="outlined" 
              size="small" 
              fullWidth
              onClick={() => setShowSettingsDialog(true)}
              sx={{ mt: 1 }}
            >
              Все настройки
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Диалог завершения сессии */}
      <Dialog open={showTerminateDialog} onClose={() => setShowTerminateDialog(false)}>
        <DialogTitle>Завершить сессию</DialogTitle>
        <DialogContent>
          {sessionToTerminate && (
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Вы уверены, что хотите завершить сессию?
              </Typography>
              
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2">
                    <strong>Устройство:</strong> {sessionToTerminate.deviceName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Браузер:</strong> {sessionToTerminate.browser}
                  </Typography>
                  <Typography variant="body2">
                    <strong>IP:</strong> {sessionToTerminate.ipAddress}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Местоположение:</strong> {sessionToTerminate.location.city}, {sessionToTerminate.location.country}
                  </Typography>
                </CardContent>
              </Card>

              {sessionToTerminate.status === 'suspicious' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Эта сессия помечена как подозрительная. Рекомендуется завершить её немедленно.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTerminateDialog(false)}>
            Отмена
          </Button>
          <Button 
            onClick={() => sessionToTerminate && terminateSession(sessionToTerminate.sessionId)}
            color="error"
            disabled={isLoading}
          >
            Завершить сессию
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог настроек безопасности */}
      <Dialog open={showSettingsDialog} onClose={() => setShowSettingsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Настройки безопасности сессий</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Максимум одновременных сессий"
              type="number"
              value={securitySettings.maxConcurrentSessions}
              onChange={(e) => setSecuritySettings({
                ...securitySettings,
                maxConcurrentSessions: parseInt(e.target.value) || 1
              })}
              sx={{ mb: 2 }}
              inputProps={{ min: 1, max: 20 }}
            />

            <TextField
              fullWidth
              label="Таймаут сессии (минуты)"
              type="number"
              value={securitySettings.sessionTimeout}
              onChange={(e) => setSecuritySettings({
                ...securitySettings,
                sessionTimeout: parseInt(e.target.value) || 60
              })}
              sx={{ mb: 2 }}
              inputProps={{ min: 30, max: 1440 }}
            />

            <Divider sx={{ my: 2 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={securitySettings.requireMFAForNewDevices}
                  onChange={(e) => setSecuritySettings({
                    ...securitySettings,
                    requireMFAForNewDevices: e.target.checked
                  })}
                />
              }
              label="Требовать MFA для новых устройств"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={securitySettings.blockSuspiciousActivity}
                  onChange={(e) => setSecuritySettings({
                    ...securitySettings,
                    blockSuspiciousActivity: e.target.checked
                  })}
                />
              }
              label="Блокировать подозрительную активность"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={securitySettings.notifyNewLogins}
                  onChange={(e) => setSecuritySettings({
                    ...securitySettings,
                    notifyNewLogins: e.target.checked
                  })}
                />
              }
              label="Уведомления о новых входах"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={securitySettings.autoLogoutIdleSessions}
                  onChange={(e) => setSecuritySettings({
                    ...securitySettings,
                    autoLogoutIdleSessions: e.target.checked
                  })}
                />
              }
              label="Автовыход неактивных сессий"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={securitySettings.trustedDevicesEnabled}
                  onChange={(e) => setSecuritySettings({
                    ...securitySettings,
                    trustedDevicesEnabled: e.target.checked
                  })}
                />
              }
              label="Доверенные устройства"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettingsDialog(false)}>
            Отмена
          </Button>
          <Button 
            onClick={() => updateSecuritySettings(securitySettings)}
            variant="contained"
            disabled={isLoading}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SessionManager;
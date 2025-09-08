/**
 * Менеджер деактивации пользователей
 * 
 * Модуль 14: User Offboarding/Deactivation Workflow
 * - Интерфейс для инициации деактивации
 * - Мониторинг процесса деактивации
 * - Управление архивами пользователей
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Alert,
  IconButton,
  Tooltip,
  Grid,
  FormControlLabel,
  Switch,
  Divider
} from '@mui/material';
import {
  PersonOff as PersonOffIcon,
  Cancel as CancelIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import { UserProfile } from '../../api/userApi';
import * as rbacApi from '../../api/rbacApi';

enum OffboardingStatus {
  ACTIVE = 'active',
  PENDING_DEACTIVATION = 'pending_deactivation',
  DEACTIVATED = 'deactivated',
  ARCHIVED = 'archived',
  CANCELLED = 'CANCELLED'
}

enum OffboardingType {
  VOLUNTARY_RESIGNATION = 'voluntary_resignation',
  INVOLUNTARY_TERMINATION = 'involuntary_termination',
  CONTRACT_EXPIRATION = 'contract_expiration',
  ADMINISTRATIVE = 'administrative'
}

interface OffboardingRequest {
  offboardingId?: string;
  targetUserId: string;
  targetUserName?: string;
  type: OffboardingType;
  effectiveDate: Date;
  reason: string;
  requestedBy: string;
  notifyTeam: boolean;
  notifyHR: boolean;
  immediateDeactivation: boolean;
  dataRetentionDays: number;
  status?: OffboardingStatus;
  createdAt?: Date;
  completedAt?: Date;
  steps?: Record<string, boolean>;
  completedSteps?: string[];
  failedSteps?: Array<{ step: string; error: string }>;
}

const UserOffboardingManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [offboardingRequests, setOffboardingRequests] = useState<OffboardingRequest[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [offboardingDialog, setOffboardingDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [selectedOffboarding, setSelectedOffboarding] = useState<OffboardingRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Форма деактивации
  const [offboardingForm, setOffboardingForm] = useState<Partial<OffboardingRequest>>({
    type: OffboardingType.VOLUNTARY_RESIGNATION,
    effectiveDate: new Date(),
    reason: '',
    notifyTeam: true,
    notifyHR: true,
    immediateDeactivation: false,
    dataRetentionDays: 90
  });

  useEffect(() => {
    loadUsers();
    loadOffboardingRequests();
  }, []);

  const loadUsers = async () => {
    try {
      const userList = await rbacApi.getAllUsers();
      setUsers(userList.filter(user => user.isActive));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadOffboardingRequests = async () => {
    try {
      // TODO: Replace with real API call
      setOffboardingRequests([]);
    } catch (error) {
      console.error('Error loading offboarding requests:', error);
    }
  };

  const handleInitiateOffboarding = () => {
    if (!selectedUser) return;

    setOffboardingForm({
      ...offboardingForm,
      targetUserId: selectedUser.id
    });
    setOffboardingDialog(true);
  };

  const handleSubmitOffboarding = async () => {
    if (!selectedUser || !offboardingForm.reason?.trim()) return;

    setIsLoading(true);
    try {
      // TODO: Replace with actual Cloud Function call
      console.log('Initiating offboarding:', {
        ...offboardingForm,
        targetUserId: selectedUser.id,
        requestedBy: currentUser?.uid
      });

      // Mock successful response
      const mockOffboardingId = `offboard_${Date.now()}`;
      const newOffboarding: OffboardingRequest = {
        ...offboardingForm as OffboardingRequest,
        offboardingId: mockOffboardingId,
        targetUserId: selectedUser.id,
        targetUserName: selectedUser.displayName || selectedUser.email,
        requestedBy: currentUser?.uid || 'unknown',
        status: offboardingForm.immediateDeactivation 
          ? OffboardingStatus.DEACTIVATED 
          : OffboardingStatus.PENDING_DEACTIVATION,
        createdAt: new Date(),
        steps: {
          user_notification: offboardingForm.immediateDeactivation || false,
          permissions_revoked: offboardingForm.immediateDeactivation || false,
          sessions_terminated: offboardingForm.immediateDeactivation || false,
          data_archived: false,
          team_notified: false,
          hr_notified: false,
          audit_logged: offboardingForm.immediateDeactivation || false
        }
      };

      setOffboardingRequests(prev => [newOffboarding, ...prev]);
      setOffboardingDialog(false);
      setSelectedUser(null);
      setOffboardingForm({
        type: OffboardingType.VOLUNTARY_RESIGNATION,
        effectiveDate: new Date(),
        reason: '',
        notifyTeam: true,
        notifyHR: true,
        immediateDeactivation: false,
        dataRetentionDays: 90
      });

      // Reload users to remove deactivated user
      await loadUsers();

    } catch (error) {
      console.error('Error initiating offboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewOffboardingStatus = (offboarding: OffboardingRequest) => {
    setSelectedOffboarding(offboarding);
    setStatusDialog(true);
  };

  const handleCancelOffboarding = async (offboardingId: string) => {
    try {
      // TODO: Replace with actual Cloud Function call
      console.log('Cancelling offboarding:', offboardingId);
      
      setOffboardingRequests(prev => 
        prev.map(req => 
          req.offboardingId === offboardingId 
            ? { ...req, status: OffboardingStatus.CANCELLED }
            : req
        )
      );
    } catch (error) {
      console.error('Error cancelling offboarding:', error);
    }
  };

  const getOffboardingTypeLabel = (type: OffboardingType): string => {
    switch (type) {
      case OffboardingType.VOLUNTARY_RESIGNATION:
        return 'Добровольная отставка';
      case OffboardingType.INVOLUNTARY_TERMINATION:
        return 'Принудительное увольнение';
      case OffboardingType.CONTRACT_EXPIRATION:
        return 'Истечение контракта';
      case OffboardingType.ADMINISTRATIVE:
        return 'Административное';
      default:
        return type;
    }
  };

  const getStatusColor = (status: OffboardingStatus): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
    switch (status) {
      case OffboardingStatus.PENDING_DEACTIVATION:
        return 'warning';
      case OffboardingStatus.DEACTIVATED:
        return 'success';
      case OffboardingStatus.ARCHIVED:
        return 'info';
      case OffboardingStatus.CANCELLED:
        return 'error';
      default:
        return 'default';
    }
  };

  const getOffboardingSteps = () => [
    'Уведомление пользователя',
    'Отзыв разрешений',
    'Завершение сессий',
    'Архивация данных',
    'Уведомление команды',
    'Уведомление HR',
    'Audit logging'
  ];

  const getCompletedStepsCount = (offboarding: OffboardingRequest): number => {
    if (!offboarding.steps) return 0;
    return Object.values(offboarding.steps).filter(Boolean).length;
  };

  return (
    <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <PersonOffIcon sx={{ mr: 2, fontSize: 40 }} />
          Управление деактивацией пользователей
        </Typography>

        <Grid container spacing={3}>
          {/* Активные пользователи */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Активные пользователи
              </Typography>
              
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {users.map((user) => (
                  <Card 
                    key={user.id} 
                    sx={{ mb: 1, cursor: 'pointer' }}
                    onClick={() => setSelectedUser(user)}
                    variant={selectedUser?.id === user.id ? 'elevation' : 'outlined'}
                  >
                    <CardContent sx={{ py: 1 }}>
                      <Typography variant="body1">
                        {user.displayName || user.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.role} • {user.department || 'Не указан отдел'}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="contained" 
                  color="error"
                  onClick={handleInitiateOffboarding}
                  disabled={!selectedUser}
                  startIcon={<PersonOffIcon />}
                >
                  Начать деактивацию
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Статус деактиваций */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Процессы деактивации
              </Typography>

              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {offboardingRequests.map((offboarding) => (
                  <Card key={offboarding.offboardingId} sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body1">
                            {offboarding.targetUserName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {getOffboardingTypeLabel(offboarding.type)}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <Chip 
                              label={offboarding.status}
                              size="small"
                              color={getStatusColor(offboarding.status!)}
                            />
                            {offboarding.steps && (
                              <Typography variant="caption" sx={{ ml: 1 }}>
                                {getCompletedStepsCount(offboarding)}/7 шагов
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Box>
                          <Tooltip title="Просмотр статуса">
                            <IconButton 
                              size="small"
                              onClick={() => handleViewOffboardingStatus(offboarding)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          {offboarding.status === OffboardingStatus.PENDING_DEACTIVATION && (
                            <Tooltip title="Отменить деактивацию">
                              <IconButton 
                                size="small"
                                color="error"
                                onClick={() => handleCancelOffboarding(offboarding.offboardingId!)}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}

                {offboardingRequests.length === 0 && (
                  <Alert severity="info">
                    Нет активных процессов деактивации
                  </Alert>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Диалог инициации деактивации */}
        <Dialog 
          open={offboardingDialog} 
          onClose={() => setOffboardingDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon color="warning" sx={{ mr: 1 }} />
              Деактивация пользователя: {selectedUser?.displayName || selectedUser?.email}
            </Box>
          </DialogTitle>
          
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Внимание!</strong> Деактивация пользователя приведет к:
              </Typography>
              <ul>
                <li>Отключению доступа к системе</li>
                <li>Отзыву всех разрешений и ролей</li>
                <li>Завершению всех активных сессий</li>
                <li>Архивации пользовательских данных</li>
              </ul>
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Тип деактивации</InputLabel>
                  <Select
                    value={offboardingForm.type}
                    onChange={(e) => setOffboardingForm({ 
                      ...offboardingForm, 
                      type: e.target.value as OffboardingType 
                    })}
                  >
                    <MenuItem value={OffboardingType.VOLUNTARY_RESIGNATION}>
                      Добровольная отставка
                    </MenuItem>
                    <MenuItem value={OffboardingType.INVOLUNTARY_TERMINATION}>
                      Принудительное увольнение
                    </MenuItem>
                    <MenuItem value={OffboardingType.CONTRACT_EXPIRATION}>
                      Истечение контракта
                    </MenuItem>
                    <MenuItem value={OffboardingType.ADMINISTRATIVE}>
                      Административное
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Дата вступления в силу"
                  type="datetime-local"
                  value={offboardingForm.effectiveDate ? 
                    offboardingForm.effectiveDate.toISOString().slice(0, 16) : ''
                  }
                  onChange={(e) => setOffboardingForm({ 
                    ...offboardingForm, 
                    effectiveDate: e.target.value ? new Date(e.target.value) : new Date()
                  })}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Причина деактивации"
                  value={offboardingForm.reason}
                  onChange={(e) => setOffboardingForm({ 
                    ...offboardingForm, 
                    reason: e.target.value 
                  })}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Период хранения данных (дни)"
                  value={offboardingForm.dataRetentionDays}
                  onChange={(e) => setOffboardingForm({ 
                    ...offboardingForm, 
                    dataRetentionDays: parseInt(e.target.value) || 90 
                  })}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={offboardingForm.immediateDeactivation}
                      onChange={(e) => setOffboardingForm({ 
                        ...offboardingForm, 
                        immediateDeactivation: e.target.checked 
                      })}
                    />
                  }
                  label="Немедленная деактивация"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={offboardingForm.notifyTeam}
                      onChange={(e) => setOffboardingForm({ 
                        ...offboardingForm, 
                        notifyTeam: e.target.checked 
                      })}
                    />
                  }
                  label="Уведомить команду"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={offboardingForm.notifyHR}
                      onChange={(e) => setOffboardingForm({ 
                        ...offboardingForm, 
                        notifyHR: e.target.checked 
                      })}
                    />
                  }
                  label="Уведомить HR"
                />
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOffboardingDialog(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSubmitOffboarding}
              variant="contained"
              color="error"
              disabled={isLoading || !offboardingForm.reason?.trim()}
            >
              {isLoading ? 'Обработка...' : 'Начать деактивацию'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Диалог статуса деактивации */}
        <Dialog 
          open={statusDialog} 
          onClose={() => setStatusDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Статус деактивации: {selectedOffboarding?.targetUserName}
          </DialogTitle>
          
          <DialogContent>
            {selectedOffboarding && (
              <Box>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Тип</Typography>
                    <Typography>{getOffboardingTypeLabel(selectedOffboarding.type)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Статус</Typography>
                    <Chip 
                      label={selectedOffboarding.status}
                      color={getStatusColor(selectedOffboarding.status!)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Дата создания</Typography>
                    <Typography>{selectedOffboarding.createdAt?.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Дата вступления в силу</Typography>
                    <Typography>{selectedOffboarding.effectiveDate.toLocaleString()}</Typography>
                  </Grid>
                </Grid>

                <Typography variant="h6" gutterBottom>Прогресс выполнения</Typography>
                
                <Stepper orientation="vertical">
                  {getOffboardingSteps().map((stepLabel, index) => {
                    const stepKey = Object.keys(selectedOffboarding.steps || {})[index];
                    const isCompleted = selectedOffboarding.steps?.[stepKey] || false;
                    const hasFailed = selectedOffboarding.failedSteps?.some(
                      failed => failed.step.includes(stepKey)
                    );

                    return (
                      <Step key={stepLabel} completed={isCompleted}>
                        <StepLabel 
                          error={hasFailed}
                          icon={hasFailed ? <ErrorIcon /> : undefined}
                        >
                          {stepLabel}
                        </StepLabel>
                      </Step>
                    );
                  })}
                </Stepper>

                {selectedOffboarding.failedSteps && selectedOffboarding.failedSteps.length > 0 && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Ошибки выполнения:
                    </Typography>
                    <ul>
                      {selectedOffboarding.failedSteps.map((failed, index) => (
                        <li key={index}>
                          <strong>{failed.step}:</strong> {failed.error}
                        </li>
                      ))}
                    </ul>
                  </Alert>
                )}

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">Причина</Typography>
                  <Typography>{selectedOffboarding.reason}</Typography>
                </Box>
              </Box>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setStatusDialog(false)}>
              Закрыть
            </Button>
          </DialogActions>
        </Dialog>
    </Box>
  );
};

export default UserOffboardingManager;
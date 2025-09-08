/**
 * Structured Onboarding Wizard
 * 
 * Пошаговая настройка нового пользователя с фокусом на безопасность:
 * 1. Профиль и базовая информация
 * 2. Настройки безопасности (MFA, пароли)
 * 3. Разрешения и роли
 * 4. Интеграция с системами
 * 5. Финальная проверка и активация
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  LinearProgress,
  Chip,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminIcon,
  Settings as IntegrationIcon, // Заменим на доступную иконку
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import { UserProfile } from '../../api/userApi';
import { UserRole } from '../../auth/permissions';
import { AuditHelpers } from '../../api/auditLogApi';
import * as rbacApi from '../../api/rbacApi';

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  targetUser?: UserProfile;
  isAdmin?: boolean;
}

interface OnboardingData {
  // Шаг 1: Профиль
  displayName: string;
  department: string;
  position: string;
  location: string;
  timezone: string;
  phoneNumber: string;
  
  // Шаг 2: Безопасность
  passwordPolicy: 'standard' | 'enhanced';
  mfaEnabled: boolean;
  mfaMethod: 'totp' | 'sms' | 'email';
  sessionTimeout: number;
  
  // Шаг 3: Роли и разрешения
  role: UserRole;
  groups: string[];
  temporaryPermissions: string[];
  
  // Шаг 4: Интеграция
  notificationChannels: string[];
  systemIntegrations: string[];
  
  // Шаг 5: Проверки
  agreedToTerms: boolean;
  completedSecurityTraining: boolean;
  verifiedIdentity: boolean;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  open,
  onClose,
  targetUser,
  isAdmin = false
}) => {
  const { currentUser, customClaims } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    displayName: targetUser?.displayName || '',
    department: targetUser?.department || '',
    position: targetUser?.position || '',
    location: targetUser?.location || '',
    timezone: targetUser?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    phoneNumber: targetUser?.phoneNumber || '',
    
    passwordPolicy: 'standard',
    mfaEnabled: true,
    mfaMethod: 'totp',
    sessionTimeout: 8,
    
    role: targetUser?.role || 'pending_approval',
    groups: targetUser?.groups || [],
    temporaryPermissions: [],
    
    notificationChannels: ['email'],
    systemIntegrations: [],
    
    agreedToTerms: false,
    completedSecurityTraining: false,
    verifiedIdentity: false
  });

  // Загрузка данных при открытии
  useEffect(() => {
    if (open && isAdmin) {
      loadAdminData();
    }
  }, [open, isAdmin]);

  const loadAdminData = async () => {
    try {
      const [roles, groups] = await Promise.all([
        rbacApi.getAllRoles(),
        rbacApi.getAllUserGroups()
      ]);
      setAvailableRoles(roles);
      setAvailableGroups(groups);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Логируем начало onboarding процесса
      await AuditHelpers.resourceCreated(
        'USER',
        targetUser?.id || currentUser?.uid || 'unknown',
        onboardingData,
        { source: 'WEB_APP', tags: ['onboarding', 'setup'] }
      );

      // Здесь была бы логика сохранения данных onboarding
      console.log('Completing onboarding with data:', onboardingData);

      // Имитация обработки
      await new Promise(resolve => setTimeout(resolve, 2000));

      onClose();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...updates }));
  };

  const steps = [
    {
      label: 'Профиль пользователя',
      icon: <PersonIcon />,
      content: (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Основная информация
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Отображаемое имя"
                value={onboardingData.displayName}
                onChange={(e) => updateData({ displayName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Отдел/Департамент"
                value={onboardingData.department}
                onChange={(e) => updateData({ department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Должность"
                value={onboardingData.position}
                onChange={(e) => updateData({ position: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Локация/Офис"
                value={onboardingData.location}
                onChange={(e) => updateData({ location: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Часовой пояс"
                value={onboardingData.timezone}
                onChange={(e) => updateData({ timezone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Телефон"
                value={onboardingData.phoneNumber}
                onChange={(e) => updateData({ phoneNumber: e.target.value })}
              />
            </Grid>
          </Grid>
        </Box>
      )
    },
    {
      label: 'Настройки безопасности',
      icon: <SecurityIcon />,
      content: (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Политики безопасности
          </Typography>
          
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Политика паролей
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Уровень политики</InputLabel>
                <Select
                  value={onboardingData.passwordPolicy}
                  onChange={(e) => updateData({ passwordPolicy: e.target.value as 'standard' | 'enhanced' })}
                >
                  <MenuItem value="standard">Стандартная (8+ символов)</MenuItem>
                  <MenuItem value="enhanced">Усиленная (12+ символов, сложность)</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Многофакторная аутентификация (MFA)
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={onboardingData.mfaEnabled}
                    onChange={(e) => updateData({ mfaEnabled: e.target.checked })}
                  />
                }
                label="Включить MFA (настоятельно рекомендуется)"
              />
              
              {onboardingData.mfaEnabled && (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Метод MFA</InputLabel>
                  <Select
                    value={onboardingData.mfaMethod}
                    onChange={(e) => updateData({ mfaMethod: e.target.value as 'totp' | 'sms' | 'email' })}
                  >
                    <MenuItem value="totp">Authenticator приложение (TOTP)</MenuItem>
                    <MenuItem value="sms">SMS коды</MenuItem>
                    <MenuItem value="email">Email коды</MenuItem>
                  </Select>
                </FormControl>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Таймаут сессии
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Часы до автоматического выхода"
                value={onboardingData.sessionTimeout}
                onChange={(e) => updateData({ sessionTimeout: parseInt(e.target.value) || 8 })}
                inputProps={{ min: 1, max: 24 }}
              />
            </CardContent>
          </Card>
        </Box>
      )
    },
    {
      label: 'Роли и разрешения',
      icon: <AdminIcon />,
      content: (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Настройка доступа
          </Typography>
          
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Основная роль
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Роль пользователя</InputLabel>
                <Select
                  value={onboardingData.role}
                  onChange={(e) => updateData({ role: e.target.value as UserRole })}
                  disabled={!isAdmin}
                >
                  <MenuItem value="pending_approval">Ожидает одобрения</MenuItem>
                  <MenuItem value="field">Исполнитель (Field)</MenuItem>
                  <MenuItem value="employee">Сотрудник</MenuItem>
                  <MenuItem value="contractor">Подрядчик</MenuItem>
                  <MenuItem value="estimator">Сметчик/Инженер</MenuItem>
                  <MenuItem value="pm">Руководитель проекта</MenuItem>
                  <MenuItem value="accountant">Бухгалтер/Финансист</MenuItem>
                  <MenuItem value="manager">Менеджер</MenuItem>
                  <MenuItem value="owner">Владелец</MenuItem>
                </Select>
              </FormControl>
              
              {!isAdmin && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Роль будет назначена администратором после проверки
                </Alert>
              )}
            </CardContent>
          </Card>

          {isAdmin && availableGroups.length > 0 && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Группы пользователей
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Выберите группы</InputLabel>
                  <Select
                    multiple
                    value={onboardingData.groups}
                    onChange={(e) => updateData({ groups: e.target.value as string[] })}
                  >
                    {availableGroups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name} - {group.description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          )}

          <Alert severity="info">
            <Typography variant="body2">
              Окончательные разрешения будут сформированы на основе роли и групп.
              Администратор может внести дополнительные изменения после активации.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      label: 'Интеграция систем',
      icon: <IntegrationIcon />,
      content: (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Уведомления и интеграции
          </Typography>
          
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Каналы уведомлений
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Email уведомления"
                    secondary="Обязательный канал для важных уведомлений"
                  />
                  <ListItemSecondaryAction>
                    <Switch checked disabled />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Telegram"
                    secondary="Быстрые уведомления и алерты"
                  />
                  <ListItemSecondaryAction>
                    <Switch 
                      checked={onboardingData.notificationChannels.includes('telegram')}
                      onChange={(e) => {
                        const channels = e.target.checked
                          ? [...onboardingData.notificationChannels, 'telegram']
                          : onboardingData.notificationChannels.filter(ch => ch !== 'telegram');
                        updateData({ notificationChannels: channels });
                      }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="WhatsApp"
                    secondary="Мобильные уведомления"
                  />
                  <ListItemSecondaryAction>
                    <Switch 
                      checked={onboardingData.notificationChannels.includes('whatsapp')}
                      onChange={(e) => {
                        const channels = e.target.checked
                          ? [...onboardingData.notificationChannels, 'whatsapp']
                          : onboardingData.notificationChannels.filter(ch => ch !== 'whatsapp');
                        updateData({ notificationChannels: channels });
                      }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Системные интеграции
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Интеграции будут настроены администратором в зависимости от роли
              </Alert>
              <Typography variant="body2" color="textSecondary">
                Возможные интеграции: календарь, CRM, системы учета времени, файловое хранилище
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )
    },
    {
      label: 'Финальная проверка',
      icon: <CheckCircleIcon />,
      content: (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Завершение настройки
          </Typography>
          
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Обязательные проверки
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color={onboardingData.agreedToTerms ? 'success' : 'disabled'} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Пользовательское соглашение"
                    secondary="Подтверждение согласия с условиями использования"
                  />
                  <ListItemSecondaryAction>
                    <Switch 
                      checked={onboardingData.agreedToTerms}
                      onChange={(e) => updateData({ agreedToTerms: e.target.checked })}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color={onboardingData.completedSecurityTraining ? 'success' : 'disabled'} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Обучение по безопасности"
                    secondary="Ознакомление с политиками безопасности"
                  />
                  <ListItemSecondaryAction>
                    <Switch 
                      checked={onboardingData.completedSecurityTraining}
                      onChange={(e) => updateData({ completedSecurityTraining: e.target.checked })}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color={onboardingData.verifiedIdentity ? 'success' : 'disabled'} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Подтверждение личности"
                    secondary="Верификация через администратора"
                  />
                  <ListItemSecondaryAction>
                    <Switch 
                      checked={onboardingData.verifiedIdentity}
                      onChange={(e) => updateData({ verifiedIdentity: e.target.checked })}
                      disabled={!isAdmin}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Сводка настроек</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Роль:</Typography>
                  <Typography variant="body1">{onboardingData.role}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">MFA:</Typography>
                  <Typography variant="body1">
                    {onboardingData.mfaEnabled ? `Включен (${onboardingData.mfaMethod})` : 'Отключен'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Отдел:</Typography>
                  <Typography variant="body1">{onboardingData.department || 'Не указан'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">Локация:</Typography>
                  <Typography variant="body1">{onboardingData.location || 'Не указана'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">Группы:</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                    {onboardingData.groups.length > 0 ? (
                      onboardingData.groups.map(groupId => (
                        <Chip key={groupId} label={groupId} size="small" />
                      ))
                    ) : (
                      <Typography variant="body2" color="textSecondary">Группы не выбраны</Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {!onboardingData.agreedToTerms && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Необходимо согласие с пользовательским соглашением
            </Alert>
          )}
          
          {!onboardingData.completedSecurityTraining && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Рекомендуется пройти обучение по безопасности
            </Alert>
          )}
        </Box>
      )
    }
  ];

  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return onboardingData.displayName.trim().length > 0;
      case 1:
        return true; // Настройки безопасности опциональны
      case 2:
        return onboardingData.role !== 'pending_approval' || !isAdmin;
      case 3:
        return true; // Интеграции опциональны
      case 4:
        return onboardingData.agreedToTerms;
      default:
        return false;
    }
  };

  const isCompleted = activeStep === steps.length;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{ sx: { minHeight: '80vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5">
            Мастер настройки пользователя
          </Typography>
          <Chip 
            label={isAdmin ? 'Режим администратора' : 'Самостоятельная настройка'}
            color={isAdmin ? 'primary' : 'default'}
            size="small"
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ width: '100%' }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  optional={
                    index === steps.length - 1 ? (
                      <Typography variant="caption">Последний шаг</Typography>
                    ) : null
                  }
                  icon={step.icon}
                >
                  {step.label}
                </StepLabel>
                <StepContent>
                  {step.content}
                  <Box sx={{ mb: 2, mt: 2 }}>
                    <div>
                      <Button
                        variant="contained"
                        onClick={index === steps.length - 1 ? handleComplete : handleNext}
                        sx={{ mt: 1, mr: 1 }}
                        disabled={!canProceed() || loading}
                      >
                        {index === steps.length - 1 ? 'Завершить' : 'Далее'}
                      </Button>
                      <Button
                        disabled={index === 0 || loading}
                        onClick={handleBack}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Назад
                      </Button>
                    </div>
                  </Box>
                  {loading && <LinearProgress sx={{ mt: 1 }} />}
                </StepContent>
              </Step>
            ))}
          </Stepper>
          
          {isCompleted && (
            <Paper square elevation={0} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Настройка завершена!
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Пользователь успешно настроен. Все изменения записаны в журнал аудита.
              </Typography>
              <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
                Настроить другого пользователя
              </Button>
            </Paper>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {isCompleted ? 'Закрыть' : 'Отмена'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OnboardingWizard;
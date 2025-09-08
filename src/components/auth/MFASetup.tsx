/**
 * MFA Setup Component
 * 
 * Модуль 15: Multi-Factor Authentication (MFA)
 * - TOTP (Google Authenticator, Authy)
 * - SMS backup коды
 * - Принудительное включение для админов
 * - Recovery коды
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Security as SecurityIcon,
  QrCode as QrCodeIcon,
  Smartphone as SmartphoneIcon,
  Key as KeyIcon,
  Warning as WarningIcon,
  Check as CheckIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Sms as SmsIcon
} from '@mui/icons-material';
import QRCode from 'qrcode.react';

import { useAuth } from '../../auth/AuthContext';

interface TOTPSecret {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  isEnabled: boolean;
  lastUsed?: Date;
  createdAt: Date;
}

interface MFAStatus {
  isEnabled: boolean;
  isMandatory: boolean;
  methods: {
    totp: boolean;
    sms: boolean;
    email: boolean;
  };
  backupCodes: {
    total: number;
    used: number;
    remaining: number;
  };
  lastVerified?: Date;
}

const MFASetup: React.FC = () => {
  const { currentUser, customClaims } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [totpSecret, setTotpSecret] = useState<TOTPSecret | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  
  // Диалоги
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);

  useEffect(() => {
    loadMFAStatus();
  }, [currentUser]);

  const loadMFAStatus = async () => {
    try {
      // TODO: Replace with actual API call
      const mockStatus: MFAStatus = {
        isEnabled: false,
        isMandatory: customClaims?.role === 'admin' || customClaims?.role === 'owner' || false,
        methods: {
          totp: false,
          sms: false,
          email: false
        },
        backupCodes: {
          total: 10,
          used: 0,
          remaining: 10
        }
      };
      setMfaStatus(mockStatus);
    } catch (error) {
      console.error('Error loading MFA status:', error);
    }
  };

  const generateTOTPSecret = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual Cloud Function call
      // const result = await generateMFASecret();
      
      // Mock TOTP secret generation
      const secret = 'JBSWY3DPEHPK3PXP'; // Base32 encoded secret
      const issuer = 'MyBusinessApp';
      const accountName = currentUser?.email || 'user@example.com';
      const otpauthUrl = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}`;
      
      const mockSecret: TOTPSecret = {
        secret,
        qrCode: otpauthUrl,
        backupCodes: Array.from({ length: 10 }, () => 
          Math.random().toString(36).substring(2, 8).toUpperCase()
        ),
        isEnabled: false,
        createdAt: new Date()
      };
      
      setTotpSecret(mockSecret);
      setBackupCodes(mockSecret.backupCodes);
      
    } catch (error) {
      console.error('Error generating TOTP secret:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTOTPCode = async () => {
    if (!verificationCode.trim() || !totpSecret) return;

    setIsLoading(true);
    try {
      // TODO: Replace with actual Cloud Function call
      // const isValid = await verifyTOTP(totpSecret.secret, verificationCode);
      
      // Mock verification
      const isValid = verificationCode.length === 6 && /^\d{6}$/.test(verificationCode);
      
      if (isValid) {
        // Enable MFA
        setMfaStatus(prev => prev ? {
          ...prev,
          isEnabled: true,
          methods: { ...prev.methods, totp: true }
        } : null);
        
        setTotpSecret(prev => prev ? { ...prev, isEnabled: true } : null);
        setActiveStep(2); // Move to backup codes step
      } else {
        alert('Неверный код. Попробуйте еще раз.');
      }
      
    } catch (error) {
      console.error('Error verifying TOTP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const enableSMSBackup = async () => {
    if (!phoneNumber.trim()) return;

    setIsLoading(true);
    try {
      // TODO: Replace with actual Cloud Function call
      console.log('Enabling SMS backup for:', phoneNumber);
      
      setSmsEnabled(true);
      setMfaStatus(prev => prev ? {
        ...prev,
        methods: { ...prev.methods, sms: true }
      } : null);
      
    } catch (error) {
      console.error('Error enabling SMS backup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disableMFA = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual Cloud Function call
      console.log('Disabling MFA for user:', currentUser?.uid);
      
      setMfaStatus(prev => prev ? {
        ...prev,
        isEnabled: false,
        methods: { totp: false, sms: false, email: false }
      } : null);
      
      setTotpSecret(null);
      setSmsEnabled(false);
      setShowDisableDialog(false);
      
    } catch (error) {
      console.error('Error disabling MFA:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateBackupCodes = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual Cloud Function call
      const newCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );
      
      setBackupCodes(newCodes);
      setMfaStatus(prev => prev ? {
        ...prev,
        backupCodes: { total: 10, used: 0, remaining: 10 }
      } : null);
      
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Show toast notification
  };

  const steps = [
    {
      label: 'Установка приложения',
      description: 'Установите приложение для аутентификации на ваш телефон',
    },
    {
      label: 'Сканирование QR-кода',
      description: 'Отсканируйте QR-код или введите секретный ключ вручную',
    },
    {
      label: 'Верификация',
      description: 'Введите код из приложения для подтверждения',
    },
    {
      label: 'Сохранение backup кодов',
      description: 'Сохраните резервные коды в безопасном месте',
    },
  ];

  if (!mfaStatus) {
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
        Двухфакторная аутентификация (MFA)
      </Typography>

      {mfaStatus.isMandatory && !mfaStatus.isEnabled && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Обязательно!</strong> Для вашей роли требуется включить двухфакторную аутентификацию.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Текущий статус MFA */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Статус безопасности
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">MFA статус</Typography>
                <Chip 
                  label={mfaStatus.isEnabled ? 'Включена' : 'Отключена'}
                  color={mfaStatus.isEnabled ? 'success' : 'error'}
                  icon={mfaStatus.isEnabled ? <CheckIcon /> : <WarningIcon />}
                />
                {mfaStatus.isMandatory && (
                  <Chip 
                    label="Обязательно"
                    color="warning"
                    size="small"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Активные методы:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <SmartphoneIcon color={mfaStatus.methods.totp ? 'success' : 'disabled'} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="TOTP (Authenticator App)"
                    secondary={mfaStatus.methods.totp ? 'Активно' : 'Не настроено'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SmsIcon color={mfaStatus.methods.sms ? 'success' : 'disabled'} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="SMS резервный код"
                    secondary={mfaStatus.methods.sms ? 'Активно' : 'Не настроено'}
                  />
                </ListItem>
              </List>

              {mfaStatus.isEnabled && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Резервные коды: {mfaStatus.backupCodes.remaining} из {mfaStatus.backupCodes.total}
                  </Typography>
                </Box>
              )}
            </CardContent>
            
            <CardActions>
              {!mfaStatus.isEnabled ? (
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => setShowSetupDialog(true)}
                  startIcon={<SecurityIcon />}
                >
                  Включить MFA
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={() => setShowBackupDialog(true)}
                    startIcon={<KeyIcon />}
                  >
                    Backup коды
                  </Button>
                  {!mfaStatus.isMandatory && (
                    <Button 
                      color="error"
                      onClick={() => setShowDisableDialog(true)}
                      startIcon={<DeleteIcon />}
                    >
                      Отключить
                    </Button>
                  )}
                </>
              )}
            </CardActions>
          </Card>
        </Grid>

        {/* Дополнительные настройки */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Дополнительные методы
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>SMS резервный код</Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="+7 999 123-45-67"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={smsEnabled}
                  InputProps={{
                    endAdornment: smsEnabled ? (
                      <Chip label="Активно" color="success" size="small" />
                    ) : (
                      <Button 
                        size="small" 
                        onClick={enableSMSBackup}
                        disabled={!phoneNumber.trim() || !mfaStatus.isEnabled}
                      >
                        Включить
                      </Button>
                    )
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Используется только если основной метод недоступен
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" sx={{ mb: 1 }}>Рекомендуемые приложения:</Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Google Authenticator"
                    secondary="Бесплатно для iOS и Android"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Authy"
                    secondary="С поддержкой резервного копирования"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Microsoft Authenticator"
                    secondary="С push-уведомлениями"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Диалог настройки MFA */}
      <Dialog 
        open={showSetupDialog} 
        onClose={() => setShowSetupDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Настройка двухфакторной аутентификации</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent>
                  <Typography sx={{ mb: 2 }}>{step.description}</Typography>
                  
                  {index === 0 && (
                    <Box>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Установите одно из рекомендуемых приложений на ваш смартфон
                      </Alert>
                      <Button
                        variant="contained"
                        onClick={() => {
                          generateTOTPSecret();
                          setActiveStep(1);
                        }}
                        disabled={isLoading}
                      >
                        Продолжить
                      </Button>
                    </Box>
                  )}
                  
                  {index === 1 && totpSecret && (
                    <Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                              QR-код для сканирования
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                              {totpSecret.qrCode}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            Или введите ключ вручную:
                          </Typography>
                          <TextField
                            fullWidth
                            value={totpSecret.secret}
                            variant="outlined"
                            size="small"
                            InputProps={{
                              readOnly: true,
                              endAdornment: (
                                <IconButton 
                                  size="small" 
                                  onClick={() => copyToClipboard(totpSecret.secret)}
                                >
                                  <CopyIcon />
                                </IconButton>
                              )
                            }}
                          />
                        </Grid>
                      </Grid>
                      <Button
                        variant="contained"
                        onClick={() => setActiveStep(2)}
                        sx={{ mt: 2 }}
                      >
                        Готово, перейти к проверке
                      </Button>
                    </Box>
                  )}
                  
                  {index === 2 && (
                    <Box>
                      <TextField
                        fullWidth
                        label="Введите 6-значный код из приложения"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="123456"
                        inputProps={{ maxLength: 6 }}
                        sx={{ mb: 2 }}
                      />
                      <Button
                        variant="contained"
                        onClick={verifyTOTPCode}
                        disabled={verificationCode.length !== 6 || isLoading}
                      >
                        Проверить код
                      </Button>
                    </Box>
                  )}
                  
                  {index === 3 && (
                    <Box>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Важно!</strong> Сохраните эти коды в безопасном месте. 
                          Они позволят войти в систему, если у вас не будет доступа к телефону.
                        </Typography>
                      </Alert>
                      
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Grid container spacing={1}>
                          {backupCodes.map((code, idx) => (
                            <Grid item xs={6} sm={4} key={idx}>
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                fontFamily: 'monospace',
                                fontSize: '14px'
                              }}>
                                {code}
                                <IconButton 
                                  size="small" 
                                  sx={{ ml: 1 }}
                                  onClick={() => copyToClipboard(code)}
                                >
                                  <CopyIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Paper>
                      
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => {
                          setShowSetupDialog(false);
                          setActiveStep(0);
                          loadMFAStatus();
                        }}
                        sx={{ mt: 2 }}
                      >
                        Завершить настройку
                      </Button>
                    </Box>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>
      </Dialog>

      {/* Диалог отключения MFA */}
      <Dialog open={showDisableDialog} onClose={() => setShowDisableDialog(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon color="warning" sx={{ mr: 1 }} />
            Отключение MFA
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            <Typography variant="body2">
              Вы уверены, что хотите отключить двухфакторную аутентификацию? 
              Это снизит уровень безопасности вашего аккаунта.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDisableDialog(false)}>
            Отмена
          </Button>
          <Button 
            onClick={disableMFA}
            color="error"
            disabled={isLoading}
          >
            Отключить MFA
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог backup кодов */}
      <Dialog open={showBackupDialog} onClose={() => setShowBackupDialog(false)}>
        <DialogTitle>Резервные коды</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Используйте эти коды для входа, если у вас нет доступа к основному методу MFA.
            Каждый код можно использовать только один раз.
          </Typography>
          
          <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
            <Grid container spacing={1}>
              {backupCodes.map((code, idx) => (
                <Grid item xs={6} sm={4} key={idx}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    fontFamily: 'monospace',
                    fontSize: '14px'
                  }}>
                    {code}
                    <IconButton 
                      size="small" 
                      sx={{ ml: 1 }}
                      onClick={() => copyToClipboard(code)}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
          
          <Button
            variant="outlined"
            onClick={regenerateBackupCodes}
            startIcon={<RefreshIcon />}
            disabled={isLoading}
          >
            Сгенерировать новые коды
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBackupDialog(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MFASetup;
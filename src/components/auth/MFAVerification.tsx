/**
 * MFA Verification Component
 * 
 * Компонент для проверки MFA кода при входе
 * Показывается после успешной аутентификации, если у пользователя включена MFA
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Link,
  Divider,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Security as SecurityIcon,
  Smartphone as SmartphoneIcon,
  Sms as SmsIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

interface MFAVerificationProps {
  onVerificationSuccess: () => void;
  onVerificationError: (error: string) => void;
  userEmail: string;
}

const MFAVerification: React.FC<MFAVerificationProps> = ({
  onVerificationSuccess,
  onVerificationError,
  userEmail
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBackupCodeInput, setShowBackupCodeInput] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [error, setError] = useState('');
  const [canRequestSMS, setCanRequestSMS] = useState(false);
  const [smsCodeSent, setSmsCodeSent] = useState(false);

  const [showBackupCode, setShowBackupCode] = useState(false);

  useEffect(() => {
    // Проверяем, доступна ли отправка SMS кода
    checkSMSAvailability();
  }, []);

  const checkSMSAvailability = async () => {
    try {
      // TODO: Replace with actual API call to check SMS availability
      setCanRequestSMS(true);
    } catch (error) {
      console.error('Error checking SMS availability:', error);
    }
  };

  const handleTOTPVerification = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setError('Введите 6-значный код из приложения аутентификации');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Replace with actual Cloud Function call
      // const result = await verifyMFACode({ code: verificationCode, isBackupCode: false });
      
      // Mock verification
      const mockResult = { success: true, verified: true };
      
      if (mockResult.success && mockResult.verified) {
        onVerificationSuccess();
      } else {
        setError('Неверный код. Попробуйте еще раз.');
      }
    } catch (error) {
      console.error('Error verifying TOTP code:', error);
      setError('Ошибка при проверке кода. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupCodeVerification = async () => {
    if (!backupCode.trim()) {
      setError('Введите резервный код');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Replace with actual Cloud Function call
      // const result = await verifyMFACode({ code: backupCode, isBackupCode: true });
      
      // Mock verification
      const mockResult = { success: true, verified: true, backupCodeUsed: true };
      
      if (mockResult.success && mockResult.verified) {
        onVerificationSuccess();
        
        if (mockResult.backupCodeUsed) {
          // Show warning about backup code usage
          alert('Резервный код использован. Рекомендуем сгенерировать новые коды в настройках безопасности.');
        }
      } else {
        setError('Неверный резервный код или код уже был использован.');
      }
    } catch (error) {
      console.error('Error verifying backup code:', error);
      setError('Ошибка при проверке резервного кода. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const requestSMSCode = async () => {
    setIsLoading(true);
    setError('');

    try {
      // TODO: Replace with actual Cloud Function call
      // await sendSMSCode();
      
      setSmsCodeSent(true);
      alert('SMS код отправлен на ваш номер телефона');
    } catch (error) {
      console.error('Error sending SMS code:', error);
      setError('Ошибка при отправке SMS кода. Попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' && !isLoading) {
      action();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'grey.100',
        p: 2
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '100%'
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <SecurityIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Двухфакторная аутентификация
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Войдите в систему как: {userEmail}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!showBackupCodeInput ? (
          // TOTP код
          <Box>
            <TextField
              fullWidth
              label="Код из приложения"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ''); // Только цифры
                if (value.length <= 6) {
                  setVerificationCode(value);
                }
              }}
              onKeyPress={(e) => handleKeyPress(e, handleTOTPVerification)}
              placeholder="123456"
              autoComplete="one-time-code"
              inputProps={{
                maxLength: 6,
                style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SmartphoneIcon />
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
              autoFocus
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleTOTPVerification}
              disabled={isLoading || verificationCode.length !== 6}
              size="large"
              sx={{ mb: 2 }}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Подтвердить'}
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Введите 6-значный код из приложения Google Authenticator, Authy или другого приложения TOTP.
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Альтернативные методы */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => setShowBackupCodeInput(true)}
                disabled={isLoading}
              >
                Использовать резервный код
              </Button>

              {canRequestSMS && (
                <Button
                  variant="text"
                  size="small"
                  onClick={requestSMSCode}
                  disabled={isLoading || smsCodeSent}
                  startIcon={<SmsIcon />}
                >
                  {smsCodeSent ? 'SMS код отправлен' : 'Отправить SMS код'}
                </Button>
              )}

              <Button
                variant="text"
                size="small"
                onClick={requestSMSCode}
                disabled={isLoading}
                startIcon={<RefreshIcon />}
              >
                У меня проблемы с входом
              </Button>
            </Box>
          </Box>
        ) : (
          // Резервный код
          <Box>
            <TextField
              fullWidth
              label="Резервный код"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => handleKeyPress(e, handleBackupCodeVerification)}
              placeholder="XXXXXX"
              type={showBackupCode ? 'text' : 'password'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SecurityIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowBackupCode(!showBackupCode)}
                      edge="end"
                    >
                      {showBackupCode ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
              autoFocus
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleBackupCodeVerification}
              disabled={isLoading || !backupCode.trim()}
              size="large"
              sx={{ mb: 2 }}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Подтвердить'}
            </Button>

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Резервные коды можно использовать только один раз. После входа рекомендуется сгенерировать новые коды.
              </Typography>
            </Alert>

            <Button
              variant="text"
              size="small"
              onClick={() => {
                setShowBackupCodeInput(false);
                setBackupCode('');
                setError('');
              }}
              disabled={isLoading}
            >
              ← Вернуться к коду приложения
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Нужна помощь?{' '}
            <Link href="#" underline="hover">
              Свяжитесь с поддержкой
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default MFAVerification;
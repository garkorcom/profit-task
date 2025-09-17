/**
 * ============================================================================
 * FIRESTORE CONNECTION MONITOR - МОНИТОРИНГ СОЕДИНЕНИЯ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * ═══════════
 * Компонент для мониторинга состояния соединения с Firestore и отображения
 * статуса подключения пользователю. Автоматически обрабатывает проблемы
 * с соединением и предлагает решения.
 * 
 * ВОЗМОЖНОСТИ:
 * ════════════
 * 🔍 Real-time мониторинг состояния соединения
 * 🔄 Автоматическое переподключение при сбоях
 * 📊 Отображение статуса подключения в UI
 * 🛠️ Кнопки для ручного переподключения
 * 📋 Диагностическая информация для пользователя
 * 
 * ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ: 2025 - Создан для решения проблем с таймаутами Firestore
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Snackbar,
  Box,
  Typography,
  CircularProgress,
  Chip,
  Stack,
  Collapse,
} from '@mui/material';
import {
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { reconnectFirestore, checkFirestoreConnection } from '../firebase/firebase';

interface ConnectionStatus {
  isOnline: boolean;
  isConnected: boolean;
  lastError: string | null;
  retryCount: number;
  lastSuccessfulConnection: Date | null;
}

const FirestoreConnectionMonitor: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: navigator.onLine,
    isConnected: true,
    lastError: null,
    retryCount: 0,
    lastSuccessfulConnection: new Date(),
  });
  
  const [showAlert, setShowAlert] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Мониторинг состояния сети
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network: Online');
      setConnectionStatus(prev => ({ 
        ...prev, 
        isOnline: true,
        lastError: null 
      }));
      
      // Автоматически проверяем Firestore при восстановлении сети
      checkConnection();
    };

    const handleOffline = () => {
      console.log('🌐 Network: Offline');
      setConnectionStatus(prev => ({ 
        ...prev, 
        isOnline: false,
        isConnected: false,
        lastError: 'Нет подключения к интернету'
      }));
      setShowAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Мониторинг ошибок Firestore через консоль
  useEffect(() => {
    const originalError = console.error;
    
    console.error = (...args) => {
      const message = args.join(' ');
      
      // Отслеживаем специфические ошибки Firestore
      if (message.includes('Could not reach Cloud Firestore backend') || 
          message.includes('Backend didn\'t respond within 10 seconds') ||
          message.includes('client is offline')) {
        
        console.log('🔥 Firestore connection error detected:', message);
        
        setConnectionStatus(prev => ({
          ...prev,
          isConnected: false,
          lastError: 'Проблема с подключением к Firestore',
          retryCount: prev.retryCount + 1
        }));
        
        setShowAlert(true);
        
        // Автоматическое переподключение через 5 секунд
        setTimeout(() => {
          handleReconnect();
        }, 5000);
      }
      
      // Вызываем оригинальный console.error
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  // Проверка соединения с Firestore
  const checkConnection = async () => {
    try {
      await checkFirestoreConnection();
      
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: true,
        lastError: null,
        lastSuccessfulConnection: new Date(),
        retryCount: 0
      }));
      
      console.log('✅ Firestore connection check successful');
      
    } catch (error) {
      console.error('❌ Firestore connection check failed:', error);
      
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: false,
        lastError: (error as Error).message,
        retryCount: prev.retryCount + 1
      }));
      
      setShowAlert(true);
    }
  };

  // Ручное переподключение
  const handleReconnect = async () => {
    setIsReconnecting(true);
    
    try {
      console.log('🔄 Manual reconnection initiated...');
      
      // Сначала проверяем сеть
      if (!navigator.onLine) {
        throw new Error('Нет подключения к интернету');
      }
      
      // Переподключаем Firestore
      await reconnectFirestore();
      
      // Проверяем соединение
      await checkConnection();
      
      setShowAlert(false);
      
    } catch (error) {
      console.error('❌ Manual reconnection failed:', error);
      
      setConnectionStatus(prev => ({
        ...prev,
        lastError: (error as Error).message,
        retryCount: prev.retryCount + 1
      }));
      
    } finally {
      setIsReconnecting(false);
    }
  };

  const getStatusColor = () => {
    if (!connectionStatus.isOnline) return 'error';
    if (!connectionStatus.isConnected) return 'warning';
    return 'success';
  };

  const getStatusIcon = () => {
    if (!connectionStatus.isOnline) return <WifiOffIcon />;
    if (!connectionStatus.isConnected) return <WarningIcon />;
    return <CheckCircleIcon />;
  };

  const getStatusText = () => {
    if (!connectionStatus.isOnline) return 'Нет интернета';
    if (!connectionStatus.isConnected) return 'Проблема с Firestore';
    return 'Подключено';
  };

  // Показываем предупреждение только при проблемах
  if (!showAlert && connectionStatus.isOnline && connectionStatus.isConnected) {
    return null;
  }

  return (
    <>
      {/* Snackbar для уведомлений */}
      <Snackbar
        open={showAlert}
        autoHideDuration={null} // Не скрываем автоматически при проблемах
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        onClose={() => setShowAlert(false)}
      >
        <Alert
          severity={getStatusColor()}
          onClose={() => setShowAlert(false)}
          icon={getStatusIcon()}
          sx={{ minWidth: 400 }}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              {connectionStatus.isOnline && (
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleReconnect}
                  disabled={isReconnecting}
                  startIcon={
                    isReconnecting ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <RefreshIcon />
                    )
                  }
                >
                  {isReconnecting ? 'Переподключение...' : 'Переподключить'}
                </Button>
              )}
              
              <Button
                color="inherit"
                size="small"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Скрыть' : 'Детали'}
              </Button>
            </Stack>
          }
        >
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {getStatusText()}
            </Typography>
            
            <Typography variant="caption" display="block">
              {connectionStatus.lastError || 'Проверка соединения с базой данных...'}
            </Typography>
            
            <Collapse in={showDetails}>
              <Box mt={1} pt={1} borderTop={1} borderColor="divider">
                <Stack spacing={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="caption">Статус сети:</Typography>
                    <Chip
                      size="small"
                      label={connectionStatus.isOnline ? 'Онлайн' : 'Оффлайн'}
                      color={connectionStatus.isOnline ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="caption">Firestore:</Typography>
                    <Chip
                      size="small"
                      label={connectionStatus.isConnected ? 'Подключен' : 'Отключен'}
                      color={connectionStatus.isConnected ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  </Box>
                  
                  {connectionStatus.retryCount > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      Попыток переподключения: {connectionStatus.retryCount}
                    </Typography>
                  )}
                  
                  {connectionStatus.lastSuccessfulConnection && (
                    <Typography variant="caption" color="text.secondary">
                      Последнее успешное подключение: {' '}
                      {connectionStatus.lastSuccessfulConnection.toLocaleTimeString('ru-RU')}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Collapse>
          </Box>
        </Alert>
      </Snackbar>
    </>
  );
};

export default FirestoreConnectionMonitor;

/**
 * Простая страница для тестирования соединения с Firestore
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Stack,
  Card,
  CardContent,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { db } from '../firebase/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

const ConnectionTest: React.FC = () => {
  const [results, setResults] = useState<any>({});
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const testResults: any = {};

    // Тест 1: Интернет соединение
    try {
      testResults.internet = navigator.onLine ? 'OK' : 'FAIL';
    } catch (error) {
      testResults.internet = 'ERROR';
    }

    // Тест 2: Доступность Firestore
    try {
      const start = Date.now();
      await getDocs(collection(db, 'users'));
      testResults.firestore = `OK (${Date.now() - start}ms)`;
    } catch (error: any) {
      testResults.firestore = `FAIL: ${error.message}`;
    }

    // Тест 3: Проверка конкретного документа
    try {
      const start = Date.now();
      await getDoc(doc(db, 'users', 'test'));
      testResults.document = `OK (${Date.now() - start}ms)`;
    } catch (error: any) {
      testResults.document = `FAIL: ${error.message}`;
    }

    setResults(testResults);
    setTesting(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusColor = (status: string) => {
    if (status.startsWith('OK')) return 'success';
    if (status.startsWith('FAIL')) return 'error';
    return 'warning';
  };

  const getStatusIcon = (status: string) => {
    if (status.startsWith('OK')) return <CheckIcon />;
    if (status.startsWith('FAIL')) return <ErrorIcon />;
    return <WifiOffIcon />;
  };

  return (
    <Box p={4} maxWidth={600} mx="auto">
      <Typography variant="h4" gutterBottom align="center">
        🔍 Диагностика соединения
      </Typography>

      <Stack spacing={3}>
        <Button
          variant="contained"
          startIcon={testing ? <CircularProgress size={20} /> : <RefreshIcon />}
          onClick={runTests}
          disabled={testing}
          fullWidth
        >
          {testing ? 'Тестирование...' : 'Проверить соединение'}
        </Button>

        {Object.keys(results).length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Результаты тестирования:
              </Typography>
              
              <Stack spacing={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography>Интернет соединение:</Typography>
                  <Chip
                    icon={getStatusIcon(results.internet)}
                    label={results.internet}
                    color={getStatusColor(results.internet)}
                    size="small"
                  />
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography>Firestore доступность:</Typography>
                  <Chip
                    icon={getStatusIcon(results.firestore)}
                    label={results.firestore}
                    color={getStatusColor(results.firestore)}
                    size="small"
                  />
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography>Чтение документов:</Typography>
                  <Chip
                    icon={getStatusIcon(results.document)}
                    label={results.document}
                    color={getStatusColor(results.document)}
                    size="small"
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        <Alert severity="info">
          <Typography variant="body2">
            <strong>Что означают результаты:</strong><br />
            • <strong>OK</strong> - соединение работает нормально<br />
            • <strong>FAIL</strong> - есть проблемы с соединением<br />
            • <strong>Время в скобках</strong> - скорость ответа сервера
          </Typography>
        </Alert>

        {results.firestore?.startsWith('FAIL') && (
          <Alert severity="warning">
            <Typography variant="body2">
              <strong>Рекомендации при проблемах с Firestore:</strong><br />
              1. Проверьте интернет соединение<br />
              2. Отключите VPN/прокси<br />
              3. Проверьте антивирус<br />
              4. Попробуйте другой браузер<br />
              5. Обновите страницу через 30 секунд
            </Typography>
          </Alert>
        )}
      </Stack>
    </Box>
  );
};

export default ConnectionTest;

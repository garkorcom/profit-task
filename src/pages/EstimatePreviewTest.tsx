/**
 * Тестовая страница для проверки предпросмотра смет
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  Stack,
  TextField,
  Divider,
} from '@mui/material';
import { db } from '../firebase/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';

const EstimatePreviewTest: React.FC = () => {
  const { currentUser } = useAuth();
  const [testEstimateId, setTestEstimateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  const createTestEstimate = async () => {
    if (!currentUser) {
      setMessage({text: 'Необходимо войти в систему', type: 'error'});
      return;
    }

    try {
      setLoading(true);
      
      const estimateId = 'preview-test-' + Date.now();
      
      // Создаем тестовую смету со статусом "sent" для публичного доступа
      const estimateData = {
        id: estimateId,
        number: `EST-PREVIEW-${Date.now()}`,
        status: 'sent', // Статус для публичного доступа
        title: 'Тестовая смета для проверки предпросмотра',
        terms: 'Эта смета создана для тестирования функции публичного предпросмотра. Она должна быть доступна по прямой ссылке без входа в систему.',
        currency: 'USD',
        total: 3200,
        subtotal: 2800,
        taxRate: 14.29,
        taxAmt: 400,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        // Добавляем блоки для новой структуры V2
        blocks: [
          {
            key: 'services',
            data: {
              rows: [
                {
                  id: '1',
                  name: 'Консультация по проекту',
                  description: 'Первичная техническая консультация и анализ требований',
                  quantity: 5,
                  unit: 'час',
                  unitPrice: 120,
                  totalCost: 600
                },
                {
                  id: '2', 
                  name: 'Проектирование архитектуры',
                  description: 'Разработка технической архитектуры решения',
                  quantity: 8,
                  unit: 'час',
                  unitPrice: 150,
                  totalCost: 1200
                },
                {
                  id: '3',
                  name: 'Реализация MVP',
                  description: 'Разработка минимально жизнеспособного продукта',
                  quantity: 10,
                  unit: 'час',
                  unitPrice: 100,
                  totalCost: 1000
                }
              ]
            }
          }
        ]
      };

      // Сохраняем в коллекцию estimates (старая структура)
      await setDoc(
        doc(db, 'users', currentUser.uid, 'estimates', estimateId),
        estimateData
      );

      // Также сохраняем в коллекцию estimatesV2 (новая структура)
      await setDoc(
        doc(db, 'users', currentUser.uid, 'estimatesV2', estimateId),
        estimateData
      );

      setTestEstimateId(estimateId);
      setMessage({
        text: `Тестовая смета для предпросмотра создана! ID: ${estimateId}`,
        type: 'success'
      });

    } catch (error) {
      console.error('Error creating test estimate:', error);
      setMessage({
        text: 'Ошибка создания тестовой сметы: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const publicUrl = testEstimateId ? `${window.location.origin}/public/estimate/${testEstimateId}` : '';

  return (
    <Box p={3}>
      <Card>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Тестирование предпросмотра смет
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            Эта страница создает тестовую смету со статусом "sent", которая будет доступна 
            для публичного просмотра без необходимости входа в систему.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={3}>
            {!currentUser && (
              <Alert severity="warning">
                Для создания тестовой сметы необходимо войти в систему.
                <br />
                Используйте: test@example.com / password123
              </Alert>
            )}

            {message && (
              <Alert severity={message.type}>
                {message.text}
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              onClick={createTestEstimate}
              disabled={!currentUser || loading}
            >
              {loading ? 'Создание тестовой сметы...' : 'Создать тестовую смету'}
            </Button>

            {testEstimateId && (
              <>
                <Alert severity="success">
                  <Typography variant="h6" gutterBottom>
                    ✅ Тестовая смета создана!
                  </Typography>
                  <Typography variant="body2">
                    ID сметы: <code>{testEstimateId}</code>
                  </Typography>
                </Alert>

                <TextField
                  label="Публичная ссылка для предпросмотра"
                  value={publicUrl}
                  fullWidth
                  variant="outlined"
                  InputProps={{
                    readOnly: true,
                  }}
                  helperText="Скопируйте эту ссылку и откройте в новом окне браузера или режиме инкогнито"
                />

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    onClick={() => window.open(publicUrl, '_blank')}
                  >
                    Открыть в новой вкладке
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigator.clipboard.writeText(publicUrl)}
                  >
                    Скопировать ссылку
                  </Button>
                </Stack>

                <Alert severity="info">
                  <Typography variant="subtitle2" gutterBottom>
                    Как проверить публичный доступ:
                  </Typography>
                  <Typography variant="body2" component="div">
                    1. Скопируйте ссылку выше<br />
                    2. Откройте новое окно браузера в режиме инкогнито<br />
                    3. Вставьте ссылку и нажмите Enter<br />
                    4. Смета должна открыться без требования входа в систему
                  </Typography>
                </Alert>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EstimatePreviewTest;
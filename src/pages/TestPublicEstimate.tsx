/**
 * Тестовая страница для создания публичной сметы
 * Для демонстрации публичного доступа
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  TextField,
  Stack,
} from '@mui/material';
import { db } from '../firebase/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';

const TestPublicEstimate: React.FC = () => {
  const { currentUser } = useAuth();
  const [estimateId, setEstimateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  const createTestEstimate = async () => {
    if (!currentUser) {
      setMessage({text: 'Необходимо войти в систему', type: 'error'});
      return;
    }

    try {
      setLoading(true);
      
      const testEstimateId = 'public-test-' + Date.now();
      
      // Создаем тестовую смету со статусом "sent"
      const estimateData = {
        id: testEstimateId,
        number: `EST-${Date.now()}`,
        status: 'sent', // Публичный статус
        title: 'Тестовая публичная смета',
        terms: 'Это тестовая смета, доступная для публичного просмотра без регистрации',
        currency: 'USD',
        total: 1500,
        subtotal: 1300,
        taxRate: 15.38,
        taxAmt: 200,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        blocks: [
          {
            key: 'services',
            data: {
              rows: [
                {
                  id: '1',
                  name: 'Консультация по проекту',
                  description: 'Техническая консультация и планирование',
                  quantity: 2,
                  unit: 'час',
                  unitPrice: 100,
                  totalCost: 200
                },
                {
                  id: '2', 
                  name: 'Разработка решения',
                  description: 'Проектирование и реализация',
                  quantity: 10,
                  unit: 'час',
                  unitPrice: 120,
                  totalCost: 1200
                }
              ]
            }
          }
        ]
      };

      // Сохраняем в коллекцию estimates
      await setDoc(
        doc(db, 'users', currentUser.uid, 'estimates', testEstimateId),
        estimateData
      );

      setEstimateId(testEstimateId);
      setMessage({
        text: `Публичная смета создана! ID: ${testEstimateId}`,
        type: 'success'
      });

    } catch (error) {
      console.error('Error creating test estimate:', error);
      setMessage({
        text: 'Ошибка создания тестовой сметы',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Тестирование публичных смет
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Эта страница позволяет создать тестовую смету со статусом "sent", 
            которая будет доступна для публичного просмотра без регистрации.
          </Typography>

          <Stack spacing={2}>
            {!currentUser && (
              <Alert severity="warning">
                Для создания тестовой сметы необходимо войти в систему
              </Alert>
            )}

            {message && (
              <Alert severity={message.type}>
                {message.text}
              </Alert>
            )}

            {estimateId && (
              <TextField
                label="Ссылка для публичного просмотра"
                value={`${window.location.origin}/public/estimate/${estimateId}`}
                fullWidth
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
                helperText="Эта ссылка доступна для просмотра без регистрации"
              />
            )}

            <Button
              variant="contained"
              onClick={createTestEstimate}
              disabled={!currentUser || loading}
            >
              {loading ? 'Создание...' : 'Создать тестовую публичную смету'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TestPublicEstimate;
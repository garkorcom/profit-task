/**
 * ============================================================================
 * ДИАГНОСТИКА ПУБЛИЧНЫХ СМЕТ - ИНСТРУМЕНТ ДЛЯ ОТЛАДКИ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * ═══════════
 * Инструмент для диагностики проблем с публичным просмотром смет.
 * Позволяет быстро создать тестовую публичную смету и проверить ее доступность.
 * 
 * ФУНКЦИИ:
 * ════════
 * 🔍 Поиск существующих публичных смет
 * 🧪 Создание тестовой публичной сметы
 * 🔗 Генерация ссылок для тестирования
 * 📊 Проверка структуры данных смет
 * 
 * ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ: 2025 - Создан для диагностики публичных смет
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Stack,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Container,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { db } from '../firebase/firebase';
import { 
  collection, 
  getDocs,
  doc,
  setDoc,
} from 'firebase/firestore';
import { createPublicTestEstimate, getPublicEstimateUrl } from '../api/estimateV2Api';

interface PublicEstimate {
  id: string;
  number: string;
  status: string;
  title?: string;
  createdAt: string;
  userId: string;
  collection: 'estimates' | 'estimatesV2';
}

const DiagnosticsPublicEstimates: React.FC = () => {
  const { currentUser } = useAuth();
  const [publicEstimates, setPublicEstimates] = useState<PublicEstimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [newEstimateId, setNewEstimateId] = useState<string | null>(null);

  // Поиск всех публичных смет
  const searchPublicEstimates = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      console.log('🔍 Поиск публичных смет...');
      
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      const foundEstimates: PublicEstimate[] = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        console.log(`📂 Проверяем пользователя: ${userId}`);
        
        // Проверяем estimates коллекцию
        try {
          const estimatesCollection = collection(db, 'users', userId, 'estimates');
          const estimatesSnapshot = await getDocs(estimatesCollection);
          
          for (const estimateDoc of estimatesSnapshot.docs) {
            const data = estimateDoc.data();
            if (data.status === 'sent' || data.status === 'viewed' || data.status === 'accepted') {
              foundEstimates.push({
                id: estimateDoc.id,
                number: data.number || estimateDoc.id,
                status: data.status,
                title: data.title,
                createdAt: data.createdAt,
                userId: userId,
                collection: 'estimates'
              });
            }
          }
        } catch (error) {
          console.error(`Ошибка при проверке estimates для ${userId}:`, error);
        }
        
        // Проверяем estimatesV2 коллекцию
        try {
          const estimatesV2Collection = collection(db, 'users', userId, 'estimatesV2');
          const estimatesV2Snapshot = await getDocs(estimatesV2Collection);
          
          for (const estimateDoc of estimatesV2Snapshot.docs) {
            const data = estimateDoc.data();
            if (data.status === 'sent' || data.status === 'viewed' || data.status === 'accepted') {
              foundEstimates.push({
                id: estimateDoc.id,
                number: data.number || estimateDoc.id,
                status: data.status,
                title: data.title,
                createdAt: data.createdAt,
                userId: userId,
                collection: 'estimatesV2'
              });
            }
          }
        } catch (error) {
          console.error(`Ошибка при проверке estimatesV2 для ${userId}:`, error);
        }
      }
      
      setPublicEstimates(foundEstimates);
      setMessage({
        text: `Найдено ${foundEstimates.length} публичных смет`,
        type: foundEstimates.length > 0 ? 'success' : 'info'
      });
      
    } catch (error) {
      console.error('Ошибка поиска:', error);
      setMessage({
        text: 'Ошибка при поиске публичных смет: ' + (error as Error).message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Создание тестовой публичной сметы через API
  const createTestEstimate = async () => {
    if (!currentUser) {
      setMessage({text: 'Необходимо войти в систему', type: 'error'});
      return;
    }

    setCreating(true);
    setMessage(null);
    
    try {
      // Используем новую функцию API для создания тестовой сметы
      const result = await createPublicTestEstimate(currentUser.uid);
      
      setNewEstimateId(result.estimateId);
      
      setMessage({
        text: `Публичная смета успешно создана! ID: ${result.estimateId}`,
        type: 'success'
      });

      console.log('✅ Тестовая смета создана через API:', result);

      // Автоматически обновляем список
      setTimeout(() => {
        searchPublicEstimates();
      }, 1000);

    } catch (error) {
      console.error('Ошибка создания:', error);
      setMessage({
        text: 'Ошибка при создании тестовой сметы: ' + (error as Error).message,
        type: 'error'
      });
    } finally {
      setCreating(false);
    }
  };

  // Автоматический поиск при загрузке
  useEffect(() => {
    searchPublicEstimates();
  }, []);

  const getPublicUrl = (estimateId: string) => {
    return getPublicEstimateUrl(estimateId);
  };

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        <Typography variant="h4" gutterBottom>
          🔍 Диагностика публичных смет
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Инструмент для диагностики проблем с публичным просмотром смет.
        </Typography>

        {/* Сообщения */}
        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }}>
            {message.text}
          </Alert>
        )}

        {/* Новая созданная смета */}
        {newEstimateId && (
          <Card sx={{ mb: 3, border: 2, borderColor: 'success.main' }}>
            <CardContent>
              <Typography variant="h6" color="success.main" gutterBottom>
                ✅ Тестовая смета создана!
              </Typography>
              <TextField
                label="Публичная ссылка"
                value={getPublicUrl(newEstimateId)}
                fullWidth
                variant="outlined"
                InputProps={{ readOnly: true }}
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                startIcon={<LaunchIcon />}
                onClick={() => window.open(getPublicUrl(newEstimateId), '_blank')}
              >
                Открыть публичную смету
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Действия */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={searchPublicEstimates}
            disabled={loading}
          >
            {loading ? 'Поиск...' : 'Найти публичные сметы'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={createTestEstimate}
            disabled={creating || !currentUser}
          >
            {creating ? 'Создание...' : 'Создать тестовую смету'}
          </Button>
          
          <Button
            variant="text"
            startIcon={<RefreshIcon />}
            onClick={() => {
              setPublicEstimates([]);
              setNewEstimateId(null);
              setMessage(null);
              searchPublicEstimates();
            }}
          >
            Сбросить
          </Button>
        </Stack>

        {/* Таблица найденных смет */}
        {publicEstimates.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 Найденные публичные сметы ({publicEstimates.length})
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Номер</TableCell>
                      <TableCell>Статус</TableCell>
                      <TableCell>Название</TableCell>
                      <TableCell>Коллекция</TableCell>
                      <TableCell>Дата создания</TableCell>
                      <TableCell>Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {publicEstimates.map((estimate) => (
                      <TableRow key={`${estimate.userId}-${estimate.id}`}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {estimate.id}
                          </Typography>
                        </TableCell>
                        <TableCell>{estimate.number}</TableCell>
                        <TableCell>
                          <Chip 
                            label={estimate.status} 
                            color={
                              estimate.status === 'sent' ? 'info' :
                              estimate.status === 'accepted' ? 'success' : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{estimate.title || '—'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={estimate.collection} 
                            variant="outlined" 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(estimate.createdAt).toLocaleString('ru-RU')}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<LaunchIcon />}
                            onClick={() => window.open(getPublicUrl(estimate.id), '_blank')}
                          >
                            Открыть
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Состояние загрузки */}
        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {/* Пустое состояние */}
        {!loading && publicEstimates.length === 0 && !message && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Публичные сметы не найдены
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Создайте тестовую смету для проверки функционала
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </Container>
  );
};

export default DiagnosticsPublicEstimates;

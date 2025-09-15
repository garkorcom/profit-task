/**
 * Тестовая страница для проверки API контрагентов
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { 
  createCounterparty,
  getCounterparties,
} from '../api/counterpartyApi';
import { preventDuplicateCreation } from '../utils/cleanDuplicateCounterparties';
import { 
  CounterpartyRole,
  CreateCounterpartyDto,
  Counterparty,
} from '../types/counterparty.types';

const DevTestCounterpartiesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  
  // Form data
  const [formData, setFormData] = useState<CreateCounterpartyDto>({
    legalName: 'ООО "Тест Контрагент"',
    displayName: 'Тест Контрагент',
    roles: ['customer'],
    taxId: '1234567890',
  });

  const handleTestCreateCounterparty = async () => {
    if (!currentUser) {
      setResult('❌ Пользователь не авторизован');
      return;
    }

    setLoading(true);
    setResult('');

    try {
      // Проверка на дубликаты
      const duplicateCheck = await preventDuplicateCreation(
        currentUser.uid,
        formData.legalName,
        formData.taxId
      );

      if (duplicateCheck.isDuplicate) {
        setResult(`⚠️ Найден дубликат: ${duplicateCheck.existing?.legalName} (${duplicateCheck.existing?.taxId})`);
        setLoading(false);
        return;
      }

      // Создание контрагента
      console.log('Creating counterparty with data:', formData);
      const counterpartyId = await createCounterparty(currentUser.uid, formData);
      
      setResult(`✅ Контрагент создан успешно! ID: ${counterpartyId}`);
      
      // Обновляем список
      await loadCounterparties();
      
    } catch (error: any) {
      console.error('Error creating counterparty:', error);
      setResult(`❌ Ошибка создания: ${error.message || error.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCounterparties = async () => {
    if (!currentUser) return;
    
    try {
      const data = await getCounterparties(currentUser.uid);
      setCounterparties(data);
      console.log('Loaded counterparties:', data);
    } catch (error) {
      console.error('Error loading counterparties:', error);
    }
  };

  const handleTestAuth = () => {
    if (currentUser) {
      setResult(`✅ Авторизован как: ${currentUser.email} (${currentUser.uid})`);
    } else {
      setResult('❌ Пользователь не авторизован');
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        🧪 Тест API Контрагентов
      </Typography>

      {/* Auth Test */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          1. Проверка авторизации
        </Typography>
        <Button onClick={handleTestAuth} variant="outlined">
          Проверить авторизацию
        </Button>
      </Paper>

      {/* Create Counterparty Test */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          2. Создание контрагента
        </Typography>
        
        <Stack spacing={3}>
          <TextField
            label="Полное наименование"
            value={formData.legalName}
            onChange={(e) => setFormData({
              ...formData,
              legalName: e.target.value,
            })}
            fullWidth
          />
          
          <TextField
            label="Краткое название"
            value={formData.displayName}
            onChange={(e) => setFormData({
              ...formData,
              displayName: e.target.value,
            })}
            fullWidth
          />
          
          <TextField
            label="ИНН"
            value={formData.taxId}
            onChange={(e) => setFormData({
              ...formData,
              taxId: e.target.value,
            })}
            fullWidth
          />
          
          <FormControl fullWidth>
            <InputLabel>Роли</InputLabel>
            <Select
              multiple
              value={formData.roles}
              onChange={(e) => setFormData({
                ...formData,
                roles: e.target.value as CounterpartyRole[],
              })}
              renderValue={(selected) => (
                <Stack direction="row" spacing={1}>
                  {(selected as CounterpartyRole[]).map((role) => (
                    <Chip key={role} label={role} size="small" />
                  ))}
                </Stack>
              )}
            >
              <MenuItem value="customer">Клиент</MenuItem>
              <MenuItem value="vendor">Поставщик</MenuItem>
              <MenuItem value="subcontractor">Субподрядчик</MenuItem>
              <MenuItem value="partner">Партнер</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            onClick={handleTestCreateCounterparty}
            variant="contained"
            disabled={loading || !formData.legalName || formData.roles.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Создание...' : 'Создать контрагента'}
          </Button>
        </Stack>
      </Paper>

      {/* Load Counterparties Test */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          3. Загрузка контрагентов
        </Typography>
        
        <Button onClick={loadCounterparties} variant="outlined" sx={{ mb: 2 }}>
          Загрузить список
        </Button>
        
        {counterparties.length > 0 && (
          <Stack spacing={1}>
            <Typography variant="subtitle2">
              Найдено контрагентов: {counterparties.length}
            </Typography>
            {counterparties.map((cp) => (
              <Paper key={cp.id} sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2">
                  <strong>{cp.displayName}</strong> ({cp.legalName})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ID: {cp.id} | ИНН: {cp.taxId} | Роли: {cp.roles.join(', ')}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Result */}
      {result && (
        <Alert 
          severity={result.startsWith('✅') ? 'success' : result.startsWith('⚠️') ? 'warning' : 'error'}
          sx={{ mb: 3 }}
        >
          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
            {result}
          </Typography>
        </Alert>
      )}

      {/* Console Instructions */}
      <Paper sx={{ p: 3, bgcolor: 'grey.100' }}>
        <Typography variant="h6" gutterBottom>
          📋 Инструкции для тестирования в консоли браузера
        </Typography>
        <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
{`// 1. Откройте Developer Tools (F12)
// 2. Перейдите в Console
// 3. Выполните следующие команды:

// Проверка Firebase подключения
console.log('Firebase app:', window.firebase);

// Проверка авторизации
import { auth } from '../firebase/firebase';
console.log('Current user:', auth.currentUser);

// Тест создания контрагента
import { createCounterparty } from '../api/counterpartyApi';
const testData = {
  legalName: 'ООО "Консольный Тест"',
  displayName: 'Консольный Тест',
  roles: ['customer'],
  taxId: '9876543210'
};
createCounterparty(auth.currentUser?.uid, testData)
  .then(id => console.log('✅ Создан:', id))
  .catch(err => console.error('❌ Ошибка:', err));`}
        </Typography>
      </Paper>
    </Box>
  );
};

export default DevTestCounterpartiesPage;
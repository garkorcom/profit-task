/**
 * Тестовая страница для демонстрации условных разрешений
 * 
 * Позволяет администраторам тестировать различные сценарии
 * условного доступа в реальном времени
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Alert,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import { hasPermission } from '../../auth/customClaims';
import useConditionalPermissions, { 
  useWorkingHoursPermission,
  useLocationBasedPermission 
} from '../../hooks/useConditionalPermissions';
import { Permission } from '../../auth/permissions';
import { RoleCondition } from '../../types/rbac';
import { ConditionExamples } from '../../services/conditionalPermissions';

export default function ConditionalPermissionsTest() {
  const { customClaims } = useAuth();
  
  const {
    checkRoleConditions,
    location,
    locationError,
    conditionUtils,
    isLocationAvailable,
    isReady
  } = useConditionalPermissions({
    requestLocation: true,
    autoRefreshTime: true,
    refreshIntervalMs: 30000, // Обновляем каждые 30 секунд
    cacheResults: true
  });
  
  // Тест рабочих часов
  const workingHoursTest = useWorkingHoursPermission(
    Permission.VIEW_ALL_PROJECTS,
    { start: '09:00', end: '18:00' },
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  );
  
  // Тест местоположения
  const locationTest = useLocationBasedPermission(
    Permission.MANAGE_FINANCES,
    [
      { latitude: 55.7558, longitude: 37.6176, radiusMeters: 1000, name: 'Главный офис' },
      { latitude: 55.7412, longitude: 37.6561, radiusMeters: 500, name: 'Филиал' }
    ]
  );
  
  // Состояние для пользовательских тестов
  const [customTest, setCustomTest] = useState({
    conditions: [] as RoleCondition[],
    result: null as any,
    isLoading: false
  });
  
  const [selectedExample, setSelectedExample] = useState('');
  
  // Проверяем права доступа
  if (!hasPermission(customClaims, 'VIEW_RBAC_STATS')) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          У вас нет прав доступа к тестированию условных разрешений.
        </Alert>
      </Container>
    );
  }
  
  // Запуск пользовательского теста
  const runCustomTest = async () => {
    if (customTest.conditions.length === 0) return;
    
    setCustomTest(prev => ({ ...prev, isLoading: true }));
    
    try {
      const result = await checkRoleConditions(customTest.conditions);
      setCustomTest(prev => ({ ...prev, result, isLoading: false }));
    } catch (error) {
      setCustomTest(prev => ({ 
        ...prev, 
        result: { 
          hasPermission: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        },
        isLoading: false 
      }));
    }
  };
  
  // Добавление примера условия
  const addExampleCondition = () => {
    if (!selectedExample) return;
    
    const example = ConditionExamples[selectedExample as keyof typeof ConditionExamples];
    if (example) {
      const conditionWithId = {
        ...example,
        id: `test_${Date.now()}`
      };
      
      setCustomTest(prev => ({
        ...prev,
        conditions: [...prev.conditions, conditionWithId]
      }));
      setSelectedExample('');
    }
  };
  
  // Удаление условия
  const removeCondition = (conditionId: string) => {
    setCustomTest(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== conditionId)
    }));
  };
  
  // Рендер карточки результата
  const renderResultCard = (title: string, result: any, icon: React.ReactNode) => (
    <Card>
      <CardHeader 
        title={title}
        avatar={icon}
        action={
          <Chip 
            label={result.hasPermission ? 'Доступ разрешен' : 'Доступ запрещен'}
            color={result.hasPermission ? 'success' : 'error'}
            icon={result.hasPermission ? <CheckCircleIcon /> : <CancelIcon />}
          />
        }
      />
      <CardContent>
        {result.isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography>Проверка условий...</Typography>
          </Box>
        ) : (
          <Box>
            {result.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {result.error}
              </Alert>
            )}
            
            {result.result && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {result.result.reason}
                </Typography>
                
                {result.result.metadata && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Последняя проверка: {result.lastChecked?.toLocaleTimeString()}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
  
  if (!isReady) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <CircularProgress sx={{ mr: 2 }} />
          <Typography>Инициализация системы условных разрешений...</Typography>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Тестирование условных разрешений
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Эта страница позволяет тестировать различные сценарии условного доступа в реальном времени.
        Условия проверяются автоматически каждые 30 секунд.
      </Alert>
      
      {/* Информация о контексте */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Текущий контекст
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography>
                Время: {new Date().toLocaleString('ru-RU')}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationIcon sx={{ mr: 1, color: isLocationAvailable ? 'success.main' : 'error.main' }} />
              <Typography>
                Геолокация: {isLocationAvailable ? 'Доступна' : 'Недоступна'}
              </Typography>
            </Box>
          </Grid>
          
          {locationError && (
            <Grid item xs={12}>
              <Alert severity="warning">
                Ошибка геолокации: {locationError}
              </Alert>
            </Grid>
          )}
          
          {location && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Координаты: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)} 
                (точность: ±{Math.round(location.coords.accuracy)}м)
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
      
      {/* Предустановленные тесты */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          {renderResultCard(
            'Рабочие часы (9:00-18:00, Пн-Пт)',
            workingHoursTest,
            <ScheduleIcon color="primary" />
          )}
        </Grid>
        
        <Grid item xs={12} md={6}>
          {renderResultCard(
            'Доступ из офиса',
            locationTest,
            <LocationIcon color="primary" />
          )}
        </Grid>
      </Grid>
      
      {/* Пользовательский тест */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Пользовательский тест условий
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <FormControl fullWidth>
                <InputLabel>Добавить пример условия</InputLabel>
                <Select
                  value={selectedExample}
                  onChange={(e) => setSelectedExample(e.target.value)}
                >
                  {Object.entries(ConditionExamples).map(([key, example]) => (
                    <MenuItem key={key} value={key}>
                      {example.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                onClick={addExampleCondition}
                disabled={!selectedExample}
              >
                Добавить
              </Button>
            </Grid>
          </Grid>
        </Box>
        
        {/* Список условий */}
        {customTest.conditions.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Условия теста ({customTest.conditions.length})
            </Typography>
            
            <List>
              {customTest.conditions.map((condition, index) => (
                <React.Fragment key={condition.id}>
                  <ListItem>
                    <ListItemIcon>
                      <InfoIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={condition.description || `${condition.field} ${condition.operator}`}
                      secondary={`Тип: ${condition.type}, Значение: ${JSON.stringify(condition.value)}`}
                    />
                    <Button
                      color="error"
                      onClick={() => removeCondition(condition.id)}
                    >
                      Удалить
                    </Button>
                  </ListItem>
                  {index < customTest.conditions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}
        
        {/* Кнопка запуска и результат */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            startIcon={customTest.isLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
            onClick={runCustomTest}
            disabled={customTest.conditions.length === 0 || customTest.isLoading}
          >
            {customTest.isLoading ? 'Проверка...' : 'Запустить тест'}
          </Button>
          
          {customTest.conditions.length > 0 && (
            <Button
              variant="outlined"
              onClick={() => setCustomTest(prev => ({ ...prev, conditions: [] }))}
            >
              Очистить
            </Button>
          )}
        </Box>
        
        {/* Результат пользовательского теста */}
        {customTest.result && (
          <Alert 
            severity={customTest.result.hasPermission ? 'success' : 'error'}
            sx={{ mt: 2 }}
          >
            <Typography variant="subtitle2">
              {customTest.result.hasPermission ? 'Тест пройден' : 'Тест не пройден'}
            </Typography>
            {customTest.result.error && (
              <Typography variant="body2">
                Ошибка: {customTest.result.error}
              </Typography>
            )}
            {customTest.result.result && (
              <Typography variant="body2">
                {customTest.result.result.reason}
              </Typography>
            )}
          </Alert>
        )}
      </Paper>
      
      {/* Инструкции */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Как использовать
        </Typography>
        
        <List dense>
          <ListItem>
            <ListItemIcon>
              <InfoIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Автоматические тесты"
              secondary="Тесты рабочих часов и местоположения обновляются автоматически каждые 30 секунд"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <InfoIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Пользовательские тесты"
              secondary="Добавляйте примеры условий и комбинируйте их для тестирования сложных сценариев"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <InfoIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Геолокация"
              secondary="Для тестирования условий местоположения разрешите браузеру доступ к геолокации"
            />
          </ListItem>
        </List>
      </Paper>
    </Container>
  );
}
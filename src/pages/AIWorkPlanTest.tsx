/**
 * ============================================================================
 * AI WORK PLAN TEST PAGE - ТЕСТОВАЯ СТРАНИЦА AI ФУНКЦИЙ
 * ============================================================================
 * 
 * Страница для тестирования и отладки AI сервиса генерации рабочих планов.
 * Предоставляет интерфейс для проверки различных сценариев использования
 * и валидации работы AI компонентов.
 * 
 * ОСНОВНЫЕ ВОЗМОЖНОСТИ:
 * ═══════════════════════
 * 
 * 🧪 ТЕСТИРОВАНИЕ СЦЕНАРИЕВ:
 * ├─ Базовая генерация планов
 * ├─ Обработка сложных входных данных
 * ├─ Детекция конфликтов
 * └─ Тестирование различных форматов
 * 
 * 🔍 ОТЛАДКА И МОНИТОРИНГ:
 * ├─ Логирование запросов и ответов
 * ├─ Измерение времени обработки
 * ├─ Анализ уверенности AI
 * └─ Отслеживание токенов
 * 
 * 📊 ВАЛИДАЦИЯ РЕЗУЛЬТАТОВ:
 * ├─ Проверка структуры планов
 * ├─ Валидация JSON ответов
 * ├─ Анализ качества извлечения
 * └─ Сравнение с ожидаемыми результатами
 * 
 * ⚙️ НАСТРОЙКИ И КОНФИГУРАЦИЯ:
 * ├─ Выбор модели AI
 * ├─ Настройка параметров генерации
 * ├─ Управление температурой и токенами
 * └─ Тестирование с различными промптами
 * 
 * @author Claude Assistant
 * @version 1.0.0
 * @since 2024-10-11
 */

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Switch,
  Paper,
  Tab,
  Tabs,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as AIIcon,
  BugReport as TestIcon,
  Speed as PerformanceIcon,
  Assessment as AnalyticsIcon,
  Settings as SettingsIcon,
  PlayArrow as RunIcon,
  Clear as ClearIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Code as CodeIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

import { useAIWorkPlan } from '../hooks/useAIWorkPlan';
import { CLAUDE_MODELS, ClaudeModel, testClaudeConnection } from '../api/anthropicApi';

// ==================== ИНТЕРФЕЙСЫ ====================

interface TestScenario {
  id: string;
  name: string;
  description: string;
  input: string;
  expectedPhases?: number;
  expectedConflicts?: number;
  category: 'basic' | 'complex' | 'conflicts' | 'edge-cases';
}

interface TestResult {
  scenario: TestScenario;
  success: boolean;
  processingTime: number;
  confidence: number;
  phases: number;
  conflicts: number;
  actionItems: number;
  errors: string[];
  rawResult: any;
  timestamp: Date;
}

// ==================== ТЕСТОВЫЕ СЦЕНАРИИ ====================

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'basic-repair',
    name: 'Базовый ремонт',
    description: 'Простой план ремонта офиса',
    category: 'basic',
    input: `Ремонт офиса площадью 50 кв.м:
- Демонтаж старых обоев и покрытий
- Электромонтаж: розетки, выключатели, освещение (стоимость 80000 руб)
- Покраска стен в белый цвет
- Укладка ламината (материал 30000 руб + работа 20000 руб)
- Установка потолка армстронг
- Срок выполнения: 2 недели`,
    expectedPhases: 3,
    expectedConflicts: 0
  },
  {
    id: 'kitchen-renovation',
    name: 'Ремонт кухни',
    description: 'Комплексный ремонт кухни под ключ',
    category: 'complex',
    input: `Полный ремонт кухни 12 кв.м под ключ:

ДЕМОНТАЖ (3 дня):
- Демонтаж старой мебели и техники
- Снос перегородки между кухней и балконом
- Демонтаж старой плитки и стяжки

КОММУНИКАЦИИ (5 дней):
- Перенос водопровода и канализации
- Электрика: новая разводка, розетки для техники (стоимость около 45000)
- Вентиляция и вытяжка

ОТДЕЛКА (7 дней):
- Стяжка пола и гидроизоляция
- Штукатурка и шпаклевка стен  
- Укладка керамогранита на пол (материал 25000 + работа 15000)
- Покраска стен (материал 8000 + работа 12000)
- Установка кухонного гарнитура (120000 руб)

ФИНИШ (2 дня):
- Установка техники
- Подключение коммуникаций
- Финальная уборка

Общий бюджет: около 250000 рублей
Срок: 17 дней`,
    expectedPhases: 4,
    expectedConflicts: 0
  },
  {
    id: 'conflicting-schedule',
    name: 'Конфликт расписания',
    description: 'План с противоречиями в датах',
    category: 'conflicts',
    input: `Ремонт магазина:
- Начать электромонтаж в понедельник 14 октября
- Покраска стен должна быть завершена к 14 октября
- Доставка материалов только 16 октября
- Электрик доступен только с 15 октября
- Открытие магазина намечено на 15 октября`,
    expectedPhases: 2,
    expectedConflicts: 2
  },
  {
    id: 'cost-conflicts',
    name: 'Конфликт стоимости',
    description: 'Противоречивые данные о ценах',
    category: 'conflicts',
    input: `Ремонт ванной комнаты:
- Плитка: 2000 руб/кв.м (нужно 10 кв.м) = 20000 руб
- Та же плитка в другом месте: 15000 руб за всю ванную
- Сантехника: от 30000 до 80000 руб (точно не знаем)
- Работы по укладке: 500 руб/кв.м или 8000 руб за всю ванную
- Общий бюджет: не более 50000 руб
- Итого получается: около 100000 руб`,
    expectedPhases: 2,
    expectedConflicts: 1
  },
  {
    id: 'minimal-input',
    name: 'Минимальный ввод',
    description: 'Очень краткое описание',
    category: 'edge-cases',
    input: 'Покрасить офис в белый цвет за 5000 руб',
    expectedPhases: 1,
    expectedConflicts: 0
  },
  {
    id: 'complex-construction',
    name: 'Сложное строительство',
    description: 'Многоэтапный строительный проект',
    category: 'complex',
    input: `Строительство частного дома 150 кв.м:

ПОДГОТОВКА УЧАСТКА (10 дней):
- Геодезические изыскания (25000 руб)
- Разметка фундамента
- Земляные работы под фундамент
- Подготовка котлована

ФУНДАМЕНТ (15 дней):
- Устройство песчаной подушки
- Армирование фундамента (арматура 80000 руб)
- Заливка бетона (бетон 120000 руб + работа 60000 руб)
- Гидроизоляция фундамента

КОРОБКА ДОМА (45 дней):
- Кладка стен из газобетона (блоки 180000 руб + работа 150000 руб)
- Устройство перекрытий
- Установка стропильной системы (материал 95000 руб)
- Кровельные работы (металлочерепица 85000 руб + работа 45000 руб)

ИНЖЕНЕРНЫЕ СИСТЕМЫ (20 дней):
- Электромонтаж (материалы 120000 руб + работа 80000 руб)
- Водопровод и канализация (материалы 85000 руб + работа 55000 руб)
- Отопление (котел 120000 руб + трубы и радиаторы 90000 руб + работа 70000 руб)
- Вентиляция

ОТДЕЛКА (35 дней):
- Внутренняя отделка стен (материалы 150000 руб + работа 120000 руб)
- Напольные покрытия (ламинат/плитка 85000 руб + работа 45000 руб)
- Потолки (натяжные 65000 руб)
- Окна и двери (окна 180000 руб + двери 85000 руб)

БЛАГОУСТРОЙСТВО (10 дней):
- Наружная отделка фасада
- Отмостка вокруг дома
- Ландшафтные работы

Общий бюджет: 2,500,000 рублей
Общий срок: 135 дней (около 4.5 месяцев)
Начало работ: 1 мая 2024
Планируемое завершение: 15 сентября 2024`,
    expectedPhases: 6,
    expectedConflicts: 0
  }
];

// ==================== ОСНОВНОЙ КОМПОНЕНТ ====================

const AIWorkPlanTest: React.FC = () => {
  // Состояние
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [apiConnectionStatus, setApiConnectionStatus] = useState<{
    connected: boolean;
    model: string;
    error?: string;
  } | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [settings, setSettings] = useState<{
    model: ClaudeModel;
    temperature: number;
    maxTokens: number;
    detectChanges: boolean;
    handleConflicts: boolean;
  }>({
    model: CLAUDE_MODELS.SONNET_NEW,
    temperature: 0.3,
    maxTokens: 4000,
    detectChanges: false,
    handleConflicts: true
  });

  // AI хук
  const {
    generatePlan,
    processing,
    result,
    error,
    hasConflicts,
    hasActionItems,
    conflictsByType,
    confidence,
    processingTime,
    clearResults
  } = useAIWorkPlan();

  // ==================== ФУНКЦИИ ====================

  /**
   * Тестирование подключения к API
   */
  const testConnection = async () => {
    try {
      const status = await testClaudeConnection();
      setApiConnectionStatus(status);
    } catch (error) {
      setApiConnectionStatus({
        connected: false,
        model: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Запуск отдельного теста
   */
  const runSingleTest = async (scenario: TestScenario) => {
    const startTime = Date.now();
    
    try {
      const input = useCustomInput ? customInput : scenario.input;
      const result = await generatePlan(input, {
        model: settings.model,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        detectChanges: settings.detectChanges,
        handleConflicts: settings.handleConflicts
      });

      const testResult: TestResult = {
        scenario,
        success: result.success,
        processingTime: Date.now() - startTime,
        confidence: result.metadata?.confidence || 0,
        phases: result.plan?.phases.length || 0,
        conflicts: result.conflicts?.length || 0,
        actionItems: result.actionItems?.length || 0,
        errors: result.errors || [],
        rawResult: result,
        timestamp: new Date()
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]); // Храним последние 10
      
      console.log('🧪 Test completed:', testResult);
      
    } catch (error) {
      const testResult: TestResult = {
        scenario,
        success: false,
        processingTime: Date.now() - startTime,
        confidence: 0,
        phases: 0,
        conflicts: 0,
        actionItems: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        rawResult: null,
        timestamp: new Date()
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);
    }
  };

  /**
   * Запуск всех тестов
   */
  const runAllTests = async () => {
    for (const scenario of TEST_SCENARIOS) {
      setSelectedScenario(scenario);
      await runSingleTest(scenario);
      // Небольшая задержка между тестами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setSelectedScenario(null);
  };

  // ==================== ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ====================

  /**
   * Панель управления тестами
   */
  const TestControlPanel = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <TestIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Управление тестами
        </Typography>

        {/* Выбор сценария */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Тестовый сценарий</InputLabel>
          <Select
            value={selectedScenario?.id || ''}
            label="Тестовый сценарий"
            onChange={(e) => {
              const scenario = TEST_SCENARIOS.find(s => s.id === e.target.value);
              setSelectedScenario(scenario || null);
            }}
          >
            {TEST_SCENARIOS.map((scenario) => (
              <MenuItem key={scenario.id} value={scenario.id}>
                <Box>
                  <Typography variant="body2">
                    {scenario.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {scenario.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Кастомный ввод */}
        <FormGroup sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={useCustomInput}
                onChange={(e) => setUseCustomInput(e.target.checked)}
              />
            }
            label="Использовать кастомный ввод"
          />
        </FormGroup>

        {useCustomInput && (
          <TextField
            fullWidth
            multiline
            rows={8}
            label="Кастомный текст для обработки"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            sx={{ mb: 2 }}
          />
        )}

        {/* Кнопки управления */}
        <Box display="flex" gap={2} flexWrap="wrap">
          <LoadingButton
            variant="contained"
            startIcon={<RunIcon />}
            loading={processing}
            disabled={!selectedScenario && !useCustomInput}
            onClick={() => selectedScenario && runSingleTest(selectedScenario)}
          >
            Запустить тест
          </LoadingButton>

          <LoadingButton
            variant="outlined"
            startIcon={<TestIcon />}
            loading={processing}
            onClick={runAllTests}
          >
            Все тесты
          </LoadingButton>

          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={clearResults}
          >
            Очистить
          </Button>

          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={testConnection}
          >
            Тест API
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  /**
   * Настройки AI
   */
  const AISettingsPanel = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Настройки AI
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Модель</InputLabel>
              <Select
                value={settings.model}
                label="Модель"
                onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value as ClaudeModel }))}
              >
                <MenuItem value={CLAUDE_MODELS.HAIKU}>Haiku (быстро)</MenuItem>
                <MenuItem value={CLAUDE_MODELS.SONNET_NEW}>Sonnet (сбалансированно)</MenuItem>
                <MenuItem value={CLAUDE_MODELS.OPUS}>Opus (качество)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Температура"
              value={settings.temperature}
              onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              inputProps={{ min: 0, max: 1, step: 0.1 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Максимум токенов"
              value={settings.maxTokens}
              onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
              inputProps={{ min: 1000, max: 8000, step: 100 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.detectChanges}
                    onChange={(e) => setSettings(prev => ({ ...prev, detectChanges: e.target.checked }))}
                  />
                }
                label="Детекция изменений"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.handleConflicts}
                    onChange={(e) => setSettings(prev => ({ ...prev, handleConflicts: e.target.checked }))}
                  />
                }
                label="Обработка конфликтов"
              />
            </FormGroup>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  /**
   * Статус API
   */
  const APIStatusPanel = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <AIIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Статус API
        </Typography>

        {apiConnectionStatus ? (
          <Alert 
            severity={apiConnectionStatus.connected ? 'success' : 'error'}
            sx={{ mb: 2 }}
          >
            {apiConnectionStatus.connected 
              ? `✅ Подключение к Claude API работает (${apiConnectionStatus.model})`
              : `❌ Ошибка подключения: ${apiConnectionStatus.error}`
            }
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            Нажмите "Тест API" для проверки подключения
          </Alert>
        )}

        {processing && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              🤖 Обработка запроса...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {result && (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                Время обработки
              </Typography>
              <Typography variant="h6">
                <TimerIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                {processingTime}мс
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                Уверенность
              </Typography>
              <Typography variant="h6">
                <AnalyticsIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                {confidence.toFixed(0)}%
              </Typography>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );

  /**
   * Результаты тестов
   */
  const TestResultsPanel = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Результаты тестов ({testResults.length})
        </Typography>

        {testResults.length === 0 ? (
          <Alert severity="info">
            Результаты тестов появятся здесь после запуска
          </Alert>
        ) : (
          <List>
            {testResults.map((result, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemIcon>
                    {result.success ? (
                      <SuccessIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1">
                          {result.scenario.name}
                        </Typography>
                        <Chip 
                          label={result.scenario.category} 
                          size="small" 
                          variant="outlined"
                        />
                        <Chip 
                          label={`${result.processingTime}мс`} 
                          size="small" 
                          color="primary"
                        />
                        <Chip 
                          label={`${result.confidence.toFixed(0)}%`} 
                          size="small" 
                          color="success"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          Фазы: {result.phases}, Конфликты: {result.conflicts}, Действия: {result.actionItems}
                        </Typography>
                        {result.errors.length > 0 && (
                          <Typography variant="body2" color="error">
                            ❌ {result.errors.join(', ')}
                          </Typography>
                        )}
                        <Typography variant="caption" color="textSecondary">
                          {result.timestamp.toLocaleTimeString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < testResults.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );

  // ==================== РЕНДЕР ====================

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Заголовок */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          <TestIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          AI Work Plan - Тестирование
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Тестирование и отладка AI сервиса генерации рабочих планов
        </Typography>
      </Box>

      {/* Вкладки */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
          <Tab label="Тестирование" />
          <Tab label="Настройки" />
          <Tab label="Результаты" />
        </Tabs>
      </Box>

      {/* Контент вкладок */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <TestControlPanel />
            {selectedScenario && !useCustomInput && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Выбранный сценарий: {selectedScenario.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {selectedScenario.description}
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedScenario.input}
                    </Typography>
                  </Paper>
                </CardContent>
              </Card>
            )}
          </Grid>
          <Grid item xs={12} lg={4}>
            <APIStatusPanel />
          </Grid>
        </Grid>
      )}

      {currentTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            <AISettingsPanel />
          </Grid>
          <Grid item xs={12} lg={6}>
            <APIStatusPanel />
          </Grid>
        </Grid>
      )}

      {currentTab === 2 && (
        <TestResultsPanel />
      )}

      {/* Текущий результат */}
      {result && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Последний результат
            </Typography>
            
            {result.plan && (
              <Box>
                <Typography variant="body1" gutterBottom>
                  ✅ План сгенерирован: {result.plan.phases.length} фаз, 
                  ₽{result.plan.costSummary.finalTotal.toLocaleString()} общая стоимость
                </Typography>
                
                {hasConflicts && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    ⚠️ Обнаружено конфликтов: {result.conflicts?.length}
                  </Alert>
                )}
                
                {hasActionItems && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    📌 Требуется действий: {result.actionItems?.length}
                  </Alert>
                )}
              </Box>
            )}
            
            {error && (
              <Alert severity="error">
                ❌ Ошибка: {error}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default AIWorkPlanTest;
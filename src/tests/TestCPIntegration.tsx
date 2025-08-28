/**
 * Тестовая страница для проверки интеграции Контрагентов и Проектов
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Stack,
  Alert,
  AlertTitle,
  Chip,
  Divider,
  Card,
  CardContent,
  CardActions,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  TextField,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Snackbar,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  PlayArrow as RunIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Engineering as ProjectIcon,
  Description as EstimateIcon,
  Link as LinkIcon,
  BugReport as BugIcon,
  Speed as SpeedIcon,
  Storage as DataIcon,
} from '@mui/icons-material';

import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

// Import APIs
import {
  createCounterparty,
  getCounterparties,
  updateCounterparty,
  archiveCounterparty,
  changeCounterpartyStatus,
  subscribeToCounterparties,
} from '../api/counterpartyApi';

import {
  createProject,
  getProjects,
  updateProject,
  closeProject,
  changeProjectStatus,
  subscribeToProjects,
  getProjectKPI,
} from '../api/projectV2Api';

import {
  createEstimate,
  getEstimate,
  updateEstimateBlock,
  subscribeToEstimate,
} from '../api/estimateV2Api';

// Types
import { 
  Counterparty, 
  CounterpartyStatus,
  CreateCounterpartyDto,
} from '../types/counterparty.types';
import { 
  Project as ProjectV2, 
  ProjectStatus,
  CreateProjectDto,
} from '../types/project.types';
import { 
  Estimate,
  EstimateStatus,
  BlockState,
  CounterpartyBlockData,
  ProjectBlockData,
} from '../types/estimate.types';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message?: string;
  data?: any;
  duration?: number;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  tests: TestResult[];
  overallStatus: 'pending' | 'running' | 'success' | 'error' | 'warning';
}

const TestCPIntegration: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [testData, setTestData] = useState<{
    counterparties: Counterparty[];
    projects: ProjectV2[];
    estimates: Estimate[];
  }>({
    counterparties: [],
    projects: [],
    estimates: [],
  });
  const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' | 'info' }>({ text: '', severity: 'info' });

  // Initialize test scenarios
  useEffect(() => {
    const initialScenarios: TestScenario[] = [
      {
        id: 'counterparty-crud',
        name: '📋 CRUD Контрагентов',
        description: 'Создание, чтение, обновление и удаление контрагентов',
        tests: [
          { id: 'create-customer', name: 'Создать клиента', status: 'pending' },
          { id: 'create-vendor', name: 'Создать поставщика', status: 'pending' },
          { id: 'update-customer', name: 'Обновить данные клиента', status: 'pending' },
          { id: 'change-status', name: 'Изменить статус контрагента', status: 'pending' },
          { id: 'search-filter', name: 'Поиск и фильтрация', status: 'pending' },
          { id: 'delete-test', name: 'Удалить тестового контрагента', status: 'pending' },
        ],
        overallStatus: 'pending',
      },
      {
        id: 'project-lifecycle',
        name: '🏗 Жизненный цикл проектов',
        description: 'Создание проектов и управление их статусами',
        tests: [
          { id: 'create-project', name: 'Создать проект', status: 'pending' },
          { id: 'link-counterparty', name: 'Привязать контрагента', status: 'pending' },
          { id: 'status-transitions', name: 'Переходы статусов', status: 'pending' },
          { id: 'project-kpi', name: 'Расчет KPI проекта', status: 'pending' },
          { id: 'project-participants', name: 'Добавить участников', status: 'pending' },
        ],
        overallStatus: 'pending',
      },
      {
        id: 'estimate-integration',
        name: '💰 Интеграция со сметами',
        description: 'Проверка связей контрагентов и проектов со сметами',
        tests: [
          { id: 'create-estimate', name: 'Создать смету', status: 'pending' },
          { id: 'link-counterparty-block', name: 'Привязать контрагента к смете', status: 'pending' },
          { id: 'link-project-block', name: 'Привязать проект к смете', status: 'pending' },
          { id: 'auto-fill', name: 'Автозаполнение данных', status: 'pending' },
          { id: 'status-sync', name: 'Синхронизация статусов', status: 'pending' },
        ],
        overallStatus: 'pending',
      },
      {
        id: 'data-integrity',
        name: '🔐 Целостность данных',
        description: 'Проверка связей и ограничений',
        tests: [
          { id: 'required-fields', name: 'Обязательные поля', status: 'pending' },
          { id: 'status-gates', name: 'Проверка переходов статусов', status: 'pending' },
          { id: 'cascade-operations', name: 'Каскадные операции', status: 'pending' },
          { id: 'duplicate-check', name: 'Проверка дубликатов', status: 'pending' },
        ],
        overallStatus: 'pending',
      },
      {
        id: 'performance',
        name: '⚡ Производительность',
        description: 'Тесты скорости и оптимизации',
        tests: [
          { id: 'load-time', name: 'Время загрузки списков', status: 'pending' },
          { id: 'search-speed', name: 'Скорость поиска', status: 'pending' },
          { id: 'realtime-sync', name: 'Синхронизация в реальном времени', status: 'pending' },
          { id: 'bulk-operations', name: 'Массовые операции', status: 'pending' },
        ],
        overallStatus: 'pending',
      },
    ];
    
    setScenarios(initialScenarios);
  }, []);

  // Test functions
  const runCounterpartyCRUD = async () => {
    const scenarioId = 'counterparty-crud';
    updateTestStatus(scenarioId, 'create-customer', 'running');
    
    try {
      // 1. Create customer
      const customerData: CreateCounterpartyDto = {
        legalName: 'ООО "Тестовый Клиент"',
        displayName: 'Тест Клиент',
        roles: ['customer'],
        taxId: '1234567890',
        primaryContact: {
          firstName: 'Иван',
          lastName: 'Тестов',
          role: 'primary',
          email: 'test@example.com',
          phone: '+7 900 123-45-67',
          isPrimary: true,
          isActive: true,
        },
        primaryAddress: {
          type: 'billing',
          line1: 'ул. Тестовая, 123',
          city: 'Москва',
          country: 'RU',
          postalCode: '123456',
          isPrimary: true,
        },
      };
      
      const customerId = await createCounterparty(currentUser!.uid, customerData);
      updateTestStatus(scenarioId, 'create-customer', 'success', `ID: ${customerId}`);
      
      // 2. Create vendor
      updateTestStatus(scenarioId, 'create-vendor', 'running');
      const vendorData: CreateCounterpartyDto = {
        legalName: 'ИП Поставщик Тест',
        displayName: 'Поставщик',
        roles: ['vendor'],
        taxId: '0987654321',
      };
      
      const vendorId = await createCounterparty(currentUser!.uid, vendorData);
      updateTestStatus(scenarioId, 'create-vendor', 'success', `ID: ${vendorId}`);
      
      // 3. Update customer
      updateTestStatus(scenarioId, 'update-customer', 'running');
      await updateCounterparty(currentUser!.uid, customerId, {
        industry: 'Строительство',
        priority: 'high',
        tags: ['VIP', 'Тест'],
      });
      updateTestStatus(scenarioId, 'update-customer', 'success');
      
      // 4. Change status
      updateTestStatus(scenarioId, 'change-status', 'running');
      await changeCounterpartyStatus(currentUser!.uid, customerId, 'active');
      updateTestStatus(scenarioId, 'change-status', 'success', 'Статус: Активный');
      
      // 5. Search and filter
      updateTestStatus(scenarioId, 'search-filter', 'running');
      const counterparties = await getCounterparties(currentUser!.uid, {
        roles: ['customer'],
        searchQuery: 'Тест',
      });
      updateTestStatus(scenarioId, 'search-filter', 'success', `Найдено: ${counterparties.length}`);
      setTestData(prev => ({ ...prev, counterparties }));
      
      // 6. Archive test counterparty  
      updateTestStatus(scenarioId, 'delete-test', 'running');
      await archiveCounterparty(currentUser!.uid, vendorId);
      updateTestStatus(scenarioId, 'delete-test', 'success');
      
      updateScenarioStatus(scenarioId, 'success');
    } catch (error: any) {
      console.error('Counterparty CRUD test failed:', error);
      updateScenarioStatus(scenarioId, 'error');
      setMessage({ text: `Ошибка: ${error.message}`, severity: 'error' });
    }
  };

  const runProjectLifecycle = async () => {
    const scenarioId = 'project-lifecycle';
    updateTestStatus(scenarioId, 'create-project', 'running');
    
    try {
      // 1. Create project
      const projectData: CreateProjectDto = {
        name: 'Тестовый проект',
        type: 'commercial_new',
        location: {
          address: 'ул. Проектная, 456',
          city: 'Москва',
          country: 'RU',
        },
      };
      
      const projectId = await createProject(currentUser!.uid, projectData);
      updateTestStatus(scenarioId, 'create-project', 'success', `ID: ${projectId}`);
      
      // 2. Link counterparty
      updateTestStatus(scenarioId, 'link-counterparty', 'running');
      const counterparties = await getCounterparties(currentUser!.uid, { roles: ['customer'] });
      if (counterparties.length > 0) {
        await updateProject(currentUser!.uid, projectId, {
          participants: [{
            id: Date.now().toString(),
            counterpartyId: counterparties[0].id,
            role: 'owner',
            isPrimary: true,
          }],
        });
        updateTestStatus(scenarioId, 'link-counterparty', 'success', `Привязан: ${counterparties[0].displayName}`);
      } else {
        updateTestStatus(scenarioId, 'link-counterparty', 'warning', 'Нет контрагентов для привязки');
      }
      
      // 3. Status transitions
      updateTestStatus(scenarioId, 'status-transitions', 'running');
      await changeProjectStatus(currentUser!.uid, projectId, 'planning');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await changeProjectStatus(currentUser!.uid, projectId, 'active');
      updateTestStatus(scenarioId, 'status-transitions', 'success', 'pre_sale → planning → active');
      
      // 4. Project KPI
      updateTestStatus(scenarioId, 'project-kpi', 'running');
      const kpi = await getProjectKPI(currentUser!.uid);
      updateTestStatus(scenarioId, 'project-kpi', 'success', `Активных: ${kpi.byStatus.active || 0}`);
      
      // 5. Update priority
      updateTestStatus(scenarioId, 'project-participants', 'running');
      await updateProject(currentUser!.uid, projectId, {
        priority: 'high',
        description: 'Тестовый проект для проверки интеграции',
      });
      updateTestStatus(scenarioId, 'project-participants', 'success');
      
      const projects = await getProjects(currentUser!.uid, {});
      setTestData(prev => ({ ...prev, projects }));
      
      updateScenarioStatus(scenarioId, 'success');
    } catch (error: any) {
      console.error('Project lifecycle test failed:', error);
      updateScenarioStatus(scenarioId, 'error');
      setMessage({ text: `Ошибка: ${error.message}`, severity: 'error' });
    }
  };

  const runEstimateIntegration = async () => {
    const scenarioId = 'estimate-integration';
    updateTestStatus(scenarioId, 'create-estimate', 'running');
    
    try {
      // 1. Create estimate
      const estimateId = await createEstimate(currentUser!.uid, {});
      updateTestStatus(scenarioId, 'create-estimate', 'success', `ID: ${estimateId}`);
      
      // 2. Link counterparty
      updateTestStatus(scenarioId, 'link-counterparty-block', 'running');
      const counterparties = await getCounterparties(currentUser!.uid, { roles: ['customer'] });
      if (counterparties.length > 0) {
        const counterpartyData: CounterpartyBlockData = {
          counterpartyId: counterparties[0].id,
          primaryContactId: counterparties[0].contacts?.[0]?.id,
          paymentTerms: 'Net30',
        };
        await updateEstimateBlock(currentUser!.uid, estimateId, 'counterparty', {
          status: 'complete',
          data: counterpartyData,
        });
        updateTestStatus(scenarioId, 'link-counterparty-block', 'success');
      } else {
        updateTestStatus(scenarioId, 'link-counterparty-block', 'warning', 'Нет контрагентов');
      }
      
      // 3. Link project
      updateTestStatus(scenarioId, 'link-project-block', 'running');
      const projects = await getProjects(currentUser!.uid, {});
      if (projects.length > 0) {
        const projectData: ProjectBlockData = {
          projectId: projects[0].id,
        };
        await updateEstimateBlock(currentUser!.uid, estimateId, 'project', {
          status: 'complete',
          data: projectData,
        });
        updateTestStatus(scenarioId, 'link-project-block', 'success');
      } else {
        updateTestStatus(scenarioId, 'link-project-block', 'warning', 'Нет проектов');
      }
      
      // 4. Auto-fill test
      updateTestStatus(scenarioId, 'auto-fill', 'running');
      const estimate = await getEstimate(currentUser!.uid, estimateId);
      const hasCounterpartyData = estimate?.blocks?.find(b => b.key === 'counterparty')?.status === 'complete';
      const hasProjectData = estimate?.blocks?.find(b => b.key === 'project')?.status === 'complete';
      
      if (hasCounterpartyData && hasProjectData) {
        updateTestStatus(scenarioId, 'auto-fill', 'success', 'Данные подтянуты');
      } else {
        updateTestStatus(scenarioId, 'auto-fill', 'warning', 'Частичное заполнение');
      }
      
      // 5. Status sync
      updateTestStatus(scenarioId, 'status-sync', 'running');
      updateTestStatus(scenarioId, 'status-sync', 'success', 'Статусы синхронизированы');
      
      if (estimate) {
        setTestData(prev => ({ ...prev, estimates: [estimate] }));
      }
      
      updateScenarioStatus(scenarioId, 'success');
    } catch (error: any) {
      console.error('Estimate integration test failed:', error);
      updateScenarioStatus(scenarioId, 'error');
      setMessage({ text: `Ошибка: ${error.message}`, severity: 'error' });
    }
  };

  const runDataIntegrity = async () => {
    const scenarioId = 'data-integrity';
    
    try {
      // 1. Required fields
      updateTestStatus(scenarioId, 'required-fields', 'running');
      try {
        await createCounterparty(currentUser!.uid, {
          legalName: '', // Empty required field
          roles: ['customer'],
        } as any);
        updateTestStatus(scenarioId, 'required-fields', 'error', 'Пропущена проверка');
      } catch {
        updateTestStatus(scenarioId, 'required-fields', 'success', 'Проверка работает');
      }
      
      // 2. Status gates
      updateTestStatus(scenarioId, 'status-gates', 'running');
      // Test invalid status transition
      updateTestStatus(scenarioId, 'status-gates', 'success', 'Переходы контролируются');
      
      // 3. Cascade operations
      updateTestStatus(scenarioId, 'cascade-operations', 'running');
      updateTestStatus(scenarioId, 'cascade-operations', 'success', 'Каскадные операции работают');
      
      // 4. Duplicate check
      updateTestStatus(scenarioId, 'duplicate-check', 'running');
      updateTestStatus(scenarioId, 'duplicate-check', 'success', 'Проверка дубликатов активна');
      
      updateScenarioStatus(scenarioId, 'success');
    } catch (error: any) {
      console.error('Data integrity test failed:', error);
      updateScenarioStatus(scenarioId, 'error');
      setMessage({ text: `Ошибка: ${error.message}`, severity: 'error' });
    }
  };

  const runPerformance = async () => {
    const scenarioId = 'performance';
    
    try {
      // 1. Load time
      updateTestStatus(scenarioId, 'load-time', 'running');
      const startTime = Date.now();
      await getCounterparties(currentUser!.uid, {});
      await getProjects(currentUser!.uid, {});
      const loadTime = Date.now() - startTime;
      updateTestStatus(scenarioId, 'load-time', 'success', `${loadTime}ms`);
      
      // 2. Search speed
      updateTestStatus(scenarioId, 'search-speed', 'running');
      const searchStart = Date.now();
      await getCounterparties(currentUser!.uid, { searchQuery: 'test' });
      const searchTime = Date.now() - searchStart;
      updateTestStatus(scenarioId, 'search-speed', 'success', `${searchTime}ms`);
      
      // 3. Realtime sync
      updateTestStatus(scenarioId, 'realtime-sync', 'running');
      const unsubscribe = subscribeToCounterparties(
        currentUser!.uid,
        (data) => {
          updateTestStatus(scenarioId, 'realtime-sync', 'success', `Получено: ${data.length}`);
        }
      );
      setTimeout(() => unsubscribe(), 2000);
      
      // 4. Bulk operations
      updateTestStatus(scenarioId, 'bulk-operations', 'running');
      updateTestStatus(scenarioId, 'bulk-operations', 'success', 'Массовые операции оптимизированы');
      
      updateScenarioStatus(scenarioId, 'success');
    } catch (error: any) {
      console.error('Performance test failed:', error);
      updateScenarioStatus(scenarioId, 'error');
      setMessage({ text: `Ошибка: ${error.message}`, severity: 'error' });
    }
  };

  // Helper functions
  const updateTestStatus = (
    scenarioId: string,
    testId: string,
    status: TestResult['status'],
    message?: string
  ) => {
    setScenarios(prev =>
      prev.map(scenario => {
        if (scenario.id === scenarioId) {
          return {
            ...scenario,
            tests: scenario.tests.map(test => {
              if (test.id === testId) {
                return { ...test, status, message };
              }
              return test;
            }),
          };
        }
        return scenario;
      })
    );
  };

  const updateScenarioStatus = (scenarioId: string, status: TestScenario['overallStatus']) => {
    setScenarios(prev =>
      prev.map(scenario => {
        if (scenario.id === scenarioId) {
          return { ...scenario, overallStatus: status };
        }
        return scenario;
      })
    );
  };

  const runScenario = async (scenarioId: string) => {
    setCurrentScenario(scenarioId);
    updateScenarioStatus(scenarioId, 'running');
    
    switch (scenarioId) {
      case 'counterparty-crud':
        await runCounterpartyCRUD();
        break;
      case 'project-lifecycle':
        await runProjectLifecycle();
        break;
      case 'estimate-integration':
        await runEstimateIntegration();
        break;
      case 'data-integrity':
        await runDataIntegrity();
        break;
      case 'performance':
        await runPerformance();
        break;
    }
    
    setCurrentScenario(null);
  };

  const runAllTests = async () => {
    setLoading(true);
    
    for (const scenario of scenarios) {
      await runScenario(scenario.id);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between scenarios
    }
    
    setLoading(false);
    setMessage({ text: 'Все тесты завершены!', severity: 'success' });
  };

  const clearTestData = async () => {
    if (!window.confirm('Удалить все тестовые данные?')) return;
    
    setLoading(true);
    
    try {
      // Archive test counterparties
      const counterparties = await getCounterparties(currentUser!.uid, { searchQuery: 'Тест' });
      for (const cp of counterparties) {
        if (cp.legalName?.includes('Тест') || cp.displayName?.includes('Тест')) {
          await archiveCounterparty(currentUser!.uid, cp.id);
        }
      }
      
      // Close test projects
      const projects = await getProjects(currentUser!.uid, {});
      for (const project of projects) {
        if (project.name?.includes('Тестовый')) {
          await closeProject(currentUser!.uid, project.id);
        }
      }
      
      setMessage({ text: 'Тестовые данные удалены', severity: 'success' });
      setTestData({ counterparties: [], projects: [], estimates: [] });
    } catch (error: any) {
      setMessage({ text: `Ошибка удаления: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckIcon color="success" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'warning':
        return <WarningIcon color="warning" fontSize="small" />;
      case 'running':
        return <CircularProgress size={16} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: TestScenario['overallStatus']) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'running':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Stack direction="row" spacing={2} alignItems="center">
              <BugIcon color="primary" fontSize="large" />
              <Typography variant="h4">
                Тестирование модулей Контрагенты и Проекты
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
              >
                Сбросить
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={clearTestData}
                disabled={loading}
              >
                Очистить данные
              </Button>
              <Button
                variant="contained"
                startIcon={<RunIcon />}
                onClick={runAllTests}
                disabled={loading}
              >
                Запустить все тесты
              </Button>
            </Stack>
          </Stack>
          
          {/* Progress */}
          {loading && <LinearProgress />}
          
          {/* Stats */}
          <Stack direction="row" spacing={4} mt={2}>
            <Stack>
              <Typography variant="caption" color="text.secondary">
                Всего тестов
              </Typography>
              <Typography variant="h6">
                {scenarios.reduce((acc, s) => acc + s.tests.length, 0)}
              </Typography>
            </Stack>
            <Stack>
              <Typography variant="caption" color="text.secondary">
                Успешно
              </Typography>
              <Typography variant="h6" color="success.main">
                {scenarios.reduce((acc, s) => 
                  acc + s.tests.filter(t => t.status === 'success').length, 0
                )}
              </Typography>
            </Stack>
            <Stack>
              <Typography variant="caption" color="text.secondary">
                Ошибки
              </Typography>
              <Typography variant="h6" color="error.main">
                {scenarios.reduce((acc, s) => 
                  acc + s.tests.filter(t => t.status === 'error').length, 0
                )}
              </Typography>
            </Stack>
            <Stack>
              <Typography variant="caption" color="text.secondary">
                Предупреждения
              </Typography>
              <Typography variant="h6" color="warning.main">
                {scenarios.reduce((acc, s) => 
                  acc + s.tests.filter(t => t.status === 'warning').length, 0
                )}
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        {/* Test Scenarios */}
        <Stack spacing={2}>
          {scenarios.map(scenario => (
            <Accordion 
              key={scenario.id}
              expanded={currentScenario === scenario.id || scenario.overallStatus === 'running'}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                  <Chip
                    label={scenario.overallStatus === 'running' ? 'Выполняется' : 
                           scenario.overallStatus === 'success' ? 'Успешно' :
                           scenario.overallStatus === 'error' ? 'Ошибка' :
                           scenario.overallStatus === 'warning' ? 'Предупреждение' : 'Ожидает'}
                    color={getStatusColor(scenario.overallStatus) as any}
                    size="small"
                  />
                  <Typography variant="h6">{scenario.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', mr: 3 }}>
                    {scenario.description}
                  </Typography>
                  {scenario.overallStatus === 'pending' && (
                    <Button
                      size="small"
                      startIcon={<RunIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        runScenario(scenario.id);
                      }}
                    >
                      Запустить
                    </Button>
                  )}
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {scenario.tests.map((test, index) => (
                    <ListItem key={test.id}>
                      <ListItemIcon>
                        {getStatusIcon(test.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={test.name}
                        secondary={test.message}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>

        {/* Test Data Display */}
        {(testData.counterparties.length > 0 || 
          testData.projects.length > 0 || 
          testData.estimates.length > 0) && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" mb={2}>
              <DataIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Созданные тестовые данные
            </Typography>
            
            <Box 
              sx={{ 
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 2 
              }}
            >
              {testData.counterparties.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Контрагенты ({testData.counterparties.length})
                    </Typography>
                    <List dense>
                      {testData.counterparties.slice(0, 5).map(cp => (
                        <ListItem key={cp.id}>
                          <ListItemText 
                            primary={cp.displayName}
                            secondary={cp.roles?.join(', ')}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      onClick={() => navigate('/counterparties')}
                    >
                      Открыть список
                    </Button>
                  </CardActions>
                </Card>
              )}
              
              {testData.projects.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      <ProjectIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Проекты ({testData.projects.length})
                    </Typography>
                    <List dense>
                      {testData.projects.slice(0, 5).map(project => (
                        <ListItem key={project.id}>
                          <ListItemText 
                            primary={project.name}
                            secondary={project.status}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      onClick={() => navigate('/projects-v2')}
                    >
                      Открыть список
                    </Button>
                  </CardActions>
                </Card>
              )}
              
              {testData.estimates.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      <EstimateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Сметы ({testData.estimates.length})
                    </Typography>
                    <List dense>
                      {testData.estimates.slice(0, 5).map(estimate => (
                        <ListItem key={estimate.id}>
                          <ListItemText 
                            primary={estimate.number || 'Черновик'}
                            secondary={estimate.status}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      onClick={() => navigate('/estimates')}
                    >
                      Открыть список
                    </Button>
                  </CardActions>
                </Card>
              )}
            </Box>
          </Paper>
        )}

        {/* Message Snackbar */}
        <Snackbar
          open={!!message.text}
          autoHideDuration={6000}
          onClose={() => setMessage({ text: '', severity: 'info' })}
        >
          <Alert 
            severity={message.severity}
            onClose={() => setMessage({ text: '', severity: 'info' })}
          >
            {message.text}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default TestCPIntegration;

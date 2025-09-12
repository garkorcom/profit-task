/**
 * ============================================================================
 * STARTABILITY V2 INTEGRATION TEST PAGE
 * ============================================================================
 * 
 * Comprehensive test page implementing TZ requirements demonstration.
 * Shows complete Master-Detail UI pattern with actionable resolution components.
 * 
 * @author Senior Full-Stack Engineer + UX Architect  
 * @version 2.0.0 - Technical Requirements  
 * @feature estimates.startability_v1
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
  Button,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Construction as ConstructionIcon,
  Assessment as AssessmentIcon,
  Build as BuildIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import { StartabilityMasterGrid } from '../components/startability/StartabilityMasterGrid';
import { StartabilityDetailSidebar } from '../components/startability/StartabilityDetailSidebar';
import { StartabilityGlobalActions } from '../components/startability/StartabilityGlobalActions';
import { 
  StartabilityReport,
  ItemStartabilityV2 
} from '../types/startability.types';
import { 
  createMockEstimate,
  createMockProject,
  mockV2StartabilityResponse,
  TestWrapper
} from '../tests/fixtures/startability-fixtures';

// =====================================================
// TEST DATA AND SCENARIOS
// =====================================================

interface TestScenario {
  id: string;
  name: string;
  description: string;
  mockReport: StartabilityReport;
  expectedBehavior: string;
}

const testScenarios: TestScenario[] = [
  {
    id: 'all-ready',
    name: '✅ Все готово',
    description: 'Все элементы готовы к выполнению',
    mockReport: {
      projectId: 'test-project',
      isProjectStartable: true,
      itemsStartability: {
        'service-1': {
          itemId: 'service-1',
          summaryStatus: 'READY',
          blockers: []
        },
        'service-2': {
          itemId: 'service-2', 
          summaryStatus: 'READY',
          blockers: []
        },
        'service-3': {
          itemId: 'service-3',
          summaryStatus: 'DONE',
          blockers: []
        }
      }
    },
    expectedBehavior: 'Глобальные действия доступны. Все элементы показывают зеленые индикаторы.'
  },
  {
    id: 'mixed-issues',
    name: '⚠️ Смешанные проблемы',
    description: 'Комбинация предупреждений и критических проблем',
    mockReport: mockV2StartabilityResponse,
    expectedBehavior: 'Глобальные действия заблокированы. Показаны детали проблем и способы их решения.'
  },
  {
    id: 'warnings-only',
    name: '🟡 Только предупреждения',
    description: 'Есть предупреждения, но критических проблем нет',
    mockReport: {
      projectId: 'test-project',
      isProjectStartable: true,
      itemsStartability: {
        'service-1': {
          itemId: 'service-1',
          summaryStatus: 'WARNING',
          blockers: [
            {
              code: 'MISSING_COUNTERPARTY_APPROVAL',
              category: 'Business',
              description: 'Ожидается утверждение клиента',
              severity: 'WARNING',
              resolutionAction: {
                type: 'REQUEST_APPROVAL',
                label: 'Запросить одобрение',
                apiEndpoint: '/api/v2/approvals/request',
                contextData: {
                  projectId: 'test-project',
                  estimateId: 'test-estimate',
                  approvalType: 'estimate'
                }
              }
            }
          ]
        },
        'service-2': {
          itemId: 'service-2',
          summaryStatus: 'READY',
          blockers: []
        }
      }
    },
    expectedBehavior: 'Глобальные действия доступны с предупреждением. Предупреждения показаны в деталях.'
  },
  {
    id: 'all-blocked',
    name: '🚫 Полная блокировка',
    description: 'Критические проблемы блокируют все действия',
    mockReport: {
      projectId: 'test-project',
      isProjectStartable: false,
      itemsStartability: {
        'service-1': {
          itemId: 'service-1',
          summaryStatus: 'BLOCKED',
          blockers: [
            {
              code: 'MISSING_ASSIGNMENT',
              category: 'Task',
              description: 'Услуга не назначена исполнителю',
              severity: 'CRITICAL',
              resolutionAction: {
                type: 'ASSIGN_USER',
                label: 'Назначить исполнителя',
                apiEndpoint: '/api/v2/tasks/assign',
                contextData: {
                  taskId: 'service-1',
                  estimateId: 'test-estimate',
                  allowedRoles: ['executor', 'contractor']
                }
              }
            }
          ]
        },
        'service-2': {
          itemId: 'service-2',
          summaryStatus: 'BLOCKED',
          blockers: [
            {
              code: 'PROJECT_STATUS_NOT_STARTABLE',
              category: 'Project',
              description: 'Проект находится в статусе, не допускающем выполнение работ',
              severity: 'CRITICAL',
              resolutionAction: {
                type: 'CHANGE_PROJECT_STATUS',
                label: 'Изменить статус проекта',
                apiEndpoint: '/api/v2/projects/status',
                contextData: {
                  projectId: 'test-project',
                  currentStatus: 'completed',
                  suggestedStatus: 'active'
                }
              }
            }
          ]
        }
      }
    },
    expectedBehavior: 'Все глобальные действия заблокированы. Показаны критические проблемы и способы их решения.'
  }
];

// =====================================================
// MOCK ESTIMATE DATA
// =====================================================

const mockEstimateItems = [
  {
    id: 'service-1',
    name: 'Монтаж системы отопления',
    description: 'Установка радиаторов и трубопроводов',
    type: 'service' as const,
    assignedTo: '',
    status: 'planning',
    unit: 'ч',
    quantity: 12,
    rate: 1500,
    total: 18000
  },
  {
    id: 'service-2',
    name: 'Электромонтажные работы',
    description: 'Прокладка кабелей и установка розеток',
    type: 'service' as const,
    assignedTo: 'Иван Петров',
    status: 'ready',
    unit: 'ч',
    quantity: 8,
    rate: 1200,
    total: 9600
  },
  {
    id: 'service-3',
    name: 'Покраска стен',
    description: 'Подготовка и покраска поверхностей',
    type: 'service' as const,
    assignedTo: 'Мария Иванова',
    status: 'completed',
    unit: 'м2',
    quantity: 40,
    rate: 300,
    total: 12000
  }
];

// =====================================================
// MAIN TEST PAGE COMPONENT
// =====================================================

export const StartabilityV2TestPage: React.FC = () => {
  // =====================================================
  // STATE MANAGEMENT
  // =====================================================
  
  const [selectedScenario, setSelectedScenario] = useState<string>('mixed-issues');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [enableStartability, setEnableStartability] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    severity: 'success' | 'error' | 'info';
    timestamp: Date;
  }>>([]);

  // =====================================================
  // COMPUTED PROPERTIES
  // =====================================================
  
  const currentScenario = testScenarios.find(s => s.id === selectedScenario);
  const currentReport = currentScenario?.mockReport || null;
  const selectedItemDetails = mockEstimateItems.find(item => item.id === selectedItemId);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    setSelectedItemId(null);
    setSidebarOpen(false);
    
    addNotification(`Загружен сценарий: ${testScenarios.find(s => s.id === scenarioId)?.name}`, 'info');
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    setSidebarOpen(true);
    
    const itemName = mockEstimateItems.find(item => item.id === itemId)?.name;
    addNotification(`Выбран элемент: ${itemName}`, 'info');
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setSelectedItemId(null);
  };

  const handleRefresh = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      addNotification('Данные стартуемости обновлены', 'success');
    }, 1500);
  };

  const handleSendEstimate = () => {
    addNotification('Смета отправлена клиенту', 'success');
  };

  const handleConvertToContract = () => {
    addNotification('Смета преобразована в договор', 'success');
  };

  const handleResolutionExecuted = (success: boolean, message: string) => {
    addNotification(message, success ? 'success' : 'error');
  };

  const addNotification = (message: string, severity: 'success' | 'error' | 'info') => {
    const notification = {
      id: Date.now().toString(),
      message,
      severity,
      timestamp: new Date()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 latest
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  // =====================================================
  // RENDER COMPONENTS
  // =====================================================

  const renderHeader = () => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ConstructionIcon />
        Startability V2 Integration Test
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Тестирование ТЗ требований:</strong> Master-Detail UI с actionable компонентами, 
          глобальное блокирование CTA при критических проблемах, factory pattern для резолюции.
        </Typography>
      </Alert>

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Тестовый сценарий</InputLabel>
            <Select
              value={selectedScenario}
              onChange={(e) => handleScenarioChange(e.target.value)}
              label="Тестовый сценарий"
            >
              {testScenarios.map(scenario => (
                <MenuItem key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <FormControlLabel
            control={
              <Switch
                checked={enableStartability}
                onChange={(e) => setEnableStartability(e.target.checked)}
              />
            }
            label="Включить стартуемость"
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Button
            onClick={handleRefresh}
            startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            disabled={loading}
            variant="outlined"
          >
            Обновить данные
          </Button>
        </Grid>
      </Grid>
    </Box>
  );

  const renderScenarioInfo = () => {
    if (!currentScenario) return null;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon />
            Сценарий: {currentScenario.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {currentScenario.description}
          </Typography>
          <Typography variant="body2">
            <strong>Ожидаемое поведение:</strong> {currentScenario.expectedBehavior}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  const renderNotifications = () => {
    if (notifications.length === 0) return null;

    return (
      <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 1300, width: 350 }}>
        {notifications.map(notification => (
          <Alert 
            key={notification.id}
            severity={notification.severity}
            sx={{ mb: 1 }}
          >
            {notification.message}
          </Alert>
        ))}
      </Box>
    );
  };

  const renderGlobalActions = () => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <BuildIcon />
          Глобальные действия (CTA Blocking)
        </Typography>
        
        <StartabilityGlobalActions
          startabilityReport={currentReport}
          onSendEstimate={handleSendEstimate}
          onConvertToContract={handleConvertToContract}
          showBlockingDetails={true}
          variant="contained"
          size="medium"
        />
      </CardContent>
    </Card>
  );

  const renderMasterGrid = () => (
    <Card>
      <CardContent>
        <StartabilityMasterGrid
          projectId="test-project"
          estimateId="test-estimate"
          items={mockEstimateItems}
          onItemSelect={handleItemSelect}
          selectedItemId={selectedItemId || undefined}
          enableStartability={enableStartability}
          onStartabilityChange={() => {}} // Controlled by test scenarios
          showAssignee={true}
          showStatus={true}
          showTotals={true}
          loading={loading}
        />
      </CardContent>
    </Card>
  );

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {renderHeader()}
      {renderScenarioInfo()}
      {renderGlobalActions()}
      
      <Divider sx={{ my: 3 }} />
      
      {renderMasterGrid()}
      
      {/* Detail Sidebar */}
      <StartabilityDetailSidebar
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        selectedItemId={selectedItemId}
        startabilityReport={currentReport}
        itemDetails={selectedItemDetails}
        onRefresh={handleRefresh}
        onResolutionExecuted={handleResolutionExecuted}
        loading={loading}
      />

      {/* Floating Notifications */}
      {renderNotifications()}
      
      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <Card sx={{ mt: 3, backgroundColor: 'grey.50' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              🐛 Debug Info
            </Typography>
            <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
              {JSON.stringify({
                selectedScenario,
                selectedItemId,
                sidebarOpen,
                enableStartability,
                reportItemsCount: Object.keys(currentReport?.itemsStartability || {}).length,
                currentReportProjectStartable: currentReport?.isProjectStartable
              }, null, 2)}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default StartabilityV2TestPage;
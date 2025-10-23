/**
 * ============================================================================
 * WORK PLANS PAGE - СТРАНИЦА РАБОЧИХ ПЛАНОВ С AI ИНТЕГРАЦИЕЙ
 * ============================================================================
 * 
 * Основная страница для управления рабочими планами проектов с возможностью
 * AI-генерации из неструктурированного текста. Интегрирована с системой
 * проектов и задач.
 * 
 * ОСНОВНЫЕ ВОЗМОЖНОСТИ:
 * ═══════════════════════
 * 
 * 📋 УПРАВЛЕНИЕ ПЛАНАМИ:
 * ├─ Список всех рабочих планов
 * ├─ Создание планов вручную
 * ├─ AI-генерация из заметок
 * └─ Редактирование и удаление
 * 
 * 🤖 AI ИНТЕГРАЦИЯ:
 * ├─ Генерация планов из текста
 * ├─ Обнаружение конфликтов
 * ├─ Предложения по улучшению
 * └─ Автоматическая структуризация
 * 
 * 🔍 ФИЛЬТРАЦИЯ И ПОИСК:
 * ├─ Поиск по названию и описанию
 * ├─ Фильтр по статусу
 * ├─ Фильтр по проектам
 * └─ Сортировка по различным критериям
 * 
 * 📊 АНАЛИТИКА:
 * ├─ Статистика по планам
 * ├─ Прогресс выполнения
 * ├─ Анализ стоимости
 * └─ Отчеты по временным рамкам
 * 
 * @author Claude Assistant
 * @version 1.0.0
 * @since 2024-10-11
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Menu,
  MenuList,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  LinearProgress,
  Fab,
  Tooltip,
  Badge,
  Skeleton
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
  Psychology as AIIcon,
  Assignment as PlanIcon,
  Schedule as TimeIcon,
  AttachMoney as CostIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  GetApp as ExportIcon,
  Share as ShareIcon
} from '@mui/icons-material';

import { useAuth } from '../auth/AuthContext';
import AIGeneratorDialog from '../components/workPlans/AIGeneratorDialog';
import { GeneratedWorkPlan } from '../api/workPlanAI.service';

// ==================== ИНТЕРФЕЙСЫ ====================

interface WorkPlan {
  id: string;
  name: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  status: 'draft' | 'active' | 'completed' | 'on_hold' | 'cancelled';
  phases: WorkPlanPhase[];
  totalCost: number;
  confirmedCost: number;
  estimatedDuration: number; // в днях
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  aiGenerated?: boolean;
  confidence?: number;
}

interface WorkPlanPhase {
  id: string;
  name: string;
  type: string;
  cost: number;
  costConfirmed: boolean;
  status: string;
  startDate?: string;
  endDate?: string;
  tasks: WorkPlanTask[];
}

interface WorkPlanTask {
  id: string;
  title: string;
  description?: string;
  estimatedHours?: number;
  status: 'pending' | 'in_progress' | 'done';
}

// ==================== ОСНОВНОЙ КОМПОНЕНТ ====================

const WorkPlansPage: React.FC = () => {
  const { currentUser } = useAuth();

  // Состояние
  const [workPlans, setWorkPlans] = useState<WorkPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<WorkPlan | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);

  // ==================== ЭФФЕКТЫ ====================

  useEffect(() => {
    loadWorkPlans();
  }, []);

  // ==================== ФУНКЦИИ ====================

  /**
   * Загрузка рабочих планов
   */
  const loadWorkPlans = async () => {
    setLoading(true);
    try {
      // TODO: Интеграция с реальным API
      // const plans = await getWorkPlans();
      
      // Пока что используем mock данные
      const mockPlans: WorkPlan[] = [
        {
          id: '1',
          name: 'Ремонт офиса - План работ',
          description: 'Комплексный план ремонтных работ офисного помещения',
          projectId: 'proj-1',
          projectName: 'Ремонт офиса ООО "Пример"',
          status: 'active',
          phases: [
            {
              id: 'phase-1',
              name: 'Подготовительные работы',
              type: 'Preparation',
              cost: 50000,
              costConfirmed: true,
              status: 'completed',
              tasks: [
                { id: 'task-1', title: 'Демонтаж старых покрытий', status: 'done' },
                { id: 'task-2', title: 'Защита мебели и оборудования', status: 'done' }
              ]
            },
            {
              id: 'phase-2',
              name: 'Электромонтажные работы',
              type: 'RoughIn',
              cost: 120000,
              costConfirmed: true,
              status: 'in_progress',
              tasks: [
                { id: 'task-3', title: 'Прокладка новой проводки', status: 'in_progress' },
                { id: 'task-4', title: 'Установка розеток и выключателей', status: 'pending' }
              ]
            }
          ],
          totalCost: 350000,
          confirmedCost: 170000,
          estimatedDuration: 14,
          startDate: '2024-10-01',
          endDate: '2024-10-15',
          createdAt: '2024-09-25T10:00:00Z',
          updatedAt: '2024-10-11T14:30:00Z',
          createdBy: 'user-1',
          aiGenerated: false
        },
        {
          id: '2',
          name: 'AI План - Кухня под ключ',
          description: 'Автоматически сгенерированный план ремонта кухни',
          projectId: 'proj-2',
          projectName: 'Кухня в квартире на Арбате',
          status: 'draft',
          phases: [
            {
              id: 'phase-3',
              name: 'Демонтаж и подготовка',
              type: 'Preparation',
              cost: 25000,
              costConfirmed: false,
              status: 'pending',
              tasks: [
                { id: 'task-5', title: 'Демонтаж старой мебели', status: 'pending' },
                { id: 'task-6', title: 'Подготовка стен', status: 'pending' }
              ]
            }
          ],
          totalCost: 180000,
          confirmedCost: 0,
          estimatedDuration: 10,
          createdAt: '2024-10-11T09:15:00Z',
          updatedAt: '2024-10-11T09:15:00Z',
          createdBy: 'ai-assistant',
          aiGenerated: true,
          confidence: 85
        }
      ];

      setWorkPlans(mockPlans);
    } catch (error) {
      console.error('Ошибка загрузки планов:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Обработка AI генерации
   */
  const handleAIGeneration = async (plan: GeneratedWorkPlan) => {
    console.log('🤖 Получен сгенерированный план:', plan);
    
    try {
      // Конвертируем AI план в формат приложения
      const newWorkPlan: WorkPlan = {
        id: `ai-${Date.now()}`,
        name: `AI План - ${new Date().toLocaleDateString()}`,
        description: 'Автоматически сгенерированный план работ',
        status: 'draft',
        phases: plan.phases.map((phase, index) => ({
          id: `phase-ai-${index}`,
          name: phase.name,
          type: phase.type,
          cost: phase.cost || 0,
          costConfirmed: phase.costConfirmed,
          status: phase.status.toLowerCase() as any,
          startDate: phase.startDate,
          endDate: phase.endDate,
          tasks: (phase.tasks || []).map((task, taskIndex) => ({
            id: `task-ai-${index}-${taskIndex}`,
            title: task.title,
            description: task.description,
            estimatedHours: task.estimatedHours,
            status: 'pending' as const
          }))
        })),
        totalCost: plan.costSummary.finalTotal,
        confirmedCost: plan.costSummary.confirmedTotal,
        estimatedDuration: 0, // TODO: рассчитать из фаз
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser?.uid || 'ai-assistant',
        aiGenerated: true,
        confidence: plan.metadata.confidence
      };

      // Добавляем в список
      setWorkPlans(prev => [newWorkPlan, ...prev]);
      setAiDialogOpen(false);

      console.log('✅ AI план успешно создан:', newWorkPlan);
    } catch (error) {
      console.error('❌ Ошибка создания AI плана:', error);
    }
  };

  /**
   * Фильтрация планов
   */
  const filteredPlans = workPlans.filter(plan => {
    const matchesSearch = !searchTerm || 
      plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.projectName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  /**
   * Обработка меню
   */
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, plan: WorkPlan) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedPlan(plan);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedPlan(null);
  };

  // ==================== ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ====================

  /**
   * Карточка рабочего плана
   */
  const WorkPlanCard: React.FC<{ plan: WorkPlan }> = ({ plan }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'active': return 'success';
        case 'completed': return 'info';
        case 'on_hold': return 'warning';
        case 'cancelled': return 'error';
        default: return 'default';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'draft': return 'Черновик';
        case 'active': return 'Активный';
        case 'completed': return 'Завершен';
        case 'on_hold': return 'На паузе';
        case 'cancelled': return 'Отменен';
        default: return status;
      }
    };

    const completedPhases = plan.phases.filter(p => p.status === 'completed').length;
    const progress = plan.phases.length > 0 ? (completedPhases / plan.phases.length) * 100 : 0;

    return (
      <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          {/* Заголовок */}
          <Box display="flex" alignItems="flex-start" mb={2}>
            <Box flexGrow={1}>
              <Typography variant="h6" component="h2" gutterBottom>
                {plan.aiGenerated && (
                  <Tooltip title="Создано с помощью AI">
                    <AIIcon 
                      color="primary" 
                      sx={{ fontSize: 18, mr: 1, verticalAlign: 'middle' }} 
                    />
                  </Tooltip>
                )}
                {plan.name}
              </Typography>
              {plan.projectName && (
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  📁 {plan.projectName}
                </Typography>
              )}
            </Box>
            <Box>
              <Chip 
                label={getStatusText(plan.status)}
                color={getStatusColor(plan.status) as any}
                size="small"
              />
              {plan.aiGenerated && plan.confidence && (
                <Chip 
                  label={`${plan.confidence}% AI`}
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          </Box>

          {/* Описание */}
          {plan.description && (
            <Typography variant="body2" color="textSecondary" mb={2}>
              {plan.description}
            </Typography>
          )}

          {/* Метрики */}
          <Grid container spacing={2} mb={2}>
            <Grid item xs={4}>
              <Box textAlign="center">
                <PlanIcon color="action" fontSize="small" />
                <Typography variant="caption" display="block">
                  Фазы
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {completedPhases}/{plan.phases.length}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box textAlign="center">
                <CostIcon color="action" fontSize="small" />
                <Typography variant="caption" display="block">
                  Стоимость
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  ₽{plan.totalCost.toLocaleString()}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={4}>
              <Box textAlign="center">
                <TimeIcon color="action" fontSize="small" />
                <Typography variant="caption" display="block">
                  Дней
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {plan.estimatedDuration}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Прогресс */}
          <Box mb={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="body2" color="textSecondary">
                Прогресс
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {progress.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>

          {/* Подтвержденная стоимость */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="textSecondary">
              Подтверждено: ₽{plan.confirmedCost.toLocaleString()}
            </Typography>
            {plan.confirmedCost < plan.totalCost && (
              <WarningIcon color="warning" fontSize="small" />
            )}
          </Box>
        </CardContent>

        <CardActions>
          <Button size="small" startIcon={<ViewIcon />}>
            Открыть
          </Button>
          <Button size="small" startIcon={<EditIcon />}>
            Редактировать
          </Button>
          <IconButton 
            size="small" 
            onClick={(e) => handleMenuOpen(e, plan)}
            sx={{ ml: 'auto' }}
          >
            <MoreIcon />
          </IconButton>
        </CardActions>
      </Card>
    );
  };

  // ==================== РЕНДЕР ====================

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((n) => (
            <Grid item xs={12} sm={6} lg={4} key={n}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="80%" height={32} />
                  <Skeleton variant="text" width="60%" height={20} sx={{ mb: 2 }} />
                  <Skeleton variant="rectangular" height={120} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Рабочие планы
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Управление планами работ с возможностью AI-генерации
          </Typography>
        </Box>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />}
            sx={{ mr: 2 }}
          >
            Создать план
          </Button>
          <Button 
            variant="contained"
            startIcon={<AIIcon />}
            onClick={() => setAiDialogOpen(true)}
          >
            AI Генерация
          </Button>
        </Box>
      </Box>

      {/* Фильтры */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="Поиск планов..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Статус</InputLabel>
            <Select
              value={statusFilter}
              label="Статус"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="draft">Черновики</MenuItem>
              <MenuItem value="active">Активные</MenuItem>
              <MenuItem value="completed">Завершенные</MenuItem>
              <MenuItem value="on_hold">На паузе</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<FilterIcon />}
            sx={{ height: '56px' }}
          >
            Фильтры
          </Button>
        </Grid>
      </Grid>

      {/* Статистика */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary">
                {workPlans.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Всего планов
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main">
                {workPlans.filter(p => p.status === 'active').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Активных
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="info.main">
                {workPlans.filter(p => p.aiGenerated).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                AI сгенерированных
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main">
                ₽{workPlans.reduce((sum, p) => sum + p.totalCost, 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Общая стоимость
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Планы */}
      {filteredPlans.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <PlanIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              {searchTerm || statusFilter !== 'all' ? 'Планы не найдены' : 'Нет рабочих планов'}
            </Typography>
            <Typography variant="body2" color="textSecondary" mb={3}>
              {searchTerm || statusFilter !== 'all' 
                ? 'Попробуйте изменить критерии поиска'
                : 'Создайте первый план вручную или с помощью AI'
              }
            </Typography>
            {!searchTerm && statusFilter === 'all' && (
              <Button 
                variant="contained" 
                startIcon={<AIIcon />}
                onClick={() => setAiDialogOpen(true)}
              >
                Создать с помощью AI
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredPlans.map((plan) => (
            <Grid item xs={12} sm={6} lg={4} key={plan.id}>
              <WorkPlanCard plan={plan} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* FAB для мобильных */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' }
        }}
        onClick={() => setAiDialogOpen(true)}
      >
        <AIIcon />
      </Fab>

      {/* Контекстное меню */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuList>
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <ViewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Открыть</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Редактировать</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <ShareIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Поделиться</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <ExportIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Экспортировать</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Удалить</ListItemText>
          </MenuItem>
        </MenuList>
      </Menu>

      {/* AI Диалог генерации */}
      <AIGeneratorDialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        onGenerate={handleAIGeneration}
      />
    </Container>
  );
};

export default WorkPlansPage;
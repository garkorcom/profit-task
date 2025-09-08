/**
 * Компонент "Управление целями" для модуля "Траектория"
 * Постановка и отслеживание целей профессионального развития
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  useTheme,
  alpha,
  Fab
} from '@mui/material';

import {
  Assignment as GoalsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Flag as FlagIcon,
  ExpandMore,
  Star as StarIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  CheckBox as CheckBoxIcon,
  AccessTime as AccessTimeIcon,
  Psychology as PsychologyIcon,
  WorkOutline as WorkOutlineIcon,
  School as SchoolIcon,
  Favorite as FavoriteIcon
} from '@mui/icons-material';

import { useAuth } from '../../../../auth/AuthContext';
import { GrowthGoal, GrowthGoalStatus, GrowthGoalCategory } from '../../types';

// Конфигурация категорий целей
const GOAL_CATEGORIES = [
  {
    id: 'professional' as GrowthGoalCategory,
    label: 'Профессиональные',
    icon: <WorkOutlineIcon />,
    color: '#2196f3',
    description: 'Карьерный рост и профессиональные навыки'
  },
  {
    id: 'learning' as GrowthGoalCategory,
    label: 'Обучение',
    icon: <SchoolIcon />,
    color: '#9c27b0',
    description: 'Изучение новых технологий и знаний'
  },
  {
    id: 'personal' as GrowthGoalCategory,
    label: 'Личностные',
    icon: <PsychologyIcon />,
    color: '#ff9800',
    description: 'Личностный рост и развитие'
  },
  {
    id: 'health' as GrowthGoalCategory,
    label: 'Здоровье',
    icon: <FavoriteIcon />,
    color: '#4caf50',
    description: 'Физическое и ментальное здоровье'
  }
];

const STATUS_CONFIG: Record<GrowthGoalStatus, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'; icon: React.ReactNode }> = {
  'draft': { label: 'Черновик', color: 'default', icon: <EditIcon /> },
  'active': { label: 'Активна', color: 'primary', icon: <PlayArrowIcon /> },
  'paused': { label: 'Пауза', color: 'warning', icon: <PauseIcon /> },
  'completed': { label: 'Завершена', color: 'success', icon: <CheckCircleIcon /> },
  'cancelled': { label: 'Отменена', color: 'error', icon: <CancelIcon /> }
};

interface GoalFormData {
  title: string;
  description: string;
  category: GrowthGoalCategory;
  targetDate: string;
  milestones: string[];
  priority: 'low' | 'medium' | 'high';
  estimatedHours?: number;
}

const initialFormData: GoalFormData = {
  title: '',
  description: '',
  category: 'professional',
  targetDate: '',
  milestones: [],
  priority: 'medium'
};

export const GoalsManager: React.FC = () => {
  const { currentUser } = useAuth();
  const theme = useTheme();

  // Состояние компонента
  const [goals, setGoals] = useState<GrowthGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<GrowthGoalCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<GrowthGoalStatus | 'all'>('active');
  
  // Диалог создания/редактирования цели
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GrowthGoal | null>(null);
  const [formData, setFormData] = useState<GoalFormData>(initialFormData);
  const [newMilestone, setNewMilestone] = useState('');

  // Загрузка целей
  const loadGoals = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // Mock данные для демонстрации
      const mockGoals: GrowthGoal[] = [
        {
          id: 'goal-1',
          userId: currentUser.uid,
          title: 'Изучить TypeScript продвинутого уровня',
          description: 'Углубить знания в типизации, дженериках и архитектурных паттернах',
          category: 'learning',
          status: 'active',
          priority: 'high',
          targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          milestones: [
            'Пройти курс по типизации',
            'Изучить utility types',
            'Применить в реальном проекте'
          ],
          completedMilestones: ['Пройти курс по типизации'],
          estimatedHours: 40,
          spentHours: 12,
          createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now() - 24 * 60 * 60 * 1000
        },
        {
          id: 'goal-2',
          userId: currentUser.uid,
          title: 'Улучшить навыки публичных выступлений',
          description: 'Развить уверенность в презентациях и общении с командой',
          category: 'personal',
          status: 'active',
          priority: 'medium',
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          milestones: [
            'Прочитать книгу по ораторскому искусству',
            'Записать тренировочное видео',
            'Провести презентацию для команды'
          ],
          completedMilestones: [],
          estimatedHours: 20,
          spentHours: 0,
          createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000
        },
        {
          id: 'goal-3',
          userId: currentUser.uid,
          title: 'Запустить side-проект',
          description: 'Создать и развернуть небольшое веб-приложение',
          category: 'professional',
          status: 'completed',
          priority: 'medium',
          targetDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          milestones: [
            'Придумать идею проекта',
            'Создать MVP',
            'Развернуть на хостинге'
          ],
          completedMilestones: [
            'Придумать идею проекта',
            'Создать MVP',
            'Развернуть на хостинге'
          ],
          estimatedHours: 60,
          spentHours: 65,
          createdAt: Date.now() - 120 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now() - 10 * 24 * 60 * 60 * 1000
        }
      ];

      setGoals(mockGoals);
    } catch (error) {
      console.error('Ошибка загрузки целей:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, [currentUser]);

  // Фильтрация целей
  const filteredGoals = goals.filter(goal => {
    const categoryMatch = selectedCategory === 'all' || goal.category === selectedCategory;
    const statusMatch = selectedStatus === 'all' || goal.status === selectedStatus;
    return categoryMatch && statusMatch;
  });

  // Расчет прогресса цели
  const calculateProgress = (goal: GrowthGoal): number => {
    if (!goal.milestones || goal.milestones.length === 0) return 0;
    return (goal.completedMilestones.length / goal.milestones.length) * 100;
  };

  // Получение цвета приоритета
  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return theme.palette.error.main;
      case 'medium': return theme.palette.warning.main;
      case 'low': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  // Обработчики диалога
  const handleOpenDialog = (goal?: GrowthGoal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        title: goal.title,
        description: goal.description,
        category: goal.category,
        targetDate: goal.targetDate.split('T')[0],
        milestones: goal.milestones || [],
        priority: goal.priority,
        estimatedHours: goal.estimatedHours
      });
    } else {
      setEditingGoal(null);
      setFormData(initialFormData);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingGoal(null);
    setFormData(initialFormData);
    setNewMilestone('');
  };

  const handleAddMilestone = () => {
    if (!newMilestone.trim()) return;
    setFormData({
      ...formData,
      milestones: [...formData.milestones, newMilestone.trim()]
    });
    setNewMilestone('');
  };

  const handleRemoveMilestone = (index: number) => {
    const updatedMilestones = formData.milestones.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      milestones: updatedMilestones
    });
  };

  const handleSaveGoal = async () => {
    try {
      const goalData: Partial<GrowthGoal> = {
        ...formData,
        targetDate: new Date(formData.targetDate).toISOString(),
        updatedAt: Date.now()
      };

      if (editingGoal) {
        // Обновление существующей цели
        const updatedGoals = goals.map(goal =>
          goal.id === editingGoal.id
            ? { ...goal, ...goalData }
            : goal
        );
        setGoals(updatedGoals);
      } else {
        // Создание новой цели
        const newGoal: GrowthGoal = {
          id: `goal-${Date.now()}`,
          userId: currentUser!.uid,
          status: 'active',
          completedMilestones: [],
          spentHours: 0,
          createdAt: Date.now(),
          ...goalData
        } as GrowthGoal;
        
        setGoals([newGoal, ...goals]);
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Ошибка сохранения цели:', error);
    }
  };

  const handleUpdateGoalStatus = async (goalId: string, status: GrowthGoalStatus) => {
    const updatedGoals = goals.map(goal =>
      goal.id === goalId
        ? { 
            ...goal, 
            status,
            updatedAt: Date.now(),
            ...(status === 'completed' ? { completedMilestones: goal.milestones } : {})
          }
        : goal
    );
    setGoals(updatedGoals);
  };

  const handleToggleMilestone = (goalId: string, milestone: string) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const isCompleted = goal.completedMilestones.includes(milestone);
        const completedMilestones = isCompleted
          ? goal.completedMilestones.filter(m => m !== milestone)
          : [...goal.completedMilestones, milestone];
        
        return {
          ...goal,
          completedMilestones,
          updatedAt: Date.now()
        };
      }
      return goal;
    });
    setGoals(updatedGoals);
  };

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Для управления целями необходима авторизация
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок и фильтры */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
            <GoalsIcon sx={{ mr: 1 }} />
            Цели развития
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {filteredGoals.length} {filteredGoals.length === 1 ? 'цель' : 'целей'}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Новая цель
        </Button>
      </Stack>

      {/* Фильтры */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Категория</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              label="Категория"
            >
              <MenuItem value="all">Все категории</MenuItem>
              {GOAL_CATEGORIES.map(category => (
                <MenuItem key={category.id} value={category.id}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {category.icon}
                    <span>{category.label}</span>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>Статус</InputLabel>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              label="Статус"
            >
              <MenuItem value="all">Все статусы</MenuItem>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <MenuItem key={status} value={status}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {config.icon}
                    <span>{config.label}</span>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Статистика */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary.main">
                {goals.filter(g => g.status === 'active').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Активных целей
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main">
                {goals.filter(g => g.status === 'completed').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Завершенных
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="info.main">
                {Math.round(goals.reduce((sum, g) => sum + calculateProgress(g), 0) / goals.length) || 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Средний прогресс
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="warning.main">
                {goals.reduce((sum, g) => sum + (g.spentHours || 0), 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Часов потрачено
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Список целей */}
      <Grid container spacing={3}>
        {loading ? (
          <Grid item xs={12}>
            <Box display="flex" justifyContent="center" p={4}>
              <Typography>Загрузка целей...</Typography>
            </Box>
          </Grid>
        ) : filteredGoals.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <GoalsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Целей не найдено
              </Typography>
              <Typography color="text.secondary">
                {selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? 'Попробуйте изменить фильтры или создайте новую цель'
                  : 'Создайте свою первую цель развития'
                }
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                sx={{ mt: 2 }}
              >
                Создать цель
              </Button>
            </Paper>
          </Grid>
        ) : (
          filteredGoals.map(goal => {
            const category = GOAL_CATEGORIES.find(c => c.id === goal.category);
            const status = STATUS_CONFIG[goal.status];
            const progress = calculateProgress(goal);
            const isOverdue = new Date(goal.targetDate) < new Date() && goal.status !== 'completed';

            return (
              <Grid item xs={12} lg={6} key={goal.id}>
                <Card
                  elevation={2}
                  sx={{
                    height: '100%',
                    border: goal.priority === 'high' ? `2px solid ${getPriorityColor('high')}` : 'none'
                  }}
                >
                  <CardContent>
                    {/* Заголовок и статус */}
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <Box sx={{ flex: 1, mr: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          {goal.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {goal.description}
                        </Typography>
                      </Box>
                      
                      <Stack alignItems="flex-end" spacing={1}>
                        <Chip
                          {...status}
                          size="small"
                          icon={status.icon}
                        />
                        {goal.priority === 'high' && (
                          <Chip
                            label="Высокий приоритет"
                            size="small"
                            sx={{ backgroundColor: alpha(getPriorityColor('high'), 0.1) }}
                          />
                        )}
                        {isOverdue && (
                          <Chip
                            label="Просрочено"
                            size="small"
                            color="error"
                            icon={<AccessTimeIcon />}
                          />
                        )}
                      </Stack>
                    </Stack>

                    {/* Категория и дата */}
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        {category?.icon}
                        <Typography variant="body2" color="text.secondary">
                          {category?.label}
                        </Typography>
                      </Stack>
                      
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <ScheduleIcon fontSize="small" />
                        <Typography variant="body2" color="text.secondary">
                          до {new Date(goal.targetDate).toLocaleDateString('ru-RU')}
                        </Typography>
                      </Stack>
                    </Stack>

                    {/* Прогресс */}
                    <Box sx={{ mb: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          Прогресс: {goal.completedMilestones.length} / {goal.milestones?.length || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {Math.round(progress)}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: alpha(category?.color || theme.palette.primary.main, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            backgroundColor: category?.color || theme.palette.primary.main
                          }
                        }}
                      />
                    </Box>

                    {/* Этапы */}
                    <Accordion elevation={0} sx={{ '&:before': { display: 'none' } }}>
                      <AccordionSummary
                        expandIcon={<ExpandMore />}
                        sx={{ p: 0, minHeight: 'auto', '& .MuiAccordionSummary-content': { margin: '8px 0' } }}
                      >
                        <Typography variant="body2">
                          Этапы ({goal.completedMilestones.length}/{goal.milestones?.length || 0})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0, pt: 1 }}>
                        <Stack spacing={1}>
                          {goal.milestones?.map((milestone, index) => {
                            const isCompleted = goal.completedMilestones.includes(milestone);
                            return (
                              <Stack
                                key={index}
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                onClick={() => handleToggleMilestone(goal.id, milestone)}
                                sx={{
                                  cursor: goal.status === 'active' ? 'pointer' : 'default',
                                  p: 1,
                                  borderRadius: 1,
                                  '&:hover': goal.status === 'active' ? { backgroundColor: 'action.hover' } : {}
                                }}
                              >
                                <IconButton
                                  size="small"
                                  disabled={goal.status !== 'active'}
                                  sx={{ p: 0 }}
                                >
                                  {isCompleted ? (
                                    <CheckBoxIcon color="success" fontSize="small" />
                                  ) : (
                                    <CheckBoxIcon color="disabled" fontSize="small" />
                                  )}
                                </IconButton>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    textDecoration: isCompleted ? 'line-through' : 'none',
                                    color: isCompleted ? 'text.secondary' : 'text.primary'
                                  }}
                                >
                                  {milestone}
                                </Typography>
                              </Stack>
                            );
                          })}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>

                    {/* Время */}
                    {(goal.estimatedHours || goal.spentHours) && (
                      <Box sx={{ mt: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Время: {goal.spentHours || 0}
                            {goal.estimatedHours ? ` / ${goal.estimatedHours}` : ''} ч
                          </Typography>
                          {goal.estimatedHours && (
                            <Typography variant="body2" color="text.secondary">
                              {Math.round(((goal.spentHours || 0) / goal.estimatedHours) * 100)}%
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    )}
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Stack direction="row" spacing={1}>
                      {goal.status === 'active' && (
                        <>
                          <Button
                            size="small"
                            startIcon={<PauseIcon />}
                            onClick={() => handleUpdateGoalStatus(goal.id, 'paused')}
                          >
                            Пауза
                          </Button>
                          <Button
                            size="small"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleUpdateGoalStatus(goal.id, 'completed')}
                            disabled={progress < 100}
                          >
                            Завершить
                          </Button>
                        </>
                      )}
                      
                      {goal.status === 'paused' && (
                        <Button
                          size="small"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => handleUpdateGoalStatus(goal.id, 'active')}
                        >
                          Продолжить
                        </Button>
                      )}
                    </Stack>

                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(goal)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* FAB для быстрого создания */}
      <Fab
        color="secondary"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 160, // Справа от других FAB
          zIndex: 1000
        }}
        onClick={() => handleOpenDialog()}
      >
        <FlagIcon />
      </Fab>

      {/* Диалог создания/редактирования цели */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          {editingGoal ? 'Редактировать цель' : 'Создать новую цель'}
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Название */}
            <TextField
              fullWidth
              label="Название цели"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Например: Изучить React 18"
            />

            {/* Описание */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Описание"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Подробно опишите цель и ожидаемый результат"
            />

            <Grid container spacing={2}>
              {/* Категория */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Категория</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as GrowthGoalCategory })}
                    label="Категория"
                  >
                    {GOAL_CATEGORIES.map(category => (
                      <MenuItem key={category.id} value={category.id}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {category.icon}
                          <span>{category.label}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Приоритет */}
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Приоритет</InputLabel>
                  <Select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    label="Приоритет"
                  >
                    <MenuItem value="low">Низкий</MenuItem>
                    <MenuItem value="medium">Средний</MenuItem>
                    <MenuItem value="high">Высокий</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Дата завершения */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Целевая дата"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            {/* Оценка времени */}
            <TextField
              fullWidth
              type="number"
              label="Оценка времени (часы)"
              value={formData.estimatedHours || ''}
              onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) || undefined })}
              placeholder="Сколько часов потребуется?"
            />

            {/* Этапы */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Этапы достижения цели
              </Typography>
              
              {/* Список этапов */}
              <Stack spacing={1} sx={{ mb: 2 }}>
                {formData.milestones.map((milestone, index) => (
                  <Stack key={index} direction="row" alignItems="center" spacing={1}>
                    <CheckBoxIcon color="disabled" />
                    <Typography sx={{ flex: 1 }}>
                      {milestone}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveMilestone(index)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>

              {/* Добавление нового этапа */}
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Добавить этап..."
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddMilestone();
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddMilestone}
                  disabled={!newMilestone.trim()}
                >
                  Добавить
                </Button>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveGoal}
            disabled={!formData.title.trim() || !formData.targetDate}
          >
            {editingGoal ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
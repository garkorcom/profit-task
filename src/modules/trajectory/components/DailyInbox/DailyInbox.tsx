/**
 * Компонент "Ежедневный обзор" для модуля "Траектория"
 * Рефлексия и отметки за день
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  Alert,
  LinearProgress,
  useTheme,
  alpha,
  Fab
} from '@mui/material';

import {
  Inbox as InboxIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  ExpandLess,
  ExpandMore,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  Warning as WarningIcon,
  Psychology as PsychologyIcon,
  Assignment as AssignmentIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';

import { useAuth } from '../../../../auth/AuthContext';
import { EmotionCheckIn } from '../EmotionCheckIn';

// Типы для ежедневной рефлексии
interface DailyReflection {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  gratitude: string[];
  achievements: string[];
  challenges: string[];
  learnings: string[];
  tomorrowGoals: string[];
  moodSummary: string;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  productivityLevel: 1 | 2 | 3 | 4 | 5;
  isCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ReflectionSection {
  id: keyof Pick<DailyReflection, 'gratitude' | 'achievements' | 'challenges' | 'learnings' | 'tomorrowGoals'>;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  color: string;
  description: string;
}

// Конфигурация секций рефлексии
const REFLECTION_SECTIONS: ReflectionSection[] = [
  {
    id: 'gratitude',
    label: 'Благодарность',
    icon: <StarIcon />,
    placeholder: 'За что я благодарен сегодня?',
    color: '#ffd700',
    description: 'Что хорошего произошло сегодня'
  },
  {
    id: 'achievements',
    label: 'Достижения',
    icon: <CheckCircleIcon />,
    placeholder: 'Что я сегодня сделал хорошо?',
    color: '#4caf50',
    description: 'Успехи и выполненные задачи'
  },
  {
    id: 'challenges',
    label: 'Вызовы',
    icon: <WarningIcon />,
    placeholder: 'С какими трудностями я столкнулся?',
    color: '#ff9800',
    description: 'Проблемы и препятствия'
  },
  {
    id: 'learnings',
    label: 'Уроки',
    icon: <LightbulbIcon />,
    placeholder: 'Чему я сегодня научился?',
    color: '#2196f3',
    description: 'Новые знания и инсайты'
  },
  {
    id: 'tomorrowGoals',
    label: 'Планы на завтра',
    icon: <AssignmentIcon />,
    placeholder: 'Что важного сделать завтра?',
    color: '#9c27b0',
    description: 'Приоритеты на следующий день'
  }
];

export const DailyInbox: React.FC = () => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  
  // Состояние компонента
  const [loading, setLoading] = useState(false);
  const [currentReflection, setCurrentReflection] = useState<DailyReflection | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['gratitude']));
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [showEmotionCheckIn, setShowEmotionCheckIn] = useState(false);

  // Получение текущей даты
  const today = new Date().toISOString().split('T')[0];

  // Загрузка дневной рефлексии
  const loadDailyReflection = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Здесь будет реальная загрузка из Firebase
      // Пока используем mock данные
      const mockReflection: DailyReflection = {
        id: `reflection-${today}`,
        userId: currentUser.uid,
        date: today,
        gratitude: ['Хорошая погода', 'Поддержка коллег'],
        achievements: ['Завершил модуль Траектория', 'Изучил новую библиотеку'],
        challenges: ['Сложная задача с TypeScript'],
        learnings: ['Лучше планировать время'],
        tomorrowGoals: ['Протестировать новый модуль'],
        moodSummary: 'Продуктивный день с небольшими вызовами',
        energyLevel: 4,
        stressLevel: 2,
        productivityLevel: 4,
        isCompleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      setCurrentReflection(mockReflection);
    } catch (error) {
      console.error('Ошибка загрузки рефлексии:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyReflection();
  }, [currentUser]);

  // Обработчики событий
  const handleSectionToggle = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleAddItem = (sectionId: keyof DailyReflection) => {
    if (!currentReflection || !newItemText.trim()) return;

    const updatedReflection = {
      ...currentReflection,
      [sectionId]: [...(currentReflection[sectionId] as string[]), newItemText.trim()],
      updatedAt: Date.now()
    };

    setCurrentReflection(updatedReflection);
    setNewItemText('');
    setEditingSection(null);
  };

  const handleRemoveItem = (sectionId: keyof DailyReflection, index: number) => {
    if (!currentReflection) return;

    const updatedItems = [...(currentReflection[sectionId] as string[])];
    updatedItems.splice(index, 1);

    const updatedReflection = {
      ...currentReflection,
      [sectionId]: updatedItems,
      updatedAt: Date.now()
    };

    setCurrentReflection(updatedReflection);
  };

  const handleSaveReflection = async () => {
    if (!currentReflection) return;

    setLoading(true);
    try {
      // Здесь будет сохранение в Firebase
      const updatedReflection = {
        ...currentReflection,
        isCompleted: true,
        updatedAt: Date.now()
      };
      
      setCurrentReflection(updatedReflection);
      console.log('Рефлексия сохранена:', updatedReflection);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoodSummaryChange = (value: string) => {
    if (!currentReflection) return;

    setCurrentReflection({
      ...currentReflection,
      moodSummary: value,
      updatedAt: Date.now()
    });
  };

  // Расчет прогресса заполнения
  const calculateProgress = () => {
    if (!currentReflection) return 0;
    
    const sections = REFLECTION_SECTIONS.length;
    const filledSections = REFLECTION_SECTIONS.filter(section => 
      currentReflection[section.id].length > 0
    ).length;
    const moodFilled = currentReflection.moodSummary.length > 0 ? 1 : 0;
    
    return ((filledSections + moodFilled) / (sections + 1)) * 100;
  };

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Для ежедневной рефлексии необходима авторизация
        </Alert>
      </Box>
    );
  }

  if (loading && !currentReflection) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Загрузка дневной рефлексии...
        </Typography>
      </Box>
    );
  }

  const progress = calculateProgress();

  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
            <InboxIcon sx={{ mr: 1 }} />
            Ежедневный обзор
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {new Date().toLocaleDateString('ru-RU', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          onClick={() => setShowEmotionCheckIn(true)}
          startIcon={<PsychologyIcon />}
        >
          Отметить эмоции
        </Button>
      </Stack>

      {/* Прогресс заполнения */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Прогресс заполнения: {Math.round(progress)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                }
              }}
            />
          </Box>
          
          {currentReflection?.isCompleted ? (
            <Chip
              label="Завершено"
              color="success"
              icon={<CheckCircleIcon />}
            />
          ) : (
            <Button
              variant="contained"
              onClick={handleSaveReflection}
              disabled={progress < 50 || loading}
              startIcon={<SaveIcon />}
            >
              Завершить день
            </Button>
          )}
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* Секции рефлексии */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={2}>
            {REFLECTION_SECTIONS.map((section) => (
              <Card key={section.id} elevation={2}>
                <ListItemButton
                  onClick={() => handleSectionToggle(section.id)}
                  sx={{ p: 2 }}
                >
                  <ListItemIcon sx={{ color: section.color }}>
                    {section.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={section.label}
                    secondary={section.description}
                    primaryTypographyProps={{ fontWeight: 'medium' }}
                  />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={currentReflection?.[section.id].length || 0}
                      size="small"
                      sx={{ backgroundColor: alpha(section.color, 0.1) }}
                    />
                    {expandedSections.has(section.id) ? <ExpandLess /> : <ExpandMore />}
                  </Stack>
                </ListItemButton>

                <Collapse in={expandedSections.has(section.id)}>
                  <CardContent>
                    {/* Список элементов */}
                    <List dense>
                      {currentReflection?.[section.id].map((item, index) => (
                        <ListItem
                          key={index}
                          sx={{
                            border: `1px solid ${alpha(section.color, 0.3)}`,
                            borderRadius: 1,
                            mb: 1,
                            backgroundColor: alpha(section.color, 0.05)
                          }}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleRemoveItem(section.id, index)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={item}
                            sx={{ '& .MuiListItemText-primary': { fontSize: '0.9rem' } }}
                          />
                        </ListItem>
                      ))}
                    </List>

                    {/* Добавление нового элемента */}
                    {editingSection === section.id ? (
                      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder={section.placeholder}
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddItem(section.id);
                            }
                          }}
                          autoFocus
                        />
                        <IconButton
                          onClick={() => handleAddItem(section.id)}
                          disabled={!newItemText.trim()}
                          color="primary"
                        >
                          <SaveIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => {
                            setEditingSection(null);
                            setNewItemText('');
                          }}
                        >
                          <CancelIcon />
                        </IconButton>
                      </Stack>
                    ) : (
                      <Button
                        startIcon={<AddIcon />}
                        onClick={() => setEditingSection(section.id)}
                        size="small"
                        sx={{ mt: 1 }}
                      >
                        Добавить
                      </Button>
                    )}
                  </CardContent>
                </Collapse>
              </Card>
            ))}
          </Stack>
        </Grid>

        {/* Боковая панель */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {/* Общее настроение */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Общее впечатление о дне
              </Typography>
              <TextField
                multiline
                rows={4}
                fullWidth
                placeholder="Как прошел день? Какие эмоции и мысли..."
                value={currentReflection?.moodSummary || ''}
                onChange={(e) => handleMoodSummaryChange(e.target.value)}
                variant="outlined"
              />
            </Paper>

            {/* Быстрые метрики */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Уровни дня
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Энергия: {currentReflection?.energyLevel || 0}/5
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={((currentReflection?.energyLevel || 0) / 5) * 100}
                    sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Продуктивность: {currentReflection?.productivityLevel || 0}/5
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={((currentReflection?.productivityLevel || 0) / 5) * 100}
                    sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Стресс: {currentReflection?.stressLevel || 0}/5
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={((currentReflection?.stressLevel || 0) / 5) * 100}
                    color="warning"
                    sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                  />
                </Box>
              </Stack>
            </Paper>

            {/* Инсайты */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Инсайты
              </Typography>
              <Stack spacing={1}>
                {progress > 80 && (
                  <Alert severity="success" sx={{ fontSize: '0.8rem' }}>
                    Отличная рефлексия! Такая осознанность поможет в развитии.
                  </Alert>
                )}
                
                {(currentReflection?.achievements.length || 0) > 2 && (
                  <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                    У вас много достижений сегодня - празднуйте успехи!
                  </Alert>
                )}
                
                {(currentReflection?.challenges.length || 0) > (currentReflection?.achievements.length || 0) && (
                  <Alert severity="warning" sx={{ fontSize: '0.8rem' }}>
                    Сегодня было много вызовов. Не забывайте отдыхать.
                  </Alert>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      {/* FAB для быстрого добавления */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 90, // Справа от основного FAB
          zIndex: 1000
        }}
        onClick={() => setEditingSection('gratitude')}
      >
        <AddIcon />
      </Fab>

      {/* Модальное окно отметки эмоций */}
      {showEmotionCheckIn && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            p: 2
          }}
          onClick={() => setShowEmotionCheckIn(false)}
        >
          <Box
            sx={{
              maxWidth: 400,
              width: '100%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <EmotionCheckIn
              onSuccess={() => {
                setShowEmotionCheckIn(false);
              }}
              onError={(error) => {
                console.error('Ошибка:', error);
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};
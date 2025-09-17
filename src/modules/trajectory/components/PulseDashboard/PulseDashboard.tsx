/**
 * Дашборд "Пульс" для модуля "Траектория"
 * Аналитика и инсайты настроения с визуализацией данных
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Stack,
  Alert,
  Tooltip,
  IconButton,
  ButtonGroup,
  Button,
  useTheme,
  alpha
} from '@mui/material';

import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Psychology as PsychologyIcon,
  Insights as InsightsIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';

import { useAuth } from '../../../../auth/AuthContext';
import { EmotionLogEntry, EmotionDailyStats, AnalyticsData } from '../../types';
import { EMOTION_COLORS, EMOTION_LABELS } from '../../types';

// Типы для аналитики
interface EmotionTrend {
  date: string;
  level: number;
  count: number;
  ema7: number;
  ema30: number;
}

interface ActivityStats {
  name: string;
  avgLevel: number;
  count: number;
  type: 'energyDriver' | 'toxicActivity';
}

interface TimeHeatmapData {
  hour: number;
  day: number;
  value: number;
  dayName: string;
}

const TIME_PERIODS = {
  '7d': { label: '7 дней', days: 7 },
  '30d': { label: '30 дней', days: 30 },
  '90d': { label: '90 дней', days: 90 }
} as const;

interface PulseDashboardProps {
  // Опционально можно передать готовые данные
  emotionLogs?: EmotionLogEntry[];
  dailyStats?: EmotionDailyStats[];
  analytics?: AnalyticsData | null;
}

export const PulseDashboard: React.FC<PulseDashboardProps> = ({
  emotionLogs = [],
  dailyStats = [],
  analytics = null
}) => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  
  // Состояние компонента
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<keyof typeof TIME_PERIODS>('30d');
  const [localEmotionLogs, setLocalEmotionLogs] = useState<EmotionLogEntry[]>(emotionLogs);
  const [localDailyStats, setLocalDailyStats] = useState<EmotionDailyStats[]>(dailyStats);
  const [localAnalytics, setLocalAnalytics] = useState<AnalyticsData | null>(analytics);

  // Загрузка данных аналитики
  const loadAnalyticsData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Здесь будет реальная загрузка из Firebase
      // Пока используем mock данные для демонстрации
      const mockEmotionLogs: EmotionLogEntry[] = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          id: `mock-${i}`,
          userId: currentUser.uid,
          ts: date.getTime(),
          userTz: 'Europe/Moscow',
          level: (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5,
          tags: ['work', 'productivity'],
          notes: `Mock emotion log ${i}`,
          context: {
            type: 'manual'
          },
          createdAt: date.getTime(),
          updatedAt: date.getTime()
        };
      });

      const mockDailyStats: EmotionDailyStats[] = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        return {
          id: `${currentUser.uid}_${dateStr}`,
          userId: currentUser.uid,
          date: dateStr,
          avgLevel: Math.random() * 4 + 1,
          counts: {
            1: Math.floor(Math.random() * 3),
            2: Math.floor(Math.random() * 3),
            3: Math.floor(Math.random() * 4),
            4: Math.floor(Math.random() * 3),
            5: Math.floor(Math.random() * 2)
          }
        };
      });

      const mockAnalytics: AnalyticsData = {
        emaWeekly: Math.random() * 4 + 1,
        emaMonthly: Math.random() * 4 + 1,
        levelDistribution: {
          1: 5,
          2: 8,
          3: 12,
          4: 15,
          5: 10
        },
        energyDrivers: [
          { name: 'React разработка', avgLevel: 4.2, count: 15 },
          { name: 'Утренние планерки', avgLevel: 4.0, count: 12 },
          { name: 'Code Review', avgLevel: 3.8, count: 8 }
        ],
        toxicActivities: [
          { name: 'Длинные митинги', avgLevel: 2.1, count: 10 },
          { name: 'Работа в выходные', avgLevel: 1.8, count: 5 }
        ],
        heatmapData: Array.from({ length: 7 * 24 }, (_, i) => ({
          hour: i % 24,
          day: Math.floor(i / 24),
          value: Math.random() * 4 + 1
        }))
      };

      setLocalEmotionLogs(mockEmotionLogs);
      setLocalDailyStats(mockDailyStats);
      setLocalAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (emotionLogs.length === 0 && dailyStats.length === 0) {
      loadAnalyticsData();
    }
  }, [currentUser, selectedPeriod]);

  // Подготовка данных для графиков
  const trendData = useMemo(() => {
    return localDailyStats.slice(0, TIME_PERIODS[selectedPeriod].days).reverse().map((stat, index) => ({
      date: new Date(stat.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      level: Number(stat.avgLevel.toFixed(1)),
      count: Object.values(stat.counts).reduce((sum, val) => sum + val, 0),
      ema7: Number((stat.avgLevel + Math.random() * 0.5 - 0.25).toFixed(1)), // Mock EMA
      ema30: Number((stat.avgLevel + Math.random() * 0.3 - 0.15).toFixed(1)) // Mock EMA
    }));
  }, [localDailyStats, selectedPeriod]);

  const distributionData = useMemo(() => {
    if (!localAnalytics) return [];
    return Object.entries(localAnalytics.levelDistribution).map(([level, count]) => ({
      name: EMOTION_LABELS[parseInt(level) as 1 | 2 | 3 | 4 | 5],
      value: count,
      level: parseInt(level),
      color: EMOTION_COLORS[parseInt(level) as 1 | 2 | 3 | 4 | 5]
    }));
  }, [localAnalytics]);

  // Расчет метрик
  const currentLevel = trendData.length > 0 ? trendData[trendData.length - 1].level : 0;
  const previousLevel = trendData.length > 1 ? trendData[trendData.length - 2].level : 0;
  const trend = currentLevel - previousLevel;
  const averageLevel = trendData.reduce((acc, item) => acc + item.level, 0) / trendData.length || 0;

  // Определение риска выгорания
  const burnoutRisk = useMemo(() => {
    const recentLow = trendData.slice(-7).filter(item => item.level <= 2).length;
    const trend7Days = trendData.slice(-7).reduce((acc, item) => acc + item.level, 0) / 7;
    
    if (recentLow >= 4 || trend7Days <= 2.5) return 'high';
    if (recentLow >= 2 || trend7Days <= 3.0) return 'medium';
    return 'low';
  }, [trendData]);

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Для просмотра аналитики необходима авторизация
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Загрузка аналитики...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок и элементы управления */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
          <AnalyticsIcon sx={{ mr: 1 }} />
          Пульс настроения
        </Typography>
        
        <Stack direction="row" spacing={2} alignItems="center">
          <ButtonGroup size="small" variant="outlined">
            {Object.entries(TIME_PERIODS).map(([key, period]) => (
              <Button
                key={key}
                variant={selectedPeriod === key ? 'contained' : 'outlined'}
                onClick={() => setSelectedPeriod(key as keyof typeof TIME_PERIODS)}
              >
                {period.label}
              </Button>
            ))}
          </ButtonGroup>
          
          <Tooltip title="Обновить данные">
            <IconButton onClick={loadAnalyticsData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        {/* Основные метрики */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Динамика настроения
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.secondary, 0.3)} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  stroke={theme.palette.text.secondary}
                />
                <YAxis 
                  domain={[1, 5]} 
                  tick={{ fontSize: 12 }}
                  stroke={theme.palette.text.secondary}
                />
                <RechartsTooltip 
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="level" 
                  stroke={theme.palette.primary.main}
                  strokeWidth={3}
                  name="Уровень настроения"
                  dot={{ fill: theme.palette.primary.main, strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ema7" 
                  stroke={theme.palette.secondary.main}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Тенденция (7 дней)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Сводка и предупреждения */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            {/* Текущий уровень */}
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Текущий уровень
                    </Typography>
                    <Typography variant="h4" component="div">
                      {currentLevel.toFixed(1)}
                    </Typography>
                    <Typography color="text.secondary">
                      {EMOTION_LABELS[Math.round(currentLevel) as 1 | 2 | 3 | 4 | 5]}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    {trend > 0 ? (
                      <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
                    ) : trend < 0 ? (
                      <TrendingDownIcon color="error" sx={{ fontSize: 40 }} />
                    ) : (
                      <ScheduleIcon color="warning" sx={{ fontSize: 40 }} />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {trend > 0 ? '+' : ''}{trend.toFixed(1)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Средний уровень */}
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Средний за период
                </Typography>
                <Typography variant="h5" component="div">
                  {averageLevel.toFixed(1)}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(averageLevel / 5) * 100} 
                  sx={{ 
                    mt: 1, 
                    height: 6, 
                    borderRadius: 3,
                    backgroundColor: alpha(EMOTION_COLORS[3], 0.3),
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: EMOTION_COLORS[Math.round(averageLevel) as 1 | 2 | 3 | 4 | 5]
                    }
                  }} 
                />
              </CardContent>
            </Card>

            {/* Риск выгорания */}
            <Card sx={{ 
              backgroundColor: burnoutRisk === 'high' ? alpha(theme.palette.error.main, 0.1) : 
                              burnoutRisk === 'medium' ? alpha(theme.palette.warning.main, 0.1) :
                              alpha(theme.palette.success.main, 0.1)
            }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <WarningIcon color={
                    burnoutRisk === 'high' ? 'error' : 
                    burnoutRisk === 'medium' ? 'warning' : 
                    'success'
                  } />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Риск выгорания
                    </Typography>
                    <Chip 
                      label={
                        burnoutRisk === 'high' ? 'Высокий' :
                        burnoutRisk === 'medium' ? 'Средний' :
                        'Низкий'
                      }
                      color={
                        burnoutRisk === 'high' ? 'error' :
                        burnoutRisk === 'medium' ? 'warning' :
                        'success'
                      }
                      size="small"
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Распределение эмоций */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Распределение уровней
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Драйверы энергии и токсичные активности */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Анализ активностей
            </Typography>
            <Box sx={{ height: '85%', overflowY: 'auto' }}>
              {/* Драйверы энергии */}
              <Typography variant="subtitle2" color="success.main" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ mr: 1, fontSize: 20 }} />
                Драйверы энергии
              </Typography>
              {localAnalytics?.energyDrivers.map((driver, index) => (
                <Box key={`energy-${index}`} sx={{ mb: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">{driver.name}</Typography>
                    <Chip 
                      label={`${driver.avgLevel.toFixed(1)} (${driver.count})`}
                      color="success"
                      size="small"
                    />
                  </Stack>
                  <LinearProgress 
                    variant="determinate" 
                    value={(driver.avgLevel / 5) * 100}
                    sx={{ 
                      mt: 0.5, 
                      height: 4,
                      backgroundColor: alpha(theme.palette.success.main, 0.3),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette.success.main
                      }
                    }}
                  />
                </Box>
              )) || []}

              {/* Токсичные активности */}
              <Typography variant="subtitle2" color="error.main" sx={{ mb: 2, mt: 3, display: 'flex', alignItems: 'center' }}>
                <TrendingDownIcon sx={{ mr: 1, fontSize: 20 }} />
                Токсичные активности
              </Typography>
              {localAnalytics?.toxicActivities.map((toxic, index) => (
                <Box key={`toxic-${index}`} sx={{ mb: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">{toxic.name}</Typography>
                    <Chip 
                      label={`${toxic.avgLevel.toFixed(1)} (${toxic.count})`}
                      color="error"
                      size="small"
                    />
                  </Stack>
                  <LinearProgress 
                    variant="determinate" 
                    value={(toxic.avgLevel / 5) * 100}
                    sx={{ 
                      mt: 0.5, 
                      height: 4,
                      backgroundColor: alpha(theme.palette.error.main, 0.3),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette.error.main
                      }
                    }}
                  />
                </Box>
              )) || []}
            </Box>
          </Paper>
        </Grid>

        {/* Инсайты и рекомендации */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <InsightsIcon sx={{ mr: 1 }} />
              Инсайты и рекомендации
            </Typography>
            <Grid container spacing={2}>
              {/* Динамические инсайты на основе данных */}
              {averageLevel < 3 && (
                <Grid item xs={12} md={4}>
                  <Alert severity="warning" sx={{ height: '100%' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Низкий уровень настроения
                    </Typography>
                    <Typography variant="body2">
                      Рекомендуем больше времени уделить активностям, которые приносят радость.
                    </Typography>
                  </Alert>
                </Grid>
              )}
              
              {trend < -0.5 && (
                <Grid item xs={12} md={4}>
                  <Alert severity="info">
                    <Typography variant="subtitle2" gutterBottom>
                      Нисходящий тренд
                    </Typography>
                    <Typography variant="body2">
                      Настроение снижается. Стоит проанализировать последние изменения в работе.
                    </Typography>
                  </Alert>
                </Grid>
              )}

              {burnoutRisk === 'high' && (
                <Grid item xs={12} md={4}>
                  <Alert severity="error">
                    <Typography variant="subtitle2" gutterBottom>
                      Высокий риск выгорания
                    </Typography>
                    <Typography variant="body2">
                      Рекомендуем взять отдых и сосредоточиться на восстановлении.
                    </Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
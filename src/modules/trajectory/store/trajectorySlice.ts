/**
 * Redux Toolkit slice для модуля Траектория
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  TrajectoryState, 
  EmotionLogEntry, 
  EmotionDailyStats, 
  GrowthGoal,
  CalendarEvent,
  AnalyticsData,
  EmotionCheckInData
} from '../types';
import { 
  getEmotionLogs, 
  getDailyStats, 
  createEmotionLog,
  getActivityEmotionStats
} from '../services/emotionService';
import { 
  calculateMultipleEMA, 
  detectBurnoutPattern,
  calculateEmotionalStabilityIndex 
} from '../utils/emaCalculator';
import { getDateRange, getHourFromTimestamp, getDayOfWeek } from '../utils/dateHelpers';

// Начальное состояние
const initialState: TrajectoryState = {
  emotionLogs: [],
  dailyStats: [],
  goals: [],
  calendarEvents: [],
  analytics: null,
  loading: false,
  error: null
};

// Async thunks

// Загрузка эмоциональных логов
export const fetchEmotionLogs = createAsyncThunk(
  'trajectory/fetchEmotionLogs',
  async ({ userId, days = 30 }: { userId: string; days?: number }) => {
    return await getEmotionLogs(userId, days);
  }
);

// Загрузка дневной статистики
export const fetchDailyStats = createAsyncThunk(
  'trajectory/fetchDailyStats',
  async ({ userId, days = 30 }: { userId: string; days?: number }) => {
    return await getDailyStats(userId, days);
  }
);

// Создание эмоционального лога
export const createEmotionLogAsync = createAsyncThunk(
  'trajectory/createEmotionLog',
  async ({ 
    userId, 
    data, 
    userTz 
  }: { 
    userId: string; 
    data: EmotionCheckInData; 
    userTz?: string;
  }) => {
    const logId = await createEmotionLog(userId, data, userTz);
    return {
      id: logId,
      userId,
      ts: Date.now(),
      userTz: userTz || Intl.DateTimeFormat().resolvedOptions().timeZone,
      level: data.level,
      tags: data.tags,
      notes: data.notes,
      context: data.context,
      createdAt: Date.now(),
      updatedAt: Date.now()
    } as EmotionLogEntry;
  }
);

// Загрузка аналитики
export const fetchAnalytics = createAsyncThunk(
  'trajectory/fetchAnalytics',
  async ({ 
    userId, 
    emotionLogs, 
    dailyStats 
  }: { 
    userId: string; 
    emotionLogs: EmotionLogEntry[];
    dailyStats: EmotionDailyStats[];
  }) => {
    // Расчет EMA
    const ema = calculateMultipleEMA(dailyStats);
    
    // Распределение уровней
    const levelDistribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
    
    emotionLogs.forEach(log => {
      levelDistribution[log.level]++;
    });

    // Драйверы энергии (проекты/задачи с высоким уровнем)
    const [projectStats, taskStats] = await Promise.all([
      getActivityEmotionStats(userId, 'project', 30),
      getActivityEmotionStats(userId, 'task', 30)
    ]);
    
    const energyDrivers = [...projectStats, ...taskStats]
      .filter(item => item.avgLevel >= 4 && item.count >= 3)
      .sort((a, b) => b.avgLevel - a.avgLevel)
      .slice(0, 5);
    
    // Токсичные активности (с низким уровнем)
    const toxicActivities = [...projectStats, ...taskStats]
      .filter(item => item.avgLevel <= 2 && item.count >= 3)
      .sort((a, b) => a.avgLevel - b.avgLevel)
      .slice(0, 5);

    // Тепловая карта (час × день недели)
    const heatmapData: Array<{ hour: number; day: number; value: number }> = [];
    const heatmapCounts: Record<string, { total: number; count: number }> = {};
    
    emotionLogs.forEach(log => {
      const hour = getHourFromTimestamp(log.ts, log.userTz);
      const day = getDayOfWeek(log.ts, log.userTz);
      const key = `${day}_${hour}`;
      
      if (!heatmapCounts[key]) {
        heatmapCounts[key] = { total: 0, count: 0 };
      }
      
      heatmapCounts[key].total += log.level;
      heatmapCounts[key].count++;
    });
    
    // Конвертируем в массив для визуализации
    Object.entries(heatmapCounts).forEach(([key, stats]) => {
      const [day, hour] = key.split('_').map(Number);
      heatmapData.push({
        hour,
        day,
        value: Number((stats.total / stats.count).toFixed(2))
      });
    });

    const analytics: AnalyticsData = {
      emaWeekly: ema.ema7,
      emaMonthly: ema.ema30,
      levelDistribution,
      energyDrivers,
      toxicActivities,
      heatmapData
    };

    return analytics;
  }
);

// Slice
const trajectorySlice = createSlice({
  name: 'trajectory',
  initialState,
  reducers: {
    // Очистка ошибок
    clearError: (state) => {
      state.error = null;
    },
    
    // Добавление лога (для optimistic updates)
    addEmotionLog: (state, action: PayloadAction<EmotionLogEntry>) => {
      state.emotionLogs.unshift(action.payload);
    },
    
    // Удаление лога (для undo операций)
    removeEmotionLog: (state, action: PayloadAction<string>) => {
      state.emotionLogs = state.emotionLogs.filter(log => log.id !== action.payload);
    },
    
    // Обновление календарных событий
    setCalendarEvents: (state, action: PayloadAction<CalendarEvent[]>) => {
      state.calendarEvents = action.payload;
    },
    
    // Добавление цели
    addGoal: (state, action: PayloadAction<GrowthGoal>) => {
      state.goals.push(action.payload);
    },
    
    // Обновление цели
    updateGoal: (state, action: PayloadAction<{ id: string; updates: Partial<GrowthGoal> }>) => {
      const { id, updates } = action.payload;
      const index = state.goals.findIndex(goal => goal.id === id);
      if (index !== -1) {
        state.goals[index] = { ...state.goals[index], ...updates, updatedAt: Date.now() };
      }
    },
    
    // Удаление цели
    removeGoal: (state, action: PayloadAction<string>) => {
      state.goals = state.goals.filter(goal => goal.id !== action.payload);
    }
  },
  extraReducers: (builder) => {
    // Загрузка эмоциональных логов
    builder
      .addCase(fetchEmotionLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmotionLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.emotionLogs = action.payload;
      })
      .addCase(fetchEmotionLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Ошибка загрузки эмоциональных логов';
      });

    // Загрузка дневной статистики
    builder
      .addCase(fetchDailyStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDailyStats.fulfilled, (state, action) => {
        state.loading = false;
        state.dailyStats = action.payload;
      })
      .addCase(fetchDailyStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Ошибка загрузки статистики';
      });

    // Создание эмоционального лога
    builder
      .addCase(createEmotionLogAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(createEmotionLogAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.emotionLogs.unshift(action.payload);
      })
      .addCase(createEmotionLogAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Ошибка создания лога';
      });

    // Загрузка аналитики
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Ошибка загрузки аналитики';
      });
  }
});

// Экспорт actions
export const {
  clearError,
  addEmotionLog,
  removeEmotionLog,
  setCalendarEvents,
  addGoal,
  updateGoal,
  removeGoal
} = trajectorySlice.actions;

// Селекторы
export const selectTrajectoryState = (state: { trajectory: TrajectoryState }) => state.trajectory;
export const selectEmotionLogs = (state: { trajectory: TrajectoryState }) => state.trajectory.emotionLogs;
export const selectDailyStats = (state: { trajectory: TrajectoryState }) => state.trajectory.dailyStats;
export const selectGoals = (state: { trajectory: TrajectoryState }) => state.trajectory.goals;
export const selectAnalytics = (state: { trajectory: TrajectoryState }) => state.trajectory.analytics;
export const selectIsLoading = (state: { trajectory: TrajectoryState }) => state.trajectory.loading;
export const selectError = (state: { trajectory: TrajectoryState }) => state.trajectory.error;

// Сложные селекторы
export const selectRecentEmotionLogs = (state: { trajectory: TrajectoryState }, limit: number = 10) =>
  state.trajectory.emotionLogs.slice(0, limit);

export const selectBurnoutRisk = (state: { trajectory: TrajectoryState }) => {
  const { dailyStats } = state.trajectory;
  return detectBurnoutPattern(dailyStats);
};

export const selectEmotionalStability = (state: { trajectory: TrajectoryState }) => {
  const { dailyStats } = state.trajectory;
  return calculateEmotionalStabilityIndex(dailyStats);
};

export const selectActiveGoals = (state: { trajectory: TrajectoryState }) => {
  const now = Date.now();
  return state.trajectory.goals.filter(goal => 
    goal.period.start <= now && goal.period.end >= now
  );
};

export default trajectorySlice.reducer;
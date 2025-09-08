/**
 * Модуль "Траектория" - TypeScript типы и интерфейсы
 * Персональный рост и эмоциональный интеллект
 */

// Основная модель эмоционального лога
export interface EmotionLogEntry {
  id: string;
  userId: string;
  ts: number;                    // Unix timestamp в миллисекундах
  userTz: string;                // Timezone пользователя
  level: 1 | 2 | 3 | 4 | 5;      // Уровень энергии/настроения
  tags: string[];                // Теги из словаря
  notes?: string;
  context: {
    type: 'timeEntry' | 'task' | 'project' | 'event' | 'manual';
    id?: string;                 // Связь с ID сущности
  };
  createdAt: number;
  updatedAt: number;
}

// Дневная статистика
export interface EmotionDailyStats {
  id: string;                     // ${userId}_${yyyymmdd}
  userId: string;
  date: string;                   // YYYY-MM-DD
  avgLevel: number;
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
  byHour?: Record<string, { avg: number; count: number }>;
}

// Типы для целей развития
export type GrowthGoalStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type GrowthGoalCategory = 'professional' | 'learning' | 'personal' | 'health';

// Цели развития
export interface GrowthGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: GrowthGoalCategory;
  status: GrowthGoalStatus;
  priority: 'low' | 'medium' | 'high';
  targetDate: string;
  period: { start: number; end: number };
  milestones: string[];
  completedMilestones: string[];
  estimatedHours?: number;
  spentHours?: number;
  linkedProjects?: string[];
  createdAt: number;
  updatedAt: number;
}

// Шкала эмоций - словарь тегов
export const EMOTION_TAGS: Record<1 | 2 | 3 | 4 | 5, string[]> = {
  5: ['Радость', 'Поток', 'Вдохновение', 'Гордость'], // Отлично
  4: ['Сфокусированность', 'Удовлетворение', 'Спокойствие'], // Хорошо
  3: ['Рутина', 'Нормально'], // Нейтрально
  2: ['Стресс', 'Тревога', 'Раздражение'], // Неудовлетворительно
  1: ['Усталость', 'Выгорание', 'Уныние', 'Бессилие', 'Унижение'] // Плохо
};

// Цвета уровней эмоций
export const EMOTION_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '#FF6B6B', // Плохо
  2: '#FFA06B', // Неудовлетворительно 
  3: '#FFD93D', // Нейтрально
  4: '#6BCF7F', // Хорошо
  5: '#4ECDC4'  // Отлично
};

// Лейблы уровней эмоций
export const EMOTION_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Плохо',
  2: 'Неудовлетворительно',
  3: 'Нейтрально',
  4: 'Хорошо',
  5: 'Отлично'
};

// Типы слоев календаря
export type CalendarLayerType = 'personal' | 'work' | 'emotions' | 'google';

export interface CalendarLayer {
  id: CalendarLayerType;
  name: string;
  color: string;
  visible: boolean;
}

// События календаря
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  allDay?: boolean;
  description?: string;
  layer: CalendarLayerType;
  type?: string;
  workType?: string;
  emotionLevel?: 1 | 2 | 3 | 4 | 5;
  userId: string;
  emotion?: EmotionLogEntry;
  context?: {
    type: 'timeEntry' | 'task' | 'project' | 'goal';
    id: string;
  };
  createdAt: number;
  updatedAt: number;
}

// Расширенные события для FullCalendar
export interface CalendarEventExtended extends CalendarEvent {
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
}

// Аналитические данные
export interface AnalyticsData {
  emaWeekly: number;
  emaMonthly: number;
  levelDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  energyDrivers: Array<{ name: string; avgLevel: number; count: number }>;
  toxicActivities: Array<{ name: string; avgLevel: number; count: number }>;
  heatmapData: Array<{ hour: number; day: number; value: number }>;
}

// Состояние Redux
export interface TrajectoryState {
  emotionLogs: EmotionLogEntry[];
  dailyStats: EmotionDailyStats[];
  goals: GrowthGoal[];
  calendarEvents: CalendarEvent[];
  analytics: AnalyticsData | null;
  loading: boolean;
  error: string | null;
}

// Форма быстрой отметки эмоций
export interface EmotionCheckInData {
  level: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  notes?: string;
  context: EmotionLogEntry['context'];
}

// Настройки пользователя для модуля
export interface TrajectorySettings {
  userId: string;
  timezone: string;
  calendarLayers: CalendarLayer[];
  googleCalendarEnabled: boolean;
  dailyReminderTime?: string; // HH:mm
  weeklyReportEnabled: boolean;
}

// Уведомления о выгорании
export interface BurnoutAlert {
  id: string;
  userId: string;
  detectedAt: number;
  severity: 'warning' | 'critical';
  message: string;
  acknowledged: boolean;
}

export type EmotionLevel = 1 | 2 | 3 | 4 | 5;
/**
 * Утилиты для работы с датами в модуле Траектория
 */

/**
 * Форматирует дату в строку YYYY-MM-DD
 */
export const formatDateYYYYMMDD = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Получает начало дня в миллисекундах
 */
export const getStartOfDay = (timestamp: number, timezone?: string): number => {
  const date = new Date(timestamp);
  if (timezone) {
    // Учитываем часовой пояс пользователя
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    localDate.setHours(0, 0, 0, 0);
    return localDate.getTime();
  }
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/**
 * Получает конец дня в миллисекундах
 */
export const getEndOfDay = (timestamp: number, timezone?: string): number => {
  const date = new Date(timestamp);
  if (timezone) {
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    localDate.setHours(23, 59, 59, 999);
    return localDate.getTime();
  }
  date.setHours(23, 59, 59, 999);
  return date.getTime();
};

/**
 * Получает диапазон дат для периода
 */
export const getDateRange = (days: number, endDate = new Date()): { start: number; end: number } => {
  const end = getEndOfDay(endDate.getTime());
  const start = getStartOfDay(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return { start, end };
};

/**
 * Получает час из timestamp
 */
export const getHourFromTimestamp = (timestamp: number, timezone?: string): number => {
  const date = new Date(timestamp);
  if (timezone) {
    return new Date(date.toLocaleString('en-US', { timeZone: timezone })).getHours();
  }
  return date.getHours();
};

/**
 * Получает день недели (0 = Воскресенье, 6 = Суббота)
 */
export const getDayOfWeek = (timestamp: number, timezone?: string): number => {
  const date = new Date(timestamp);
  if (timezone) {
    return new Date(date.toLocaleString('en-US', { timeZone: timezone })).getDay();
  }
  return date.getDay();
};

/**
 * Проверяет, находится ли timestamp в пределах допустимого времени
 * (не более 48 часов в будущем)
 */
export const isValidTimestamp = (timestamp: number): boolean => {
  const now = Date.now();
  const maxFuture = now + 48 * 60 * 60 * 1000; // 48 часов
  return timestamp <= maxFuture && timestamp > 0;
};

/**
 * Генерирует ID для дневной статистики
 */
export const generateDailyStatsId = (userId: string, date: Date): string => {
  const dateStr = formatDateYYYYMMDD(date).replace(/-/g, '');
  return `${userId}_${dateStr}`;
};

/**
 * Получает список дат в диапазоне
 */
export const getDatesInRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

/**
 * Форматирует время для отображения
 */
export const formatTime = (timestamp: number, timezone?: string): string => {
  const date = new Date(timestamp);
  if (timezone) {
    return date.toLocaleString('ru-RU', { 
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return date.toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Форматирует дату для отображения
 */
export const formatDate = (timestamp: number, timezone?: string): string => {
  const date = new Date(timestamp);
  if (timezone) {
    return date.toLocaleDateString('ru-RU', { 
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  return date.toLocaleDateString('ru-RU');
};
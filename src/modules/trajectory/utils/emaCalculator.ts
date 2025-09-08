/**
 * Калькулятор экспоненциального скользящего среднего (EMA)
 * для анализа трендов настроения
 */

import { EmotionDailyStats } from '../types';

/**
 * Расчет EMA для массива значений
 * @param values - массив значений
 * @param period - период сглаживания (количество дней)
 * @returns значение EMA
 */
export const calculateEMA = (values: number[], period: number): number => {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  
  const multiplier = 2 / (period + 1);
  let ema = values[0]; // Начальное значение EMA равно первому значению
  
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
  }
  
  return Number(ema.toFixed(2));
};

/**
 * Расчет EMA на основе дневной статистики
 * @param stats - массив дневной статистики (отсортированный по дате)
 * @param period - период сглаживания
 * @returns значение EMA
 */
export const calculateEMAFromStats = (stats: EmotionDailyStats[], period: number): number => {
  const values = stats.map(stat => stat.avgLevel);
  return calculateEMA(values, period);
};

/**
 * Расчет трендовой EMA с разными периодами
 * @param stats - массив дневной статистики
 * @returns объект с разными периодами EMA
 */
export const calculateMultipleEMA = (stats: EmotionDailyStats[]) => {
  if (stats.length === 0) {
    return {
      ema7: 0,
      ema14: 0,
      ema30: 0
    };
  }
  
  return {
    ema7: calculateEMAFromStats(stats.slice(-7), 7),
    ema14: calculateEMAFromStats(stats.slice(-14), 14),
    ema30: calculateEMAFromStats(stats.slice(-30), 30)
  };
};

/**
 * Определение тренда на основе EMA
 * @param currentEMA - текущее значение EMA
 * @param previousEMA - предыдущее значение EMA
 * @returns направление тренда
 */
export const getTrend = (currentEMA: number, previousEMA: number): 'up' | 'down' | 'stable' => {
  const difference = currentEMA - previousEMA;
  const threshold = 0.1; // Порог для определения стабильности
  
  if (Math.abs(difference) < threshold) return 'stable';
  return difference > 0 ? 'up' : 'down';
};

/**
 * Расчет волатильности (стандартное отклонение)
 * @param values - массив значений
 * @returns волатильность
 */
export const calculateVolatility = (values: number[]): number => {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDifferences.reduce((sum, sqDiff) => sum + sqDiff, 0) / values.length;
  
  return Number(Math.sqrt(variance).toFixed(2));
};

/**
 * Проверка на паттерн выгорания
 * @param stats - последние дневные статистики
 * @param threshold - порог среднего уровня (по умолчанию 2.2)
 * @param consecutiveDays - количество дней подряд (по умолчанию 3)
 * @returns true если обнаружен паттерн выгорания
 */
export const detectBurnoutPattern = (
  stats: EmotionDailyStats[], 
  threshold: number = 2.2,
  consecutiveDays: number = 3
): boolean => {
  if (stats.length < consecutiveDays) return false;
  
  // Проверяем последние N дней
  const recentStats = stats.slice(-consecutiveDays);
  
  return recentStats.every(stat => stat.avgLevel <= threshold);
};

/**
 * Расчет показателя восстановления (recovery score)
 * На основе изменения EMA за последние дни
 */
export const calculateRecoveryScore = (stats: EmotionDailyStats[]): number => {
  if (stats.length < 7) return 0;
  
  const recent7 = calculateEMAFromStats(stats.slice(-7), 7);
  const previous7 = calculateEMAFromStats(stats.slice(-14, -7), 7);
  
  const improvement = recent7 - previous7;
  
  // Нормализуем в диапазон 0-100
  return Math.max(0, Math.min(100, Math.round((improvement + 2) * 25)));
};

/**
 * Расчет индекса эмоциональной стабильности
 * На основе волатильности и среднего уровня
 */
export const calculateEmotionalStabilityIndex = (stats: EmotionDailyStats[]): number => {
  if (stats.length === 0) return 0;
  
  const values = stats.map(stat => stat.avgLevel);
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  const volatility = calculateVolatility(values);
  
  // Высокая стабильность = высокий средний уровень + низкая волатильность
  const stabilityScore = (average * 20) - (volatility * 10);
  
  return Math.max(0, Math.min(100, Math.round(stabilityScore)));
};
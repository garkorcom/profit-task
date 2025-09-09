/**
 * ============================================================================
 * USE SMART SUGGESTIONS HOOK - ИНТЕЛЛЕКТУАЛЬНЫЕ ПРЕДЛОЖЕНИЯ (T3 Optimization)
 * ============================================================================
 * 
 * Хук для получения умных предложений задач на основе недавней активности
 * пользователя. Основан на принципах Recency Priority для быстрого доступа
 * к наиболее релевантным задачам.
 * 
 * ПРИНЦИПЫ РАНЖИРОВАНИЯ:
 * ═════════════════════════
 * 
 * 1. RECENCY (Недавность):
 *    - Задачи, над которыми работали в последние 72 часа
 *    - Сортировка по времени последнего использования
 *    - Дедупликация по taskId/estimateId
 * 
 * 2. FREQUENCY (Частота):
 *    - Задачи с наибольшим количеством записей времени
 *    - Учет общей продолжительности работы
 *    - Предпочтение "любимых" задач пользователя
 * 
 * 3. CONTEXT (Контекст):
 *    - Время дня (утренние/вечерние задачи)
 *    - День недели (рабочие/выходные паттерны)
 *    - Проектная принадлежность
 * 
 * 4. STATUS (Статус):
 *    - Приоритет незавершенных задач
 *    - Исключение завершенных проектов
 *    - Учет deadline'ов и приоритетов
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * ═══════════════
 * 
 * const { suggestions, isLoading, refresh } = useSmartSuggestions(userId, 5);
 * 
 * suggestions.forEach(item => {
 *   console.log(`${item.name} - последнее использование: ${item.lastUsed}`);
 * });
 * 
 * @author Claude Assistant
 * @version 1.0.0
 * @since 2024-09-09
 */

import { useState, useEffect, useMemo } from 'react';
import { getRecentTimeEntries, TimeEntry } from '../api/timeEntryUnified';
import { Project } from '../types/project.types';
import { Task } from '../types/task.types';
import { Estimate, EstimateItem } from '../types/estimate.types';

// Интерфейс для предложения задачи
export interface TaskSuggestion {
  id: string;
  type: 'task' | 'estimate' | 'service';
  name: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  estimateId?: string;
  estimateName?: string;
  serviceId?: string;
  
  // Метрики для ранжирования
  lastUsed: Date;
  totalDuration: number; // в минутах
  sessionCount: number;
  averageDuration: number;
  score: number; // итоговый скор для сортировки
  
  // Дополнительные данные
  task?: Task;
  project?: Project;
  estimate?: Estimate;
  service?: EstimateItem;
  
  // Контекстные данные
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening';
  preferredDayOfWeek?: number; // 0-6
  urgency?: 'low' | 'medium' | 'high';
}

export interface SmartSuggestionsOptions {
  limit?: number;
  hoursBack?: number;
  includeCompleted?: boolean;
  contextAware?: boolean;
  minSessions?: number;
}

export const useSmartSuggestions = (
  userId: string, 
  options: SmartSuggestionsOptions = {}
) => {
  const {
    limit = 5,
    hoursBack = 72,
    includeCompleted = false,
    contextAware = true,
    minSessions = 1
  } = options;

  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных
  const loadRecentEntries = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const entries = await getRecentTimeEntries(userId, hoursBack);
      setRecentEntries(entries);
      console.log('📊 Smart suggestions data loaded:', entries.length, 'entries');
    } catch (err) {
      console.error('Error loading recent entries:', err);
      setError('Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecentEntries();
  }, [userId, hoursBack]);

  // Обработка и ранжирование предложений
  const suggestions = useMemo((): TaskSuggestion[] => {
    if (!recentEntries.length) return [];

    // 1. Группировка по задачам/сметам
    const taskGroups = new Map<string, {
      entries: TimeEntry[];
      lastUsed: Date;
      totalDuration: number;
    }>();

    recentEntries.forEach(entry => {
      // Определяем уникальный ключ для группировки
      const key = entry.taskId || `estimate-${entry.estimateId}-${entry.serviceId || 'main'}`;
      
      if (!taskGroups.has(key)) {
        taskGroups.set(key, {
          entries: [],
          lastUsed: entry.endTime || entry.updatedAt,
          totalDuration: 0
        });
      }
      
      const group = taskGroups.get(key)!;
      group.entries.push(entry);
      
      // Обновляем метрики
      const entryEndTime = entry.endTime || entry.updatedAt;
      if (entryEndTime > group.lastUsed) {
        group.lastUsed = entryEndTime;
      }
      
      group.totalDuration += entry.activeDuration || entry.duration || 0;
    });

    // 2. Преобразование в предложения с расчетом скоров
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentDay = currentTime.getDay();

    const taskSuggestions: TaskSuggestion[] = [];

    taskGroups.forEach((group, key) => {
      const { entries, lastUsed, totalDuration } = group;
      const sessionCount = entries.length;
      
      // Фильтрация по минимальному количеству сессий
      if (sessionCount < minSessions) return;

      const representativeEntry = entries[0];
      const averageDuration = totalDuration / sessionCount;

      // Определяем тип предложения
      let type: 'task' | 'estimate' | 'service' = 'task';
      let name = representativeEntry.taskName || representativeEntry.task || 'Неизвестная задача';
      let description = '';

      if (representativeEntry.estimateId) {
        type = representativeEntry.serviceId ? 'service' : 'estimate';
        name = representativeEntry.serviceId 
          ? (representativeEntry.serviceName || 'Услуга')
          : (representativeEntry.estimateName || 'Смета');
        
        description = representativeEntry.serviceId 
          ? `${representativeEntry.estimateName || 'Смета'} - ${representativeEntry.serviceName || 'Услуга'}`
          : representativeEntry.estimateName || '';
      }

      // Расчет скора
      let score = 0;

      // 1. Recency Score (0-100): чем свежее, тем выше
      const hoursAgo = (currentTime.getTime() - lastUsed.getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.max(0, 100 - (hoursAgo / hoursBack) * 100);
      score += recencyScore * 0.4; // 40% веса

      // 2. Frequency Score (0-100): количество сессий
      const maxSessions = Math.max(...Array.from(taskGroups.values()).map(g => g.entries.length));
      const frequencyScore = (sessionCount / maxSessions) * 100;
      score += frequencyScore * 0.3; // 30% веса

      // 3. Duration Score (0-100): общее время работы
      const maxDuration = Math.max(...Array.from(taskGroups.values()).map(g => g.totalDuration));
      const durationScore = maxDuration > 0 ? (totalDuration / maxDuration) * 100 : 0;
      score += durationScore * 0.2; // 20% веса

      // 4. Context Score (0-100): время дня и день недели
      let contextScore = 0;
      if (contextAware) {
        // Анализ предпочитаемого времени
        const hourDistribution = new Map<number, number>();
        const dayDistribution = new Map<number, number>();
        
        entries.forEach(entry => {
          const startHour = new Date(entry.startTime).getHours();
          const startDay = new Date(entry.startTime).getDay();
          
          hourDistribution.set(startHour, (hourDistribution.get(startHour) || 0) + 1);
          dayDistribution.set(startDay, (dayDistribution.get(startDay) || 0) + 1);
        });

        // Бонус за соответствие текущему времени
        const currentHourUsage = hourDistribution.get(currentHour) || 0;
        const currentDayUsage = dayDistribution.get(currentDay) || 0;
        
        contextScore = ((currentHourUsage + currentDayUsage) / sessionCount) * 100;
      }
      score += contextScore * 0.1; // 10% веса

      // Определение предпочитаемого времени дня
      let preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' = 'morning';
      const hourCounts = entries.reduce((acc, entry) => {
        const hour = new Date(entry.startTime).getHours();
        if (hour < 12) acc.morning++;
        else if (hour < 18) acc.afternoon++;
        else acc.evening++;
        return acc;
      }, { morning: 0, afternoon: 0, evening: 0 });

      if (hourCounts.afternoon > hourCounts.morning && hourCounts.afternoon > hourCounts.evening) {
        preferredTimeOfDay = 'afternoon';
      } else if (hourCounts.evening > hourCounts.morning && hourCounts.evening > hourCounts.afternoon) {
        preferredTimeOfDay = 'evening';
      }

      // Создание предложения
      const suggestion: TaskSuggestion = {
        id: key,
        type,
        name,
        description,
        projectId: representativeEntry.projectId,
        projectName: representativeEntry.projectName,
        estimateId: representativeEntry.estimateId,
        estimateName: representativeEntry.estimateName,
        serviceId: representativeEntry.serviceId,
        lastUsed,
        totalDuration,
        sessionCount,
        averageDuration,
        score,
        preferredTimeOfDay,
        preferredDayOfWeek: Array.from(
          entries.reduce((acc, entry) => {
            const day = new Date(entry.startTime).getDay();
            acc.set(day, (acc.get(day) || 0) + 1);
            return acc;
          }, new Map<number, number>())
        ).sort(([,a], [,b]) => b - a)[0]?.[0],
        urgency: totalDuration > 300 ? 'high' : totalDuration > 120 ? 'medium' : 'low' // на основе общего времени
      };

      taskSuggestions.push(suggestion);
    });

    // 3. Сортировка по скору и ограничение количества
    return taskSuggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

  }, [recentEntries, limit, minSessions, contextAware]);

  return {
    suggestions,
    isLoading,
    error,
    refresh: loadRecentEntries,
    stats: {
      totalEntries: recentEntries.length,
      uniqueTasks: suggestions.length,
      avgScore: suggestions.length > 0 
        ? suggestions.reduce((sum, s) => sum + s.score, 0) / suggestions.length 
        : 0
    }
  };
};
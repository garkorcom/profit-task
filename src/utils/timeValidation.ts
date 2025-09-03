/**
 * Утилиты валидации времени согласно ТЗ ERP модуля
 * 
 * Требования:
 * - Overlap: Запрет дублирования записей времени для одного пользователя (по дням и задачам)
 * - Лимиты: Суточный (12 ч) и недельный (72 ч) максимум часов
 * - Даты: Запрет логирования в будущие даты
 * - Округление: Минимальная запись 0.25 ч; округление вверх до 0.25 ч
 * - Редактирование: After Cut-off (Пятница 18:00) поданные записи блокируются
 * - Правки задним числом: >14 дней только через администратора
 */

import { TimeEntry } from '../types/erp.types';
import type { UserRole } from '../auth/permissions';

export interface ValidationSettings {
  // Лимиты времени
  dailyHoursLimit: number; // По умолчанию 12 часов
  weeklyHoursLimit: number; // По умолчанию 72 часа
  
  // Округление
  minimumHours: number; // По умолчанию 0.25 часа
  roundingIncrement: number; // По умолчанию 0.25 часа
  
  // Политики редактирования
  cutoffDay: number; // 5 = Пятница
  cutoffHour: number; // 18 = 18:00
  backdateLimit: number; // 14 дней
  
  // Настройки по ролям
  roleSettings?: Partial<Record<UserRole, Partial<ValidationSettings>>>;
}

export const DEFAULT_VALIDATION_SETTINGS: ValidationSettings = {
  dailyHoursLimit: 12,
  weeklyHoursLimit: 72,
  minimumHours: 0.25,
  roundingIncrement: 0.25,
  cutoffDay: 5, // Пятница
  cutoffHour: 18, // 18:00
  backdateLimit: 14,
  roleSettings: {
    // Менеджеры и администраторы могут работать больше
    'pm': { dailyHoursLimit: 16, weeklyHoursLimit: 80 },
    'manager': { dailyHoursLimit: 16, weeklyHoursLimit: 80 },
    'owner': { dailyHoursLimit: 24, weeklyHoursLimit: 120 }
  }
};

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestedValue?: number; // Для округления
}

export interface ValidationError {
  code: string;
  message: string;
  field: string;
  value?: any;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field: string;
  value?: any;
}

/**
 * Класс для валидации времени
 */
export class TimeValidator {
  private settings: ValidationSettings;
  
  constructor(settings: ValidationSettings = DEFAULT_VALIDATION_SETTINGS) {
    this.settings = settings;
  }
  
  /**
   * Получить настройки для конкретной роли
   */
  private getSettingsForRole(role: UserRole): ValidationSettings {
    const roleOverrides = this.settings.roleSettings?.[role] || {};
    return { ...this.settings, ...roleOverrides };
  }
  
  /**
   * Округлить часы согласно политике
   */
  roundHours(hours: number): number {
    const { minimumHours, roundingIncrement } = this.settings;
    
    if (hours < minimumHours) {
      return minimumHours;
    }
    
    return Math.ceil(hours / roundingIncrement) * roundingIncrement;
  }
  
  /**
   * Проверить дату на будущее время
   */
  validateDate(date: Date): ValidationResult {
    const now = new Date();
    const errors: ValidationError[] = [];
    
    if (date > now) {
      errors.push({
        code: 'FUTURE_DATE',
        message: 'Запрещено логировать время в будущие даты',
        field: 'date',
        value: date.toISOString()
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }
  
  /**
   * Проверить часы на соответствие минимуму и округлению
   */
  validateHours(hours: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const { minimumHours, roundingIncrement } = this.settings;
    
    if (hours <= 0) {
      errors.push({
        code: 'INVALID_HOURS',
        message: 'Количество часов должно быть больше 0',
        field: 'hours',
        value: hours
      });
    }
    
    if (hours < minimumHours) {
      warnings.push({
        code: 'BELOW_MINIMUM',
        message: `Минимальная запись ${minimumHours} часов`,
        field: 'hours',
        value: hours
      });
    }
    
    const rounded = this.roundHours(hours);
    let suggestedValue: number | undefined;
    
    if (Math.abs(rounded - hours) > 0.001) {
      warnings.push({
        code: 'ROUNDING_REQUIRED',
        message: `Время будет округлено до ${rounded} часов`,
        field: 'hours',
        value: hours
      });
      suggestedValue = rounded;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestedValue
    };
  }
  
  /**
   * Проверить дублирование записей времени в один день
   */
  validateDayOverlap(
    entry: Pick<TimeEntry, 'userId' | 'date' | 'taskId'>,
    existingEntries: Pick<TimeEntry, 'userId' | 'date' | 'taskId'>[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Проверяем записи того же пользователя в тот же день на ту же задачу
    const duplicateEntry = existingEntries.find(e => 
      e.userId === entry.userId &&
      e.date === entry.date &&
      e.taskId === entry.taskId
    );
    
    if (duplicateEntry) {
      errors.push({
        code: 'DUPLICATE_ENTRY',
        message: 'На эту дату и задачу уже существует запись времени',
        field: 'taskId',
        value: entry.taskId
      });
    }
    
    // Предупреждение о множественных записях в один день
    const sameDayEntries = existingEntries.filter(e => 
      e.userId === entry.userId &&
      e.date === entry.date
    );
    
    if (sameDayEntries.length >= 5) {
      warnings.push({
        code: 'MANY_ENTRIES_PER_DAY',
        message: `Много записей на один день (${sameDayEntries.length + 1})`,
        field: 'date',
        value: sameDayEntries.length + 1
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Проверить дневной лимит часов
   */
  validateDailyLimit(
    entry: Pick<TimeEntry, 'userId' | 'date' | 'hours'>,
    existingEntries: Pick<TimeEntry, 'userId' | 'date' | 'hours'>[],
    userRole: UserRole
  ): ValidationResult {
    const settings = this.getSettingsForRole(userRole);
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Считаем часы за тот же день
    const sameDayEntries = existingEntries.filter(e =>
      e.userId === entry.userId &&
      e.date === entry.date
    );
    
    const dailyHours = sameDayEntries.reduce((sum, e) => sum + e.hours, 0) + entry.hours;
    
    if (dailyHours > settings.dailyHoursLimit) {
      errors.push({
        code: 'DAILY_LIMIT_EXCEEDED',
        message: `Превышен дневной лимит ${settings.dailyHoursLimit} часов (попытка записать ${dailyHours} часов)`,
        field: 'hours',
        value: dailyHours
      });
    } else if (dailyHours > settings.dailyHoursLimit * 0.9) {
      warnings.push({
        code: 'APPROACHING_DAILY_LIMIT',
        message: `Приближение к дневному лимиту (${dailyHours}/${settings.dailyHoursLimit} часов)`,
        field: 'hours',
        value: dailyHours
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Проверить недельный лимит часов
   */
  validateWeeklyLimit(
    entry: Pick<TimeEntry, 'userId' | 'date' | 'hours'>,
    existingEntries: Pick<TimeEntry, 'userId' | 'date' | 'hours'>[],
    userRole: UserRole
  ): ValidationResult {
    const settings = this.getSettingsForRole(userRole);
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    const entryDate = new Date(entry.date);
    const weekStart = this.getWeekStart(entryDate);
    const weekEnd = this.getWeekEnd(entryDate);
    
    // Считаем часы за ту же неделю
    const sameWeekEntries = existingEntries.filter(e => {
      const eDate = new Date(e.date);
      return e.userId === entry.userId &&
        eDate >= weekStart && eDate <= weekEnd;
    });
    
    const weeklyHours = sameWeekEntries.reduce((sum, e) => sum + e.hours, 0) + entry.hours;
    
    if (weeklyHours > settings.weeklyHoursLimit) {
      errors.push({
        code: 'WEEKLY_LIMIT_EXCEEDED',
        message: `Превышен недельный лимит ${settings.weeklyHoursLimit} часов (попытка записать ${weeklyHours} часов)`,
        field: 'hours',
        value: weeklyHours
      });
    } else if (weeklyHours > settings.weeklyHoursLimit * 0.9) {
      warnings.push({
        code: 'APPROACHING_WEEKLY_LIMIT',
        message: `Приближение к недельному лимиту (${weeklyHours}/${settings.weeklyHoursLimit} часов)`,
        field: 'hours',
        value: weeklyHours
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Проверить возможность редактирования записи
   */
  validateEditability(
    entry: Pick<TimeEntry, 'date' | 'status' | 'submittedAt'>,
    userRole: UserRole
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const now = new Date();
    const entryDate = new Date(entry.date);
    
    // Только черновики можно редактировать
    if (entry.status !== 'draft') {
      errors.push({
        code: 'NOT_EDITABLE_STATUS',
        message: `Записи со статусом "${entry.status}" нельзя редактировать`,
        field: 'status',
        value: entry.status
      });
      return { isValid: false, errors, warnings };
    }
    
    // Проверка cut-off времени
    const lastCutoff = this.getLastCutoffDate(now);
    if (entry.submittedAt && new Date(entry.submittedAt) < lastCutoff) {
      errors.push({
        code: 'PAST_CUTOFF',
        message: 'Запись заблокирована после недельного cut-off времени',
        field: 'submittedAt',
        value: entry.submittedAt
      });
    }
    
    // Проверка правок задним числом
    const daysDiff = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > this.settings.backdateLimit) {
      // Только администраторы могут править старые записи
      if (!['owner', 'manager'].includes(userRole)) {
        errors.push({
          code: 'BACKDATE_LIMIT_EXCEEDED',
          message: `Правка записей старше ${this.settings.backdateLimit} дней доступна только администраторам`,
          field: 'date',
          value: daysDiff
        });
      } else {
        warnings.push({
          code: 'BACKDATE_ADMIN_EDIT',
          message: `Редактирование записи возрастом ${daysDiff} дней (административное действие)`,
          field: 'date',
          value: daysDiff
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Комплексная валидация записи времени
   */
  validateTimeEntry(
    entry: Pick<TimeEntry, 'userId' | 'date' | 'hours' | 'taskId' | 'status' | 'submittedAt'>,
    existingEntries: Pick<TimeEntry, 'userId' | 'date' | 'hours' | 'taskId'>[],
    userRole: UserRole
  ): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    let suggestedValue: number | undefined;
    
    // Валидация даты
    const dateResult = this.validateDate(new Date(entry.date));
    allErrors.push(...dateResult.errors);
    allWarnings.push(...dateResult.warnings);
    
    // Валидация часов
    const hoursResult = this.validateHours(entry.hours);
    allErrors.push(...hoursResult.errors);
    allWarnings.push(...hoursResult.warnings);
    if (hoursResult.suggestedValue) {
      suggestedValue = hoursResult.suggestedValue;
    }
    
    // Валидация дублирования
    const overlapResult = this.validateDayOverlap(entry, existingEntries);
    allErrors.push(...overlapResult.errors);
    allWarnings.push(...overlapResult.warnings);
    
    // Валидация дневного лимита
    const dailyResult = this.validateDailyLimit(entry, existingEntries, userRole);
    allErrors.push(...dailyResult.errors);
    allWarnings.push(...dailyResult.warnings);
    
    // Валидация недельного лимита
    const weeklyResult = this.validateWeeklyLimit(entry, existingEntries, userRole);
    allErrors.push(...weeklyResult.errors);
    allWarnings.push(...weeklyResult.warnings);
    
    // Валидация возможности редактирования
    const editResult = this.validateEditability(entry, userRole);
    allErrors.push(...editResult.errors);
    allWarnings.push(...editResult.warnings);
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      suggestedValue
    };
  }
  
  // Утилиты
  
  private getWeekStart(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Понедельник
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }
  
  private getWeekEnd(date: Date): Date {
    const result = this.getWeekStart(date);
    result.setDate(result.getDate() + 6); // Воскресенье
    result.setHours(23, 59, 59, 999);
    return result;
  }
  
  private getLastCutoffDate(now: Date): Date {
    const result = new Date(now);
    const daysSinceLastFriday = (result.getDay() + 2) % 7;
    result.setDate(result.getDate() - daysSinceLastFriday);
    result.setHours(this.settings.cutoffHour, 0, 0, 0);
    
    // Если сегодня пятница и еще не прошло cut-off время, берем предыдущую пятницу
    if (daysSinceLastFriday === 0 && now.getHours() < this.settings.cutoffHour) {
      result.setDate(result.getDate() - 7);
    }
    
    return result;
  }
}

// Экспортируем глобальный экземпляр валидатора
export const timeValidator = new TimeValidator();

// Утилиты для быстрой валидации
export const validateTimeEntry = (
  entry: Parameters<TimeValidator['validateTimeEntry']>[0],
  existingEntries: Parameters<TimeValidator['validateTimeEntry']>[1],
  userRole: UserRole
) => timeValidator.validateTimeEntry(entry, existingEntries, userRole);

export const roundHours = (hours: number) => timeValidator.roundHours(hours);
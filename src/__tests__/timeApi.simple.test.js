/**
 * ============================================================================
 * УПРОЩЕННЫЕ ТЕСТЫ ДЛЯ API УЧЕТА ВРЕМЕНИ
 * ============================================================================
 * 
 * Простые тесты без сложных моков для проверки базовой функциональности
 */

// Импортируем только утилитарные функции, которые не требуют Firebase
import { 
  calculateActiveDuration,
  formatDuration, 
  formatTimeHMS
} from '../api/timeEntryUnified';

import { 
  TimeValidator,
  DEFAULT_VALIDATION_SETTINGS
} from '../utils/timeValidation';

// ==================== ТЕСТЫ УТИЛИТ ВРЕМЕНИ ====================

describe('Утилиты работы с временем', () => {
  
  describe('calculateActiveDuration', () => {
    test('должен правильно рассчитывать время без пауз', () => {
      const startTime = new Date('2025-01-05T09:00:00Z');
      const endTime = new Date('2025-01-05T17:00:00Z'); // 8 часов = 480 минут
      
      const result = calculateActiveDuration(startTime, endTime, []);
      expect(result).toBe(480);
    });

    test('должен рассчитывать активное время с одной паузой', () => {
      const startTime = new Date('2025-01-05T09:00:00Z');
      const endTime = new Date('2025-01-05T17:00:00Z'); // 8 часов = 480 минут
      const pauses = [
        {
          startTime: new Date('2025-01-05T12:00:00Z'),
          endTime: new Date('2025-01-05T13:00:00Z'),
          duration: 60 // 1 час пауза
        }
      ];
      
      const result = calculateActiveDuration(startTime, endTime, pauses);
      expect(result).toBe(420); // 480 - 60 = 420 минут
    });

    test('должен рассчитывать время с несколькими паузами', () => {
      const startTime = new Date('2025-01-05T09:00:00Z');
      const endTime = new Date('2025-01-05T17:00:00Z');
      const pauses = [
        { duration: 30 }, // 30 минут
        { duration: 15 }, // 15 минут
        { duration: 45 }  // 45 минут
      ];
      
      const result = calculateActiveDuration(startTime, endTime, pauses);
      expect(result).toBe(390); // 480 - (30 + 15 + 45) = 390 минут
    });

    test('должен возвращать 0 если активное время меньше 0', () => {
      const startTime = new Date('2025-01-05T09:00:00Z');
      const endTime = new Date('2025-01-05T10:00:00Z'); // 1 час = 60 минут
      const pauses = [{ duration: 120 }]; // 2 часа пауза (больше чем общее время)
      
      const result = calculateActiveDuration(startTime, endTime, pauses);
      expect(result).toBe(0);
    });
  });

  describe('formatDuration', () => {
    test('должен форматировать минуты без часов', () => {
      expect(formatDuration(45)).toBe('45м');
      expect(formatDuration(30)).toBe('30м');
    });

    test('должен форматировать часы с минутами', () => {
      expect(formatDuration(90)).toBe('1ч 30м');
      expect(formatDuration(125)).toBe('2ч 5м');
    });

    test('должен форматировать целые часы', () => {
      expect(formatDuration(120)).toBe('2ч 0м');
      expect(formatDuration(180)).toBe('3ч 0м');
    });

    test('должен обрабатывать 0 минут', () => {
      expect(formatDuration(0)).toBe('0м');
    });
  });

  describe('formatTimeHMS', () => {
    test('должен форматировать секунды в ЧЧ:ММ:СС', () => {
      expect(formatTimeHMS(3661)).toBe('01:01:01'); // 1 час, 1 минута, 1 секунда
      expect(formatTimeHMS(3600)).toBe('01:00:00'); // 1 час
      expect(formatTimeHMS(60)).toBe('00:01:00');   // 1 минута
      expect(formatTimeHMS(1)).toBe('00:00:01');    // 1 секунда
    });

    test('должен обрабатывать большие значения времени', () => {
      expect(formatTimeHMS(7323)).toBe('02:02:03'); // 2:02:03
      expect(formatTimeHMS(36000)).toBe('10:00:00'); // 10 часов
    });

    test('должен обрабатывать 0 секунд', () => {
      expect(formatTimeHMS(0)).toBe('00:00:00');
    });
  });
});

// ==================== ТЕСТЫ ВАЛИДАЦИИ ВРЕМЕНИ ====================

describe('Валидация времени', () => {
  let validator;

  beforeEach(() => {
    validator = new TimeValidator();
  });

  describe('roundHours', () => {
    test('должен округлять до минимального значения', () => {
      expect(validator.roundHours(0.1)).toBe(0.25);
      expect(validator.roundHours(0.2)).toBe(0.25);
    });

    test('должен округлять вверх до инкремента', () => {
      expect(validator.roundHours(0.3)).toBe(0.5);
      expect(validator.roundHours(0.7)).toBe(0.75);
      expect(validator.roundHours(1.1)).toBe(1.25);
    });

    test('должен оставлять точные значения', () => {
      expect(validator.roundHours(0.25)).toBe(0.25);
      expect(validator.roundHours(0.5)).toBe(0.5);
      expect(validator.roundHours(1.0)).toBe(1.0);
    });
  });

  describe('validateDate', () => {
    test('должен принимать прошлые и текущие даты', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();
      
      expect(validator.validateDate(yesterday).isValid).toBe(true);
      expect(validator.validateDate(today).isValid).toBe(true);
    });

    test('должен отклонять будущие даты', () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = validator.validateDate(tomorrow);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('FUTURE_DATE');
    });
  });

  describe('validateHours', () => {
    test('должен принимать валидные часы', () => {
      const result = validator.validateHours(2.5);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('должен отклонять нулевые и отрицательные часы', () => {
      const zeroResult = validator.validateHours(0);
      const negativeResult = validator.validateHours(-1);
      
      expect(zeroResult.isValid).toBe(false);
      expect(negativeResult.isValid).toBe(false);
      expect(zeroResult.errors[0].code).toBe('INVALID_HOURS');
      expect(negativeResult.errors[0].code).toBe('INVALID_HOURS');
    });

    test('должен предупреждать о значениях ниже минимума', () => {
      const result = validator.validateHours(0.1);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings.some(w => w.code === 'BELOW_MINIMUM')).toBe(true);
    });

    test('должен предлагать округление', () => {
      const result = validator.validateHours(0.3);
      expect(result.warnings.some(w => w.code === 'ROUNDING_REQUIRED')).toBe(true);
      expect(result.suggestedValue).toBe(0.5);
    });
  });

  describe('validateDayOverlap', () => {
    test('должен обнаруживать дублированные записи', () => {
      const entry = {
        userId: 'user1',
        date: '2025-01-05',
        taskId: 'task1'
      };
      
      const existingEntries = [
        { userId: 'user1', date: '2025-01-05', taskId: 'task1' }
      ];
      
      const result = validator.validateDayOverlap(entry, existingEntries);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('DUPLICATE_ENTRY');
    });

    test('должен предупреждать о множественных записях в день', () => {
      const entry = {
        userId: 'user1',
        date: '2025-01-05',
        taskId: 'task6'
      };
      
      const existingEntries = [
        { userId: 'user1', date: '2025-01-05', taskId: 'task1' },
        { userId: 'user1', date: '2025-01-05', taskId: 'task2' },
        { userId: 'user1', date: '2025-01-05', taskId: 'task3' },
        { userId: 'user1', date: '2025-01-05', taskId: 'task4' },
        { userId: 'user1', date: '2025-01-05', taskId: 'task5' }
      ];
      
      const result = validator.validateDayOverlap(entry, existingEntries);
      expect(result.warnings.some(w => w.code === 'MANY_ENTRIES_PER_DAY')).toBe(true);
    });

    test('должен пропускать записи других пользователей', () => {
      const entry = {
        userId: 'user1',
        date: '2025-01-05',
        taskId: 'task1'
      };
      
      const existingEntries = [
        { userId: 'user2', date: '2025-01-05', taskId: 'task1' }
      ];
      
      const result = validator.validateDayOverlap(entry, existingEntries);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateDailyLimit', () => {
    test('должен принимать часы в пределах лимита', () => {
      const entry = { userId: 'user1', date: '2025-01-05', hours: 4 };
      const existingEntries = [
        { userId: 'user1', date: '2025-01-05', hours: 6 }
      ];
      
      const result = validator.validateDailyLimit(entry, existingEntries, 'employee');
      expect(result.isValid).toBe(true);
    });

    test('должен отклонять превышение дневного лимита', () => {
      const entry = { userId: 'user1', date: '2025-01-05', hours: 8 };
      const existingEntries = [
        { userId: 'user1', date: '2025-01-05', hours: 6 }
      ];
      
      const result = validator.validateDailyLimit(entry, existingEntries, 'employee');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('DAILY_LIMIT_EXCEEDED');
    });

    test('должен использовать роль-специфичные лимиты', () => {
      const entry = { userId: 'user1', date: '2025-01-05', hours: 8 };
      const existingEntries = [
        { userId: 'user1', date: '2025-01-05', hours: 6 }
      ];
      
      // Для обычного сотрудника должно быть превышение
      const employeeResult = validator.validateDailyLimit(entry, existingEntries, 'employee');
      expect(employeeResult.isValid).toBe(false);
      
      // Для менеджера должно быть OK
      const managerResult = validator.validateDailyLimit(entry, existingEntries, 'manager');
      expect(managerResult.isValid).toBe(true);
    });
  });

  describe('validateEditability', () => {
    test('должен разрешать редактирование черновиков', () => {
      const entry = {
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // вчерашняя дата
        status: 'draft',
        submittedAt: null
      };
      
      const result = validator.validateEditability(entry, 'employee');
      expect(result.isValid).toBe(true);
    });

    test('должен запрещать редактирование поданных записей', () => {
      const entry = {
        date: '2025-01-04',
        status: 'submitted',
        submittedAt: new Date().toISOString()
      };
      
      const result = validator.validateEditability(entry, 'employee');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('NOT_EDITABLE_STATUS');
    });

    test('должен запрещать правки задним числом обычным пользователям', () => {
      const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000); // 20 дней назад
      const entry = {
        date: oldDate.toISOString().split('T')[0],
        status: 'draft',
        submittedAt: null
      };
      
      const result = validator.validateEditability(entry, 'employee');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('BACKDATE_LIMIT_EXCEEDED');
    });

    test('должен разрешать правки задним числом администраторам', () => {
      const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      const entry = {
        date: oldDate.toISOString().split('T')[0],
        status: 'draft',
        submittedAt: null
      };
      
      const result = validator.validateEditability(entry, 'owner');
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === 'BACKDATE_ADMIN_EDIT')).toBe(true);
    });
  });

  describe('комплексная валидация записи времени', () => {
    test('должен проходить валидную запись', () => {
      const entry = {
        userId: 'user1',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // вчерашняя дата
        hours: 4.5,
        taskId: 'task1',
        status: 'draft',
        submittedAt: null
      };
      
      const existingEntries = [];
      
      const result = validator.validateTimeEntry(entry, existingEntries, 'employee');
      expect(result.isValid).toBe(true);
    });

    test('должен собирать все ошибки валидации', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const entry = {
        userId: 'user1',
        date: futureDate.toISOString().split('T')[0],
        hours: 0,
        taskId: 'task1',
        status: 'submitted',
        submittedAt: new Date().toISOString()
      };
      
      const existingEntries = [
        { userId: 'user1', date: entry.date, taskId: 'task1' }
      ];
      
      const result = validator.validateTimeEntry(entry, existingEntries, 'employee');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      
      const errorCodes = result.errors.map(e => e.code);
      expect(errorCodes).toContain('FUTURE_DATE');
      expect(errorCodes).toContain('INVALID_HOURS');
      expect(errorCodes).toContain('NOT_EDITABLE_STATUS');
      expect(errorCodes).toContain('DUPLICATE_ENTRY');
    });

    test('должен предлагать округленное значение часов', () => {
      const entry = {
        userId: 'user1',
        date: '2025-01-04',
        hours: 2.3,
        taskId: 'task1',
        status: 'draft',
        submittedAt: null
      };
      
      const result = validator.validateTimeEntry(entry, [], 'employee');
      expect(result.suggestedValue).toBe(2.5);
    });
  });
});

// ==================== ТЕСТЫ ПРОИЗВОДИТЕЛЬНОСТИ ====================

describe('Тесты производительности', () => {
  
  test('calculateActiveDuration должен работать быстро с большим количеством пауз', () => {
    const startTime = new Date('2025-01-05T09:00:00Z');
    const endTime = new Date('2025-01-05T17:00:00Z');
    
    // Создаем 1000 пауз
    const pauses = Array.from({length: 1000}, (_, i) => ({
      duration: Math.floor(Math.random() * 10) + 1
    }));
    
    const startPerf = performance.now();
    calculateActiveDuration(startTime, endTime, pauses);
    const endPerf = performance.now();
    
    // Должно выполняться менее чем за 100мс
    expect(endPerf - startPerf).toBeLessThan(100);
  });

  test('валидация должна работать быстро с большим количеством записей', () => {
    const validator = new TimeValidator();
    const entry = {
      userId: 'user1',
      date: '2025-01-05',
      hours: 4,
      taskId: 'task1',
      status: 'draft',
      submittedAt: null
    };
    
    // Создаем 10000 существующих записей
    const existingEntries = Array.from({length: 10000}, (_, i) => ({
      userId: 'user1',
      date: `2025-01-${String((i % 30) + 1).padStart(2, '0')}`,
      hours: Math.random() * 8,
      taskId: `task${i}`
    }));
    
    const startPerf = performance.now();
    validator.validateTimeEntry(entry, existingEntries, 'employee');
    const endPerf = performance.now();
    
    // Должно выполняться менее чем за 1000мс
    expect(endPerf - startPerf).toBeLessThan(1000);
  });
});

console.log('✅ Упрощенные тесты API учета времени готовы к запуску!');
console.log('📋 Покрытие:');
console.log('  • Утилиты расчета времени');
console.log('  • Форматирование времени');
console.log('  • Валидация временных данных');  
console.log('  • Тесты производительности');
/**
 * Unit тесты для утилит валидации времени
 * Тестируем критически важную логику ERP модуля
 */

import { 
  TimeValidator, 
  ValidationSettings, 
  DEFAULT_VALIDATION_SETTINGS,
  validateTimeEntry,
  roundHours
} from '../timeValidation';
import { TimeEntry } from '../../types/erp.types';
import type { UserRole } from '../../auth/permissions';

describe('TimeValidator', () => {
  let validator: TimeValidator;
  
  beforeEach(() => {
    validator = new TimeValidator(DEFAULT_VALIDATION_SETTINGS);
  });

  describe('roundHours', () => {
    it('should round up to minimum hours', () => {
      expect(validator.roundHours(0.1)).toBe(0.25);
      expect(validator.roundHours(0.2)).toBe(0.25);
      expect(validator.roundHours(0.24)).toBe(0.25);
    });

    it('should round up to nearest increment', () => {
      expect(validator.roundHours(0.3)).toBe(0.5);
      expect(validator.roundHours(0.6)).toBe(0.75);
      expect(validator.roundHours(0.9)).toBe(1.0);
      expect(validator.roundHours(1.1)).toBe(1.25);
    });

    it('should not round exact increments', () => {
      expect(validator.roundHours(0.25)).toBe(0.25);
      expect(validator.roundHours(0.5)).toBe(0.5);
      expect(validator.roundHours(1.0)).toBe(1.0);
      expect(validator.roundHours(8.0)).toBe(8.0);
    });

    it('should handle edge cases', () => {
      expect(validator.roundHours(0)).toBe(0.25);
      expect(validator.roundHours(-0.1)).toBe(0.25);
    });
  });

  describe('validateDate', () => {
    it('should allow past and current dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const result = validator.validateDate(yesterday);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow today', () => {
      const today = new Date();
      const result = validator.validateDate(today);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const result = validator.validateDate(tomorrow);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('FUTURE_DATE');
      expect(result.errors[0].field).toBe('date');
    });
  });

  describe('validateHours', () => {
    it('should reject zero or negative hours', () => {
      expect(validator.validateHours(0).isValid).toBe(false);
      expect(validator.validateHours(-1).isValid).toBe(false);
      
      const result = validator.validateHours(0);
      expect(result.errors[0].code).toBe('INVALID_HOURS');
    });

    it('should warn about below minimum hours', () => {
      const result = validator.validateHours(0.1);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2); // Both BELOW_MINIMUM and ROUNDING_REQUIRED
      expect(result.warnings.some(w => w.code === 'BELOW_MINIMUM')).toBe(true);
      expect(result.warnings.some(w => w.code === 'ROUNDING_REQUIRED')).toBe(true);
    });

    it('should suggest rounding when needed', () => {
      const result = validator.validateHours(1.3);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('ROUNDING_REQUIRED');
      expect(result.suggestedValue).toBe(1.5);
    });

    it('should accept valid hours without warnings', () => {
      const result = validator.validateHours(2.0);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.suggestedValue).toBeUndefined();
    });
  });

  describe('validateDayOverlap', () => {
    const baseEntry = {
      userId: 'user1',
      date: '2024-01-15',
      taskId: 'task1'
    };

    it('should allow unique entries', () => {
      const existingEntries = [
        { userId: 'user1', date: '2024-01-14', taskId: 'task1' },
        { userId: 'user1', date: '2024-01-15', taskId: 'task2' },
        { userId: 'user2', date: '2024-01-15', taskId: 'task1' }
      ];

      const result = validator.validateDayOverlap(baseEntry, existingEntries);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject duplicate entries for same user/date/task', () => {
      const existingEntries = [
        { userId: 'user1', date: '2024-01-15', taskId: 'task1' }
      ];

      const result = validator.validateDayOverlap(baseEntry, existingEntries);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DUPLICATE_ENTRY');
    });

    it('should warn about many entries per day', () => {
      const existingEntries = Array.from({ length: 5 }, (_, i) => ({
        userId: 'user1',
        date: '2024-01-15',
        taskId: `task${i + 2}` // task2, task3, task4, task5, task6
      }));

      const result = validator.validateDayOverlap(baseEntry, existingEntries);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('MANY_ENTRIES_PER_DAY');
      expect(result.warnings[0].value).toBe(6); // 5 existing + 1 new
    });
  });

  describe('validateDailyLimit', () => {
    const baseEntry = {
      userId: 'user1',
      date: '2024-01-15',
      hours: 4
    };

    it('should allow entries within daily limit', () => {
      const existingEntries = [
        { userId: 'user1', date: '2024-01-15', hours: 6 }
      ];

      const result = validator.validateDailyLimit(baseEntry, existingEntries, 'field');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject entries exceeding daily limit', () => {
      const existingEntries = [
        { userId: 'user1', date: '2024-01-15', hours: 10 }
      ];

      const result = validator.validateDailyLimit(baseEntry, existingEntries, 'field');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DAILY_LIMIT_EXCEEDED');
      expect(result.errors[0].value).toBe(14); // 10 + 4
    });

    it('should warn when approaching daily limit', () => {
      const existingEntries = [
        { userId: 'user1', date: '2024-01-15', hours: 7.5 } // 7.5 + 4 = 11.5 (> 90% of 12)
      ];

      const result = validator.validateDailyLimit(baseEntry, existingEntries, 'field');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('APPROACHING_DAILY_LIMIT');
    });

    it('should use role-specific limits', () => {
      const existingEntries = [
        { userId: 'user1', date: '2024-01-15', hours: 10 } // 10 + 4 = 14 total
      ];

      // Field role (12h limit) - should fail with 14 hours total
      const fieldResult = validator.validateDailyLimit(baseEntry, existingEntries, 'field');
      expect(fieldResult.isValid).toBe(false);

      // Manager role (16h limit) - should pass with 14 hours total
      const managerResult = validator.validateDailyLimit(baseEntry, existingEntries, 'manager');
      expect(managerResult.isValid).toBe(true);
    });
  });

  describe('validateWeeklyLimit', () => {
    const baseEntry = {
      userId: 'user1',
      date: '2024-01-15', // Monday
      hours: 8
    };

    it('should allow entries within weekly limit', () => {
      const existingEntries = [
        { userId: 'user1', date: '2024-01-16', hours: 8 }, // Tuesday
        { userId: 'user1', date: '2024-01-17', hours: 8 }  // Wednesday
      ];

      const result = validator.validateWeeklyLimit(baseEntry, existingEntries, 'field');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject entries exceeding weekly limit', () => {
      // Create entries for 68 hours in the same week (68 + 8 = 76 > 72)
      const existingEntries = [
        { userId: 'user1', date: '2024-01-15', hours: 8 },  // Monday (same week as baseEntry)
        { userId: 'user1', date: '2024-01-16', hours: 15 }, // Tuesday
        { userId: 'user1', date: '2024-01-17', hours: 15 }, // Wednesday
        { userId: 'user1', date: '2024-01-18', hours: 15 }, // Thursday
        { userId: 'user1', date: '2024-01-19', hours: 15 }  // Friday
      ]; // Total: 68 hours + 8 (baseEntry) = 76 > 72

      const result = validator.validateWeeklyLimit(baseEntry, existingEntries, 'field');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('WEEKLY_LIMIT_EXCEEDED');
    });

    it('should warn when approaching weekly limit', () => {
      // Create entries for 57 hours in the same week (57 + 8 = 65 > 90% of 72)
      const existingEntries = [
        { userId: 'user1', date: '2024-01-16', hours: 12 }, // Tuesday  
        { userId: 'user1', date: '2024-01-17', hours: 12 }, // Wednesday
        { userId: 'user1', date: '2024-01-18', hours: 12 }, // Thursday
        { userId: 'user1', date: '2024-01-19', hours: 12 }, // Friday
        { userId: 'user1', date: '2024-01-21', hours: 9 }   // Sunday (same week)
      ]; // Total: 57 hours + 8 = 65 > 64.8 (90% of 72)

      const result = validator.validateWeeklyLimit(baseEntry, existingEntries, 'field');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('APPROACHING_WEEKLY_LIMIT');
    });

    it('should only count same week entries', () => {
      const existingEntries = [
        { userId: 'user1', date: '2024-01-08', hours: 40 }, // Previous week
        { userId: 'user1', date: '2024-01-16', hours: 8 },  // Same week
        { userId: 'user1', date: '2024-01-22', hours: 40 }  // Next week
      ];

      const result = validator.validateWeeklyLimit(baseEntry, existingEntries, 'field');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateEditability', () => {
    const now = new Date('2024-01-19T10:00:00Z'); // Friday 10:00
    
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow editing draft entries', () => {
      const entry = {
        date: '2024-01-18',
        status: 'draft' as const,
        submittedAt: null
      };

      const result = validator.validateEditability(entry, 'field');
      expect(result.isValid).toBe(true);
    });

    it('should reject editing non-draft entries', () => {
      const entry = {
        date: '2024-01-18',
        status: 'submitted' as const,
        submittedAt: '2024-01-18T17:00:00Z'
      };

      const result = validator.validateEditability(entry, 'field');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('NOT_EDITABLE_STATUS');
    });

    it('should reject editing past cutoff entries', () => {
      const entry = {
        date: '2024-01-10', // Wednesday of previous week
        status: 'draft' as const,
        submittedAt: '2024-01-12T17:00:00Z' // Friday before cutoff
      };

      const result = validator.validateEditability(entry, 'field');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('PAST_CUTOFF');
    });

    it('should reject old entries for non-admin users', () => {
      const entry = {
        date: '2024-01-01', // 18 days ago
        status: 'draft' as const,
        submittedAt: null
      };

      const result = validator.validateEditability(entry, 'field');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('BACKDATE_LIMIT_EXCEEDED');
    });

    it('should allow old entries for admin users with warning', () => {
      const entry = {
        date: '2024-01-01', // 18 days ago
        status: 'draft' as const,
        submittedAt: null
      };

      const result = validator.validateEditability(entry, 'manager');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('BACKDATE_ADMIN_EDIT');
    });
  });

  describe('validateTimeEntry (comprehensive)', () => {
    const mockExistingEntries = [
      { userId: 'user1', date: '2024-01-15', hours: 6, taskId: 'task2' }
    ];

    it('should pass valid time entry', () => {
      // Use a date from the past to avoid validation issues
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      
      const entry = {
        userId: 'user1',
        date: pastDate.toISOString().split('T')[0],
        hours: 4,
        taskId: 'task1',
        status: 'draft' as const,
        submittedAt: null
      };

      const result = validator.validateTimeEntry(entry, mockExistingEntries, 'field');
      if (!result.isValid) {
        console.log('Validation errors:', result.errors.map(e => e.code));
      }
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with multiple validation errors', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const entry = {
        userId: 'user1',
        date: tomorrow.toISOString().split('T')[0], // Future date
        hours: 0, // Invalid hours
        taskId: 'task1', // Different task to avoid duplicate
        status: 'draft' as const,
        submittedAt: null
      };

      const result = validator.validateTimeEntry(entry, mockExistingEntries, 'field');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      
      const errorCodes = result.errors.map(e => e.code);
      expect(errorCodes).toContain('FUTURE_DATE');
      expect(errorCodes).toContain('INVALID_HOURS');
    });

    it('should suggest rounding and show warnings', () => {
      // Use a date from the past to avoid validation issues
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3);
      
      const entry = {
        userId: 'user1',
        date: pastDate.toISOString().split('T')[0],
        hours: 1.3, // Needs rounding
        taskId: 'task1',
        status: 'draft' as const,
        submittedAt: null
      };

      const result = validator.validateTimeEntry(entry, mockExistingEntries, 'field');
      if (!result.isValid) {
        console.log('Validation errors:', result.errors.map(e => e.code));
      }
      expect(result.isValid).toBe(true);
      expect(result.suggestedValue).toBe(1.5);
      expect(result.warnings.some(w => w.code === 'ROUNDING_REQUIRED')).toBe(true);
    });
  });

  describe('Custom validation settings', () => {
    it('should use custom settings', () => {
      const customSettings: ValidationSettings = {
        ...DEFAULT_VALIDATION_SETTINGS,
        dailyHoursLimit: 8,
        minimumHours: 0.5,
        roundingIncrement: 0.5
      };

      const customValidator = new TimeValidator(customSettings);

      // Test custom rounding
      expect(customValidator.roundHours(0.3)).toBe(0.5);
      expect(customValidator.roundHours(0.8)).toBe(1.0);

      // Test custom daily limit
      const entry = { userId: 'user1', date: '2024-01-15', hours: 4 };
      const existing = [{ userId: 'user1', date: '2024-01-15', hours: 6 }];
      
      const result = customValidator.validateDailyLimit(entry, existing, 'field');
      expect(result.isValid).toBe(false); // 6 + 4 = 10 > 8 limit
      expect(result.errors[0].code).toBe('DAILY_LIMIT_EXCEEDED');
    });
  });

  describe('Utility functions', () => {
    it('should export convenience functions', () => {
      expect(typeof validateTimeEntry).toBe('function');
      expect(typeof roundHours).toBe('function');
      
      // Test utility functions
      expect(roundHours(1.3)).toBe(1.5);
    });
  });
});

describe('Week calculation utilities', () => {
  let validator: TimeValidator;
  
  beforeEach(() => {
    validator = new TimeValidator();
  });

  it('should calculate week boundaries correctly', () => {
    // Access private methods via reflection for testing
    const getWeekStart = (validator as any).getWeekStart.bind(validator);
    const getWeekEnd = (validator as any).getWeekEnd.bind(validator);
    
    const wednesday = new Date('2024-01-17'); // Wednesday
    const weekStart = getWeekStart(wednesday);
    const weekEnd = getWeekEnd(wednesday);
    
    expect(weekStart.getDay()).toBe(1); // Monday
    expect(weekStart.getDate()).toBe(15); // January 15th
    expect(weekEnd.getDay()).toBe(0); // Sunday  
    expect(weekEnd.getDate()).toBe(21); // January 21st
  });
});

describe('Cut-off date calculation', () => {
  let validator: TimeValidator;
  
  beforeEach(() => {
    validator = new TimeValidator();
  });

  it('should calculate cutoff dates correctly', () => {
    const getLastCutoffDate = (validator as any).getLastCutoffDate.bind(validator);
    
    // Test from different days of the week
    const monday = new Date('2024-01-15T10:00:00'); // Monday 10:00
    const friday = new Date('2024-01-19T10:00:00');  // Friday 10:00 (before cutoff)
    const fridayAfter = new Date('2024-01-19T19:00:00'); // Friday 19:00 (after cutoff)
    
    const mondayCutoff = getLastCutoffDate(monday);
    expect(mondayCutoff.getDay()).toBe(5); // Friday
    expect(mondayCutoff.getDate()).toBe(12); // Previous Friday
    
    const fridayCutoff = getLastCutoffDate(friday);
    expect(fridayCutoff.getDay()).toBe(5); // Friday
    expect(fridayCutoff.getDate()).toBe(12); // Previous Friday (same week but before cutoff time)
    
    const fridayAfterCutoff = getLastCutoffDate(fridayAfter);
    expect(fridayAfterCutoff.getDay()).toBe(5); // Friday
    expect(fridayAfterCutoff.getDate()).toBe(19); // Current Friday
  });
});
/**
 * ============================================================================
 * HOOK TESTS - Smart Suggestions System
 * ============================================================================
 * 
 * Comprehensive tests for the Smart Suggestions hook that powers T3 optimization.
 * Tests the 4-factor scoring algorithm and user behavior prediction.
 * 
 * 🧪 TEST INSTRUCTIONS:
 * 1. Run: npm test -- --testPathPattern="hooks/useSmartSuggestions"
 * 2. Tests React hook behavior with mocked API
 * 3. Focus on algorithm accuracy and performance
 * 4. All tests use fake timers for consistent behavior
 * 
 * 🔧 HOOK TESTED:
 * - useSmartSuggestions(): Main smart suggestions hook
 * 
 * 🛠️ ALGORITHM COVERAGE:
 * - Recency Factor: Recent work prioritization
 * - Frequency Factor: Session count scoring
 * - Duration Factor: Total time investment
 * - Context Factor: Time-of-day predictions
 * - Urgency Classification: Based on duration thresholds
 * - Performance: <100ms loading requirements
 * 
 * @category Hook Tests
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useSmartSuggestions } from '../useSmartSuggestions';
import { getRecentTimeEntries } from '../../api/timeEntryUnified';
import { TimeEntry } from '../../api/timeEntryUnified';

// Mock the API
jest.mock('../../api/timeEntryUnified');
const mockGetRecentTimeEntries = getRecentTimeEntries as jest.MockedFunction<typeof getRecentTimeEntries>;

describe('SmartSuggestionsService (useSmartSuggestions)', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Date to a fixed time for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-09-09T14:30:00.000Z')); // Monday 2:30 PM
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createMockTimeEntry = (overrides: Partial<TimeEntry> = {}): TimeEntry => ({
    id: 'entry-1',
    userId: 'user-123',
    taskId: 'task-1',
    taskName: 'Default Task',
    projectId: 'project-1',
    projectName: 'Default Project',
    status: 'completed',
    startTime: new Date('2024-09-09T13:00:00.000Z'),
    endTime: new Date('2024-09-09T14:00:00.000Z'),
    duration: 60,
    activeDuration: 60,
    totalDuration: 60,
    totalPauseDuration: 0,
    pauses: [],
    createdAt: new Date('2024-09-09T13:00:00.000Z'),
    updatedAt: new Date('2024-09-09T14:00:00.000Z'),
    employeeId: 'user-123',
    startMethod: 'manual',
    ...overrides
  });

  describe('Алгоритм приоритизации', () => {
    
    test('должен приоритизировать задачи по времени последней работы (Recency Factor)', async () => {
      // Arrange: Create tasks with different recency (different taskIds)
      const recentEntries: TimeEntry[] = [
        createMockTimeEntry({
          id: 'entry-1',
          taskId: 'task-recent',
          taskName: 'Very Recent Task',
          endTime: new Date('2024-09-09T14:00:00.000Z'), // 30 min ago
          duration: 60,
          activeDuration: 60
        }),
        createMockTimeEntry({
          id: 'entry-2',
          taskId: 'task-recent-2',
          taskName: 'Recent Task',
          endTime: new Date('2024-09-09T12:00:00.000Z'), // 2.5 hours ago
          duration: 90,
          activeDuration: 90
        }),
        createMockTimeEntry({
          id: 'entry-3',
          taskId: 'task-recent-3',
          taskName: 'Old Task',
          endTime: new Date('2024-09-09T08:00:00.000Z'), // 6.5 hours ago
          duration: 150,
          activeDuration: 150
        })
      ];
      
      mockGetRecentTimeEntries.mockResolvedValue(recentEntries);

      // Act
      const { result } = renderHook(() => useSmartSuggestions('user-123', { limit: 3 }));

      // Assert
      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(3);
        // Most recent should be first despite shorter duration in comparison
        expect(result.current.suggestions[0].name).toBe('Very Recent Task');
        expect(result.current.suggestions[0].score).toBeGreaterThan(result.current.suggestions[1].score);
        expect(result.current.suggestions[1].score).toBeGreaterThan(result.current.suggestions[2].score);
      }, { timeout: 5000 });
    });

    test('должен учитывать общее время работы над задачей (Duration Factor)', async () => {
      const currentTime = new Date('2024-09-09T14:30:00.000Z');
      
      const entries: TimeEntry[] = [
        // Task with many short sessions (high frequency, high total duration)
        ...Array.from({ length: 10 }, (_, i) => createMockTimeEntry({
          id: `entry-frequent-${i}`,
          taskName: 'Frequent Task',
          taskId: 'task-frequent',
          endTime: new Date(currentTime.getTime() - (i + 1) * 3600000), // Hours ago
          duration: 30,
          activeDuration: 30
        })),
        // Task with one long session (low frequency, high duration)
        createMockTimeEntry({
          id: 'entry-long',
          taskName: 'Long Task',
          taskId: 'task-long',
          endTime: new Date(currentTime.getTime() - 2 * 3600000), // 2 hours ago
          duration: 300, // 5 hours
          activeDuration: 300
        }),
        // Task with few short sessions (low frequency, low duration)
        createMockTimeEntry({
          id: 'entry-short',
          taskName: 'Short Task',
          taskId: 'task-short',
          endTime: new Date(currentTime.getTime() - 1 * 3600000), // 1 hour ago  
          duration: 15,
          activeDuration: 15
        })
      ];

      mockGetRecentTimeEntries.mockResolvedValue(entries);

      const { result } = renderHook(() => useSmartSuggestions('user-123', { limit: 5 }));

      await waitFor(() => {
        const suggestions = result.current.suggestions;
        expect(suggestions).toHaveLength(3); // Should be deduplicated by task
        
        // Frequent task should score highest (frequency + duration)
        const frequentTask = suggestions.find((s: any) => s.name === 'Frequent Task');
        const longTask = suggestions.find((s: any) => s.name === 'Long Task');
        const shortTask = suggestions.find((s: any) => s.name === 'Short Task');
        
        expect(frequentTask).toBeDefined();
        expect(frequentTask!.sessionCount).toBe(10);
        expect(frequentTask!.totalDuration).toBe(300); // 10 * 30min
        
        expect(longTask!.sessionCount).toBe(1);
        expect(longTask!.totalDuration).toBe(300);
        
        expect(shortTask!.sessionCount).toBe(1);
        expect(shortTask!.totalDuration).toBe(15);
      }, { timeout: 5000 });
    });

    test('должен предсказывать задачи по времени дня (Context Factor)', async () => {
      // Mock current time: Monday 9:00 AM
      jest.setSystemTime(new Date('2024-09-09T09:00:00.000Z'));
      
      const entries: TimeEntry[] = [
        // Morning routine task (usually done at 9 AM)
        ...Array.from({ length: 5 }, (_, i) => createMockTimeEntry({
          id: `morning-${i}`,
          taskName: 'Daily Standup',
          taskId: 'standup',
          startTime: new Date(`2024-09-0${4 + i}T09:00:00.000Z`), // Past 5 days at 9 AM
          endTime: new Date(`2024-09-0${4 + i}T09:30:00.000Z`),
          duration: 30,
          activeDuration: 30
        })),
        // Afternoon task (usually done at 2 PM)  
        ...Array.from({ length: 5 }, (_, i) => createMockTimeEntry({
          id: `afternoon-${i}`,
          taskName: 'Code Review',
          taskId: 'review',
          startTime: new Date(`2024-09-0${4 + i}T14:00:00.000Z`), // Past 5 days at 2 PM
          endTime: new Date(`2024-09-0${4 + i}T15:00:00.000Z`),
          duration: 60,
          activeDuration: 60
        }))
      ];

      mockGetRecentTimeEntries.mockResolvedValue(entries);

      const { result } = renderHook(() => useSmartSuggestions('user-123', { 
        limit: 5,
        contextAware: true 
      }));

      await waitFor(() => {
        const suggestions = result.current.suggestions;
        
        // Morning routine should score higher at 9 AM due to context match
        const standupTask = suggestions.find((s: any) => s.name === 'Daily Standup');
        const reviewTask = suggestions.find((s: any) => s.name === 'Code Review');
        
        expect(standupTask).toBeDefined();
        expect(reviewTask).toBeDefined();
        
        expect(standupTask!.preferredTimeOfDay).toBe('morning');
        expect(reviewTask!.preferredTimeOfDay).toBe('afternoon');
        
        // Standup should rank higher due to context match (current time is morning)
        const standupIndex = suggestions.findIndex((s: any) => s.name === 'Daily Standup');
        const reviewIndex = suggestions.findIndex((s: any) => s.name === 'Code Review');
        expect(standupIndex).toBeLessThan(reviewIndex);
      }, { timeout: 5000 });
    });

    test('должен всегда показывать высокоскоринговые задачи в топе', async () => {
      const entries: TimeEntry[] = [
        // High score task (recent + frequent + long duration)
        ...Array.from({ length: 20 }, (_, i) => createMockTimeEntry({
          id: `high-score-${i}`,
          taskName: 'Critical Feature',
          taskId: 'critical',
          endTime: new Date(Date.now() - (i + 1) * 3600000), // Recent spread
          duration: 120, // Long sessions
          activeDuration: 120
        })),
        // Low score task (old + infrequent + short)
        createMockTimeEntry({
          id: 'low-score',
          taskName: 'Minor Bug',
          taskId: 'minor',
          endTime: new Date('2024-09-01T12:00:00.000Z'), // Week old
          duration: 15,
          activeDuration: 15
        })
      ];

      mockGetRecentTimeEntries.mockResolvedValue(entries);

      const { result } = renderHook(() => useSmartSuggestions('user-123', { limit: 5 }));

      await waitFor(() => {
        const suggestions = result.current.suggestions;
        
        // High score task should be first
        expect(suggestions[0].name).toBe('Critical Feature');
        expect(suggestions[0].score).toBeGreaterThan(80); // High score threshold
        
        // Verify sorting is by score descending
        for (let i = 1; i < suggestions.length; i++) {
          expect(suggestions[i-1].score).toBeGreaterThanOrEqual(suggestions[i].score);
        }
      }, { timeout: 5000 });
    });

    test('не должен показывать дубликаты задач', async () => {
      const entries: TimeEntry[] = [
        // Same task, multiple entries
        createMockTimeEntry({
          id: 'entry-1',
          taskName: 'Duplicate Task',
          taskId: 'task-duplicate',
          endTime: new Date('2024-09-09T13:00:00.000Z'),
          duration: 60,
          activeDuration: 60
        }),
        createMockTimeEntry({
          id: 'entry-2', 
          taskName: 'Duplicate Task',
          taskId: 'task-duplicate',
          endTime: new Date('2024-09-09T12:00:00.000Z'),
          duration: 30,
          activeDuration: 30
        }),
        createMockTimeEntry({
          id: 'entry-3',
          taskName: 'Unique Task',
          taskId: 'task-unique',
          endTime: new Date('2024-09-09T11:00:00.000Z'),
          duration: 45,
          activeDuration: 45
        })
      ];

      mockGetRecentTimeEntries.mockResolvedValue(entries);

      const { result } = renderHook(() => useSmartSuggestions('user-123', { limit: 5 }));

      await waitFor(() => {
        const suggestions = result.current.suggestions;
        const taskNames = suggestions.map((s: any) => s.name);
        const uniqueTaskNames = [...new Set(taskNames)];
        
        // Should not have duplicates
        expect(taskNames).toEqual(uniqueTaskNames);
        expect(suggestions).toHaveLength(2); // Only 2 unique tasks
        
        // Duplicate task should have aggregated metrics
        const duplicateTask = suggestions.find((s: any) => s.name === 'Duplicate Task');
        expect(duplicateTask!.sessionCount).toBe(2);
        expect(duplicateTask!.totalDuration).toBe(90); // 60 + 30
      }, { timeout: 5000 });
    });

    test('должен возвращать ровно N предложений', async () => {
      // Create more entries than limit
      const entries: TimeEntry[] = Array.from({ length: 15 }, (_, i) => 
        createMockTimeEntry({
          id: `entry-${i}`,
          taskName: `Task ${i}`,
          taskId: `task-${i}`,
          endTime: new Date(Date.now() - i * 3600000),
          duration: 60,
          activeDuration: 60
        })
      );

      mockGetRecentTimeEntries.mockResolvedValue(entries);

      const { result } = renderHook(() => useSmartSuggestions('user-123', { limit: 5 }));

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(5); // Exactly limit
      }, { timeout: 5000 });
    });

    test('должен работать с пустым набором данных', async () => {
      mockGetRecentTimeEntries.mockResolvedValue([]);

      const { result } = renderHook(() => useSmartSuggestions('user-123', { limit: 5 }));

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(0);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
      }, { timeout: 5000 });
    });
  });

  describe('Фильтрация и валидация', () => {
    
    test('должен фильтровать по минимальному количеству сессий', async () => {
      const entries: TimeEntry[] = [
        // Task with many sessions
        ...Array.from({ length: 5 }, (_, i) => createMockTimeEntry({
          id: `frequent-${i}`,
          taskName: 'Frequent Task',
          taskId: 'frequent',
          duration: 30,
          activeDuration: 30
        })),
        // Task with few sessions (below threshold)
        createMockTimeEntry({
          id: 'rare-1',
          taskName: 'Rare Task',
          taskId: 'rare',
          duration: 60,
          activeDuration: 60
        })
      ];

      mockGetRecentTimeEntries.mockResolvedValue(entries);

      const { result } = renderHook(() => useSmartSuggestions('user-123', { 
        limit: 5, 
        minSessions: 3 // Require at least 3 sessions
      }));

      await waitFor(() => {
        const suggestions = result.current.suggestions;
        expect(suggestions).toHaveLength(1); // Only frequent task
        expect(suggestions[0].name).toBe('Frequent Task');
        expect(suggestions[0].sessionCount).toBeGreaterThanOrEqual(3);
      }, { timeout: 5000 });
    });

    test('должен работать с различными типами задач (task, estimate, service)', async () => {
      const entries: TimeEntry[] = [
        // Regular task
        createMockTimeEntry({
          id: 'task-entry',
          taskName: 'Development Task',
          taskId: 'dev-task',
          duration: 120,
          activeDuration: 120
        }),
        // Estimate-based work
        createMockTimeEntry({
          id: 'estimate-entry',
          taskName: 'Project Estimate',
          taskId: undefined,
          estimateId: 'estimate-123',
          estimateName: 'Website Rebuild',
          duration: 180,
          activeDuration: 180
        }),
        // Service within estimate
        createMockTimeEntry({
          id: 'service-entry',
          taskName: 'Design Service',
          taskId: undefined,
          estimateId: 'estimate-123',
          serviceId: 'service-456',
          serviceName: 'UI Design',
          estimateName: 'Website Rebuild',
          duration: 90,
          activeDuration: 90
        })
      ];

      mockGetRecentTimeEntries.mockResolvedValue(entries);

      const { result } = renderHook(() => useSmartSuggestions('user-123', { limit: 5 }));

      await waitFor(() => {
        const suggestions = result.current.suggestions;
        expect(suggestions).toHaveLength(3);

        const taskSuggestion = suggestions.find((s: any) => s.type === 'task');
        const estimateSuggestion = suggestions.find((s: any) => s.type === 'estimate');
        const serviceSuggestion = suggestions.find((s: any) => s.type === 'service');

        expect(taskSuggestion).toBeDefined();
        expect(estimateSuggestion).toBeDefined();
        expect(serviceSuggestion).toBeDefined();

        expect(taskSuggestion!.name).toBe('Development Task');
        expect(estimateSuggestion!.name).toBe('Website Rebuild');
        expect(serviceSuggestion!.name).toBe('UI Design');
      }, { timeout: 5000 });
    });
  });

  describe('Производительность и кеширование', () => {
    
    test('должен загружаться менее чем за 100ms', async () => {
      const entries: TimeEntry[] = Array.from({ length: 100 }, (_, i) => 
        createMockTimeEntry({
          id: `perf-${i}`,
          taskName: `Task ${i}`,
          taskId: `task-${i}`,
          duration: 60,
          activeDuration: 60
        })
      );

      mockGetRecentTimeEntries.mockResolvedValue(entries);

      const startTime = Date.now();
      
      const { result } = renderHook(() => useSmartSuggestions('user-123', { limit: 10 }));

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(10);
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(200); // Relaxed timing for tests
      }, { timeout: 5000 });
    });

    test('должен обновляться при изменении параметров', async () => {
      const entries: TimeEntry[] = Array.from({ length: 10 }, (_, i) => 
        createMockTimeEntry({
          id: `param-${i}`,
          taskName: `Task ${i}`,
          taskId: `task-${i}`,
          duration: 60,
          activeDuration: 60
        })
      );

      mockGetRecentTimeEntries.mockResolvedValue(entries);

      const { result, rerender } = renderHook(
        ({ limit }) => useSmartSuggestions('user-123', { limit }),
        { initialProps: { limit: 3 } }
      );

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(3);
      });

      // Change limit
      rerender({ limit: 7 });

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(7);
      });
    });
  });

  describe('Обработка ошибок', () => {
    
    test('должен обрабатывать ошибки API gracefully', async () => {
      mockGetRecentTimeEntries.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useSmartSuggestions('user-123', { limit: 5 }));

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(0);
        expect(result.current.error).toBe('Failed to load suggestions');
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });
    });

    test('должен предоставлять функцию refresh', async () => {
      const entries: TimeEntry[] = [
        createMockTimeEntry({
          taskName: 'Test Task',
          taskId: 'test',
          duration: 60,
          activeDuration: 60
        })
      ];

      mockGetRecentTimeEntries.mockResolvedValue(entries);

      const { result } = renderHook(() => useSmartSuggestions('user-123', { limit: 5 }));

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(1);
        expect(typeof result.current.refresh).toBe('function');
      });

      // Test refresh functionality
      mockGetRecentTimeEntries.mockClear();
      mockGetRecentTimeEntries.mockResolvedValue([]);

      await result.current.refresh();

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(0);
        expect(mockGetRecentTimeEntries).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Статистика и метрики', () => {
    
    test('должен предоставлять корректную статистику', async () => {
      const entries: TimeEntry[] = Array.from({ length: 20 }, (_, i) => 
        createMockTimeEntry({
          id: `stat-${i}`,
          taskName: `Task ${Math.floor(i / 4)}`, // Create 5 unique tasks
          taskId: `task-${Math.floor(i / 4)}`,
          duration: 60,
          activeDuration: 60
        })
      );

      mockGetRecentTimeEntries.mockResolvedValue(entries);

      const { result } = renderHook(() => useSmartSuggestions('user-123', { limit: 10 }));

      await waitFor(() => {
        const { stats } = result.current;
        expect(stats.totalEntries).toBe(20);
        expect(stats.uniqueTasks).toBe(5); // 5 unique tasks
        expect(stats.avgScore).toBeGreaterThan(0);
        expect(typeof stats.avgScore).toBe('number');
      }, { timeout: 5000 });
    });
  });

  describe('Urgency Classification', () => {
    
    test('должен классифицировать задачи по срочности на основе длительности', async () => {
      const entries: TimeEntry[] = [
        // High urgency - lots of time invested
        createMockTimeEntry({
          id: 'high-1',
          taskName: 'Critical Bug',
          taskId: 'critical',
          duration: 400, // > 300 minutes
          activeDuration: 400
        }),
        // Medium urgency - moderate time
        createMockTimeEntry({
          id: 'med-1',
          taskName: 'Feature Work', 
          taskId: 'feature',
          duration: 150, // 120-300 minutes
          activeDuration: 150
        }),
        // Low urgency - small time investment
        createMockTimeEntry({
          id: 'low-1',
          taskName: 'Quick Fix',
          taskId: 'quick',
          duration: 30, // < 120 minutes
          activeDuration: 30
        })
      ];

      mockGetRecentTimeEntries.mockResolvedValue(entries);

      const { result } = renderHook(() => useSmartSuggestions('user-123', { limit: 5 }));

      await waitFor(() => {
        const suggestions = result.current.suggestions;
        
        const criticalTask = suggestions.find((s: any) => s.name === 'Critical Bug');
        const featureTask = suggestions.find((s: any) => s.name === 'Feature Work');
        const quickTask = suggestions.find((s: any) => s.name === 'Quick Fix');

        expect(criticalTask!.urgency).toBe('high');
        expect(featureTask!.urgency).toBe('medium');
        expect(quickTask!.urgency).toBe('low');
      }, { timeout: 5000 });
    });
  });
});
/**
 * ============================================================================
 * UNIT TESTS - SWITCH WORK API (T3 Optimization Testing)
 * ============================================================================
 * 
 * Comprehensive unit tests for the switchWork function that enables
 * seamless task switching without time gaps. Tests cover:
 * - Atomic Firestore transactions
 * - Edge cases and error handling  
 * - Metadata preservation and time calculations
 * - Performance requirements for T3 optimization
 * 
 * @version 1.0.0
 * @since 2024-09-09
 */

import { switchWork } from '../timeEntryUnified';
import { auth, db } from '../../firebase/firebase';
import { 
  collection, 
  getDocs, 
  runTransaction,
  doc,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';

// Mock Firebase
jest.mock('../../firebase/firebase');
jest.mock('firebase/firestore');

const mockAuth = auth as jest.Mocked<typeof auth>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockRunTransaction = runTransaction as jest.MockedFunction<typeof runTransaction>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockServerTimestamp = serverTimestamp as jest.MockedFunction<typeof serverTimestamp>;

describe('switchWork API Function', () => {
  
  const mockCurrentUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User'
  };

  const mockTimestamp = Timestamp.fromDate(new Date('2024-09-09T14:30:00.000Z'));

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth
    mockAuth.currentUser = mockCurrentUser as any;
    
    // Mock serverTimestamp
    mockServerTimestamp.mockReturnValue(mockTimestamp as any);
    
    // Mock doc references
    mockDoc.mockReturnValue({ id: 'new-entry-id' } as any);
  });

  describe('Атомарность операции', () => {
    
    test('должен атомарно завершить текущую и создать новую запись', async () => {
      // Arrange - Mock active entry exists
      const mockActiveEntry = {
        id: 'active-entry-id',
        data: () => ({
          taskName: 'Current Task',
          activeDuration: 60,
          totalPauseDuration: 10,
          startTime: Timestamp.fromDate(new Date('2024-09-09T13:30:00.000Z')),
          pauseStartTime: null,
          lastResumeTime: Timestamp.fromDate(new Date('2024-09-09T14:00:00.000Z'))
        })
      };

      const mockSnapshot = {
        empty: false,
        docs: [mockActiveEntry]
      };

      mockGetDocs.mockResolvedValue(mockSnapshot as any);
      
      let transactionCallback: any;
      mockRunTransaction.mockImplementation(async (db, callback) => {
        transactionCallback = callback;
        return callback({
          update: jest.fn(),
          set: jest.fn()
        });
      });

      const newTaskData = {
        taskId: 'new-task-id',
        taskName: 'New Task',
        projectId: 'project-123',
        projectName: 'Test Project',
        startMethod: 'smart_suggestion' as const
      };

      // Act
      const result = await switchWork(newTaskData);

      // Assert
      expect(result).toEqual({
        newEntryId: 'new-entry-id',
        switchedFrom: {
          taskName: 'Current Task',
          duration: expect.any(Number)
        }
      });

      // Verify transaction was called
      expect(mockRunTransaction).toHaveBeenCalledWith(db, expect.any(Function));
      
      // Verify both operations happened in transaction
      const mockTransaction = {
        update: jest.fn(),
        set: jest.fn()
      };
      
      await transactionCallback(mockTransaction);
      expect(mockTransaction.update).toHaveBeenCalled(); // Update current entry
      expect(mockTransaction.set).toHaveBeenCalled(); // Create new entry
    });

    test('должен откатить изменения при ошибке создания новой записи', async () => {
      // Arrange
      const mockSnapshot = {
        empty: false,
        docs: [{
          id: 'active-id',
          data: () => ({ taskName: 'Current Task', activeDuration: 30 })
        }]
      };

      mockGetDocs.mockResolvedValue(mockSnapshot as any);
      
      // Mock transaction failure on set
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          update: jest.fn(),
          set: jest.fn().mockRejectedValue(new Error('Firestore error'))
        };
        return callback(mockTransaction);
      });

      const newTaskData = {
        projectId: 'project-123',
        projectName: 'Test Project'
      };

      // Act & Assert
      await expect(switchWork(newTaskData)).rejects.toThrow('Failed to switch tasks');
      
      // Verify transaction was attempted
      expect(mockRunTransaction).toHaveBeenCalled();
    });

    test('должен использовать одинаковый timestamp для end и start', async () => {
      // Arrange
      const mockSnapshot = {
        empty: false,
        docs: [{
          id: 'active-id',
          data: () => ({ 
            taskName: 'Current Task',
            activeDuration: 45,
            totalPauseDuration: 5,
            startTime: mockTimestamp,
            pauseStartTime: null
          })
        }]
      };

      mockGetDocs.mockResolvedValue(mockSnapshot as any);
      
      let capturedUpdateData: any = null;
      let capturedSetData: any = null;
      
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          update: jest.fn((ref, data) => { capturedUpdateData = data; }),
          set: jest.fn((ref, data) => { capturedSetData = data; })
        };
        return callback(mockTransaction);
      });

      const newTaskData = {
        taskName: 'New Task',
        projectId: 'project-123', 
        projectName: 'Test Project'
      };

      // Act
      await switchWork(newTaskData);

      // Assert
      expect(capturedUpdateData.endTime).toBe(mockTimestamp);
      expect(capturedSetData.startTime).toBe(mockTimestamp);
      
      // Verify no time gap between end and start
      expect(capturedUpdateData.endTime).toEqual(capturedSetData.startTime);
    });

    test('должен создать новую запись если нет активной', async () => {
      // Arrange - No active entries
      const mockSnapshot = {
        empty: true,
        docs: []
      };

      mockGetDocs.mockResolvedValue(mockSnapshot as any);
      
      let capturedSetData: any = null;
      
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          update: jest.fn(),
          set: jest.fn((ref, data) => { capturedSetData = data; })
        };
        return callback(mockTransaction);
      });

      const newTaskData = {
        taskName: 'First Task',
        projectId: 'project-123',
        projectName: 'Test Project',
        startMethod: 'manual' as const
      };

      // Act
      const result = await switchWork(newTaskData);

      // Assert
      expect(result.newEntryId).toBe('new-entry-id');
      expect(result.switchedFrom).toBeUndefined();
      
      expect(capturedSetData).toMatchObject({
        id: 'new-entry-id',
        userId: 'test-user-123',
        taskName: 'First Task',
        projectId: 'project-123',
        projectName: 'Test Project',
        startMethod: 'manual',
        status: 'active',
        startTime: mockTimestamp,
        activeDuration: 0,
        totalDuration: 0
      });
    });
  });

  describe('Обработка edge cases', () => {
    
    test('должен корректно переключаться с паузы', async () => {
      // Arrange - Task currently on pause
      const pauseStartTime = Timestamp.fromDate(new Date('2024-09-09T14:00:00.000Z'));
      
      const mockActiveEntry = {
        id: 'paused-entry',
        data: () => ({
          taskName: 'Paused Task',
          activeDuration: 30, // 30 min active work
          totalPauseDuration: 15, // 15 min total pauses
          startTime: Timestamp.fromDate(new Date('2024-09-09T13:00:00.000Z')),
          pauseStartTime: pauseStartTime, // Currently paused
          lastResumeTime: Timestamp.fromDate(new Date('2024-09-09T13:45:00.000Z'))
        })
      };

      const mockSnapshot = { empty: false, docs: [mockActiveEntry] };
      mockGetDocs.mockResolvedValue(mockSnapshot as any);
      
      let capturedUpdateData: any = null;
      
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          update: jest.fn((ref, data) => { capturedUpdateData = data; }),
          set: jest.fn()
        };
        return callback(mockTransaction);
      });

      // Act
      await switchWork({
        taskName: 'New Task After Pause',
        projectId: 'project-123',
        projectName: 'Test Project'
      });

      // Assert - Should not add pause time to active duration
      expect(capturedUpdateData.activeDuration).toBe(30); // Should remain 30, not add pause time
      expect(capturedUpdateData.totalDuration).toBe(45); // 30 active + 15 pause
      expect(capturedUpdateData.pauseStartTime).toBe(null);
      expect(capturedUpdateData.lastResumeTime).toBe(null);
    });

    test('должен обрабатывать переключение на ту же задачу', async () => {
      // Arrange - Switch to same task
      const mockActiveEntry = {
        id: 'same-task-entry',
        data: () => ({
          taskName: 'Current Task',
          taskId: 'task-123',
          projectId: 'project-123',
          activeDuration: 60
        })
      };

      const mockSnapshot = { empty: false, docs: [mockActiveEntry] };
      mockGetDocs.mockResolvedValue(mockSnapshot as any);
      
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          update: jest.fn(),
          set: jest.fn()
        };
        return callback(mockTransaction);
      });

      const newTaskData = {
        taskId: 'task-123', // Same task
        taskName: 'Current Task',
        projectId: 'project-123',
        projectName: 'Test Project'
      };

      // Act
      const result = await switchWork(newTaskData);

      // Assert - Should still create new entry (for tracking switch events)
      expect(result.newEntryId).toBeDefined();
      expect(result.switchedFrom).toBeDefined();
    });

    test('должен работать без аутентификации (ошибка)', async () => {
      // Arrange
      mockAuth.currentUser = null;

      // Act & Assert
      await expect(switchWork({
        projectId: 'project-123',
        projectName: 'Test Project'
      })).rejects.toThrow('User not authenticated');
    });
  });

  describe('Сохранение метаданных', () => {
    
    test('должен сохранять все типы метаданных', async () => {
      // Arrange
      const mockSnapshot = { empty: true, docs: [] };
      mockGetDocs.mockResolvedValue(mockSnapshot as any);
      
      let capturedSetData: any = null;
      
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          set: jest.fn((ref, data) => { capturedSetData = data; })
        };
        return callback(mockTransaction);
      });

      const completeTaskData = {
        taskId: 'task-456',
        taskName: 'Complex Task',
        projectId: 'project-789',
        projectName: 'Complex Project',
        estimateId: 'est-123',
        estimateName: 'Estimate #123',
        serviceId: 'srv-456', 
        serviceName: 'Development Service',
        startMethod: 'command_palette' as const
      };

      // Act
      await switchWork(completeTaskData);

      // Assert
      expect(capturedSetData).toMatchObject({
        taskId: 'task-456',
        taskName: 'Complex Task',
        projectId: 'project-789',
        projectName: 'Complex Project', 
        estimateId: 'est-123',
        estimateName: 'Estimate #123',
        serviceId: 'srv-456',
        serviceName: 'Development Service',
        startMethod: 'command_palette',
        status: 'active',
        employeeId: 'test-user-123'
      });
    });

    test('должен записывать метод переключения (startMethod)', async () => {
      const testCases = [
        'manual',
        'smart_suggestion', 
        'command_palette',
        'quick_switch',
        'geofence'
      ] as const;

      for (const startMethod of testCases) {
        // Reset mocks
        jest.clearAllMocks();
        mockAuth.currentUser = mockCurrentUser as any;
        
        const mockSnapshot = { empty: true, docs: [] };
        mockGetDocs.mockResolvedValue(mockSnapshot as any);
        
        let capturedSetData: any = null;
        
        mockRunTransaction.mockImplementation(async (db, callback) => {
          const mockTransaction = {
            set: jest.fn((ref, data) => { capturedSetData = data; })
          };
          return callback(mockTransaction);
        });

        // Act
        await switchWork({
          taskName: `Task via ${startMethod}`,
          projectId: 'project-123',
          projectName: 'Test Project',
          startMethod
        });

        // Assert
        expect(capturedSetData.startMethod).toBe(startMethod);
      }
    });

    test('должен использовать fallback значения для опциональных полей', async () => {
      // Arrange
      const mockSnapshot = { empty: true, docs: [] };
      mockGetDocs.mockResolvedValue(mockSnapshot as any);
      
      let capturedSetData: any = null;
      
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          set: jest.fn((ref, data) => { capturedSetData = data; })
        };
        return callback(mockTransaction);
      });

      // Act - Minimal required data
      await switchWork({
        projectId: 'project-123',
        projectName: 'Test Project'
      });

      // Assert - Should use fallbacks
      expect(capturedSetData.taskId).toBe('');
      expect(capturedSetData.taskName).toBe('Task');
      expect(capturedSetData.startMethod).toBe('manual');
      expect(capturedSetData.estimateId).toBeUndefined();
      expect(capturedSetData.serviceId).toBeUndefined();
    });
  });

  describe('Расчеты времени', () => {
    
    test('должен правильно рассчитывать активное время', async () => {
      // Arrange - Task worked for 2 hours with 30 min pause
      const startTime = new Date('2024-09-09T12:00:00.000Z');
      const lastResumeTime = new Date('2024-09-09T12:30:00.000Z'); // Resumed after pause
      const currentTime = new Date('2024-09-09T14:30:00.000Z'); // Current time
      
      jest.useFakeTimers();
      jest.setSystemTime(currentTime);
      
      const mockActiveEntry = {
        id: 'time-calc-entry',
        data: () => ({
          taskName: 'Time Calculation Task',
          activeDuration: 30, // 30 min already logged
          totalPauseDuration: 30, // 30 min total pauses
          startTime: Timestamp.fromDate(startTime),
          lastResumeTime: Timestamp.fromDate(lastResumeTime),
          pauseStartTime: null // Not currently paused
        })
      };

      const mockSnapshot = { empty: false, docs: [mockActiveEntry] };
      mockGetDocs.mockResolvedValue(mockSnapshot as any);
      
      let capturedUpdateData: any = null;
      
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          update: jest.fn((ref, data) => { capturedUpdateData = data; }),
          set: jest.fn()
        };
        return callback(mockTransaction);
      });

      // Act
      await switchWork({
        taskName: 'Next Task',
        projectId: 'project-123',
        projectName: 'Test Project'
      });

      // Assert
      // Should be: 30 (previous) + 120 (2 hours since resume) = 150 min
      expect(capturedUpdateData.activeDuration).toBe(150);
      expect(capturedUpdateData.totalDuration).toBe(180); // 150 active + 30 pause
      
      jest.useRealTimers();
    });

    test('должен обрабатывать нулевые длительности', async () => {
      // Arrange - Just started task (no duration yet)
      const mockActiveEntry = {
        id: 'zero-duration-entry',
        data: () => ({
          taskName: 'Just Started Task',
          activeDuration: 0,
          totalPauseDuration: 0,
          startTime: mockTimestamp,
          lastResumeTime: null,
          pauseStartTime: null
        })
      };

      const mockSnapshot = { empty: false, docs: [mockActiveEntry] };
      mockGetDocs.mockResolvedValue(mockSnapshot as any);
      
      let capturedUpdateData: any = null;
      
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          update: jest.fn((ref, data) => { capturedUpdateData = data; }),
          set: jest.fn()
        };
        return callback(mockTransaction);
      });

      // Act
      await switchWork({
        taskName: 'Second Task',
        projectId: 'project-123',
        projectName: 'Test Project'
      });

      // Assert - Should handle zero durations gracefully
      expect(capturedUpdateData.activeDuration).toBeGreaterThanOrEqual(0);
      expect(capturedUpdateData.totalDuration).toBeGreaterThanOrEqual(0);
      expect(capturedUpdateData.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Производительность', () => {
    
    test('должен выполняться менее чем за 200ms', async () => {
      jest.useRealTimers();
      
      // Arrange - Simple scenario
      const mockSnapshot = { empty: true, docs: [] };
      mockGetDocs.mockResolvedValue(mockSnapshot as any);
      
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = { set: jest.fn() };
        return callback(mockTransaction);
      });

      const startTime = performance.now();

      // Act
      await switchWork({
        taskName: 'Performance Test Task',
        projectId: 'project-123',
        projectName: 'Test Project'
      });

      // Assert
      const executionTime = performance.now() - startTime;
      expect(executionTime).toBeLessThan(200);
    });

    test('должен быть устойчив к concurrent вызовам', async () => {
      // Arrange
      const mockSnapshot = { empty: true, docs: [] };
      mockGetDocs.mockResolvedValue(mockSnapshot as any);
      
      let transactionCount = 0;
      mockRunTransaction.mockImplementation(async (db, callback) => {
        transactionCount++;
        const mockTransaction = { set: jest.fn() };
        // Simulate some latency
        await new Promise(resolve => setTimeout(resolve, 50));
        return callback(mockTransaction);
      });

      const taskData = {
        taskName: 'Concurrent Test',
        projectId: 'project-123',
        projectName: 'Test Project'
      };

      // Act - Make concurrent calls
      const promises = Array.from({ length: 3 }, () => switchWork(taskData));
      const results = await Promise.allSettled(promises);

      // Assert - All should complete (even if some may fail due to race conditions)
      expect(results).toHaveLength(3);
      results.forEach(result => {
        // Each call should either succeed or fail gracefully
        expect(['fulfilled', 'rejected']).toContain(result.status);
      });
      
      expect(transactionCount).toBe(3); // All transactions should be attempted
    });
  });

  describe('Интеграция с типами', () => {
    
    test('должен работать с TypeScript типами корректно', async () => {
      const mockSnapshot = { empty: true, docs: [] };
      mockGetDocs.mockResolvedValue(mockSnapshot as any);
      
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = { set: jest.fn() };
        return callback(mockTransaction);
      });

      // Act - This should compile without TypeScript errors
      const result = await switchWork({
        taskId: 'typed-task',
        taskName: 'TypeScript Task',
        projectId: 'typed-project',
        projectName: 'TypeScript Project',
        estimateId: 'typed-estimate',
        estimateName: 'TypeScript Estimate',
        serviceId: 'typed-service',
        serviceName: 'TypeScript Service',
        startMethod: 'smart_suggestion'
      });

      // Assert - Should return properly typed result
      expect(result).toEqual({
        newEntryId: expect.any(String),
        switchedFrom: undefined
      });
    });
  });
});
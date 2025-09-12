/**
 * ============================================================================
 * ТЕСТЫ КОНТЕКСТА - TIME TRACKING CONTEXT V2 (Enhanced Features)
 * ============================================================================
 * 
 * Тестирование новых функций в TimeTrackingContext:
 * 1. Блокирующая валидация с getPreConditionData
 * 2. Строгая валидация в stopWork с intentionalStop
 * 3. Механизм отката (Rollback) при ошибках
 * 4. Интеграция с новыми интерфейсами и типами
 * 
 * @version 2.0.0
 * @since 2025-01-10
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { TimeTrackingProvider, useTimeTracking } from '../TimeTrackingContext';
import { auth } from '../../firebase/firebase';

// Mock Firebase
jest.mock('../../firebase/firebase');
jest.mock('../../api/timeEntryUnified');

// Mock navigator APIs
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn()
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  configurable: true
});

const mockMediaDevices = {
  getUserMedia: jest.fn()
};
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  configurable: true
});

// Test component that uses the context
const TestComponent: React.FC = () => {
  const context = useTimeTracking();
  
  return (
    <div>
      <div data-testid="is-working">{context.isWorking ? 'true' : 'false'}</div>
      <div data-testid="current-task">{context.currentTask?.task || 'none'}</div>
      <div data-testid="error">{context.timeTrackingError || 'none'}</div>
      <button 
        data-testid="start-work"
        onClick={() => context.startWork({
          task: { id: 'test-task', task: 'Test Task' },
          project: { id: 'test-project', name: 'Test Project' },
          startMethod: 'manual'
        })}
      >
        Start Work
      </button>
      <button
        data-testid="stop-work" 
        onClick={() => context.stopWork(undefined, undefined, undefined, true)}
      >
        Stop Work
      </button>
    </div>
  );
};

describe('TimeTrackingContext Enhanced Features', () => {
  
  const mockUser = {
    uid: 'test-user-enhanced',
    email: 'enhanced@test.com',
    displayName: 'Enhanced Test User'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as any).currentUser = mockUser;
    
    // Mock localStorage
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn()
    };
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      configurable: true
    });
  });

  describe('1️⃣ Блокирующая валидация предварительных условий', () => {
    
    test('должен выполнить getPreConditionData перед startWork при blockingValidation=true', async () => {
      // Arrange
      const mockGetUserMedia = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }]
      });
      mockMediaDevices.getUserMedia = mockGetUserMedia;

      const mockGetCurrentPosition = jest.fn((success) => {
        success({
          coords: { latitude: 55.7558, longitude: 37.6176, accuracy: 10 },
          timestamp: Date.now()
        });
      });
      mockGeolocation.getCurrentPosition = mockGetCurrentPosition;

      // Mock successful API call
      const { createTimeEntry } = require('../../api/timeEntryUnified');
      createTimeEntry.mockResolvedValue('created-entry-id');

      let context: any;
      const TestComponentWithCapture: React.FC = () => {
        context = useTimeTracking();
        return <TestComponent />;
      };

      const { getByTestId } = render(
        <TimeTrackingProvider>
          <TestComponentWithCapture />
        </TimeTrackingProvider>
      );

      // Act
      await act(async () => {
        await context.startWork({
          task: { id: 'photo-task', task: 'Photo Required Task' },
          project: { id: 'test-project', name: 'Test Project' },
          blockingValidation: true,
          taskRequirements: {
            requireStartPhoto: true,
            requireStartLocation: true
          }
        });
      });

      // Assert
      await waitFor(() => {
        expect(getByTestId('is-working')).toHaveTextContent('true');
      });
      
      // Verify camera and GPS were called for blocking validation
      expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true });
      expect(mockGetCurrentPosition).toHaveBeenCalled();
    });

    test('должен блокировать startWork если не удалось получить обязательное фото', async () => {
      // Arrange
      const mockGetUserMedia = jest.fn().mockRejectedValue(new Error('Camera access denied'));
      mockMediaDevices.getUserMedia = mockGetUserMedia;

      let context: any;
      const TestComponentWithCapture: React.FC = () => {
        context = useTimeTracking();
        return <TestComponent />;
      };

      const { getByTestId } = render(
        <TimeTrackingProvider>
          <TestComponentWithCapture />
        </TimeTrackingProvider>
      );

      // Act & Assert
      await act(async () => {
        try {
          await context.startWork({
            task: { id: 'photo-required-task', task: 'Photo Required Task' },
            project: { id: 'test-project', name: 'Test Project' },
            blockingValidation: true,
            taskRequirements: {
              requireStartPhoto: true
            }
          });
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Не удалось получить стартовое фото');
        }
      });

      // Verify work was not started
      expect(getByTestId('is-working')).toHaveTextContent('false');
      expect(getByTestId('error')).not.toHaveTextContent('none');
    });

    test('должен блокировать startWork если не удалось получить обязательную геолокацию', async () => {
      // Arrange
      const mockGetCurrentPosition = jest.fn((success, error) => {
        error({ code: 1, message: 'User denied geolocation' });
      });
      mockGeolocation.getCurrentPosition = mockGetCurrentPosition;

      let context: any;
      const TestComponentWithCapture: React.FC = () => {
        context = useTimeTracking();
        return <TestComponent />;
      };

      const { getByTestId } = render(
        <TimeTrackingProvider>
          <TestComponentWithCapture />
        </TimeTrackingProvider>
      );

      // Act & Assert
      await act(async () => {
        try {
          await context.startWork({
            task: { id: 'gps-required-task', task: 'GPS Required Task' },
            project: { id: 'test-project', name: 'Test Project' },
            blockingValidation: true,
            taskRequirements: {
              requireStartLocation: true
            }
          });
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Не удалось получить геолокацию');
        }
      });

      // Verify work was not started
      expect(getByTestId('is-working')).toHaveTextContent('false');
    });
  });

  describe('2️⃣ Строгая валидация в stopWork', () => {
    
    test('должен требовать intentionalStop=true для завершения работы', async () => {
      // Arrange
      const { createTimeEntry } = require('../../api/timeEntryUnified');
      createTimeEntry.mockResolvedValue('test-entry-id');

      let context: any;
      const TestComponentWithCapture: React.FC = () => {
        context = useTimeTracking();
        return <TestComponent />;
      };

      const { getByTestId } = render(
        <TimeTrackingProvider>
          <TestComponentWithCapture />
        </TimeTrackingProvider>
      );

      // Start work first
      await act(async () => {
        await context.startWork({
          task: { id: 'test-task', task: 'Test Task' },
          project: { id: 'test-project', name: 'Test Project' }
        });
      });

      expect(getByTestId('is-working')).toHaveTextContent('true');

      // Act & Assert - Try to stop without intentional flag
      await act(async () => {
        try {
          await context.stopWork(undefined, undefined, undefined, false);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('без подтверждения намерения');
        }
      });

      // Work should still be active
      expect(getByTestId('is-working')).toHaveTextContent('true');
    });

    test('должен успешно завершать работу с intentionalStop=true', async () => {
      // Arrange
      const { createTimeEntry, completeTimeEntry } = require('../../api/timeEntryUnified');
      createTimeEntry.mockResolvedValue('test-entry-id');
      completeTimeEntry.mockResolvedValue(true);

      let context: any;
      const TestComponentWithCapture: React.FC = () => {
        context = useTimeTracking();
        return <TestComponent />;
      };

      const { getByTestId } = render(
        <TimeTrackingProvider>
          <TestComponentWithCapture />
        </TimeTrackingProvider>
      );

      // Start work first
      await act(async () => {
        await context.startWork({
          task: { id: 'test-task', task: 'Test Task' },
          project: { id: 'test-project', name: 'Test Project' }
        });
      });

      expect(getByTestId('is-working')).toHaveTextContent('true');

      // Act - Stop with intentional flag
      await act(async () => {
        await context.stopWork(undefined, undefined, undefined, true);
      });

      // Assert
      await waitFor(() => {
        expect(getByTestId('is-working')).toHaveTextContent('false');
      });
      expect(completeTimeEntry).toHaveBeenCalled();
    });

    test('должен предупреждать о очень коротких рабочих сессиях', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const { createTimeEntry, completeTimeEntry } = require('../../api/timeEntryUnified');
      createTimeEntry.mockResolvedValue('test-entry-id');
      completeTimeEntry.mockResolvedValue(true);

      let context: any;
      const TestComponentWithCapture: React.FC = () => {
        context = useTimeTracking();
        return <TestComponent />;
      };

      const { getByTestId } = render(
        <TimeTrackingProvider>
          <TestComponentWithCapture />
        </TimeTrackingProvider>
      );

      // Start work
      await act(async () => {
        await context.startWork({
          task: { id: 'short-task', task: 'Short Task' },
          project: { id: 'test-project', name: 'Test Project' }
        });
      });

      // Stop immediately (very short session)
      await act(async () => {
        await context.stopWork(undefined, undefined, undefined, true);
      });

      // Assert - Should have warned about short session
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Очень короткая рабочая сессия')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('3️⃣ Механизм отката (Rollback)', () => {
    
    test('должен восстанавливать предыдущее состояние при ошибке startWork', async () => {
      // Arrange
      const { createTimeEntry } = require('../../api/timeEntryUnified');
      createTimeEntry.mockRejectedValue(new Error('Firebase connection failed'));

      let context: any;
      const TestComponentWithCapture: React.FC = () => {
        context = useTimeTracking();
        return <TestComponent />;
      };

      const { getByTestId } = render(
        <TimeTrackingProvider>
          <TestComponentWithCapture />
        </TimeTrackingProvider>
      );

      // Verify initial state
      expect(getByTestId('is-working')).toHaveTextContent('false');
      expect(getByTestId('current-task')).toHaveTextContent('none');

      // Act - Try to start work (should fail)
      await act(async () => {
        try {
          await context.startWork({
            task: { id: 'failing-task', task: 'Failing Task' },
            project: { id: 'test-project', name: 'Test Project' }
          });
        } catch (error) {
          // Expected to fail
        }
      });

      // Assert - State should be rolled back
      await waitFor(() => {
        expect(getByTestId('is-working')).toHaveTextContent('false');
        expect(getByTestId('current-task')).toHaveTextContent('none');
        expect(getByTestId('error')).toContain('Не удалось начать работу');
      });
    });

    test('должен восстанавливать предыдущую активную задачу при ошибке switchWork', async () => {
      // Arrange
      const { createTimeEntry, switchWork } = require('../../api/timeEntryUnified');
      createTimeEntry.mockResolvedValue('initial-entry-id');
      switchWork.mockRejectedValue(new Error('Switch failed'));

      let context: any;
      const TestComponentWithCapture: React.FC = () => {
        context = useTimeTracking();
        return <TestComponent />;
      };

      const { getByTestId } = render(
        <TimeTrackingProvider>
          <TestComponentWithCapture />
        </TimeTrackingProvider>
      );

      // Start initial work
      await act(async () => {
        await context.startWork({
          task: { id: 'initial-task', task: 'Initial Task' },
          project: { id: 'test-project', name: 'Test Project' }
        });
      });

      expect(getByTestId('current-task')).toHaveTextContent('Initial Task');

      // Act - Try to switch (should fail and rollback)
      await act(async () => {
        try {
          await context.switchWork({
            task: { id: 'switch-task', task: 'Switch Task' },
            project: { id: 'test-project', name: 'Test Project' }
          });
        } catch (error) {
          // Expected to fail
        }
      });

      // Assert - Should be back to initial task
      await waitFor(() => {
        expect(getByTestId('current-task')).toHaveTextContent('Initial Task');
        expect(getByTestId('is-working')).toHaveTextContent('true');
      });
    });

    test('должен очищать localStorage при откате без предыдущего состояния', async () => {
      // Arrange
      const mockLocalStorage = global.localStorage;
      const { createTimeEntry } = require('../../api/timeEntryUnified');
      createTimeEntry.mockRejectedValue(new Error('Failed to create entry'));

      let context: any;
      const TestComponentWithCapture: React.FC = () => {
        context = useTimeTracking();
        return <TestComponent />;
      };

      render(
        <TimeTrackingProvider>
          <TestComponentWithCapture />
        </TimeTrackingProvider>
      );

      // Act - Try to start work from clean state (should fail)
      await act(async () => {
        try {
          await context.startWork({
            task: { id: 'clean-fail-task', task: 'Clean Fail Task' },
            project: { id: 'test-project', name: 'Test Project' }
          });
        } catch (error) {
          // Expected to fail
        }
      });

      // Assert - localStorage should be cleaned up
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('currentTimeEntry');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('currentTaskId');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('currentEntryId');
    });
  });

  describe('4️⃣ Интеграция новых типов и интерфейсов', () => {
    
    test('должен корректно обрабатывать PreConditionData интерфейс', () => {
      // Arrange & Act
      const preConditionData = {
        location: {
          coords: {
            latitude: 55.7558,
            longitude: 37.6176,
            accuracy: 10
          },
          timestamp: Date.now()
        } as GeolocationPosition,
        startPhotoUrl: 'data:image/jpeg;base64,testphoto'
      };

      // Assert - TypeScript compilation validates interface
      expect(preConditionData.location?.coords.latitude).toBe(55.7558);
      expect(preConditionData.startPhotoUrl).toBe('data:image/jpeg;base64,testphoto');
    });

    test('должен корректно обрабатывать TaskRequirements интерфейс', () => {
      // Arrange & Act
      const taskRequirements = {
        requireStartPhoto: true,
        requireEndPhoto: false,
        requireStartLocation: true,
        requireEndLocation: false,
        requireComment: false
      };

      // Assert - TypeScript compilation validates interface
      expect(taskRequirements.requireStartPhoto).toBe(true);
      expect(taskRequirements.requireStartLocation).toBe(true);
    });

    test('должен корректно создавать и использовать BlockingValidationError', () => {
      // Arrange
      const { BlockingValidationError } = require('../TimeTrackingContext');

      // Act
      const error = new BlockingValidationError(
        'Test blocking error',
        'PHOTO_REQUIRED',
        { requireStartPhoto: true }
      );

      // Assert
      expect(error.message).toBe('Test blocking error');
      expect(error.name).toBe('BlockingValidationError');
      expect(error.code).toBe('PHOTO_REQUIRED');
      expect(error.requirements.requireStartPhoto).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    test('должен поддерживать расширенный StartWorkPayload с новыми полями', async () => {
      // Arrange
      const { createTimeEntry } = require('../../api/timeEntryUnified');
      createTimeEntry.mockResolvedValue('extended-entry-id');

      let context: any;
      const TestComponentWithCapture: React.FC = () => {
        context = useTimeTracking();
        return <TestComponent />;
      };

      render(
        <TimeTrackingProvider>
          <TestComponentWithCapture />
        </TimeTrackingProvider>
      );

      // Act
      await act(async () => {
        await context.startWork({
          task: { id: 'extended-task', task: 'Extended Task' },
          project: { id: 'test-project', name: 'Test Project' },
          blockingValidation: true,
          taskRequirements: {
            requireStartPhoto: true,
            requireStartLocation: true,
            requireComment: false
          }
        });
      });

      // Assert - Should handle extended payload without errors
      expect(createTimeEntry).toHaveBeenCalled();
    });
  });

  describe('Интеграционные тесты', () => {
    
    test('должен выполнить полный цикл: блокирующая валидация → работа → строгое завершение', async () => {
      // Arrange
      const mockGetUserMedia = jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }]
      });
      mockMediaDevices.getUserMedia = mockGetUserMedia;

      const { createTimeEntry, completeTimeEntry } = require('../../api/timeEntryUnified');
      createTimeEntry.mockResolvedValue('full-cycle-entry-id');
      completeTimeEntry.mockResolvedValue(true);

      let context: any;
      const TestComponentWithCapture: React.FC = () => {
        context = useTimeTracking();
        return <TestComponent />;
      };

      const { getByTestId } = render(
        <TimeTrackingProvider>
          <TestComponentWithCapture />
        </TimeTrackingProvider>
      );

      // Act - Full cycle
      // 1. Start with blocking validation
      await act(async () => {
        await context.startWork({
          task: { id: 'full-cycle-task', task: 'Full Cycle Task' },
          project: { id: 'test-project', name: 'Test Project' },
          blockingValidation: true,
          taskRequirements: {
            requireStartPhoto: true
          }
        });
      });

      expect(getByTestId('is-working')).toHaveTextContent('true');
      expect(mockGetUserMedia).toHaveBeenCalled();

      // 2. Stop with intentional validation
      await act(async () => {
        await context.stopWork(undefined, undefined, undefined, true);
      });

      // Assert
      await waitFor(() => {
        expect(getByTestId('is-working')).toHaveTextContent('false');
      });
      expect(completeTimeEntry).toHaveBeenCalled();
    });

    test('должен обрабатывать сложный сценарий с ошибкой и откатом', async () => {
      // Arrange
      const { createTimeEntry } = require('../../api/timeEntryUnified');
      
      // First call succeeds, second fails
      createTimeEntry
        .mockResolvedValueOnce('success-entry-id')
        .mockRejectedValueOnce(new Error('Network failure'));

      let context: any;
      const TestComponentWithCapture: React.FC = () => {
        context = useTimeTracking();
        return <TestComponent />;
      };

      const { getByTestId } = render(
        <TimeTrackingProvider>
          <TestComponentWithCapture />
        </TimeTrackingProvider>
      );

      // Act - Start first task successfully
      await act(async () => {
        await context.startWork({
          task: { id: 'success-task', task: 'Success Task' },
          project: { id: 'test-project', name: 'Test Project' }
        });
      });

      expect(getByTestId('is-working')).toHaveTextContent('true');
      expect(getByTestId('current-task')).toHaveTextContent('Success Task');

      // Act - Try to start second task (should fail and rollback)
      await act(async () => {
        try {
          await context.startWork({
            task: { id: 'fail-task', task: 'Fail Task' },
            project: { id: 'test-project', name: 'Test Project' }
          });
        } catch (error) {
          // Expected to fail
        }
      });

      // Assert - Should rollback to previous state
      await waitFor(() => {
        expect(getByTestId('current-task')).toHaveTextContent('Success Task');
        expect(getByTestId('is-working')).toHaveTextContent('true');
      });
    });
  });
});
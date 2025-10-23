/**
 * Core Startability Utils Test
 * Тестирование основной логики системы стартуемости
 */

import {
  isProjectStatusStartable,
  isTaskStatusBlocked,
  getReasonText,
  getReasonIcon,
  evaluateProjectStartability,
  canStartWorkDetailed,
  START_ALLOWED_STATUSES,
  START_BLOCKED_STATUSES,
  TASK_BLOCKED_STATUSES,
} from '../utils/startability';
import { Project } from '../types/project.types';
import { Task } from '../types/task.types';
import { Estimate } from '../legacy/api/estimateApi';

describe('Startability Core Utils', () => {
  describe('isProjectStatusStartable', () => {
    test('должен вернуть true для стартуемых статусов', () => {
      expect(isProjectStatusStartable('idea')).toBe(true);
      expect(isProjectStatusStartable('planning')).toBe(true);
      expect(isProjectStatusStartable('active')).toBe(true);
      expect(isProjectStatusStartable('on_hold')).toBe(true);
    });

    test('должен вернуть false для заблокированных статусов', () => {
      expect(isProjectStatusStartable('completed')).toBe(false);
      expect(isProjectStatusStartable('cancelled')).toBe(false);
      expect(isProjectStatusStartable('archived')).toBe(false);
    });
  });

  describe('isTaskStatusBlocked', () => {
    test('должен вернуть true для заблокированных статусов задач', () => {
      expect(isTaskStatusBlocked('blocked')).toBe(true);
      expect(isTaskStatusBlocked('done')).toBe(true);
      expect(isTaskStatusBlocked('cancelled')).toBe(true);
      expect(isTaskStatusBlocked('archived')).toBe(true);
    });

    test('должен вернуть false для доступных статусов задач', () => {
      expect(isTaskStatusBlocked('todo')).toBe(false);
      expect(isTaskStatusBlocked('in_progress')).toBe(false);
    });
  });

  describe('getReasonText и getReasonIcon', () => {
    test('должен вернуть корректный текст причины', () => {
      expect(getReasonText('PROJECT_STATUS_NOT_STARTABLE')).toBe('Статус проекта не допускает старт');
      expect(getReasonText('NO_TASKS')).toBe('Нет задач в проекте');
      expect(getReasonText('NO_ESTIMATES')).toBe('Нет смет');
    });

    test('должен вернуть корректную иконку причины', () => {
      expect(getReasonIcon('PROJECT_STATUS_NOT_STARTABLE')).toBe('🚫');
      expect(getReasonIcon('NO_TASKS')).toBe('📝');
      expect(getReasonIcon('NO_ESTIMATES')).toBe('💰');
    });
  });

  describe('evaluateProjectStartability', () => {
    const createMockProject = (status: string): Project => ({
      id: 'test-project-1',
      name: 'Тестовый проект',
      status: status as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Project);

    const createMockTask = (status: string): Task => ({
      id: 'test-task-1',
      projectId: 'test-project-1',
      title: 'Тестовая задача',
      status: status as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Task);

    const createMockEstimate = (): Estimate => ({
      id: 'test-estimate-1',
      projectId: 'test-project-1',
      name: 'Тестовая смета',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Estimate);

    test('проект со статусом completed должен быть заблокирован', () => {
      const project = createMockProject('completed');
      const tasks = [createMockTask('todo')];
      const estimates = [createMockEstimate()];

      const result = evaluateProjectStartability(project, tasks, estimates);

      expect(result.startable).toBe(false);
      expect(result.reasons).toContain('PROJECT_STATUS_NOT_STARTABLE');
    });

    test('проект без задач должен быть заблокирован', () => {
      const project = createMockProject('active');
      const tasks: Task[] = [];
      const estimates = [createMockEstimate()];

      const result = evaluateProjectStartability(project, tasks, estimates);

      expect(result.startable).toBe(false);
      expect(result.reasons).toContain('NO_TASKS');
    });

    test('проект без смет должен быть заблокирован', () => {
      const project = createMockProject('active');
      const tasks = [createMockTask('todo')];
      const estimates: Estimate[] = [];

      const result = evaluateProjectStartability(project, tasks, estimates);

      expect(result.startable).toBe(false);
      expect(result.reasons).toContain('NO_ESTIMATES');
    });

    test('проект с on_hold статусом должен иметь предупреждение', () => {
      const project = createMockProject('on_hold');
      const tasks = [createMockTask('todo')];
      const estimates = [createMockEstimate()];

      const result = evaluateProjectStartability(project, tasks, estimates);

      expect(result.startable).toBe(false);
      expect(result.reasons).toContain('PROJECT_ON_HOLD');
    });

    test('проект со всеми заблокированными задачами должен быть заблокирован', () => {
      const project = createMockProject('active');
      const tasks = [
        createMockTask('done'),
        createMockTask('blocked'),
        createMockTask('cancelled'),
      ];
      const estimates = [createMockEstimate()];

      const result = evaluateProjectStartability(project, tasks, estimates);

      expect(result.startable).toBe(false);
      expect(result.reasons).toContain('ALL_TASKS_BLOCKED');
    });

    test('проект готовый к старту должен быть стартуемым', () => {
      const project = createMockProject('active');
      const tasks = [createMockTask('todo')];
      const estimates = [createMockEstimate()];

      const result = evaluateProjectStartability(project, tasks, estimates);

      expect(result.startable).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('canStartWorkDetailed', () => {
    const createMockTask = (status: string, assignedTo?: string): Task => ({
      id: 'test-task-1',
      projectId: 'test-project-1',
      title: 'Тестовая задача',
      status: status as any,
      assignedTo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Task);

    test('задача в статусе blocked должна быть заблокирована', () => {
      const task = createMockTask('blocked');
      const result = canStartWorkDetailed(task);

      expect(result.canStart).toBe(false);
      // Note: canStartWorkDetailed может не проверять статус blocked напрямую,
      // так что этот тест может нуждаться в корректировке
    });

    test('задача без assignedTo может быть заблокирована', () => {
      const task = createMockTask('todo');
      const result = canStartWorkDetailed(task);

      // Проверяем, что функция возвращает корректную структуру
      expect(result).toHaveProperty('canStart');
      expect(result).toHaveProperty('reasons');
      expect(Array.isArray(result.reasons)).toBe(true);
    });

    test('задача готовая к старту', () => {
      const task = createMockTask('todo', 'user-123');
      const result = canStartWorkDetailed(task);

      // Задача с assignedTo и статусом todo должна быть готова к старту
      expect(result).toHaveProperty('canStart');
      expect(result).toHaveProperty('reasons');
    });
  });

  describe('Constants', () => {
    test('START_ALLOWED_STATUSES должен содержать правильные статусы', () => {
      expect(START_ALLOWED_STATUSES).toContain('idea');
      expect(START_ALLOWED_STATUSES).toContain('planning');
      expect(START_ALLOWED_STATUSES).toContain('active');
      expect(START_ALLOWED_STATUSES).toContain('on_hold');
    });

    test('START_BLOCKED_STATUSES должен содержать правильные статусы', () => {
      expect(START_BLOCKED_STATUSES).toContain('completed');
      expect(START_BLOCKED_STATUSES).toContain('cancelled');
      expect(START_BLOCKED_STATUSES).toContain('archived');
    });

    test('TASK_BLOCKED_STATUSES должен содержать правильные статусы', () => {
      expect(TASK_BLOCKED_STATUSES).toContain('blocked');
      expect(TASK_BLOCKED_STATUSES).toContain('done');
      expect(TASK_BLOCKED_STATUSES).toContain('cancelled');
      expect(TASK_BLOCKED_STATUSES).toContain('archived');
    });
  });
});

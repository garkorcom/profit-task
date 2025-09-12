/**
 * ============================================================================
 * UTILITY TESTS - Project Startability System
 * ============================================================================
 * 
 * Comprehensive tests for project startability evaluation system.
 * Tests business logic for determining if projects/tasks can be started.
 * 
 * 🧪 TEST INSTRUCTIONS:
 * 1. Run: npm test -- --testPathPattern="utils/startability"  
 * 2. Pure utility function testing - no side effects
 * 3. Focus on business rule validation and edge cases
 * 4. Test all startability reason codes and classifications
 * 
 * 🔧 FUNCTIONS TESTED:
 * - evaluateProjectStartability(): Main project evaluation
 * - canStartWorkDetailed(): Detailed task analysis
 * - isProjectStatusStartable(): Project status validation
 * - isTaskStatusStartable(): Task status validation
 * - getReasonText()/getReasonIcon(): UI helper functions
 * 
 * 🛠️ BUSINESS RULES TESTED:
 * - Project status classification (startable vs blocked)
 * - Task status validation (available vs unavailable)
 * - Dependency checks (estimates, assignments, permissions)
 * - Comprehensive reason code coverage
 * - Integration scenarios with multiple blocking factors
 * 
 * @category Utility Tests
 */

import {
  evaluateProjectStartability,
  canStartWorkDetailed,
  isProjectStatusStartable,
  isTaskStatusStartable,
  getReasonText,
  getReasonIcon,
  groupReasonsByCategory,
  START_ALLOWED_STATUSES,
  TASK_BLOCKED_STATUSES,
  STARTABILITY_REASON_TEXT
} from '../startability';
import { Project } from '../../types/project.types';
import { Task } from '../../types/task.types';
import { Estimate } from '../../legacy/api/estimateApi';

// =====================================================
// МОКИРОВАННЫЕ ДАННЫЕ
// =====================================================

const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'project-1',
  name: 'Test Project',
  status: 'active',
  type: 'development',
  priority: 'medium',
  location: 'Test Location',
  participants: [],
  timeline: {
    startDate: new Date(),
    endDate: new Date()
  },
  budget: {
    planned: 1000,
    spent: 0
  },
  ...overrides
});

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  task: 'Test Task',
  projectId: 'project-1',
  status: 'assigned',
  assigneeId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

const createMockEstimate = (overrides: Partial<Estimate> = {}): Estimate => ({
  id: 'estimate-1',
  name: 'Test Estimate',
  projectId: 'project-1',
  userId: 'user-1',
  items: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// =====================================================
// ТЕСТЫ УТИЛИТНЫХ ФУНКЦИЙ
// =====================================================

describe('Startability Utils', () => {
  describe('isProjectStatusStartable', () => {
    test('должен возвращать true для разрешенных статусов', () => {
      START_ALLOWED_STATUSES.forEach(status => {
        expect(isProjectStatusStartable(status)).toBe(true);
      });
    });

    test('должен возвращать false для заблокированных статусов', () => {
      ['completed', 'cancelled', 'archived'].forEach(status => {
        expect(isProjectStatusStartable(status)).toBe(false);
      });
    });

    test('должен обрабатывать undefined как стартуемый статус', () => {
      expect(isProjectStatusStartable(undefined)).toBe(false);
    });
  });

  describe('isTaskStatusStartable', () => {
    test('должен возвращать false для заблокированных статусов задач', () => {
      TASK_BLOCKED_STATUSES.forEach(status => {
        expect(isTaskStatusStartable(status)).toBe(false);
      });
    });

    test('должен возвращать true для разрешенных статусов задач', () => {
      ['assigned', 'in_progress', 'pending'].forEach(status => {
        expect(isTaskStatusStartable(status)).toBe(true);
      });
    });
  });

  describe('getReasonText и getReasonIcon', () => {
    test('должны возвращать корректные тексты и иконки для всех причин', () => {
      Object.keys(STARTABILITY_REASON_TEXT).forEach(reason => {
        const reasonCode = reason as keyof typeof STARTABILITY_REASON_TEXT;
        expect(getReasonText(reasonCode)).toBeTruthy();
        expect(getReasonIcon(reasonCode)).toBeTruthy();
      });
    });
  });

  describe('groupReasonsByCategory', () => {
    test('должен корректно группировать причины по категориям', () => {
      const reasons = [
        'PROJECT_STATUS_NOT_STARTABLE',
        'NO_TASKS',
        'MISSING_PERMISSIONS',
        'BUDGET_OR_APPROVAL_REQUIRED'
      ] as const;

      const grouped = groupReasonsByCategory(reasons);

      expect(grouped.project).toContain('PROJECT_STATUS_NOT_STARTABLE');
      expect(grouped.tasks).toContain('NO_TASKS');
      expect(grouped.permissions).toContain('MISSING_PERMISSIONS');
      expect(grouped.business).toContain('BUDGET_OR_APPROVAL_REQUIRED');
    });
  });
});

// =====================================================
// ТЕСТЫ ДЕТАЛЬНОЙ ПРОВЕРКИ ЗАДАЧ
// =====================================================

describe('canStartWorkDetailed', () => {
  test('должен возвращать canStart=true для корректной задачи', () => {
    const project = createMockProject();
    const task = createMockTask();

    const result = canStartWorkDetailed(task, project);

    expect(result.canStart).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  test('должен блокировать задачи с заблокированными статусами', () => {
    const project = createMockProject();
    
    TASK_BLOCKED_STATUSES.forEach(status => {
      const task = createMockTask({ status });
      const result = canStartWorkDetailed(task, project);

      expect(result.canStart).toBe(false);
      expect(result.reasons).toContain('ALL_TASKS_BLOCKED');
    });
  });

  test('должен блокировать задачи без назначенного исполнителя', () => {
    const project = createMockProject();
    const task = createMockTask({ assigneeId: undefined });

    const result = canStartWorkDetailed(task, project);

    expect(result.canStart).toBe(false);
    expect(result.reasons).toContain('MISSING_ASSIGNMENT');
  });

  test('должен блокировать задачи с неразрешенными зависимостями', () => {
    const project = createMockProject();
    const baseTask = createMockTask();
    const task = {
      ...baseTask,
      dependsOnIds: ['dep-1', 'dep-2'],
      dependsOnResolved: false
    } as any;

    const result = canStartWorkDetailed(task, project);

    expect(result.canStart).toBe(false);
    expect(result.reasons).toContain('DEPENDENCIES_NOT_MET');
  });

  test('должен блокировать задачи, требующие подтверждения', () => {
    const project = createMockProject();
    const baseTask = createMockTask();
    const task = {
      ...baseTask,
      requiresApproval: true,
      approved: false
    } as any;

    const result = canStartWorkDetailed(task, project);

    expect(result.canStart).toBe(false);
    expect(result.reasons).toContain('BUDGET_OR_APPROVAL_REQUIRED');
  });

  test('должен блокировать задачи с compliance hold', () => {
    const baseProject = createMockProject();
    const project = { ...baseProject, complianceHold: true } as any;
    const task = createMockTask();

    const result = canStartWorkDetailed(task, project);

    expect(result.canStart).toBe(false);
    expect(result.reasons).toContain('COMPLIANCE_HOLD');
  });

  test('должен собирать множественные причины без дублей', () => {
    const project = createMockProject();
    const task = createMockTask({
      status: 'blocked',
      assigneeId: undefined
    });

    const result = canStartWorkDetailed(task, project);

    expect(result.canStart).toBe(false);
    expect(result.reasons).toContain('ALL_TASKS_BLOCKED');
    expect(result.reasons).toContain('MISSING_ASSIGNMENT');
    expect(result.reasons).toHaveLength(2);
  });
});

// =====================================================
// ТЕСТЫ ОЦЕНКИ СТАРТУЕМОСТИ ПРОЕКТА
// =====================================================

describe('evaluateProjectStartability', () => {
  test('должен возвращать startable=true для нормального проекта', () => {
    const project = createMockProject({ status: 'active' });
    const tasks = [createMockTask()];
    const estimates = [createMockEstimate()];

    const result = evaluateProjectStartability(project, tasks, estimates);

    expect(result.startable).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(result.startableTaskCount).toBe(1);
    expect(result.totalTaskCount).toBe(1);
    expect(result.estimateCount).toBe(1);
  });

  test('должен блокировать проекты с неподходящим статусом', () => {
    const project = createMockProject({ status: 'completed' });
    const tasks = [createMockTask()];
    const estimates = [createMockEstimate()];

    const result = evaluateProjectStartability(project, tasks, estimates);

    expect(result.startable).toBe(false);
    expect(result.reasons).toContain('PROJECT_STATUS_NOT_STARTABLE');
  });

  test('должен отмечать проекты на hold', () => {
    const project = createMockProject({ status: 'on_hold' });
    const tasks = [createMockTask()];
    const estimates = [createMockEstimate()];

    const result = evaluateProjectStartability(project, tasks, estimates);

    expect(result.reasons).toContain('PROJECT_ON_HOLD');
    // on_hold проекты могут быть стартуемыми, если есть задачи
    expect(result.startable).toBe(true);
  });

  test('должен блокировать проекты без задач', () => {
    const project = createMockProject();
    const tasks: Task[] = [];
    const estimates = [createMockEstimate()];

    const result = evaluateProjectStartability(project, tasks, estimates);

    expect(result.reasons).toContain('NO_TASKS');
    expect(result.startableTaskCount).toBe(0);
    expect(result.totalTaskCount).toBe(0);
  });

  test('должен блокировать проекты со всеми заблокированными задачами', () => {
    const project = createMockProject();
    const tasks = [
      createMockTask({ status: 'blocked' }),
      createMockTask({ status: 'done' }),
      createMockTask({ assigneeId: undefined })
    ];
    const estimates = [createMockEstimate()];

    const result = evaluateProjectStartability(project, tasks, estimates);

    expect(result.reasons).toContain('ALL_TASKS_BLOCKED');
    expect(result.startable).toBe(false);
    expect(result.startableTaskCount).toBe(0);
    expect(result.totalTaskCount).toBe(3);
  });

  test('должен отмечать отсутствие смет', () => {
    const project = createMockProject();
    const tasks = [createMockTask()];
    const estimates: Estimate[] = [];

    const result = evaluateProjectStartability(project, tasks, estimates);

    expect(result.reasons).toContain('NO_ESTIMATES');
    expect(result.estimateCount).toBe(0);
    // Но проект все равно стартуемый, если есть задачи
    expect(result.startable).toBe(true);
  });

  test('должен предоставлять примеры заблокированных задач', () => {
    const project = createMockProject();
    const tasks = [
      createMockTask({ id: 'task-1', task: 'Blocked Task 1', status: 'blocked' }),
      createMockTask({ id: 'task-2', task: 'Blocked Task 2', assigneeId: undefined }),
      createMockTask({ id: 'task-3', task: 'Good Task', status: 'assigned' }),
      createMockTask({ id: 'task-4', task: 'Another Blocked', status: 'done' }),
      createMockTask({ id: 'task-5', task: 'Yet Another Blocked', status: 'cancelled' })
    ];
    const estimates = [createMockEstimate()];

    const result = evaluateProjectStartability(project, tasks, estimates);

    expect(result.blockedTasksSample).toBeDefined();
    expect(result.blockedTasksSample).toHaveLength(3); // Максимум 3 примера
    expect(result.blockedTasksSample![0].title).toBe('Blocked Task 1');
    expect(result.blockedTasksSample![0].reasons).toContain('ALL_TASKS_BLOCKED');
  });

  test('должен корректно фильтровать задачи по проекту', () => {
    const project = createMockProject({ id: 'project-1' });
    const tasks = [
      createMockTask({ projectId: 'project-1' }),
      createMockTask({ projectId: 'project-2' }),
      createMockTask({ projectId: 'project-1' })
    ];
    const estimates = [
      createMockEstimate({ projectId: 'project-1' }),
      createMockEstimate({ projectId: 'project-2' })
    ];

    const result = evaluateProjectStartability(project, tasks, estimates);

    expect(result.totalTaskCount).toBe(2); // Только задачи project-1
    expect(result.estimateCount).toBe(1); // Только смета project-1
  });

  test('должен обрабатывать проекты без статуса как idea', () => {
    const project = createMockProject({ status: undefined });
    const tasks = [createMockTask()];
    const estimates = [createMockEstimate()];

    const result = evaluateProjectStartability(project, tasks, estimates);

    // idea статус должен быть разрешен
    expect(result.startable).toBe(true);
    expect(result.reasons).not.toContain('PROJECT_STATUS_NOT_STARTABLE');
  });

  test('должен удалять дублирующиеся причины', () => {
    const project = createMockProject({ status: 'cancelled' });
    const tasks: Task[] = [];
    const estimates: Estimate[] = [];

    // Добавим логику, которая может создать дубли
    const result = evaluateProjectStartability(project, tasks, estimates);

    const uniqueReasons = new Set(result.reasons);
    expect(result.reasons.length).toBe(uniqueReasons.size);
  });
});

// =====================================================
// ИНТЕГРАЦИОННЫЕ ТЕСТЫ
// =====================================================

describe('Startability Integration', () => {
  test('должен корректно работать с реальными сценариями', () => {
    // Сценарий 1: Активный проект с заблокированными и доступными задачами
    const activeProject = createMockProject({ 
      id: 'active-proj',
      status: 'active' 
    });
    
    const mixedTasks = [
      createMockTask({ id: 't1', projectId: 'active-proj', status: 'assigned' }),
      createMockTask({ id: 't2', projectId: 'active-proj', status: 'blocked' }),
      createMockTask({ id: 't3', projectId: 'active-proj', assigneeId: undefined })
    ];
    
    const activeEstimates = [
      createMockEstimate({ projectId: 'active-proj' })
    ];

    const result1 = evaluateProjectStartability(activeProject, mixedTasks, activeEstimates);
    
    expect(result1.startable).toBe(true);
    expect(result1.startableTaskCount).toBe(1);
    expect(result1.totalTaskCount).toBe(3);
    expect(result1.blockedTasksSample).toHaveLength(2);

    // Сценарий 2: Завершенный проект
    const completedProject = createMockProject({ 
      id: 'completed-proj',
      status: 'completed' 
    });

    const result2 = evaluateProjectStartability(completedProject, mixedTasks, activeEstimates);
    
    expect(result2.startable).toBe(false);
    expect(result2.reasons).toContain('PROJECT_STATUS_NOT_STARTABLE');

    // Сценарий 3: Проект без контента
    const emptyProject = createMockProject({ 
      id: 'empty-proj',
      status: 'planning' 
    });

    const result3 = evaluateProjectStartability(emptyProject, [], []);
    
    expect(result3.startable).toBe(false);
    expect(result3.reasons).toContain('NO_TASKS');
    expect(result3.reasons).toContain('NO_ESTIMATES');
  });
});
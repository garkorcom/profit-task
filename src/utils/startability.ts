/**
 * Project Startability System
 * 
 * Определяет, можно ли начать работу над проектом/задачей, и предоставляет
 * детальные причины блокировки для улучшения UX.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

import { Project } from '../types/project.types';
import { Task } from '../types/task.types';
import { Estimate } from '../legacy/api/estimateApi'; // Используем legacy тип для совместимости

// =====================================================
// ТИПЫ И ПЕРЕЧИСЛЕНИЯ
// =====================================================

/**
 * Коды причин, по которым нельзя начать работу
 */
export type StartabilityReasonCode =
  | 'PROJECT_STATUS_NOT_STARTABLE'      // Статус проекта не допускает старт
  | 'PROJECT_ON_HOLD'                   // Проект на удержании (on hold)
  | 'NO_TASKS'                          // Нет задач в проекте
  | 'ALL_TASKS_BLOCKED'                 // Все задачи недоступны для старта
  | 'NO_ESTIMATES'                      // Нет смет
  | 'NO_STARTABLE_ITEMS_IN_ESTIMATES'   // В сметах нет позиций для старта
  | 'MISSING_ASSIGNMENT'                // Нет назначенного исполнителя/команды
  | 'MISSING_PERMISSIONS'               // Недостаточно прав для старта
  | 'DEPENDENCIES_NOT_MET'              // Не выполнены зависимости/предусловия задач
  | 'BUDGET_OR_APPROVAL_REQUIRED'       // Требуется бюджет/подтверждение клиента
  | 'COMPLIANCE_HOLD';                  // Стоп по соответствию (permit/COI и др.)

/**
 * Человекочитаемые тексты для кодов причин
 */
export const STARTABILITY_REASON_TEXT: Record<StartabilityReasonCode, string> = {
  PROJECT_STATUS_NOT_STARTABLE: 'Статус проекта не допускает старт',
  PROJECT_ON_HOLD: 'Проект на удержании (on hold)',
  NO_TASKS: 'Нет задач в проекте',
  ALL_TASKS_BLOCKED: 'Все задачи недоступны для старта',
  NO_ESTIMATES: 'Нет смет',
  NO_STARTABLE_ITEMS_IN_ESTIMATES: 'В сметах нет позиций для старта',
  MISSING_ASSIGNMENT: 'Нет назначенного исполнителя/команды',
  MISSING_PERMISSIONS: 'Недостаточно прав для старта',
  DEPENDENCIES_NOT_MET: 'Не выполнены зависимости/предусловия задач',
  BUDGET_OR_APPROVAL_REQUIRED: 'Требуется бюджет/подтверждение клиента',
  COMPLIANCE_HOLD: 'Стоп по соответствию (permit/COI и др.)',
};

/**
 * Иконки для визуального отображения причин блокировки
 */
export const STARTABILITY_REASON_ICONS: Record<StartabilityReasonCode, string> = {
  PROJECT_STATUS_NOT_STARTABLE: '🚫',
  PROJECT_ON_HOLD: '⏸️',
  NO_TASKS: '📝',
  ALL_TASKS_BLOCKED: '🔒',
  NO_ESTIMATES: '💰',
  NO_STARTABLE_ITEMS_IN_ESTIMATES: '📊',
  MISSING_ASSIGNMENT: '👤',
  MISSING_PERMISSIONS: '🔐',
  DEPENDENCIES_NOT_MET: '🔗',
  BUDGET_OR_APPROVAL_REQUIRED: '✅',
  COMPLIANCE_HOLD: '📋',
};

/**
 * Статусы проектов, при которых можно начинать работу
 */
export const START_ALLOWED_STATUSES = ['idea', 'planning', 'active', 'on_hold'] as const;

/**
 * Статусы проектов, при которых нельзя начинать работу
 */
export const START_BLOCKED_STATUSES = ['completed', 'cancelled', 'archived'] as const;

/**
 * Статусы задач, при которых нельзя начинать работу
 */
export const TASK_BLOCKED_STATUSES = ['blocked', 'done', 'cancelled', 'archived'] as const;

// =====================================================
// ИНТЕРФЕЙСЫ РЕЗУЛЬТАТОВ
// =====================================================

/**
 * Детальная информация о стартуемости задачи
 */
export interface TaskStartability {
  /** Можно ли начать работу над задачей */
  canStart: boolean;
  /** Список причин блокировки (пустой, если canStart === true) */
  reasons: StartabilityReasonCode[];
}

/**
 * Сводная информация о заблокированной задаче для отображения в UI
 */
export interface BlockedTaskSample {
  /** ID задачи */
  id: string;
  /** Название задачи */
  title: string;
  /** Причины блокировки */
  reasons: StartabilityReasonCode[];
}

/**
 * Детальная информация о стартуемости проекта
 */
export interface ProjectStartability {
  /** ID проекта */
  projectId: string;
  /** Можно ли начать работу над проектом */
  startable: boolean;
  /** Причины блокировки на уровне проекта */
  reasons: StartabilityReasonCode[];
  /** Примеры заблокированных задач (до 3 штук) */
  blockedTasksSample?: BlockedTaskSample[];
  /** Количество задач, доступных для старта */
  startableTaskCount: number;
  /** Общее количество задач в проекте */
  totalTaskCount: number;
  /** Количество смет в проекте */
  estimateCount: number;
}

// =====================================================
// ОСНОВНЫЕ ФУНКЦИИ АНАЛИЗА
// =====================================================

/**
 * Анализирует возможность начала работы над задачей с детальными причинами
 * 
 * @param task - Задача для анализа
 * @param project - Проект, к которому относится задача
 * @returns Детальная информация о стартуемости задачи
 */
export function canStartWorkDetailed(task: Task, project: Project): TaskStartability {
  const reasons: StartabilityReasonCode[] = [];

  // Проверяем статус задачи
  if (TASK_BLOCKED_STATUSES.includes(task.status as any)) {
    reasons.push('ALL_TASKS_BLOCKED');
  }

  // Проверяем назначение исполнителя
  if (!task.assigneeId) {
    reasons.push('MISSING_ASSIGNMENT');
  }

  // Проверяем зависимости (если есть поля для зависимостей)
  if ((task as any).dependsOnIds?.length && !(task as any).dependsOnResolved) {
    reasons.push('DEPENDENCIES_NOT_MET');
  }

  // Проверяем права доступа (базовая проверка)
  // Можно расширить логикой проверки permissions при необходимости
  // if (!userCanStart(task)) reasons.push('MISSING_PERMISSIONS');

  // Проверяем бюджетные ограничения (если есть соответствующие поля)
  if ((task as any).requiresApproval && !(task as any).approved) {
    reasons.push('BUDGET_OR_APPROVAL_REQUIRED');
  }

  // Проверяем compliance hold (если есть соответствующие поля)
  if ((task as any).complianceHold || (project as any).complianceHold) {
    reasons.push('COMPLIANCE_HOLD');
  }

  return {
    canStart: reasons.length === 0,
    reasons: Array.from(new Set(reasons)) // убираем дубликаты
  };
}

/**
 * Анализирует возможность начала работы над проектом в целом
 * 
 * @param project - Проект для анализа
 * @param tasks - Все задачи, относящиеся к проекту
 * @param estimates - Все сметы, относящиеся к проекту
 * @returns Детальная информация о стартуемости проекта
 */
export function evaluateProjectStartability(
  project: Project,
  tasks: Task[],
  estimates: Estimate[]
): ProjectStartability {
  const reasons: StartabilityReasonCode[] = [];
  const status = (project.status ?? 'idea') as string;

  // Проверяем статус проекта
  if (START_BLOCKED_STATUSES.includes(status as any)) {
    reasons.push('PROJECT_STATUS_NOT_STARTABLE');
  }
  
  if (status === 'on_hold') {
    reasons.push('PROJECT_ON_HOLD');
  }

  // Фильтруем задачи и сметы по проекту
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const projectEstimates = estimates.filter(e => e.projectId === project.id);

  // Проверяем наличие задач
  if (!projectTasks.length) {
    reasons.push('NO_TASKS');
  }

  // Анализируем стартуемость задач
  const taskAnalysis = projectTasks.map(task => ({
    task,
    startability: canStartWorkDetailed(task, project)
  }));

  const startableTasks = taskAnalysis.filter(analysis => analysis.startability.canStart);
  const blockedTasks = taskAnalysis.filter(analysis => !analysis.startability.canStart);

  // Если есть задачи, но ни одну нельзя запустить
  if (projectTasks.length && !startableTasks.length) {
    reasons.push('ALL_TASKS_BLOCKED');
  }

  // Проверяем наличие смет
  if (!projectEstimates.length) {
    reasons.push('NO_ESTIMATES');
  }

  // TODO: Проверка стартуемых позиций в сметах
  // if (projectEstimates.length && !hasStartableServices(projectEstimates)) {
  //   reasons.push('NO_STARTABLE_ITEMS_IN_ESTIMATES');
  // }

  // Определяем итоговую стартуемость
  // Проект стартуем, если:
  // 1. Нет критических блокировок статуса И
  // 2. Есть хотя бы одна стартуемая задача (сметы пока не влияют на стартуемость)
  const hasCriticalStatusBlock = reasons.includes('PROJECT_STATUS_NOT_STARTABLE');
  const hasStartableTasks = startableTasks.length > 0;
  
  // Проект НЕ стартуем, если критический статус ИЛИ нет стартуемых задач
  const startable = !hasCriticalStatusBlock && hasStartableTasks;

  // Формируем примеры заблокированных задач для UI
  const blockedTasksSample: BlockedTaskSample[] = blockedTasks
    .slice(0, 3)
    .map(analysis => ({
      id: analysis.task.id,
      title: analysis.task.task || `Задача ${analysis.task.id.slice(0, 8)}`,
      reasons: analysis.startability.reasons
    }));

  return {
    projectId: project.id,
    startable,
    reasons: Array.from(new Set(reasons)), // убираем дубликаты
    blockedTasksSample: blockedTasksSample.length > 0 ? blockedTasksSample : undefined,
    startableTaskCount: startableTasks.length,
    totalTaskCount: projectTasks.length,
    estimateCount: projectEstimates.length,
  };
}

// =====================================================
// ВСПОМОГАТЕЛЬНЫЕ УТИЛИТЫ
// =====================================================

/**
 * Получает текстовое описание причины блокировки
 */
export function getReasonText(reason: StartabilityReasonCode): string {
  return STARTABILITY_REASON_TEXT[reason];
}

/**
 * Получает иконку для причины блокировки
 */
export function getReasonIcon(reason: StartabilityReasonCode): string {
  return STARTABILITY_REASON_ICONS[reason];
}

/**
 * Проверяет, является ли статус проекта стартуемым
 */
export function isProjectStatusStartable(status?: string): boolean {
  return START_ALLOWED_STATUSES.includes(status as any);
}

/**
 * Проверяет, является ли статус задачи стартуемым
 */
export function isTaskStatusStartable(status?: string): boolean {
  return !TASK_BLOCKED_STATUSES.includes(status as any);
}

/**
 * Группирует причины по категориям для лучшего отображения в UI
 */
export function groupReasonsByCategory(reasons: StartabilityReasonCode[]): {
  project: StartabilityReasonCode[];
  tasks: StartabilityReasonCode[];
  permissions: StartabilityReasonCode[];
  business: StartabilityReasonCode[];
} {
  return {
    project: reasons.filter(r => ['PROJECT_STATUS_NOT_STARTABLE', 'PROJECT_ON_HOLD'].includes(r)),
    tasks: reasons.filter(r => ['NO_TASKS', 'ALL_TASKS_BLOCKED', 'DEPENDENCIES_NOT_MET'].includes(r)),
    permissions: reasons.filter(r => ['MISSING_PERMISSIONS', 'MISSING_ASSIGNMENT'].includes(r)),
    business: reasons.filter(r => ['NO_ESTIMATES', 'BUDGET_OR_APPROVAL_REQUIRED', 'COMPLIANCE_HOLD'].includes(r))
  };
}
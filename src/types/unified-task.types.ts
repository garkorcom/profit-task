/**
 * Унифицированная система управления задачами (SSOT)
 * Объединяет EstimateTask и ProjectTask в единую модель данных
 * с помощью TypeScript Discriminated Unions
 */

import { TaskStatus, TaskPriority as ApiTaskPriority } from '../api/taskApi';

// ==================== БАЗОВЫЕ ТИПЫ ====================

export type TaskPhase = 'pre_construction' | 'execution';
export type TaskPriority = ApiTaskPriority | 'urgent';
export type IncludeMode = 'COGS' | 'OH' | 'NONE';

/**
 * Базовый интерфейс для всех типов задач
 */
interface BaseTask {
  id: string;
  name: string;
  description?: string;
  
  // Управление статусом и приоритетом
  status: TaskStatus;
  priority: TaskPriority;
  
  // Планирование времени
  plannedHours: number;
  actualHours?: number;
  
  // Временные рамки
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  
  // Назначение ресурсов
  assignedRole?: string;
  assignedUserId?: string;
  
  // Зависимости
  dependencies?: string[];
  
  // Метаданные
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  completedBy?: string;
  completedAt?: string;
  
  // Дополнительные данные
  tags?: string[];
  notes?: string;
  attachments?: string[];
}

/**
 * Задача этапа Pre-construction (планирование/смета)
 */
export interface EstimateTaskUnified extends BaseTask {
  phase: 'pre_construction';
  estimateId: string;
  categoryId?: string;
  
  // Уникальное для EstimateTask - финансовая логика
  includeMode: IncludeMode;
  
  // Связи со сметными позициями
  relatedEstimateItems?: string[];
}

/**
 * Задача этапа Execution (выполнение проекта)
 */
export interface ProjectTaskUnified extends BaseTask {
  phase: 'execution';
  projectId: string;
  estimateItemId?: string;
  categoryId?: string;
  
  // WBS (Work Breakdown Structure)
  wbsCode?: string;
  parentTaskId?: string;
  
  // Бюджетирование
  plannedCost: number;
  actualCost?: number;
  budgetUtilizationPct?: number;
  
  // Команда
  assignedTeam?: string[];
  
  // Прогресс
  progressPct: number;
  
  // Вехи и контроль
  milestone?: string;
  budgetLimit?: number;
  hourlyLimit?: number;
  requiresApprovalOver?: number;
  
  // Изменения проекта
  changeOrders?: string[];
}

/**
 * Объединенный тип задачи (Discriminated Union)
 */
export type UnifiedTask = EstimateTaskUnified | ProjectTaskUnified;

// ==================== УТИЛИТЫ ТИПИЗАЦИИ ====================

/**
 * Type guards для определения типа задачи
 */
export const isEstimateTask = (task: UnifiedTask): task is EstimateTaskUnified => {
  return task.phase === 'pre_construction';
};

export const isProjectTask = (task: UnifiedTask): task is ProjectTaskUnified => {
  return task.phase === 'execution';
};

// ==================== DTO ТИПЫ ====================

/**
 * Базовый DTO для создания задачи
 */
interface BaseCreateTaskDto {
  name: string;
  description?: string;
  priority?: TaskPriority;
  plannedHours: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  assignedRole?: string;
  assignedUserId?: string;
  dependencies?: string[];
  tags?: string[];
  notes?: string;
}

/**
 * DTO для создания задачи смет
 */
export interface CreateEstimateTaskDto extends BaseCreateTaskDto {
  phase: 'pre_construction';
  estimateId: string;
  categoryId?: string;
  includeMode: IncludeMode;
  relatedEstimateItems?: string[];
}

/**
 * DTO для создания задачи проекта
 */
export interface CreateProjectTaskDto extends BaseCreateTaskDto {
  phase: 'execution';
  projectId: string;
  estimateItemId?: string;
  categoryId?: string;
  wbsCode?: string;
  parentTaskId?: string;
  plannedCost: number;
  assignedTeam?: string[];
  milestone?: string;
  budgetLimit?: number;
  hourlyLimit?: number;
  requiresApprovalOver?: number;
}

/**
 * Объединенный DTO для создания любого типа задачи
 */
export type CreateTaskDto = CreateEstimateTaskDto | CreateProjectTaskDto;

/**
 * DTO для обновления задачи
 */
export interface UpdateTaskDto {
  name?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  plannedHours?: number;
  actualHours?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  assignedRole?: string;
  assignedUserId?: string;
  dependencies?: string[];
  tags?: string[];
  notes?: string;
  
  // Специфичные поля для ProjectTask
  plannedCost?: number;
  actualCost?: number;
  progressPct?: number;
  assignedTeam?: string[];
  
  // Специфичные поля для EstimateTask
  includeMode?: IncludeMode;
  relatedEstimateItems?: string[];
}

// ==================== ФИЛЬТРАЦИЯ И ПОИСК ====================

/**
 * Фильтры для поиска задач
 */
export interface TaskFilters {
  phase?: TaskPhase;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignedUserId?: string;
  projectId?: string;
  estimateId?: string;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  tags?: string[];
}

/**
 * Опции сортировки
 */
export interface TaskSortOptions {
  field: 'name' | 'status' | 'priority' | 'createdAt' | 'updatedAt' | 'plannedStartDate' | 'plannedEndDate';
  direction: 'asc' | 'desc';
}

// ==================== СОСТОЯНИЕ И ПЕРЕХОДЫ ====================

/**
 * Валидные переходы статусов задач
 */
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  'new': ['assigned', 'in_progress', 'cancelled'],
  'assigned': ['in_progress', 'on_hold', 'cancelled'],
  'in_progress': ['review', 'on_hold', 'completed', 'cancelled'],
  'on_hold': ['in_progress', 'cancelled'],
  'review': ['completed', 'rework', 'cancelled'],
  'rework': ['in_progress', 'cancelled'],
  'completed': [], // Финальный статус
  'cancelled': []  // Финальный статус
};

/**
 * Статусы, требующие дополнительного подтверждения
 */
export const STATUSES_REQUIRING_CONFIRMATION: TaskStatus[] = ['completed', 'cancelled'];

/**
 * Статусы, считающиеся активными (задача в работе)
 */
export const ACTIVE_TASK_STATUSES: TaskStatus[] = ['assigned', 'in_progress', 'review', 'rework'];

/**
 * Статусы, считающиеся завершенными
 */
export const COMPLETED_TASK_STATUSES: TaskStatus[] = ['completed', 'cancelled'];

// ==================== ВСПОМОГАТЕЛЬНЫЕ ТИПЫ ====================

/**
 * Результат валидации задачи
 */
export interface TaskValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Статистика по задачам
 */
export interface TaskStatistics {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  byPhase: Record<TaskPhase, number>;
  totalPlannedHours: number;
  totalActualHours: number;
  completionRate: number;
}

/**
 * Конфигурация приоритетов для UI
 */
export interface TaskPriorityConfig {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  icon?: React.ReactElement;
  weight: number; // Для сортировки
}

/**
 * Конфигурация статусов для UI
 */
export interface TaskStatusConfig {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  description?: string;
  allowedTransitions: TaskStatus[];
}

// Экспортируем TaskStatus для использования в других файлах
export type { TaskStatus };
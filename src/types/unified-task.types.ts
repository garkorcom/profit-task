/**
 * ============================================================================
 * UNIFIED TASK SYSTEM - SINGLE SOURCE OF TRUTH (SSOT)
 * ============================================================================
 * 
 * Унифицированная система управления задачами объединяет две ранее разрозненные
 * сущности: EstimateTask (задачи планирования) и ProjectTask (задачи исполнения)
 * в единую архитектуру с использованием TypeScript Discriminated Unions.
 * 
 * КЛЮЧЕВЫЕ ПРЕИМУЩЕСТВА:
 * ═══════════════════════
 * 
 * 1. TYPE SAFETY
 *    - Discriminated Unions обеспечивают безопасность типов на уровне компиляции
 *    - Автоматическое определение доступных полей в зависимости от типа задачи
 *    - Исключение runtime ошибок связанных с типизацией
 * 
 * 2. SINGLE SOURCE OF TRUTH
 *    - Единая система валидации для всех типов задач
 *    - Централизованная бизнес-логика и правила обработки
 *    - Устранение дублирования кода между компонентами
 * 
 * 3. РАСШИРЯЕМОСТЬ
 *    - Простое добавление новых типов задач через расширение Union
 *    - Модульная архитектура позволяет независимое развитие компонентов
 *    - Backward compatibility через extension интерфейсов
 * 
 * 4. ПРОИЗВОДИТЕЛЬНОСТЬ
 *    - Оптимизированные хуки с мемоизацией и селективным ре-рендерингом
 *    - Эффективное кэширование и батчинг операций с Firebase
 *    - Минимальные сетевые запросы благодаря smart caching
 * 
 * АРХИТЕКТУРНЫЕ РЕШЕНИЯ:
 * ═════════════════════════
 * 
 * • Discriminated Unions как основа type safety
 * • Phase-based разделение на pre_construction и execution
 * • Централизованная валидация через конфигурационные объекты
 * • Композиционные паттерны для переиспользования логики
 * • Event-driven архитектура для real-time синхронизации
 * 
 * @author Claude Assistant
 * @version 2.0.0
 * @since 2024-09-03
 */

import { TaskStatus, TaskPriority as ApiTaskPriority } from '../api/taskApi';

// ==================== БАЗОВЫЕ ТИПЫ ====================

/**
 * Фазы жизненного цикла задач в системе управления проектами
 * 
 * pre_construction - Этап планирования и создания смет
 *   • Задачи связаны со сметами и оценкой стоимости
 *   • Содержат логику включения в финансовые категории (COGS/OH/NONE)
 *   • Используются для планирования ресурсов и временных рамок
 * 
 * execution - Этап исполнения проекта
 *   • Задачи связаны с реальными проектами и WBS структурой
 *   • Содержат данные о команде, бюджете и прогрессе выполнения
 *   • Интегрированы с системой тайм-трекинга и фотофиксации
 */
export type TaskPhase = 'pre_construction' | 'execution';

/**
 * Расширенная система приоритетов задач
 * Добавляет 'urgent' к стандартным приоритетам API для критических случаев
 */
export type TaskPriority = ApiTaskPriority | 'urgent';

/**
 * Способы включения задач в финансовые расчеты (только для EstimateTask)
 * 
 * COGS (Cost of Goods Sold) - Прямые затраты на производство
 * OH (Overhead) - Накладные расходы и административные затраты  
 * NONE - Исключение из финансовых расчетов (например, внутренние задачи)
 */
export type IncludeMode = 'COGS' | 'OH' | 'NONE';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * БАЗОВЫЙ ИНТЕРФЕЙС ЗАДАЧ
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * BaseTask содержит общие поля для всех типов задач независимо от фазы.
 * Использует композиционный подход для максимального переиспользования кода.
 * 
 * ОСНОВНЫЕ ГРУППЫ ПОЛЕЙ:
 * ─────────────────────────
 * 
 * 1. ИДЕНТИФИКАЦИЯ
 *    - id: уникальный идентификатор
 *    - name: человеко-читаемое название
 *    - description: детальное описание
 * 
 * 2. УПРАВЛЕНИЕ СОСТОЯНИЕМ
 *    - status: текущий статус (new, in_progress, completed, etc.)
 *    - priority: приоритет выполнения
 * 
 * 3. ВРЕМЕННОЕ ПЛАНИРОВАНИЕ
 *    - plannedHours: планируемые трудозатраты
 *    - actualHours: фактические трудозатраты
 *    - временные рамки (planned/actual dates)
 * 
 * 4. УПРАВЛЕНИЕ РЕСУРСАМИ
 *    - assignedRole: роль исполнителя
 *    - assignedUserId: конкретный исполнитель
 *    - dependencies: зависимости от других задач
 * 
 * 5. АУДИТ И МЕТАДАННЫЕ
 *    - created/updated/completed метки времени и авторов
 *    - tags, notes, attachments для дополнительной информации
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
 * ═══════════════════════════════════════════════════════════════════════════
 * ESTIMATE TASK - ЗАДАЧИ ЭТАПА ПЛАНИРОВАНИЯ
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * EstimateTaskUnified представляет задачи этапа pre_construction, связанные
 * с процессом создания смет и планирования проектов.
 * 
 * КЛЮЧЕВЫЕ ОСОБЕННОСТИ:
 * ────────────────────────
 * 
 * 1. СВЯЗЬ СО СМЕТАМИ
 *    - estimateId: жесткая привязка к конкретной смете
 *    - relatedEstimateItems: связь с позициями сметы
 *    - categoryId: категоризация для группировки задач
 * 
 * 2. ФИНАНСОВАЯ ЛОГИКА
 *    - includeMode: определяет включение в расчет стоимости
 *      • COGS: прямые производственные затраты
 *      • OH: накладные расходы (overhead)
 *      • NONE: исключение из расчетов
 * 
 * 3. ПЛАНИРОВАНИЕ РЕСУРСОВ
 *    - Использует базовые поля plannedHours для оценки трудозатрат
 *    - Связь с ролями через assignedRole для ресурсного планирования
 *    - dependencies для выстраивания последовательности работ
 * 
 * ПРИМЕНЕНИЕ:
 * ──────────────
 * - Создание детальных планов работ на этапе оценки
 * - Расчет стоимости проекта по категориям затрат
 * - Планирование временных рамок и ресурсов
 * - Подготовка к переходу в execution фазу
 * 
 * ИНТЕГРАЦИЯ:
 * ──────────────
 * - EstimateTasksBlockUnified для UI управления
 * - EstimateAPI для связи со сметами
 * - FinancialCalculations для расчета стоимости
 */
export interface EstimateTaskUnified extends BaseTask {
  phase: 'pre_construction';
  
  // === ОСНОВНЫЕ СВЯЗИ ===
  /** ID сметы, к которой относится задача */
  estimateId: string;
  
  /** Категория для группировки задач (опционально) */
  categoryId?: string;
  
  // === ФИНАНСОВАЯ ЛОГИКА ===
  /** Способ включения в финансовые расчеты */
  includeMode: IncludeMode;
  
  // === ИНТЕГРАЦИЯ СО СМЕТОЙ ===
  /** Массив ID позиций сметы, связанных с этой задачей */
  relatedEstimateItems?: string[];
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROJECT TASK - ЗАДАЧИ ЭТАПА ИСПОЛНЕНИЯ
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ProjectTaskUnified представляет задачи этапа execution, связанные с реальным
 * выполнением проектных работ и управлением командой исполнителей.
 * 
 * КЛЮЧЕВЫЕ ОСОБЕННОСТИ:
 * ────────────────────────
 * 
 * 1. СВЯЗЬ С ПРОЕКТАМИ
 *    - projectId: привязка к конкретному проекту
 *    - estimateItemId: связь с исходной позицией сметы
 *    - wbsCode: код в структуре декомпозиции работ (WBS)
 * 
 * 2. ИЕРАРХИЧЕСКАЯ СТРУКТУРА
 *    - parentTaskId: поддержка вложенных задач
 *    - Возможность создания сложных структур работ
 *    - Каскадное планирование и отчетность
 * 
 * 3. ФИНАНСОВОЕ УПРАВЛЕНИЕ
 *    - plannedCost/actualCost: планируемые и фактические затраты
 *    - budgetUtilizationPct: процент использования бюджета
 *    - budgetLimit: лимиты для контроля расходов
 * 
 * 4. УПРАВЛЕНИЕ КОМАНДОЙ
 *    - assignedTeam: массив участников команды
 *    - Интеграция с системой ролей и разрешений
 *    - Поддержка коллективной работы
 * 
 * 5. КОНТРОЛЬ ПРОГРЕССА
 *    - progressPct: процент выполнения работ
 *    - milestone: привязка к вехам проекта
 *    - Real-time трекинг состояния
 * 
 * 6. СИСТЕМА КОНТРОЛЯ
 *    - requiresApprovalOver: сумма, требующая одобрения
 *    - hourlyLimit: лимит по времени
 *    - changeOrders: связь с изменениями проекта
 * 
 * ПРИМЕНЕНИЕ:
 * ──────────────
 * - Управление реальным выполнением работ
 * - Контроль бюджета и временных рамок
 * - Координация команды исполнителей
 * - Отчетность по прогрессу проекта
 * 
 * ИНТЕГРАЦИЯ:
 * ──────────────
 * - TaskListItem для отображения в операционных представлениях
 * - TimeTrackingContext для учета времени
 * - ProjectAPI для связи с проектными данными
 * - BudgetTracking для финансового контроля
 */
export interface ProjectTaskUnified extends BaseTask {
  phase: 'execution';
  
  // === ОСНОВНЫЕ СВЯЗИ ===
  /** ID проекта, к которому относится задача */
  projectId: string;
  
  /** ID позиции сметы, из которой создана задача (опционально) */
  estimateItemId?: string;
  
  /** Категория для группировки задач */
  categoryId?: string;
  
  // === СТРУКТУРА ДЕКОМПОЗИЦИИ РАБОТ (WBS) ===
  /** Код в структуре декомпозиции работ */
  wbsCode?: string;
  
  /** ID родительской задачи для иерархии */
  parentTaskId?: string;
  
  // === ФИНАНСОВОЕ УПРАВЛЕНИЕ ===
  /** Планируемая стоимость задачи */
  plannedCost: number;
  
  /** Фактическая стоимость (по мере выполнения) */
  actualCost?: number;
  
  /** Процент использования бюджета */
  budgetUtilizationPct?: number;
  
  // === УПРАВЛЕНИЕ КОМАНДОЙ ===
  /** Массив ID участников команды */
  assignedTeam?: string[];
  
  // === КОНТРОЛЬ ПРОГРЕССА ===
  /** Процент выполнения работ (0-100) */
  progressPct: number;
  
  // === КОНТРОЛЬНЫЕ ТОЧКИ И ОГРАНИЧЕНИЯ ===
  /** Связанная веха проекта */
  milestone?: string;
  
  /** Максимальный бюджет для задачи */
  budgetLimit?: number;
  
  /** Лимит по времени выполнения (часы) */
  hourlyLimit?: number;
  
  /** Сумма, превышение которой требует одобрения */
  requiresApprovalOver?: number;
  
  // === УПРАВЛЕНИЕ ИЗМЕНЕНИЯМИ ===
  /** Массив ID заявок на изменение, связанных с задачей */
  changeOrders?: string[];
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DISCRIMINATED UNION - ОСНОВА TYPE SAFETY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * UnifiedTask представляет главную инновацию архитектуры SSOT - использование
 * TypeScript Discriminated Unions для объединения разнородных типов задач
 * в единую type-safe систему.
 * 
 * ПРИНЦИП РАБОТЫ:
 * ──────────────────
 * 
 * Discriminated Union использует поле 'phase' как дискриминатор для определения
 * конкретного типа задачи. TypeScript автоматически сужает тип (type narrowing)
 * при проверке значения дискриминатора, предоставляя доступ только к релевантным
 * полям для каждого типа.
 * 
 * ПРИМЕР ИСПОЛЬЗОВАНИЯ:
 * ──────────────────────
 * 
 * ```typescript
 * function handleTask(task: UnifiedTask) {
 *   if (task.phase === 'pre_construction') {
 *     // TypeScript знает, что это EstimateTaskUnified
 *     console.log(task.includeMode); // ✅ Доступно
 *     console.log(task.progressPct); // ❌ Ошибка компиляции
 *   } else {
 *     // TypeScript знает, что это ProjectTaskUnified  
 *     console.log(task.progressPct); // ✅ Доступно
 *     console.log(task.includeMode); // ❌ Ошибка компиляции
 *   }
 * }
 * ```
 * 
 * ПРЕИМУЩЕСТВА:
 * ────────────────
 * 
 * 1. COMPILE-TIME БЕЗОПАСНОСТЬ
 *    - Невозможно обращение к несуществующим полям
 *    - Автоматическое определение доступных свойств
 *    - Предотвращение runtime ошибок
 * 
 * 2. ИНТЕЛЛЕКТУАЛЬНЫЕ IDE ПОДСКАЗКИ
 *    - Автокомплит только релевантных полей
 *    - Контекстная помощь при разработке
 *    - Автоматический рефакторинг
 * 
 * 3. РАСШИРЯЕМОСТЬ
 *    - Простое добавление новых типов задач
 *    - Сохранение совместимости при изменениях
 *    - Модульное развитие архитектуры
 */
export type UnifiedTask = EstimateTaskUnified | ProjectTaskUnified;

// ==================== УТИЛИТЫ TYPE SAFETY ====================

/**
 * TYPE GUARDS - Защищенное определение типов
 * 
 * Type guards обеспечивают runtime проверку типов с сохранением
 * TypeScript type narrowing. Используются для безопасного приведения
 * типов и условной логики обработки.
 * 
 * ПРИМЕНЕНИЕ:
 * ──────────────
 * - Условная обработка разных типов задач
 * - Безопасное приведение типов в runtime
 * - Интеграция с системами валидации
 * 
 * @param task - Задача для проверки типа
 * @returns boolean - результат проверки с type narrowing
 */

/** Проверка, является ли задача типом EstimateTask */
export const isEstimateTask = (task: UnifiedTask): task is EstimateTaskUnified => {
  return task.phase === 'pre_construction';
};

/** Проверка, является ли задача типом ProjectTask */
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
/**
 * Типы данных для ERP-модуля: Управление сметами, проектами, учетом времени и расчетом себестоимости
 * Реализация Технического Задания (ТЗ) для сквозного контура «Оценка → Выполнение → Факт»
 */

import { EstimateStatus, ItemType } from './estimate.types';
import { ProjectStatus } from './project.types';

// ==================== СПРАВОЧНИКИ И НАСТРОЙКИ ====================

/**
 * Категория сметы (иерархическая структура на основе CSI или собственных стандартов)
 */
export interface EstimateCategory {
  id: string;
  code: string;                    // CSI код, например "03 30 00" 
  name: string;                    // "Cast-in-Place Concrete"
  description?: string;
  parentId?: string;               // Для иерархии
  level: number;                   // Уровень вложенности (1-4)
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ставки трудозатрат с бёрденом (нагрузкой)
 */
export interface LaborRate {
  id: string;
  // Применимость
  roleId?: string;                 // Ставка по роли
  userId?: string;                 // Персональная ставка (приоритет выше роли)
  projectId?: string;              // Проектная ставка (приоритет выше общих)
  
  // Основные ставки
  hourlyRate: number;              // Базовая ставка $ за час
  burdenFactor: number;            // Коэффициент нагрузки (1.35 = 35% нагрузки)
  
  // Множители
  overtimeMultiplier15: number;    // OT 1.5 (обычно 1.5)
  overtimeMultiplier20: number;    // OT 2.0 (обычно 2.0)
  shiftMultiplier: number;         // Ночная смена (обычно 1.1-1.2)
  
  // Период действия
  effectiveFrom: string;           // ISO date
  effectiveTo?: string;            // ISO date, null = бессрочно
  
  // Детали нагрузки (для прозрачности)
  burdenBreakdown?: {
    payrollTaxPct: number;         // Налоги с ФОТ
    workerCompPct: number;         // Страхование работников
    benefitsPct: number;           // Бенефиты (медицина, отпуск)
    equipmentPct: number;          // Амортизация инструментов
    overheadPct: number;           // Прочие накладные
  };
  
  // Метаданные
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

/**
 * Шаблон задач (для быстрого создания типовых EstimateTask/ProjectTask)
 */
export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'pre_construction' | 'execution' | 'administrative';
  estimatedHours: number;
  requiredRole?: string;
  defaultIncludeMode?: IncludeMode;   // Для EstimateTask
  tags?: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

// ==================== УПРАВЛЕНИЕ ОЦЕНКОЙ (PRE-CONSTRUCTION) ====================

/**
 * Режим включения задачи сметы в себестоимость
 */
export type IncludeMode = 
  | 'COGS'    // Включить в прямую себестоимость проекта
  | 'OH'      // Включить в накладные расходы (Overhead) 
  | 'NONE';   // Не учитывать финансово (только для метрик)

/**
 * Статус задачи
 */
export type TaskStatus = 
  | 'not_started'     // Не начата
  | 'in_progress'     // В работе
  | 'blocked'         // Заблокирована
  | 'done'            // Выполнена
  | 'quality_assurance' // На проверке
  | 'approved'        // Одобрена
  | 'rejected';       // Отклонена

/**
 * Задача для сметы (этап Pre-construction)
 */
export interface EstimateTask {
  id: string;
  estimateId: string;
  categoryId?: string;             // Связь с EstimateCategory
  
  // Основные данные
  name: string;
  description?: string;
  plannedHours: number;
  actualHours?: number;
  
  // Ресурсы
  assignedRole?: string;           // Роль исполнителя
  assignedUserId?: string;         // Конкретный исполнитель
  
  // Финансовая логика (ключевое для ТЗ)
  includeMode: IncludeMode;        // Как включать в расчеты
  
  // Управление
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Временные рамки
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  
  // Связи
  dependencies?: string[];         // IDs других EstimateTask
  relatedEstimateItems?: string[]; // IDs EstimateItem, для которых выполняется задача
  
  // Метаданные
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  completedBy?: string;
  completedAt?: string;
  
  // Дополнительно
  tags?: string[];
  notes?: string;
  attachments?: string[];          // URLs файлов
}

// ==================== УПРАВЛЕНИЕ ВЫПОЛНЕНИЕМ (EXECUTION) ====================

/**
 * Задача проекта (этап Execution)
 */
export interface ProjectTask {
  id: string;
  projectId: string;
  estimateItemId?: string;         // Связь с позицией сметы (маппинг)
  categoryId?: string;             // Связь с EstimateCategory
  
  // WBS (Work Breakdown Structure)
  wbsCode?: string;               // 1.2.3.4
  parentTaskId?: string;          // Для иерархии задач
  
  // Основные данные
  name: string;
  description?: string;
  plannedHours: number;
  actualHours?: number;
  
  // Бюджет (план vs факт)
  plannedCost: number;
  actualCost?: number;
  budgetUtilizationPct?: number;   // % использования бюджета
  
  // Ресурсы
  assignedRole?: string;
  assignedUserId?: string;
  assignedTeam?: string[];         // IDs участников команды
  
  // Управление
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progressPct: number;             // 0-100% выполнения
  
  // Временные рамки
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  
  // Связи и зависимости
  dependencies?: string[];         // IDs других ProjectTask
  milestone?: string;              // Ключевая веха
  
  // Ограничения и контроль
  budgetLimit?: number;            // Лимит расходов
  hourlyLimit?: number;            // Лимит часов
  requiresApprovalOver?: number;   // Требует подтверждения свыше N часов
  
  // Метаданные
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  completedBy?: string;
  completedAt?: string;
  
  // Дополнительно
  tags?: string[];
  notes?: string;
  attachments?: string[];
  changeOrders?: string[];         // IDs Change Orders
}

// ==================== УЧЕТ ФАКТА И ФИНАНСЫ ====================

/**
 * Тип времени/тег
 */
export type TimeEntryTag = 
  | 'billable'        // Оплачиваемое
  | 'non_billable'    // Неоплачиваемое
  | 'warranty'        // Гарантийное обслуживание
  | 'safety'          // Время на безопасность
  | 'travel'          // Время в пути
  | 'admin'           // Административное
  | 'pending_co'      // В ожидании Change Order
  | 'rework'          // Переделка
  | 'training';       // Обучение

/**
 * Снимок стоимости на момент записи времени (для исторической неизменности)
 */
export interface CostSnapshot {
  // Базовые ставки на дату выполнения
  hourlyRate: number;
  burdenFactor: number;
  loadedRate: number;              // hourlyRate * (1 + burdenFactor)
  
  // Примененные множители
  overtimeMultiplier?: number;     // Если сверхурочные
  shiftMultiplier?: number;        // Если ночная смена
  effectiveMultiplier: number;     // Итоговый множитель
  
  // Финальные расчеты
  directLaborCost: number;         // Часы × hourlyRate × множители
  burderedLaborCost: number;       // directLaborCost × burdenFactor
  
  // Источники данных (для аудита)
  laborRateId: string;            // ID использованной LaborRate
  calculatedAt: string;           // Момент расчета
  calculationRules?: {            // Правила, использованные при расчете
    roundingRule?: string;
    includeMode?: IncludeMode;    // Если применимо
  };
}

/**
 * Расширенная запись времени с workflow и стоимостью
 */
export interface TimeEntry {
  id: string;
  
  // Базовые данные
  userId: string;
  userName?: string;              // Денормализация для отчетов
  date: string;                   // ISO date (YYYY-MM-DD)
  hours: number;                  // Количество часов (мин. 0.25)
  description: string;            // Обязательный комментарий
  
  // Привязка к задачам
  taskId: string;                 // ID EstimateTask или ProjectTask
  taskType: 'estimate_task' | 'project_task'; // Тип задачи
  projectId?: string;             // Денормализация
  estimateId?: string;            // Денормализация
  
  // Теги и классификация
  tags: TimeEntryTag[];
  billableHours?: number;         // Может отличаться от hours
  
  // Workflow состояния
  status: 'draft' | 'submitted' | 'returned' | 'resubmitted' | 'approved' | 'rejected' | 'posted';
  
  // Участники процесса
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  returnReason?: string;          // Причина возврата
  
  // Финансовые данные (заполняются при approved → posted)
  costSnapshot?: CostSnapshot;    // Снимок расчета стоимости
  
  // Геолокация и фотофиксация
  startLocation?: { latitude: number; longitude: number; accuracy?: number };
  endLocation?: { latitude: number; longitude: number; accuracy?: number };
  startPhotoUrl?: string;
  endPhotoUrl?: string;
  
  // SLA и дедлайны
  cutoffDate?: string;            // Дата cut-off недели
  overdueFlags?: {
    submissionOverdue: boolean;   // Просрочена подача
    approvalOverdue: boolean;     // Просрочено утверждение
  };
  
  // Метаданные
  createdAt: string;
  updatedAt: string;
  timeZone?: string;              // Часовой пояс
  
  // Дополнительно
  attachments?: string[];         // URLs документов
  relatedChangeOrderId?: string;  // Если связано с CO
}

/**
 * Прочие затраты (материалы, субподряд, etc.)
 */
export interface Expense {
  id: string;
  projectId: string;
  taskId?: string;               // Привязка к ProjectTask
  categoryId?: string;           // Привязка к EstimateCategory
  
  // Основные данные
  type: 'material' | 'equipment' | 'subcontract' | 'rental' | 'travel' | 'other';
  description: string;
  amount: number;
  currency: string;
  
  // Детализация
  quantity?: number;
  unitCost?: number;
  unit?: string;
  
  // Поставщик/Подрядчик
  vendorId?: string;
  vendorName?: string;
  invoiceNumber?: string;
  
  // Workflow
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'posted';
  approvedBy?: string;
  approvedAt?: string;
  
  // Даты
  expenseDate: string;            // Дата расхода
  dueDate?: string;               // Срок оплаты
  paidDate?: string;              // Дата оплаты
  
  // Метаданные
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Дополнительно
  tags?: string[];
  attachments?: string[];         // Чеки, инвойсы
  notes?: string;
}

/**
 * Проводка себестоимости (системная сущность)
 */
export interface COGSRecord {
  id: string;
  projectId: string;
  
  // Источник проводки
  sourceType: 'time_entry' | 'expense' | 'adjustment';
  sourceId: string;               // ID TimeEntry/Expense
  
  // Классификация
  categoryId?: string;            // EstimateCategory
  category: string;               // Человеко-читаемая категория
  subCategory?: string;           // Подкатегория (labor, materials, etc.)
  
  // Финансовые данные
  amount: number;                 // Сумма в COGS
  currency: string;
  costType: 'direct_labor' | 'burdened_labor' | 'materials' | 'equipment' | 'subcontract' | 'other';
  
  // Временные данные (для трудозатрат)
  hours?: number;                 // Количество часов
  hourlyRate?: number;            // Ставка
  
  // Отчетный период
  periodDate: string;             // YYYY-MM (для группировки в отчетах)
  fiscalYear: string;             // Финансовый год
  fiscalQuarter: string;          // Финансовый квартал
  
  // Метаданные
  generatedAt: string;            // Момент создания проводки
  generatedBy: string;            // Кто сгенерировал (система/пользователь)
  reversedBy?: string;            // ID обратной проводки (если сторнирована)
  
  // Аудит
  auditTrail?: {
    originalTimeEntryStatus?: string;
    approvalChain?: Array<{
      userId: string;
      action: string;
      timestamp: string;
    }>;
  };
}

// ==================== УПРАВЛЕНИЕ ИЗМЕНЕНИЯМИ (CHANGE ORDERS) ====================

/**
 * Change Order - управление изменениями в проекте
 */
export interface ChangeOrder {
  id: string;
  projectId: string;
  number: string;                 // CO-2025-001
  
  // Основные данные
  title: string;
  description: string;
  reason: string;                 // Причина изменения
  
  // Финансовое влияние
  costImpact: number;             // Изменение стоимости (может быть отрицательным)
  timeImpact?: number;            // Изменение времени (дни)
  
  // Статус и workflow
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'implemented' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Участники
  requestedBy: string;
  reviewedBy?: string;
  approvedBy?: string;
  
  // Связанные данные
  relatedEstimateId?: string;     // Связанная смета CO
  relatedTasks: string[];         // ProjectTask, созданные для CO
  pendingTimeEntries?: string[];  // TimeEntry с тегом "pending_co"
  
  // Временные рамки
  requestedDate: string;
  requiredDate?: string;          // Когда нужно внедрить
  approvedDate?: string;
  implementedDate?: string;
  
  // Метаданные
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Дополнительно
  attachments?: string[];
  notes?: string;
}

// ==================== ОТЧЕТНОСТЬ И АНАЛИТИКА ====================

/**
 * COGS (Cost of Goods Sold) - себестоимость проекта
 */
export interface ProjectCOGS {
  projectId: string;
  calculatedAt: string;
  
  // Трудозатраты
  directLabor: number;            // Прямые трудозатраты
  burderedLabor: number;          // Трудозатраты с нагрузкой
  preConstructionLabor: number;   // Pre-construction труд (если COGS)
  
  // Материалы и оборудование
  materials: number;
  equipment: number;
  
  // Субподряд
  subcontract: number;
  
  // Прочие прямые затраты
  otherDirect: number;
  
  // Итого COGS
  totalCOGS: number;
  
  // Накладные расходы (справочно, не входят в COGS)
  overhead: number;               // Pre-construction с режимом OH + прочие
  
  // Разбивка по категориям
  breakdown: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
  }>;
  
  // Разбивка по периодам
  monthlyBreakdown?: Array<{
    period: string;               // YYYY-MM
    amount: number;
  }>;
}

/**
 * P&L анализ проекта
 */
export interface ProjectProfitLoss {
  projectId: string;
  calculatedAt: string;
  
  // Доходы
  contractValue: number;          // Основной контракт
  changeOrders: number;           // Одобренные CO
  totalRevenue: number;           // Общая выручка
  
  // Себестоимость
  cogs: ProjectCOGS;
  
  // Прибыльность
  grossProfit: number;            // Revenue - COGS
  grossMarginPct: number;         // (Gross Profit / Revenue) * 100
  
  // Накладные расходы
  overhead: number;               // OH расходы проекта
  
  // Операционная прибыль
  operatingProfit: number;        // Gross Profit - Overhead
  operatingMarginPct: number;     // (Operating Profit / Revenue) * 100
}

/**
 * Отчет "План vs Факт" по позиции сметы
 */
export interface EstimateVarianceReport {
  estimateItemId: string;
  category: string;
  description: string;
  
  // Плановые показатели
  plannedHours: number;
  plannedCost: number;
  
  // Фактические показатели
  actualHours: number;
  actualCost: number;
  
  // Отклонения
  hourVariance: number;           // actual - planned
  hourVariancePct: number;        // (variance / planned) * 100
  costVariance: number;
  costVariancePct: number;
  
  // Статус
  completionPct: number;          // % завершенности
  isOverBudget: boolean;
  isOverSchedule: boolean;
  
  // Прогноз
  forecastHours?: number;         // Прогноз итоговых часов
  forecastCost?: number;          // Прогноз итоговой стоимости
  estimateToComplete?: number;    // Оценка для завершения
}

// ==================== НАСТРОЙКИ И КОНФИГУРАЦИЯ ====================

/**
 * Настройки модуля учета времени
 */
export interface TimeTrackingSettings {
  // Округление и лимиты
  minimumIncrement: number;       // Минимальный шаг (0.25 часа)
  roundingRule: 'up' | 'down' | 'nearest'; // Правило округления
  dailyHourLimit: number;         // Дневной лимит (12 часов)
  weeklyHourLimit: number;        // Недельный лимит (72 часа)
  
  // Дедлайны и SLA
  dailySubmissionDeadline: string; // "21:00"
  weeklySubmissionCutoff: string;  // "Friday 18:00"
  approvalSLA: number;            // Часов на утверждение (48)
  
  // Валидации
  allowFutureDates: boolean;      // Можно ли логировать в будущее
  editWindowDays: number;         // Дней для редактирования (14)
  requirePhotos: boolean;         // Обязательные фото
  requireLocation: boolean;       // Обязательная геолокация
  
  // Утверждения
  requireManagerApproval: boolean; // Нужно ли утверждение РП
  autoApproveThreshold?: number;  // Авто-утверждение до N часов
  escalationEnabled: boolean;     // Включена ли эскалация
  
  // Pre-construction по умолчанию
  defaultIncludeMode: IncludeMode; // COGS/OH/NONE для EstimateTask
}

/**
 * Настройки расчета себестоимости
 */
export interface COGSCalculationSettings {
  // Общие правила
  includeBurdenInCOGS: boolean;   // Включать ли burden в COGS
  useProjectSpecificRates: boolean; // Использовать проектные ставки
  
  // Накладные расходы
  defaultOverheadRate: number;    // % накладных по умолчанию
  overheadAllocationMethod: 'direct_labor' | 'total_hours' | 'equal'; // Метод распределения
  
  // Валюта и округление
  baseCurrency: string;           // USD
  exchangeRateSource?: string;    // API источник курсов
  roundToDigits: number;          // Знаков после запятой (2)
  
  // Отчетные периоды
  fiscalYearStart: string;        // "01-01" или "04-01"
  reportingFrequency: 'weekly' | 'monthly' | 'quarterly';
  
  // Автоматизация
  autoCalculateCOGS: boolean;     // Авто-расчет при approved
  batchProcessingEnabled: boolean; // Пакетная обработка
  auditTrailRequired: boolean;    // Обязательный аудит-след
}

// ==================== ПОЛНОМОЧИЯ И РОЛИ (RBAC) ====================

/**
 * Расширенные роли для ERP-модуля
 */
export type ERPRole = 
  | 'field_worker'        // Исполнитель
  | 'estimator'           // Сметчик/Инженер  
  | 'project_manager'     // Руководитель проекта
  | 'financial_manager'   // Финансовый менеджер
  | 'administrator';      // Администратор

/**
 * Полномочия в ERP-модуле
 */
export interface ERPPermissions {
  // Управление временем
  canLogTime: boolean;
  canSubmitTime: boolean;
  canApproveTime: boolean;
  canEditHistoricalTime: boolean;
  canOverrideLimits: boolean;
  
  // Управление задачами
  canCreateEstimateTasks: boolean;
  canCreateProjectTasks: boolean;
  canAssignTasks: boolean;
  canChangeTaskStatus: boolean;
  
  // Финансовые данные
  canViewLaborRates: boolean;
  canEditLaborRates: boolean;
  canViewCOGS: boolean;
  canViewProfitLoss: boolean;
  canProcessExpenses: boolean;
  
  // Сметы и проекты
  canCreateEstimates: boolean;
  canApproveEstimates: boolean;
  canConvertToProject: boolean;
  canManageChangeOrders: boolean;
  
  // Отчетность
  canViewReports: boolean;
  canExportReports: boolean;
  canViewAuditLogs: boolean;
  
  // Администрирование
  canConfigureSettings: boolean;
  canManageUsers: boolean;
  canPerformBulkOperations: boolean;
}

/**
 * Матрица полномочий по ролям
 */
export const ERP_ROLE_PERMISSIONS: Record<ERPRole, ERPPermissions> = {
  field_worker: {
    canLogTime: true,
    canSubmitTime: true,
    canApproveTime: false,
    canEditHistoricalTime: false,
    canOverrideLimits: false,
    canCreateEstimateTasks: false,
    canCreateProjectTasks: false,
    canAssignTasks: false,
    canChangeTaskStatus: true,      // Только свои задачи
    canViewLaborRates: false,
    canEditLaborRates: false,
    canViewCOGS: false,
    canViewProfitLoss: false,
    canProcessExpenses: false,
    canCreateEstimates: false,
    canApproveEstimates: false,
    canConvertToProject: false,
    canManageChangeOrders: false,
    canViewReports: false,
    canExportReports: false,
    canViewAuditLogs: false,
    canConfigureSettings: false,
    canManageUsers: false,
    canPerformBulkOperations: false,
  },
  
  estimator: {
    canLogTime: true,
    canSubmitTime: true,
    canApproveTime: false,
    canEditHistoricalTime: false,
    canOverrideLimits: false,
    canCreateEstimateTasks: true,
    canCreateProjectTasks: false,
    canAssignTasks: false,
    canChangeTaskStatus: true,
    canViewLaborRates: true,        // Просмотр для расчетов
    canEditLaborRates: false,
    canViewCOGS: false,
    canViewProfitLoss: false,
    canProcessExpenses: false,
    canCreateEstimates: true,
    canApproveEstimates: false,
    canConvertToProject: false,
    canManageChangeOrders: false,
    canViewReports: true,           // Базовые отчеты
    canExportReports: false,
    canViewAuditLogs: false,
    canConfigureSettings: false,
    canManageUsers: false,
    canPerformBulkOperations: false,
  },
  
  project_manager: {
    canLogTime: true,
    canSubmitTime: true,
    canApproveTime: true,
    canEditHistoricalTime: true,    // С ограничениями
    canOverrideLimits: false,
    canCreateEstimateTasks: true,
    canCreateProjectTasks: true,
    canAssignTasks: true,
    canChangeTaskStatus: true,
    canViewLaborRates: true,
    canEditLaborRates: false,       // Только просмотр
    canViewCOGS: true,
    canViewProfitLoss: true,
    canProcessExpenses: true,
    canCreateEstimates: true,
    canApproveEstimates: true,
    canConvertToProject: true,
    canManageChangeOrders: true,
    canViewReports: true,
    canExportReports: true,
    canViewAuditLogs: true,
    canConfigureSettings: false,
    canManageUsers: false,
    canPerformBulkOperations: false,
  },
  
  financial_manager: {
    canLogTime: false,              // Не логирует время
    canSubmitTime: false,
    canApproveTime: true,           // Может утверждать OH
    canEditHistoricalTime: true,
    canOverrideLimits: true,
    canCreateEstimateTasks: false,
    canCreateProjectTasks: false,
    canAssignTasks: false,
    canChangeTaskStatus: false,
    canViewLaborRates: true,
    canEditLaborRates: true,
    canViewCOGS: true,
    canViewProfitLoss: true,
    canProcessExpenses: true,
    canCreateEstimates: false,
    canApproveEstimates: false,
    canConvertToProject: false,
    canManageChangeOrders: false,   // Только финансовая часть
    canViewReports: true,
    canExportReports: true,
    canViewAuditLogs: true,
    canConfigureSettings: true,     // Финансовые настройки
    canManageUsers: false,
    canPerformBulkOperations: true,
  },
  
  administrator: {
    canLogTime: true,
    canSubmitTime: true,
    canApproveTime: true,
    canEditHistoricalTime: true,
    canOverrideLimits: true,
    canCreateEstimateTasks: true,
    canCreateProjectTasks: true,
    canAssignTasks: true,
    canChangeTaskStatus: true,
    canViewLaborRates: true,
    canEditLaborRates: true,
    canViewCOGS: true,
    canViewProfitLoss: true,
    canProcessExpenses: true,
    canCreateEstimates: true,
    canApproveEstimates: true,
    canConvertToProject: true,
    canManageChangeOrders: true,
    canViewReports: true,
    canExportReports: true,
    canViewAuditLogs: true,
    canConfigureSettings: true,
    canManageUsers: true,
    canPerformBulkOperations: true,
  },
};

// ==================== API И СОБЫТИЯ ====================

/**
 * События ERP-системы для webhooks
 */
export type ERPEvent = 
  | 'time_entry.submitted'
  | 'time_entry.approved'
  | 'time_entry.rejected'
  | 'time_entry.posted'
  | 'expense.approved'
  | 'cogs.recalculated'
  | 'labor_rates.updated'
  | 'budget.exceeded'
  | 'task.completed'
  | 'project.budget_alert'
  | 'estimate.converted';

/**
 * Payload события
 */
export interface ERPEventPayload {
  event: ERPEvent;
  timestamp: string;
  userId?: string;
  projectId?: string;
  data: any;
}

// ==================== ЭКСПОРТ ====================

export {
  // Переэкспорт базовых типов для удобства
  type EstimateStatus,
  type ProjectStatus,
  type ItemType
};
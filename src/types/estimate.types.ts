/**
 * Типы и интерфейсы для системы смет-конструктора
 * Смета состоит из независимых блоков, которые можно заполнять в любом порядке
 */

// ==================== БАЗОВЫЕ ТИПЫ ====================

export type EstimateStatus =
  | 'draft'           // Черновик
  | 'internal_review' // Внутренняя проверка
  | 'sent'           // Отправлена клиенту
  | 'viewed'         // Просмотрена клиентом
  | 'negotiation'    // На согласовании
  | 'accepted'       // Принята
  | 'rejected'       // Отклонена
  | 'expired'        // Истек срок
  | 'converted'      // Конвертирована в договор
  | 'invoiced'       // Выставлен счет
  | 'canceled';      // Отменена

export type BlockKey =
  | 'counterparty'    // Контрагент
  | 'project'        // Проект
  | 'services'       // Услуги
  | 'products'       // Товары
  | 'costing'        // Себестоимость
  | 'communication'  // Коммуникация
  | 'statuses'       // Статусы
  | 'estimate_tasks'; // Задачи для сметы (Pre-construction)

export type ItemType = 'service' | 'material' | 'equipment';

export type PaymentTerms = 'DueOnReceipt' | 'Net7' | 'Net15' | 'Net30' | 'Custom';

export type RoundingRule = 'none' | 'ceil_1' | 'ceil_10' | 'bankers';

export type Scenario = 'base' | 'optimistic' | 'pessimistic';

export type SignMethod = 'e-sign' | 'wet-sign';

export type CommunicationChannel = 'email' | 'link' | 'whatsapp' | 'sms';

// ==================== БЛОКИ ====================

/**
 * Состояние блока конструктора
 */
export interface BlockState<T = unknown> {
  key: BlockKey;
  status: 'empty' | 'in_progress' | 'complete';
  dataVersion: number;
  data: T;
  lastEditedBy?: string;
  updatedAt: string; // ISO date
}

/**
 * Данные блока "Контрагент"
 */
export interface CounterpartyBlockData {
  counterpartyId: string;
  primaryContactId?: string;
  billingAddressId?: string;
  shippingAddressId?: string;
  taxProfileId?: string;
  paymentTerms?: PaymentTerms;
  customFields?: Record<string, string | number | boolean>;
}

/**
 * Данные блока "Проект"
 */
export interface ProjectBlockData {
  projectId: string;
  siteAddressId?: string;
  jurisdictionId?: string;    // налоговая юрисдикция
  taxRateId?: string;
  costCenterId?: string;       // центр затрат
  customFields?: Record<string, string | number | boolean>;
}

/**
 * Данные блока "Себестоимость"
 */
export interface CostingBlockData {
  laborRates: Array<{
    roleId: string;
    ratePerHour: number;
  }>;
  overheadPct: number;         // Накладные расходы %
  profitTargetPct?: number;    // Целевая прибыль %
  freightPct?: number;         // Доставка %
  discountAmt?: number;        // Скидка (сумма)
  shippingAmt?: number;        // Доставка (сумма)
  depositPct?: number;         // Депозит %
  retentionPct?: number;       // Удержание %
  roundingRule?: RoundingRule;
  scenario?: Scenario;
}

/**
 * Данные блока "Коммуникация"
 */
export interface CommunicationBlockData {
  clientPortalEnabled: boolean;
  allowLineItemComments: boolean;
  allowNegotiation: boolean;
  readReceipts: boolean;
  signMethod: SignMethod;
  primaryChannel: CommunicationChannel;
  messageTemplates: string[];
  paymentLink?: string;        // Stripe/QBO link
  threadId?: string;           // ID переписки
}

/**
 * Данные блока "Статусы"
 */
export interface StatusesBlockData {
  current: EstimateStatus;
  checklist: Array<{
    key: string;
    label: string;
    done: boolean;
    required: boolean;
  }>;
  transitions: Array<{
    from: EstimateStatus;
    to: EstimateStatus;
    guard?: string;            // условие перехода
    auto?: boolean;            // автоматический переход
  }>;
}

/**
 * Данные блока "Задачи для сметы"
 */
export interface EstimateTasksBlockData {
  tasks: Array<{
    id: string;
    name: string;
    description?: string;
    plannedHours: number;
    actualHours?: number;
    assignedRole?: string;
    assignedUserId?: string;
    includeMode: 'COGS' | 'OH' | 'NONE';  // Ключевое для ТЗ
    status: 'not_started' | 'in_progress' | 'blocked' | 'done' | 'quality_assurance' | 'approved' | 'rejected';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    tags?: string[];
    notes?: string;
  }>;
  defaultIncludeMode: 'COGS' | 'OH' | 'NONE';  // Настройка по умолчанию
  totalPlannedHours: number;
  totalActualHours: number;
}

// ==================== ПОЗИЦИИ СМЕТЫ ====================

/**
 * Базовая позиция сметы
 */
interface BaseEstimateItem {
  id: string;
  estimateId: string;
  type: ItemType;
  name: string;
  description?: string;
  qty: number;
  unit: string;
  sortOrder: number;
  taxCodeId?: string;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

/**
 * Секция услуг
 */
export interface ServiceSection {
  id: string;
  title: string;
  sortOrder: number;
}

/**
 * Позиция услуги
 */
export interface ServiceItem extends BaseEstimateItem {
  type: 'service';
  sectionId?: string;
  csiCode?: string;           // Construction Specifications Institute code
  phaseId?: string;
  locationId?: string;
  taskId?: string;            // связь с задачей
  rate: number;               // цена за единицу
  unitCost?: number;          // себестоимость
  marginPct?: number;         // маржа %
}

/**
 * Позиция товара/материала
 */
export interface ProductLine extends BaseEstimateItem {
  type: 'material' | 'equipment';
  productId?: string;
  sku?: string;
  unitCost: number;           // закупочная цена
  unitPrice?: number;         // продажная цена
  wastePct?: number;          // процент отходов
  vendorId?: string;          // поставщик
  leadTimeDays?: number;      // срок поставки
  reserveFromStock?: boolean; // резерв со склада
}

/**
 * Объединенный тип позиции
 */
export type EstimateItem = ServiceItem | ProductLine;

// ==================== ОСНОВНАЯ СУЩНОСТЬ ====================

/**
 * Итоговые суммы сметы
 */
export interface EstimateTotals {
  materialsCost: number;      // Стоимость материалов
  laborCost: number;          // Стоимость работ
  equipmentCost: number;      // Стоимость оборудования
  subcontractCost: number;    // Стоимость субподряда
  overheadPct: number;        // Накладные %
  overheadAmt: number;        // Накладные сумма
  discountAmt: number;        // Скидка
  shippingAmt: number;        // Доставка
  subtotalPrice: number;      // Подитог
  taxAmt: number;            // Налог
  grandTotal: number;        // Итого
  grossMarginPct: number;    // Валовая маржа %
}

/**
 * Настройки публичного доступа
 */
export interface PublicSettings {
  allowDownload: boolean;
  showUnitPrices: boolean;
  requireLogin: boolean;
}

/**
 * Основная сущность - Смета
 */
export interface Estimate {
  id: string;
  number: string;              // EST-2025-00123
  status: EstimateStatus;
  revision: number;
  parentEstimateId?: string | null;
  
  // Привязки
  projectId?: string | null;
  counterpartyId?: string | null;
  
  // Валюта и условия
  currency: string;
  taxProfileId?: string | null;
  terms?: string;
  validUntil?: string;         // ISO date
  
  // Публичность
  publicShareId?: string | null;
  pdfSnapshotUrl?: string | null;
  publicSettings?: PublicSettings;
  
  // Итоги
  totals: EstimateTotals;
  
  // Блоки
  blocks: BlockState[];
  
  // Метаданные
  createdBy: string;
  createdAt: string;           // ISO date
  updatedAt: string;           // ISO date
  auditLog?: AuditLogEntry[];
}

/**
 * Запись в журнале аудита
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;           // ISO date
  userId: string;
  userName?: string;
  action: string;
  details?: any;
  ip?: string;
}

// ==================== СОБЫТИЯ ====================

export type EstimateEvent =
  | 'estimate.created'
  | 'estimate.updated'
  | 'estimate.sent'
  | 'estimate.viewed'
  | 'estimate.commented'
  | 'estimate.accepted'
  | 'estimate.rejected'
  | 'estimate.expired'
  | 'estimate.converted'
  | 'estimate.canceled'
  | 'estimate.paid_partial'
  | 'estimate.paid_full';

export interface EstimateEventPayload {
  estimateId: string;
  event: EstimateEvent;
  timestamp: string;
  userId?: string;
  data?: any;
}

// ==================== ПРАВА ДОСТУПА ====================

export type EstimateRole = 'viewer' | 'estimator' | 'manager' | 'accountant';

export interface EstimatePermissions {
  canView: boolean;
  canEdit: boolean;
  canEditAfterSent: boolean;
  canDelete: boolean;
  canSend: boolean;
  canAccept: boolean;
  canConvert: boolean;
  canManageBlocks: BlockKey[];
}

export const ROLE_PERMISSIONS: Record<EstimateRole, EstimatePermissions> = {
  viewer: {
    canView: true,
    canEdit: false,
    canEditAfterSent: false,
    canDelete: false,
    canSend: false,
    canAccept: false,
    canConvert: false,
    canManageBlocks: [],
  },
  estimator: {
    canView: true,
    canEdit: true,
    canEditAfterSent: false,
    canDelete: false,
    canSend: true,
    canAccept: false,
    canConvert: false,
    canManageBlocks: ['services', 'products', 'costing', 'estimate_tasks'],
  },
  manager: {
    canView: true,
    canEdit: true,
    canEditAfterSent: true,
    canDelete: true,
    canSend: true,
    canAccept: true,
    canConvert: true,
    canManageBlocks: ['counterparty', 'project', 'services', 'products', 'costing', 'communication', 'statuses', 'estimate_tasks'],
  },
  accountant: {
    canView: true,
    canEdit: false,
    canEditAfterSent: false,
    canDelete: false,
    canSend: false,
    canAccept: false,
    canConvert: true,
    canManageBlocks: ['costing', 'estimate_tasks'],
  },
};

// ==================== ВСПОМОГАТЕЛЬНЫЕ ТИПЫ ====================

/**
 * Фильтры для списка смет
 */
export interface EstimateFilters {
  status?: EstimateStatus[];
  projectId?: string;
  counterpartyId?: string;
  hasProject?: boolean;
  hasCounterparty?: boolean;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
}

/**
 * Настройки сортировки
 */
export interface EstimateSortOptions {
  field: 'number' | 'status' | 'total' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

/**
 * Данные для создания новой сметы
 */
export interface CreateEstimateDto {
  projectId?: string;
  counterpartyId?: string;
  currency?: string;
  templateId?: string;
}

/**
 * Данные для обновления блока
 */
export interface UpdateBlockDto<T = unknown> {
  status?: 'empty' | 'in_progress' | 'complete';
  data?: T;
}

/**
 * Результат валидации блока
 */
export interface BlockValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Шаблон сметы
 */
export interface EstimateTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  blocks: Partial<BlockState>[];
  items: Partial<EstimateItem>[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
}

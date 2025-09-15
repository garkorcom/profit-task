/**
 * Типы и интерфейсы для системы управления складами
 * Включает партийный учет, резервирование, движения и инвентаризации
 */

import { Item, MeasurementUnit, ItemType } from './item.types';

// ==================== БАЗОВЫЕ ТИПЫ ====================

/**
 * Типы складских операций
 */
export type StockTransactionType = 
  | 'receipt'         // Поступление
  | 'issue'           // Расход/отпуск
  | 'transfer'        // Перемещение между складами
  | 'adjustment'      // Корректировка
  | 'reservation'     // Резервирование
  | 'unreservation'   // Снятие резерва
  | 'production'      // Производство/сборка
  | 'disassembly'     // Разборка
  | 'return'          // Возврат
  | 'loss'            // Списание
  | 'found';          // Оприходование излишков

/**
 * Статусы складских транзакций
 */
export type TransactionStatus = 
  | 'draft'       // Черновик
  | 'confirmed'   // Подтверждена
  | 'executed'    // Выполнена
  | 'cancelled';  // Отменена

/**
 * Методы оценки запасов
 */
export type ValuationMethod = 'FIFO' | 'WAC';  // FIFO или средневзвешенная стоимость

/**
 * Типы резервирования
 */
export type ReservationType = 
  | 'estimate'    // Резерв под смету
  | 'project'     // Резерв под проект
  | 'order'       // Резерв под заказ
  | 'manual';     // Ручное резервирование

/**
 * Статусы партий
 */
export type LotStatus = 
  | 'available'   // Доступна
  | 'reserved'    // Зарезервирована
  | 'quarantine'  // На карантине
  | 'expired'     // Просрочена
  | 'damaged';    // Поврежденная

/**
 * Типы складских зон
 */
export type BinType = 
  | 'receiving'   // Зона приемки
  | 'storage'     // Хранение
  | 'picking'     // Комплектация
  | 'staging'     // Подготовка к отгрузке
  | 'quarantine'  // Карантин
  | 'damaged';    // Брак

// ==================== СКЛАДЫ И ЛОКАЦИИ ====================

/**
 * Склад
 */
export interface Warehouse {
  id: string;
  code: string;                    // Код склада
  name: string;                    // Название
  description?: string;
  
  // Адрес и контакты
  address: {
    street: string;
    city: string;
    postalCode?: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  contact?: {
    managerName?: string;
    phone?: string;
    email?: string;
  };
  
  // Настройки
  isActive: boolean;
  isDefault: boolean;              // Склад по умолчанию
  allowNegativeStock: boolean;     // Разрешен ли отрицательный остаток
  valuationMethod: ValuationMethod;
  
  // Ограничения
  maxCapacity?: number;            // Максимальная вместимость
  currentUtilization?: number;     // Текущая загрузка %
  
  // Метаданные
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

/**
 * Складская ячейка/зона
 */
export interface WarehouseBin {
  id: string;
  warehouseId: string;
  code: string;                    // Код ячейки (A-01-001)
  name: string;                    // Название
  type: BinType;                   // Тип зоны
  
  // Физическое расположение
  zone?: string;                   // Зона (A, B, C)
  aisle?: string;                  // Ряд/проход
  rack?: string;                   // Стеллаж
  shelf?: string;                  // Полка
  position?: string;               // Позиция
  
  // Характеристики
  capacity?: number;               // Вместимость
  temperature?: {                  // Температурные условия
    min: number;
    max: number;
  };
  
  // Ограничения
  allowMixedItems: boolean;        // Можно ли хранить разные товары
  restrictedItems?: string[];      // Ограниченные товары (по категориям)
  
  // Статус
  isActive: boolean;
  isBlocked: boolean;              // Заблокирована для операций
  blockReason?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ==================== ПАРТИИ И ОСТАТКИ ====================

/**
 * Партия товара
 */
export interface StockLot {
  id: string;
  itemId: string;
  warehouseId: string;
  binId?: string;                  // Основная ячейка хранения
  
  // Идентификация партии
  lotNumber: string;               // Номер партии
  serialNumber?: string;           // Серийный номер (если отслеживается)
  batchCode?: string;              // Код партии от поставщика
  
  // Количество и единицы
  quantity: number;                // Текущее количество
  reservedQuantity: number;        // Зарезервированное количество
  availableQuantity: number;       // Доступное = quantity - reservedQuantity
  unit: MeasurementUnit;           // Единица измерения
  
  // Стоимость и оценка
  unitCost: number;                // Себестоимость за единицу
  totalCost: number;               // Общая стоимость партии
  currency: string;                // Валюта
  
  // Даты и сроки
  receivedDate: string;            // Дата поступления
  productionDate?: string;         // Дата производства
  expiryDate?: string;             // Срок годности
  
  // Качество и статус
  status: LotStatus;
  qualityGrade?: string;           // Сорт/класс
  qualityNotes?: string;           // Примечания по качеству
  
  // Поставщик
  vendorId?: string;               // Поставщик
  vendorLotNumber?: string;        // Номер партии у поставщика
  purchaseOrderId?: string;        // Заказ на поставку
  receiptId?: string;              // Документ поступления
  
  // Физические характеристики (если отличаются от номенклатуры)
  actualDimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
  };
  
  // Метаданные
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  version: number;                 // Для оптимистичной блокировки
}

/**
 * Агрегированный остаток по позиции на складе
 */
export interface StockBalance {
  id: string;                      // warehouseId_itemId
  itemId: string;
  warehouseId: string;
  
  // Количества
  totalQuantity: number;           // Общее количество
  reservedQuantity: number;        // Зарезервированное количество
  availableQuantity: number;       // Доступное количество
  unit: MeasurementUnit;
  
  // Стоимость (по методу оценки склада)
  totalValue: number;              // Общая стоимость остатков
  avgUnitCost: number;             // Средняя себестоимость
  currency: string;
  
  // Аналитика
  lotCount: number;                // Количество партий
  oldestLotDate?: string;          // Дата самой старой партии
  nearExpiryCount?: number;        // Количество партий близких к истечению
  
  // Последняя активность
  lastTransactionDate?: string;
  lastTransactionType?: StockTransactionType;
  
  // Метаданные
  updatedAt: string;
  version: number;
}

// ==================== РЕЗЕРВИРОВАНИЯ ====================

/**
 * Резервирование запасов
 */
export interface StockReservation {
  id: string;
  itemId: string;
  warehouseId: string;
  
  // Резервирование
  type: ReservationType;
  referenceId: string;             // ID сметы/проекта/заказа
  referenceName?: string;          // Название ссылаемого объекта
  
  // Количество
  requestedQuantity: number;       // Запрошенное количество
  reservedQuantity: number;        // Фактически зарезервированное
  unit: MeasurementUnit;
  
  // Привязка к партиям
  lotAllocations: Array<{
    lotId: string;
    quantity: number;
  }>;
  
  // Временные рамки
  reservedDate: string;            // Дата резервирования
  requiredDate?: string;           // Требуемая дата
  expiryDate?: string;             // Истечение резерва
  
  // Статус
  status: 'active' | 'expired' | 'fulfilled' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Дополнительно
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

// ==================== ТРАНЗАКЦИИ ====================

/**
 * Складская транзакция
 */
export interface StockTransaction {
  id: string;
  type: StockTransactionType;
  status: TransactionStatus;
  
  // Основные данные
  itemId: string;
  quantity: number;                // Количество (+ для поступления, - для расхода)
  unit: MeasurementUnit;
  
  // Склады и локации
  warehouseId: string;             // Склад
  binId?: string;                  // Ячейка
  toWarehouseId?: string;          // Склад назначения (для перемещения)
  toBinId?: string;                // Ячейка назначения
  
  // Партия
  lotId?: string;                  // Существующая партия
  newLotData?: Partial<StockLot>;  // Данные новой партии (для поступлений)
  
  // Стоимость
  unitCost?: number;               // Себестоимость за единицу
  totalCost?: number;              // Общая стоимость
  currency?: string;
  
  // Ссылки на документы
  referenceType?: 'estimate' | 'project' | 'purchase_order' | 'manual';
  referenceId?: string;            // ID связанного документа
  documentNumber?: string;         // Номер документа
  
  // Резервирование
  reservationId?: string;          // Связанное резервирование
  
  // Даты
  transactionDate: string;         // Дата транзакции
  executedDate?: string;           // Дата исполнения
  
  // Дополнительные данные
  reason?: string;                 // Причина (для корректировок/списаний)
  notes?: string;                  // Примечания
  
  // Метаданные
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  
  // Система
  batchId?: string;                // ID пакета транзакций
  parentTransactionId?: string;    // Родительская транзакция (для связанных операций)
}

// ==================== ИНВЕНТАРИЗАЦИИ ====================

/**
 * Инвентаризация
 */
export interface InventoryCount {
  id: string;
  number: string;                  // Номер инвентаризации
  
  // Область охвата
  warehouseIds: string[];          // Склады
  binIds?: string[];               // Ячейки (если указаны)
  itemIds?: string[];              // Товары (если указаны)
  categories?: string[];           // Категории
  
  // Статус и даты
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  plannedDate: string;
  startedDate?: string;
  completedDate?: string;
  
  // Команда
  countTeam: Array<{
    userId: string;
    userName: string;
    role: 'lead' | 'counter' | 'observer';
  }>;
  
  // Настройки
  countMethod: 'full' | 'cycle' | 'spot';  // Полная/циклическая/выборочная
  allowNegativeTolerance: number;          // Допустимое отклонение -%
  allowPositiveTolerance: number;          // Допустимое отклонение +%
  requirePhotos: boolean;                  // Требовать фото
  
  // Результаты
  totalItemsCounted?: number;
  discrepanciesFound?: number;
  adjustmentsMade?: number;
  totalAdjustmentValue?: number;
  
  // Метаданные
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

/**
 * Строка инвентаризации
 */
export interface InventoryCountLine {
  id: string;
  inventoryCountId: string;
  
  // Позиция
  itemId: string;
  warehouseId: string;
  binId?: string;
  lotId?: string;
  
  // Количества
  bookQuantity: number;            // Количество по учету
  countedQuantity?: number;        // Подсчитанное количество
  adjustmentQuantity?: number;     // Корректировка
  unit: MeasurementUnit;
  
  // Стоимость
  unitCost: number;
  bookValue: number;               // Стоимость по учету
  adjustmentValue?: number;        // Стоимость корректировки
  
  // Процесс подсчета
  countedBy?: string;              // Кто считал
  countedAt?: string;              // Когда считал
  countMethod?: 'visual' | 'weigh' | 'measure';
  confidence: 'high' | 'medium' | 'low';
  
  // Дополнительно
  notes?: string;
  photos?: string[];              // URLs фотографий
  requiresRecount: boolean;
  
  // Статус строки
  status: 'pending' | 'counted' | 'adjusted' | 'verified';
  
  createdAt: string;
  updatedAt: string;
}

// ==================== ИНТЕГРАЦИЯ С ОЦЕНКАМИ ====================

/**
 * Связь элемента сметы со складом
 */
export interface EstimateItemWarehouse {
  estimateId: string;
  estimateItemId: string;          // ID позиции сметы
  itemId: string;                  // ID элемента номенклатуры
  
  // Потребность
  requiredQuantity: number;        // Требуемое количество
  unit: MeasurementUnit;
  
  // Резервирование
  reservationStrategy: 'auto' | 'manual' | 'none';
  reservationId?: string;          // ID резервирования (если создано)
  
  // Источники поставки
  preferredWarehouseId?: string;   // Предпочтительный склад
  alternativeWarehouses?: string[]; // Альтернативные склады
  
  // Планирование
  requiredDate?: string;           // Требуемая дата
  leadTimeBuffer?: number;         // Буфер времени (дней)
  
  // Статус обеспечения
  availabilityStatus: 'available' | 'partial' | 'unavailable' | 'on_order';
  availableQuantity: number;       // Доступное количество
  shortfallQuantity?: number;      // Дефицит
  
  // Логистика
  issueMethod: 'pick_and_stage' | 'direct_issue' | 'kitting';
  deliveryLocation?: string;       // Место доставки
  
  // Трекинг
  issuedQuantity?: number;         // Выданное количество
  returnedQuantity?: number;       // Возвращенное количество
  actualConsumption?: number;      // Фактическое потребление
  
  createdAt: string;
  updatedAt: string;
}

// ==================== ОТЧЕТЫ И АНАЛИТИКА ====================

/**
 * Отчет по остаткам
 */
export interface StockReport {
  warehouseId: string;
  warehouseName: string;
  reportDate: string;
  
  // Общие показатели
  totalItems: number;              // Всего позиций
  totalValue: number;              // Общая стоимость
  totalLots: number;               // Всего партий
  
  // Анализ по категориям
  byCategory: Array<{
    category: string;
    itemCount: number;
    totalValue: number;
    avgUnitCost: number;
  }>;
  
  // ABC анализ
  abcAnalysis: Array<{
    class: 'A' | 'B' | 'C';
    itemCount: number;
    valueShare: number;             // Доля в стоимости %
  }>;
  
  // Проблемные остатки
  nearExpiry: Array<{
    itemId: string;
    itemName: string;
    lotId: string;
    quantity: number;
    expiryDate: string;
    daysToExpiry: number;
  }>;
  
  slowMoving: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    value: number;
    daysSinceLastTransaction: number;
  }>;
  
  negativeStock: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    value: number;
  }>;
  
  generatedAt: string;
  generatedBy: string;
}

/**
 * Отчет по движению товаров
 */
export interface StockMovementReport {
  warehouseId?: string;
  itemId?: string;
  dateFrom: string;
  dateTo: string;
  
  // Обороты
  openingBalance: number;
  totalReceipts: number;
  totalIssues: number;
  totalAdjustments: number;
  closingBalance: number;
  
  // Детализация движений
  movements: Array<{
    date: string;
    transactionType: StockTransactionType;
    quantity: number;
    unitCost: number;
    totalCost: number;
    balance: number;
    reference?: string;
  }>;
  
  // Аналитика
  turnoverRatio?: number;          // Оборачиваемость
  averageDailyUsage?: number;      // Средний дневной расход
  
  generatedAt: string;
}

// ==================== ВАЛИДАЦИЯ И УТИЛИТЫ ====================

/**
 * Результат проверки доступности товара
 */
export interface AvailabilityCheck {
  itemId: string;
  warehouseId: string;
  requestedQuantity: number;
  
  // Результат
  isAvailable: boolean;
  availableQuantity: number;
  shortfall?: number;
  
  // Детализация по партиям
  lotAllocations?: Array<{
    lotId: string;
    availableQuantity: number;
    allocatedQuantity: number;
    expiryDate?: string;
  }>;
  
  // Альтернативы
  alternativeWarehouses?: Array<{
    warehouseId: string;
    warehouseName: string;
    availableQuantity: number;
  }>;
  
  // Рекомендации
  recommendations?: Array<{
    type: 'reorder' | 'transfer' | 'substitute';
    description: string;
    actionRequired?: string;
  }>;
  
  checkedAt: string;
}

/**
 * Ошибка валидации складской операции
 */
export interface WarehouseValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Результат валидации складской операции
 */
export interface WarehouseValidationResult {
  isValid: boolean;
  errors: WarehouseValidationError[];
  warnings: WarehouseValidationError[];
}

// ==================== DTO И ФИЛЬТРЫ ====================

/**
 * Данные для создания складской транзакции
 */
export interface CreateStockTransactionDto {
  type: StockTransactionType;
  itemId: string;
  quantity: number;
  unit: MeasurementUnit;
  warehouseId: string;
  binId?: string;
  toWarehouseId?: string;
  toBinId?: string;
  
  // Стоимость (обязательна для поступлений)
  unitCost?: number;
  currency?: string;
  
  // Партия
  lotId?: string;                  // Для операций с существующей партией
  newLotData?: {                   // Для создания новой партии
    lotNumber: string;
    serialNumber?: string;
    productionDate?: string;
    expiryDate?: string;
    qualityGrade?: string;
    vendorId?: string;
  };
  
  // Ссылки
  referenceType?: 'estimate' | 'project' | 'purchase_order' | 'manual';
  referenceId?: string;
  documentNumber?: string;
  
  reason?: string;
  notes?: string;
}

/**
 * Данные для резервирования
 */
export interface CreateReservationDto {
  itemId: string;
  warehouseId: string;
  quantity: number;
  unit: MeasurementUnit;
  type: ReservationType;
  referenceId: string;
  referenceName?: string;
  requiredDate?: string;
  expiryDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
}

/**
 * Фильтры для транзакций
 */
export interface StockTransactionFilters {
  type?: StockTransactionType[];
  status?: TransactionStatus[];
  warehouseId?: string;
  itemId?: string;
  dateFrom?: string;
  dateTo?: string;
  referenceType?: string;
  referenceId?: string;
  createdBy?: string;
}

/**
 * Фильтры для остатков
 */
export interface StockBalanceFilters {
  warehouseId?: string;
  itemIds?: string[];
  categories?: string[];
  hasStock?: boolean;               // Только позиции с остатком
  hasReservations?: boolean;        // Только зарезервированные
  nearExpiry?: boolean;             // Близкие к истечению срока
  negativeStock?: boolean;          // Отрицательные остатки
  searchQuery?: string;
}

/**
 * Настройки сортировки
 */
export interface WarehouseSortOptions {
  field: 'code' | 'name' | 'quantity' | 'value' | 'lastTransaction' | 'createdAt';
  direction: 'asc' | 'desc';
}

// ==================== КОНСТАНТЫ ====================

/**
 * Системные настройки склада
 */
export interface WarehouseSystemSettings {
  defaultValuationMethod: ValuationMethod;
  allowNegativeStock: boolean;
  autoCreateLots: boolean;
  defaultExpiryWarningDays: number;
  maxReservationDays: number;
  requirePhotoForAdjustments: boolean;
  
  // Нумерация
  lotNumberFormat: string;          // Шаблон нумерации партий
  transactionNumberFormat: string;  // Шаблон нумерации транзакций
  
  // Интеграции
  autoReserveForEstimates: boolean;
  autoIssueOnProjectStart: boolean;
  trackMaterialWaste: boolean;
}

/**
 * Предустановленные причины корректировок
 */
export const ADJUSTMENT_REASONS = [
  'Инвентаризация',
  'Брак/порча',
  'Списание остатков',
  'Техническая потеря',
  'Ошибка учета',
  'Возврат от клиента',
  'Возврат поставщику',
  'Перемещение склада'
] as const;

export type AdjustmentReason = typeof ADJUSTMENT_REASONS[number];
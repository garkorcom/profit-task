/**
 * Унифицированная номенклатура - система типов для товаров, услуг и комплектов
 * Использует дискриминирующий union для строгой типизации
 */

// ==================== БАЗОВЫЕ ТИПЫ ====================

/**
 * Типы единиц измерения
 */
export type MeasurementUnit = 
  // Длина
  | 'mm' | 'cm' | 'm' | 'km'
  // Площадь  
  | 'sqmm' | 'sqcm' | 'sqm' | 'sqkm'
  // Объем
  | 'ml' | 'l' | 'cum'
  // Масса
  | 'g' | 'kg' | 't'
  // Количество
  | 'pcs' | 'pairs' | 'sets'
  // Время
  | 'min' | 'hour' | 'day' | 'week' | 'month'
  // Специальные
  | 'package' | 'box' | 'pallet' | 'linear_m' | 'running_m';

/**
 * Категории номенклатуры
 */
export type ItemCategory =
  // Строительные материалы
  | 'building_materials'
  | 'electrical_supplies'
  | 'plumbing_supplies'
  | 'hvac_supplies'
  | 'insulation'
  | 'flooring'
  | 'roofing'
  | 'windows_doors'
  | 'hardware'
  | 'safety_equipment'
  // Услуги
  | 'labor_general'
  | 'labor_skilled'
  | 'labor_specialty'
  | 'consulting'
  | 'design'
  | 'inspection'
  | 'logistics'
  | 'maintenance'
  // Оборудование
  | 'tools'
  | 'machinery'
  | 'vehicles'
  | 'other';

/**
 * Статусы жизненного цикла номенклатуры
 */
export type ItemStatus = 
  | 'draft'           // Черновик
  | 'active'          // Активна
  | 'discontinued'    // Снята с производства
  | 'obsolete'        // Устарела
  | 'archived';       // В архиве

/**
 * Типы номенклатуры (дискриминатор)
 */
export type ItemType = 'product' | 'service' | 'bundle';

/**
 * Типы продуктовых позиций
 */
export type ProductType = 'material' | 'equipment' | 'consumable' | 'spare_part';

/**
 * Типы услуг
 */
export type ServiceType = 'labor' | 'consulting' | 'logistics' | 'maintenance' | 'design';

// ==================== ОБЩИЙ ИНТЕРФЕЙС ====================

/**
 * Базовые свойства всех элементов номенклатуры
 */
export interface BaseItem {
  // Идентификация
  id: string;
  type: ItemType;                         // Дискриминатор
  
  // Основные данные
  code: string;                           // Артикул/код
  name: string;                           // Название
  description?: string;                   // Описание
  category: ItemCategory;                 // Категория
  status: ItemStatus;                     // Статус
  
  // Единицы измерения
  baseUnit: MeasurementUnit;              // Базовая единица
  alternativeUnits?: Array<{              // Альтернативные единицы
    unit: MeasurementUnit;
    conversionFactor: number;             // Коэффициент к базовой единице
  }>;
  
  // Классификация
  tags?: string[];                        // Теги
  customFields?: Record<string, any>;     // Дополнительные поля
  
  // Поставщики и закупки
  preferredVendorId?: string;             // Предпочтительный поставщик
  vendorCode?: string;                    // Код у поставщика
  
  // Метаданные
  createdBy: string;
  createdAt: string;                      // ISO date
  updatedBy?: string;
  updatedAt: string;                      // ISO date
  version: number;                        // Версия для конкурентного доступа
}

// ==================== ПРОДУКТЫ ====================

/**
 * Специфичные данные для продуктов (материалы, оборудование)
 */
export interface ProductSpecificData {
  productType: ProductType;               // Тип продукта
  
  // Физические характеристики
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    volume?: number;
  };
  
  // Складские данные
  stockable: boolean;                     // Складируется ли
  serialTracked: boolean;                 // Отслеживается по серийным номерам
  lotTracked: boolean;                    // Отслеживается по партиям
  shelfLife?: number;                     // Срок годности (дней)
  
  // Закупки и поставки
  leadTimeDays?: number;                  // Время поставки (дней)
  minOrderQty?: number;                   // Минимальная партия заказа
  safetyStock?: number;                   // Страховой запас
  reorderPoint?: number;                  // Точка перезаказа
  
  // Стоимость
  standardCost?: number;                  // Стандартная себестоимость
  lastPurchasePrice?: number;             // Последняя цена закупки
  avgCost?: number;                       // Средневзвешенная стоимость
  
  // Качество и сертификация
  qualityGrade?: string;                  // Сорт/класс качества
  certifications?: string[];              // Сертификаты
  specifications?: Record<string, any>;   // Технические характеристики
  
  // Упаковка
  packagingInfo?: {
    packageType: string;                  // Тип упаковки
    unitsPerPackage: number;              // Единиц в упаковке
    packagesPerPallet?: number;           // Упаковок на паллете
  };
}

/**
 * Продукт (материал, оборудование, расходник)
 */
export interface ProductItem extends BaseItem {
  type: 'product';
  productData: ProductSpecificData;
}

// ==================== УСЛУГИ ====================

/**
 * Специфичные данные для услуг
 */
export interface ServiceSpecificData {
  serviceType: ServiceType;               // Тип услуги
  
  // Трудозатраты
  estimatedDuration?: number;             // Ориентировочная длительность (мин)
  skillLevel?: 'entry' | 'junior' | 'middle' | 'senior' | 'expert';
  certificationRequired?: string[];       // Требуемые сертификации
  
  // Стоимость
  standardRate?: number;                  // Стандартная ставка за единицу
  minimumCharge?: number;                 // Минимальная стоимость
  
  // Планирование
  schedulable: boolean;                   // Планируется ли в календаре
  resourcesRequired?: Array<{             // Требуемые ресурсы
    resourceType: 'labor' | 'equipment' | 'material';
    resourceId?: string;
    quantity: number;
    unit: MeasurementUnit;
  }>;
  
  // Качество
  deliverables?: string[];                // Результаты оказания услуги
  qualityChecklist?: Array<{              // Чек-лист качества
    item: string;
    required: boolean;
  }>;
  
  // Ограничения
  locationRestrictions?: string[];        // Ограничения по местоположению
  timeRestrictions?: {                    // Временные ограничения
    workingHours?: { start: string; end: string };
    excludeWeekends?: boolean;
    excludeHolidays?: boolean;
  };
}

/**
 * Услуга
 */
export interface ServiceItem extends BaseItem {
  type: 'service';
  serviceData: ServiceSpecificData;
}

// ==================== КОМПЛЕКТЫ/НАБОРЫ ====================

/**
 * Компонент комплекта
 */
export interface BundleComponent {
  itemId: string;                         // ID элемента номенклатуры
  itemType: 'product' | 'service';        // Тип элемента
  quantity: number;                       // Количество
  unit: MeasurementUnit;                  // Единица измерения
  isOptional?: boolean;                   // Опциональный компонент
  substituteIds?: string[];               // ID заменителей
  notes?: string;                         // Примечания к компоненту
}

/**
 * Специфичные данные для комплектов
 */
export interface BundleSpecificData {
  // Состав
  components: BundleComponent[];          // Компоненты комплекта
  
  // Правила ценообразования
  pricingMethod: 'sum_of_components' | 'fixed_price' | 'markup_on_components';
  fixedPrice?: number;                    // Фиксированная цена
  markup?: number;                        // Наценка % (если markup_on_components)
  
  // Производство/сборка
  assemblyRequired: boolean;              // Требуется сборка
  assemblyTime?: number;                  // Время сборки (мин)
  assemblyInstructions?: string;          // Инструкции по сборке
  
  // Складирование
  storeAsComplete: boolean;               // Хранить в собранном виде
  disassemblyAllowed: boolean;            // Можно ли разбирать на компоненты
  
  // Варианты комплектации
  variations?: Array<{                    // Варианты комплектации
    id: string;
    name: string;
    components: BundleComponent[];        // Измененный состав
    priceAdjustment?: number;             // Корректировка цены
  }>;
}

/**
 * Комплект/набор
 */
export interface BundleItem extends BaseItem {
  type: 'bundle';
  bundleData: BundleSpecificData;
}

// ==================== ОБЪЕДИНЕННЫЕ ТИПЫ ====================

/**
 * Объединенный тип элемента номенклатуры
 */
export type Item = ProductItem | ServiceItem | BundleItem;

/**
 * Специфичные данные (union type)
 */
export type ItemSpecificData = ProductSpecificData | ServiceSpecificData | BundleSpecificData;

// ==================== TYPE GUARDS ====================

/**
 * Проверка типа продукта
 */
export function isProductItem(item: Item): item is ProductItem {
  return item.type === 'product';
}

/**
 * Проверка типа услуги
 */
export function isServiceItem(item: Item): item is ServiceItem {
  return item.type === 'service';
}

/**
 * Проверка типа комплекта
 */
export function isBundleItem(item: Item): item is BundleItem {
  return item.type === 'bundle';
}

// ==================== УТИЛИТЫ ====================

/**
 * Получение отображаемого имени единицы измерения
 */
export function getUnitDisplayName(unit: MeasurementUnit, locale: string = 'ru'): string {
  const unitNames: Record<string, Record<MeasurementUnit, string>> = {
    ru: {
      // Длина
      'mm': 'мм', 'cm': 'см', 'm': 'м', 'km': 'км',
      // Площадь
      'sqmm': 'мм²', 'sqcm': 'см²', 'sqm': 'м²', 'sqkm': 'км²',
      // Объем
      'ml': 'мл', 'l': 'л', 'cum': 'м³',
      // Масса
      'g': 'г', 'kg': 'кг', 't': 'т',
      // Количество
      'pcs': 'шт.', 'pairs': 'пар', 'sets': 'компл.',
      // Время
      'min': 'мин', 'hour': 'ч', 'day': 'дн.', 'week': 'нед.', 'month': 'мес.',
      // Специальные
      'package': 'упак.', 'box': 'кор.', 'pallet': 'палл.', 
      'linear_m': 'пог.м', 'running_m': 'п.м'
    },
    en: {
      // Длина
      'mm': 'mm', 'cm': 'cm', 'm': 'm', 'km': 'km',
      // Площадь
      'sqmm': 'mm²', 'sqcm': 'cm²', 'sqm': 'm²', 'sqkm': 'km²',
      // Объем
      'ml': 'ml', 'l': 'l', 'cum': 'm³',
      // Масса
      'g': 'g', 'kg': 'kg', 't': 't',
      // Количество
      'pcs': 'pcs', 'pairs': 'pairs', 'sets': 'sets',
      // Время
      'min': 'min', 'hour': 'hr', 'day': 'day', 'week': 'wk', 'month': 'mo',
      // Специальные
      'package': 'pkg', 'box': 'box', 'pallet': 'plt', 
      'linear_m': 'lm', 'running_m': 'rm'
    }
  };
  
  return unitNames[locale]?.[unit] || unit;
}

/**
 * Конвертация между единицами измерения
 */
export function convertUnit(
  value: number, 
  fromUnit: MeasurementUnit, 
  toUnit: MeasurementUnit,
  item?: Item
): number {
  if (fromUnit === toUnit) return value;
  
  // Используем альтернативные единицы из элемента, если доступны
  if (item?.alternativeUnits) {
    const altUnit = item.alternativeUnits.find(au => au.unit === toUnit);
    if (altUnit && item.baseUnit === fromUnit) {
      return value * altUnit.conversionFactor;
    }
    
    const fromAltUnit = item.alternativeUnits.find(au => au.unit === fromUnit);
    if (fromAltUnit && item.baseUnit === toUnit) {
      return value / fromAltUnit.conversionFactor;
    }
  }
  
  // Стандартные конверсии (упрощенная версия)
  const conversions: Record<string, Record<string, number>> = {
    // Длина -> мм
    'mm': { 'cm': 0.1, 'm': 0.001, 'km': 0.000001 },
    'cm': { 'mm': 10, 'm': 0.01, 'km': 0.00001 },
    'm': { 'mm': 1000, 'cm': 100, 'km': 0.001 },
    'km': { 'mm': 1000000, 'cm': 100000, 'm': 1000 },
    
    // Масса -> г
    'g': { 'kg': 0.001, 't': 0.000001 },
    'kg': { 'g': 1000, 't': 0.001 },
    't': { 'g': 1000000, 'kg': 1000 },
    
    // Объем -> мл
    'ml': { 'l': 0.001 },
    'l': { 'ml': 1000 }
  };
  
  const factor = conversions[fromUnit]?.[toUnit];
  if (factor) {
    return value * factor;
  }
  
  throw new Error(`Cannot convert from ${fromUnit} to ${toUnit}`);
}

/**
 * Получение всех компонентов комплекта (рекурсивно)
 */
export function getAllBundleComponents(
  bundle: BundleItem,
  allItems: Item[],
  visited: Set<string> = new Set()
): BundleComponent[] {
  if (visited.has(bundle.id)) {
    throw new Error(`Circular dependency detected in bundle ${bundle.id}`);
  }
  
  visited.add(bundle.id);
  const components: BundleComponent[] = [];
  
  for (const component of bundle.bundleData.components) {
    components.push(component);
    
    // Если компонент тоже комплект, разворачиваем рекурсивно
    const componentItem = allItems.find(item => item.id === component.itemId);
    if (componentItem && isBundleItem(componentItem)) {
      const subComponents = getAllBundleComponents(componentItem, allItems, new Set(visited));
      components.push(...subComponents);
    }
  }
  
  visited.delete(bundle.id);
  return components;
}

// ==================== ВАЛИДАЦИЯ ====================

/**
 * Ошибка валидации элемента номенклатуры
 */
export interface ItemValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Результат валидации элемента номенклатуры
 */
export interface ItemValidationResult {
  isValid: boolean;
  errors: ItemValidationError[];
  warnings: ItemValidationError[];
}

/**
 * Валидация элемента номенклатуры
 */
export function validateItem(item: Item): ItemValidationResult {
  const errors: ItemValidationError[] = [];
  const warnings: ItemValidationError[] = [];
  
  // Базовые проверки
  if (!item.code?.trim()) {
    errors.push({ field: 'code', message: 'Код обязателен', severity: 'error' });
  }
  if (!item.name?.trim()) {
    errors.push({ field: 'name', message: 'Название обязательно', severity: 'error' });
  }
  if (!item.baseUnit) {
    errors.push({ field: 'baseUnit', message: 'Базовая единица измерения обязательна', severity: 'error' });
  }
  
  // Специфичные проверки по типу
  if (isProductItem(item)) {
    validateProductItem(item, errors, warnings);
  } else if (isServiceItem(item)) {
    validateServiceItem(item, errors, warnings);
  } else if (isBundleItem(item)) {
    validateBundleItem(item, errors, warnings);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function validateProductItem(item: ProductItem, errors: ItemValidationError[], warnings: ItemValidationError[]) {
  if (item.productData.stockable && !item.productData.reorderPoint && !item.productData.safetyStock) {
    warnings.push({ 
      field: 'productData.reorderPoint', 
      message: 'Для складских позиций рекомендуется указать точку перезаказа или страховой запас',
      severity: 'warning'
    });
  }
  
  if (item.productData.lotTracked && item.productData.serialTracked) {
    warnings.push({
      field: 'productData.tracking',
      message: 'Обычно используется либо отслеживание по партиям, либо по серийным номерам',
      severity: 'warning'
    });
  }
}

function validateServiceItem(item: ServiceItem, errors: ItemValidationError[], warnings: ItemValidationError[]) {
  if (!item.serviceData.standardRate && !item.serviceData.minimumCharge) {
    warnings.push({
      field: 'serviceData.pricing',
      message: 'Рекомендуется указать стандартную ставку или минимальную стоимость',
      severity: 'warning'
    });
  }
}

function validateBundleItem(item: BundleItem, errors: ItemValidationError[], warnings: ItemValidationError[]) {
  if (item.bundleData.components.length === 0) {
    errors.push({
      field: 'bundleData.components',
      message: 'Комплект должен содержать хотя бы один компонент',
      severity: 'error'
    });
  }
  
  if (item.bundleData.pricingMethod === 'fixed_price' && !item.bundleData.fixedPrice) {
    errors.push({
      field: 'bundleData.fixedPrice',
      message: 'При фиксированном ценообразовании необходимо указать цену',
      severity: 'error'
    });
  }
  
  if (item.bundleData.pricingMethod === 'markup_on_components' && !item.bundleData.markup) {
    errors.push({
      field: 'bundleData.markup',
      message: 'При ценообразовании с наценкой необходимо указать процент наценки',
      severity: 'error'
    });
  }
}

// ==================== DTO И ФИЛЬТРЫ ====================

/**
 * Данные для создания элемента номенклатуры
 */
export interface CreateItemDto {
  type: ItemType;
  code: string;
  name: string;
  description?: string;
  category: ItemCategory;
  baseUnit: MeasurementUnit;
  alternativeUnits?: BaseItem['alternativeUnits'];
  tags?: string[];
  customFields?: Record<string, any>;
  
  // Специфичные данные в зависимости от типа
  productData?: Partial<ProductSpecificData>;
  serviceData?: Partial<ServiceSpecificData>;
  bundleData?: Partial<BundleSpecificData>;
}

/**
 * Данные для обновления элемента номенклатуры
 */
export interface UpdateItemDto extends Partial<Omit<CreateItemDto, 'type'>> {
  version: number; // Оптимистичная блокировка
}

/**
 * Фильтры для поиска номенклатуры
 */
export interface ItemFilters {
  type?: ItemType[];
  category?: ItemCategory[];
  status?: ItemStatus[];
  stockable?: boolean; // Только для продуктов
  tags?: string[];
  vendorId?: string;
  searchQuery?: string; // Поиск по коду, названию, описанию
  priceMin?: number;
  priceMax?: number;
}

/**
 * Настройки сортировки
 */
export interface ItemSortOptions {
  field: 'code' | 'name' | 'category' | 'status' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}
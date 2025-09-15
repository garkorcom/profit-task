/**
 * API для работы с унифицированной номенклатурой (товары, услуги, комплекты)
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  writeBatch,
  runTransaction,
  increment
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';

function getCurrentUser() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}
import {
  Item,
  ProductItem,
  ServiceItem,
  BundleItem,
  CreateItemDto,
  UpdateItemDto,
  ItemFilters,
  ItemSortOptions,
  ItemValidationResult,
  validateItem,
  isProductItem,
  isServiceItem,
  isBundleItem,
  ItemType,
  ItemCategory,
  ItemStatus
} from '../types/item.types';

// ==================== КОНСТАНТЫ ====================

const COLLECTIONS = {
  items: 'items',
  itemCategories: 'itemCategories'
} as const;

// ==================== ОСНОВНЫЕ ОПЕРАЦИИ ====================

/**
 * Получение списка номенклатуры с фильтрами
 */
export async function getItems(
  filters: ItemFilters = {},
  sortOptions: ItemSortOptions = { field: 'name', direction: 'asc' },
  pageSize = 50,
  lastDoc?: any
): Promise<{ items: Item[], hasMore: boolean, lastDoc?: any }> {
  const user = getCurrentUser();
  let q = query(collection(db, `users/${user.uid}/${COLLECTIONS.items}`));
  
  // Применяем фильтры
  if (filters.type && filters.type.length > 0) {
    q = query(q, where('type', 'in', filters.type));
  }
  if (filters.category && filters.category.length > 0) {
    q = query(q, where('category', 'in', filters.category));
  }
  if (filters.status && filters.status.length > 0) {
    q = query(q, where('status', 'in', filters.status));
  }
  if (filters.stockable !== undefined) {
    q = query(q, where('productData.stockable', '==', filters.stockable));
  }
  if (filters.tags && filters.tags.length > 0) {
    q = query(q, where('tags', 'array-contains-any', filters.tags));
  }
  if (filters.vendorId) {
    q = query(q, where('preferredVendorId', '==', filters.vendorId));
  }
  
  // Сортировка
  q = query(q, orderBy(sortOptions.field, sortOptions.direction));
  
  // Пагинация
  q = query(q, limit(pageSize));
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const snapshot = await getDocs(q);
  let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
  
  // Клиентские фильтры (которые нельзя сделать в Firestore)
  if (filters.searchQuery) {
    const searchLower = filters.searchQuery.toLowerCase();
    items = items.filter(item => 
      item.code.toLowerCase().includes(searchLower) ||
      item.name.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower)
    );
  }
  
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    items = items.filter(item => {
      let price = 0;
      if (isProductItem(item)) {
        price = item.productData.standardCost || item.productData.lastPurchasePrice || 0;
      } else if (isServiceItem(item)) {
        price = item.serviceData.standardRate || 0;
      } else if (isBundleItem(item)) {
        price = item.bundleData.fixedPrice || 0;
      }
      
      if (filters.priceMin !== undefined && price < filters.priceMin) return false;
      if (filters.priceMax !== undefined && price > filters.priceMax) return false;
      return true;
    });
  }
  
  const hasMore = snapshot.docs.length === pageSize;
  const lastDocument = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : undefined;
  
  return {
    items,
    hasMore,
    lastDoc: lastDocument
  };
}

/**
 * Получение элемента номенклатуры по ID
 */
export async function getItem(id: string): Promise<Item | null> {
  const user = getCurrentUser();
  const docRef = doc(db, `users/${user.uid}/${COLLECTIONS.items}`, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Item;
  }
  return null;
}

/**
 * Получение элементов номенклатуры по множественным ID
 */
export async function getItemsByIds(ids: string[]): Promise<Item[]> {
  if (ids.length === 0) return [];
  
  const user = getCurrentUser();
  const items: Item[] = [];
  
  // Firestore поддерживает только до 10 элементов в 'in' запросе
  const chunks = [];
  for (let i = 0; i < ids.length; i += 10) {
    chunks.push(ids.slice(i, i + 10));
  }
  
  for (const chunk of chunks) {
    const q = query(
      collection(db, `users/${user.uid}/${COLLECTIONS.items}`),
      where('__name__', 'in', chunk.map(id => doc(db, `users/${user.uid}/${COLLECTIONS.items}`, id)))
    );
    
    const snapshot = await getDocs(q);
    items.push(...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item)));
  }
  
  return items;
}

/**
 * Создание элемента номенклатуры
 */
export async function createItem(itemDto: CreateItemDto): Promise<string> {
  const user = getCurrentUser();
  
  // Валидация
  const validation = validateCreateItemDto(itemDto);
  if (!validation.isValid) {
    throw new Error(`Ошибка валидации: ${validation.errors.map(e => e.message).join(', ')}`);
  }
  
  const now = new Date().toISOString();
  
  // Формируем данные элемента
  const itemData: Omit<Item, 'id'> = {
    type: itemDto.type,
    code: itemDto.code,
    name: itemDto.name,
    description: itemDto.description,
    category: itemDto.category,
    status: 'active',
    baseUnit: itemDto.baseUnit,
    alternativeUnits: itemDto.alternativeUnits,
    tags: itemDto.tags || [],
    customFields: itemDto.customFields,
    preferredVendorId: itemDto.customFields?.preferredVendorId as string,
    createdBy: user.uid,
    createdAt: now,
    updatedAt: now,
    version: 1
  } as any;
  
  // Добавляем специфичные данные по типу
  switch (itemDto.type) {
    case 'product':
      (itemData as ProductItem).productData = {
        productType: itemDto.productData?.productType || 'material',
        stockable: itemDto.productData?.stockable ?? true,
        serialTracked: itemDto.productData?.serialTracked ?? false,
        lotTracked: itemDto.productData?.lotTracked ?? true,
        leadTimeDays: itemDto.productData?.leadTimeDays,
        minOrderQty: itemDto.productData?.minOrderQty,
        safetyStock: itemDto.productData?.safetyStock,
        reorderPoint: itemDto.productData?.reorderPoint,
        standardCost: itemDto.productData?.standardCost,
        ...itemDto.productData
      };
      break;
      
    case 'service':
      (itemData as ServiceItem).serviceData = {
        serviceType: itemDto.serviceData?.serviceType || 'labor',
        schedulable: itemDto.serviceData?.schedulable ?? true,
        standardRate: itemDto.serviceData?.standardRate,
        minimumCharge: itemDto.serviceData?.minimumCharge,
        estimatedDuration: itemDto.serviceData?.estimatedDuration,
        skillLevel: itemDto.serviceData?.skillLevel,
        ...itemDto.serviceData
      };
      break;
      
    case 'bundle':
      (itemData as BundleItem).bundleData = {
        components: itemDto.bundleData?.components || [],
        pricingMethod: itemDto.bundleData?.pricingMethod || 'sum_of_components',
        fixedPrice: itemDto.bundleData?.fixedPrice,
        markup: itemDto.bundleData?.markup,
        assemblyRequired: itemDto.bundleData?.assemblyRequired ?? false,
        storeAsComplete: itemDto.bundleData?.storeAsComplete ?? false,
        disassemblyAllowed: itemDto.bundleData?.disassemblyAllowed ?? true,
        ...itemDto.bundleData
      };
      break;
  }
  
  // Валидация созданного элемента
  const itemValidation = validateItem(itemData as Item);
  if (!itemValidation.isValid) {
    throw new Error(`Ошибка валидации элемента: ${itemValidation.errors.map(e => e.message).join(', ')}`);
  }
  
  const docRef = await addDoc(collection(db, `users/${user.uid}/${COLLECTIONS.items}`), itemData);
  return docRef.id;
}

/**
 * Обновление элемента номенклатуры
 */
export async function updateItem(id: string, updates: UpdateItemDto): Promise<void> {
  const user = getCurrentUser();
  
  const docRef = doc(db, `users/${user.uid}/${COLLECTIONS.items}`, id);
  
  // Получаем текущую версию для оптимистичной блокировки
  const currentDoc = await getDoc(docRef);
  if (!currentDoc.exists()) {
    throw new Error('Элемент номенклатуры не найден');
  }
  
  const currentItem = currentDoc.data() as Item;
  if (currentItem.version !== updates.version) {
    throw new Error('Элемент был изменен другим пользователем. Пожалуйста, обновите страницу и повторите операцию.');
  }
  
  const now = new Date().toISOString();
  const updateData = {
    ...updates,
    updatedBy: user.uid,
    updatedAt: now,
    version: increment(1)
  };
  
  // Удаляем поле version из обновлений (оно уже учтено в increment)
  delete (updateData as any).version;
  
  await updateDoc(docRef, updateData);
}

/**
 * Удаление элемента номенклатуры
 */
export async function deleteItem(id: string): Promise<void> {
  const user = getCurrentUser();
  
  // TODO: Проверить, что элемент не используется в сметах или остатках
  // Это должно быть реализовано как серверная функция для надежности
  
  const docRef = doc(db, `users/${user.uid}/${COLLECTIONS.items}`, id);
  await deleteDoc(docRef);
}

/**
 * Массовое обновление статуса элементов
 */
export async function bulkUpdateItemStatus(itemIds: string[], newStatus: ItemStatus): Promise<void> {
  const user = getCurrentUser();
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  
  for (const itemId of itemIds) {
    const docRef = doc(db, `users/${user.uid}/${COLLECTIONS.items}`, itemId);
    batch.update(docRef, {
      status: newStatus,
      updatedBy: user.uid,
      updatedAt: now,
      version: increment(1)
    });
  }
  
  await batch.commit();
}

// ==================== СПЕЦИАЛЬНЫЕ ЗАПРОСЫ ====================

/**
 * Поиск элементов номенклатуры по тексту
 */
export async function searchItems(
  searchQuery: string,
  itemTypes?: ItemType[],
  limitCount: number = 20
): Promise<Item[]> {
  const user = getCurrentUser();
  let q = query(collection(db, `users/${user.uid}/${COLLECTIONS.items}`));
  
  if (itemTypes && itemTypes.length > 0) {
    q = query(q, where('type', 'in', itemTypes));
  }
  
  q = query(q, orderBy('name'), limit(limitCount));
  
  const snapshot = await getDocs(q);
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
  
  // Клиентский фильтр по тексту
  const searchLower = searchQuery.toLowerCase();
  return items.filter(item => 
    item.code.toLowerCase().includes(searchLower) ||
    item.name.toLowerCase().includes(searchLower) ||
    item.description?.toLowerCase().includes(searchLower)
  );
}

/**
 * Получение товаров для складского учета
 */
export async function getStockableItems(): Promise<ProductItem[]> {
  const filters: ItemFilters = {
    type: ['product'],
    stockable: true
  };
  
  const result = await getItems(filters, { field: 'name', direction: 'asc' }, 1000);
  return result.items.filter(isProductItem);
}

/**
 * Получение услуг по категории
 */
export async function getServicesByCategory(category: ItemCategory): Promise<ServiceItem[]> {
  const filters: ItemFilters = {
    type: ['service'],
    category: [category]
  };
  
  const result = await getItems(filters, { field: 'name', direction: 'asc' }, 1000);
  return result.items.filter(isServiceItem);
}

/**
 * Получение комплектов с компонентами
 */
export async function getBundleWithComponents(bundleId: string): Promise<{
  bundle: BundleItem,
  components: Item[]
} | null> {
  const bundle = await getItem(bundleId);
  if (!bundle || !isBundleItem(bundle)) {
    return null;
  }
  
  const componentIds = bundle.bundleData.components.map(c => c.itemId);
  const components = await getItemsByIds(componentIds);
  
  return { bundle, components };
}

/**
 * Получение альтернативных товаров
 */
export async function getAlternativeItems(
  itemId: string,
  category?: ItemCategory
): Promise<Item[]> {
  const originalItem = await getItem(itemId);
  if (!originalItem) return [];
  
  const filters: ItemFilters = {
    type: [originalItem.type],
    category: category ? [category] : [originalItem.category],
    status: ['active']
  };
  
  const result = await getItems(filters);
  return result.items.filter(item => item.id !== itemId);
}

// ==================== ВАЛИДАЦИЯ ====================

/**
 * Валидация DTO для создания элемента
 */
function validateCreateItemDto(dto: CreateItemDto): ItemValidationResult {
  const errors: Array<{ field: string; message: string; severity: 'error' }> = [];
  const warnings: Array<{ field: string; message: string; severity: 'warning' }> = [];
  
  if (!dto.code?.trim()) {
    errors.push({ field: 'code', message: 'Код обязателен', severity: 'error' as const });
  }
  if (!dto.name?.trim()) {
    errors.push({ field: 'name', message: 'Название обязательно', severity: 'error' as const });
  }
  if (!dto.baseUnit) {
    errors.push({ field: 'baseUnit', message: 'Базовая единица измерения обязательна', severity: 'error' as const });
  }
  
  // Проверки по типу
  switch (dto.type) {
    case 'product':
      if (!dto.productData) {
        errors.push({ field: 'productData', message: 'Для товара требуются дополнительные данные', severity: 'error' as const });
      }
      break;
      
    case 'service':
      if (!dto.serviceData) {
        errors.push({ field: 'serviceData', message: 'Для услуги требуются дополнительные данные', severity: 'error' as const });
      }
      break;
      
    case 'bundle':
      if (!dto.bundleData || !dto.bundleData.components || dto.bundleData.components.length === 0) {
        errors.push({ field: 'bundleData.components', message: 'Комплект должен содержать компоненты', severity: 'error' as const });
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Проверка уникальности кода
 */
export async function isCodeUnique(code: string, excludeId?: string): Promise<boolean> {
  const user = getCurrentUser();
  const q = query(
    collection(db, `users/${user.uid}/${COLLECTIONS.items}`),
    where('code', '==', code)
  );
  
  const snapshot = await getDocs(q);
  
  if (excludeId) {
    return !snapshot.docs.some(doc => doc.id !== excludeId);
  }
  
  return snapshot.empty;
}

// ==================== ИМПОРТ/ЭКСПОРТ ====================

/**
 * Экспорт номенклатуры в CSV
 */
export async function exportItemsToCSV(filters: ItemFilters = {}): Promise<string> {
  const result = await getItems(filters, { field: 'code', direction: 'asc' }, 10000);
  const items = result.items;
  
  // Заголовки CSV
  const headers = [
    'Код',
    'Название', 
    'Описание',
    'Тип',
    'Категория',
    'Статус',
    'Базовая единица',
    'Теги',
    'Создан',
    'Обновлен'
  ];
  
  // Добавляем специфичные поля
  headers.push('Тип продукта', 'Складируется', 'Стандартная стоимость');
  headers.push('Тип услуги', 'Стандартная ставка');
  headers.push('Метод ценообразования', 'Количество компонентов');
  
  const csvRows = [headers.join(',')];
  
  for (const item of items) {
    const row = [
      `"${item.code}"`,
      `"${item.name}"`,
      `"${item.description || ''}"`,
      `"${item.type}"`,
      `"${item.category}"`,
      `"${item.status}"`,
      `"${item.baseUnit}"`,
      `"${item.tags?.join('; ') || ''}"`,
      `"${item.createdAt}"`,
      `"${item.updatedAt}"`
    ];
    
    // Специфичные поля для продуктов
    if (isProductItem(item)) {
      row.push(
        `"${item.productData.productType || ''}"`,
        `"${item.productData.stockable ? 'Да' : 'Нет'}"`,
        `"${item.productData.standardCost || ''}"`
      );
    } else {
      row.push('""', '""', '""');
    }
    
    // Специфичные поля для услуг
    if (isServiceItem(item)) {
      row.push(
        `"${item.serviceData.serviceType || ''}"`,
        `"${item.serviceData.standardRate || ''}"`
      );
    } else {
      row.push('""', '""');
    }
    
    // Специфичные поля для комплектов
    if (isBundleItem(item)) {
      row.push(
        `"${item.bundleData.pricingMethod || ''}"`,
        `"${item.bundleData.components.length}"`
      );
    } else {
      row.push('""', '""');
    }
    
    csvRows.push(row.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * Дублирование элемента номенклатуры
 */
export async function duplicateItem(originalId: string, newCode?: string): Promise<string> {
  const original = await getItem(originalId);
  if (!original) {
    throw new Error('Оригинальный элемент не найден');
  }
  
  // Генерируем новый код если не предоставлен
  let code = newCode;
  if (!code) {
    code = `${original.code}_COPY`;
    let counter = 1;
    while (!(await isCodeUnique(code))) {
      code = `${original.code}_COPY_${counter}`;
      counter++;
    }
  } else {
    if (!(await isCodeUnique(code))) {
      throw new Error('Код уже используется');
    }
  }
  
  // Создаем DTO для дубликата
  const duplicateDto: CreateItemDto = {
    type: original.type,
    code,
    name: `${original.name} (копия)`,
    description: original.description,
    category: original.category,
    baseUnit: original.baseUnit,
    alternativeUnits: original.alternativeUnits,
    tags: original.tags,
    customFields: original.customFields
  };
  
  // Копируем специфичные данные
  if (isProductItem(original)) {
    duplicateDto.productData = { ...original.productData };
  } else if (isServiceItem(original)) {
    duplicateDto.serviceData = { ...original.serviceData };
  } else if (isBundleItem(original)) {
    duplicateDto.bundleData = { ...original.bundleData };
  }
  
  return await createItem(duplicateDto);
}

// ==================== СТАТИСТИКА ====================

/**
 * Получение статистики по номенклатуре
 */
export async function getItemsStatistics(): Promise<{
  totalItems: number;
  byType: Record<ItemType, number>;
  byCategory: Record<ItemCategory, number>;
  byStatus: Record<ItemStatus, number>;
  stockableProducts: number;
  schedulableServices: number;
  bundles: number;
}> {
  const user = getCurrentUser();
  const snapshot = await getDocs(collection(db, `users/${user.uid}/${COLLECTIONS.items}`));
  const items = snapshot.docs.map(doc => doc.data() as Item);
  
  const stats = {
    totalItems: items.length,
    byType: {} as Record<ItemType, number>,
    byCategory: {} as Record<ItemCategory, number>,
    byStatus: {} as Record<ItemStatus, number>,
    stockableProducts: 0,
    schedulableServices: 0,
    bundles: 0
  };
  
  for (const item of items) {
    // По типу
    stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
    
    // По категории
    stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;
    
    // По статусу
    stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
    
    // Специальные счетчики
    if (isProductItem(item) && item.productData.stockable) {
      stats.stockableProducts++;
    }
    if (isServiceItem(item) && item.serviceData.schedulable) {
      stats.schedulableServices++;
    }
    if (isBundleItem(item)) {
      stats.bundles++;
    }
  }
  
  return stats;
}
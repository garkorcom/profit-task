/**
 * API для интеграции смет со складской системой
 * Обеспечивает резервирование, отпуск материалов и трекинг потребления
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
  runTransaction,
  writeBatch,
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
  EstimateItemWarehouse,
  StockReservation,
  CreateReservationDto,
  AvailabilityCheck
} from '../types/warehouse.types';
import { 
  Estimate,
  EstimateItem,
  ServiceItem as EstimateServiceItem,
  ProductLine as EstimateProductLine
} from '../types/estimate.types';
import { Item, isProductItem } from '../types/item.types';
import {
  checkAvailability,
  createReservation,
  cancelReservation,
  createStockTransaction,
  getReservations
} from './warehouseApi';
import { getItem, getItemsByIds } from './itemApi';
import { getEstimate } from './estimateV2Api';

// ==================== КОНСТАНТЫ ====================

const COLLECTIONS = {
  estimateItemWarehouse: 'estimateItemWarehouse',
  materialRequirements: 'materialRequirements'
} as const;

// ==================== ОСНОВНЫЕ ОПЕРАЦИИ ====================

/**
 * Связывание позиций сметы со складской системой
 */
export async function linkEstimateWithWarehouse(estimateId: string): Promise<void> {
  const user = getCurrentUser();
  
  await runTransaction(db, async (transaction) => {
    // Получаем смету
    const estimateRef = doc(db, `users/${user.uid}/estimates`, estimateId);
    const estimateSnap = await transaction.get(estimateRef);
    
    if (!estimateSnap.exists()) {
      throw new Error('Смета не найдена');
    }
    
    const estimate = estimateSnap.data() as Estimate;
    
    // Получаем позиции сметы
    const itemsQuery = query(
      collection(db, `users/${user.uid}/estimates/${estimateId}/items`)
    );
    const itemsSnap = await getDocs(itemsQuery);
    const estimateItems = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EstimateItem));
    
    // Обрабатываем только продукты (материалы и оборудование)
    const productLines = estimateItems.filter(item => 
      item.type === 'material' || item.type === 'equipment'
    ) as EstimateProductLine[];
    
    // Для каждой продуктовой позиции создаем связь со складом
    for (const productLine of productLines) {
      // Пытаемся найти элемент номенклатуры по productId или по названию
      let itemId = productLine.productId;
      
      if (!itemId) {
        // Поиск по названию (упрощенный поиск)
        // В реальной системе здесь должен быть более сложный матчинг
        console.warn(`Позиция "${productLine.name}" не связана с номенклатурой`);
        continue;
      }
      
      // Проверяем, что элемент существует в номенклатуре
      const item = await getItem(itemId);
      if (!item || !isProductItem(item)) {
        console.warn(`Элемент номенклатуры ${itemId} не найден или не является продуктом`);
        continue;
      }
      
      // Определяем потребное количество
      const requiredQuantity = productLine.qty * (1 + (productLine.wastePct || 0) / 100);
      
      // Создаем связь
      const estimateItemWarehouse: Omit<EstimateItemWarehouse, 'createdAt' | 'updatedAt'> = {
        estimateId,
        estimateItemId: productLine.id,
        itemId,
        requiredQuantity,
        unit: item.baseUnit, // Используем базовую единицу из номенклатуры
        reservationStrategy: 'auto',
        preferredWarehouseId: undefined, // Можно настроить по умолчанию
        alternativeWarehouses: [],
        availabilityStatus: 'unavailable',
        availableQuantity: 0,
        issueMethod: 'pick_and_stage'
      };
      
      // Проверяем доступность на складах
      const availability = await checkWarehouseAvailability(itemId, requiredQuantity);
      
      estimateItemWarehouse.availabilityStatus = availability.status;
      estimateItemWarehouse.availableQuantity = availability.totalAvailable;
      estimateItemWarehouse.shortfallQuantity = availability.shortfall;
      estimateItemWarehouse.preferredWarehouseId = availability.bestWarehouse;
      estimateItemWarehouse.alternativeWarehouses = availability.alternativeWarehouses;
      
      const now = new Date().toISOString();
      const linkRef = doc(collection(db, `users/${user.uid}/${COLLECTIONS.estimateItemWarehouse}`));
      transaction.set(linkRef, {
        ...estimateItemWarehouse,
        createdAt: now,
        updatedAt: now
      });
    }
  });
}

/**
 * Автоматическое резервирование материалов для сметы
 */
export async function autoReserveMaterialsForEstimate(
  estimateId: string,
  requiredDate?: string
): Promise<{
  successful: string[];
  failed: Array<{ itemId: string; reason: string }>;
}> {
  const user = getCurrentUser();
  
  // Получаем связи сметы со складом
  const warehouseLinks = await getEstimateWarehouseLinks(estimateId);
  
  const successful: string[] = [];
  const failed: Array<{ itemId: string; reason: string }> = [];
  
  for (const link of warehouseLinks) {
    if (link.reservationStrategy !== 'auto') {
      continue;
    }
    
    if (link.reservationId) {
      // Резервирование уже существует
      successful.push(link.itemId);
      continue;
    }
    
    if (link.availabilityStatus !== 'available' && link.availabilityStatus !== 'partial') {
      failed.push({
        itemId: link.itemId,
        reason: 'Товар недоступен на складах'
      });
      continue;
    }
    
    try {
      // Создаем резервирование
      const reservationDto: CreateReservationDto = {
        itemId: link.itemId,
        warehouseId: link.preferredWarehouseId!,
        quantity: link.requiredQuantity,
        unit: link.unit,
        type: 'estimate',
        referenceId: estimateId,
        referenceName: `Смета ${estimateId}`,
        requiredDate: requiredDate || link.requiredDate,
        priority: 'medium'
      };
      
      const reservationId = await createReservation(reservationDto);
      
      // Обновляем связь
      await updateEstimateWarehouseLink(estimateId, link.estimateItemId, {
        reservationId,
        updatedAt: new Date().toISOString()
      });
      
      successful.push(link.itemId);
    } catch (error) {
      failed.push({
        itemId: link.itemId,
        reason: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  }
  
  return { successful, failed };
}

/**
 * Отмена всех резервирований для сметы
 */
export async function cancelEstimateReservations(estimateId: string): Promise<void> {
  const user = getCurrentUser();
  
  // Получаем все резервирования для сметы
  const reservations = await getReservations({
    type: 'estimate',
    referenceId: estimateId,
    status: 'active'
  });
  
  // Отменяем резервирования
  for (const reservation of reservations) {
    await cancelReservation(reservation.id);
  }
  
  // Обновляем связи (убираем reservationId)
  const warehouseLinks = await getEstimateWarehouseLinks(estimateId);
  const batch = writeBatch(db);
  
  for (const link of warehouseLinks) {
    if (link.reservationId) {
      const linkRef = doc(db, `users/${user.uid}/${COLLECTIONS.estimateItemWarehouse}`, `${estimateId}_${link.estimateItemId}`);
      batch.update(linkRef, {
        reservationId: null,
        updatedAt: new Date().toISOString()
      });
    }
  }
  
  await batch.commit();
}

/**
 * Выдача материалов со склада по смете
 */
export async function issueMaterialsForEstimate(
  estimateId: string,
  materialIssues: Array<{
    estimateItemId: string;
    quantity: number;
    warehouseId: string;
    notes?: string;
  }>
): Promise<string[]> {
  const user = getCurrentUser();
  const transactionIds: string[] = [];
  
  for (const issue of materialIssues) {
    const link = await getEstimateWarehouseLink(estimateId, issue.estimateItemId);
    if (!link) {
      throw new Error(`Связь со складом не найдена для позиции ${issue.estimateItemId}`);
    }
    
    // Создаем транзакцию расхода
    const transactionId = await createStockTransaction({
      type: 'issue',
      itemId: link.itemId,
      quantity: issue.quantity,
      unit: link.unit,
      warehouseId: issue.warehouseId,
      referenceType: 'estimate',
      referenceId: estimateId,
      documentNumber: `EST-${estimateId}`,
      notes: issue.notes
    });
    
    transactionIds.push(transactionId);
    
    // Обновляем связь
    await updateEstimateWarehouseLink(estimateId, issue.estimateItemId, {
      issuedQuantity: (link.issuedQuantity || 0) + issue.quantity,
      updatedAt: new Date().toISOString()
    });
  }
  
  return transactionIds;
}

/**
 * Возврат неиспользованных материалов
 */
export async function returnMaterialsToWarehouse(
  estimateId: string,
  materialReturns: Array<{
    estimateItemId: string;
    quantity: number;
    warehouseId: string;
    condition: 'new' | 'used' | 'damaged';
    notes?: string;
  }>
): Promise<string[]> {
  const user = getCurrentUser();
  const transactionIds: string[] = [];
  
  for (const returnItem of materialReturns) {
    const link = await getEstimateWarehouseLink(estimateId, returnItem.estimateItemId);
    if (!link) {
      throw new Error(`Связь со складом не найдена для позиции ${returnItem.estimateItemId}`);
    }
    
    // Создаем транзакцию возврата
    const transactionId = await createStockTransaction({
      type: 'return',
      itemId: link.itemId,
      quantity: returnItem.quantity,
      unit: link.unit,
      warehouseId: returnItem.warehouseId,
      referenceType: 'estimate',
      referenceId: estimateId,
      documentNumber: `EST-${estimateId}-RET`,
      reason: `Возврат после проекта. Состояние: ${returnItem.condition}`,
      notes: returnItem.notes
    });
    
    transactionIds.push(transactionId);
    
    // Обновляем связь
    await updateEstimateWarehouseLink(estimateId, returnItem.estimateItemId, {
      returnedQuantity: (link.returnedQuantity || 0) + returnItem.quantity,
      actualConsumption: (link.issuedQuantity || 0) - ((link.returnedQuantity || 0) + returnItem.quantity),
      updatedAt: new Date().toISOString()
    });
  }
  
  return transactionIds;
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

/**
 * Получение связей сметы со складской системой
 */
export async function getEstimateWarehouseLinks(estimateId: string): Promise<EstimateItemWarehouse[]> {
  const user = getCurrentUser();
  const q = query(
    collection(db, `users/${user.uid}/${COLLECTIONS.estimateItemWarehouse}`),
    where('estimateId', '==', estimateId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  } as unknown as EstimateItemWarehouse));
}

/**
 * Получение конкретной связи сметы со складом
 */
export async function getEstimateWarehouseLink(
  estimateId: string, 
  estimateItemId: string
): Promise<EstimateItemWarehouse | null> {
  const user = getCurrentUser();
  const linkId = `${estimateId}_${estimateItemId}`;
  const docRef = doc(db, `users/${user.uid}/${COLLECTIONS.estimateItemWarehouse}`, linkId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as unknown as EstimateItemWarehouse;
  }
  return null;
}

/**
 * Обновление связи сметы со складом
 */
async function updateEstimateWarehouseLink(
  estimateId: string,
  estimateItemId: string,
  updates: Partial<EstimateItemWarehouse>
): Promise<void> {
  const user = getCurrentUser();
  const linkId = `${estimateId}_${estimateItemId}`;
  const docRef = doc(db, `users/${user.uid}/${COLLECTIONS.estimateItemWarehouse}`, linkId);
  
  await updateDoc(docRef, updates);
}

/**
 * Проверка доступности товара на всех складах
 */
async function checkWarehouseAvailability(
  itemId: string,
  requiredQuantity: number
): Promise<{
  status: 'available' | 'partial' | 'unavailable';
  totalAvailable: number;
  shortfall?: number;
  bestWarehouse?: string;
  alternativeWarehouses: string[];
}> {
  // Получаем список складов (упрощенная реализация)
  // В реальной системе нужно получить актуальный список складов
  const warehouseIds = ['warehouse1']; // TODO: получать из системы
  
  let totalAvailable = 0;
  let bestWarehouse: string | undefined;
  let bestAvailableQty = 0;
  const alternativeWarehouses: string[] = [];
  
  for (const warehouseId of warehouseIds) {
    try {
      const availability = await checkAvailability(itemId, warehouseId, requiredQuantity);
      
      totalAvailable += availability.availableQuantity;
      
      if (availability.availableQuantity > bestAvailableQty) {
        bestAvailableQty = availability.availableQuantity;
        if (bestWarehouse) alternativeWarehouses.push(bestWarehouse);
        bestWarehouse = warehouseId;
      } else if (availability.availableQuantity > 0) {
        alternativeWarehouses.push(warehouseId);
      }
    } catch (error) {
      console.warn(`Ошибка проверки доступности на складе ${warehouseId}:`, error);
    }
  }
  
  let status: 'available' | 'partial' | 'unavailable';
  if (totalAvailable >= requiredQuantity) {
    status = 'available';
  } else if (totalAvailable > 0) {
    status = 'partial';
  } else {
    status = 'unavailable';
  }
  
  return {
    status,
    totalAvailable,
    shortfall: totalAvailable < requiredQuantity ? requiredQuantity - totalAvailable : undefined,
    bestWarehouse,
    alternativeWarehouses
  };
}

/**
 * Расчет потребности в материалах для сметы
 */
export async function calculateMaterialRequirements(estimateId: string): Promise<{
  requirements: Array<{
    itemId: string;
    itemName: string;
    itemCode: string;
    totalRequired: number;
    unit: string;
    estimatedCost: number;
    sources: Array<{
      estimateItemId: string;
      estimateItemName: string;
      quantity: number;
      wastePercent?: number;
    }>;
  }>;
  totalEstimatedCost: number;
  itemsCount: number;
}> {
  const user = getCurrentUser();
  
  // Получаем связи сметы со складом
  const warehouseLinks = await getEstimateWarehouseLinks(estimateId);
  
  if (warehouseLinks.length === 0) {
    return {
      requirements: [],
      totalEstimatedCost: 0,
      itemsCount: 0
    };
  }
  
  // Получаем информацию о позициях сметы
  const itemsQuery = query(
    collection(db, `users/${user.uid}/estimates/${estimateId}/items`)
  );
  const itemsSnap = await getDocs(itemsQuery);
  const estimateItems = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EstimateItem));
  
  // Получаем элементы номенклатуры
  const itemIds = Array.from(new Set(warehouseLinks.map(link => link.itemId)));
  const items = await getItemsByIds(itemIds);
  const itemsMap = new Map(items.map(item => [item.id, item]));
  
  // Группируем по элементам номенклатуры
  const requirementsMap = new Map<string, {
    itemId: string;
    itemName: string;
    itemCode: string;
    totalRequired: number;
    unit: string;
    estimatedCost: number;
    sources: Array<{
      estimateItemId: string;
      estimateItemName: string;
      quantity: number;
      wastePercent?: number;
    }>;
  }>();
  
  for (const link of warehouseLinks) {
    const item = itemsMap.get(link.itemId);
    if (!item) continue;
    
    const estimateItem = estimateItems.find(ei => ei.id === link.estimateItemId);
    if (!estimateItem) continue;
    
    let requirement = requirementsMap.get(link.itemId);
    if (!requirement) {
      requirement = {
        itemId: link.itemId,
        itemName: item.name,
        itemCode: item.code,
        totalRequired: 0,
        unit: item.baseUnit,
        estimatedCost: 0,
        sources: []
      };
      requirementsMap.set(link.itemId, requirement);
    }
    
    const wastePercent = (estimateItem as EstimateProductLine).wastePct || 0;
    const sourceQuantity = link.requiredQuantity;
    
    requirement.totalRequired += sourceQuantity;
    requirement.sources.push({
      estimateItemId: link.estimateItemId,
      estimateItemName: estimateItem.name,
      quantity: sourceQuantity,
      wastePercent: wastePercent > 0 ? wastePercent : undefined
    });
    
    // Оценка стоимости (упрощенная)
    if (isProductItem(item)) {
      const unitCost = item.productData.standardCost || item.productData.lastPurchasePrice || 0;
      requirement.estimatedCost += sourceQuantity * unitCost;
    }
  }
  
  const requirements = Array.from(requirementsMap.values());
  const totalEstimatedCost = requirements.reduce((sum, req) => sum + req.estimatedCost, 0);
  
  return {
    requirements,
    totalEstimatedCost,
    itemsCount: requirements.length
  };
}

/**
 * Получение статуса обеспеченности сметы материалами
 */
export async function getEstimateMaterialStatus(estimateId: string): Promise<{
  overallStatus: 'ready' | 'partial' | 'not_ready';
  totalItems: number;
  availableItems: number;
  partialItems: number;
  unavailableItems: number;
  reservedItems: number;
  issuedItems: number;
  items: Array<{
    itemId: string;
    itemName: string;
    itemCode: string;
    status: 'available' | 'partial' | 'unavailable';
    requiredQuantity: number;
    availableQuantity: number;
    reservedQuantity: number;
    issuedQuantity: number;
    unit: string;
  }>;
}> {
  const warehouseLinks = await getEstimateWarehouseLinks(estimateId);
  
  if (warehouseLinks.length === 0) {
    return {
      overallStatus: 'ready',
      totalItems: 0,
      availableItems: 0,
      partialItems: 0,
      unavailableItems: 0,
      reservedItems: 0,
      issuedItems: 0,
      items: []
    };
  }
  
  // Получаем элементы номенклатуры
  const itemIds = Array.from(new Set(warehouseLinks.map(link => link.itemId)));
  const items = await getItemsByIds(itemIds);
  const itemsMap = new Map(items.map(item => [item.id, item]));
  
  let availableItems = 0;
  let partialItems = 0;
  let unavailableItems = 0;
  let reservedItems = 0;
  let issuedItems = 0;
  
  const itemStatuses = warehouseLinks.map(link => {
    const item = itemsMap.get(link.itemId);
    if (!item) return null;
    
    const status = link.availabilityStatus;
    if (status === 'available') availableItems++;
    else if (status === 'partial') partialItems++;
    else unavailableItems++;
    
    if (link.reservationId) reservedItems++;
    if (link.issuedQuantity && link.issuedQuantity > 0) issuedItems++;
    
    return {
      itemId: link.itemId,
      itemName: item.name,
      itemCode: item.code,
      status,
      requiredQuantity: link.requiredQuantity,
      availableQuantity: link.availableQuantity,
      reservedQuantity: 0, // TODO: получать из резервирований
      issuedQuantity: link.issuedQuantity || 0,
      unit: link.unit
    };
  }).filter(Boolean) as any[];
  
  const totalItems = warehouseLinks.length;
  let overallStatus: 'ready' | 'partial' | 'not_ready';
  
  if (unavailableItems === 0) {
    overallStatus = 'ready';
  } else if (availableItems > 0 || partialItems > 0) {
    overallStatus = 'partial';
  } else {
    overallStatus = 'not_ready';
  }
  
  return {
    overallStatus,
    totalItems,
    availableItems,
    partialItems,
    unavailableItems,
    reservedItems,
    issuedItems,
    items: itemStatuses
  };
}

/**
 * Синхронизация позиций сметы с номенклатурой
 */
export async function syncEstimateWithNomenclature(
  estimateId: string,
  mappings: Array<{
    estimateItemId: string;
    nomenclatureItemId: string;
  }>
): Promise<void> {
  const user = getCurrentUser();
  
  await runTransaction(db, async (transaction) => {
    for (const mapping of mappings) {
      // Получаем позицию сметы
      const estimateItemRef = doc(db, `users/${user.uid}/estimates/${estimateId}/items`, mapping.estimateItemId);
      const estimateItemSnap = await transaction.get(estimateItemRef);
      
      if (!estimateItemSnap.exists()) continue;
      
      const estimateItem = estimateItemSnap.data() as EstimateItem;
      
      // Обновляем ссылку на номенклатуру
      if (estimateItem.type === 'material' || estimateItem.type === 'equipment') {
        transaction.update(estimateItemRef, {
          productId: mapping.nomenclatureItemId
        });
      }
    }
  });
  
  // После синхронизации перезапускаем связывание со складом
  await linkEstimateWithWarehouse(estimateId);
}
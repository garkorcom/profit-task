/**
 * API для управления складами, остатками и транзакциями
 * Поддерживает партийный учет, резервирование и интеграцию с оценками
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
  Timestamp,
  increment,
  arrayUnion,
  arrayRemove
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
  Warehouse,
  WarehouseBin,
  StockLot,
  StockBalance,
  StockReservation,
  StockTransaction,
  InventoryCount,
  InventoryCountLine,
  CreateStockTransactionDto,
  CreateReservationDto,
  StockTransactionFilters,
  StockBalanceFilters,
  WarehouseSortOptions,
  ValuationMethod,
  AvailabilityCheck,
  WarehouseValidationResult,
  WarehouseValidationError,
  EstimateItemWarehouse,
  StockReport,
  StockMovementReport
} from '../types/warehouse.types';

// ==================== КОНСТАНТЫ ====================

const COLLECTIONS = {
  warehouses: 'warehouses',
  warehouseBins: 'warehouseBins',
  stockLots: 'stockLots',
  stockBalances: 'stockBalances',
  stockReservations: 'stockReservations',
  stockTransactions: 'stockTransactions',
  inventoryCounts: 'inventoryCounts',
  inventoryCountLines: 'inventoryCountLines',
  estimateItemWarehouse: 'estimateItemWarehouse'
} as const;

// ==================== СКЛАДЫ ====================

/**
 * Получение списка складов
 */
export async function getWarehouses(activeOnly = false): Promise<Warehouse[]> {
  const user = getCurrentUser();
  let q = query(
    collection(db, `users/${user.uid}/${COLLECTIONS.warehouses}`),
    orderBy('name')
  );
  
  if (activeOnly) {
    q = query(q, where('isActive', '==', true));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warehouse));
}

/**
 * Получение склада по ID
 */
export async function getWarehouse(id: string): Promise<Warehouse | null> {
  const user = getCurrentUser();
  const docRef = doc(db, `users/${user.uid}/${COLLECTIONS.warehouses}`, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Warehouse;
  }
  return null;
}

/**
 * Создание склада
 */
export async function createWarehouse(warehouse: Omit<Warehouse, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const user = getCurrentUser();
  const now = new Date().toISOString();
  
  const warehouseData: Omit<Warehouse, 'id'> = {
    ...warehouse,
    createdBy: user.uid,
    createdAt: now,
    updatedAt: now
  };
  
  const docRef = await addDoc(collection(db, `users/${user.uid}/${COLLECTIONS.warehouses}`), warehouseData);
  return docRef.id;
}

/**
 * Обновление склада
 */
export async function updateWarehouse(id: string, updates: Partial<Warehouse>): Promise<void> {
  const user = getCurrentUser();
  const docRef = doc(db, `users/${user.uid}/${COLLECTIONS.warehouses}`, id);
  
  await updateDoc(docRef, {
    ...updates,
    updatedBy: user.uid,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Удаление склада
 */
export async function deleteWarehouse(id: string): Promise<void> {
  const user = getCurrentUser();
  
  // Проверяем, что на складе нет остатков
  const stockBalances = await getStockBalances({ warehouseId: id });
  if (stockBalances.some(balance => balance.totalQuantity > 0)) {
    throw new Error('Невозможно удалить склад с остатками товаров');
  }
  
  const docRef = doc(db, `users/${user.uid}/${COLLECTIONS.warehouses}`, id);
  await deleteDoc(docRef);
}

// ==================== ЯЧЕЙКИ СКЛАДОВ ====================

/**
 * Получение ячеек склада
 */
export async function getWarehouseBins(warehouseId: string): Promise<WarehouseBin[]> {
  const user = getCurrentUser();
  const q = query(
    collection(db, `users/${user.uid}/${COLLECTIONS.warehouseBins}`),
    where('warehouseId', '==', warehouseId),
    orderBy('code')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WarehouseBin));
}

/**
 * Создание ячейки склада
 */
export async function createWarehouseBin(bin: Omit<WarehouseBin, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const user = getCurrentUser();
  const now = new Date().toISOString();
  
  const binData: Omit<WarehouseBin, 'id'> = {
    ...bin,
    createdAt: now,
    updatedAt: now
  };
  
  const docRef = await addDoc(collection(db, `users/${user.uid}/${COLLECTIONS.warehouseBins}`), binData);
  return docRef.id;
}

// ==================== ПАРТИИ (ЛОТЫ) ====================

/**
 * Получение партий товара
 */
export async function getStockLots(filters: {
  itemId?: string;
  warehouseId?: string;
  status?: string;
  hasStock?: boolean;
}): Promise<StockLot[]> {
  const user = getCurrentUser();
  let q = query(collection(db, `users/${user.uid}/${COLLECTIONS.stockLots}`));
  
  if (filters.itemId) {
    q = query(q, where('itemId', '==', filters.itemId));
  }
  if (filters.warehouseId) {
    q = query(q, where('warehouseId', '==', filters.warehouseId));
  }
  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  q = query(q, orderBy('receivedDate', 'desc'));
  
  const snapshot = await getDocs(q);
  let lots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockLot));
  
  if (filters.hasStock) {
    lots = lots.filter(lot => lot.availableQuantity > 0);
  }
  
  return lots;
}

/**
 * Получение партии по ID
 */
export async function getStockLot(id: string): Promise<StockLot | null> {
  const user = getCurrentUser();
  const docRef = doc(db, `users/${user.uid}/${COLLECTIONS.stockLots}`, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as StockLot;
  }
  return null;
}

// ==================== ОСТАТКИ ====================

/**
 * Получение остатков на складах
 */
export async function getStockBalances(filters: StockBalanceFilters = {}): Promise<StockBalance[]> {
  const user = getCurrentUser();
  let q = query(collection(db, `users/${user.uid}/${COLLECTIONS.stockBalances}`));
  
  if (filters.warehouseId) {
    q = query(q, where('warehouseId', '==', filters.warehouseId));
  }
  if (filters.itemIds && filters.itemIds.length > 0) {
    q = query(q, where('itemId', 'in', filters.itemIds));
  }
  
  const snapshot = await getDocs(q);
  let balances = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockBalance));
  
  // Клиентские фильтры
  if (filters.hasStock) {
    balances = balances.filter(balance => balance.totalQuantity > 0);
  }
  if (filters.hasReservations) {
    balances = balances.filter(balance => balance.reservedQuantity > 0);
  }
  if (filters.negativeStock) {
    balances = balances.filter(balance => balance.totalQuantity < 0);
  }
  
  return balances;
}

/**
 * Получение остатка по конкретной позиции
 */
export async function getStockBalance(warehouseId: string, itemId: string): Promise<StockBalance | null> {
  const user = getCurrentUser();
  const balanceId = `${warehouseId}_${itemId}`;
  const docRef = doc(db, `users/${user.uid}/${COLLECTIONS.stockBalances}`, balanceId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as StockBalance;
  }
  return null;
}

// ==================== РЕЗЕРВИРОВАНИЯ ====================

/**
 * Создание резервирования
 */
export async function createReservation(reservationDto: CreateReservationDto): Promise<string> {
  const user = getCurrentUser();
  
  return await runTransaction(db, async (transaction) => {
    // Проверяем доступность товара
    const availability = await checkAvailability(
      reservationDto.itemId,
      reservationDto.warehouseId,
      reservationDto.quantity
    );
    
    if (!availability.isAvailable) {
      throw new Error(`Недостаточно товара для резервирования. Доступно: ${availability.availableQuantity}`);
    }
    
    // Создаем резервирование
    const now = new Date().toISOString();
    const reservation: Omit<StockReservation, 'id'> = {
      ...reservationDto,
      requestedQuantity: reservationDto.quantity,
      reservedQuantity: reservationDto.quantity,
      lotAllocations: availability.lotAllocations?.map(lot => ({
        lotId: lot.lotId,
        quantity: lot.allocatedQuantity
      })) || [],
      reservedDate: now,
      status: 'active',
      priority: reservationDto.priority || 'medium',
      createdBy: user.uid,
      createdAt: now,
      updatedAt: now
    };
    
    const reservationRef = doc(collection(db, `users/${user.uid}/${COLLECTIONS.stockReservations}`));
    transaction.set(reservationRef, reservation);
    
    // Обновляем партии (увеличиваем reservedQuantity)
    for (const allocation of reservation.lotAllocations) {
      const lotRef = doc(db, `users/${user.uid}/${COLLECTIONS.stockLots}`, allocation.lotId);
      transaction.update(lotRef, {
        reservedQuantity: increment(allocation.quantity),
        availableQuantity: increment(-allocation.quantity),
        updatedAt: now
      });
    }
    
    // Обновляем остаток
    const balanceId = `${reservationDto.warehouseId}_${reservationDto.itemId}`;
    const balanceRef = doc(db, `users/${user.uid}/${COLLECTIONS.stockBalances}`, balanceId);
    transaction.update(balanceRef, {
      reservedQuantity: increment(reservationDto.quantity),
      availableQuantity: increment(-reservationDto.quantity),
      updatedAt: now
    });
    
    return reservationRef.id;
  });
}

/**
 * Отмена резервирования
 */
export async function cancelReservation(reservationId: string): Promise<void> {
  const user = getCurrentUser();
  
  await runTransaction(db, async (transaction) => {
    const reservationRef = doc(db, `users/${user.uid}/${COLLECTIONS.stockReservations}`, reservationId);
    const reservationSnap = await transaction.get(reservationRef);
    
    if (!reservationSnap.exists()) {
      throw new Error('Резервирование не найдено');
    }
    
    const reservation = reservationSnap.data() as StockReservation;
    if (reservation.status !== 'active') {
      throw new Error('Резервирование уже неактивно');
    }
    
    const now = new Date().toISOString();
    
    // Помечаем резервирование как отмененное
    transaction.update(reservationRef, {
      status: 'cancelled',
      updatedBy: user.uid,
      updatedAt: now
    });
    
    // Освобождаем партии
    for (const allocation of reservation.lotAllocations) {
      const lotRef = doc(db, `users/${user.uid}/${COLLECTIONS.stockLots}`, allocation.lotId);
      transaction.update(lotRef, {
        reservedQuantity: increment(-allocation.quantity),
        availableQuantity: increment(allocation.quantity),
        updatedAt: now
      });
    }
    
    // Обновляем остаток
    const balanceId = `${reservation.warehouseId}_${reservation.itemId}`;
    const balanceRef = doc(db, `users/${user.uid}/${COLLECTIONS.stockBalances}`, balanceId);
    transaction.update(balanceRef, {
      reservedQuantity: increment(-reservation.reservedQuantity),
      availableQuantity: increment(reservation.reservedQuantity),
      updatedAt: now
    });
  });
}

/**
 * Получение резервирований
 */
export async function getReservations(filters: {
  itemId?: string;
  warehouseId?: string;
  type?: string;
  referenceId?: string;
  status?: string;
}): Promise<StockReservation[]> {
  const user = getCurrentUser();
  let q = query(collection(db, `users/${user.uid}/${COLLECTIONS.stockReservations}`));
  
  if (filters.itemId) {
    q = query(q, where('itemId', '==', filters.itemId));
  }
  if (filters.warehouseId) {
    q = query(q, where('warehouseId', '==', filters.warehouseId));
  }
  if (filters.type) {
    q = query(q, where('type', '==', filters.type));
  }
  if (filters.referenceId) {
    q = query(q, where('referenceId', '==', filters.referenceId));
  }
  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  q = query(q, orderBy('createdAt', 'desc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockReservation));
}

// ==================== ТРАНЗАКЦИИ ====================

/**
 * Создание складской транзакции
 */
export async function createStockTransaction(transactionDto: CreateStockTransactionDto): Promise<string> {
  const user = getCurrentUser();
  
  // Валидация
  const validation = validateStockTransaction(transactionDto);
  if (!validation.isValid) {
    throw new Error(`Ошибка валидации: ${validation.errors.map(e => e.message).join(', ')}`);
  }
  
  return await runTransaction(db, async (firebaseTransaction) => {
    const now = new Date().toISOString();
    
    // Создаем транзакцию
    const stockTransaction: Omit<StockTransaction, 'id'> = {
      ...transactionDto,
      status: 'confirmed',
      transactionDate: now,
      currency: transactionDto.currency || 'RUB',
      createdBy: user.uid,
      createdAt: now,
      updatedAt: now
    };
    
    const transactionRef = doc(collection(db, `users/${user.uid}/${COLLECTIONS.stockTransactions}`));
    firebaseTransaction.set(transactionRef, stockTransaction);
    
    // Обрабатываем по типу операции
    await processStockTransaction(firebaseTransaction, stockTransaction, user.uid);
    
    return transactionRef.id;
  });
}

/**
 * Обработка складской транзакции (внутренняя функция)
 */
async function processStockTransaction(
  transaction: any,
  stockTransaction: Omit<StockTransaction, 'id'>,
  userId: string
): Promise<void> {
  const now = new Date().toISOString();
  
  switch (stockTransaction.type) {
    case 'receipt':
      await processReceipt(transaction, stockTransaction, userId, now);
      break;
      
    case 'issue':
      await processIssue(transaction, stockTransaction, userId, now);
      break;
      
    case 'adjustment':
      await processAdjustment(transaction, stockTransaction, userId, now);
      break;
      
    case 'transfer':
      await processTransfer(transaction, stockTransaction, userId, now);
      break;
      
    default:
      throw new Error(`Неподдерживаемый тип транзакции: ${stockTransaction.type}`);
  }
}

/**
 * Обработка поступления товара
 */
async function processReceipt(
  transaction: any,
  stockTransaction: Omit<StockTransaction, 'id'>,
  userId: string,
  now: string
): Promise<void> {
  const { itemId, warehouseId, quantity, unitCost, newLotData } = stockTransaction;
  
  if (!unitCost || !newLotData) {
    throw new Error('Для поступления требуется указать стоимость и данные партии');
  }
  
  // Создаем новую партию
  const lot: Omit<StockLot, 'id'> = {
    itemId,
    warehouseId,
    binId: stockTransaction.binId,
    lotNumber: newLotData.lotNumber || generateLotNumber(),
    serialNumber: newLotData.serialNumber,
    quantity,
    reservedQuantity: 0,
    availableQuantity: quantity,
    unit: stockTransaction.unit,
    unitCost,
    totalCost: quantity * unitCost,
    currency: stockTransaction.currency || 'RUB',
    receivedDate: now,
    productionDate: newLotData.productionDate,
    expiryDate: newLotData.expiryDate,
    status: 'available',
    qualityGrade: newLotData.qualityGrade,
    vendorId: newLotData.vendorId,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    version: 1
  };
  
  const lotRef = doc(collection(db, `users/${userId}/${COLLECTIONS.stockLots}`));
  transaction.set(lotRef, lot);
  
  // Обновляем остаток
  await updateStockBalance(transaction, userId, itemId, warehouseId, quantity, unitCost, now);
}

/**
 * Обработка расхода товара
 */
async function processIssue(
  transaction: any,
  stockTransaction: Omit<StockTransaction, 'id'>,
  userId: string,
  now: string
): Promise<void> {
  const { itemId, warehouseId, quantity, lotId } = stockTransaction;
  
  if (lotId) {
    // Расход из конкретной партии
    const lotRef = doc(db, `users/${userId}/${COLLECTIONS.stockLots}`, lotId);
    const lotSnap = await transaction.get(lotRef);
    
    if (!lotSnap.exists()) {
      throw new Error('Партия не найдена');
    }
    
    const lot = lotSnap.data() as StockLot;
    
    if (lot.availableQuantity < quantity) {
      throw new Error(`Недостаточно товара в партии. Доступно: ${lot.availableQuantity}`);
    }
    
    // Обновляем партию
    transaction.update(lotRef, {
      quantity: increment(-quantity),
      availableQuantity: increment(-quantity),
      updatedAt: now,
      version: increment(1)
    });
    
    // Обновляем остаток
    await updateStockBalance(transaction, userId, itemId, warehouseId, -quantity, lot.unitCost, now);
  } else {
    // Расход по FIFO
    await processIssueByFifo(transaction, userId, itemId, warehouseId, quantity, now);
  }
}

/**
 * Расход по методу FIFO
 */
async function processIssueByFifo(
  transaction: any,
  userId: string,
  itemId: string,
  warehouseId: string,
  requestedQuantity: number,
  now: string
): Promise<void> {
  // Получаем доступные партии, отсортированные по дате поступления (FIFO)
  const lotsQuery = query(
    collection(db, `users/${userId}/${COLLECTIONS.stockLots}`),
    where('itemId', '==', itemId),
    where('warehouseId', '==', warehouseId),
    where('availableQuantity', '>', 0),
    orderBy('receivedDate')
  );
  
  const lotsSnap = await getDocs(lotsQuery);
  const lots = lotsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockLot));
  
  let remainingQuantity = requestedQuantity;
  let totalCost = 0;
  
  for (const lot of lots) {
    if (remainingQuantity <= 0) break;
    
    const takeQuantity = Math.min(remainingQuantity, lot.availableQuantity);
    
    // Обновляем партию
    const lotRef = doc(db, `users/${userId}/${COLLECTIONS.stockLots}`, lot.id);
    transaction.update(lotRef, {
      quantity: increment(-takeQuantity),
      availableQuantity: increment(-takeQuantity),
      updatedAt: now,
      version: increment(1)
    });
    
    totalCost += takeQuantity * lot.unitCost;
    remainingQuantity -= takeQuantity;
  }
  
  if (remainingQuantity > 0) {
    throw new Error(`Недостаточно товара на складе. Не хватает: ${remainingQuantity}`);
  }
  
  // Обновляем остаток
  const avgCost = totalCost / requestedQuantity;
  await updateStockBalance(transaction, userId, itemId, warehouseId, -requestedQuantity, avgCost, now);
}

/**
 * Обработка корректировки
 */
async function processAdjustment(
  transaction: any,
  stockTransaction: Omit<StockTransaction, 'id'>,
  userId: string,
  now: string
): Promise<void> {
  const { itemId, warehouseId, quantity, lotId, unitCost } = stockTransaction;
  
  if (lotId && unitCost) {
    // Корректировка конкретной партии
    const lotRef = doc(db, `users/${userId}/${COLLECTIONS.stockLots}`, lotId);
    const lotSnap = await transaction.get(lotRef);
    
    if (!lotSnap.exists()) {
      throw new Error('Партия не найдена');
    }
    
    const lot = lotSnap.data() as StockLot;
    
    // Обновляем партию
    transaction.update(lotRef, {
      quantity: increment(quantity),
      availableQuantity: increment(quantity),
      totalCost: (lot.quantity + quantity) * unitCost,
      unitCost,
      updatedAt: now,
      version: increment(1)
    });
    
    // Обновляем остаток
    await updateStockBalance(transaction, userId, itemId, warehouseId, quantity, unitCost, now);
  } else {
    throw new Error('Для корректировки требуется указать партию и стоимость');
  }
}

/**
 * Обработка перемещения между складами
 */
async function processTransfer(
  transaction: any,
  stockTransaction: Omit<StockTransaction, 'id'>,
  userId: string,
  now: string
): Promise<void> {
  const { itemId, warehouseId, toWarehouseId, quantity, lotId } = stockTransaction;
  
  if (!toWarehouseId) {
    throw new Error('Для перемещения требуется указать склад назначения');
  }
  
  if (!lotId) {
    throw new Error('Для перемещения требуется указать партию');
  }
  
  // Получаем исходную партию
  const sourceLotRef = doc(db, `users/${userId}/${COLLECTIONS.stockLots}`, lotId);
  const sourceLotSnap = await transaction.get(sourceLotRef);
  
  if (!sourceLotSnap.exists()) {
    throw new Error('Исходная партия не найдена');
  }
  
  const sourceLot = sourceLotSnap.data() as StockLot;
  
  if (sourceLot.availableQuantity < quantity) {
    throw new Error('Недостаточно товара для перемещения');
  }
  
  // Уменьшаем исходную партию
  transaction.update(sourceLotRef, {
    quantity: increment(-quantity),
    availableQuantity: increment(-quantity),
    totalCost: (sourceLot.quantity - quantity) * sourceLot.unitCost,
    updatedAt: now,
    version: increment(1)
  });
  
  // Создаем новую партию на складе назначения
  const newLot: Omit<StockLot, 'id'> = {
    ...sourceLot,
    warehouseId: toWarehouseId,
    binId: stockTransaction.toBinId,
    quantity,
    reservedQuantity: 0,
    availableQuantity: quantity,
    totalCost: quantity * sourceLot.unitCost,
    receivedDate: now, // Новая дата получения
    createdAt: now,
    updatedAt: now,
    version: 1
  };
  
  const newLotRef = doc(collection(db, `users/${userId}/${COLLECTIONS.stockLots}`));
  transaction.set(newLotRef, newLot);
  
  // Обновляем остатки на обоих складах
  await updateStockBalance(transaction, userId, itemId, warehouseId, -quantity, sourceLot.unitCost, now);
  await updateStockBalance(transaction, userId, itemId, toWarehouseId, quantity, sourceLot.unitCost, now);
}

/**
 * Обновление остатка товара на складе
 */
async function updateStockBalance(
  transaction: any,
  userId: string,
  itemId: string,
  warehouseId: string,
  quantityDelta: number,
  unitCost: number,
  now: string
): Promise<void> {
  const balanceId = `${warehouseId}_${itemId}`;
  const balanceRef = doc(db, `users/${userId}/${COLLECTIONS.stockBalances}`, balanceId);
  const balanceSnap = await transaction.get(balanceRef);
  
  if (balanceSnap.exists()) {
    const balance = balanceSnap.data() as StockBalance;
    
    // Пересчитываем средневзвешенную стоимость
    const newTotalQuantity = balance.totalQuantity + quantityDelta;
    const newTotalValue = balance.totalValue + (quantityDelta * unitCost);
    const newAvgUnitCost = newTotalQuantity > 0 ? newTotalValue / newTotalQuantity : 0;
    
    transaction.update(balanceRef, {
      totalQuantity: newTotalQuantity,
      availableQuantity: newTotalQuantity - balance.reservedQuantity,
      totalValue: newTotalValue,
      avgUnitCost: newAvgUnitCost,
      updatedAt: now,
      version: increment(1)
    });
  } else {
    // Создаем новый остаток
    const newBalance: Omit<StockBalance, 'id'> = {
      itemId,
      warehouseId,
      totalQuantity: quantityDelta,
      reservedQuantity: 0,
      availableQuantity: quantityDelta,
      unit: 'pcs', // TODO: получать из номенклатуры
      totalValue: quantityDelta * unitCost,
      avgUnitCost: unitCost,
      currency: 'RUB',
      lotCount: quantityDelta > 0 ? 1 : 0,
      updatedAt: now,
      version: 1
    };
    
    transaction.set(balanceRef, newBalance);
  }
}

/**
 * Получение истории транзакций
 */
export async function getStockTransactions(filters: StockTransactionFilters = {}): Promise<StockTransaction[]> {
  const user = getCurrentUser();
  let q = query(collection(db, `users/${user.uid}/${COLLECTIONS.stockTransactions}`));
  
  if (filters.type && filters.type.length > 0) {
    q = query(q, where('type', 'in', filters.type));
  }
  if (filters.warehouseId) {
    q = query(q, where('warehouseId', '==', filters.warehouseId));
  }
  if (filters.itemId) {
    q = query(q, where('itemId', '==', filters.itemId));
  }
  if (filters.referenceId) {
    q = query(q, where('referenceId', '==', filters.referenceId));
  }
  
  q = query(q, orderBy('transactionDate', 'desc'), limit(100));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockTransaction));
}

// ==================== ПРОВЕРКИ И ВАЛИДАЦИЯ ====================

/**
 * Проверка доступности товара
 */
export async function checkAvailability(
  itemId: string,
  warehouseId: string,
  requestedQuantity: number
): Promise<AvailabilityCheck> {
  const balance = await getStockBalance(warehouseId, itemId);
  
  if (!balance || balance.availableQuantity < requestedQuantity) {
    return {
      itemId,
      warehouseId,
      requestedQuantity,
      isAvailable: false,
      availableQuantity: balance?.availableQuantity || 0,
      shortfall: requestedQuantity - (balance?.availableQuantity || 0),
      checkedAt: new Date().toISOString()
    };
  }
  
  // Получаем детализацию по партиям для резервирования
  const lots = await getStockLots({ 
    itemId, 
    warehouseId, 
    hasStock: true 
  });
  
  // Сортируем по FIFO
  lots.sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());
  
  const lotAllocations = [];
  let remaining = requestedQuantity;
  
  for (const lot of lots) {
    if (remaining <= 0) break;
    
    const allocateQty = Math.min(remaining, lot.availableQuantity);
    lotAllocations.push({
      lotId: lot.id,
      availableQuantity: lot.availableQuantity,
      allocatedQuantity: allocateQty,
      expiryDate: lot.expiryDate
    });
    
    remaining -= allocateQty;
  }
  
  return {
    itemId,
    warehouseId,
    requestedQuantity,
    isAvailable: true,
    availableQuantity: balance.availableQuantity,
    lotAllocations,
    checkedAt: new Date().toISOString()
  };
}

/**
 * Валидация складской транзакции
 */
function validateStockTransaction(transaction: CreateStockTransactionDto): WarehouseValidationResult {
  const errors: WarehouseValidationError[] = [];
  const warnings: WarehouseValidationError[] = [];
  
  // Базовые проверки
  if (!transaction.itemId) {
    errors.push({ field: 'itemId', message: 'Не указан товар', severity: 'error' });
  }
  if (!transaction.warehouseId) {
    errors.push({ field: 'warehouseId', message: 'Не указан склад', severity: 'error' });
  }
  if (!transaction.quantity || transaction.quantity <= 0) {
    errors.push({ field: 'quantity', message: 'Количество должно быть больше 0', severity: 'error' });
  }
  
  // Проверки по типу операции
  switch (transaction.type) {
    case 'receipt':
      if (!transaction.unitCost) {
        errors.push({ field: 'unitCost', message: 'Для поступления требуется указать стоимость', severity: 'error' });
      }
      if (!transaction.newLotData?.lotNumber) {
        warnings.push({ field: 'lotNumber', message: 'Рекомендуется указать номер партии', severity: 'warning' });
      }
      break;
      
    case 'issue':
      // Для расхода проверим доступность при выполнении
      break;
      
    case 'transfer':
      if (!transaction.toWarehouseId) {
        errors.push({ field: 'toWarehouseId', message: 'Для перемещения требуется указать склад назначения', severity: 'error' });
      }
      if (transaction.warehouseId === transaction.toWarehouseId) {
        errors.push({ field: 'toWarehouseId', message: 'Склад источник и назначения не могут быть одинаковыми', severity: 'error' });
      }
      break;
      
    case 'adjustment':
      if (!transaction.reason) {
        warnings.push({ field: 'reason', message: 'Рекомендуется указать причину корректировки', severity: 'warning' });
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ==================== УТИЛИТЫ ====================

/**
 * Генерация номера партии
 */
function generateLotNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `LOT-${dateStr}-${timeStr}-${random}`;
}

/**
 * Генерация номера транзакции
 */
function generateTransactionNumber(type: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const typePrefix = {
    'receipt': 'RCP',
    'issue': 'ISS',
    'transfer': 'TRF',
    'adjustment': 'ADJ'
  }[type] || 'TXN';
  
  return `${typePrefix}-${dateStr}-${random}`;
}
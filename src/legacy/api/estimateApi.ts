import { db } from '../../firebase/firebase';
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
  increment,
  setDoc,
  runTransaction,
} from 'firebase/firestore';
// Legacy code archived - product API integration disabled
// Stub functions for removed product API imports
const reserveForEstimate = async (...args: any[]) => {
  console.warn('Legacy reserveForEstimate called - functionality disabled');
};
const unreserveForEstimate = async (...args: any[]) => {
  console.warn('Legacy unreserveForEstimate called - functionality disabled');
};

// Типы, согласованные с UI-конструктором смет
export type EstimateItemType = 'section' | 'work' | 'material' | 'expense' | 'service';
export type EstimationMethod = 'single' | 'pert';

export interface PertEstimate {
  optimistic: number;
  mostLikely: number;
  pessimistic: number;
}

/**
 * Позиция в смете
 */
export interface EstimateItem {
  id: string;
  name: string;
  description?: string;
  type: EstimateItemType;
  // Иерархия/порядок
  level: number;
  order: number;
  parentId?: string;
  // Поля для типа 'work'
  unit?: string;
  quantity?: number;
  rate?: number;
  hours?: number;
  unitPrice?: number; // цена за единицу
  estimationMethod?: EstimationMethod;
  pertEstimate?: PertEstimate;
  // Поля для типа 'material'
  productId?: string; // ссылка на товар
  materialQuantity?: number;
  materialUnit?: string;
  materialCost?: number;
  // Поля для типа 'expense'
  expenseAmount?: number;
  // Итог по позиции
  total: number;
  // Вложенные элементы
  children?: EstimateItem[];

  // Новые поля для себестоимости
  totalLaborCost?: number; // Фактическая себестоимость работ по учету времени
}

/**
 * Смета (Estimate)
 */
export interface Estimate {
  id: string;
  projectId?: string; // Делаем опциональным для новых смет
  contractorId?: string; // Добавляем поле
  number?: string;
  name?: string;
  description?: string;
  items: EstimateItem[];
  subtotal: number;
  total: number;
  currency?: 'RUB' | 'USD' | 'EUR';
  defaultRate?: number;
  taxRate?: number;
  discountRate?: number;
  status?: 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled';
  version?: string;
  // Дополнительные поля для UI
  validUntil?: string;
  paymentTerms?: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Утилиты расчёта
 */
export const calculatePert = (p: PertEstimate): number => {
  return (p.optimistic + 4 * p.mostLikely + p.pessimistic) / 6;
};

export const calculateEstimateTotal = (estimate: Estimate): number => {
  const subtotal = (estimate.items || []).reduce((sum, item) => sum + (item.total || 0), 0);
  const afterDiscount = typeof estimate.discountRate === 'number' ? subtotal * (1 - estimate.discountRate / 100) : subtotal;
  const total = typeof estimate.taxRate === 'number' ? afterDiscount * (1 + estimate.taxRate / 100) : afterDiscount;
  return total;
};

/**
 * Получить поток всех смет для одного проекта
 */
export const getEstimatesStream = (
  userId: string,
  projectId: string,
  callback: (estimates: Estimate[]) => void
) => {
  const estimatesPath = `users/${userId}/estimates`;
  // Убираем orderBy с сервера, чтобы не требовать композитный индекс.
  // Сортировку по createdAt выполним на клиенте.
  
  // Если projectId пустой, загружаем все сметы
  const q = projectId 
    ? query(
        collection(db, estimatesPath),
        where('projectId', '==', projectId)
      )
    : collection(db, estimatesPath);

  return onSnapshot(q, (snapshot) => {
    const estimates = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Estimate[];
    // Клиентская сортировка по createdAt desc (учитываем Timestamp/Date/string)
    estimates.sort((a: any, b: any) => {
      const toMillis = (v: any): number => {
        if (!v) return 0;
        if (typeof v?.toMillis === 'function') return v.toMillis();
        const dt = new Date(v);
        return isNaN(dt.getTime()) ? 0 : dt.getTime();
      };
      return toMillis(b.createdAt) - toMillis(a.createdAt);
    });
    callback(estimates);
  });
};

/**
 * Получить поток одной сметы
 */
export const getEstimateStream = (
  userId: string,
  estimateId: string,
  callback: (estimate: Estimate | null) => void
) => {
  const estimatePath = `users/${userId}/estimates/${estimateId}`;
  return onSnapshot(doc(db, estimatePath), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...(snapshot.data() as any) } as Estimate);
    } else {
      callback(null);
    }
  });
};

/**
 * Создать новую смету и атомарно обновить счетчик в проекте
 */
export const addEstimate = async (
  userId: string,
  estimateData: Omit<Estimate, 'id'>
) => {
  const batch = writeBatch(db);

  const estimatesPath = `users/${userId}/estimates`;
  const newEstimateRef = doc(collection(db, estimatesPath));

  // Глубокая очистка данных перед отправкой
  const dataToSave = { ...estimateData };
  if (dataToSave.items) {
    dataToSave.items = dataToSave.items.map(item => cleanObject(item)) as EstimateItem[];
  }

  const cleanedData = cleanObject({
    ...dataToSave,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(newEstimateRef, cleanedData);

  // Обновляем счетчик в проекте (только если проект указан)
  if (estimateData.projectId) {
    const projectRef = doc(db, `users/${userId}/projects`, estimateData.projectId);
    batch.update(projectRef, { estimatesCount: increment(1) });
  }

  await batch.commit();
  return newEstimateRef.id;
};

// Утилита для очистки объекта от undefined полей
const cleanObject = (obj: { [key: string]: any }): { [key: string]: any } => {
  const cleaned: { [key: string]: any } = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
};

/**
 * Обновление существующей сметы
 */
export const updateEstimate = async (
  userId: string,
  estimateId: string,
  updates: Partial<Estimate>
): Promise<void> => {
  const estimateRef = doc(db, `users/${userId}/estimates`, estimateId);
  const cleanedUpdates = cleanObject(updates); // Очищаем данные
  
  await updateDoc(estimateRef, {
    ...cleanedUpdates,
    updatedAt: serverTimestamp()
  });
};

/**
 * Обновить статус сметы с обработкой резервов по товарам
 */
export const updateEstimateStatus = async (
  userId: string,
  estimateId: string,
  nextStatus: Estimate['status'] | 'cancelled',
  estimateSnapshot?: Estimate
) => {
  // 1) Обновляем статус
  await updateEstimate(userId, estimateId, { status: nextStatus });

  // 2) Если требуется обработка резервов
  if (!estimateSnapshot) return; // если не передали данные, пропускаем резервную логику

  const est = estimateSnapshot;
  const estimateLabel = est.number || est.name || estimateId;
  const materialItems = (est.items || []).filter(i => i.type === 'material');

  if (nextStatus === 'approved') {
    // Резервируем все материал-строки
    for (const item of materialItems) {
      const qty = item.materialQuantity || item.quantity || 0;
      if (!qty) continue;
      if (!item.productId) continue; // резервируем только если известен товар
      await reserveForEstimate(userId, item.productId, qty, estimateId, estimateLabel);
    }
  }

  if (nextStatus === 'rejected' || nextStatus === 'draft' || nextStatus === 'sent' || (nextStatus as string) === 'cancelled') {
    // Снимаем резерв
    for (const item of materialItems) {
      const qty = item.materialQuantity || item.quantity || 0;
      if (!qty) continue;
      if (!item.productId) continue;
      await unreserveForEstimate(userId, item.productId, qty, estimateId, estimateLabel);
    }
  }
};

/**
 * Удалить смету и атомарно обновить счетчик в проекте (если есть проект)
 */
export const deleteEstimate = async (userId: string, estimateId: string, projectId?: string) => {
  const batch = writeBatch(db);

  // 1. Удаляем смету
  const estimatePath = `users/${userId}/estimates/${estimateId}`;
  batch.delete(doc(db, estimatePath));

  // 2. Уменьшаем счетчик в проекте (только если проект указан и существует)
  if (projectId) {
    try {
      const projectRef = doc(db, `users/${userId}/projects`, projectId);
      // Проверяем существование проекта
      const projectDoc = await getDoc(projectRef);
      
      if (projectDoc.exists()) {
        // Проект существует, обновляем счетчик
        batch.update(projectRef, { estimatesCount: increment(-1) });
      } else {
        console.warn(`Проект ${projectId} не найден, пропускаем обновление счетчика`);
      }
    } catch (error) {
      console.warn(`Ошибка при обновлении проекта ${projectId}:`, error);
      // Продолжаем удаление сметы, даже если проект недоступен
    }
  }

  await batch.commit();
};

/**
 * Версионирование смет (упрощённо)
 */
export const createEstimateVersion = async (
  userId: string,
  estimateId: string,
  version: string,
  notes?: string
) => {
  const estimatePath = `users/${userId}/estimates/${estimateId}`;
  await updateDoc(doc(db, estimatePath), {
    version,
    updatedAt: serverTimestamp(),
  } as any);

  // Дополнительно можно сохранять запись о версии в подпапку
  const versionRef = doc(collection(db, `${estimatePath}/versions`));
  await setDoc(versionRef, {
    id: versionRef.id,
    version,
    notes: notes || '',
    createdAt: serverTimestamp(),
  } as any);
};

/**
 * Публичная ссылка (заглушка генерации)
 */
export const createShareLink = async (
  _userId: string,
  estimateId: string,
  _options?: { isPublic?: boolean; allowComments?: boolean; requireAuth?: boolean }
): Promise<string> => {
  // Возвращаем относительный путь до публичной страницы
  return `/public/estimates/${estimateId}`;
};

/**
 * Group multiple estimate items under a new parent item
 */
export const groupEstimateItems = async (
  userId: string,
  estimateId: string,
  newParentName: string,
  childItemIds: string[]
): Promise<Estimate> => {
  // Get current estimate
  const estimateDoc = await getDoc(doc(db, `users/${userId}/estimates`, estimateId));
  if (!estimateDoc.exists()) {
    throw new Error('Estimate not found');
  }
  
  const estimate = { id: estimateDoc.id, ...estimateDoc.data() } as Estimate;
  const items = estimate.items || [];
  
  // Create new parent item
  const parentId = `group-${Date.now()}`;
  const parentItem: EstimateItem = {
    id: parentId,
    name: newParentName,
    quantity: 1,
    unit: 'компл',
    unitPrice: 0,
    total: 0,
    type: 'service',
    level: 0,
    order: 0,
    children: []
  };
  
  // Update items to set parentId and calculate total
  let childrenTotal = 0;
  const updatedItems = items.map(item => {
    if (childItemIds.includes(item.id)) {
      childrenTotal += item.total || ((item.quantity || 0) * (item.unitPrice || 0));
      return { ...item, parentId };
    }
    return item;
  });
  
  // Set parent item total
  parentItem.unitPrice = childrenTotal;
  parentItem.total = childrenTotal;
  parentItem.children = updatedItems.filter(i => childItemIds.includes(i.id));
  
  // Add parent item and update estimate
  const finalItems = [parentItem, ...updatedItems];
  
  await updateDoc(doc(db, `users/${userId}/estimates`, estimateId), {
    items: finalItems,
    updatedAt: serverTimestamp()
  });
  
  return { ...estimate, items: finalItems };
};

/**
 * Create new estimate (alias for addEstimate)
 */
export const createEstimate = async (
  userId: string,
  estimate: Omit<Estimate, 'id'>
): Promise<string> => {
  return addEstimate(userId, estimate);
};

/**
 * Generate PDF for estimate (stub - requires backend service)
 */
export const generateEstimatePDF = async (
  userId: string,
  estimateId: string
): Promise<string> => {
  // In production, this would call a backend service to generate PDF
  // For now, return a placeholder URL
  console.log(`Generating PDF for estimate ${estimateId} for user ${userId}`);
  
  // Mock implementation - in real app would call Cloud Function or API
  const pdfUrl = `https://example.com/estimates/${estimateId}.pdf`;
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return pdfUrl;
};

/**
 * Транзакционное создание сметы с резервированием товаров
 */
export const createEstimateWithReserves = async (
  userId: string,
  estimateData: Omit<Estimate, 'id'>
): Promise<string> => {
  return runTransaction(db, async (transaction) => {
    const estimatesPath = `users/${userId}/estimates`;
    const newEstimateRef = doc(collection(db, estimatesPath));
    
    // Глубокая очистка данных перед отправкой
    const dataToSave = { ...estimateData };
    if (dataToSave.items) {
      dataToSave.items = dataToSave.items.map(item => cleanObject(item)) as EstimateItem[];
    }
    
    const cleanedData = cleanObject({
      ...dataToSave,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Создаем смету в транзакции
    transaction.set(newEstimateRef, cleanedData);
    
    // Обновляем счетчик в проекте (только если проект указан)
    if (estimateData.projectId) {
      const projectRef = doc(db, `users/${userId}/projects`, estimateData.projectId);
      transaction.update(projectRef, { 
        estimatesCount: increment(1),
        updatedAt: serverTimestamp()
      });
    }
    
    // Если смета сразу утверждена, резервируем товары
    if (estimateData.status === 'approved') {
      const materialItems = (estimateData.items || []).filter(i => i.type === 'material');
      const estimateLabel = estimateData.number || estimateData.name || newEstimateRef.id;
      
      for (const item of materialItems) {
        if (item.productId && (item.materialQuantity || item.quantity)) {
          const productRef = doc(db, `users/${userId}/products`, item.productId);
          const productSnap = await transaction.get(productRef);
          
          if (!productSnap.exists()) {
            throw new Error(`Товар ${item.productId} не найден`);
          }
          
          const productData = productSnap.data();
          const quantity = item.materialQuantity || item.quantity || 0;
          const currentStock = productData.currentStock || 0;
          const reservedStock = productData.reservedStock || 0;
          const availableStock = currentStock - reservedStock;
          
          if (availableStock < quantity) {
            throw new Error(`Недостаточно товара ${item.name}: доступно ${availableStock}, требуется ${quantity}`);
          }
          
          // Резервируем товар
          transaction.update(productRef, {
            reservedStock: increment(quantity),
            updatedAt: serverTimestamp()
          });
          
          // Создаем запись о движении
          const movementRef = doc(collection(db, `users/${userId}/stockMovements`));
          transaction.set(movementRef, {
            productId: item.productId,
            productName: item.name,
            type: 'reserve',
            quantity,
            previousStock: currentStock,
            newStock: currentStock,
            document: 'Estimate',
            comment: `Резервирование по смете: ${estimateLabel}`,
            createdAt: serverTimestamp()
          });
        }
      }
    }
    
    return newEstimateRef.id;
  });
};

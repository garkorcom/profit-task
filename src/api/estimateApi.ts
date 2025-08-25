import { db } from '../firebase/firebase';
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
} from 'firebase/firestore';
import { reserveForEstimate, unreserveForEstimate } from './productApi';

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
}

/**
 * Смета (Estimate)
 */
export interface Estimate {
  id: string;
  projectId: string;
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

  // 1. Создаем ссылку на новую смету
  const estimatesPath = `users/${userId}/estimates`;
  const newEstimateRef = doc(collection(db, estimatesPath));

  const data = {
    ...estimateData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as any;
  batch.set(newEstimateRef, data);

  // 2. Обновляем счетчик в проекте
  const projectRef = doc(db, `users/${userId}/projects`, estimateData.projectId);
  batch.update(projectRef, { estimatesCount: increment(1) });

  await batch.commit();
  return newEstimateRef.id;
};

/**
 * Обновить смету
 */
export const updateEstimate = async (
  userId: string,
  estimateId: string,
  updates: Partial<Estimate>
) => {
  const estimatePath = `users/${userId}/estimates/${estimateId}`;
  const data = {
    ...updates,
    updatedAt: serverTimestamp(),
  } as any;
  await updateDoc(doc(db, estimatePath), data);
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
 * Удалить смету и атомарно обновить счетчик в проекте
 */
export const deleteEstimate = async (userId: string, estimateId: string, projectId: string) => {
  const batch = writeBatch(db);

  // 1. Удаляем смету
  const estimatePath = `users/${userId}/estimates/${estimateId}`;
  batch.delete(doc(db, estimatePath));

  // 2. Уменьшаем счетчик в проекте
  const projectRef = doc(db, `users/${userId}/projects`, projectId);
  batch.update(projectRef, { estimatesCount: increment(-1) });

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

import { db } from '../firebase/firebase';
import {
  collection,
  doc,
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
export type EstimateItemType = 'section' | 'work' | 'material' | 'expense';
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
  const q = query(
    collection(db, estimatesPath),
    where('projectId', '==', projectId)
  );

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

  if (nextStatus === 'rejected' || nextStatus === 'draft' || nextStatus === 'sent' || nextStatus === 'cancelled') {
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

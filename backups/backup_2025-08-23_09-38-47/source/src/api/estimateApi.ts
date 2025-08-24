import { db } from '../firebase/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
  increment,
  orderBy,
  getDoc,
  setDoc
} from 'firebase/firestore';

/**
 * Типы элементов в эстимейте
 */
export type EstimateItemType = 'section' | 'work' | 'material' | 'expense';

/**
 * Методология оценки
 */
export type EstimationMethod = 'single' | 'pert' | 'parametric';

/**
 * Статус эстимейта
 */
export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'archived';

/**
 * PERT оценка (по трем точкам)
 */
export interface PertEstimate {
  optimistic: number;      // Оптимистичная оценка
  mostLikely: number;      // Наиболее вероятная
  pessimistic: number;     // Пессимистичная
  calculated?: number;     // Рассчитанная: (O + 4M + P) / 6
}

/**
 * Элемент эстимейта (иерархическая структура)
 */
export interface EstimateItem {
  id: string;
  type: EstimateItemType;
  parentId?: string;       // ID родительского элемента (для иерархии)
  level: number;           // Уровень вложенности (0 = корень)
  order: number;           // Порядок отображения
  
  // Общие поля
  name: string;
  description?: string;
  
  // Для работ (work)
  quantity?: number;
  unit?: string;
  rate?: number;           // Ставка за единицу
  hours?: number;          // Часы (для single estimation)
  pertEstimate?: PertEstimate; // PERT оценка
  estimationMethod?: EstimationMethod;
  assignee?: string;       // Исполнитель/роль
  roleRate?: number;       // Ставка роли (если отличается от общей)
  
  // Для материалов (material)
  materialCost?: number;   // Стоимость за единицу
  materialQuantity?: number;
  materialUnit?: string;
  supplier?: string;
  
  // Для расходов (expense)
  expenseAmount?: number;  // Фиксированная сумма
  expenseType?: string;    // Тип расхода
  
  // Для секций (section) - группировка элементов
  isCollapsed?: boolean;   // Свернута ли секция в UI
  sectionTotal?: number;   // Итого по секции
  
  // Финансовые расчеты
  subtotal?: number;       // Подитог (до налогов и скидок)
  tax?: number;            // Налог в процентах
  taxAmount?: number;      // Сумма налога
  discount?: number;       // Скидка
  discountType?: 'percent' | 'fixed';
  discountAmount?: number; // Сумма скидки
  total: number;           // Итого по элементу
  
  // Дополнительно
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>; // Пользовательские поля
  
  // Поля для шаринга
  shareToken?: string;
  shareExpiresAt?: any;
}

/**
 * Версия эстимейта
 */
export interface EstimateVersion {
  id: string;
  versionNumber: string;   // "1.0", "1.1", "2.0"
  createdAt: any;
  createdBy: string;
  changeLog?: string;      // Описание изменений
  snapshot: Estimate;      // Полная копия эстимейта
  isDiff?: boolean;        // Является ли версией для сравнения
}

/**
 * Настройки шаринга
 */
export interface ShareSettings {
  isPublic: boolean;
  allowComments: boolean;
  requireAuth: boolean;
  expiresAt?: any;
  password?: string;       // Опциональный пароль для доступа
}

/**
 * Основной эстимейт
 */
export interface Estimate {
  id: string;
  
  // Связи
  projectId: string;
  projectName?: string;
  contractorId?: string;
  contractorName?: string;
  
  // Основная информация
  number: string;          // Номер эстимейта
  name: string;
  description?: string;
  status: EstimateStatus;
  
  // Версионирование
  version: string;         // Текущая версия
  versions?: EstimateVersion[];
  baseTemplateId?: string; // ID шаблона (если создан из шаблона)
  
  // Структура эстимейта
  items: EstimateItem[];
  
  // Настройки ценообразования
  currency: string;        // Валюта (RUB, USD, EUR)
  defaultRate?: number;    // Ставка по умолчанию
  exchangeRate?: number;   // Курс обмена к базовой валюте
  roundingPrecision?: number; // Точность округления (знаков после запятой)
  
  // Налоги и скидки (глобальные)
  taxRate?: number;        // Общий налог в %
  taxAmount?: number;      // Сумма налога
  discountRate?: number;   // Общая скидка в %
  discountAmount?: number; // Сумма скидки
  discountType?: 'percent' | 'fixed';
  
  // Итоговые расчеты
  subtotal: number;        // Сумма без налогов и скидок
  total: number;           // Итоговая сумма
  
  // PERT расчеты (если используется)
  pertOptimistic?: number;
  pertMostLikely?: number;
  pertPessimistic?: number;
  pertCalculated?: number;
  
  // Дополнительная информация
  validUntil?: string;     // Срок действия предложения
  paymentTerms?: string;   // Условия оплаты
  deliveryTerms?: string;  // Условия поставки
  warranty?: string;       // Гарантийные обязательства
  notes?: string;          // Примечания
  internalNotes?: string;  // Внутренние заметки (не для клиента)
  
  // Метаданные
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
  approvedAt?: any;
  approvedBy?: string;
  
  // Шаринг
  shareToken?: string;     // Токен для публичной ссылки
  shareSettings?: ShareSettings;
  
  // Статистика
  viewCount?: number;      // Количество просмотров
  lastViewedAt?: any;      // Последний просмотр
  commentCount?: number;   // Количество комментариев
}

/**
 * Шаблон эстимейта
 */
export interface EstimateTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;       // Категория шаблона
  icon?: string;           // Иконка для UI
  items: EstimateItem[];   // Структура шаблона
  defaultSettings?: {      // Настройки по умолчанию
    currency?: string;
    taxRate?: number;
    paymentTerms?: string;
    validityDays?: number;
  };
  tags?: string[];
  isPublic?: boolean;      // Публичный шаблон
  usageCount?: number;     // Счетчик использования
  rating?: number;         // Рейтинг шаблона
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

/**
 * Комментарий к эстимейту
 */
export interface EstimateComment {
  id: string;
  estimateId: string;
  itemId?: string;        // К какому элементу относится
  text: string;
  authorId: string;
  authorName: string;
  createdAt: any;
  isResolved?: boolean;
  replies?: EstimateComment[];
}

// ============= ФУНКЦИИ API =============

/**
 * Рассчитать PERT оценку
 */
export const calculatePert = (pert: PertEstimate): number => {
  return (pert.optimistic + 4 * pert.mostLikely + pert.pessimistic) / 6;
};

/**
 * Рассчитать итоги по элементу
 */
export const calculateItemTotal = (item: EstimateItem, defaultRate?: number): number => {
  let subtotal = 0;
  
  switch (item.type) {
    case 'work':
      const rate = item.roleRate || item.rate || defaultRate || 0;
      if (item.estimationMethod === 'pert' && item.pertEstimate) {
        const hours = calculatePert(item.pertEstimate);
        subtotal = hours * rate * (item.quantity || 1);
      } else {
        subtotal = (item.hours || 0) * rate * (item.quantity || 1);
      }
      break;
      
    case 'material':
      subtotal = (item.materialCost || 0) * (item.materialQuantity || 0);
      break;
      
    case 'expense':
      subtotal = item.expenseAmount || 0;
      break;
      
    case 'section':
      // Сумма подэлементов рассчитывается отдельно
      subtotal = item.sectionTotal || 0;
      break;
  }
  
  // Применяем скидку
  let total = subtotal;
  if (item.discount) {
    if (item.discountType === 'percent') {
      total -= (subtotal * item.discount / 100);
    } else {
      total -= item.discount;
    }
  }
  
  // Применяем налог
  if (item.tax) {
    total += (total * item.tax / 100);
  }
  
  return total;
};

/**
 * Рассчитать итоги по эстимейту
 */
export const calculateEstimateTotal = (estimate: Estimate): number => {
  // Суммируем все элементы верхнего уровня
  const subtotal = estimate.items
    .filter(item => !item.parentId)
    .reduce((sum, item) => sum + item.total, 0);
  
  let total = subtotal;
  
  // Применяем глобальную скидку
  if (estimate.discountRate) {
    if (estimate.discountType === 'percent') {
      total -= (subtotal * estimate.discountRate / 100);
    } else {
      total -= estimate.discountRate;
    }
  }
  
  // Применяем глобальный налог
  if (estimate.taxRate) {
    total += (total * estimate.taxRate / 100);
  }
  
  return total;
};

/**
 * Получить поток эстимейтов для проекта
 */
export const getEstimatesStream = (
  userId: string,
  projectId: string,
  callback: (estimates: Estimate[]) => void
) => {
  const estimatesPath = `users/${userId}/estimates`;
  const q = query(
    collection(db, estimatesPath),
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const estimates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Estimate));
    callback(estimates);
  });
};

/**
 * Получить один эстимейт
 */
export const getEstimateStream = (
  userId: string,
  estimateId: string,
  callback: (estimate: Estimate | null) => void
) => {
  const estimatePath = `users/${userId}/estimates/${estimateId}`;
  
  return onSnapshot(doc(db, estimatePath), (snapshot) => {
    if (snapshot.exists()) {
      callback({
        id: snapshot.id,
        ...snapshot.data()
      } as Estimate);
    } else {
      callback(null);
    }
  });
};

/**
 * Создать новый эстимейт
 */
export const addEstimate = async (
  userId: string,
  projectId: string,
  estimate: Omit<Estimate, 'id'>
) => {
  const batch = writeBatch(db);
  
  // Добавляем эстимейт
  const estimatesPath = `users/${userId}/estimates`;
  const estimateRef = doc(collection(db, estimatesPath));
  
  batch.set(estimateRef, {
    ...estimate,
    projectId,
    version: '1.0',
    status: 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  // Увеличиваем счетчик в проекте
  const projectPath = `users/${userId}/projects/${projectId}`;
  const projectRef = doc(db, projectPath);
  batch.update(projectRef, {
    estimatesCount: increment(1)
  });
  
  await batch.commit();
  return estimateRef.id;
};

/**
 * Обновить эстимейт
 */
export const updateEstimate = async (
  userId: string,
  estimateId: string,
  updates: Partial<Estimate>
) => {
  const estimatePath = `users/${userId}/estimates/${estimateId}`;
  await updateDoc(doc(db, estimatePath), {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

/**
 * Создать версию эстимейта
 */
export const createEstimateVersion = async (
  userId: string,
  estimateId: string,
  versionNumber: string,
  changeLog?: string
) => {
  // Получаем текущий эстимейт
  const estimateDoc = await getDoc(doc(db, `users/${userId}/estimates/${estimateId}`));
  if (!estimateDoc.exists()) {
    throw new Error('Estimate not found');
  }
  
  const estimate = estimateDoc.data() as Estimate;
  
  // Создаем версию
  const version: EstimateVersion = {
    id: `v${Date.now()}`,
    versionNumber,
    createdAt: serverTimestamp(),
    createdBy: userId,
    changeLog,
    snapshot: estimate
  };
  
  // Добавляем версию в массив
  const versions = [...(estimate.versions || []), version];
  
  // Обновляем эстимейт
  await updateEstimate(userId, estimateId, {
    version: versionNumber,
    versions
  });
  
  return version;
};

/**
 * Удалить эстимейт
 */
export const deleteEstimate = async (
  userId: string,
  estimateId: string,
  projectId: string
) => {
  const batch = writeBatch(db);
  
  // Удаляем эстимейт
  const estimatePath = `users/${userId}/estimates/${estimateId}`;
  batch.delete(doc(db, estimatePath));
  
  // Уменьшаем счетчик в проекте
  const projectPath = `users/${userId}/projects/${projectId}`;
  const projectRef = doc(db, projectPath);
  batch.update(projectRef, {
    estimatesCount: increment(-1)
  });
  
  await batch.commit();
};

/**
 * Получить шаблоны эстимейтов
 */
export const getEstimateTemplatesStream = (
  userId: string,
  callback: (templates: EstimateTemplate[]) => void
) => {
  const templatesPath = `users/${userId}/estimateTemplates`;
  const q = query(
    collection(db, templatesPath),
    orderBy('usageCount', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const templates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as EstimateTemplate));
    callback(templates);
  });
};

/**
 * Создать шаблон из эстимейта
 */
export const createTemplateFromEstimate = async (
  userId: string,
  estimateId: string,
  templateName: string,
  templateDescription?: string
) => {
  // Получаем эстимейт
  const estimateDoc = await getDoc(doc(db, `users/${userId}/estimates/${estimateId}`));
  if (!estimateDoc.exists()) {
    throw new Error('Estimate not found');
  }
  
  const estimate = estimateDoc.data() as Estimate;
  
  // Создаем шаблон
  const template: Omit<EstimateTemplate, 'id'> = {
    name: templateName,
    description: templateDescription,
    items: estimate.items,
    defaultSettings: {
      currency: estimate.currency,
      taxRate: estimate.taxRate,
      paymentTerms: estimate.paymentTerms
    },
    usageCount: 0,
    createdAt: serverTimestamp(),
    createdBy: userId
  };
  
  const templatesPath = `users/${userId}/estimateTemplates`;
  const docRef = await addDoc(collection(db, templatesPath), template);
  
  return docRef.id;
};

/**
 * Создать публичную ссылку на эстимейт
 */
export const createShareLink = async (
  userId: string,
  estimateId: string,
  settings: ShareSettings
): Promise<string> => {
  const shareToken = Math.random().toString(36).substring(2, 15);

  // Обновляем сам эстимейт
  await updateEstimate(userId, estimateId, {
    shareToken,
    shareSettings: settings,
    // Дублируем срок действия в отдельное поле для совместимости со страницей просмотра
    shareExpiresAt: (settings as any).expiresAt || null
  } as any);

  // Публикуем лёгкую публичную копию (для быстрого доступа без знания userId)
  // Загружаем текущий эстимейт
  const estimateDoc = await getDoc(doc(db, `users/${userId}/estimates/${estimateId}`));
  if (estimateDoc.exists()) {
    const data = estimateDoc.data() as Estimate;
    const publicPayload = {
      id: estimateId,
      number: data.number,
      name: data.name,
      description: data.description || '',
      contractorName: data.contractorName || '',
      createdAt: data.createdAt || serverTimestamp(),
      currency: data.currency,
      items: data.items || [],
      subtotal: data.subtotal || 0,
      total: data.total || 0,
      taxRate: data.taxRate || 0,
      discountRate: data.discountRate || 0,
      shareToken,
      shareExpiresAt: (settings as any).expiresAt || null,
      publishedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'publicEstimates', shareToken), publicPayload);
  }

  // Возвращаем публичный URL
  return `${window.location.origin}/public/estimate/${shareToken}`;
};
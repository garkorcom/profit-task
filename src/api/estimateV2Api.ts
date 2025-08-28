/**
 * API для работы с новой системой смет-конструктора
 */

import { db } from '../firebase/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  increment,
  runTransaction,
  onSnapshot,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';

import {
  Estimate,
  EstimateItem,
  EstimateStatus,
  EstimateTotals,
  BlockKey,
  BlockState,
  CreateEstimateDto,
  UpdateBlockDto,
  EstimateFilters,
  EstimateSortOptions,
  BlockValidationResult,
  EstimateEventPayload,
  CounterpartyBlockData,
  ProjectBlockData,
  CostingBlockData,
  CommunicationBlockData,
  StatusesBlockData,
} from '../types/estimate.types';

import { cleanForFirestore } from '../utils/firebaseUtils';

// ==================== СОЗДАНИЕ И УПРАВЛЕНИЕ СМЕТАМИ ====================

/**
 * Генерация номера сметы
 */
export const generateEstimateNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const counterRef = doc(db, 'counters', 'estimates', year.toString(), 'sequence');
  
  const newNumber = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const currentValue = counterDoc.exists() ? counterDoc.data().value : 0;
    const nextValue = currentValue + 1;
    
    transaction.set(counterRef, { value: nextValue }, { merge: true });
    
    return `EST-${year}-${String(nextValue).padStart(5, '0')}`;
  });
  
  return newNumber;
};

/**
 * Создание новой сметы
 */
export const createEstimate = async (
  userId: string,
  data?: CreateEstimateDto
): Promise<string> => {
  const estimateNumber = await generateEstimateNumber();
  const estimateId = doc(collection(db, 'estimates')).id;
  
  // Инициализация пустых блоков
  const emptyBlocks: BlockState[] = [
    'counterparty',
    'project',
    'services',
    'products',
    'costing',
    'communication',
    'statuses'
  ].map((key) => ({
    key: key as BlockKey,
    status: 'empty',
    dataVersion: 0,
    data: getEmptyBlockData(key as BlockKey),
    updatedAt: new Date().toISOString(),
  }));
  
  // Инициализация пустых итогов
  const emptyTotals: EstimateTotals = {
    materialsCost: 0,
    laborCost: 0,
    equipmentCost: 0,
    subcontractCost: 0,
    overheadPct: 0,
    overheadAmt: 0,
    discountAmt: 0,
    shippingAmt: 0,
    subtotalPrice: 0,
    taxAmt: 0,
    grandTotal: 0,
    grossMarginPct: 0,
  };
  
  const newEstimate: Estimate = {
    id: estimateId,
    number: estimateNumber,
    status: 'draft',
    revision: 1,
    parentEstimateId: null,
    
    projectId: data?.projectId || null,
    counterpartyId: data?.counterpartyId || null,
    
    currency: data?.currency || 'RUB',
    taxProfileId: null,
    
    totals: emptyTotals,
    blocks: emptyBlocks,
    
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    auditLog: [{
      id: doc(collection(db, 'temp')).id,
      timestamp: new Date().toISOString(),
      userId,
      action: 'created',
      details: { number: estimateNumber },
    }],
  };
  
  const estimateRef = doc(db, `users/${userId}/estimates`, estimateId);
  await setDoc(estimateRef, cleanForFirestore(newEstimate));
  
  // Emit event
  await emitEstimateEvent({
    estimateId,
    event: 'estimate.created',
    timestamp: new Date().toISOString(),
    userId,
    data: { number: estimateNumber },
  });
  
  return estimateId;
};

/**
 * Получение сметы по ID
 */
export const getEstimate = async (
  userId: string,
  estimateId: string
): Promise<Estimate | null> => {
  const estimateRef = doc(db, `users/${userId}/estimates`, estimateId);
  const estimateDoc = await getDoc(estimateRef);
  
  if (!estimateDoc.exists()) {
    return null;
  }
  
  return { id: estimateDoc.id, ...estimateDoc.data() } as Estimate;
};

/**
 * Обновление общих полей сметы
 */
export const updateEstimate = async (
  userId: string,
  estimateId: string,
  updates: Partial<Estimate>
): Promise<void> => {
  const estimateRef = doc(db, `users/${userId}/estimates`, estimateId);
  
  const cleanedUpdates = cleanForFirestore({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  
  await updateDoc(estimateRef, cleanedUpdates);
  
  // Add audit log entry
  await addAuditLogEntry(userId, estimateId, {
    action: 'updated',
    details: updates,
  });
};

/**
 * Удаление сметы
 */
export const deleteEstimate = async (
  userId: string,
  estimateId: string
): Promise<void> => {
  const batch = writeBatch(db);
  
  // Delete estimate document
  const estimateRef = doc(db, `users/${userId}/estimates`, estimateId);
  batch.delete(estimateRef);
  
  // Delete all items
  const itemsQuery = query(
    collection(db, `users/${userId}/estimates/${estimateId}/items`)
  );
  const itemsSnapshot = await getDocs(itemsQuery);
  itemsSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  // Delete all communications
  const commsQuery = query(
    collection(db, `users/${userId}/estimates/${estimateId}/communications`)
  );
  const commsSnapshot = await getDocs(commsQuery);
  commsSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
};

// ==================== РАБОТА С БЛОКАМИ ====================

/**
 * Обновление блока сметы
 */
export const updateEstimateBlock = async <T>(
  userId: string,
  estimateId: string,
  blockKey: BlockKey,
  updates: UpdateBlockDto<T>
): Promise<void> => {
  const estimateRef = doc(db, `users/${userId}/estimates`, estimateId);
  const estimateDoc = await getDoc(estimateRef);
  
  if (!estimateDoc.exists()) {
    throw new Error('Estimate not found');
  }
  
  const estimate = estimateDoc.data() as Estimate;
  const blockIndex = estimate.blocks.findIndex(b => b.key === blockKey);
  
  if (blockIndex === -1) {
    throw new Error(`Block ${blockKey} not found`);
  }
  
  const updatedBlock: BlockState = {
    ...estimate.blocks[blockIndex],
    ...updates,
    dataVersion: estimate.blocks[blockIndex].dataVersion + 1,
    lastEditedBy: userId,
    updatedAt: new Date().toISOString(),
  };
  
  const updatedBlocks = [...estimate.blocks];
  updatedBlocks[blockIndex] = updatedBlock;
  
  await updateDoc(estimateRef, {
    blocks: updatedBlocks,
    updatedAt: serverTimestamp(),
  });
  
  // Recalculate totals if needed
  if (['services', 'products', 'costing'].includes(blockKey)) {
    await recalculateEstimateTotals(userId, estimateId);
  }
};

/**
 * Валидация блока
 */
export const validateBlock = async (
  blockKey: BlockKey,
  data: any
): Promise<BlockValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  switch (blockKey) {
    case 'counterparty':
      if (!data.counterpartyId) {
        errors.push('Контрагент не выбран');
      }
      break;
      
    case 'project':
      if (!data.projectId) {
        warnings.push('Проект не выбран');
      }
      break;
      
    case 'services':
      // Validate services items
      break;
      
    case 'products':
      // Validate products items
      break;
      
    case 'costing':
      const costing = data as CostingBlockData;
      if (costing.overheadPct < 0) {
        errors.push('Накладные расходы не могут быть отрицательными');
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

// ==================== РАБОТА С ПОЗИЦИЯМИ ====================

/**
 * Добавление позиции в смету
 */
export const addEstimateItem = async (
  userId: string,
  estimateId: string,
  item: Omit<EstimateItem, 'id' | 'estimateId'>
): Promise<string> => {
  const itemId = doc(collection(db, 'temp')).id;
  
  const newItem: EstimateItem = {
    ...item,
    id: itemId,
    estimateId,
  } as EstimateItem;
  
  const itemRef = doc(db, `users/${userId}/estimates/${estimateId}/items`, itemId);
  await setDoc(itemRef, cleanForFirestore(newItem));
  
  // Update block status
  const blockKey = item.type === 'service' ? 'services' : 'products';
  await updateBlockStatus(userId, estimateId, blockKey, 'in_progress');
  
  // Recalculate totals
  await recalculateEstimateTotals(userId, estimateId);
  
  return itemId;
};

/**
 * Обновление позиции сметы
 */
export const updateEstimateItem = async (
  userId: string,
  estimateId: string,
  itemId: string,
  updates: Partial<EstimateItem>
): Promise<void> => {
  const itemRef = doc(db, `users/${userId}/estimates/${estimateId}/items`, itemId);
  await updateDoc(itemRef, cleanForFirestore(updates));
  
  // Recalculate totals
  await recalculateEstimateTotals(userId, estimateId);
};

/**
 * Удаление позиции сметы
 */
export const deleteEstimateItem = async (
  userId: string,
  estimateId: string,
  itemId: string
): Promise<void> => {
  const itemRef = doc(db, `users/${userId}/estimates/${estimateId}/items`, itemId);
  await deleteDoc(itemRef);
  
  // Check if block should be marked as empty
  const itemsSnapshot = await getDocs(
    collection(db, `users/${userId}/estimates/${estimateId}/items`)
  );
  
  if (itemsSnapshot.empty) {
    await updateBlockStatus(userId, estimateId, 'services', 'empty');
    await updateBlockStatus(userId, estimateId, 'products', 'empty');
  }
  
  // Recalculate totals
  await recalculateEstimateTotals(userId, estimateId);
};

/**
 * Получение всех позиций сметы
 */
export const getEstimateItems = async (
  userId: string,
  estimateId: string
): Promise<EstimateItem[]> => {
  const itemsQuery = query(
    collection(db, `users/${userId}/estimates/${estimateId}/items`),
    orderBy('sortOrder', 'asc')
  );
  
  const snapshot = await getDocs(itemsQuery);
  return snapshot.docs.map(doc => {
    const data = doc.data() || {};
    return { 
      id: doc.id, 
      ...data 
    } as EstimateItem;
  });
};

// ==================== РАСЧЕТ ИТОГОВ ====================

/**
 * Пересчет итогов сметы
 */
export const recalculateEstimateTotals = async (
  userId: string,
  estimateId: string
): Promise<void> => {
  // Get all items
  const items = await getEstimateItems(userId, estimateId);
  
  // Get estimate for costing data
  const estimate = await getEstimate(userId, estimateId);
  if (!estimate) return;
  
  const costingBlock = estimate.blocks.find(b => b.key === 'costing');
  const costingData = costingBlock?.data as CostingBlockData || {};
  
  // Calculate costs by category
  let materialsCost = 0;
  let laborCost = 0;
  let equipmentCost = 0;
  let subcontractCost = 0;
  let subtotalPrice = 0;
  
  items.forEach(item => {
    subtotalPrice += item.lineSubtotal;
    
    if (item.type === 'service') {
      const serviceItem = item as any;
      laborCost += (serviceItem.unitCost || 0) * item.qty;
    } else if (item.type === 'material') {
      const productItem = item as any;
      const wasteFactor = 1 + ((productItem.wastePct || 0) / 100);
      materialsCost += productItem.unitCost * item.qty * wasteFactor;
    } else if (item.type === 'equipment') {
      const productItem = item as any;
      equipmentCost += productItem.unitCost * item.qty;
    }
    
    // Check for subcontract
    const productItem = item as any;
    if (productItem.vendorId && productItem.isSubcontract) {
      subcontractCost += item.lineSubtotal;
    }
  });
  
  // Apply overhead and margins
  const subtotalCost = materialsCost + laborCost + equipmentCost + subcontractCost;
  const overheadAmt = subtotalCost * ((costingData.overheadPct || 0) / 100);
  const preTax = subtotalPrice + (costingData.shippingAmt || 0) - (costingData.discountAmt || 0) + overheadAmt;
  
  // Calculate tax (simplified - should use tax profile)
  const taxRate = 0.20; // 20% НДС
  const taxAmt = preTax * taxRate;
  
  const grandTotal = preTax + taxAmt;
  const grossMarginPct = grandTotal > 0 
    ? ((grandTotal - subtotalCost - overheadAmt) / grandTotal) * 100
    : 0;
  
  // Update totals
  const totals: EstimateTotals = {
    materialsCost,
    laborCost,
    equipmentCost,
    subcontractCost,
    overheadPct: costingData.overheadPct || 0,
    overheadAmt,
    discountAmt: costingData.discountAmt || 0,
    shippingAmt: costingData.shippingAmt || 0,
    subtotalPrice,
    taxAmt,
    grandTotal,
    grossMarginPct,
  };
  
  await updateEstimate(userId, estimateId, { totals });
};

// ==================== СТАТУСЫ И ПЕРЕХОДЫ ====================

/**
 * Изменение статуса сметы
 */
export const changeEstimateStatus = async (
  userId: string,
  estimateId: string,
  newStatus: EstimateStatus
): Promise<void> => {
  const estimate = await getEstimate(userId, estimateId);
  if (!estimate) {
    throw new Error('Estimate not found');
  }
  
  // Validate transition
  const isValidTransition = await validateStatusTransition(
    estimate,
    estimate.status,
    newStatus
  );
  
  if (!isValidTransition) {
    throw new Error(`Invalid status transition from ${estimate.status} to ${newStatus}`);
  }
  
  // Special handling for 'sent' status
  if (newStatus === 'sent') {
    await generatePdfSnapshot(userId, estimateId);
    await generatePublicShareLink(userId, estimateId);
  }
  
  await updateEstimate(userId, estimateId, { status: newStatus });
  
  // Emit event
  await emitEstimateEvent({
    estimateId,
    event: `estimate.${newStatus}` as any,
    timestamp: new Date().toISOString(),
    userId,
  });
};

/**
 * Валидация перехода между статусами
 */
const validateStatusTransition = async (
  estimate: Estimate,
  from: EstimateStatus,
  to: EstimateStatus
): Promise<boolean> => {
  // Define valid transitions
  const validTransitions: Record<EstimateStatus, EstimateStatus[]> = {
    'draft': ['internal_review', 'canceled'],
    'internal_review': ['draft', 'sent', 'canceled'],
    'sent': ['viewed', 'canceled'],
    'viewed': ['negotiation', 'accepted', 'rejected', 'expired'],
    'negotiation': ['accepted', 'rejected', 'canceled'],
    'accepted': ['converted'],
    'rejected': [],
    'expired': [],
    'converted': [],
    'canceled': [],
  };
  
  if (!validTransitions[from].includes(to)) {
    return false;
  }
  
  // Additional validation based on data
  if (to === 'sent') {
    // Check required fields
    if (!estimate.counterpartyId) {
      throw new Error('Контрагент должен быть указан перед отправкой');
    }
    
    const items = await getEstimateItems(
      estimate.createdBy,
      estimate.id
    );
    
    if (items.length === 0) {
      throw new Error('Смета должна содержать хотя бы одну позицию');
    }
  }
  
  return true;
};

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

/**
 * Получение пустых данных для блока
 */
const getEmptyBlockData = (blockKey: BlockKey): any => {
  switch (blockKey) {
    case 'counterparty':
      return {} as CounterpartyBlockData;
    case 'project':
      return {} as ProjectBlockData;
    case 'services':
      return { sections: [], items: [] };
    case 'products':
      return { items: [] };
    case 'costing':
      return {
        laborRates: [],
        overheadPct: 0,
      } as CostingBlockData;
    case 'communication':
      return {
        clientPortalEnabled: false,
        allowLineItemComments: false,
        allowNegotiation: false,
        readReceipts: false,
        signMethod: 'e-sign',
        primaryChannel: 'email',
        messageTemplates: [],
      } as CommunicationBlockData;
    case 'statuses':
      return {
        current: 'draft',
        checklist: [],
        transitions: [],
      } as StatusesBlockData;
    default:
      return {};
  }
};

/**
 * Обновление статуса блока
 */
const updateBlockStatus = async (
  userId: string,
  estimateId: string,
  blockKey: BlockKey,
  status: 'empty' | 'in_progress' | 'complete'
): Promise<void> => {
  await updateEstimateBlock(userId, estimateId, blockKey, { status });
};

/**
 * Добавление записи в журнал аудита
 */
const addAuditLogEntry = async (
  userId: string,
  estimateId: string,
  entry: { action: string; details?: any }
): Promise<void> => {
  const estimate = await getEstimate(userId, estimateId);
  if (!estimate) return;
  
  const newEntry = {
    id: doc(collection(db, 'temp')).id,
    timestamp: new Date().toISOString(),
    userId,
    ...entry,
  };
  
  const auditLog = [...(estimate.auditLog || []), newEntry];
  
  await updateEstimate(userId, estimateId, { auditLog });
};

/**
 * Генерация PDF снимка сметы
 */
const generatePdfSnapshot = async (
  userId: string,
  estimateId: string
): Promise<string> => {
  // This would call a cloud function or external service
  // For now, return a placeholder
  const pdfUrl = `https://storage.googleapis.com/estimates/${estimateId}.pdf`;
  
  await updateEstimate(userId, estimateId, { pdfSnapshotUrl: pdfUrl });
  
  return pdfUrl;
};

/**
 * Генерация публичной ссылки
 */
const generatePublicShareLink = async (
  userId: string,
  estimateId: string
): Promise<string> => {
  const publicId = doc(collection(db, 'temp')).id;
  
  await updateEstimate(userId, estimateId, { 
    publicShareId: publicId,
    publicSettings: {
      allowDownload: true,
      showUnitPrices: true,
      requireLogin: false,
    },
  });
  
  return publicId;
};

/**
 * Отправка события
 */
const emitEstimateEvent = async (
  payload: EstimateEventPayload
): Promise<void> => {
  // This would emit to a pub/sub topic or webhook
  console.log('Estimate event:', payload);
};

// ==================== ЗАПРОСЫ И ФИЛЬТРАЦИЯ ====================

/**
 * Получение списка смет с фильтрами
 */
export const getEstimates = async (
  userId: string,
  filters?: EstimateFilters,
  sortOptions?: EstimateSortOptions
): Promise<Estimate[]> => {
  const constraints: QueryConstraint[] = [];
  
  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    constraints.push(where('status', 'in', filters.status));
  }
  
  if (filters?.projectId) {
    constraints.push(where('projectId', '==', filters.projectId));
  }
  
  if (filters?.counterpartyId) {
    constraints.push(where('counterpartyId', '==', filters.counterpartyId));
  }
  
  if (filters?.minAmount) {
    constraints.push(where('totals.grandTotal', '>=', filters.minAmount));
  }
  
  if (filters?.maxAmount) {
    constraints.push(where('totals.grandTotal', '<=', filters.maxAmount));
  }
  
  // Apply sorting
  const sortField = sortOptions?.field || 'createdAt';
  const sortDirection = sortOptions?.direction || 'desc';
  constraints.push(orderBy(sortField, sortDirection));
  
  // Execute query
  const estimatesQuery = query(
    collection(db, `users/${userId}/estimates`),
    ...constraints
  );
  
  const snapshot = await getDocs(estimatesQuery);
  
  let estimates = snapshot.docs.map(doc => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      ...data,
    } as Estimate;
  });
  
  // Apply search query (client-side)
  if (filters?.searchQuery) {
    const search = filters.searchQuery.toLowerCase();
    estimates = estimates.filter(e => 
      e.number.toLowerCase().includes(search) ||
      e.terms?.toLowerCase().includes(search)
    );
  }
  
  return estimates;
};

/**
 * Подписка на изменения сметы
 */
export const subscribeToEstimate = (
  userId: string,
  estimateId: string,
  callback: (estimate: Estimate | null) => void
): () => void => {
  const estimateRef = doc(db, `users/${userId}/estimates`, estimateId);
  
  const unsubscribe = onSnapshot(estimateRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data() || {};
      callback({ id: doc.id, ...data } as Estimate);
    } else {
      callback(null);
    }
  });
  
  return unsubscribe;
};

/**
 * Подписка на позиции сметы
 */
export const subscribeToEstimateItems = (
  userId: string,
  estimateId: string,
  callback: (items: EstimateItem[]) => void
): () => void => {
  const itemsQuery = query(
    collection(db, `users/${userId}/estimates/${estimateId}/items`),
    orderBy('sortOrder', 'asc')
  );
  
  const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
    const items = snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
      } as EstimateItem;
    });
    
    callback(items);
  });
  
  return unsubscribe;
};

/**
 * API для работы с модулем "Контрагенты"
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
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

import {
  Counterparty,
  CounterpartyStatus,
  CounterpartyRole,
  CounterpartyFilters,
  CreateCounterpartyDto,
  UpdateCounterpartyDto,
  ContactPerson,
  Address,
  ComplianceDocument,
  Interaction,
  CounterpartyKPI,
  STATUS_TRANSITION_RULES,
} from '../types/counterparty.types';

import { cleanForFirestore } from '../utils/firebaseUtils';

// ==================== CRUD ОПЕРАЦИИ ====================

/**
 * Создание нового контрагента
 */
export const createCounterparty = async (
  userId: string,
  data: CreateCounterpartyDto
): Promise<string> => {
  const counterpartyId = doc(collection(db, 'counterparties')).id;
  
  // Генерация контактов и адресов с ID
  const contacts: ContactPerson[] = data.primaryContact ? [{
    ...data.primaryContact,
    id: doc(collection(db, 'temp')).id,
    isPrimary: true,
    isActive: true,
  }] : [];
  
  const addresses: Address[] = data.primaryAddress ? [{
    ...data.primaryAddress,
    id: doc(collection(db, 'temp')).id,
    isPrimary: true,
  }] : [];
  
  const newCounterparty: Counterparty = {
    id: counterpartyId,
    legalName: data.legalName,
    displayName: data.displayName || data.legalName,
    roles: data.roles,
    status: 'new',
    priority: 'medium',
    taxId: data.taxId,
    
    contacts,
    addresses,
    primaryContactId: contacts[0]?.id,
    primaryAddressId: addresses[0]?.id,
    
    financial: {
      paymentTerms: data.financial?.paymentTerms || 'Net30',
      currency: data.financial?.currency || 'USD',
      ...data.financial,
    },
    
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const counterpartyRef = doc(db, `users/${userId}/counterparties`, counterpartyId);
  await setDoc(counterpartyRef, cleanForFirestore(newCounterparty));
  
  // Создаем запись в глобальном индексе для поиска дубликатов
  const indexRef = doc(db, 'counterparties_index', counterpartyId);
  await setDoc(indexRef, {
    userId,
    legalName: newCounterparty.legalName,
    displayName: newCounterparty.displayName,
    taxId: newCounterparty.taxId,
    createdAt: serverTimestamp(),
  });
  
  return counterpartyId;
};

/**
 * Получение контрагента по ID
 */
export const getCounterparty = async (
  userId: string,
  counterpartyId: string
): Promise<Counterparty | null> => {
  const counterpartyRef = doc(db, `users/${userId}/counterparties`, counterpartyId);
  const counterpartyDoc = await getDoc(counterpartyRef);
  
  if (!counterpartyDoc.exists()) {
    return null;
  }
  
  const data = counterpartyDoc.data() as any || {};
  return { 
    id: counterpartyDoc.id, 
    ...data,
    // Ensure financial field exists with defaults
    financial: data.financial || {
      paymentTerms: 'Net30',
      currency: 'USD',
    },
  } as Counterparty;
};

/**
 * Обновление контрагента
 */
export const updateCounterparty = async (
  userId: string,
  counterpartyId: string,
  updates: UpdateCounterpartyDto
): Promise<void> => {
  const counterpartyRef = doc(db, `users/${userId}/counterparties`, counterpartyId);
  
  const cleanedUpdates = cleanForFirestore({
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });
  
  await updateDoc(counterpartyRef, cleanedUpdates);
  
  // Обновляем глобальный индекс если изменились ключевые поля
  if (updates.legalName || updates.displayName || updates.taxId) {
    const indexRef = doc(db, 'counterparties_index', counterpartyId);
    await updateDoc(indexRef, cleanForFirestore({
      ...(updates.legalName && { legalName: updates.legalName }),
      ...(updates.displayName && { displayName: updates.displayName }),
      ...(updates.taxId && { taxId: updates.taxId }),
      updatedAt: serverTimestamp(),
    }));
  }
};

/**
 * Удаление контрагента (архивация)
 */
export const archiveCounterparty = async (
  userId: string,
  counterpartyId: string
): Promise<void> => {
  await updateCounterparty(userId, counterpartyId, {
    status: 'archived',
    archivedAt: new Date().toISOString(),
    archivedBy: userId,
  });
};

// ==================== УПРАВЛЕНИЕ СТАТУСАМИ ====================

/**
 * Изменение статуса контрагента с валидацией
 */
export const changeCounterpartyStatus = async (
  userId: string,
  counterpartyId: string,
  newStatus: CounterpartyStatus
): Promise<void> => {
  const counterparty = await getCounterparty(userId, counterpartyId);
  
  if (!counterparty) {
    throw new Error('Контрагент не найден');
  }
  
  // Проверяем возможность перехода
  const transition = STATUS_TRANSITION_RULES.find(
    rule => rule.from === counterparty.status && rule.to === newStatus
  );
  
  if (!transition) {
    throw new Error(`Переход из статуса ${counterparty.status} в ${newStatus} не разрешен`);
  }
  
  // Валидация требований
  if (newStatus === 'active') {
    if (!counterparty.primaryContactId) {
      throw new Error('Для активации требуется основной контакт');
    }
    
    // Для субподрядчиков проверяем документы
    if (counterparty.roles.includes('subcontractor')) {
      const hasValidDocuments = counterparty.complianceDocuments?.some(
        doc => doc.status === 'valid'
      );
      
      if (!hasValidDocuments) {
        throw new Error('Для активации субподрядчика требуются действующие документы');
      }
    }
  }
  
  await updateCounterparty(userId, counterpartyId, { status: newStatus });
};

// ==================== УПРАВЛЕНИЕ КОНТАКТАМИ ====================

/**
 * Добавление контактного лица
 */
export const addContactPerson = async (
  userId: string,
  counterpartyId: string,
  contact: Omit<ContactPerson, 'id'>
): Promise<string> => {
  const counterparty = await getCounterparty(userId, counterpartyId);
  if (!counterparty) {
    throw new Error('Контрагент не найден');
  }
  
  const contactId = doc(collection(db, 'temp')).id;
  const newContact: ContactPerson = {
    ...contact,
    id: contactId,
  };
  
  const updatedContacts = [...(counterparty.contacts || []), newContact];
  
  // Если это первый контакт или помечен как основной
  const updates: UpdateCounterpartyDto = {
    contacts: updatedContacts,
  };
  
  if (newContact.isPrimary || !counterparty.primaryContactId) {
    // Сбрасываем флаг isPrimary у других контактов
    updates.contacts = updatedContacts.map(c => ({
      ...c,
      isPrimary: c.id === contactId,
    }));
    updates.primaryContactId = contactId;
  }
  
  await updateCounterparty(userId, counterpartyId, updates);
  
  return contactId;
};

/**
 * Обновление контактного лица
 */
export const updateContactPerson = async (
  userId: string,
  counterpartyId: string,
  contactId: string,
  updates: Partial<ContactPerson>
): Promise<void> => {
  const counterparty = await getCounterparty(userId, counterpartyId);
  if (!counterparty) {
    throw new Error('Контрагент не найден');
  }
  
  const updatedContacts = counterparty.contacts?.map(contact => 
    contact.id === contactId
      ? { ...contact, ...updates }
      : contact
  ) || [];
  
  await updateCounterparty(userId, counterpartyId, { contacts: updatedContacts });
};

// ==================== УПРАВЛЕНИЕ ДОКУМЕНТАМИ ====================

/**
 * Добавление документа соответствия
 */
export const addComplianceDocument = async (
  userId: string,
  counterpartyId: string,
  document: Omit<ComplianceDocument, 'id' | 'status'>
): Promise<string> => {
  const counterparty = await getCounterparty(userId, counterpartyId);
  if (!counterparty) {
    throw new Error('Контрагент не найден');
  }
  
  const documentId = doc(collection(db, 'temp')).id;
  
  // Определяем статус документа
  let status: ComplianceDocument['status'] = 'valid';
  if (document.expiryDate) {
    const expiryDate = new Date(document.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      status = 'expired';
    } else if (daysUntilExpiry <= (document.reminderDays || 30)) {
      status = 'expiring_soon';
    }
  }
  
  const newDocument: ComplianceDocument = {
    ...document,
    id: documentId,
    status,
  };
  
  const updatedDocuments = [...(counterparty.complianceDocuments || []), newDocument];
  
  await updateCounterparty(userId, counterpartyId, {
    complianceDocuments: updatedDocuments,
  });
  
  return documentId;
};

/**
 * Проверка истекающих документов
 */
export const checkExpiringDocuments = async (
  userId: string,
  days: number = 30
): Promise<Array<{ counterparty: Counterparty; documents: ComplianceDocument[] }>> => {
  const counterpartiesSnapshot = await getDocs(
    collection(db, `users/${userId}/counterparties`)
  );
  
  const result: Array<{ counterparty: Counterparty; documents: ComplianceDocument[] }> = [];
  const today = new Date();
  
  counterpartiesSnapshot.forEach(doc => {
    const data = doc.data() || {};
    const counterparty = { id: doc.id, ...data } as Counterparty;
    
    const expiringDocs = counterparty.complianceDocuments?.filter(document => {
      if (!document.expiryDate) return false;
      
      const expiryDate = new Date(document.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysUntilExpiry >= 0 && daysUntilExpiry <= days;
    }) || [];
    
    if (expiringDocs.length > 0) {
      result.push({ counterparty, documents: expiringDocs });
    }
  });
  
  return result;
};

// ==================== ВЗАИМОДЕЙСТВИЯ ====================

/**
 * Добавление записи о взаимодействии
 */
export const addInteraction = async (
  userId: string,
  counterpartyId: string,
  interaction: Omit<Interaction, 'id'>
): Promise<string> => {
  const counterparty = await getCounterparty(userId, counterpartyId);
  if (!counterparty) {
    throw new Error('Контрагент не найден');
  }
  
  const interactionId = doc(collection(db, 'temp')).id;
  const newInteraction: Interaction = {
    ...interaction,
    id: interactionId,
    userId,
  };
  
  const updatedInteractions = [...(counterparty.interactions || []), newInteraction];
  
  await updateCounterparty(userId, counterpartyId, {
    interactions: updatedInteractions,
    lastInteractionDate: interaction.date,
  });
  
  return interactionId;
};

// ==================== ПОИСК И ФИЛЬТРАЦИЯ ====================

/**
 * Получение списка контрагентов с фильтрами
 */
export const getCounterparties = async (
  userId: string,
  filters?: CounterpartyFilters
): Promise<Counterparty[]> => {
  let counterpartiesQuery = collection(db, `users/${userId}/counterparties`);
  const constraints: any[] = [];
  
  // Применяем фильтры
  if (filters?.status && filters.status.length > 0) {
    constraints.push(where('status', 'in', filters.status));
  }
  
  if (filters?.priority && filters.priority.length > 0) {
    constraints.push(where('priority', 'in', filters.priority));
  }
  
  if (filters?.assignedTo) {
    constraints.push(where('assignedTo', '==', filters.assignedTo));
  }
  
  // Сортировка по умолчанию
  constraints.push(orderBy('updatedAt', 'desc'));
  
  const finalQuery = query(counterpartiesQuery as any, ...constraints);
  const snapshot = await getDocs(finalQuery);
  
  let counterparties = snapshot.docs.map(doc => {
    const data = doc.data() as any || {};
    return {
      id: doc.id,
      ...data,
      // Ensure financial field exists with defaults
      financial: data.financial || {
        paymentTerms: 'Net30',
        currency: 'USD',
      },
    } as Counterparty;
  });
  
  // Клиентская фильтрация
  if (filters?.roles && filters.roles.length > 0) {
    counterparties = counterparties.filter(c => 
      c.roles.some(role => filters.roles!.includes(role))
    );
  }
  
  if (filters?.hasExpiredDocuments) {
    counterparties = counterparties.filter(c => 
      c.complianceDocuments?.some(d => d.status === 'expired')
    );
  }
  
  if (filters?.hasExpiringDocuments) {
    counterparties = counterparties.filter(c => 
      c.complianceDocuments?.some(d => d.status === 'expiring_soon')
    );
  }
  
  if (filters?.searchQuery) {
    const search = filters.searchQuery.toLowerCase();
    counterparties = counterparties.filter(c => 
      c.legalName.toLowerCase().includes(search) ||
      c.displayName.toLowerCase().includes(search) ||
      c.taxId?.toLowerCase().includes(search)
    );
  }
  
  return counterparties;
};

/**
 * Проверка дубликатов
 */
export const checkDuplicates = async (
  legalName?: string,
  taxId?: string
): Promise<Array<{ userId: string; counterpartyId: string; legalName: string; taxId?: string }>> => {
  const duplicates: Array<{ userId: string; counterpartyId: string; legalName: string; taxId?: string }> = [];
  
  if (taxId) {
    // Поиск по ИНН в глобальном индексе
    const taxIdQuery = query(
      collection(db, 'counterparties_index'),
      where('taxId', '==', taxId)
    );
    const taxIdSnapshot = await getDocs(taxIdQuery);
    
    taxIdSnapshot.forEach(doc => {
      duplicates.push({
        counterpartyId: doc.id,
        userId: doc.data().userId,
        legalName: doc.data().legalName,
        taxId: doc.data().taxId,
      });
    });
  }
  
  if (legalName && duplicates.length === 0) {
    // Поиск по названию если не нашли по ИНН
    const nameQuery = query(
      collection(db, 'counterparties_index'),
      where('legalName', '==', legalName)
    );
    const nameSnapshot = await getDocs(nameQuery);
    
    nameSnapshot.forEach(doc => {
      duplicates.push({
        counterpartyId: doc.id,
        userId: doc.data().userId,
        legalName: doc.data().legalName,
        taxId: doc.data().taxId,
      });
    });
  }
  
  return duplicates;
};

// ==================== ПОДПИСКИ ====================

/**
 * Подписка на изменения контрагента
 */
export const subscribeToCounterparty = (
  userId: string,
  counterpartyId: string,
  callback: (counterparty: Counterparty | null) => void
): () => void => {
  const counterpartyRef = doc(db, `users/${userId}/counterparties`, counterpartyId);
  
  const unsubscribe = onSnapshot(counterpartyRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data() as any || {};
      callback({ 
        id: doc.id, 
        ...data,
        // Ensure financial field exists with defaults
        financial: data.financial || {
          paymentTerms: 'Net30',
          currency: 'USD',
        },
      } as Counterparty);
    } else {
      callback(null);
    }
  });
  
  return unsubscribe;
};

/**
 * Подписка на список контрагентов
 */
export const subscribeToCounterparties = (
  userId: string,
  callback: (counterparties: Counterparty[]) => void,
  filters?: CounterpartyFilters
): () => void => {
  let counterpartiesQuery = collection(db, `users/${userId}/counterparties`);
  const constraints: any[] = [];
  
  if (filters?.status && filters.status.length > 0) {
    constraints.push(where('status', 'in', filters.status));
  }
  
  constraints.push(orderBy('updatedAt', 'desc'));
  
  const finalQuery = query(counterpartiesQuery as any, ...constraints);
  
  const unsubscribe = onSnapshot(finalQuery, (snapshot) => {
    let counterparties = snapshot.docs.map(doc => {
      const data = doc.data() as any || {};
      return {
        id: doc.id,
        ...data,
        // Ensure financial field exists with defaults
        financial: data.financial || {
          paymentTerms: 'Net30',
          currency: 'USD',
        },
      } as Counterparty;
    });
    
    // Применяем клиентскую фильтрацию
    if (filters?.roles && filters.roles.length > 0) {
      counterparties = counterparties.filter(c => 
        c.roles.some(role => filters.roles!.includes(role))
      );
    }
    
    callback(counterparties);
  });
  
  return unsubscribe;
};

// ==================== KPI И ОТЧЕТНОСТЬ ====================

/**
 * Получение KPI контрагентов
 */
export const getCounterpartyKPI = async (userId: string): Promise<CounterpartyKPI> => {
  const counterparties = await getCounterparties(userId);
  
  const kpi: CounterpartyKPI = {
    totalCount: counterparties.length,
    byStatus: {} as Record<CounterpartyStatus, number>,
    byRole: {} as Record<CounterpartyRole, number>,
    withCompleteDocuments: 0,
    withExpiringDocuments: 0,
    withExpiredDocuments: 0,
    averageInteractionFrequency: 0,
  };
  
  // Подсчет по статусам
  counterparties.forEach(c => {
    kpi.byStatus[c.status] = (kpi.byStatus[c.status] || 0) + 1;
    
    // Подсчет по ролям
    c.roles.forEach(role => {
      kpi.byRole[role] = (kpi.byRole[role] || 0) + 1;
    });
    
    // Подсчет документов
    const hasExpired = c.complianceDocuments?.some(d => d.status === 'expired');
    const hasExpiring = c.complianceDocuments?.some(d => d.status === 'expiring_soon');
    const allValid = c.complianceDocuments?.every(d => d.status === 'valid');
    
    if (hasExpired) kpi.withExpiredDocuments++;
    if (hasExpiring) kpi.withExpiringDocuments++;
    if (allValid && c.complianceDocuments && c.complianceDocuments.length > 0) {
      kpi.withCompleteDocuments++;
    }
  });
  
  return kpi;
};

/**
 * Утилита для поиска и удаления дубликатов контрагентов
 */

import { 
  collection, 
  getDocs, 
  getDoc,
  deleteDoc,
  doc,
  writeBatch,
  query,
  where,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

interface DuplicateGroup {
  key: string; // Ключ для группировки (ИНН или название)
  counterparties: Array<{
    id: string;
    legalName: string;
    displayName?: string;
    taxId?: string;
    createdAt: any;
    status?: string;
  }>;
}

interface CleanupResult {
  found: number;
  deleted: number;
  errors: string[];
  duplicateGroups: DuplicateGroup[];
}

/**
 * Поиск дубликатов контрагентов
 */
export const findDuplicateCounterparties = async (
  userId: string
): Promise<DuplicateGroup[]> => {
  const duplicateGroups: DuplicateGroup[] = [];
  const groupsByTaxId = new Map<string, DuplicateGroup>();
  const groupsByName = new Map<string, DuplicateGroup>();
  
  try {
    // Получаем всех контрагентов пользователя
    const counterpartiesRef = collection(db, `users/${userId}/counterparties`);
    const snapshot = await getDocs(counterpartiesRef);
    
    console.log(`Найдено ${snapshot.size} контрагентов для анализа`);
    
    // Группируем по ИНН и названию
    snapshot.forEach(doc => {
      const data = doc.data();
      const counterparty = {
        id: doc.id,
        legalName: data.legalName || '',
        displayName: data.displayName,
        taxId: data.taxId,
        createdAt: data.createdAt,
        status: data.status,
      };
      
      // Группировка по ИНН
      if (data.taxId && data.taxId.trim() !== '') {
        const taxId = data.taxId.trim();
        if (!groupsByTaxId.has(taxId)) {
          groupsByTaxId.set(taxId, {
            key: `ИНН: ${taxId}`,
            counterparties: []
          });
        }
        groupsByTaxId.get(taxId)!.counterparties.push(counterparty);
      }
      
      // Группировка по названию (если нет ИНН)
      else if (data.legalName && data.legalName.trim() !== '') {
        const name = data.legalName.trim().toLowerCase();
        if (!groupsByName.has(name)) {
          groupsByName.set(name, {
            key: `Название: ${data.legalName}`,
            counterparties: []
          });
        }
        groupsByName.get(name)!.counterparties.push(counterparty);
      }
    });
    
    // Собираем только группы с дубликатами
    groupsByTaxId.forEach(group => {
      if (group.counterparties.length > 1) {
        duplicateGroups.push(group);
      }
    });
    
    groupsByName.forEach(group => {
      if (group.counterparties.length > 1) {
        duplicateGroups.push(group);
      }
    });
    
    console.log(`Найдено ${duplicateGroups.length} групп дубликатов`);
    
  } catch (error) {
    console.error('Ошибка при поиске дубликатов:', error);
  }
  
  return duplicateGroups;
};

/**
 * Удалить старые дубликаты контрагентов
 * Оставляет самого нового в каждой группе дубликатов
 */
export const deleteOldDuplicateCounterparties = async (
  userId: string,
  keepNewest: boolean = true
): Promise<CleanupResult> => {
  const result: CleanupResult = {
    found: 0,
    deleted: 0,
    errors: [],
    duplicateGroups: []
  };
  
  try {
    // Находим дубликаты
    const duplicateGroups = await findDuplicateCounterparties(userId);
    result.duplicateGroups = duplicateGroups;
    
    if (duplicateGroups.length === 0) {
      console.log('Дубликаты не найдены');
      return result;
    }
    
    // Обрабатываем каждую группу дубликатов
    for (const group of duplicateGroups) {
      result.found += group.counterparties.length - 1; // Минус один, который оставляем
      
      // Сортируем по дате создания
      const sorted = [...group.counterparties].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return keepNewest ? dateB - dateA : dateA - dateB;
      });
      
      // Оставляем первого (самого нового или старого), удаляем остальных
      const toKeep = sorted[0];
      const toDelete = sorted.slice(1);
      
      console.log(`Группа "${group.key}": оставляем ${toKeep.legalName} (${toKeep.id}), удаляем ${toDelete.length} дубликатов`);
      
      // Удаляем дубликаты
      const batch = writeBatch(db);
      let operationCount = 0;
      
      for (const duplicate of toDelete) {
        try {
          const counterpartyRef = doc(db, `users/${userId}/counterparties`, duplicate.id);
          batch.delete(counterpartyRef);
          operationCount++;
          result.deleted++;
          
          // Firestore batch limit
          if (operationCount >= 500) {
            await batch.commit();
            operationCount = 0;
          }
        } catch (error) {
          const errorMsg = `Ошибка при удалении дубликата ${duplicate.id}: ${error}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }
      
      // Коммитим оставшиеся операции
      if (operationCount > 0) {
        await batch.commit();
      }
    }
    
    console.log(`Удалено ${result.deleted} дубликатов из ${result.found} найденных`);
    
  } catch (error) {
    const errorMsg = `Общая ошибка при удалении дубликатов: ${error}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }
  
  return result;
};

/**
 * Объединить дубликаты контрагентов
 * Объединяет информацию из дубликатов в один основной
 */
export const mergeDuplicateCounterparties = async (
  userId: string,
  duplicateIds: string[],
  targetId: string
): Promise<void> => {
  if (!duplicateIds.includes(targetId)) {
    throw new Error('Целевой ID должен быть в списке дубликатов');
  }
  
  try {
    // Получаем все контрагенты
    const counterparties: any[] = [];
    for (const id of duplicateIds) {
      const docRef = doc(db, `users/${userId}/counterparties`, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        counterparties.push({ id, ...docSnap.data() });
      }
    }
    
    // Находим целевого контрагента
    const target = counterparties.find(c => c.id === targetId) as any;
    if (!target) {
      throw new Error('Целевой контрагент не найден');
    }
    
    // Объединяем данные
    const mergedContacts = [...(target.contacts || [])];
    const mergedAddresses = [...(target.addresses || [])];
    const mergedDocuments = [...(target.complianceDocuments || [])];
    
    for (const counterparty of counterparties) {
      if (counterparty.id === targetId) continue;
      
      // Добавляем уникальные контакты
      if (counterparty.contacts) {
        for (const contact of counterparty.contacts) {
          const exists = mergedContacts.some(c => 
            c.email === contact.email || 
            c.phone === contact.phone
          );
          if (!exists) {
            mergedContacts.push(contact);
          }
        }
      }
      
      // Добавляем уникальные адреса
      if (counterparty.addresses) {
        for (const address of counterparty.addresses) {
          const exists = mergedAddresses.some(a => 
            a.line1 === address.line1 && 
            a.city === address.city
          );
          if (!exists) {
            mergedAddresses.push(address);
          }
        }
      }
      
      // Добавляем документы
      if (counterparty.complianceDocuments) {
        for (const doc of counterparty.complianceDocuments) {
          const exists = mergedDocuments.some(d => 
            d.number === doc.number && 
            d.type === doc.type
          );
          if (!exists) {
            mergedDocuments.push(doc);
          }
        }
      }
    }
    
    // Обновляем целевого контрагента
    const targetRef = doc(db, `users/${userId}/counterparties`, targetId);
    await updateDoc(targetRef, {
      contacts: mergedContacts,
      addresses: mergedAddresses,
      complianceDocuments: mergedDocuments,
      updatedAt: new Date().toISOString(),
    });
    
    // Удаляем дубликаты
    const batch = writeBatch(db);
    for (const id of duplicateIds) {
      if (id === targetId) continue;
      const docRef = doc(db, `users/${userId}/counterparties`, id);
      batch.delete(docRef);
    }
    await batch.commit();
    
    console.log(`Объединено ${duplicateIds.length} контрагентов в один (${targetId})`);
    
  } catch (error) {
    console.error('Ошибка при объединении контрагентов:', error);
    throw error;
  }
};

/**
 * Проверка и предотвращение создания дубликатов
 */
export const preventDuplicateCreation = async (
  userId: string,
  legalName: string,
  taxId?: string
): Promise<{ isDuplicate: boolean; existing?: any }> => {
  try {
    const counterpartiesRef = collection(db, `users/${userId}/counterparties`);
    
    // Проверка по ИНН
    if (taxId && taxId.trim() !== '') {
      const taxIdQuery = query(counterpartiesRef, where('taxId', '==', taxId.trim()));
      const taxIdSnapshot = await getDocs(taxIdQuery);
      
      if (!taxIdSnapshot.empty) {
        const existing = taxIdSnapshot.docs[0];
        return {
          isDuplicate: true,
          existing: { id: existing.id, ...existing.data() }
        };
      }
    }
    
    // Проверка по названию
    if (legalName && legalName.trim() !== '') {
      const nameQuery = query(
        counterpartiesRef, 
        where('legalName', '==', legalName.trim())
      );
      const nameSnapshot = await getDocs(nameQuery);
      
      if (!nameSnapshot.empty) {
        const existing = nameSnapshot.docs[0];
        return {
          isDuplicate: true,
          existing: { id: existing.id, ...existing.data() }
        };
      }
    }
    
    return { isDuplicate: false };
    
  } catch (error) {
    console.error('Ошибка при проверке дубликатов:', error);
    return { isDuplicate: false };
  }
};

/**
 * Утилита для миграции старых contractors в новую систему counterparties
 */

import { 
  collection, 
  getDocs, 
  doc,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Contractor } from '../api/contractorApi';
import { Counterparty, CounterpartyRole } from '../types/counterparty.types';

interface MigrationResult {
  migrated: number;
  skipped: number;
  errors: string[];
  details: Array<{
    contractorName: string;
    counterpartyId?: string;
    status: 'migrated' | 'skipped' | 'error';
    reason?: string;
  }>;
}

/**
 * Конвертирует тип contractor в роли counterparty
 */
const mapContractorTypeToRoles = (type: 'supplier' | 'customer' | 'both'): CounterpartyRole[] => {
  switch (type) {
    case 'supplier':
      return ['vendor'];
    case 'customer':
      return ['customer'];
    case 'both':
      return ['customer', 'vendor'];
    default:
      return ['customer'];
  }
};

/**
 * Мигрирует всех contractors в counterparties
 */
export const migrateContractorsToCounterparties = async (
  userId: string,
  deleteAfterMigration: boolean = false
): Promise<MigrationResult> => {
  const result: MigrationResult = {
    migrated: 0,
    skipped: 0,
    errors: [],
    details: []
  };

  try {
    // Получаем всех contractors
    const contractorsRef = collection(db, `users/${userId}/contractors`);
    const contractorsSnapshot = await getDocs(contractorsRef);
    
    if (contractorsSnapshot.empty) {
      console.log('Нет contractors для миграции');
      return result;
    }

    // Получаем существующих counterparties для проверки дубликатов
    const counterpartiesRef = collection(db, `users/${userId}/counterparties`);
    const counterpartiesSnapshot = await getDocs(counterpartiesRef);
    const existingCounterparties = new Map<string, any>();
    
    counterpartiesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.inn) {
        existingCounterparties.set(data.taxId, data);
      }
      existingCounterparties.set(data.legalName.toLowerCase(), data);
    });

    const batch = writeBatch(db);
    let operationCount = 0;

    for (const contractorDoc of contractorsSnapshot.docs) {
      const contractor = { id: contractorDoc.id, ...contractorDoc.data() } as Contractor;
      
      try {
        // Проверяем на дубликаты
        const isDuplicate = 
          (contractor.inn && existingCounterparties.has(contractor.inn)) ||
          existingCounterparties.has(contractor.name.toLowerCase());

        if (isDuplicate) {
          result.skipped++;
          result.details.push({
            contractorName: contractor.name,
            status: 'skipped',
            reason: 'Уже существует в counterparties'
          });
          continue;
        }

        // Создаем новый counterparty
        const counterpartyId = doc(collection(db, 'temp')).id;
        const newCounterparty: Counterparty = {
          id: counterpartyId,
          legalName: contractor.name,
          displayName: contractor.name,
          roles: mapContractorTypeToRoles(contractor.type),
          status: 'active',
          priority: 'medium',
          taxId: contractor.inn,
          
          // Контакты
          contacts: contractor.contactPerson ? [{
            id: doc(collection(db, 'temp')).id,
            firstName: contractor.contactPerson.split(' ')[0] || contractor.contactPerson,
            lastName: contractor.contactPerson.split(' ')[1] || '',
            role: 'primary' as const,
            phone: contractor.phone,
            email: contractor.email,
            mobile: contractor.whatsappPhone, // Сохраняем WhatsApp в mobile
            notes: contractor.telegramUsername ? `Telegram: ${contractor.telegramUsername}` : undefined,
            isPrimary: true,
            isActive: true,
          }] : [],
          
          // Адреса
          addresses: contractor.address ? [{
            id: doc(collection(db, 'temp')).id,
            type: 'billing',
            line1: contractor.address,
            city: '',
            country: 'RU',
            isPrimary: true,
          }] : [],
          
          // Финансы
          financial: {
            paymentTerms: 'Net30' as const,
            currency: 'USD',
          },
          
          // Метаданные
          createdBy: userId,
          createdAt: contractor.createdAt || new Date().toISOString(),
          updatedAt: contractor.updatedAt || new Date().toISOString(),
          notes: [
            contractor.notes,
            contractor.bankDetails ? 
              `Банковские реквизиты:\n` +
              `${contractor.bankDetails.bankName ? `Банк: ${contractor.bankDetails.bankName}\n` : ''}` +
              `${contractor.bankDetails.accountNumber ? `Счет: ${contractor.bankDetails.accountNumber}\n` : ''}` +
              `${contractor.bankDetails.bik ? `БИК: ${contractor.bankDetails.bik}\n` : ''}` +
              `${contractor.bankDetails.correspondentAccount ? `Корр. счет: ${contractor.bankDetails.correspondentAccount}` : ''}`
              : null
          ].filter(Boolean).join('\n\n'),
        };

        // Устанавливаем primaryContactId и primaryAddressId
        if (newCounterparty.contacts.length > 0) {
          newCounterparty.primaryContactId = newCounterparty.contacts[0].id;
        }
        if (newCounterparty.addresses.length > 0) {
          newCounterparty.primaryAddressId = newCounterparty.addresses[0].id;
        }

        // Добавляем в batch
        const counterpartyRef = doc(db, `users/${userId}/counterparties`, counterpartyId);
        batch.set(counterpartyRef, newCounterparty);
        operationCount++;

        // Удаляем старый contractor если нужно
        if (deleteAfterMigration) {
          const contractorRef = doc(db, `users/${userId}/contractors`, contractor.id);
          batch.delete(contractorRef);
          operationCount++;
        }

        result.migrated++;
        result.details.push({
          contractorName: contractor.name,
          counterpartyId: counterpartyId,
          status: 'migrated'
        });

        // Firestore batch limit
        if (operationCount >= 400) {
          await batch.commit();
          operationCount = 0;
        }

      } catch (error) {
        const errorMsg = `Ошибка при миграции ${contractor.name}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
        result.details.push({
          contractorName: contractor.name,
          status: 'error',
          reason: String(error)
        });
      }
    }

    // Коммитим оставшиеся операции
    if (operationCount > 0) {
      await batch.commit();
    }

    console.log(`Миграция завершена: ${result.migrated} мигрировано, ${result.skipped} пропущено`);

  } catch (error) {
    const errorMsg = `Общая ошибка при миграции: ${error}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }

  return result;
};

/**
 * Проверяет, есть ли contractors для миграции
 */
export const checkContractorsForMigration = async (
  userId: string
): Promise<{ count: number; names: string[] }> => {
  try {
    const contractorsRef = collection(db, `users/${userId}/contractors`);
    const snapshot = await getDocs(contractorsRef);
    
    const names = snapshot.docs.map(doc => doc.data().name || 'Без имени');
    
    return {
      count: snapshot.size,
      names: names
    };
  } catch (error) {
    console.error('Ошибка при проверке contractors:', error);
    return { count: 0, names: [] };
  }
};

/**
 * Удаляет все старые contractors после успешной миграции
 */
export const deleteAllContractors = async (userId: string): Promise<number> => {
  let deleted = 0;
  
  try {
    const contractorsRef = collection(db, `users/${userId}/contractors`);
    const snapshot = await getDocs(contractorsRef);
    
    const batch = writeBatch(db);
    let operationCount = 0;
    
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      operationCount++;
      deleted++;
      
      if (operationCount >= 500) {
        await batch.commit();
        operationCount = 0;
      }
    }
    
    if (operationCount > 0) {
      await batch.commit();
    }
    
    console.log(`Удалено ${deleted} старых contractors`);
    
  } catch (error) {
    console.error('Ошибка при удалении contractors:', error);
  }
  
  return deleted;
};

/**
 * Утилита для очистки старых смет
 */

import { 
  collection, 
  getDocs, 
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

interface CleanupResult {
  deleted: number;
  errors: string[];
}

/**
 * Удалить все сметы пользователя
 * ВНИМАНИЕ: Это действие необратимо!
 */
export const deleteAllEstimates = async (userId: string): Promise<CleanupResult> => {
  const result: CleanupResult = {
    deleted: 0,
    errors: []
  };

  try {
    // Получаем все сметы пользователя
    const estimatesRef = collection(db, `users/${userId}/estimates`);
    const snapshot = await getDocs(estimatesRef);
    
    console.log(`Найдено ${snapshot.size} смет для удаления`);
    
    // Удаляем партиями по 100 (лимит Firestore)
    const batchSize = 100;
    let batch = writeBatch(db);
    let operationCount = 0;
    
    for (const estimateDoc of snapshot.docs) {
      try {
        const estimateId = estimateDoc.id;
        const estimateData = estimateDoc.data();
        
        console.log(`Удаляем смету ${estimateId}`, estimateData.name || estimateData.number || 'без имени');
        
        // Удаляем подколлекции сметы
        // 1. Удаляем items
        const itemsRef = collection(db, `users/${userId}/estimates/${estimateId}/items`);
        const itemsSnapshot = await getDocs(itemsRef);
        for (const itemDoc of itemsSnapshot.docs) {
          batch.delete(itemDoc.ref);
          operationCount++;
          
          if (operationCount >= batchSize) {
            // Коммитим текущий batch и начинаем новый
            await batch.commit();
            batch = writeBatch(db);
            operationCount = 0;
          }
        }
        
        // 2. Удаляем communications
        const commsRef = collection(db, `users/${userId}/estimates/${estimateId}/communications`);
        const commsSnapshot = await getDocs(commsRef);
        for (const commDoc of commsSnapshot.docs) {
          batch.delete(commDoc.ref);
          operationCount++;
          
          if (operationCount >= batchSize) {
            await batch.commit();
            batch = writeBatch(db);
            operationCount = 0;
          }
        }
        
        // 3. Удаляем саму смету
        batch.delete(estimateDoc.ref);
        operationCount++;
        
        if (operationCount >= batchSize) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
        
        result.deleted++;
      } catch (error) {
        const errorMsg = `Ошибка при удалении сметы ${estimateDoc.id}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }
    
    // Коммитим последний batch если есть операции
    if (operationCount > 0) {
      await batch.commit();
    }
    
    console.log(`Успешно удалено ${result.deleted} смет`);
    if (result.errors.length > 0) {
      console.warn(`Ошибки при удалении:`, result.errors);
    }
    
  } catch (error) {
    const errorMsg = `Общая ошибка при удалении смет: ${error}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }
  
  return result;
};

/**
 * Удалить старые черновики смет (старше 30 дней)
 */
export const deleteOldDraftEstimates = async (
  userId: string, 
  daysOld: number = 30
): Promise<CleanupResult> => {
  const result: CleanupResult = {
    deleted: 0,
    errors: []
  };
  
  try {
    // Получаем все сметы
    const estimatesRef = collection(db, `users/${userId}/estimates`);
    const snapshot = await getDocs(estimatesRef);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const batch = writeBatch(db);
    let operationCount = 0;
    
    for (const estimateDoc of snapshot.docs) {
      const estimateData = estimateDoc.data();
      
      // Проверяем статус и дату
      if (estimateData.status === 'draft' || !estimateData.status) {
        const createdAt = estimateData.createdAt?.toDate?.() || estimateData.createdAt;
        const createdDate = createdAt ? new Date(createdAt) : null;
        
        if (!createdDate || createdDate < cutoffDate) {
          batch.delete(estimateDoc.ref);
          operationCount++;
          result.deleted++;
          
          console.log(`Удаляем старый черновик: ${estimateDoc.id}`);
          
          // Firestore позволяет максимум 500 операций в batch
          if (operationCount >= 500) {
            await batch.commit();
            operationCount = 0;
          }
        }
      }
    }
    
    // Коммитим оставшиеся операции
    if (operationCount > 0) {
      await batch.commit();
    }
    
  } catch (error) {
    const errorMsg = `Ошибка при удалении старых черновиков: ${error}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }
  
  return result;
};

/**
 * Удалить сметы без проекта
 */
export const deleteEstimatesWithoutProject = async (userId: string): Promise<CleanupResult> => {
  const result: CleanupResult = {
    deleted: 0,
    errors: []
  };
  
  try {
    const estimatesRef = collection(db, `users/${userId}/estimates`);
    const snapshot = await getDocs(estimatesRef);
    
    const batch = writeBatch(db);
    let operationCount = 0;
    
    for (const estimateDoc of snapshot.docs) {
      const estimateData = estimateDoc.data();
      
      // Проверяем наличие projectId
      if (!estimateData.projectId || estimateData.projectId === '') {
        batch.delete(estimateDoc.ref);
        operationCount++;
        result.deleted++;
        
        console.log(`Удаляем смету без проекта: ${estimateDoc.id}`);
        
        if (operationCount >= 500) {
          await batch.commit();
          operationCount = 0;
        }
      }
    }
    
    if (operationCount > 0) {
      await batch.commit();
    }
    
  } catch (error) {
    const errorMsg = `Ошибка при удалении смет без проекта: ${error}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
  }
  
  return result;
};

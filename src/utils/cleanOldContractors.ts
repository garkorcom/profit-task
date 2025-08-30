import { db } from '../firebase/firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

/**
 * Утилита для очистки старых контрагентов (contractors)
 * ВНИМАНИЕ: Это действие необратимо! Используйте с осторожностью.
 */

export const cleanOldContractors = async (userId: string) => {
  if (!userId) {
    throw new Error('UserId is required');
  }

  try {
    console.log('🔍 Начинаю поиск старых контрагентов...');
    
    // Получаем все старые контрагенты
    const contractorsRef = collection(db, `users/${userId}/contractors`);
    const snapshot = await getDocs(contractorsRef);
    
    if (snapshot.empty) {
      console.log('✅ Старые контрагенты не найдены');
      return {
        success: true,
        deletedCount: 0,
        message: 'Старые контрагенты не найдены'
      };
    }
    
    const contractorsToDelete = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));
    
    console.log(`⚠️ Найдено ${contractorsToDelete.length} старых контрагентов для удаления:`);
    contractorsToDelete.forEach(contractor => {
      console.log(`  - ${contractor.data.name || 'Без имени'} (ID: ${contractor.id})`);
    });
    
    // Создаем batch для массового удаления
    const batch = writeBatch(db);
    
    contractorsToDelete.forEach(contractor => {
      const docRef = doc(db, `users/${userId}/contractors`, contractor.id);
      batch.delete(docRef);
    });
    
    // Выполняем batch удаление
    await batch.commit();
    
    console.log(`✅ Успешно удалено ${contractorsToDelete.length} старых контрагентов`);
    
    return {
      success: true,
      deletedCount: contractorsToDelete.length,
      deletedContractors: contractorsToDelete.map(c => ({
        id: c.id,
        name: c.data.name
      })),
      message: `Успешно удалено ${contractorsToDelete.length} старых контрагентов`
    };
    
  } catch (error) {
    console.error('❌ Ошибка при удалении старых контрагентов:', error);
    throw error;
  }
};

/**
 * Функция для предварительного просмотра старых контрагентов без удаления
 */
export const previewOldContractors = async (userId: string) => {
  if (!userId) {
    throw new Error('UserId is required');
  }

  try {
    const contractorsRef = collection(db, `users/${userId}/contractors`);
    const snapshot = await getDocs(contractorsRef);
    
    if (snapshot.empty) {
      return {
        count: 0,
        contractors: [],
        message: 'Старые контрагенты не найдены'
      };
    }
    
    const contractors = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      type: doc.data().type,
      email: doc.data().email,
      phone: doc.data().phone
    }));
    
    return {
      count: contractors.length,
      contractors: contractors,
      message: `Найдено ${contractors.length} старых контрагентов`
    };
    
  } catch (error) {
    console.error('Ошибка при просмотре старых контрагентов:', error);
    throw error;
  }
};

// Экспортируем для доступа из консоли браузера
if (typeof window !== 'undefined') {
  (window as any).cleanOldContractors = cleanOldContractors;
  (window as any).previewOldContractors = previewOldContractors;
}

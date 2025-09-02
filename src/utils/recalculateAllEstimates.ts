/**
 * Утилита для пересчета всех существующих смет
 * Исправляет проблему с нулевыми итогами
 */

import { db } from '../firebase/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { EstimateItem, ServiceItem, ProductLine } from '../types/estimate.types';

/**
 * Вычисление полей строки позиции
 */
const calculateLineFields = (item: EstimateItem): Partial<EstimateItem> => {
  const qty = item.qty || 0;
  const taxRate = 0.20; // 20% НДС
  
  let unitPrice = 0;
  
  if (item.type === 'service') {
    const serviceItem = item as ServiceItem;
    unitPrice = serviceItem.rate || 0;
  } else if (item.type === 'material' || item.type === 'equipment') {
    const productItem = item as ProductLine;
    unitPrice = productItem.unitPrice || productItem.unitCost || 0;
  }
  
  const lineSubtotal = unitPrice * qty;
  const lineTax = lineSubtotal * taxRate;
  const lineTotal = lineSubtotal + lineTax;
  
  return {
    lineSubtotal,
    lineTax,
    lineTotal,
  };
};

/**
 * Пересчет всех позиций конкретной сметы
 */
export const recalculateEstimateItems = async (userId: string, estimateId: string): Promise<number> => {
  console.log(`📊 Пересчет позиций сметы ${estimateId}...`);
  
  const itemsRef = collection(db, `users/${userId}/estimates/${estimateId}/items`);
  const itemsSnapshot = await getDocs(itemsRef);
  
  let updatedCount = 0;
  
  for (const itemDoc of itemsSnapshot.docs) {
    const item = itemDoc.data() as EstimateItem;
    
    // Проверяем, нужно ли пересчитывать
    const hasValidFields = 
      typeof item.lineSubtotal === 'number' && 
      typeof item.lineTax === 'number' && 
      typeof item.lineTotal === 'number' &&
      item.lineSubtotal > 0;
    
    if (!hasValidFields) {
      const calculatedFields = calculateLineFields(item);
      
      await updateDoc(doc(db, `users/${userId}/estimates/${estimateId}/items`, item.id), {
        lineSubtotal: calculatedFields.lineSubtotal || 0,
        lineTax: calculatedFields.lineTax || 0,
        lineTotal: calculatedFields.lineTotal || 0,
      });
      
      updatedCount++;
      console.log(`  ✅ Обновлена позиция: ${item.name} (${calculatedFields.lineSubtotal} $)`);
    }
  }
  
  return updatedCount;
};

/**
 * Пересчет всех смет пользователя
 */
export const recalculateAllUserEstimates = async (userId: string): Promise<void> => {
  console.log(`🔄 Начинаем пересчет всех смет пользователя ${userId}...`);
  
  const estimatesRef = collection(db, `users/${userId}/estimates`);
  const estimatesSnapshot = await getDocs(estimatesRef);
  
  let totalUpdated = 0;
  let totalEstimates = 0;
  
  for (const estimateDoc of estimatesSnapshot.docs) {
    const estimateId = estimateDoc.id;
    totalEstimates++;
    
    try {
      const updatedItems = await recalculateEstimateItems(userId, estimateId);
      totalUpdated += updatedItems;
      
      // Импортируем функцию пересчета итогов
      const { recalculateEstimateTotals } = await import('../api/estimateV2Api');
      await recalculateEstimateTotals(userId, estimateId);
      
      if (updatedItems > 0) {
        console.log(`📋 Смета ${estimateId}: обновлено ${updatedItems} позиций`);
      }
    } catch (error) {
      console.error(`❌ Ошибка при пересчете сметы ${estimateId}:`, error);
    }
  }
  
  console.log(`✅ Пересчет завершен! Обработано ${totalEstimates} смет, обновлено ${totalUpdated} позиций`);
};

// Функция для вызова из консоли браузера
(window as any).recalculateAllEstimates = recalculateAllUserEstimates;

console.log('🛠️ Утилита пересчета смет загружена. Используйте: recalculateAllEstimates("userId")');
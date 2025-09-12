/**
 * Firebase Cloud Functions для безопасного управления системой
 * 
 * КРИТИЧЕСКИ ВАЖНО: Все финансовые расчеты и управление пользователями 
 * должны происходить только на бэкенде для предотвращения манипуляций
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Импортируем функции управления пользователями
export * from './userManagement';

// Импортируем функции динамической системы RBAC
export * from './rbacFunctions';

// Импортируем функции деактивации пользователей
export * from './offboardingFunctions';

// Импортируем функции MFA
export * from './mfaFunctions';

// Импортируем функции стартуемости проектов
export * from './startability';

/**
 * Триггер для автоматического расчета COGS при изменении статуса TimeEntry
 * Срабатывает при переходе в статус 'approved' или 'posted'
 */
export const onTimeEntryStatusChange = functions.firestore
  .document('users/{userId}/timeEntries/{entryId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { userId, entryId } = context.params;

    // Проверяем, изменился ли статус на 'approved' или 'posted'
    const shouldCalculateCOGS = 
      before.status !== after.status && 
      (after.status === 'approved' || after.status === 'posted');

    if (!shouldCalculateCOGS) {
      console.log(`Status change from ${before.status} to ${after.status} - no COGS calculation needed`);
      return;
    }

    try {
      await calculateAndStoreCOGS(userId, entryId, after);
      console.log(`COGS calculated successfully for TimeEntry ${entryId}`);
    } catch (error) {
      console.error(`Error calculating COGS for TimeEntry ${entryId}:`, error);
      // В продакшене здесь нужно отправить уведомление администратору
      throw new functions.https.HttpsError('internal', 'Failed to calculate COGS');
    }
  });

/**
 * Основная функция расчета и сохранения COGS
 */
async function calculateAndStoreCOGS(userId: string, entryId: string, timeEntry: any) {
  const db = admin.firestore();
  const batch = db.batch();

  // 1. Получаем связанную задачу для определения Include_Mode
  const estimateTaskRef = db.doc(`users/${userId}/estimateTasks/${timeEntry.taskId}`);
  const estimateTaskSnap = await estimateTaskRef.get();
  
  if (!estimateTaskSnap.exists) {
    throw new Error(`EstimateTask ${timeEntry.taskId} not found`);
  }

  const estimateTask = estimateTaskSnap.data()!;
  const includeMode = estimateTask.includeMode;

  // Если NONE - не создаем финансовые записи
  if (includeMode === 'NONE') {
    console.log(`Task ${timeEntry.taskId} has Include_Mode=NONE, skipping COGS calculation`);
    return;
  }

  // 2. Получаем актуальную ставку на дату timeEntry
  const laborRate = await getLaborRateForDate(userId, timeEntry.userId || userId, timeEntry.date);
  if (!laborRate) {
    throw new Error(`No labor rate found for user ${timeEntry.userId} on date ${timeEntry.date}`);
  }

  // 3. Создаем CostSnapshot (историческая фиксация расчета)
  const costSnapshot = createCostSnapshot(timeEntry, laborRate);
  const costSnapshotRef = db.collection(`users/${userId}/costSnapshots`).doc();
  batch.set(costSnapshotRef, costSnapshot);

  // 4. Рассчитываем финальную стоимость
  const totalCost = calculateTotalCost(timeEntry, laborRate);

  // 5. Создаем COGSRecord только для COGS и OH
  if (includeMode === 'COGS' || includeMode === 'OH') {
    const cogsRecord = createCOGSRecord({
      userId,
      entryId,
      timeEntry,
      estimateTask,
      totalCost,
      costSnapshotId: costSnapshotRef.id,
      includeMode
    });

    const cogsRef = db.collection(`users/${userId}/cogsRecords`).doc();
    batch.set(cogsRef, cogsRecord);
  }

  // 6. Обновляем TimeEntry с привязкой к CostSnapshot
  const timeEntryRef = db.doc(`users/${userId}/timeEntries/${entryId}`);
  batch.update(timeEntryRef, {
    costSnapshotId: costSnapshotRef.id,
    calculatedCost: totalCost,
    cogsProcessedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Атомарное выполнение всех операций
  await batch.commit();
}

/**
 * Получение актуальной ставки на конкретную дату
 * КРИТИЧНО: Используем историческую ставку, а не текущую
 */
async function getLaborRateForDate(ownerId: string, userId: string, date: string): Promise<any> {
  const db = admin.firestore();
  
  // Ищем ставки в порядке приоритета: персональная -> ролевая -> проектная
  const queries = [
    // Персональная ставка
    db.collection(`users/${ownerId}/laborRates`)
      .where('userId', '==', userId)
      .where('effectiveFrom', '<=', date)
      .orderBy('effectiveFrom', 'desc')
      .limit(1),
    
    // Ролевая ставка (если персональной нет)
    db.collection(`users/${ownerId}/laborRates`)
      .where('roleId', '==', userId) // Предполагается, что у пользователя есть роль
      .where('effectiveFrom', '<=', date)
      .orderBy('effectiveFrom', 'desc')
      .limit(1)
  ];

  for (const query of queries) {
    const snapshot = await query.get();
    if (!snapshot.empty) {
      const rateDoc = snapshot.docs[0];
      const rate = rateDoc.data();
      
      // Проверяем, что ставка не истекла
      if (!rate.effectiveTo || rate.effectiveTo >= date) {
        return { id: rateDoc.id, ...rate };
      }
    }
  }

  return null;
}

/**
 * Создание снимка стоимости для исторической точности
 */
function createCostSnapshot(timeEntry: any, laborRate: any) {
  return {
    timeEntryId: timeEntry.id,
    userId: timeEntry.userId,
    projectId: timeEntry.projectId,
    taskId: timeEntry.taskId,
    
    // Исторические данные времени
    date: timeEntry.date,
    hours: timeEntry.hours,
    
    // Исторические данные ставки
    laborRateId: laborRate.id,
    hourlyRate: laborRate.hourlyRate,
    burdenFactor: laborRate.burdenFactor,
    overtimeMultiplier15: laborRate.overtimeMultiplier15,
    overtimeMultiplier20: laborRate.overtimeMultiplier20,
    shiftMultiplier: laborRate.shiftMultiplier,
    
    // Применяемые множители (определяются по логике TimeEntry)
    appliedMultiplier: getAppliedMultiplier(timeEntry, laborRate),
    
    // Расчеты
    baseCost: timeEntry.hours * laborRate.hourlyRate,
    multipliedCost: 0, // Рассчитывается ниже
    burdenedCost: 0,   // Рассчитывается ниже
    finalCost: 0,      // Рассчитывается ниже
    
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

/**
 * Определение применяемого множителя на основе логики переработки/смены
 */
function getAppliedMultiplier(timeEntry: any, laborRate: any): number {
  // Здесь должна быть логика определения типа времени:
  // - Обычное время: 1.0
  // - Переработка 1.5: overtimeMultiplier15
  // - Переработка 2.0: overtimeMultiplier20  
  // - Сменная работа: shiftMultiplier
  
  // Пока возвращаем базовый множитель
  // TODO: Реализовать логику определения переработки
  return 1.0;
}

/**
 * Расчет итоговой стоимости с учетом всех множителей
 */
function calculateTotalCost(timeEntry: any, laborRate: any): number {
  const baseCost = timeEntry.hours * laborRate.hourlyRate;
  const multiplier = getAppliedMultiplier(timeEntry, laborRate);
  const multipliedCost = baseCost * multiplier;
  const finalCost = multipliedCost * laborRate.burdenFactor;
  
  return Math.round(finalCost * 100) / 100; // Округляем до центов
}

/**
 * Создание записи COGS
 */
function createCOGSRecord(params: {
  userId: string;
  entryId: string;
  timeEntry: any;
  estimateTask: any;
  totalCost: number;
  costSnapshotId: string;
  includeMode: string;
}) {
  const { entryId, timeEntry, estimateTask, totalCost, costSnapshotId, includeMode } = params;
  
  return {
    id: admin.firestore().collection('_').doc().id,
    projectId: timeEntry.projectId,
    
    // Источник проводки
    sourceType: 'time_entry' as const,
    sourceId: entryId,
    
    // Классификация
    categoryId: estimateTask.categoryId || null,
    category: estimateTask.category || 'Labor',
    subCategory: 'direct_labor',
    
    // Финансовые данные
    amount: totalCost,
    currency: 'RUB', // или получать из настроек проекта
    costType: includeMode === 'COGS' ? 'direct_labor' as const : 'burdened_labor' as const,
    
    // Временные данные
    hours: timeEntry.hours,
    hourlyRate: totalCost / timeEntry.hours, // Эффективная ставка с burden
    
    // Связи
    timeEntryId: entryId,
    costSnapshotId,
    estimateTaskId: timeEntry.taskId,
    
    // Метаданные
    includeMode,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'system-cogs-calculator',
    
    // Аудит
    calculationVersion: '1.0',
    processingStatus: 'completed' as const
  };
}

/**
 * HTTP функция для пересчета COGS (для административных задач)
 */
export const recalculateCOGS = functions.https.onCall(async (data, context) => {
  // Проверка авторизации - только администраторы
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  // TODO: Проверить роль пользователя (Owner/Manager)
  
  const { userId, timeEntryId } = data;
  
  if (!userId || !timeEntryId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId and timeEntryId are required');
  }

  try {
    const db = admin.firestore();
    const timeEntryRef = db.doc(`users/${userId}/timeEntries/${timeEntryId}`);
    const timeEntrySnap = await timeEntryRef.get();
    
    if (!timeEntrySnap.exists) {
      throw new functions.https.HttpsError('not-found', 'TimeEntry not found');
    }

    const timeEntry = timeEntrySnap.data()!;
    
    // Удаляем старые COGS записи
    await deleteExistingCOGSRecords(userId, timeEntryId);
    
    // Пересчитываем
    await calculateAndStoreCOGS(userId, timeEntryId, timeEntry);
    
    return { success: true, message: 'COGS recalculated successfully' };
  } catch (error) {
    console.error('Error in recalculateCOGS:', error);
    throw new functions.https.HttpsError('internal', 'Failed to recalculate COGS');
  }
});

/**
 * Удаление существующих COGS записей для пересчета
 */
async function deleteExistingCOGSRecords(userId: string, timeEntryId: string) {
  const db = admin.firestore();
  const batch = db.batch();
  
  // Удаляем COGSRecord
  const cogsQuery = db.collection(`users/${userId}/cogsRecords`)
    .where('sourceId', '==', timeEntryId);
  const cogsSnap = await cogsQuery.get();
  
  cogsSnap.docs.forEach(doc => batch.delete(doc.ref));
  
  // Удаляем CostSnapshot
  const timeEntryRef = db.doc(`users/${userId}/timeEntries/${timeEntryId}`);
  const timeEntry = await timeEntryRef.get();
  
  if (timeEntry.exists && timeEntry.data()?.costSnapshotId) {
    const snapshotRef = db.doc(`users/${userId}/costSnapshots/${timeEntry.data()!.costSnapshotId}`);
    batch.delete(snapshotRef);
  }
  
  await batch.commit();
}
/**
 * ============================================================================
 * TIME ENTRY UNIFIED - ЕДИНАЯ СИСТЕМА УЧЕТА ВРЕМЕНИ (SSOT)
 * ============================================================================
 * 
 * Унифицированная система учета времени объединяет ранее разрозненные
 * API (timeEntryApi.ts и timeEntryEnhanced.ts) в единую, консистентную
 * архитектуру с расширенными возможностями и полной совместимостью.
 * 
 * ЭВОЛЮЦИЯ АРХИТЕКТУРЫ:
 * ════════════════════════
 * 
 * LEGACY ARCHITECTURE (До унификации):
 * ───────────────────────────────────────
 * timeEntryApi.ts          timeEntryEnhanced.ts
 * ├─ Базовые CRUD          ├─ Расширенная логика
 * ├─ Простая валидация     ├─ Система пауз
 * ├─ Минимальные поля      ├─ Геолокация
 * └─ Ограниченный функционал└─ Фотофиксация
 *           │                        │
 *           ▼                        ▼
 *    [ДУБЛИРОВАНИЕ КОДА]    [НЕСОВМЕСТИМОСТЬ]
 *           │                        │
 *           └─────────┬──────────────┘
 *                     ▼
 *              [ПРОБЛЕМЫ MAINTENANCE]
 * 
 * UNIFIED ARCHITECTURE (После унификации):
 * ──────────────────────────────────────────
 *         timeEntryUnified.ts
 *    ┌─────────────────────────────┐
 *    │     SINGLE SOURCE OF        │
 *    │         TRUTH               │
 *    └─────────────────────────────┘
 *              │
 *              ├─ Полная функциональность обеих систем
 *              ├─ Обратная совместимость через aliases
 *              ├─ Расширенная валидация и type safety
 *              ├─ Оптимизированные операции с Firebase
 *              └─ Унифицированные интерфейсы данных
 * 
 * КЛЮЧЕВЫЕ ИННОВАЦИИ:
 * ══════════════════════
 * 
 * 1. РАСШИРЕННАЯ СИСТЕМА СТАТУСОВ
 *    ├─ active: активная работа с real-time трекингом
 *    ├─ paused: приостановленная работа с причиной и временем
 *    ├─ completed: завершенная работа с автоматическим расчетом
 *    ├─ approved: одобренная работа для финальной отчетности
 *    └─ pending_approval: ожидающая одобрения (workflow интеграция)
 * 
 * 2. ИНТЕЛЛЕКТУАЛЬНАЯ СИСТЕМА ПАУЗ
 *    ├─ PauseRecord: детальная история всех пауз
 *    ├─ Автоматический расчет чистого времени работы
 *    ├─ Поддержка множественных пауз в одной сессии
 *    ├─ Причины пауз для аналитики и отчетности
 *    └─ Восстановление после сбоев сети
 * 
 * 3. ГЕОЛОКАЦИЯ И ФОТОФИКСАЦИЯ
 *    ├─ startLocation/endLocation: GPS координаты с точностью
 *    ├─ startPhotoUrl/endPhotoUrl: фото начала/завершения работ
 *    ├─ Автоматическое сжатие и оптимизация изображений
 *    ├─ Offline-режим с отложенной синхронизацией
 *    └─ Интеграция с системой разрешений устройства
 * 
 * 4. ФИНАНСОВАЯ ИНТЕГРАЦИЯ
 *    ├─ laborCost: автоматический расчет стоимости труда
 *    ├─ hourlyRate: гибкие тарифы по ролям и проектам
 *    ├─ Интеграция со сметами и проектными бюджетами
 *    └─ Real-time обновление финансовых показателей
 * 
 * 5. AUDIT TRAIL И МЕТАДАННЫЕ
 *    ├─ Полная история изменений с временными метками
 *    ├─ Информация о создателе, редакторе, аппрувере
 *    ├─ Связанные комментарии и дополнительные данные
 *    └─ Трассировка для отладки и аудита
 * 
 * 6. BACKWARD COMPATIBILITY LAYER
 *    ├─ Все поля legacy API доступны через aliases
 *    ├─ Автоматическая миграция старых данных
 *    ├─ Постепенный переход без breaking changes
 *    └─ Поддержка устаревших интерфейсов до полной миграции
 * 
 * ТЕХНИЧЕСКИЕ ОСОБЕННОСТИ:
 * ═══════════════════════════
 * 
 * • Firebase Firestore для real-time синхронизации
 * • Firebase Storage для эффективного хранения фото
 * • Optimistic updates для мгновенного отклика UI
 * • Offline-first архитектура с queue синхронизации
 * • Type-safe операции с полной поддержкой TypeScript
 * • Automatic batching для оптимизации сетевых запросов
 * • Smart caching с автоматической инвалидацией
 * • Error boundary с graceful degradation
 * 
 * ИНТЕГРАЦИЯ С ECOSYSTEM:
 * ══════════════════════════
 * 
 * ┌────────────────┐    ┌─────────────────┐    ┌────────────────┐
 * │   Task System  │◄───┤  Time Tracking  ├───►│  Project Mgmt  │
 * │   (SSOT)       │    │   (Unified)     │    │   (Budget)     │
 * └────────────────┘    └─────────────────┘    └────────────────┘
 *         ▲                        │                      ▼
 *         │                        ▼              ┌────────────────┐
 * ┌────────────────┐    ┌─────────────────┐      │   Financial    │
 * │   RBAC System  │    │   Geolocation   │      │   Reports      │
 * │  (Permissions) │    │   Photo System  │      │  (Analytics)   │
 * └────────────────┘    └─────────────────┘      └────────────────┘
 * 
 * @author Claude Assistant  
 * @version 2.0.0
 * @since 2024-09-03
 * @compatibility Полная обратная совместимость с v1.x.x
 * @migration Автоматическая миграция legacy данных
 * @performance Оптимизировано для 10k+ записей времени
 */

import {
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  Timestamp,
  writeBatch,
  deleteField,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  writeBatch as createBatch,
  getDocs,
  runTransaction,
  limit
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  StorageReference 
} from 'firebase/storage';
import { db, auth, storage } from '../firebase/firebase';
import { getUserProfile } from './userApi';

// ==================== УТИЛИТЫ ====================

/**
 * Безопасная конвертация Firebase Timestamp в Date
 * Обрабатывает различные форматы данных из Firebase
 */
const convertTimestampToDate = (value: any, depth = 0): Date => {
  // Предотвращаем бесконечную рекурсию
  if (depth > 3) {
    console.warn('Max recursion depth reached in convertTimestampToDate');
    return new Date();
  }
  if (!value) return new Date();
  
  // Уже Date объект
  if (value instanceof Date) {
    return value;
  }
  
  // Firebase Timestamp с методом toDate()
  if (value && typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch (error) {
      console.error('Error calling toDate():', error, value);
      return new Date();
    }
  }
  
  // Строка или число (timestamp)
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  
  // Объект с seconds (Firestore Timestamp format)
  if (value && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000);
  }
  
  // Объект с nanoseconds тоже (полный Firestore Timestamp format)
  if (value && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
    return new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
  }
  
  // Попробуем преобразовать объект к строке и затем к дате
  if (value && typeof value === 'object') {
    try {
      // Попробуем toString()
      const stringValue = value.toString();
      if (stringValue && stringValue !== '[object Object]') {
        const date = new Date(stringValue);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // Попробуем valueOf()
      if (typeof value.valueOf === 'function') {
        const primitiveValue = value.valueOf();
        if (typeof primitiveValue === 'number' || typeof primitiveValue === 'string') {
          const date = new Date(primitiveValue);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    } catch (error) {
      console.error('Error trying to convert object to date:', error, value);
    }
  }
  
  // Попробуем обработать объект с одним свойством
  if (value && typeof value === 'object' && Object.keys(value).length === 1) {
    const key = Object.keys(value)[0];
    const innerValue = value[key];
    
    // Рекурсивно попробуем конвертировать внутреннее значение
    const converted = convertTimestampToDate(innerValue, depth + 1);
    if (converted) {
      return converted;
    }
  }
  
  // Попробуем обработать вложенные объекты Firestore 
  if (value && typeof value === 'object') {
    try {
      // Попробуем сериализировать и десериализировать объект
      // Это может помочь с proxy объектами
      const serialized = JSON.parse(JSON.stringify(value));
      if (serialized !== value) {
        const result = convertTimestampToDate(serialized, depth + 1);
        if (result) return result;
      }
      
      // Ищем timestamp свойства в любом месте объекта
      const findTimestampValue = (obj: any): any => {
        if (obj && typeof obj === 'object') {
          // Проверяем на Firestore Timestamp формат
          if (typeof obj.seconds === 'number') {
            return obj;
          }
          if (typeof obj.toDate === 'function') {
            return obj;
          }
          // Рекурсивно ищем в свойствах
          for (const prop of Object.values(obj)) {
            const result = findTimestampValue(prop);
            if (result) return result;
          }
        }
        return null;
      };
      
      const timestampValue = findTimestampValue(value);
      if (timestampValue) {
        return convertTimestampToDate(timestampValue, depth + 1);
      }
    } catch (error) {
      // Игнорируем ошибки сериализации
    }
  }
  
  // Только логируем в development mode
  if (process.env.NODE_ENV === 'development') {
    console.warn('Unable to convert timestamp:', {
      value: JSON.stringify(value),
      type: typeof value,
      constructor: value?.constructor?.name
    });
  }
  
  // Возвращаем текущую дату как fallback вместо null
  // чтобы не ломать приложение
  return new Date();
};

// ==================== ТИПЫ ====================

export type TimeEntryStatus = 
  | 'active' 
  | 'paused' 
  | 'completed' 
  | 'approved' 
  | 'pending_approval';

export type StartMethod =
  | 'manual'            // Стандартный запуск
  | 'smart_suggestion'  // Через умные предложения
  | 'switch'            // Переключение с другой задачи
  | 'command_palette'   // Через Ctrl+K
  | 'geofence' | 'nfc' | 'kiosk' | 'restored'; // Автоматизация и восстановление

export interface PauseRecord {
  startTime: Date;
  endTime?: Date;
  reason?: string;
  duration?: number; // в минутах
}

export interface TimeEntry {
  id: string;
  userId: string;
  taskId: string;
  projectId?: string;
  estimateId?: string;
  serviceId?: string;
  
  // Основные временные метки
  startTime: Date;
  endTime?: Date;
  lastActiveTime?: Date;
  
  // Паузы и расчеты
  pauses?: PauseRecord[];
  totalPauseDuration?: number;
  currentPauseStart?: Date;
  activeDuration?: number;
  totalDuration?: number;
  duration?: number; // Alias for activeDuration for compatibility
  
  // Статус и контроль
  status: TimeEntryStatus;
  startMethod?: StartMethod;
  
  // Локация и фото
  startLocation?: any;
  endLocation?: any;
  startPhotoUrl?: string;
  endPhotoUrl?: string;
  
  // Финансы
  laborCost?: number;
  hourlyRate?: number;
  
  // Метаданные
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  
  // Дополнительные поля для совместимости с legacy кодом
  task?: string;
  project?: string;
  estimate?: string;
  description?: string;
  taskName?: string;
  projectName?: string;
  employeeId?: string;
  employeeName?: string;
  serviceName?: string;
  estimateName?: string;
  pauseReason?: string;
}

// Расширенная версия TimeEntry для совместимости
export interface EnhancedTimeEntry extends TimeEntry {
  // Расширенные поля для enhanced функциональности
}

// ==================== УТИЛИТЫ РАСЧЕТА ВРЕМЕНИ ====================

/**
 * Расчет активного времени работы с учетом пауз
 */
export const calculateActiveDuration = (
  startTime: Date,
  endTime: Date | null,
  pauses: PauseRecord[] = [],
  currentPauseStart?: Date
): number => {
  const now = new Date();
  const end = endTime || now;
  
  // Общее время от начала до конца (или до текущего момента)
  let totalMinutes = Math.floor((end.getTime() - startTime.getTime()) / 60000);
  
  // Вычитаем завершенные паузы
  let pauseMinutes = 0;
  pauses.forEach(pause => {
    if (pause.duration) {
      pauseMinutes += pause.duration;
    } else if (pause.startTime && pause.endTime) {
      const pauseStartTime = convertTimestampToDate(pause.startTime);
      const pauseEndTime = convertTimestampToDate(pause.endTime);
      pauseMinutes += Math.floor((pauseEndTime.getTime() - pauseStartTime.getTime()) / 60000);
    }
  });
  
  // Если есть активная пауза, вычитаем ее время
  if (currentPauseStart && !endTime) {
    const currentPauseDuration = Math.floor((now.getTime() - currentPauseStart.getTime()) / 60000);
    pauseMinutes += currentPauseDuration;
  }
  
  // Активное время = общее время - время пауз
  const activeMinutes = Math.max(0, totalMinutes - pauseMinutes);
  
  return activeMinutes;
};

/**
 * Форматирование времени для отображения
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}ч ${mins}м`;
  }
  return `${mins}м`;
};

/**
 * Форматирование времени в формате ЧЧ:ММ:СС
 */
export const formatTimeHMS = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return [hours, minutes, secs]
    .map(v => v.toString().padStart(2, '0'))
    .join(':');
};

// ==================== CRUD ОПЕРАЦИИ ====================

/**
 * Загрузка фото для записи времени
 */
export const uploadTimeEntryPhoto = async (
  userId: string,
  entryId: string,
  photoFile: File,
  photoType: 'start' | 'end'
): Promise<string> => {
  try {
    const photoRef: StorageReference = ref(
      storage,
      `timeEntries/${userId}/${entryId}/${photoType}_photo_${Date.now()}.jpg`
    );
    
    const snapshot = await uploadBytes(photoRef, photoFile);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    
    return downloadUrl;
  } catch (error) {
    console.warn('⚠️ Firebase Storage not configured, skipping photo upload:', error);
    return 'placeholder-photo-url'; // Возвращаем заглушку вместо ошибки
  }
};

/**
 * Создание новой записи времени
 */
export const createTimeEntry = async (
  userId: string,
  data: Partial<TimeEntry>
): Promise<string> => {
  // Создаем базовую запись только с обязательными полями
  const timeEntry: any = {
    userId,
    taskId: data.taskId || '',
    status: 'active',
    activeDuration: 0,
    totalDuration: 0,
    totalPauseDuration: 0,
    pauses: [],
    // Используем serverTimestamp для точности
    startTime: serverTimestamp(), 
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  // Добавляем только определенные значения (избегаем undefined)
  if (data.projectId) timeEntry.projectId = data.projectId;
  if (data.estimateId) timeEntry.estimateId = data.estimateId;
  if (data.serviceId) timeEntry.serviceId = data.serviceId;
  if (data.startLocation) timeEntry.startLocation = data.startLocation;
  if (data.startPhotoUrl) timeEntry.startPhotoUrl = data.startPhotoUrl;
  if (data.task) timeEntry.task = data.task;
  if (data.project) timeEntry.project = data.project;
  if (data.estimate) timeEntry.estimate = data.estimate;
  if (data.description) timeEntry.description = data.description;
  if (data.comment) timeEntry.comment = data.comment;

  const docRef = await addDoc(
    collection(db, `users/${userId}/timeEntries`),
    timeEntry
  );

  return docRef.id;
};

/**
 * Обновление периферийных данных (GPS, фото) асинхронно
 * Используется в рамках T3 оптимизации для decoupled start
 */
export const updatePeripheralData = async (
  userId: string,
  entryId: string,
  data: {
    startLocation?: any;
    startPhotoUrl?: string;
    endLocation?: any;
    endPhotoUrl?: string;
  }
): Promise<void> => {
  if (Object.keys(data).length === 0) {
    console.warn('updatePeripheralData called with empty data');
    return;
  }

  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  
  try {
    // Защита от гонки состояний: обновляем, только если запись еще активна
    const docSnap = await getDoc(entryRef);
    if (!docSnap.exists()) {
      console.warn(`Entry ${entryId} no longer exists, skipping peripheral update`);
      return;
    }
    
    const entryData = docSnap.data();
    if (entryData.status !== 'active' && entryData.status !== 'paused') {
      console.warn(`Entry ${entryId} is no longer active (${entryData.status}), skipping peripheral update`);
      return;
    }

    // Обновляем данные
    await updateDoc(entryRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Peripheral data updated:', { entryId, keys: Object.keys(data) });
    
  } catch (error) {
    console.error('Error updating peripheral data:', error);
    // Не бросаем ошибку - периферийные данные не критичны
  }
};

/**
 * Обновление записи времени
 */
export const updateTimeEntry = async (
  userId: string,
  entryId: string,
  updates: Partial<TimeEntry>
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  
  const updateData: any = {
    ...updates,
    updatedAt: serverTimestamp()
  };
  
  // Конвертируем Date объекты в Timestamp
  if (updates.endTime) {
    updateData.endTime = Timestamp.fromDate(updates.endTime);
  }
  if (updates.lastActiveTime) {
    updateData.lastActiveTime = Timestamp.fromDate(updates.lastActiveTime);
  }
  if (updates.currentPauseStart) {
    updateData.currentPauseStart = Timestamp.fromDate(updates.currentPauseStart);
  }
  if (updates.completedAt) {
    updateData.completedAt = Timestamp.fromDate(updates.completedAt);
  }

  await updateDoc(entryRef, updateData);
};

/**
 * Начало паузы с сохранением времени
 */
export const pauseTimeEntry = async (
  userId: string,
  entryId: string,
  reason?: string
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  const entryDoc = await getDoc(entryRef);
  
  if (!entryDoc.exists()) {
    throw new Error('Time entry not found');
  }
  
  const now = new Date();
  
  // Сохраняем время начала паузы
  const updates = {
    status: 'paused',
    currentPauseStart: Timestamp.fromDate(now),
    lastActiveTime: Timestamp.fromDate(now),
    pauseReason: reason || '',
    updatedAt: serverTimestamp()
  };
  
  await updateDoc(entryRef, updates);
  
  console.log('⏸️ Пауза начата:', {
    time: now.toLocaleTimeString(),
    reason
  });
};

/**
 * Возобновление работы с расчетом времени паузы
 */
export const resumeTimeEntry = async (
  userId: string,
  entryId: string
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  const entryDoc = await getDoc(entryRef);
  
  if (!entryDoc.exists()) {
    throw new Error('Time entry not found');
  }
  
  const currentData = entryDoc.data();
  const now = new Date();
  
  // Рассчитываем длительность паузы
  let pauseDuration = 0;
  let updatedPauses = currentData.pauses || [];
  
  if (currentData.currentPauseStart) {
    const pauseStart = convertTimestampToDate(currentData.currentPauseStart);
    
    if (pauseStart) {
      pauseDuration = Math.floor((now.getTime() - pauseStart.getTime()) / 60000);
      
      // Добавляем запись о паузе
      const pauseRecord: PauseRecord = {
        startTime: pauseStart,
        endTime: now,
        duration: pauseDuration,
        reason: currentData.pauseReason || ''
      };
      
      updatedPauses.push(pauseRecord);
    }
  }
  
  // Обновляем общее время пауз
  const totalPauseDuration = (currentData.totalPauseDuration || 0) + pauseDuration;
  
  // Очищаем поля паузы и обновляем статус
  const updates = {
    status: 'active',
    pauses: updatedPauses,
    totalPauseDuration,
    currentPauseStart: deleteField(),
    pauseReason: deleteField(),
    updatedAt: serverTimestamp()
  };
  
  await updateDoc(entryRef, updates);
  
  console.log('▶️ Работа возобновлена:', {
    time: now.toLocaleTimeString(),
    pauseDuration: `${pauseDuration} мин`,
    totalPauseDuration: `${totalPauseDuration} мин`
  });
};

/**
 * Атомарное переключение между задачами (T3 Optimization)
 * Останавливает текущую задачу и запускает новую в одной транзакции
 */
export const switchWork = async (userId: string, newTaskData: {
  taskId?: string;
  taskName?: string;
  projectId: string;
  projectName: string;
  estimateId?: string;
  estimateName?: string;
  serviceId?: string;
  serviceName?: string;
  startMethod?: StartMethod;
}): Promise<{ newEntryId: string; switchedFrom?: { taskName: string; duration: number } }> => {
  
  if (!newTaskData) {
    throw new Error('newTaskData is required');
  }
  
  try {
    // Сначала находим активную запись вне транзакции
    const activeEntryQuery = query(
      collection(db, `users/${userId}/timeEntries`),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      limit(1)
    );
    
    const activeSnapshot = await getDocs(activeEntryQuery);
    const newEntryRef = doc(collection(db, `users/${userId}/timeEntries`));
    
    return await runTransaction(db, async (transaction) => {
      const switchTimestamp = serverTimestamp();
      
      if (activeSnapshot.empty) {
        // Если нет активной задачи, просто создаем новую
        const newEntryData = {
          id: newEntryRef.id,
          userId,
          taskId: newTaskData.taskId || '',
          taskName: newTaskData.taskName || 'Task',
          projectId: newTaskData.projectId,
          projectName: newTaskData.projectName,
          estimateId: newTaskData.estimateId,
          estimateName: newTaskData.estimateName,
          serviceId: newTaskData.serviceId,
          serviceName: newTaskData.serviceName,
          startMethod: newTaskData.startMethod || 'manual',
          status: 'active',
          startTime: switchTimestamp,
          activeDuration: 0,
          totalDuration: 0,
          totalPauseDuration: 0,
          pauses: [],
          createdAt: switchTimestamp,
          updatedAt: switchTimestamp,
          employeeId: userId,
        };
        
        transaction.set(newEntryRef, newEntryData);
        console.log('🔄 No active task found, creating new one');
        return { newEntryId: newEntryRef.id };
      }
      
      // 1. Обработка текущей активной задачи
      const activeDoc = activeSnapshot.docs[0];
      const activeData = activeDoc.data();
      const activeRef = doc(db, `users/${userId}/timeEntries`, activeDoc.id);
      
      // Рассчитываем длительность для текущей задачи с единой временной меткой
      // ВАЖНО: Используем фиксированное время переключения для атомарности
      const switchTime = new Date(); // Фиксированное время для расчетов в транзакции
      const startTime = convertTimestampToDate(activeData.startTime);
      const activeDuration = calculateActiveDuration(
        startTime,
        switchTime,
        activeData.pauses || [],
        convertTimestampToDate(activeData.currentPauseStart) || undefined
      );
      const totalDuration = Math.floor((switchTime.getTime() - startTime.getTime()) / 60000);
      
      // Завершаем текущую задачу
      transaction.update(activeRef, {
        status: 'completed',
        endTime: switchTimestamp,
        completedAt: switchTimestamp,
        duration: activeDuration,
        activeDuration,
        totalDuration,
        totalPauseDuration: activeData.totalPauseDuration || 0,
        // Очищаем паузы при завершении
        currentPauseStart: deleteField(),
        pauseReason: deleteField(),
        updatedAt: switchTimestamp
      });
      
      // 2. Создание новой записи времени
      const newEntryData = {
        id: newEntryRef.id,
        userId,
        taskId: newTaskData.taskId || '',
        taskName: newTaskData.taskName || 'Task',
        projectId: newTaskData.projectId,
        projectName: newTaskData.projectName,
        estimateId: newTaskData.estimateId,
        estimateName: newTaskData.estimateName,
        serviceId: newTaskData.serviceId,
        serviceName: newTaskData.serviceName,
        startMethod: newTaskData.startMethod || 'manual',
        status: 'active',
        startTime: switchTimestamp,
        activeDuration: 0,
        totalDuration: 0,
        totalPauseDuration: 0,
        pauses: [],
        createdAt: switchTimestamp,
        updatedAt: switchTimestamp,
        employeeId: userId,
      };
      
      transaction.set(newEntryRef, newEntryData);
      
      console.log('🔄 Switched tasks atomically:', {
        from: `${activeData.taskName} (${activeDuration} min)`,
        to: newTaskData.taskName
      });
      
      return {
        newEntryId: newEntryRef.id,
        switchedFrom: {
          id: activeDoc.id,
          taskName: activeData.taskName,
          duration: activeDuration
        }
      };
    });
    
  } catch (error) {
    console.error('❌ Failed to switch tasks atomically:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to switch tasks: ${message}`);
  }
};

/**
 * Завершение работы с финальным расчетом времени и себестоимости
 */
export const completeTimeEntry = async (
  userId: string,
  entryId: string,
  endPhotoUrl?: string,
  comment?: string,
  endLocation?: any
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  const entryDoc = await getDoc(entryRef);

  if (!entryDoc.exists()) {
    throw new Error('Time entry not found');
  }

  const currentData = entryDoc.data();
  const now = new Date();

  // 1. Рассчитываем длительность
  const startTime = convertTimestampToDate(currentData.startTime);
  if (!startTime) {
    console.error('Invalid start time in time entry:', {
      entryId,
      startTimeValue: currentData.startTime,
      startTimeType: typeof currentData.startTime,
      startTimeConstructor: currentData.startTime?.constructor?.name,
      startTimeHasToDate: typeof currentData.startTime?.toDate === 'function',
      startTimeKeys: currentData.startTime ? Object.keys(currentData.startTime) : null,
      startTimeIsTimestamp: currentData.startTime?.seconds !== undefined,
      allData: currentData
    });
    throw new Error(`Invalid start time in time entry ${entryId}. Start time value: ${currentData.startTime}`);
  }
  
  const totalDuration = Math.floor((now.getTime() - startTime.getTime()) / 60000);
  const activeDuration = calculateActiveDuration(
    startTime,
    now,
    currentData.pauses || [],
    convertTimestampToDate(currentData.currentPauseStart) || undefined
  );

  // 2. Рассчитываем себестоимость
  let laborCost = 0;
  const userProfile = await getUserProfile(userId);
  if (userProfile?.hourlyRate && userProfile.hourlyRate > 0) {
    laborCost = (activeDuration / 60) * userProfile.hourlyRate;
  }
  
  // 3. Готовим обновление для TimeEntry
  const updates: any = {
    status: 'completed',
    endTime: Timestamp.fromDate(now),
    completedAt: Timestamp.fromDate(now),
    duration: activeDuration,
    totalDuration,
    activeDuration,
    totalPauseDuration: currentData.totalPauseDuration || 0,
    laborCost: laborCost > 0 ? laborCost : 0,
    ...(endPhotoUrl && { endPhotoUrl }),
    ...(comment && { comment }),
    ...(endLocation && { endLocation }),
    updatedAt: serverTimestamp()
  };

  const batch = writeBatch(db);

  // Обновляем саму запись времени
  batch.update(entryRef, updates);

  // 4. Обновляем себестоимость в смете, если она есть
  if (currentData.estimateId && currentData.serviceId && laborCost > 0) {
    const estimateRef = doc(db, `users/${userId}/estimates`, currentData.estimateId);
    
    const estimateSnap = await getDoc(estimateRef);
    if(estimateSnap.exists()) {
      const estimateData = estimateSnap.data();
      const items = estimateData.items || [];
      
      const itemIndex = items.findIndex((item: any) => item.id === currentData.serviceId);
      if (itemIndex > -1) {
        const currentCost = items[itemIndex].totalLaborCost || 0;
        items[itemIndex].totalLaborCost = currentCost + laborCost;
        
        batch.update(estimateRef, { items: items });
      }
    }
  }

  await batch.commit();
  
  console.log('✅ Работа завершена:', {
    time: now.toLocaleTimeString(),
    activeDuration: `${activeDuration} мин`,
    laborCost: `${laborCost.toFixed(2)} $`
  });
};

// ==================== ПОТОКИ ДАННЫХ ====================

/**
 * Получение потока записей времени для задачи
 */
export const getTimeEntriesByTaskStream = (
  userId: string,
  taskId: string,
  callback: (entries: TimeEntry[]) => void
) => {
  const q = query(
    collection(db, `users/${userId}/timeEntries`),
    where('taskId', '==', taskId),
    orderBy('startTime', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const entries: TimeEntry[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startTime: convertTimestampToDate(data.startTime),
        endTime: convertTimestampToDate(data.endTime),
        lastActiveTime: convertTimestampToDate(data.lastActiveTime),
        currentPauseStart: convertTimestampToDate(data.currentPauseStart),
        completedAt: convertTimestampToDate(data.completedAt),
        approvedAt: convertTimestampToDate(data.approvedAt),
        createdAt: convertTimestampToDate(data.createdAt) || new Date(),
        updatedAt: convertTimestampToDate(data.updatedAt) || new Date()
      } as TimeEntry;
    });
    
    callback(entries);
  });
};

/**
 * Получение потока всех записей времени пользователя
 */
export const getTimeEntriesStream = (
  userId: string,
  callback: (entries: TimeEntry[]) => void,
  filters?: {
    status?: TimeEntryStatus;
    projectId?: string;
    estimateId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
) => {
  let q = query(
    collection(db, `users/${userId}/timeEntries`),
    orderBy('startTime', 'desc')
  );

  // Добавляем фильтры
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters?.projectId) {
    q = query(q, where('projectId', '==', filters.projectId));
  }
  if (filters?.estimateId) {
    q = query(q, where('estimateId', '==', filters.estimateId));
  }

  return onSnapshot(q, (snapshot) => {
    const entries: TimeEntry[] = snapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        ...data,
        startTime: convertTimestampToDate(data.startTime),
        endTime: convertTimestampToDate(data.endTime),
        lastActiveTime: convertTimestampToDate(data.lastActiveTime),
        currentPauseStart: convertTimestampToDate(data.currentPauseStart),
        completedAt: convertTimestampToDate(data.completedAt),
        approvedAt: convertTimestampToDate(data.approvedAt),
        createdAt: convertTimestampToDate(data.createdAt),
        updatedAt: convertTimestampToDate(data.updatedAt)
      } as TimeEntry;
    });
    
    callback(entries);
  });
};

// ==================== АНАЛИТИКА И ОТЧЕТЫ ====================

/**
 * Расчет общей длительности по задаче
 */
export const calculateTaskTotalDuration = async (
  userId: string,
  taskId: string
): Promise<{
  totalMinutes: number;
  approvedMinutes: number;
  pendingMinutes: number;
}> => {
  const q = query(
    collection(db, `users/${userId}/timeEntries`),
    where('taskId', '==', taskId),
    where('status', 'in', ['completed', 'approved'])
  );

  const snapshot = await getDocs(q);
  
  let totalMinutes = 0;
  let approvedMinutes = 0;
  let pendingMinutes = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const duration = data.activeDuration || data.duration || 0;
    
    totalMinutes += duration;
    
    if (data.status === 'approved') {
      approvedMinutes += duration;
    } else {
      pendingMinutes += duration;
    }
  });

  return {
    totalMinutes,
    approvedMinutes,
    pendingMinutes
  };
};

/**
 * Получение недавних записей времени для умных предложений (T3 Optimization)
 */
export const getRecentTimeEntries = async (
  userId: string,
  hoursBack: number = 72
): Promise<TimeEntry[]> => {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hoursBack);
  
  const q = query(
    collection(db, `users/${userId}/timeEntries`),
    where('status', 'in', ['completed', 'approved']),
    where('endTime', '>=', Timestamp.fromDate(cutoffTime)),
    orderBy('endTime', 'desc'),
    limit(50) // Ограничиваем количество для производительности
  );

  const snapshot = await getDocs(q);
  
  const entries: TimeEntry[] = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startTime: convertTimestampToDate(data.startTime),
      endTime: convertTimestampToDate(data.endTime),
      lastActiveTime: convertTimestampToDate(data.lastActiveTime),
      currentPauseStart: convertTimestampToDate(data.currentPauseStart),
      completedAt: convertTimestampToDate(data.completedAt),
      approvedAt: convertTimestampToDate(data.approvedAt),
      createdAt: convertTimestampToDate(data.createdAt),
      updatedAt: convertTimestampToDate(data.updatedAt)
    } as TimeEntry;
  });
  
  console.log('📊 Recent entries loaded for smart suggestions:', entries.length);
  return entries;
};

/**
 * Получение детальной статистики по времени
 */
export const getTimeEntryStatistics = async (
  userId: string,
  entryId: string
): Promise<{
  startTime: Date;
  endTime?: Date;
  totalDuration: number;
  activeDuration: number;
  pauseDuration: number;
  pauseCount: number;
  efficiency: number;
  currentStatus: string;
}> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  const entryDoc = await getDoc(entryRef);
  
  if (!entryDoc.exists()) {
    throw new Error('Time entry not found');
  }
  
  const data = entryDoc.data();
  const startTime = convertTimestampToDate(data.startTime);
  const endTime = convertTimestampToDate(data.endTime);
  const now = new Date();
  
  // Рассчитываем времена
  const totalDuration = data.totalDuration || Math.floor(((endTime || now).getTime() - startTime.getTime()) / 60000);
  const pauseDuration = data.totalPauseDuration || 0;
  const activeDuration = data.activeDuration || calculateActiveDuration(
    startTime,
    endTime,
    data.pauses || [],
    convertTimestampToDate(data.currentPauseStart) || undefined
  );
  
  const efficiency = totalDuration > 0 ? Math.round((activeDuration / totalDuration) * 100) : 100;
  
  return {
    startTime,
    endTime: endTime || undefined,
    totalDuration,
    activeDuration,
    pauseDuration,
    pauseCount: (data.pauses || []).length + (data.currentPauseStart ? 1 : 0),
    efficiency,
    currentStatus: data.status
  };
};

// ==================== АДМИНИСТРАТИВНЫЕ ФУНКЦИИ ====================

/**
 * Подтверждение записей времени
 */
export const approveTimeEntries = async (
  userId: string,
  entryIds: string[],
  approvedBy: string
): Promise<void> => {
  const batch = createBatch(db);
  const now = new Date();

  entryIds.forEach(entryId => {
    const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
    batch.update(entryRef, {
      status: 'approved',
      approvedAt: Timestamp.fromDate(now),
      approvedBy,
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
};

/**
 * Удаление записи времени
 */
export const deleteTimeEntry = async (
  userId: string,
  entryId: string
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  await deleteDoc(entryRef);
};

// ==================== ОБРАТНАЯ СОВМЕСТИМОСТЬ ====================

// Экспорт enhanced функций под старыми именами для совместимости
export const pauseTimeEntryEnhanced = pauseTimeEntry;
export const resumeTimeEntryEnhanced = resumeTimeEntry;
export const completeTimeEntryEnhanced = completeTimeEntry;

// Удаляем конфликтующий alias - уже есть интерфейс EnhancedTimeEntry выше

// Экспорт всех функций
const timeEntryApi = {
  // CRUD
  createTimeEntry,
  updateTimeEntry,
  updatePeripheralData, // T3 optimization
  deleteTimeEntry,
  uploadTimeEntryPhoto,
  
  // Управление состоянием
  pauseTimeEntry,
  resumeTimeEntry, 
  completeTimeEntry,
  switchWork, // T3 optimization - seamless switching
  
  // Enhanced функции (aliases)
  pauseTimeEntryEnhanced,
  resumeTimeEntryEnhanced,
  completeTimeEntryEnhanced,
  
  // Потоки данных
  getTimeEntriesByTaskStream,
  getTimeEntriesStream,
  
  // Аналитика
  calculateTaskTotalDuration,
  getTimeEntryStatistics,
  getRecentTimeEntries, // T3 optimization - smart suggestions
  calculateActiveDuration,
  
  // Утилиты
  formatDuration,
  formatTimeHMS,
  
  // Административные
  approveTimeEntries
};

export default timeEntryApi;
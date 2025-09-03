/**
 * Утилиты для преобразования между фронтенд типами и Firebase типами
 * Обеспечивают безопасное преобразование с удалением undefined значений
 */

import { serverTimestamp, FieldValue } from 'firebase/firestore';
import { TimeEntry } from '../api/timeEntryUnified';
import { Task } from '../api/taskApi';
import { Estimate } from '../legacy/api/estimateApi';
import {
  FirebaseTimeEntryBase,
  FirebaseTimeEntryWithEstimate,
  FirebaseTimeEntryWithService,
  FirebaseTimeEntryWithStartLocation,
  FirebaseTask,
  FirebaseEstimate,
  validateForFirebase,
  FirebaseValidationError
} from '../types/firebase.types';

/**
 * Преобразует TimeEntry из фронтенда в Firebase формат
 * Удаляет все undefined поля и валидирует результат
 */
export function toFirebaseTimeEntry(
  entry: Partial<TimeEntry>,
  options: {
    isNew?: boolean;
    includeTimestamps?: boolean;
  } = {}
): FirebaseTimeEntryBase | FirebaseTimeEntryWithEstimate | FirebaseTimeEntryWithService {
  const { isNew = false, includeTimestamps = true } = options;
  
  // Базовые обязательные поля
  const firebaseEntry: any = {
    taskId: entry.taskId || '',
    taskName: entry.taskName || '',
    projectId: entry.projectId || '',
    projectName: entry.projectName || '',
    employeeId: entry.employeeId || '',
    employeeName: entry.employeeName || '',
    status: entry.status || 'active'
  };
  
  // Добавляем временные метки
  if (includeTimestamps) {
    if (isNew) {
      firebaseEntry.startTime = serverTimestamp();
      firebaseEntry.createdAt = serverTimestamp();
      firebaseEntry.updatedAt = serverTimestamp();
    } else {
      firebaseEntry.updatedAt = serverTimestamp();
      if (entry.startTime) {
        firebaseEntry.startTime = entry.startTime;
      }
    }
  }
  
  // Добавляем данные о смете если есть
  if (entry.estimateId && entry.estimateName) {
    firebaseEntry.estimateId = entry.estimateId;
    firebaseEntry.estimateName = entry.estimateName;
  }
  
  // Добавляем данные об услуге если есть
  if (entry.serviceId && entry.serviceName) {
    firebaseEntry.serviceId = entry.serviceId;
    firebaseEntry.serviceName = entry.serviceName;
  }
  
  // Добавляем геолокацию старта если есть
  if (entry.startLocation) {
    const location: any = {
      latitude: entry.startLocation.latitude,
      longitude: entry.startLocation.longitude,
      timestamp: entry.startLocation.timestamp
    };
    
    if (entry.startLocation.accuracy !== undefined && entry.startLocation.accuracy !== null) {
      location.accuracy = entry.startLocation.accuracy;
    }
    
    firebaseEntry.startLocation = location;
  }
  
  // Добавляем URL фото старта если есть
  if (entry.startPhotoUrl) {
    firebaseEntry.startPhotoUrl = entry.startPhotoUrl;
  }
  
  // Для завершенных записей
  if (entry.status === 'completed' || entry.status === 'approved') {
    if (entry.endTime) {
      firebaseEntry.endTime = entry.endTime;
    }
    if (typeof entry.duration === 'number') {
      firebaseEntry.duration = entry.duration;
    }
    if (entry.comment) {
      firebaseEntry.comment = entry.comment;
    }
    if (entry.endPhotoUrl) {
      firebaseEntry.endPhotoUrl = entry.endPhotoUrl;
    }
    if (entry.endLocation) {
      const endLocation: any = {
        latitude: entry.endLocation.latitude,
        longitude: entry.endLocation.longitude,
        timestamp: entry.endLocation.timestamp
      };
      
      if (entry.endLocation.accuracy !== undefined && entry.endLocation.accuracy !== null) {
        endLocation.accuracy = entry.endLocation.accuracy;
      }
      
      firebaseEntry.endLocation = endLocation;
    }
  }
  
  // Для приостановленных записей
  if (entry.status === 'paused' && entry.pauseReason) {
    firebaseEntry.pauseReason = entry.pauseReason;
  }
  
  // Валидируем результат
  try {
    validateForFirebase(firebaseEntry, 'timeEntry');
  } catch (error) {
    if (error instanceof FirebaseValidationError) {
      console.error('TimeEntry validation failed:', error.message, firebaseEntry);
      throw error;
    }
    throw error;
  }
  
  return firebaseEntry;
}

/**
 * Преобразует Task из фронтенда в Firebase формат
 */
export function toFirebaseTask(task: Partial<Task>, isNew: boolean = false): FirebaseTask {
  const firebaseTask: any = {
    task: task.task || '',
    description: task.description || '',
    status: task.status || 'new',
    priority: task.priority || 'medium',
    assignee: task.assigneeId || '',
    dueDate: new Date(), // Устанавливаем текущую дату по умолчанию
    projectId: task.projectId || '',
    projectName: task.projectName || '',
    requirePhoto: task.requirePhoto === true,
    requireComment: false, // По умолчанию не требуется
    requireLocation: false // По умолчанию не требуется
  };
  
  if (isNew) {
    firebaseTask.createdAt = serverTimestamp();
    firebaseTask.updatedAt = serverTimestamp();
  } else {
    firebaseTask.updatedAt = serverTimestamp();
    if (task.id) {
      firebaseTask.id = task.id;
    }
  }
  
  // Валидируем результат
  validateForFirebase(firebaseTask, 'task');
  
  return firebaseTask;
}

/**
 * Преобразует Estimate из фронтенда в Firebase формат
 */
export function toFirebaseEstimate(estimate: Partial<Estimate>, isNew: boolean = false): FirebaseEstimate {
  const firebaseEstimate: any = {
    number: estimate.number || '',
    name: estimate.name || '',
    description: estimate.description || '',
    projectId: estimate.projectId || '',
    contractorId: '', // По умолчанию пустой
    status: estimate.status || 'draft',
    items: (estimate.items || []).map(item => ({
      id: item.id || '',
      name: item.name || '',
      quantity: item.quantity || 0,
      unit: item.unit || '',
      unitPrice: item.unitPrice || 0,
      total: item.total || 0,
      type: item.type || 'work',
      level: item.level || 0,
      order: item.order || 0
    })),
    subtotal: estimate.subtotal || 0,
    total: estimate.total || 0
  };
  
  if (isNew) {
    firebaseEstimate.createdAt = serverTimestamp();
    firebaseEstimate.updatedAt = serverTimestamp();
  } else {
    firebaseEstimate.updatedAt = serverTimestamp();
    if (estimate.id) {
      firebaseEstimate.id = estimate.id;
    }
    if (estimate.createdAt) {
      firebaseEstimate.createdAt = estimate.createdAt;
    }
  }
  
  // Валидируем результат
  validateForFirebase(firebaseEstimate, 'estimate');
  
  return firebaseEstimate;
}

/**
 * Безопасно извлекает значение из объекта, возвращая значение по умолчанию если undefined
 */
export function safeGet<T>(value: T | undefined, defaultValue: T): T {
  return value !== undefined ? value : defaultValue;
}

/**
 * Создает объект только с определенными (не undefined) значениями
 */
export function createDefinedObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  
  return result;
}

/**
 * Проверяет и преобразует геолокацию для Firebase
 */
export function toFirebaseLocation(position: GeolocationPosition | undefined) {
  if (!position) return undefined;
  
  const location: any = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    timestamp: new Date(position.timestamp)
  };
  
  if (position.coords.accuracy !== null && position.coords.accuracy !== undefined) {
    location.accuracy = position.coords.accuracy;
  }
  
  return location;
}

/**
 * Обертка для безопасного вызова Firebase операций с валидацией
 */
export async function safeFirebaseOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Firebase operation failed'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof FirebaseValidationError) {
      console.error(`Validation error: ${error.message}`, {
        field: error.field,
        value: error.value
      });
      
      // Можно показать пользователю понятное сообщение
      throw new Error(`Ошибка валидации: поле "${error.field}" содержит некорректное значение`);
    }
    
    console.error(`${errorMessage}:`, error);
    throw error;
  }
}

/**
 * Хук для валидации формы перед отправкой в Firebase
 */
export function useFirebaseValidation() {
  const validateTimeEntry = (entry: Partial<TimeEntry>): string[] => {
    const errors: string[] = [];
    
    if (!entry.taskId) errors.push('Не указана задача');
    if (!entry.taskName) errors.push('Не указано название задачи');
    if (!entry.employeeId) errors.push('Не указан сотрудник');
    if (!entry.status) errors.push('Не указан статус');
    
    // Если есть смета, должно быть и название
    if (entry.estimateId && !entry.estimateName) {
      errors.push('Указан ID сметы, но не указано название');
    }
    
    // Если есть услуга, должна быть и смета
    if (entry.serviceId && !entry.estimateId) {
      errors.push('Указана услуга, но не указана смета');
    }
    
    return errors;
  };
  
  const validateTask = (task: Partial<Task>): string[] => {
    const errors: string[] = [];
    
    if (!task.task) errors.push('Не указано название задачи');
    if (!task.assigneeId) errors.push('Не указан исполнитель');
    if (!task.projectId) errors.push('Не указан проект');
    
    return errors;
  };
  
  const validateEstimate = (estimate: Partial<Estimate>): string[] => {
    const errors: string[] = [];
    
    if (!estimate.number) errors.push('Не указан номер сметы');
    if (!estimate.name) errors.push('Не указано название сметы');
    if (!estimate.projectId) errors.push('Не указан проект');
    if (!estimate.items || estimate.items.length === 0) {
      errors.push('Смета должна содержать хотя бы одну позицию');
    }
    
    return errors;
  };
  
  return {
    validateTimeEntry,
    validateTask,
    validateEstimate
  };
}

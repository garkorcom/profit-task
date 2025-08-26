/**
 * Строгие типы для Firebase - без optional полей
 * Firebase не принимает undefined значения, поэтому все поля должны быть обязательными
 * или явно отсутствовать в объекте
 */

import { Timestamp, FieldValue } from 'firebase/firestore';

// ============= TIME ENTRY TYPES =============

/**
 * Базовые поля для TimeEntry в Firebase
 * Все поля обязательные, кроме тех что добавляются условно
 */
export interface FirebaseTimeEntryBase {
  taskId: string;
  taskName: string;
  projectId: string;
  projectName: string;
  employeeId: string;
  employeeName: string;
  status: 'active' | 'paused' | 'completed' | 'approved';
  startTime: FieldValue | Timestamp | Date;
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
}

/**
 * TimeEntry с данными о смете
 */
export interface FirebaseTimeEntryWithEstimate extends FirebaseTimeEntryBase {
  estimateId: string;
  estimateName: string;
}

/**
 * TimeEntry с данными об услуге
 */
export interface FirebaseTimeEntryWithService extends FirebaseTimeEntryWithEstimate {
  serviceId: string;
  serviceName: string;
}

/**
 * TimeEntry с геолокацией старта
 */
export interface FirebaseTimeEntryWithStartLocation extends FirebaseTimeEntryBase {
  startLocation: {
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy?: number; // Optional внутри вложенного объекта допустим
  };
}

/**
 * TimeEntry с фото старта
 */
export interface FirebaseTimeEntryWithStartPhoto extends FirebaseTimeEntryBase {
  startPhotoUrl: string;
}

/**
 * Завершенный TimeEntry
 */
export interface FirebaseCompletedTimeEntry extends FirebaseTimeEntryBase {
  endTime: FieldValue | Timestamp | Date;
  duration: number; // в минутах
  status: 'completed' | 'approved';
}

/**
 * Завершенный TimeEntry с комментарием
 */
export interface FirebaseCompletedTimeEntryWithComment extends FirebaseCompletedTimeEntry {
  comment: string;
}

/**
 * Завершенный TimeEntry с фото окончания
 */
export interface FirebaseCompletedTimeEntryWithEndPhoto extends FirebaseCompletedTimeEntry {
  endPhotoUrl: string;
}

/**
 * Завершенный TimeEntry с геолокацией окончания
 */
export interface FirebaseCompletedTimeEntryWithEndLocation extends FirebaseCompletedTimeEntry {
  endLocation: {
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy?: number;
  };
}

/**
 * Приостановленный TimeEntry
 */
export interface FirebasePausedTimeEntry extends FirebaseTimeEntryBase {
  status: 'paused';
  pauseReason?: string; // Причина паузы может быть optional
}

/**
 * Объединенный тип для всех возможных TimeEntry в Firebase
 */
export type FirebaseTimeEntry = 
  | FirebaseTimeEntryBase
  | FirebaseTimeEntryWithEstimate
  | FirebaseTimeEntryWithService
  | FirebaseTimeEntryWithStartLocation
  | FirebaseTimeEntryWithStartPhoto
  | FirebaseCompletedTimeEntry
  | FirebaseCompletedTimeEntryWithComment
  | FirebaseCompletedTimeEntryWithEndPhoto
  | FirebaseCompletedTimeEntryWithEndLocation
  | FirebasePausedTimeEntry
  | (FirebaseTimeEntryWithEstimate & FirebaseTimeEntryWithStartLocation)
  | (FirebaseTimeEntryWithService & FirebaseTimeEntryWithStartLocation)
  | (FirebaseTimeEntryWithService & FirebaseTimeEntryWithStartLocation & FirebaseTimeEntryWithStartPhoto)
  | (FirebaseCompletedTimeEntry & FirebaseCompletedTimeEntryWithComment & FirebaseCompletedTimeEntryWithEndPhoto & FirebaseCompletedTimeEntryWithEndLocation);

// ============= TASK TYPES =============

export interface FirebaseTask {
  id: string;
  task: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  dueDate: Timestamp | Date;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  projectId: string;
  projectName: string;
  requirePhoto: boolean;
  requireComment: boolean;
  requireLocation: boolean;
}

// ============= ESTIMATE TYPES =============

export interface FirebaseEstimateItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  type: 'section' | 'work' | 'material' | 'expense' | 'service';
  level: number;
  order: number;
}

export interface FirebaseEstimate {
  id: string;
  number: string;
  name: string;
  description: string;
  projectId: string;
  contractorId: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled';
  items: FirebaseEstimateItem[];
  subtotal: number;
  total: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// ============= TYPE GUARDS =============

/**
 * Type guard для проверки, что объект является валидным FirebaseTimeEntryBase
 */
export function isValidFirebaseTimeEntry(obj: any): obj is FirebaseTimeEntryBase {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.taskId === 'string' &&
    typeof obj.taskName === 'string' &&
    typeof obj.projectId === 'string' &&
    typeof obj.projectName === 'string' &&
    typeof obj.employeeId === 'string' &&
    typeof obj.employeeName === 'string' &&
    ['active', 'paused', 'completed', 'approved'].includes(obj.status) &&
    (obj.startTime instanceof Date || 
     obj.startTime instanceof Timestamp || 
     typeof obj.startTime === 'object')
  );
}

/**
 * Type guard для проверки наличия данных о смете
 */
export function hasEstimateData(obj: any): obj is FirebaseTimeEntryWithEstimate {
  return (
    isValidFirebaseTimeEntry(obj) &&
    'estimateId' in obj &&
    'estimateName' in obj &&
    typeof obj.estimateId === 'string' &&
    typeof obj.estimateName === 'string'
  );
}

/**
 * Type guard для проверки наличия данных об услуге
 */
export function hasServiceData(obj: any): obj is FirebaseTimeEntryWithService {
  return (
    hasEstimateData(obj) &&
    'serviceId' in obj &&
    'serviceName' in obj &&
    typeof obj.serviceId === 'string' &&
    typeof obj.serviceName === 'string'
  );
}

/**
 * Type guard для проверки наличия геолокации
 */
export function hasStartLocation(obj: any): obj is FirebaseTimeEntryWithStartLocation {
  return (
    isValidFirebaseTimeEntry(obj) &&
    'startLocation' in obj &&
    typeof obj.startLocation === 'object' &&
    obj.startLocation !== null &&
    typeof (obj.startLocation as any).latitude === 'number' &&
    typeof (obj.startLocation as any).longitude === 'number'
  );
}

/**
 * Type guard для проверки завершенной записи
 */
export function isCompletedTimeEntry(obj: any): obj is FirebaseCompletedTimeEntry {
  return (
    isValidFirebaseTimeEntry(obj) &&
    (obj.status === 'completed' || obj.status === 'approved') &&
    'endTime' in obj &&
    'duration' in obj &&
    (obj.endTime instanceof Date || 
     obj.endTime instanceof Timestamp || 
     typeof obj.endTime === 'object') &&
    typeof obj.duration === 'number'
  );
}

/**
 * Type guard для проверки валидной задачи
 */
export function isValidFirebaseTask(obj: any): obj is FirebaseTask {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.task === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.priority === 'string' &&
    typeof obj.assignee === 'string' &&
    (obj.dueDate instanceof Date || obj.dueDate instanceof Timestamp) &&
    typeof obj.projectId === 'string' &&
    typeof obj.projectName === 'string' &&
    typeof obj.requirePhoto === 'boolean' &&
    typeof obj.requireComment === 'boolean' &&
    typeof obj.requireLocation === 'boolean'
  );
}

/**
 * Type guard для проверки валидной сметы
 */
export function isValidFirebaseEstimate(obj: any): obj is FirebaseEstimate {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.number === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.projectId === 'string' &&
    typeof obj.contractorId === 'string' &&
    ['draft', 'sent', 'approved', 'rejected', 'cancelled'].includes(obj.status) &&
    Array.isArray(obj.items) &&
    obj.items.every(isValidFirebaseEstimateItem) &&
    typeof obj.subtotal === 'number' &&
    typeof obj.total === 'number'
  );
}

/**
 * Type guard для проверки валидного элемента сметы
 */
export function isValidFirebaseEstimateItem(obj: any): obj is FirebaseEstimateItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.quantity === 'number' &&
    typeof obj.unit === 'string' &&
    typeof obj.unitPrice === 'number' &&
    typeof obj.total === 'number' &&
    ['section', 'work', 'material', 'expense', 'service'].includes(obj.type) &&
    typeof obj.level === 'number' &&
    typeof obj.order === 'number'
  );
}

// ============= VALIDATION ERRORS =============

export class FirebaseValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: any
  ) {
    super(message);
    this.name = 'FirebaseValidationError';
  }
}

/**
 * Валидирует объект перед отправкой в Firebase
 * Выбрасывает FirebaseValidationError если данные невалидны
 */
export function validateForFirebase(obj: any, type: 'timeEntry' | 'task' | 'estimate'): void {
  switch (type) {
    case 'timeEntry':
      if (!isValidFirebaseTimeEntry(obj)) {
        const missingFields = [];
        if (!obj.taskId) missingFields.push('taskId');
        if (!obj.taskName) missingFields.push('taskName');
        if (!obj.employeeId) missingFields.push('employeeId');
        if (!obj.status) missingFields.push('status');
        
        throw new FirebaseValidationError(
          `Invalid TimeEntry: missing required fields: ${missingFields.join(', ')}`,
          missingFields[0] || 'unknown',
          obj
        );
      }
      break;
      
    case 'task':
      if (!isValidFirebaseTask(obj)) {
        throw new FirebaseValidationError(
          'Invalid Task object',
          'task',
          obj
        );
      }
      break;
      
    case 'estimate':
      if (!isValidFirebaseEstimate(obj)) {
        throw new FirebaseValidationError(
          'Invalid Estimate object',
          'estimate',
          obj
        );
      }
      break;
  }
}

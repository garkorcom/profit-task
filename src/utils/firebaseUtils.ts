/**
 * Утилиты для работы с Firebase/Firestore
 */

import { serverTimestamp } from 'firebase/firestore';

/**
 * Рекурсивно очищает объект от undefined полей для Firestore
 * @param obj - объект для очистки
 * @returns очищенный объект
 */
export function cleanForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  if (obj === null || obj === undefined) {
    return {} as Partial<T>;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cleanForFirestore(item)) as any;
  }

  const cleaned: Record<string, any> = {};
  
  for (const key in obj) {
    const value = obj[key];
    
    // Пропускаем undefined значения
    if (value === undefined) {
      continue;
    }
    
    // Рекурсивно обрабатываем вложенные объекты
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Проверяем, не является ли это специальным объектом Firestore
      if (value._methodName === 'serverTimestamp') {
        cleaned[key] = value;
      } else if (value.toDate && typeof value.toDate === 'function') {
        // Firestore Timestamp
        cleaned[key] = value;
      } else {
        // Обычный объект - рекурсивно очищаем
        const cleanedNested = cleanForFirestore(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      }
    } else if (Array.isArray(value)) {
      // Обрабатываем массивы
      cleaned[key] = value.map((item: any) => 
        typeof item === 'object' ? cleanForFirestore(item) : item
      );
    } else {
      // Примитивные значения
      cleaned[key] = value;
    }
  }
  
  return cleaned as Partial<T>;
}

/**
 * Подготавливает данные для создания документа
 * @param data - данные для создания
 * @returns подготовленные данные с временными метками
 */
export function prepareForCreate<T extends Record<string, any>>(
  data: T
): T & { createdAt: any; updatedAt: any } {
  const cleaned = cleanForFirestore(data);
  return {
    ...cleaned,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  } as T & { createdAt: any; updatedAt: any };
}

/**
 * Подготавливает данные для обновления документа
 * @param updates - данные для обновления
 * @returns подготовленные данные с временной меткой обновления
 */
export function prepareForUpdate<T extends Record<string, any>>(
  updates: Partial<T>
): Partial<T> & { updatedAt: any } {
  const cleaned = cleanForFirestore(updates);
  return {
    ...cleaned,
    updatedAt: serverTimestamp()
  };
}

/**
 * Валидирует обязательные поля
 * @param data - данные для проверки
 * @param requiredFields - список обязательных полей
 * @throws Error если отсутствует обязательное поле
 */
export function validateRequired<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missing = requiredFields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new Error(`Отсутствуют обязательные поля: ${missing.join(', ')}`);
  }
}

/**
 * Безопасно парсит JSON с fallback значением
 * @param json - JSON строка
 * @param fallback - значение по умолчанию
 * @returns распарсенный объект или fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Форматирует Firestore Timestamp в строку
 * @param timestamp - Firestore timestamp или Date
 * @returns отформатированная строка даты
 */
export function formatFirestoreDate(timestamp: any): string {
  if (!timestamp) return '';
  
  let date: Date;
  
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else {
    return '';
  }
  
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Проверяет, является ли объект пустым
 * @param obj - объект для проверки
 * @returns true если объект пустой
 */
export function isEmptyObject(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return true;
  return Object.keys(obj).length === 0;
}

/**
 * Глубокое слияние объектов
 * @param target - целевой объект
 * @param source - исходный объект
 * @returns объединенный объект
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };
  
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];
    
    if (sourceValue === undefined) {
      continue;
    }
    
    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue);
    } else {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  }
  
  return result;
}

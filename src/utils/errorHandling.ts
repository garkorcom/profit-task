/**
 * ============================================================================
 * ERROR HANDLING UTILITIES - СИСТЕМА ОБРАБОТКИ ОШИБОК
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * ═══════════
 * Централизованная система для стандартизированной обработки ошибок во всем
 * приложении. Обеспечивает консистентные сообщения пользователю и детальное
 * логирование для разработчиков.
 * 
 * ВОЗМОЖНОСТИ:
 * ════════════
 * 
 * 📋 СТАНДАРТИЗИРОВАННЫЕ КОДЫ ОШИБОК:
 * ├─ API ошибки (REQUEST_FAILED, TIMEOUT, NETWORK_ERROR)
 * ├─ Firebase ошибки (AUTH_ERROR, PERMISSION_DENIED, INDEX_REQUIRED)
 * ├─ Validation ошибки (REQUIRED_FIELD, INVALID_FORMAT)
 * ├─ Business logic ошибки (NOT_FOUND, INSUFFICIENT_PERMISSIONS)
 * └─ Time tracking ошибки (ALREADY_ACTIVE, NOT_ACTIVE)
 * 
 * 🛡️ БЕЗОПАСНАЯ ОБРАБОТКА:
 * ├─ normalizeError() - преобразует любую ошибку в AppError
 * ├─ createAppError() - создает стандартизированную ошибку
 * ├─ logError() - логирует с контекстом и метаданными
 * └─ getErrorMessage() - возвращает понятное сообщение пользователю
 * 
 * 🎯 ИНТЕГРАЦИЯ:
 * ├─ useErrorHandler() - хук для компонентов
 * ├─ Автоматическое определение типа ошибки
 * ├─ Контекстное логирование
 * └─ Готовность к интеграции с мониторингом (Sentry, LogRocket)
 * 
 * ПРИМЕР ИСПОЛЬЗОВАНИЯ:
 * ═══════════════════════
 * const { handleError } = useErrorHandler();
 * 
 * try {
 *   await someApiCall();
 * } catch (error) {
 *   const appError = handleError(error, 'someApiCall context');
 *   setErrorMessage(getErrorMessage(appError));
 * }
 * 
 * ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ: 2025 - Создана система стандартизации ошибок
 * ============================================================================
 */

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * Стандартизированные коды ошибок
 */
export const ERROR_CODES = {
  // API ошибки
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  API_TIMEOUT: 'API_TIMEOUT',
  API_NETWORK_ERROR: 'API_NETWORK_ERROR',
  
  // Firebase ошибки
  FIREBASE_AUTH_ERROR: 'FIREBASE_AUTH_ERROR',
  FIREBASE_PERMISSION_DENIED: 'FIREBASE_PERMISSION_DENIED',
  FIREBASE_NOT_FOUND: 'FIREBASE_NOT_FOUND',
  FIREBASE_INDEX_REQUIRED: 'FIREBASE_INDEX_REQUIRED',
  
  // Validation ошибки
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  
  // Business logic ошибки
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  ESTIMATE_NOT_FOUND: 'ESTIMATE_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Time tracking ошибки
  TIME_TRACKING_ALREADY_ACTIVE: 'TIME_TRACKING_ALREADY_ACTIVE',
  TIME_TRACKING_NOT_ACTIVE: 'TIME_TRACKING_NOT_ACTIVE',
  
  // Generic ошибки
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

/**
 * Создает стандартизированную ошибку приложения
 */
export const createAppError = (
  code: keyof typeof ERROR_CODES,
  message: string,
  details?: any
): AppError => ({
  code,
  message,
  details,
  timestamp: new Date().toISOString()
});

/**
 * Преобразует любую ошибку в AppError
 */
export const normalizeError = (error: unknown): AppError => {
  if (error instanceof Error) {
    // Firebase ошибки
    if (error.message.includes('permission-denied')) {
      return createAppError('FIREBASE_PERMISSION_DENIED', 'Недостаточно прав доступа', error);
    }
    
    if (error.message.includes('not-found')) {
      return createAppError('FIREBASE_NOT_FOUND', 'Данные не найдены', error);
    }
    
    if (error.message.includes('requires an index')) {
      return createAppError('FIREBASE_INDEX_REQUIRED', 'Требуется создание индекса в Firestore', error);
    }
    
    // Network ошибки
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return createAppError('API_NETWORK_ERROR', 'Ошибка сети', error);
    }
    
    // Общие ошибки
    return createAppError('UNKNOWN_ERROR', error.message, error);
  }
  
  if (typeof error === 'string') {
    return createAppError('UNKNOWN_ERROR', error);
  }
  
  return createAppError('UNKNOWN_ERROR', 'Произошла неизвестная ошибка', error);
};

/**
 * Логирует ошибку с контекстом
 */
export const logError = (error: AppError, context?: string) => {
  const logEntry = {
    ...error,
    context,
    userAgent: navigator?.userAgent,
    url: window?.location?.href
  };
  
  console.error(`[${error.code}] ${error.message}`, logEntry);
  
  // В продакшене здесь можно отправлять ошибки в сервис мониторинга
  // например, Sentry, LogRocket, etc.
};

/**
 * Хук для обработки ошибок в компонентах
 */
export const useErrorHandler = () => {
  const handleError = (error: unknown, context?: string) => {
    const appError = normalizeError(error);
    logError(appError, context);
    return appError;
  };
  
  return { handleError };
};

/**
 * Получает пользовательское сообщение для ошибки
 */
export const getErrorMessage = (error: AppError): string => {
  const userMessages: Record<string, string> = {
    [ERROR_CODES.FIREBASE_PERMISSION_DENIED]: 'У вас недостаточно прав для выполнения этого действия',
    [ERROR_CODES.FIREBASE_NOT_FOUND]: 'Запрашиваемые данные не найдены',
    [ERROR_CODES.FIREBASE_INDEX_REQUIRED]: 'Системная ошибка: требуется обновление конфигурации базы данных',
    [ERROR_CODES.API_NETWORK_ERROR]: 'Проблемы с подключением к интернету',
    [ERROR_CODES.PROJECT_NOT_FOUND]: 'Проект не найден',
    [ERROR_CODES.TASK_NOT_FOUND]: 'Задача не найдена',
    [ERROR_CODES.ESTIMATE_NOT_FOUND]: 'Смета не найдена',
    [ERROR_CODES.TIME_TRACKING_ALREADY_ACTIVE]: 'Учет времени уже активен',
    [ERROR_CODES.TIME_TRACKING_NOT_ACTIVE]: 'Учет времени не активен',
    [ERROR_CODES.VALIDATION_REQUIRED_FIELD]: 'Заполните все обязательные поля',
    [ERROR_CODES.VALIDATION_INVALID_FORMAT]: 'Неверный формат данных'
  };
  
  return userMessages[error.code] || error.message || 'Произошла ошибка';
};

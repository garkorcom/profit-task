/**
 * Безопасное API для управления пользователями
 * 
 * Все критические операции выполняются через защищенные Cloud Functions
 * для предотвращения манипуляций на стороне клиента
 * 
 * АРХИТЕКТУРА БЕЗОПАСНОСТИ:
 * - Client-side: Только безопасные поля профиля
 * - Server-side: Все административные и финансовые операции
 */

import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../firebase/firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { UserProfile } from './userApi';

/**
 * Интерфейсы для безопасных операций
 */
interface SafeProfileUpdate {
  displayName?: string;
  phoneNumber?: string;
  whatsappPhone?: string;
  telegramUsername?: string;
  preferredNotificationChannel?: 'email' | 'telegram' | 'whatsapp';
}

/**
 * Интерфейсы для административных запросов
 */
interface UpdateUserRoleRequest {
  targetUserId: string;
  newRole: string;
  reason?: string;
}

interface UpdateHourlyRateRequest {
  targetUserId: string;
  newHourlyRate: number;
  effectiveDate?: string;
  reason?: string;
}

interface DeactivateUserRequest {
  targetUserId: string;
  reason: string;
}

interface SecureApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * 0. БЕЗОПАСНЫЕ ОПЕРАЦИИ (доступны пользователям для себя)
 */

/**
 * Обновление безопасных полей профиля пользователя
 * КРИТИЧНО: Firestore Rules проверят что изменяются только разрешенные поля
 */
export const updateSafeProfileFields = async (
  userId: string, 
  updates: SafeProfileUpdate
): Promise<void> => {
  // Валидация на клиенте (дополнительная защита)
  if (!validateSafeProfileUpdate(updates)) {
    throw new Error('Попытка изменения запрещенных полей профиля');
  }

  const userRef = doc(db, 'users', userId);
  
  try {
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating safe profile fields:', error);
    throw new Error('Не удалось обновить профиль. Проверьте права доступа.');
  }
};

/**
 * Валидация безопасных обновлений профиля
 */
const validateSafeProfileUpdate = (updates: SafeProfileUpdate): boolean => {
  const allowedFields = [
    'displayName',
    'phoneNumber', 
    'whatsappPhone',
    'telegramUsername',
    'preferredNotificationChannel'
  ];
  
  // Проверяем что все поля разрешены
  for (const field in updates) {
    if (!allowedFields.includes(field)) {
      console.error(`Attempt to update forbidden field: ${field}`);
      return false;
    }
  }
  
  return true;
};

/**
 * Безопасное получение профиля пользователя
 */
export const getUserProfileSafe = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { ...userSnap.data(), id: userSnap.id } as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

/**
 * 1. ЗАЩИЩЕННЫЕ ОПЕРАЦИИ С РОЛЯМИ
 */

/**
 * Обновление роли пользователя (только для администраторов)
 */
export const updateUserRoleSecure = async (
  request: UpdateUserRoleRequest
): Promise<SecureApiResponse> => {
  const updateUserRole = httpsCallable(functions, 'updateUserRole');
  
  try {
    const result = await updateUserRole(request);
    return result.data as SecureApiResponse;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new Error(`Failed to update user role: ${error}`);
  }
};

/**
 * Обновление часовой ставки (только для accountant/owner)
 */
export const updateUserHourlyRateSecure = async (
  request: UpdateHourlyRateRequest
): Promise<SecureApiResponse> => {
  const updateUserHourlyRate = httpsCallable(functions, 'updateUserHourlyRate');
  
  try {
    const result = await updateUserHourlyRate(request);
    return result.data as SecureApiResponse;
  } catch (error) {
    console.error('Error updating hourly rate:', error);
    throw new Error(`Failed to update hourly rate: ${error}`);
  }
};

/**
 * Деактивация пользователя (только для администраторов)
 */
export const deactivateUserSecure = async (
  request: DeactivateUserRequest
): Promise<SecureApiResponse> => {
  const deactivateUser = httpsCallable(functions, 'deactivateUser');
  
  try {
    const result = await deactivateUser(request);
    return result.data as SecureApiResponse;
  } catch (error) {
    console.error('Error deactivating user:', error);
    throw new Error(`Failed to deactivate user: ${error}`);
  }
};

/**
 * 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ UI
 */

/**
 * Проверка прав на изменение ролей
 */
export const canChangeUserRoles = (currentUserRole: string): boolean => {
  return ['owner', 'manager'].includes(currentUserRole);
};

/**
 * Проверка прав на изменение ставок
 */
export const canChangeHourlyRates = (currentUserRole: string): boolean => {
  return ['owner', 'accountant'].includes(currentUserRole);
};

/**
 * Проверка прав на деактивацию пользователей
 */
export const canDeactivateUsers = (currentUserRole: string): boolean => {
  return ['owner', 'manager'].includes(currentUserRole);
};

/**
 * Получение списка доступных ролей для назначения
 */
export const getAvailableRoles = (currentUserRole: string): string[] => {
  const allRoles = [
    'field',
    'employee', 
    'contractor',
    'estimator',
    'pm',
    'accountant',
    'manager',
    'owner'
  ];

  // Owner может назначать любые роли
  if (currentUserRole === 'owner') {
    return allRoles;
  }

  // Manager может назначать роли ниже своего уровня
  if (currentUserRole === 'manager') {
    return ['field', 'employee', 'contractor', 'estimator', 'pm', 'accountant'];
  }

  // Остальные не могут изменять роли
  return [];
};

/**
 * 3. ВАЛИДАЦИЯ ДАННЫХ
 */

/**
 * Валидация запроса на изменение роли
 */
export const validateRoleUpdateRequest = (request: UpdateUserRoleRequest): string[] => {
  const errors: string[] = [];

  if (!request.targetUserId) {
    errors.push('ID пользователя обязателен');
  }

  if (!request.newRole) {
    errors.push('Новая роль обязательна');
  }

  const validRoles = [
    'pending_approval',
    'field',
    'employee',
    'contractor', 
    'estimator',
    'pm',
    'accountant',
    'manager',
    'owner',
    'deactivated'
  ];

  if (request.newRole && !validRoles.includes(request.newRole)) {
    errors.push('Недопустимая роль');
  }

  return errors;
};

/**
 * Валидация запроса на изменение ставки
 */
export const validateHourlyRateUpdateRequest = (request: UpdateHourlyRateRequest): string[] => {
  const errors: string[] = [];

  if (!request.targetUserId) {
    errors.push('ID пользователя обязателен');
  }

  if (typeof request.newHourlyRate !== 'number') {
    errors.push('Часовая ставка должна быть числом');
  }

  if (request.newHourlyRate < 0) {
    errors.push('Часовая ставка не может быть отрицательной');
  }

  if (request.newHourlyRate > 10000) {
    errors.push('Часовая ставка слишком высока');
  }

  return errors;
};

/**
 * Принудительное обновление Custom Claims пользователя
 * КРИТИЧНО: Только администраторы могут вызывать эту функцию
 */
export const refreshUserCustomClaims = async (targetUserId?: string): Promise<SecureApiResponse> => {
  const refreshClaimsFunction = httpsCallable(functions, 'refreshUserCustomClaims');
  
  try {
    const result = await refreshClaimsFunction({ targetUserId });
    return result.data as SecureApiResponse;
  } catch (error) {
    console.error('Error refreshing user custom claims:', error);
    throw new Error(`Failed to refresh custom claims: ${error}`);
  }
};

/**
 * 4. КОНСТАНТЫ
 */

/**
 * Описания ролей для UI
 */
export const ROLE_DESCRIPTIONS = {
  'pending_approval': {
    name: 'Ожидает одобрения',
    description: 'Новый пользователь, ждет одобрения администратора',
    color: '#ffa726'
  },
  'field': {
    name: 'Исполнитель (Field)',
    description: 'Работник на объекте, учет времени и задач',
    color: '#8bc34a'
  },
  'employee': {
    name: 'Сотрудник',
    description: 'Выполнение задач и учет времени',
    color: '#4caf50'
  },
  'contractor': {
    name: 'Подрядчик',
    description: 'Ограниченный доступ к назначенным задачам',
    color: '#ff9800'
  },
  'estimator': {
    name: 'Сметчик/Инженер',
    description: 'Подготовка смет, pre-construction работы',
    color: '#795548'
  },
  'pm': {
    name: 'Руководитель проекта (PM)',
    description: 'Управление проектами, утверждение времени команды',
    color: '#3f51b5'
  },
  'accountant': {
    name: 'Бухгалтер/Финансист',
    description: 'Управление финансами, ставками и отчетностью',
    color: '#607d8b'
  },
  'manager': {
    name: 'Менеджер',
    description: 'Управление проектами, задачами и ресурсами',
    color: '#2196f3'
  },
  'owner': {
    name: 'Владелец',
    description: 'Полный доступ ко всем функциям системы',
    color: '#9c27b0'
  },
  'deactivated': {
    name: 'Деактивирован',
    description: 'Пользователь деактивирован администратором',
    color: '#f44336'
  }
} as const;
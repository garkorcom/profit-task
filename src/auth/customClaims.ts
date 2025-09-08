/**
 * Утилиты для работы с Custom Claims
 * 
 * Интеграция с Firebase Auth Custom Claims для серверного
 * управления ролями и разрешениями
 */

import { User } from 'firebase/auth';

export interface CustomClaims {
  role?: string;
  isActive?: boolean;
  permissions?: string[];
  uid?: string; // Firebase User ID для audit trails
}

/**
 * Получение Custom Claims из ID токена пользователя
 */
export const getUserCustomClaims = async (user: User | null): Promise<CustomClaims | null> => {
  if (!user) return null;

  try {
    const idTokenResult = await user.getIdTokenResult();
    return {
      role: idTokenResult.claims.role as string,
      isActive: idTokenResult.claims.isActive as boolean,
      permissions: idTokenResult.claims.permissions as string[]
    };
  } catch (error) {
    console.error('Error fetching custom claims:', error);
    return null;
  }
};

/**
 * Форсированное обновление Custom Claims
 * Используется после изменения роли на сервере
 */
export const refreshUserCustomClaims = async (user: User | null): Promise<CustomClaims | null> => {
  if (!user) return null;

  try {
    // Форсируем обновление токена (true = force refresh)
    const idTokenResult = await user.getIdTokenResult(true);
    return {
      role: idTokenResult.claims.role as string,
      isActive: idTokenResult.claims.isActive as boolean,
      permissions: idTokenResult.claims.permissions as string[]
    };
  } catch (error) {
    console.error('Error refreshing custom claims:', error);
    return null;
  }
};

/**
 * Проверка роли пользователя через Custom Claims
 */
export const hasRole = (claims: CustomClaims | null, role: string): boolean => {
  return claims?.role === role;
};

/**
 * Проверка активности пользователя через Custom Claims
 */
export const isUserActive = (claims: CustomClaims | null): boolean => {
  return claims?.isActive === true;
};

/**
 * Проверка разрешения через Custom Claims
 */
export const hasPermission = (claims: CustomClaims | null, permission: string): boolean => {
  return claims?.permissions?.includes(permission) || false;
};

/**
 * Проверка любого из разрешений через Custom Claims
 */
export const hasAnyPermission = (claims: CustomClaims | null, permissions: string[]): boolean => {
  if (!claims?.permissions) return false;
  return permissions.some(permission => claims.permissions?.includes(permission));
};

/**
 * Проверка всех разрешений через Custom Claims
 */
export const hasAllPermissions = (claims: CustomClaims | null, permissions: string[]): boolean => {
  if (!claims?.permissions) return false;
  return permissions.every(permission => claims.permissions?.includes(permission));
};

/**
 * Проверка административных прав
 */
export const hasAdminRights = (claims: CustomClaims | null): boolean => {
  return hasRole(claims, 'owner') || hasRole(claims, 'manager');
};

/**
 * Проверка финансовых прав
 */
export const hasFinancialRights = (claims: CustomClaims | null): boolean => {
  return hasRole(claims, 'owner') || hasRole(claims, 'accountant');
};

/**
 * Безопасная проверка доступа с фоллбэком на роль из профиля
 * Используется в переходный период до полного перехода на Custom Claims
 */
export const checkAccess = (
  claims: CustomClaims | null, 
  profileRole?: string,
  requiredRole?: string,
  requiredPermission?: string
): boolean => {
  // Если есть Custom Claims, используем их
  if (claims && isUserActive(claims)) {
    if (requiredRole) {
      return hasRole(claims, requiredRole);
    }
    if (requiredPermission) {
      return hasPermission(claims, requiredPermission);
    }
  }
  
  // Фоллбэк на роль из профиля (для совместимости)
  if (profileRole && requiredRole) {
    return profileRole === requiredRole;
  }
  
  return false;
};

/**
 * Типы ролей для типобезопасности
 */
export type UserRole = 
  | 'pending_approval'
  | 'field'
  | 'employee'
  | 'contractor'
  | 'estimator'
  | 'pm'
  | 'accountant'
  | 'manager'
  | 'owner'
  | 'deactivated';

/**
 * Получение описания роли
 */
export const getRoleDescription = (role: UserRole): { name: string; description: string; color: string } => {
  const descriptions = {
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
  };

  return descriptions[role] || descriptions['employee'];
};
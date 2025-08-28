/**
 * React Hook для проверки разрешений пользователя
 */

import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getUserProfile } from '../api/userApi';
import {
  Permission,
  UserRole,
  roleHasPermission,
  roleHasAnyPermission,
  roleHasAllPermissions,
  getRolePermissions,
} from './permissions';

interface PermissionState {
  loading: boolean;
  role: UserRole | null;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  canView: (permission: Permission) => boolean;
  canEdit: (permission: Permission) => boolean;
  canDelete: (permission: Permission) => boolean;
  canCreate: (permission: Permission) => boolean;
}

/**
 * Hook для работы с разрешениями текущего пользователя
 */
export function usePermissions(): PermissionState {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    const loadUserRole = async () => {
      if (!currentUser) {
        setRole(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(currentUser.uid);
        if (profile) {
          setRole(profile.role);
          setPermissions(getRolePermissions(profile.role));
        } else {
          // Если профиль не найден, даем минимальные права
          setRole('employee');
          setPermissions(getRolePermissions('employee'));
        }
      } catch (error) {
        console.error('Error loading user role:', error);
        setRole('employee');
        setPermissions(getRolePermissions('employee'));
      } finally {
        setLoading(false);
      }
    };

    loadUserRole();
  }, [currentUser]);

  /**
   * Проверка наличия конкретного разрешения
   */
  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return roleHasPermission(role, permission);
  };

  /**
   * Проверка наличия хотя бы одного из разрешений
   */
  const hasAnyPermission = (perms: Permission[]): boolean => {
    if (!role) return false;
    return roleHasAnyPermission(role, perms);
  };

  /**
   * Проверка наличия всех разрешений
   */
  const hasAllPermissions = (perms: Permission[]): boolean => {
    if (!role) return false;
    return roleHasAllPermissions(role, perms);
  };

  /**
   * Быстрые проверки для типичных операций
   */
  const canView = (permission: Permission): boolean => hasPermission(permission);
  const canEdit = (permission: Permission): boolean => hasPermission(permission);
  const canDelete = (permission: Permission): boolean => hasPermission(permission);
  const canCreate = (permission: Permission): boolean => hasPermission(permission);

  return {
    loading,
    role,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canView,
    canEdit,
    canDelete,
    canCreate,
  };
}

/**
 * Hook для проверки конкретного разрешения
 * Возвращает true/false и состояние загрузки
 */
export function useHasPermission(permission: Permission): { allowed: boolean; loading: boolean } {
  const { loading, hasPermission } = usePermissions();
  return {
    allowed: hasPermission(permission),
    loading,
  };
}

/**
 * Hook для проверки нескольких разрешений
 */
export function useHasPermissions(
  permissions: Permission[],
  mode: 'any' | 'all' = 'any'
): { allowed: boolean; loading: boolean } {
  const { loading, hasAnyPermission, hasAllPermissions } = usePermissions();
  const allowed = mode === 'any' 
    ? hasAnyPermission(permissions)
    : hasAllPermissions(permissions);
  
  return { allowed, loading };
}

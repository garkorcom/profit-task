/**
 * Компоненты для защиты UI на основе разрешений
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Alert, CircularProgress, Button } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { Permission } from './permissions';
import { usePermissions, useHasPermission, useHasPermissions } from './usePermissions';

/**
 * Компонент-обертка для защиты дочерних элементов на основе разрешений
 */
interface PermissionGuardProps {
  permission?: Permission;
  permissions?: Permission[];
  mode?: 'any' | 'all';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  hideIfNotAllowed?: boolean;
  showError?: boolean;
  redirectTo?: string;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  permissions,
  mode = 'any',
  children,
  fallback,
  hideIfNotAllowed = false,
  showError = true,
  redirectTo,
}) => {
  const { loading, hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  // Определяем, есть ли доступ
  let hasAccess = false;
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = mode === 'any' 
      ? hasAnyPermission(permissions)
      : hasAllPermissions(permissions);
  } else {
    // Если разрешения не указаны, доступ разрешен
    hasAccess = true;
  }

  // Пока загружаются разрешения, показываем индикатор
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  // Если доступ разрешен, показываем контент
  if (hasAccess) {
    return <>{children}</>;
  }

  // Если нужно перенаправить
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  // Если нужно скрыть контент
  if (hideIfNotAllowed) {
    return null;
  }

  // Если передан кастомный fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // Если нужно показать ошибку
  if (showError) {
    return <AccessDeniedMessage />;
  }

  return null;
};

/**
 * Сообщение об отказе в доступе
 */
export const AccessDeniedMessage: React.FC = () => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight="400px"
    p={3}
  >
    <LockIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
    <Typography variant="h5" gutterBottom color="text.secondary">
      Доступ запрещен
    </Typography>
    <Typography variant="body1" color="text.secondary" textAlign="center" mb={3}>
      У вас недостаточно прав для просмотра этой страницы
    </Typography>
    <Button variant="contained" onClick={() => window.history.back()}>
      Вернуться назад
    </Button>
  </Box>
);

/**
 * HOC для защиты компонентов
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission,
  fallback?: React.ReactNode
): React.FC<P> {
  return (props: P) => (
    <PermissionGuard permission={permission} fallback={fallback}>
      <Component {...props} />
    </PermissionGuard>
  );
}

/**
 * Условный рендеринг на основе разрешений
 */
interface CanProps {
  permission?: Permission;
  permissions?: Permission[];
  mode?: 'any' | 'all';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permission,
  permissions,
  mode = 'any',
  children,
  fallback = null,
}) => {
  const { loading, hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  if (loading) return null;

  let hasAccess = false;
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = mode === 'any' 
      ? hasAnyPermission(permissions)
      : hasAllPermissions(permissions);
  } else {
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

/**
 * Компонент для защиты роутов
 */
interface ProtectedRouteProps {
  permission?: Permission;
  permissions?: Permission[];
  mode?: 'any' | 'all';
  children: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  permission,
  permissions,
  mode = 'any',
  children,
  redirectTo = '/',
}) => {
  return (
    <PermissionGuard
      permission={permission}
      permissions={permissions}
      mode={mode}
      redirectTo={redirectTo}
      showError={false}
    >
      {children}
    </PermissionGuard>
  );
};

/**
 * Показывать элемент только для определенных ролей
 */
interface RoleBasedProps {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleBased: React.FC<RoleBasedProps> = ({
  roles,
  children,
  fallback = null,
}) => {
  const { role, loading } = usePermissions();

  if (loading) return null;
  if (!role || !roles.includes(role)) return <>{fallback}</>;
  
  return <>{children}</>;
};

/**
 * Отображение предупреждения о недостающих правах
 */
interface PermissionWarningProps {
  permission: Permission;
  message?: string;
}

export const PermissionWarning: React.FC<PermissionWarningProps> = ({
  permission,
  message = 'Для выполнения этого действия требуются дополнительные права',
}) => {
  const { allowed } = useHasPermission(permission);

  if (allowed) return null;

  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      {message}
    </Alert>
  );
};

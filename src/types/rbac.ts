/**
 * Динамическая система RBAC - Типы и интерфейсы
 * 
 * Расширенная система управления ролями с поддержкой:
 * - Динамического создания и редактирования ролей
 * - Гранулярных разрешений
 * - Условных разрешений  
 * - Временных ролей
 * - Групп пользователей
 * - Наследования разрешений
 */

import { Permission } from '../auth/permissions';

// ================================
// ОСНОВНЫЕ ИНТЕРФЕЙСЫ
// ================================

/**
 * Динамическая роль в системе
 */
export interface DynamicRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  
  // Базовые разрешения
  permissions: Permission[];
  
  // Расширенные возможности
  isSystem: boolean; // Системная роль (нельзя удалить)
  isActive: boolean;
  
  // Иерархия
  parentRoleId?: string; // Наследование от другой роли
  childRoles?: string[]; // Дочерние роли
  
  // Условия применения
  conditions?: RoleCondition[];
  
  // Временные ограничения
  effectiveFrom?: Date;
  effectiveTo?: Date;
  
  // Контекстные разрешения
  contextPermissions?: ContextPermission[];
  
  // Метаданные
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  
  // Дополнительные настройки
  color?: string; // Цвет для UI
  icon?: string;  // Иконка для UI
  priority: number; // Приоритет при конфликте ролей
}

/**
 * Условие применения роли
 */
export interface RoleCondition {
  id: string;
  type: 'time' | 'location' | 'project' | 'department' | 'custom';
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater' | 'less' | 'contains';
  value: any;
  description?: string;
}

/**
 * Контекстное разрешение
 */
export interface ContextPermission {
  permission: Permission;
  context: PermissionContext;
  conditions?: RoleCondition[];
}

/**
 * Контекст применения разрешения
 */
export interface PermissionContext {
  type: 'global' | 'project' | 'department' | 'user_group' | 'resource';
  resourceId?: string; // ID проекта, отдела, группы и т.д.
  constraints?: PermissionConstraint[];
}

/**
 * Ограничение разрешения
 */
export interface PermissionConstraint {
  field: string;
  operation: 'read' | 'write' | 'delete' | 'approve' | 'manage';
  limitation?: 'own_only' | 'department_only' | 'project_only' | 'amount_limit';
  value?: any;
}

/**
 * Группа пользователей
 */
export interface UserGroup {
  id: string;
  name: string;
  description: string;
  
  // Участники
  members: string[]; // User IDs
  
  // Роли группы
  roles: string[]; // Role IDs
  
  // Дополнительные разрешения группы
  additionalPermissions: Permission[];
  
  // Настройки
  isActive: boolean;
  autoAssignment?: AutoAssignmentRule[];
  
  // Иерархия групп
  parentGroupId?: string;
  
  // Метаданные
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Правило автоматического назначения в группу
 */
export interface AutoAssignmentRule {
  id: string;
  field: 'department' | 'position' | 'location' | 'hireDate' | 'custom';
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  value: any;
  description?: string;
}

/**
 * Членство в группе
 */
export interface GroupMembership {
  id: string;
  userId: string;
  groupId: string;
  isActive: boolean;
  assignedAt: Date;
  assignedBy: string;
}

/**
 * Временная роль пользователя
 */
export interface TemporaryRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  
  // Временные ограничения
  startDate: Date;
  endDate: Date;
  
  // Причина назначения
  reason: string;
  grantedBy: string;
  
  // Статус
  isActive: boolean;
  
  // Уведомления
  notifyBefore?: number; // За сколько дней уведомить об истечении
  autoRevoke: boolean;   // Автоматически отзывать по истечении
  
  createdAt: Date;
}

/**
 * Делегирование полномочий
 */
export interface AuthorityDelegation {
  id: string;
  
  // Делегирующий и получатель
  delegatorId: string;
  delegateId: string;
  
  // Делегируемые разрешения
  permissions: Permission[];
  roleIds?: string[]; // Альтернатива - делегировать всю роль
  
  // Ограничения
  scope?: DelegationScope;
  limitations?: PermissionConstraint[];
  
  // Временные рамки
  startDate: Date;
  endDate: Date;
  
  // Настройки
  canSubdelegate: boolean; // Может ли получатель передать дальше
  notifyDelegator: boolean; // Уведомлять делегирующего об использовании
  
  // Статус
  isActive: boolean;
  revokedAt?: Date;
  revokedBy?: string;
  revokedReason?: string;
  
  createdAt: Date;
  reason: string;
}

/**
 * Область действия делегирования
 */
export interface DelegationScope {
  type: 'global' | 'projects' | 'departments' | 'specific_resources';
  resourceIds?: string[];
}

/**
 * Расширенный профиль пользователя с RBAC
 */
export interface UserRBACProfile {
  userId: string;
  
  // Основные роли
  primaryRoles: string[]; // Role IDs
  
  // Временные роли
  temporaryRoles: TemporaryRoleAssignment[];
  
  // Групповое членство
  groups: string[]; // UserGroup IDs
  
  // Делегированные полномочия (полученные)
  receivedDelegations: AuthorityDelegation[];
  
  // Делегированные полномочия (выданные)
  grantedDelegations: AuthorityDelegation[];
  
  // Индивидуальные разрешения (вне ролей)
  individualPermissions: ContextPermission[];
  
  // Исключения (отозванные разрешения)
  revokedPermissions: Permission[];
  
  // Эффективные разрешения (кэш)
  effectivePermissions?: ComputedPermissions;
  effectivePermissionsUpdatedAt?: Date;
}

/**
 * Вычисленные разрешения пользователя
 */
export interface ComputedPermissions {
  // Все разрешения с контекстом
  permissions: Map<Permission, PermissionContext[]>;
  
  // Быстрый доступ для проверки
  globalPermissions: Set<Permission>;
  contextualPermissions: Map<string, Set<Permission>>; // context -> permissions
  
  // Метаданные вычисления
  computedAt: Date;
  expiresAt?: Date; // Кэш истекает если есть временные роли
  sources: PermissionSource[]; // Откуда получено каждое разрешение
}

/**
 * Источник разрешения
 */
export interface PermissionSource {
  permission: Permission;
  source: 'role' | 'group' | 'delegation' | 'individual';
  sourceId: string; // ID роли, группы, делегирования
  sourceName: string;
  context?: PermissionContext;
}

// ================================
// УТИЛИТАРНЫЕ ТИПЫ
// ================================

/**
 * Запрос на создание/изменение роли
 */
export interface RoleManagementRequest {
  name: string;
  displayName: string;
  description: string;
  permissions: Permission[];
  parentRoleId?: string;
  conditions?: RoleCondition[];
  contextPermissions?: ContextPermission[];
  effectiveFrom?: Date;
  effectiveTo?: Date;
  color?: string;
  icon?: string;
  priority?: number;
}

/**
 * Запрос на назначение роли
 */
export interface RoleAssignmentRequest {
  userId: string;
  roleId: string;
  temporary?: {
    startDate: Date;
    endDate: Date;
    reason: string;
  };
  reason: string;
}

/**
 * Результат проверки разрешения
 */
export interface PermissionCheckResult {
  hasPermission: boolean;
  sources: PermissionSource[];
  context?: PermissionContext;
  limitations?: PermissionConstraint[];
  effectiveUntil?: Date; // Если разрешение временное
  explanation?: string; // Объяснение результата проверки
}

/**
 * Статистика использования RBAC
 */
export interface RBACStats {
  totalRoles: number;
  activeRoles: number;
  totalUsers: number;
  usersWithMultipleRoles: number;
  averagePermissionsPerRole: number;
  mostUsedPermissions: Array<{ permission: Permission; usage: number }>;
  roleDistribution: Array<{ roleId: string; userCount: number }>;
  temporaryRoleAssignments: number;
  activeDelegations: number;
}

// Types already exported above individually
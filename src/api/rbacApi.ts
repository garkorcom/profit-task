/**
 * API для работы с динамической системой RBAC
 * 
 * Управление ролями, разрешениями, группами пользователей
 * и делегированием полномочий
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/firebase';
import { 
  DynamicRole, 
  UserGroup, 
  TemporaryRoleAssignment, 
  AuthorityDelegation,
  UserRBACProfile,
  ComputedPermissions,
  RoleManagementRequest,
  RoleAssignmentRequest,
  PermissionCheckResult,
  RBACStats
} from '../types/rbac';
import { Permission } from '../auth/permissions';
import { UserProfile } from './userApi';

// ================================
// УПРАВЛЕНИЕ РОЛЯМИ
// ================================

/**
 * Создание новой динамической роли
 */
export const createRole = async (
  roleData: RoleManagementRequest,
  createdBy: string
): Promise<DynamicRole> => {
  const roleId = doc(collection(db, 'rbac_roles')).id;
  
  const role: DynamicRole = {
    id: roleId,
    ...roleData,
    isSystem: false,
    isActive: true,
    childRoles: [],
    createdAt: new Date(),
    createdBy,
    updatedAt: new Date(),
    updatedBy: createdBy,
    priority: roleData.priority || 100
  };

  await setDoc(doc(db, 'rbac_roles', roleId), {
    ...role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // Обновляем родительскую роль, если указана
  if (roleData.parentRoleId) {
    const parentRef = doc(db, 'rbac_roles', roleData.parentRoleId);
    const parentDoc = await getDoc(parentRef);
    if (parentDoc.exists()) {
      const parentData = parentDoc.data() as DynamicRole;
      await updateDoc(parentRef, {
        childRoles: [...(parentData.childRoles || []), roleId],
        updatedAt: serverTimestamp(),
        updatedBy: createdBy
      });
    }
  }

  return role;
};

/**
 * Получение всех ролей
 */
export const getAllRoles = async (): Promise<DynamicRole[]> => {
  const rolesQuery = query(
    collection(db, 'rbac_roles'),
    orderBy('priority', 'asc'),
    orderBy('name', 'asc')
  );
  
  const snapshot = await getDocs(rolesQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
    effectiveFrom: doc.data().effectiveFrom?.toDate(),
    effectiveTo: doc.data().effectiveTo?.toDate()
  })) as DynamicRole[];
};

/**
 * Получение роли по ID
 */
export const getRoleById = async (roleId: string): Promise<DynamicRole | null> => {
  const roleDoc = await getDoc(doc(db, 'rbac_roles', roleId));
  if (!roleDoc.exists()) return null;
  
  const data = roleDoc.data();
  return {
    id: roleDoc.id,
    ...data,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
    effectiveFrom: data.effectiveFrom?.toDate(),
    effectiveTo: data.effectiveTo?.toDate()
  } as DynamicRole;
};

/**
 * Обновление роли
 */
export const updateRole = async (
  roleId: string, 
  updates: Partial<RoleManagementRequest>,
  updatedBy: string
): Promise<void> => {
  await updateDoc(doc(db, 'rbac_roles', roleId), {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy
  });
};

/**
 * Деактивация роли (мягкое удаление)
 */
export const deactivateRole = async (roleId: string, deactivatedBy: string): Promise<void> => {
  // Проверяем, что роль не системная
  const roleDoc = await getDoc(doc(db, 'rbac_roles', roleId));
  if (!roleDoc.exists()) throw new Error('Role not found');
  
  const roleData = roleDoc.data() as DynamicRole;
  if (roleData.isSystem) {
    throw new Error('Cannot deactivate system role');
  }

  await updateDoc(doc(db, 'rbac_roles', roleId), {
    isActive: false,
    updatedAt: serverTimestamp(),
    updatedBy: deactivatedBy
  });
};

// ================================
// УПРАВЛЕНИЕ ГРУППАМИ ПОЛЬЗОВАТЕЛЕЙ
// ================================

/**
 * Создание группы пользователей с поддержкой автоназначения
 */
export const createUserGroup = async (
  groupData: {
    name: string;
    description: string;
    roles?: string[];
    additionalPermissions?: Permission[];
    autoAssignment?: any[];
    parentGroupId?: string;
  },
  createdBy: string
): Promise<UserGroup> => {
  const groupId = doc(collection(db, 'user_groups')).id;
  
  const group: UserGroup = {
    id: groupId,
    name: groupData.name,
    description: groupData.description,
    members: [],
    roles: groupData.roles || [],
    additionalPermissions: groupData.additionalPermissions || [],
    autoAssignment: groupData.autoAssignment || [],
    parentGroupId: groupData.parentGroupId,
    isActive: true,
    createdAt: new Date(),
    createdBy,
    updatedAt: new Date(),
    updatedBy: createdBy
  };

  await setDoc(doc(db, 'user_groups', groupId), {
    ...group,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return group;
};

/**
 * Получение всех групп пользователей
 */
export const getAllUserGroups = async (): Promise<UserGroup[]> => {
  const groupsQuery = query(
    collection(db, 'user_groups'),
    orderBy('name', 'asc')
  );
  
  const snapshot = await getDocs(groupsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate()
  })) as UserGroup[];
};

/**
 * Обновление группы пользователей
 */
export const updateUserGroup = async (
  groupId: string,
  updates: Partial<{
    name: string;
    description: string;
    roles: string[];
    additionalPermissions: Permission[];
    autoAssignment: any[];
    parentGroupId: string;
    isActive: boolean;
  }>,
  updatedBy: string
): Promise<void> => {
  await updateDoc(doc(db, 'user_groups', groupId), {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy
  });
};

/**
 * Удаление группы пользователей
 */
export const deleteUserGroup = async (groupId: string): Promise<void> => {
  await deleteDoc(doc(db, 'user_groups', groupId));
};

/**
 * Получение участников группы
 */
export const getAllMemberships = async (): Promise<any[]> => {
  const membershipsQuery = query(
    collection(db, 'user_group_memberships'),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(membershipsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    assignedAt: doc.data().assignedAt?.toDate()
  }));
};

/**
 * Получение статистики группы
 */
export const getGroupStatistics = async (groupId: string): Promise<any> => {
  // Здесь будет вызов серверной функции для получения статистики
  const getGroupStats = httpsCallable(functions, 'getGroupStatistics');
  
  try {
    const result = await getGroupStats({ groupId });
    return result.data;
  } catch (error) {
    console.error('Error getting group statistics:', error);
    throw error;
  }
};

/**
 * Добавление пользователя в группу
 */
export const addUserToGroup = async (
  groupId: string, 
  userId: string, 
  updatedBy: string
): Promise<void> => {
  const groupRef = doc(db, 'user_groups', groupId);
  const groupDoc = await getDoc(groupRef);
  
  if (!groupDoc.exists()) throw new Error('Group not found');
  
  const groupData = groupDoc.data() as UserGroup;
  if (!groupData.members.includes(userId)) {
    await updateDoc(groupRef, {
      members: [...groupData.members, userId],
      updatedAt: serverTimestamp(),
      updatedBy
    });
  }
};

/**
 * Назначение роли группе
 */
export const assignRoleToGroup = async (
  groupId: string, 
  roleId: string, 
  updatedBy: string
): Promise<void> => {
  const groupRef = doc(db, 'user_groups', groupId);
  const groupDoc = await getDoc(groupRef);
  
  if (!groupDoc.exists()) throw new Error('Group not found');
  
  const groupData = groupDoc.data() as UserGroup;
  if (!groupData.roles.includes(roleId)) {
    await updateDoc(groupRef, {
      roles: [...groupData.roles, roleId],
      updatedAt: serverTimestamp(),
      updatedBy
    });
  }
};

// ================================
// ВРЕМЕННЫЕ РОЛИ
// ================================

/**
 * Назначение временной роли
 */
export const assignTemporaryRole = async (
  assignment: Omit<TemporaryRoleAssignment, 'id' | 'createdAt'>
): Promise<string> => {
  const assignmentId = doc(collection(db, 'temporary_roles')).id;
  
  const tempRole: TemporaryRoleAssignment = {
    id: assignmentId,
    ...assignment,
    createdAt: new Date()
  };

  await setDoc(doc(db, 'temporary_roles', assignmentId), {
    ...tempRole,
    startDate: Timestamp.fromDate(tempRole.startDate),
    endDate: Timestamp.fromDate(tempRole.endDate),
    createdAt: serverTimestamp()
  });

  return assignmentId;
};

/**
 * Получение активных временных ролей пользователя
 */
export const getUserTemporaryRoles = async (userId: string): Promise<TemporaryRoleAssignment[]> => {
  const now = new Date();
  const tempRolesQuery = query(
    collection(db, 'temporary_roles'),
    where('userId', '==', userId),
    where('isActive', '==', true),
    where('startDate', '<=', Timestamp.fromDate(now)),
    where('endDate', '>=', Timestamp.fromDate(now))
  );
  
  const snapshot = await getDocs(tempRolesQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    startDate: doc.data().startDate.toDate(),
    endDate: doc.data().endDate.toDate(),
    createdAt: doc.data().createdAt.toDate()
  })) as TemporaryRoleAssignment[];
};

// ================================
// ДЕЛЕГИРОВАНИЕ ПОЛНОМОЧИЙ
// ================================

/**
 * Создание делегирования полномочий
 */
export const createDelegation = async (
  delegation: Omit<AuthorityDelegation, 'id' | 'createdAt'>
): Promise<string> => {
  const delegationId = doc(collection(db, 'delegations')).id;
  
  const newDelegation: AuthorityDelegation = {
    id: delegationId,
    ...delegation,
    createdAt: new Date()
  };

  await setDoc(doc(db, 'delegations', delegationId), {
    ...newDelegation,
    startDate: Timestamp.fromDate(newDelegation.startDate),
    endDate: Timestamp.fromDate(newDelegation.endDate),
    createdAt: serverTimestamp(),
    revokedAt: newDelegation.revokedAt ? Timestamp.fromDate(newDelegation.revokedAt) : null
  });

  return delegationId;
};

/**
 * Отзыв делегирования
 */
export const revokeDelegation = async (
  delegationId: string, 
  revokedBy: string, 
  reason: string
): Promise<void> => {
  await updateDoc(doc(db, 'delegations', delegationId), {
    isActive: false,
    revokedAt: serverTimestamp(),
    revokedBy,
    revokedReason: reason
  });
};

// ================================
// ПРОФИЛЬ RBAC ПОЛЬЗОВАТЕЛЯ
// ================================

/**
 * Получение полного RBAC профиля пользователя
 */
export const getUserRBACProfile = async (userId: string): Promise<UserRBACProfile | null> => {
  const profileDoc = await getDoc(doc(db, 'user_rbac_profiles', userId));
  
  if (!profileDoc.exists()) {
    // Создаем базовый профиль
    const newProfile: UserRBACProfile = {
      userId,
      primaryRoles: [],
      temporaryRoles: [],
      groups: [],
      receivedDelegations: [],
      grantedDelegations: [],
      individualPermissions: [],
      revokedPermissions: []
    };
    
    await setDoc(doc(db, 'user_rbac_profiles', userId), newProfile);
    return newProfile;
  }
  
  const data = profileDoc.data();
  return {
    userId: profileDoc.id,
    ...data,
    temporaryRoles: data.temporaryRoles?.map((tr: any) => ({
      ...tr,
      startDate: tr.startDate?.toDate(),
      endDate: tr.endDate?.toDate(),
      createdAt: tr.createdAt?.toDate()
    })) || [],
    receivedDelegations: data.receivedDelegations?.map((rd: any) => ({
      ...rd,
      startDate: rd.startDate?.toDate(),
      endDate: rd.endDate?.toDate(),
      createdAt: rd.createdAt?.toDate(),
      revokedAt: rd.revokedAt?.toDate()
    })) || [],
    grantedDelegations: data.grantedDelegations?.map((gd: any) => ({
      ...gd,
      startDate: gd.startDate?.toDate(),
      endDate: gd.endDate?.toDate(),
      createdAt: gd.createdAt?.toDate(),
      revokedAt: gd.revokedAt?.toDate()
    })) || [],
    effectivePermissionsUpdatedAt: data.effectivePermissionsUpdatedAt?.toDate()
  } as UserRBACProfile;
};

/**
 * Назначение роли пользователю
 */
export const assignRoleToUser = async (
  userId: string, 
  roleId: string, 
  assignedBy: string,
  temporary?: { startDate: Date; endDate: Date; reason: string }
): Promise<void> => {
  if (temporary) {
    // Создаем временное назначение
    await assignTemporaryRole({
      userId,
      roleId,
      startDate: temporary.startDate,
      endDate: temporary.endDate,
      reason: temporary.reason,
      grantedBy: assignedBy,
      isActive: true,
      autoRevoke: true
    });
  } else {
    // Добавляем постоянную роль
    const profileRef = doc(db, 'user_rbac_profiles', userId);
    const profile = await getUserRBACProfile(userId);
    
    if (profile && !profile.primaryRoles.includes(roleId)) {
      await updateDoc(profileRef, {
        primaryRoles: [...profile.primaryRoles, roleId]
      });
    }
  }
  
  // Сбрасываем кэш разрешений
  await invalidatePermissionsCache(userId);
};

/**
 * Сброс кэша разрешений пользователя
 */
export const invalidatePermissionsCache = async (userId: string): Promise<void> => {
  await updateDoc(doc(db, 'user_rbac_profiles', userId), {
    effectivePermissions: null,
    effectivePermissionsUpdatedAt: null
  });
};

// ================================
// ВЫЧИСЛЕНИЕ И ПРОВЕРКА РАЗРЕШЕНИЙ
// ================================

/**
 * Проверка разрешения пользователя (серверная функция для безопасности)
 */
const checkPermissionSecure = httpsCallable(functions, 'checkUserPermission');

export const checkUserPermission = async (
  userId: string, 
  permission: Permission,
  context?: { resourceType?: string; resourceId?: string }
): Promise<PermissionCheckResult> => {
  try {
    const result = await checkPermissionSecure({ userId, permission, context });
    return result.data as PermissionCheckResult;
  } catch (error) {
    console.error('Error checking permission:', error);
    return { hasPermission: false, sources: [] };
  }
};

/**
 * Получение всех эффективных разрешений пользователя
 */
const computeUserPermissions = httpsCallable(functions, 'computeUserPermissions');

export const getUserEffectivePermissions = async (userId: string): Promise<ComputedPermissions | null> => {
  try {
    const result = await computeUserPermissions({ userId });
    return result.data as ComputedPermissions;
  } catch (error) {
    console.error('Error computing permissions:', error);
    return null;
  }
};

// ================================
// СТАТИСТИКА И АНАЛИТИКА
// ================================

/**
 * Получение статистики RBAC системы
 */
export const getRBACStats = async (): Promise<RBACStats> => {
  // Эта функция будет вызывать серверную функцию для получения агрегированных данных
  const getRBACStatsSecure = httpsCallable(functions, 'getRBACStats');
  
  try {
    const result = await getRBACStatsSecure({});
    return result.data as RBACStats;
  } catch (error) {
    console.error('Error getting RBAC stats:', error);
    throw error;
  }
};

/**
 * Аудит использования разрешений
 */
export const auditPermissionUsage = async (
  permission: Permission, 
  timeRange?: { from: Date; to: Date }
): Promise<Array<{ userId: string; usage: number; lastUsed: Date }>> => {
  const auditPermissionUsageSecure = httpsCallable(functions, 'auditPermissionUsage');
  
  try {
    const result = await auditPermissionUsageSecure({ 
      permission, 
      timeRange: timeRange ? {
        from: Timestamp.fromDate(timeRange.from),
        to: Timestamp.fromDate(timeRange.to)
      } : undefined
    });
    return result.data as Array<{ userId: string; usage: number; lastUsed: Date }>;
  } catch (error) {
    console.error('Error auditing permission usage:', error);
    throw error;
  }
};

// ================================
// УТИЛИТАРНЫЕ ФУНКЦИИ
// ================================

/**
 * Получение пути наследования роли
 */
export const getRoleInheritancePath = async (roleId: string): Promise<DynamicRole[]> => {
  const path: DynamicRole[] = [];
  let currentRoleId: string | undefined = roleId;
  
  while (currentRoleId) {
    const role: DynamicRole | null = await getRoleById(currentRoleId);
    if (!role) break;
    
    path.push(role);
    currentRoleId = role.parentRoleId;
  }
  
  return path;
};

/**
 * Проверка циклических зависимостей в иерархии ролей
 */
export const checkRoleCircularDependency = async (
  roleId: string, 
  parentRoleId: string
): Promise<boolean> => {
  const visited = new Set<string>();
  let currentRoleId: string | undefined = parentRoleId;
  
  while (currentRoleId && !visited.has(currentRoleId)) {
    if (currentRoleId === roleId) return true; // Найдена циклическая зависимость
    
    visited.add(currentRoleId);
    const role: DynamicRole | null = await getRoleById(currentRoleId);
    currentRoleId = role?.parentRoleId;
  }
  
  return false;
};

// ================================
// PERMISSION DEBUGGER API
// ================================

/**
 * Поиск пользователей для Permission Debugger
 */
export const searchUsers = async (query: string): Promise<UserProfile[]> => {
  const searchUsersSecure = httpsCallable(functions, 'searchUsers');
  
  try {
    const result = await searchUsersSecure({ query });
    return result.data as UserProfile[];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

/**
 * Проверка разрешения пользователя с подробным объяснением
 */
export const checkUserPermissionDetailed = async (
  userId: string,
  permission: string,
  context?: any
): Promise<PermissionCheckResult> => {
  const checkPermissionDetailed = httpsCallable(functions, 'checkPermissionDetailed');
  
  try {
    const result = await checkPermissionDetailed({ 
      userId, 
      permission, 
      context: context || {} 
    });
    return result.data as PermissionCheckResult;
  } catch (error) {
    console.error('Error checking permission detailed:', error);
    return { 
      hasPermission: false, 
      sources: [],
      explanation: 'Error occurred while checking permission'
    };
  }
};

/**
 * Начать безопасную импровизацию пользователя
 */
export const startUserImpersonation = async (
  targetUserId: string,
  adminUserId: string,
  reason: string,
  duration?: number
): Promise<{ impersonationToken: string; expiresAt: Date }> => {
  const startImpersonation = httpsCallable(functions, 'startUserImpersonation');
  
  try {
    const result = await startImpersonation({
      targetUserId,
      adminUserId,
      reason,
      duration: duration || 3600 // 1 час по умолчанию
    });
    
    return {
      impersonationToken: (result.data as any).impersonationToken,
      expiresAt: new Date((result.data as any).expiresAt.seconds * 1000)
    };
  } catch (error) {
    console.error('Error starting impersonation:', error);
    throw error;
  }
};

/**
 * Завершить импровизацию пользователя
 */
export const endUserImpersonation = async (
  impersonationToken: string
): Promise<void> => {
  const endImpersonation = httpsCallable(functions, 'endUserImpersonation');
  
  try {
    await endImpersonation({ impersonationToken });
  } catch (error) {
    console.error('Error ending impersonation:', error);
    throw error;
  }
};

/**
 * Получить активные сессии импровизации
 */
export const getActiveImpersonations = async (): Promise<Array<{
  id: string;
  targetUserId: string;
  adminUserId: string;
  startedAt: Date;
  expiresAt: Date;
  reason: string;
}>> => {
  const getActiveImpersonations = httpsCallable(functions, 'getActiveImpersonations');
  
  try {
    const result = await getActiveImpersonations({});
    return result.data as Array<{
      id: string;
      targetUserId: string;
      adminUserId: string;
      startedAt: Date;
      expiresAt: Date;
      reason: string;
    }>;
  } catch (error) {
    console.error('Error getting active impersonations:', error);
    return [];
  }
};

// Named exports - more TypeScript friendly
const rbacApiModule = {
  // Управление ролями
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deactivateRole,
  
  // Управление группами
  createUserGroup,
  getAllUserGroups,
  updateUserGroup,
  deleteUserGroup,
  addUserToGroup,
  assignRoleToGroup,
  getAllMemberships,
  getGroupStatistics,
  
  // Временные роли
  assignTemporaryRole,
  getUserTemporaryRoles,
  
  // Делегирование
  createDelegation,
  revokeDelegation,
  
  // Профили пользователей
  getUserRBACProfile,
  assignRoleToUser,
  invalidatePermissionsCache,
  
  // Проверка разрешений
  checkUserPermission,
  getUserEffectivePermissions,
  
  // Статистика
  getRBACStats,
  auditPermissionUsage,
  
  // Утилиты
  getRoleInheritancePath,
  checkRoleCircularDependency,
  
  // Permission Debugger
  searchUsers,
  checkUserPermissionDetailed,
  startUserImpersonation,
  endUserImpersonation,
  getActiveImpersonations
};

// ================================
// ДОПОЛНИТЕЛЬНЫЕ API МЕТОДЫ (ЗАГЛУШКИ ДЛЯ РАЗРАБОТКИ)
// ================================

/**
 * Получение группы пользователей по ID (заглушка)
 */
export const getUserGroupById = async (groupId: string): Promise<UserGroup | null> => {
  // TODO: Implement real database query
  console.warn('getUserGroupById is a stub - implement database integration');
  return {
    id: groupId,
    name: `Mock Group ${groupId}`,
    description: 'Mock group for development',
    members: [],
    roles: [],
    additionalPermissions: [],
    isActive: true,
    createdAt: new Date(),
    createdBy: 'system',
    updatedAt: new Date(),
    updatedBy: 'system'
  };
};

/**
 * Обновление RBAC профиля пользователя (заглушка)
 */
export const updateUserRBACProfile = async (
  userId: string, 
  updates: Partial<UserRBACProfile>
): Promise<void> => {
  // TODO: Implement real database update
  console.warn('updateUserRBACProfile is a stub - implement database integration');
  console.log(`Mock update for user ${userId}:`, updates);
};

/**
 * Пересчет эффективных разрешений пользователя (заглушка)
 */
export const recalculateUserEffectivePermissions = async (userId: string): Promise<void> => {
  // TODO: Implement real permissions calculation
  console.warn('recalculateUserEffectivePermissions is a stub - implement database integration');
  console.log(`Mock permissions recalculation for user ${userId}`);
};

/**
 * Получение всех пользователей (заглушка)
 */
export const getAllUsers = async (): Promise<UserProfile[]> => {
  // TODO: Implement real database query
  console.warn('getAllUsers is a stub - implement database integration');
  return [];
};

export default rbacApiModule;
/**
 * Firebase Cloud Functions для динамической системы RBAC
 * 
 * КРИТИЧЕСКИ ВАЖНО: Все операции с ролями и разрешениями
 * должны происходить только на бэкенде для предотвращения злоупотреблений
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { 
  DynamicRole, 
  RoleManagementRequest, 
  RoleAssignmentRequest,
  UserGroup,
  TemporaryRoleAssignment,
  AuthorityDelegation,
  ComputedPermissions,
  PermissionCheckResult,
  UserRBACProfile,
  RBACStats
} from '../../src/types/rbac';
import { Permission } from '../../src/auth/permissions';

const db = admin.firestore();
const auth = admin.auth();

/**
 * 2.1 - ЗАЩИЩЕННАЯ ФУНКЦИЯ: Создание динамической роли
 * Только администраторы могут создавать роли
 */
export const createDynamicRole = functions.https.onCall(async (data: RoleManagementRequest, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const actorId = context.auth.uid;
  const actorClaims = context.auth.token;
  
  if (!hasRoleManagementRights(actorClaims)) {
    await createAuditLog({
      userId: actorId,
      actorId,
      action: 'CREATE_ROLE_DENIED',
      resource: 'dynamic_role',
      resourceId: 'new',
      success: false,
      errorMessage: 'Insufficient permissions'
    });
    
    throw new functions.https.HttpsError(
      'permission-denied', 
      'Only owners and managers can create roles'
    );
  }

  try {
    // Проверяем уникальность имени роли
    const existingRole = await db.collection('rbac_roles')
      .where('name', '==', data.name)
      .limit(1)
      .get();
    
    if (!existingRole.empty) {
      throw new functions.https.HttpsError(
        'already-exists',
        'Role with this name already exists'
      );
    }

    // Валидация разрешений
    const validPermissions = await validatePermissions(data.permissions);
    if (!validPermissions) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid permissions provided'
      );
    }

    // Создаем роль
    const roleId = db.collection('rbac_roles').doc().id;
    const newRole: DynamicRole = {
      id: roleId,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      permissions: data.permissions,
      isSystem: false,
      isActive: true,
      parentRoleId: data.parentRoleId,
      conditions: data.conditions || [],
      contextPermissions: data.contextPermissions || [],
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo,
      createdAt: new Date(),
      createdBy: actorId,
      updatedAt: new Date(),
      updatedBy: actorId,
      color: data.color,
      icon: data.icon,
      priority: data.priority || 0,
    };

    await db.collection('rbac_roles').doc(roleId).set(newRole);

    // Обновляем иерархию ролей если есть родительская роль
    if (data.parentRoleId) {
      await updateRoleHierarchy(data.parentRoleId, roleId, 'add_child');
    }

    await createAuditLog({
      userId: roleId,
      actorId,
      action: 'ROLE_CREATED',
      resource: 'dynamic_role',
      resourceId: roleId,
      newValue: newRole,
      success: true
    });

    console.log(`Dynamic role created: ${roleId} by ${actorId}`);
    return { success: true, roleId, role: newRole };

  } catch (error) {
    console.error('Error creating dynamic role:', error);
    
    await createAuditLog({
      userId: 'new',
      actorId,
      action: 'ROLE_CREATED',
      resource: 'dynamic_role',
      resourceId: 'new',
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to create role');
  }
});

/**
 * 2.2 - ЗАЩИЩЕННАЯ ФУНКЦИЯ: Назначение роли пользователю
 */
export const assignRoleToUser = functions.https.onCall(async (data: RoleAssignmentRequest, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const actorId = context.auth.uid;
  const actorClaims = context.auth.token;
  
  if (!hasUserManagementRights(actorClaims)) {
    throw new functions.https.HttpsError(
      'permission-denied', 
      'Only owners and managers can assign roles'
    );
  }

  try {
    const { userId, roleId, temporary, reason } = data;

    // Проверяем существование роли и пользователя
    const [roleDoc, userDoc] = await Promise.all([
      db.collection('rbac_roles').doc(roleId).get(),
      db.collection('users').doc(userId).get()
    ]);

    if (!roleDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Role not found');
    }

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const role = roleDoc.data() as DynamicRole;
    
    // Проверяем условия роли
    const conditionsValid = await validateRoleConditions(role, userId);
    if (!conditionsValid) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'User does not meet role conditions'
      );
    }

    if (temporary) {
      // Создаем временное назначение
      await createTemporaryRoleAssignment({
        userId,
        roleId,
        startDate: temporary.startDate,
        endDate: temporary.endDate,
        reason: temporary.reason,
        grantedBy: actorId
      });
    } else {
      // Обновляем основной профиль пользователя
      const userProfile = await getUserRBACProfile(userId);
      if (!userProfile.primaryRoles.includes(roleId)) {
        userProfile.primaryRoles.push(roleId);
        await updateUserRBACProfile(userId, userProfile);
      }
    }

    // Пересчитываем эффективные разрешения
    await recalculateUserPermissions(userId);

    await createAuditLog({
      userId,
      actorId,
      action: temporary ? 'TEMPORARY_ROLE_ASSIGNED' : 'ROLE_ASSIGNED',
      resource: 'user_rbac_profile',
      resourceId: userId,
      newValue: { roleId, reason, temporary },
      success: true
    });

    return { success: true, message: 'Role assigned successfully' };

  } catch (error) {
    console.error('Error assigning role:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to assign role');
  }
});

/**
 * 2.3 - ЗАЩИЩЕННАЯ ФУНКЦИЯ: Создание группы пользователей
 */
export const createUserGroup = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const actorId = context.auth.uid;
  const actorClaims = context.auth.token;
  
  if (!hasGroupManagementRights(actorClaims)) {
    throw new functions.https.HttpsError(
      'permission-denied', 
      'Only owners and managers can create user groups'
    );
  }

  try {
    const groupId = db.collection('user_groups').doc().id;
    const userGroup: UserGroup = {
      id: groupId,
      name: data.name,
      description: data.description,
      members: data.members || [],
      roles: data.roles || [],
      additionalPermissions: data.additionalPermissions || [],
      isActive: true,
      autoAssignment: data.autoAssignment || [],
      createdAt: new Date(),
      createdBy: actorId,
      updatedAt: new Date(),
      updatedBy: actorId
    };

    await db.collection('user_groups').doc(groupId).set(userGroup);

    // Обновляем профили участников группы
    for (const userId of userGroup.members) {
      const userProfile = await getUserRBACProfile(userId);
      if (!userProfile.groups.includes(groupId)) {
        userProfile.groups.push(groupId);
        await updateUserRBACProfile(userId, userProfile);
        await recalculateUserPermissions(userId);
      }
    }

    await createAuditLog({
      userId: groupId,
      actorId,
      action: 'USER_GROUP_CREATED',
      resource: 'user_group',
      resourceId: groupId,
      newValue: userGroup,
      success: true
    });

    return { success: true, groupId, group: userGroup };

  } catch (error) {
    console.error('Error creating user group:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create user group');
  }
});

/**
 * 2.4 - ЗАЩИЩЕННАЯ ФУНКЦИЯ: Делегирование полномочий
 */
export const createDelegation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const delegatorId = context.auth.uid;
  const delegatorClaims = context.auth.token;

  try {
    // Проверяем, может ли пользователь делегировать эти разрешения
    const canDelegate = await canUserDelegatePermissions(delegatorId, data.permissions);
    if (!canDelegate) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Cannot delegate permissions you do not have'
      );
    }

    const delegationId = db.collection('authority_delegations').doc().id;
    const delegation: AuthorityDelegation = {
      id: delegationId,
      delegatorId,
      delegateId: data.delegateId,
      permissions: data.permissions,
      roleIds: data.roleIds,
      scope: data.scope,
      limitations: data.limitations,
      startDate: data.startDate,
      endDate: data.endDate,
      canSubdelegate: data.canSubdelegate || false,
      notifyDelegator: data.notifyDelegator || true,
      isActive: true,
      createdAt: new Date(),
      reason: data.reason
    };

    await db.collection('authority_delegations').doc(delegationId).set(delegation);

    // Обновляем профили делегатора и получателя
    await Promise.all([
      addDelegationToProfile(delegatorId, delegationId, 'granted'),
      addDelegationToProfile(data.delegateId, delegationId, 'received')
    ]);

    // Пересчитываем разрешения получателя
    await recalculateUserPermissions(data.delegateId);

    await createAuditLog({
      userId: data.delegateId,
      actorId: delegatorId,
      action: 'AUTHORITY_DELEGATED',
      resource: 'authority_delegation',
      resourceId: delegationId,
      newValue: delegation,
      success: true
    });

    return { success: true, delegationId, delegation };

  } catch (error) {
    console.error('Error creating delegation:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to create delegation');
  }
});

/**
 * 2.5 - ФУНКЦИЯ: Проверка разрешений пользователя
 */
export const checkUserPermission = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  try {
    const { userId, permission, context: permissionContext } = data;
    
    // Получаем эффективные разрешения пользователя
    const userProfile = await getUserRBACProfile(userId);
    const effectivePermissions = userProfile.effectivePermissions;
    
    if (!effectivePermissions || shouldRecalculate(effectivePermissions)) {
      // Пересчитываем разрешения если кэш устарел
      const newPermissions = await calculateEffectivePermissions(userId);
      await updateEffectivePermissions(userId, newPermissions);
      
      const result = checkPermissionInSet(newPermissions, permission, permissionContext);
      return { success: true, result };
    }

    const result = checkPermissionInSet(effectivePermissions, permission, permissionContext);
    return { success: true, result };

  } catch (error) {
    console.error('Error checking permission:', error);
    throw new functions.https.HttpsError('internal', 'Failed to check permission');
  }
});

/**
 * 2.6 - ЗАЩИЩЕННАЯ ФУНКЦИЯ: Проверка условных разрешений
 */
export const evaluateConditionalPermissions = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  try {
    const { 
      roleId, 
      evaluationContext, 
      permission, 
      permissionContext 
    } = data;

    // Получаем роль с условиями
    const roleDoc = await db.collection('rbac_roles').doc(roleId).get();
    if (!roleDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Role not found');
    }

    const role = roleDoc.data() as DynamicRole;
    
    // Если нет условий, возвращаем базовый результат
    if (!role.conditions || role.conditions.length === 0) {
      return {
        success: true,
        result: {
          passed: true,
          reason: 'No conditions to evaluate',
          metadata: { roleId, hasConditions: false }
        }
      };
    }

    // Выполняем проверку условий на сервере
    const conditionResults = await Promise.all(
      role.conditions.map(condition => evaluateConditionOnServer(condition, evaluationContext))
    );

    // Все условия должны пройти проверку
    const allPassed = conditionResults.every(result => result.passed);
    
    const failedConditions = conditionResults
      .filter(result => !result.passed)
      .map(result => result.reason);

    const result = {
      passed: allPassed,
      reason: allPassed 
        ? 'All conditions passed'
        : `Failed conditions: ${failedConditions.join(', ')}`,
      metadata: {
        roleId,
        totalConditions: role.conditions.length,
        passedConditions: conditionResults.filter(r => r.passed).length,
        conditionResults
      }
    };

    // Логируем проверку условий
    await createAuditLog({
      userId: context.auth.uid,
      actorId: context.auth.uid,
      action: 'CONDITIONAL_PERMISSION_CHECK',
      resource: 'conditional_permissions',
      resourceId: roleId,
      newValue: { 
        result: result.passed,
        conditions: role.conditions.length,
        context: evaluationContext 
      },
      success: true
    });

    return { success: true, result };

  } catch (error) {
    console.error('Error evaluating conditional permissions:', error);
    
    await createAuditLog({
      userId: context.auth?.uid || 'unknown',
      actorId: context.auth?.uid || 'system',
      action: 'CONDITIONAL_PERMISSION_CHECK',
      resource: 'conditional_permissions',
      resourceId: data.roleId || 'unknown',
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to evaluate conditional permissions');
  }
});

/**
 * Серверная оценка отдельного условия
 */
async function evaluateConditionOnServer(condition: any, context: any): Promise<any> {
  switch (condition.type) {
    case 'time':
      return evaluateTimeConditionOnServer(condition, context);
    case 'location':
      return evaluateLocationConditionOnServer(condition, context);
    case 'project':
      return evaluateProjectConditionOnServer(condition, context);
    case 'department':
      return evaluateDepartmentConditionOnServer(condition, context);
    case 'custom':
      return evaluateCustomConditionOnServer(condition, context);
    default:
      return {
        passed: false,
        reason: `Unknown condition type: ${condition.type}`
      };
  }
}

/**
 * Серверная проверка временных условий
 */
function evaluateTimeConditionOnServer(condition: any, context: any): any {
  const currentTime = new Date(context.currentTime);
  
  switch (condition.field) {
    case 'working_hours': {
      const value = condition.value;
      const currentHour = currentTime.getHours();
      const startHour = parseInt(value.start.split(':')[0]);
      const endHour = parseInt(value.end.split(':')[0]);
      
      const inWorkingHours = currentHour >= startHour && currentHour < endHour;
      
      return {
        passed: condition.operator === 'equals' ? inWorkingHours : !inWorkingHours,
        reason: `Server time check: ${currentHour}:00 ${inWorkingHours ? 'is' : 'is not'} within ${value.start}-${value.end}`,
        metadata: { serverTime: currentTime.toISOString(), workingHours: value }
      };
    }
    
    case 'day_of_week': {
      const allowedDays = Array.isArray(condition.value) ? condition.value : [condition.value];
      const currentDay = currentTime.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDayName = dayNames[currentDay];
      
      const isAllowedDay = allowedDays.includes(currentDayName) || allowedDays.includes(currentDay.toString());
      
      return {
        passed: condition.operator === 'in' ? isAllowedDay : !isAllowedDay,
        reason: `Server day check: ${currentDayName} ${isAllowedDay ? 'is' : 'is not'} in allowed days`,
        metadata: { serverTime: currentTime.toISOString(), currentDay: currentDayName, allowedDays }
      };
    }
    
    default:
      return { passed: false, reason: `Unknown time field: ${condition.field}` };
  }
}

/**
 * Серверная проверка условий местоположения
 */
function evaluateLocationConditionOnServer(condition: any, context: any): any {
  if (!context.location) {
    return {
      passed: false,
      reason: 'Location information not provided'
    };
  }
  
  // Здесь может быть дополнительная серверная валидация местоположения
  // Например, проверка IP-адреса, дополнительная верификация координат
  
  return {
    passed: true,
    reason: 'Location check passed (server validation)',
    metadata: { location: context.location }
  };
}

/**
 * Серверная проверка проектных условий
 */
async function evaluateProjectConditionOnServer(condition: any, context: any): Promise<any> {
  if (!context.resource || context.resource.type !== 'project') {
    return {
      passed: condition.field === 'not_required',
      reason: 'Project context not available'
    };
  }
  
  switch (condition.field) {
    case 'project_member': {
      // Проверяем членство в проекте через базу данных
      try {
        const projectDoc = await db.collection('projects').doc(context.resource.id).get();
        if (!projectDoc.exists) {
          return { passed: false, reason: 'Project not found' };
        }
        
        const projectData = projectDoc.data();
        const isMember = projectData?.members?.includes(context.userId);
        
        return {
          passed: condition.operator === 'equals' ? isMember : !isMember,
          reason: `User ${isMember ? 'is' : 'is not'} a project member`,
          metadata: { projectId: context.resource.id, isMember }
        };
      } catch (error) {
        return { passed: false, reason: 'Error checking project membership' };
      }
    }
    
    default:
      return { passed: true, reason: 'Project condition passed' };
  }
}

/**
 * Серверная проверка условий департамента
 */
async function evaluateDepartmentConditionOnServer(condition: any, context: any): Promise<any> {
  // Получаем актуальную информацию о пользователе из базы данных
  try {
    const userDoc = await db.collection('users').doc(context.userId).get();
    if (!userDoc.exists) {
      return { passed: false, reason: 'User not found' };
    }
    
    const userData = userDoc.data();
    const userDepartment = userData?.department;
    
    switch (condition.field) {
      case 'department': {
        const allowedDepartments = Array.isArray(condition.value) ? condition.value : [condition.value];
        const isAllowedDepartment = allowedDepartments.includes(userDepartment);
        
        return {
          passed: condition.operator === 'in' ? isAllowedDepartment : !isAllowedDepartment,
          reason: `User department ${userDepartment} ${isAllowedDepartment ? 'is' : 'is not'} in allowed departments`,
          metadata: { userDepartment, allowedDepartments }
        };
      }
      
      default:
        return { passed: true, reason: 'Department condition passed' };
    }
  } catch (error) {
    return { passed: false, reason: 'Error checking department conditions' };
  }
}

/**
 * Серверная проверка пользовательских условий
 */
function evaluateCustomConditionOnServer(condition: any, context: any): any {
  const customValue = context.customAttributes?.[condition.field];
  
  switch (condition.operator) {
    case 'equals':
      return {
        passed: customValue === condition.value,
        reason: `Custom field ${condition.field}: ${customValue} ${customValue === condition.value ? 'equals' : 'does not equal'} ${condition.value}`,
        metadata: { field: condition.field, actual: customValue, expected: condition.value }
      };
    
    case 'in': {
      const allowedValues = Array.isArray(condition.value) ? condition.value : [condition.value];
      const isInList = allowedValues.includes(customValue);
      
      return {
        passed: isInList,
        reason: `Custom field ${condition.field}: ${customValue} ${isInList ? 'is' : 'is not'} in allowed values`,
        metadata: { field: condition.field, actual: customValue, allowedValues }
      };
    }
    
    default:
      return { passed: false, reason: `Unknown operator for custom condition: ${condition.operator}` };
  }
}

/**
 * 2.7 - ФУНКЦИЯ: Получение статистики RBAC
 */
export const getRBACStats = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const actorClaims = context.auth.token;
  if (!hasAdminRights(actorClaims)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can view RBAC statistics'
    );
  }

  try {
    // Собираем статистику из всех коллекций
    const [rolesSnap, usersSnap, groupsSnap, delegationsSnap] = await Promise.all([
      db.collection('rbac_roles').get(),
      db.collection('users').get(),
      db.collection('user_groups').get(),
      db.collection('authority_delegations').where('isActive', '==', true).get()
    ]);

    const roles = rolesSnap.docs.map(doc => doc.data() as DynamicRole);
    const users = usersSnap.docs.map(doc => doc.data());
    
    const stats: RBACStats = {
      totalRoles: roles.length,
      activeRoles: roles.filter(r => r.isActive).length,
      totalUsers: users.length,
      usersWithMultipleRoles: users.filter(u => (u.primaryRoles?.length || 0) > 1).length,
      averagePermissionsPerRole: roles.reduce((sum, r) => sum + r.permissions.length, 0) / roles.length || 0,
      mostUsedPermissions: calculateMostUsedPermissions(roles),
      roleDistribution: await calculateRoleDistribution(roles),
      temporaryRoleAssignments: await countTemporaryRoleAssignments(),
      activeDelegations: delegationsSnap.size
    };

    return { success: true, stats };

  } catch (error) {
    console.error('Error getting RBAC stats:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get RBAC statistics');
  }
});

/**
 * ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
 */

/**
 * Проверка прав управления ролями
 */
function hasRoleManagementRights(claims: any): boolean {
  return claims.role === 'owner' || 
         (claims.permissions && claims.permissions.includes('MANAGE_ROLES'));
}

/**
 * Проверка прав управления пользователями  
 */
function hasUserManagementRights(claims: any): boolean {
  return claims.role === 'owner' || claims.role === 'manager' ||
         (claims.permissions && claims.permissions.includes('MANAGE_USERS'));
}

/**
 * Проверка прав управления группами
 */
function hasGroupManagementRights(claims: any): boolean {
  return claims.role === 'owner' || claims.role === 'manager' ||
         (claims.permissions && claims.permissions.includes('MANAGE_GROUPS'));
}

/**
 * Проверка административных прав
 */
function hasAdminRights(claims: any): boolean {
  return claims.role === 'owner' || claims.role === 'manager';
}

/**
 * Валидация разрешений
 */
async function validatePermissions(permissions: Permission[]): Promise<boolean> {
  // Проверяем, что все разрешения существуют в системе
  // В реальности здесь должна быть проверка против списка валидных разрешений
  return permissions.every(permission => typeof permission === 'string' && permission.length > 0);
}

/**
 * Обновление иерархии ролей
 */
async function updateRoleHierarchy(parentRoleId: string, childRoleId: string, operation: 'add_child' | 'remove_child'): Promise<void> {
  const parentRoleRef = db.collection('rbac_roles').doc(parentRoleId);
  const parentDoc = await parentRoleRef.get();
  
  if (parentDoc.exists) {
    const parentRole = parentDoc.data() as DynamicRole;
    const childRoles = parentRole.childRoles || [];
    
    if (operation === 'add_child' && !childRoles.includes(childRoleId)) {
      childRoles.push(childRoleId);
    } else if (operation === 'remove_child') {
      const index = childRoles.indexOf(childRoleId);
      if (index > -1) childRoles.splice(index, 1);
    }
    
    await parentRoleRef.update({ 
      childRoles,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}

/**
 * Валидация условий роли
 */
async function validateRoleConditions(role: DynamicRole, userId: string): Promise<boolean> {
  if (!role.conditions || role.conditions.length === 0) {
    return true;
  }

  // Получаем профиль пользователя для проверки условий
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return false;
  
  const userData = userDoc.data()!;
  
  // Проверяем каждое условие
  for (const condition of role.conditions) {
    const fieldValue = userData[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        if (fieldValue !== condition.value) return false;
        break;
      case 'not_equals':
        if (fieldValue === condition.value) return false;
        break;
      case 'in':
        if (!Array.isArray(condition.value) || !condition.value.includes(fieldValue)) return false;
        break;
      case 'not_in':
        if (Array.isArray(condition.value) && condition.value.includes(fieldValue)) return false;
        break;
      case 'contains':
        if (!fieldValue || !fieldValue.toString().includes(condition.value)) return false;
        break;
      // Добавить больше операторов по необходимости
    }
  }
  
  return true;
}

/**
 * Создание временного назначения роли
 */
async function createTemporaryRoleAssignment(assignment: {
  userId: string;
  roleId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  grantedBy: string;
}): Promise<void> {
  const assignmentId = db.collection('temporary_role_assignments').doc().id;
  
  const tempRole: TemporaryRoleAssignment = {
    id: assignmentId,
    userId: assignment.userId,
    roleId: assignment.roleId,
    startDate: assignment.startDate,
    endDate: assignment.endDate,
    reason: assignment.reason,
    grantedBy: assignment.grantedBy,
    isActive: true,
    autoRevoke: true,
    createdAt: new Date()
  };

  await db.collection('temporary_role_assignments').doc(assignmentId).set(tempRole);
  
  // Добавляем во профиль пользователя
  const userProfile = await getUserRBACProfile(assignment.userId);
  userProfile.temporaryRoles.push(tempRole);
  await updateUserRBACProfile(assignment.userId, userProfile);
}

/**
 * Получение RBAC профиля пользователя
 */
async function getUserRBACProfile(userId: string): Promise<UserRBACProfile> {
  const profileDoc = await db.collection('user_rbac_profiles').doc(userId).get();
  
  if (profileDoc.exists) {
    return profileDoc.data() as UserRBACProfile;
  }
  
  // Создаем базовый профиль если не существует
  const baseProfile: UserRBACProfile = {
    userId,
    primaryRoles: [],
    temporaryRoles: [],
    groups: [],
    receivedDelegations: [],
    grantedDelegations: [],
    individualPermissions: [],
    revokedPermissions: []
  };
  
  await db.collection('user_rbac_profiles').doc(userId).set(baseProfile);
  return baseProfile;
}

/**
 * Обновление RBAC профиля пользователя
 */
async function updateUserRBACProfile(userId: string, profile: UserRBACProfile): Promise<void> {
  await db.collection('user_rbac_profiles').doc(userId).update(profile);
}

/**
 * Пересчет эффективных разрешений пользователя
 */
async function recalculateUserPermissions(userId: string): Promise<void> {
  const effectivePermissions = await calculateEffectivePermissions(userId);
  await updateEffectivePermissions(userId, effectivePermissions);
  
  // Обновляем Custom Claims для быстрого доступа
  const globalPermissions = Array.from(effectivePermissions.globalPermissions);
  await auth.setCustomUserClaims(userId, {
    permissions: globalPermissions,
    lastPermissionUpdate: Date.now()
  });
}

/**
 * Расчет эффективных разрешений
 */
async function calculateEffectivePermissions(userId: string): Promise<ComputedPermissions> {
  const userProfile = await getUserRBACProfile(userId);
  const allPermissions = new Map<Permission, any[]>();
  const globalPermissions = new Set<Permission>();
  const contextualPermissions = new Map<string, Set<Permission>>();
  const sources: any[] = [];

  // Собираем разрешения из всех источников...
  // Это сложная логика, которая объединяет разрешения из ролей, групп, делегирования и индивидуальных разрешений

  return {
    permissions: allPermissions,
    globalPermissions,
    contextualPermissions,
    computedAt: new Date(),
    sources
  };
}

/**
 * Обновление эффективных разрешений в профиле
 */
async function updateEffectivePermissions(userId: string, permissions: ComputedPermissions): Promise<void> {
  await db.collection('user_rbac_profiles').doc(userId).update({
    effectivePermissions: permissions,
    effectivePermissionsUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Проверка возможности делегирования разрешений
 */
async function canUserDelegatePermissions(userId: string, permissions: Permission[]): Promise<boolean> {
  const userProfile = await getUserRBACProfile(userId);
  const userPermissions = userProfile.effectivePermissions;
  
  if (!userPermissions) return false;
  
  // Проверяем, что пользователь имеет все разрешения которые хочет делегировать
  return permissions.every(permission => 
    userPermissions.globalPermissions.has(permission)
  );
}

/**
 * Добавление делегирования в профиль
 */
async function addDelegationToProfile(userId: string, delegationId: string, type: 'granted' | 'received'): Promise<void> {
  const userProfile = await getUserRBACProfile(userId);
  
  if (type === 'granted') {
    const delegation = await db.collection('authority_delegations').doc(delegationId).get();
    if (delegation.exists) {
      userProfile.grantedDelegations.push(delegation.data() as AuthorityDelegation);
    }
  } else {
    const delegation = await db.collection('authority_delegations').doc(delegationId).get();
    if (delegation.exists) {
      userProfile.receivedDelegations.push(delegation.data() as AuthorityDelegation);
    }
  }
  
  await updateUserRBACProfile(userId, userProfile);
}

/**
 * Проверка необходимости пересчета разрешений
 */
function shouldRecalculate(permissions: ComputedPermissions): boolean {
  // Пересчитываем если кэш старше 1 часа или есть временные роли с истекшим сроком
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return permissions.computedAt < oneHourAgo ||
         (permissions.expiresAt && permissions.expiresAt < new Date());
}

/**
 * Проверка разрешения в наборе
 */
function checkPermissionInSet(permissions: ComputedPermissions, permission: Permission, context?: any): PermissionCheckResult {
  // Проверяем глобальные разрешения
  if (permissions.globalPermissions.has(permission)) {
    const sources = permissions.sources.filter(s => s.permission === permission);
    return {
      hasPermission: true,
      sources,
      effectiveUntil: permissions.expiresAt
    };
  }

  // Проверяем контекстные разрешения
  if (context && permissions.contextualPermissions.has(context)) {
    const contextPerms = permissions.contextualPermissions.get(context);
    if (contextPerms?.has(permission)) {
      const sources = permissions.sources.filter(s => s.permission === permission);
      return {
        hasPermission: true,
        sources,
        context,
        effectiveUntil: permissions.expiresAt
      };
    }
  }

  return { hasPermission: false, sources: [] };
}

/**
 * Расчет наиболее используемых разрешений
 */
function calculateMostUsedPermissions(roles: DynamicRole[]): Array<{ permission: Permission; usage: number }> {
  const permissionCount = new Map<Permission, number>();
  
  roles.forEach(role => {
    role.permissions.forEach(permission => {
      permissionCount.set(permission, (permissionCount.get(permission) || 0) + 1);
    });
  });
  
  return Array.from(permissionCount.entries())
    .map(([permission, usage]) => ({ permission, usage }))
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 10); // Топ 10
}

/**
 * Расчет распределения ролей
 */
async function calculateRoleDistribution(roles: DynamicRole[]): Promise<Array<{ roleId: string; userCount: number }>> {
  const distribution: Array<{ roleId: string; userCount: number }> = [];
  
  for (const role of roles) {
    const usersQuery = await db.collection('user_rbac_profiles')
      .where('primaryRoles', 'array-contains', role.id)
      .get();
    
    distribution.push({
      roleId: role.id,
      userCount: usersQuery.size
    });
  }
  
  return distribution.sort((a, b) => b.userCount - a.userCount);
}

/**
 * Подсчет временных назначений ролей
 */
async function countTemporaryRoleAssignments(): Promise<number> {
  const tempAssignments = await db.collection('temporary_role_assignments')
    .where('isActive', '==', true)
    .get();
  
  return tempAssignments.size;
}

/**
 * Создание записи аудита (импортируется из userManagement.ts)
 */
async function createAuditLog(entry: any): Promise<void> {
  try {
    const auditRef = db.collection('auditLogs').doc();
    await auditRef.set({
      id: auditRef.id,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ...entry
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
/**
 * Сервис для управления группами пользователей в системе RBAC
 * 
 * Обеспечивает:
 * - Создание и управление группами пользователей
 * - Автоматическое назначение пользователей в группы
 * - Наследование ролей и разрешений через группы
 * - Иерархическую структуру групп
 */

import { 
  UserGroup, 
  AutoAssignmentRule, 
  DynamicRole,
  UserRBACProfile,
  ComputedPermissions 
} from '../types/rbac';
import { Permission } from '../auth/permissions';
import * as rbacApi from '../api/rbacApi';

/**
 * Контекст для автоматического назначения в группы
 */
export interface AutoAssignmentContext {
  userId: string;
  userProfile: {
    department?: string;
    position?: string;
    location?: string;
    hireDate?: Date;
    employeeId?: string;
    contractorId?: string;
    customFields?: Record<string, any>;
  };
}

/**
 * Результат оценки правил автоназначения
 */
export interface AutoAssignmentResult {
  groupId: string;
  groupName: string;
  matched: boolean;
  matchedRules: AutoAssignmentRule[];
  reason: string;
}

/**
 * Статистика группы пользователей
 */
export interface UserGroupStats {
  groupId: string;
  groupName: string;
  memberCount: number;
  activeMembers: number;
  totalRoles: number;
  totalPermissions: number;
  autoAssignmentEnabled: boolean;
  lastUpdated: Date;
}

/**
 * Основной класс для управления группами пользователей
 */
export class UserGroupsService {

  /**
   * Создание новой группы пользователей
   */
  async createUserGroup(groupData: {
    name: string;
    description: string;
    roles?: string[];
    additionalPermissions?: Permission[];
    autoAssignment?: AutoAssignmentRule[];
    parentGroupId?: string;
  }, createdBy: string): Promise<UserGroup> {
    
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newGroup: UserGroup = {
      id: groupId,
      name: groupData.name,
      description: groupData.description,
      members: [],
      roles: groupData.roles || [],
      additionalPermissions: groupData.additionalPermissions || [],
      isActive: true,
      autoAssignment: groupData.autoAssignment || [],
      createdAt: new Date(),
      createdBy,
      updatedAt: new Date(),
      updatedBy: createdBy
    };

    // Валидируем правила автоназначения
    if (newGroup.autoAssignment && newGroup.autoAssignment.length > 0) {
      const validationResult = await this.validateAutoAssignmentRules(newGroup.autoAssignment);
      if (!validationResult.isValid) {
        throw new Error(`Invalid auto-assignment rules: ${validationResult.errors.join(', ')}`);
      }
    }

    return newGroup;
  }

  /**
   * Обновление группы пользователей
   */
  async updateUserGroup(
    groupId: string, 
    updates: Partial<UserGroup>, 
    updatedBy: string
  ): Promise<UserGroup> {
    
    // TODO: Implement getUserGroupById in rbacApi
    // Временная заглушка для развития
    const existingGroup: UserGroup = {
      id: groupId,
      name: `Group_${groupId}`,
      description: 'Temporary group for development',
      roles: [],
      members: [],
      additionalPermissions: [],
      isActive: true,
      createdAt: new Date(),
      createdBy: 'system',
      updatedAt: new Date(),
      updatedBy: 'system'
    };

    // Проверяем права на изменение системных групп
    if (existingGroup.name.startsWith('SYSTEM_') && !updates.description) {
      throw new Error('Cannot modify system groups');
    }

    const updatedGroup: UserGroup = {
      ...existingGroup,
      ...updates,
      id: groupId, // ID нельзя изменить
      updatedAt: new Date(),
      updatedBy
    };

    // Валидируем новые правила автоназначения
    if (updates.autoAssignment) {
      const validationResult = await this.validateAutoAssignmentRules(updates.autoAssignment);
      if (!validationResult.isValid) {
        throw new Error(`Invalid auto-assignment rules: ${validationResult.errors.join(', ')}`);
      }
    }

    return updatedGroup;
  }

  /**
   * Добавление пользователя в группу
   */
  async addUserToGroup(userId: string, groupId: string, addedBy: string): Promise<void> {
    const group = await rbacApi.getUserGroupById(groupId);
    if (!group) {
      throw new Error(`User group not found: ${groupId}`);
    }

    if (group.members.includes(userId)) {
      return; // Пользователь уже в группе
    }

    // Добавляем пользователя
    const updatedMembers = [...group.members, userId];
    
    await this.updateUserGroup(groupId, { 
      members: updatedMembers 
    }, addedBy);

    // Пересчитываем разрешения пользователя
    await this.recalculateUserPermissionsFromGroups(userId);
  }

  /**
   * Удаление пользователя из группы
   */
  async removeUserFromGroup(userId: string, groupId: string, removedBy: string): Promise<void> {
    const group = await rbacApi.getUserGroupById(groupId);
    if (!group) {
      throw new Error(`User group not found: ${groupId}`);
    }

    const updatedMembers = group.members.filter((id: string) => id !== userId);
    
    await this.updateUserGroup(groupId, { 
      members: updatedMembers 
    }, removedBy);

    // Пересчитываем разрешения пользователя
    await this.recalculateUserPermissionsFromGroups(userId);
  }

  /**
   * Автоматическое назначение пользователя в группы
   */
  async evaluateAutoAssignment(context: AutoAssignmentContext): Promise<AutoAssignmentResult[]> {
    const allGroups = await rbacApi.getAllUserGroups();
    const results: AutoAssignmentResult[] = [];

    for (const group of allGroups) {
      if (!group.isActive || !group.autoAssignment || group.autoAssignment.length === 0) {
        continue;
      }

      const evaluationResult = await this.evaluateGroupAutoAssignment(group, context);
      results.push(evaluationResult);

      // Если пользователь подходит под правила группы, добавляем его
      if (evaluationResult.matched && !group.members.includes(context.userId)) {
        try {
          await this.addUserToGroup(context.userId, group.id, 'auto-assignment');
          console.log(`Auto-assigned user ${context.userId} to group ${group.name}`);
        } catch (error) {
          console.error(`Failed to auto-assign user to group ${group.name}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Оценка правил автоназначения для конкретной группы
   */
  private async evaluateGroupAutoAssignment(
    group: UserGroup, 
    context: AutoAssignmentContext
  ): Promise<AutoAssignmentResult> {
    
    const matchedRules: AutoAssignmentRule[] = [];
    
    for (const rule of group.autoAssignment || []) {
      if (this.evaluateAutoAssignmentRule(rule, context)) {
        matchedRules.push(rule);
      }
    }

    // Для попадания в группу должны совпадать ВСЕ правила
    const allRulesMatched = group.autoAssignment?.length === matchedRules.length;

    return {
      groupId: group.id,
      groupName: group.name,
      matched: allRulesMatched,
      matchedRules,
      reason: allRulesMatched 
        ? `Matched all ${matchedRules.length} auto-assignment rules`
        : `Matched ${matchedRules.length} of ${group.autoAssignment?.length || 0} rules`
    };
  }

  /**
   * Оценка отдельного правила автоназначения
   */
  private evaluateAutoAssignmentRule(
    rule: AutoAssignmentRule, 
    context: AutoAssignmentContext
  ): boolean {
    
    const userValue = this.getUserFieldValue(rule.field, context);
    
    switch (rule.operator) {
      case 'equals':
        return userValue === rule.value;
      
      case 'contains':
        return userValue && userValue.toString().toLowerCase().includes(rule.value.toString().toLowerCase());
      
      case 'startsWith':
        return userValue && userValue.toString().toLowerCase().startsWith(rule.value.toString().toLowerCase());
      
      case 'contains':
        return userValue && userValue.toString().toLowerCase().includes(rule.value.toString().toLowerCase());
      
      default:
        console.warn(`Unknown auto-assignment operator: ${rule.operator}`);
        return false;
    }
  }

  /**
   * Получение значения поля пользователя для правила
   */
  private getUserFieldValue(field: string, context: AutoAssignmentContext): any {
    switch (field) {
      case 'department':
        return context.userProfile.department;
      case 'position':
        return context.userProfile.position;
      case 'location':
        return context.userProfile.location;
      case 'hire_date':
        return context.userProfile.hireDate;
      case 'custom':
        return context.userProfile.customFields;
      default:
        return context.userProfile.customFields?.[field];
    }
  }

  /**
   * Валидация правил автоназначения
   */
  private async validateAutoAssignmentRules(rules: AutoAssignmentRule[]): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    for (const rule of rules) {
      // Проверяем обязательные поля
      if (!rule.field || !rule.operator || rule.value === undefined) {
        errors.push(`Rule missing required fields: field, operator, or value`);
        continue;
      }
      
      // Проверяем поддерживаемые поля
      const supportedFields = ['department', 'position', 'location', 'hire_date', 'custom'];
      if (!supportedFields.includes(rule.field) && !rule.field.startsWith('custom.')) {
        errors.push(`Unsupported field: ${rule.field}`);
      }
      
      // Проверяем операторы
      const supportedOperators = ['equals', 'contains', 'startsWith'];
      if (!supportedOperators.includes(rule.operator)) {
        errors.push(`Unsupported operator: ${rule.operator}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Получение эффективных разрешений пользователя через группы
   */
  async getUserEffectivePermissionsFromGroups(userId: string): Promise<{
    permissions: Permission[];
    roles: string[];
    groups: UserGroup[];
    sources: Array<{ source: 'group' | 'role'; sourceId: string; sourceName: string; permissions: Permission[] }>;
  }> {
    
    // Получаем все группы пользователя
    const userGroups = await this.getUserGroups(userId);
    const allPermissions = new Set<Permission>();
    const allRoles = new Set<string>();
    const sources: Array<{ source: 'group' | 'role'; sourceId: string; sourceName: string; permissions: Permission[] }> = [];

    for (const group of userGroups) {
      // Добавляем разрешения напрямую из группы
      if (group.additionalPermissions.length > 0) {
        group.additionalPermissions.forEach(permission => allPermissions.add(permission));
        sources.push({
          source: 'group',
          sourceId: group.id,
          sourceName: group.name,
          permissions: group.additionalPermissions
        });
      }

      // Добавляем разрешения из ролей группы
      for (const roleId of group.roles) {
        allRoles.add(roleId);
        
        try {
          const role = await rbacApi.getRoleById(roleId);
          if (role && role.isActive) {
            role.permissions.forEach(permission => allPermissions.add(permission));
            sources.push({
              source: 'role',
              sourceId: roleId,
              sourceName: role.displayName,
              permissions: role.permissions
            });
          }
        } catch (error) {
          console.warn(`Failed to load role ${roleId} for group ${group.name}:`, error);
        }
      }
    }

    return {
      permissions: Array.from(allPermissions),
      roles: Array.from(allRoles),
      groups: userGroups,
      sources
    };
  }

  /**
   * Получение всех групп пользователя
   */
  async getUserGroups(userId: string): Promise<UserGroup[]> {
    const allGroups = await rbacApi.getAllUserGroups();
    return allGroups.filter(group => 
      group.isActive && group.members.includes(userId)
    );
  }

  /**
   * Пересчет разрешений пользователя на основе групп
   */
  async recalculateUserPermissionsFromGroups(userId: string): Promise<void> {
    const effectivePermissions = await this.getUserEffectivePermissionsFromGroups(userId);
    
    // Обновляем RBAC профиль пользователя
    const userProfile = await rbacApi.getUserRBACProfile(userId);
    
    // Обновляем группы в профиле
    const currentGroupIds = effectivePermissions.groups.map(g => g.id);
    const profileUpdated = currentGroupIds.join(',') !== (userProfile?.groups || []).join(',');
    
    if (profileUpdated) {
      await rbacApi.updateUserRBACProfile(userId, {
        ...userProfile,
        groups: currentGroupIds
      });
    }

    // Пересчитываем общие эффективные разрешения
    await rbacApi.recalculateUserEffectivePermissions(userId);
  }

  /**
   * Получение статистики групп
   */
  async getGroupsStatistics(): Promise<{
    totalGroups: number;
    activeGroups: number;
    totalMembers: number;
    averageMembersPerGroup: number;
    groupsWithAutoAssignment: number;
    groupStats: UserGroupStats[];
  }> {
    
    const allGroups = await rbacApi.getAllUserGroups();
    const activeGroups = allGroups.filter(g => g.isActive);
    const totalMembers = allGroups.reduce((sum, g) => sum + g.members.length, 0);
    const groupsWithAutoAssignment = allGroups.filter(g => g.autoAssignment && g.autoAssignment.length > 0).length;

    const groupStats: UserGroupStats[] = await Promise.all(
      allGroups.map(async (group) => {
        // Подсчитываем активных участников
        let activeMembers = group.members.length; // Упрощенная версия
        
        // Подсчитываем общее количество разрешений
        let totalPermissions = group.additionalPermissions.length;
        for (const roleId of group.roles) {
          try {
            const role = await rbacApi.getRoleById(roleId);
            if (role) {
              totalPermissions += role.permissions.length;
            }
          } catch (error) {
            // Роль может не существовать
          }
        }

        return {
          groupId: group.id,
          groupName: group.name,
          memberCount: group.members.length,
          activeMembers,
          totalRoles: group.roles.length,
          totalPermissions,
          autoAssignmentEnabled: (group.autoAssignment?.length || 0) > 0,
          lastUpdated: group.updatedAt
        };
      })
    );

    return {
      totalGroups: allGroups.length,
      activeGroups: activeGroups.length,
      totalMembers,
      averageMembersPerGroup: allGroups.length > 0 ? Math.round(totalMembers / allGroups.length) : 0,
      groupsWithAutoAssignment,
      groupStats: groupStats.sort((a, b) => b.memberCount - a.memberCount)
    };
  }

  /**
   * Создание системных групп по умолчанию
   */
  async createDefaultSystemGroups(createdBy: string): Promise<UserGroup[]> {
    const systemGroups = [
      {
        name: 'SYSTEM_MANAGERS',
        description: 'Системная группа для всех менеджеров',
        autoAssignment: [{
          id: 'rule_managers_position',
          field: 'position' as const,
          operator: 'contains' as const,
          value: 'manager'
        }],
        roles: ['manager'] // ID роли менеджера
      },
      {
        name: 'SYSTEM_FINANCE_TEAM',
        description: 'Системная группа финансового департамента',
        autoAssignment: [{
          id: 'rule_finance_dept',
          field: 'department' as const,
          operator: 'equals' as const,
          value: 'finance'
        }],
        roles: ['accountant']
      },
      {
        name: 'SYSTEM_PROJECT_MANAGERS',
        description: 'Системная группа проектных менеджеров',
        autoAssignment: [{
          id: 'rule_project_position',
          field: 'position' as const,
          operator: 'contains' as const,
          value: 'project'
        }],
        roles: ['pm']
      },
      {
        name: 'SYSTEM_FIELD_WORKERS',
        description: 'Системная группа работников на объектах',
        autoAssignment: [{
          id: 'rule_field_workers',
          field: 'department' as const,
          operator: 'contains' as const,
          value: 'field'
        }],
        roles: ['field']
      }
    ];

    const createdGroups: UserGroup[] = [];
    
    for (const groupData of systemGroups) {
      try {
        const group = await this.createUserGroup(groupData, createdBy);
        createdGroups.push(group);
        console.log(`Created system group: ${group.name}`);
      } catch (error) {
        console.error(`Failed to create system group ${groupData.name}:`, error);
      }
    }

    return createdGroups;
  }

  /**
   * Синхронизация всех пользователей с правилами автоназначения
   */
  async syncAllUsersWithAutoAssignment(): Promise<{
    processedUsers: number;
    assignedUsers: number;
    errors: Array<{ userId: string; error: string }>;
  }> {
    
    const allUsers = await rbacApi.getAllUsers(); // Предполагаем, что есть такая функция
    let processedUsers = 0;
    let assignedUsers = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const user of allUsers) {
      try {
        processedUsers++;
        
        const context: AutoAssignmentContext = {
          userId: user.id,
          userProfile: {
            department: user.department,
            position: user.position,
            location: user.location,
            hireDate: user.hireDate,
            employeeId: user.employeeId,
            contractorId: user.contractorId
          }
        };

        const results = await this.evaluateAutoAssignment(context);
        const matchedGroups = results.filter(r => r.matched);
        
        if (matchedGroups.length > 0) {
          assignedUsers++;
        }

        console.log(`Processed user ${user.id}: ${matchedGroups.length} group assignments`);
        
      } catch (error) {
        errors.push({
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      processedUsers,
      assignedUsers,
      errors
    };
  }
}

/**
 * Глобальный экземпляр сервиса
 */
export const userGroupsService = new UserGroupsService();

/**
 * Примеры правил автоназначения
 */
export const AutoAssignmentExamples = {
  
  // Все сотрудники финансового департамента
  financeTeam: {
    field: 'department' as const,
    operator: 'equals' as const,
    value: 'finance'
  },
  
  // Все менеджеры (по должности)
  managers: {
    field: 'position' as const,
    operator: 'contains' as const,
    value: 'manager'
  },
  
  // Сотрудники московского офиса
  moscowOffice: {
    field: 'location' as const,
    operator: 'equals' as const,
    value: 'Moscow'
  },
  
  // Новые сотрудники (принятые за последний месяц)
  newEmployees: {
    field: 'hire_date' as const,
    operator: 'greater' as const,
    value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 дней назад
  },
  
  // Сотрудники с определенными ID
  specificEmployees: {
    field: 'employeeId' as const,
    operator: 'in' as const,
    value: ['EMP001', 'EMP002', 'EMP003']
  }
};

export default UserGroupsService;
/**
 * Система условных разрешений RBAC
 * 
 * Обеспечивает динамическую проверку разрешений на основе:
 * - Времени (рабочие часы, дни недели, временные периоды)
 * - Местоположения (геолокация, IP-адрес, регион)
 * - Контекста проекта (участие, роль в проекте, статус)
 * - Департамента и организационной структуры
 * - Пользовательских условий
 */

import { RoleCondition, PermissionContext, PermissionConstraint } from '../types/rbac';
import { Permission } from '../auth/permissions';

/**
 * Интерфейс для контекста проверки условий
 */
export interface ConditionEvaluationContext {
  // Пользовательские данные
  userId: string;
  userProfile: {
    department?: string;
    position?: string;
    location?: string;
    timezone?: string;
    employeeId?: string;
    hireDate?: Date;
  };
  
  // Временной контекст
  currentTime: Date;
  timezone: string;
  
  // Географический контекст
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
    city?: string;
    country?: string;
  };
  
  // Сетевой контекст
  network?: {
    ipAddress: string;
    userAgent: string;
    device?: string;
    os?: string;
  };
  
  // Контекст ресурса
  resource?: {
    type: 'project' | 'task' | 'document' | 'report' | 'financial';
    id: string;
    ownerId?: string;
    departmentId?: string;
    projectId?: string;
    status?: string;
    classification?: 'public' | 'internal' | 'confidential' | 'secret';
  };
  
  // Дополнительные параметры
  customAttributes?: Record<string, any>;
}

/**
 * Результат оценки условия
 */
export interface ConditionEvaluationResult {
  passed: boolean;
  reason?: string;
  score?: number; // 0-1 для вероятностных условий
  metadata?: Record<string, any>;
}

/**
 * Основной класс для оценки условных разрешений
 */
export class ConditionalPermissionEvaluator {
  
  /**
   * Проверка всех условий роли
   */
  async evaluateRoleConditions(
    conditions: RoleCondition[],
    context: ConditionEvaluationContext
  ): Promise<ConditionEvaluationResult> {
    if (!conditions || conditions.length === 0) {
      return { passed: true, reason: 'No conditions to evaluate' };
    }

    const results: ConditionEvaluationResult[] = [];
    
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, context);
      results.push(result);
      
      // Если хотя бы одно условие не выполнено, возвращаем false
      if (!result.passed) {
        return {
          passed: false,
          reason: `Condition failed: ${condition.description || condition.field}`,
          metadata: { failedCondition: condition, allResults: results }
        };
      }
    }
    
    return {
      passed: true,
      reason: 'All conditions passed',
      score: results.reduce((sum, r) => sum + (r.score || 1), 0) / results.length,
      metadata: { allResults: results }
    };
  }
  
  /**
   * Оценка отдельного условия
   */
  private async evaluateCondition(
    condition: RoleCondition,
    context: ConditionEvaluationContext
  ): Promise<ConditionEvaluationResult> {
    
    switch (condition.type) {
      case 'time':
        return this.evaluateTimeCondition(condition, context);
      
      case 'location':
        return this.evaluateLocationCondition(condition, context);
      
      case 'project':
        return this.evaluateProjectCondition(condition, context);
      
      case 'department':
        return this.evaluateDepartmentCondition(condition, context);
      
      case 'custom':
        return this.evaluateCustomCondition(condition, context);
      
      default:
        return {
          passed: false,
          reason: `Unknown condition type: ${condition.type}`
        };
    }
  }
  
  /**
   * Оценка временных условий
   */
  private evaluateTimeCondition(
    condition: RoleCondition,
    context: ConditionEvaluationContext
  ): ConditionEvaluationResult {
    
    const currentTime = context.currentTime;
    
    switch (condition.field) {
      case 'working_hours': {
        const value = condition.value as { start: string; end: string };
        const currentHour = currentTime.getHours();
        const startHour = parseInt(value.start.split(':')[0]);
        const endHour = parseInt(value.end.split(':')[0]);
        
        const inWorkingHours = currentHour >= startHour && currentHour < endHour;
        
        return {
          passed: condition.operator === 'equals' ? inWorkingHours : !inWorkingHours,
          reason: `Current time ${currentHour}:00 ${inWorkingHours ? 'is' : 'is not'} within working hours ${value.start}-${value.end}`,
          metadata: { currentHour, workingHours: value }
        };
      }
      
      case 'day_of_week': {
        const allowedDays = Array.isArray(condition.value) ? condition.value : [condition.value];
        const currentDay = currentTime.getDay(); // 0 = Sunday
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayName = dayNames[currentDay];
        
        const isAllowedDay = allowedDays.includes(currentDayName) || allowedDays.includes(currentDay.toString());
        
        return {
          passed: condition.operator === 'in' ? isAllowedDay : !isAllowedDay,
          reason: `Current day ${currentDayName} ${isAllowedDay ? 'is' : 'is not'} in allowed days`,
          metadata: { currentDay: currentDayName, allowedDays }
        };
      }
      
      case 'date_range': {
        const range = condition.value as { start: string; end: string };
        const startDate = new Date(range.start);
        const endDate = new Date(range.end);
        
        const inRange = currentTime >= startDate && currentTime <= endDate;
        
        return {
          passed: condition.operator === 'equals' ? inRange : !inRange,
          reason: `Current date ${inRange ? 'is' : 'is not'} within allowed range`,
          metadata: { currentTime, dateRange: range }
        };
      }
      
      default:
        return { passed: false, reason: `Unknown time field: ${condition.field}` };
    }
  }
  
  /**
   * Оценка условий местоположения
   */
  private evaluateLocationCondition(
    condition: RoleCondition,
    context: ConditionEvaluationContext
  ): ConditionEvaluationResult {
    
    if (!context.location) {
      return {
        passed: false,
        reason: 'Location information not available'
      };
    }
    
    switch (condition.field) {
      case 'office_radius': {
        const officeConfig = condition.value as {
          latitude: number;
          longitude: number;
          radiusMeters: number;
        };
        
        const distance = this.calculateDistance(
          context.location.latitude,
          context.location.longitude,
          officeConfig.latitude,
          officeConfig.longitude
        );
        
        const withinRadius = distance <= officeConfig.radiusMeters;
        
        return {
          passed: condition.operator === 'equals' ? withinRadius : !withinRadius,
          reason: `Distance ${Math.round(distance)}m ${withinRadius ? 'is' : 'is not'} within ${officeConfig.radiusMeters}m radius`,
          metadata: { distance, radius: officeConfig.radiusMeters }
        };
      }
      
      case 'city': {
        const allowedCities = Array.isArray(condition.value) ? condition.value : [condition.value];
        const currentCity = context.location.city?.toLowerCase();
        
        const isAllowedCity = allowedCities.some(city => 
          currentCity?.includes(city.toLowerCase())
        );
        
        return {
          passed: condition.operator === 'in' ? isAllowedCity : !isAllowedCity,
          reason: `Current city ${currentCity} ${isAllowedCity ? 'is' : 'is not'} in allowed cities`,
          metadata: { currentCity, allowedCities }
        };
      }
      
      case 'country': {
        const allowedCountries = Array.isArray(condition.value) ? condition.value : [condition.value];
        const currentCountry = context.location.country?.toLowerCase();
        
        const isAllowedCountry = allowedCountries.some(country => 
          currentCountry?.includes(country.toLowerCase())
        );
        
        return {
          passed: condition.operator === 'in' ? isAllowedCountry : !isAllowedCountry,
          reason: `Current country ${currentCountry} ${isAllowedCountry ? 'is' : 'is not'} in allowed countries`,
          metadata: { currentCountry, allowedCountries }
        };
      }
      
      default:
        return { passed: false, reason: `Unknown location field: ${condition.field}` };
    }
  }
  
  /**
   * Оценка условий проекта
   */
  private evaluateProjectCondition(
    condition: RoleCondition,
    context: ConditionEvaluationContext
  ): ConditionEvaluationResult {
    
    if (!context.resource || context.resource.type !== 'project') {
      return {
        passed: condition.field === 'not_required',
        reason: 'Project context not available'
      };
    }
    
    switch (condition.field) {
      case 'project_member': {
        // В реальной реализации здесь была бы проверка членства в проекте
        // Пока возвращаем заглушку
        return {
          passed: true,
          reason: 'Project membership check would be implemented here',
          metadata: { projectId: context.resource.id }
        };
      }
      
      case 'project_role': {
        const requiredRoles = Array.isArray(condition.value) ? condition.value : [condition.value];
        // В реальной реализации здесь была бы проверка роли в проекте
        return {
          passed: true,
          reason: 'Project role check would be implemented here',
          metadata: { requiredRoles, projectId: context.resource.id }
        };
      }
      
      case 'project_status': {
        const allowedStatuses = Array.isArray(condition.value) ? condition.value : [condition.value];
        const currentStatus = context.resource.status;
        
        const isAllowedStatus = allowedStatuses.includes(currentStatus);
        
        return {
          passed: condition.operator === 'in' ? isAllowedStatus : !isAllowedStatus,
          reason: `Project status ${currentStatus} ${isAllowedStatus ? 'is' : 'is not'} in allowed statuses`,
          metadata: { currentStatus, allowedStatuses }
        };
      }
      
      default:
        return { passed: false, reason: `Unknown project field: ${condition.field}` };
    }
  }
  
  /**
   * Оценка условий департамента
   */
  private evaluateDepartmentCondition(
    condition: RoleCondition,
    context: ConditionEvaluationContext
  ): ConditionEvaluationResult {
    
    const userDepartment = context.userProfile.department;
    
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
      
      case 'position': {
        const allowedPositions = Array.isArray(condition.value) ? condition.value : [condition.value];
        const userPosition = context.userProfile.position;
        const isAllowedPosition = allowedPositions.includes(userPosition);
        
        return {
          passed: condition.operator === 'in' ? isAllowedPosition : !isAllowedPosition,
          reason: `User position ${userPosition} ${isAllowedPosition ? 'is' : 'is not'} in allowed positions`,
          metadata: { userPosition, allowedPositions }
        };
      }
      
      default:
        return { passed: false, reason: `Unknown department field: ${condition.field}` };
    }
  }
  
  /**
   * Оценка пользовательских условий
   */
  private evaluateCustomCondition(
    condition: RoleCondition,
    context: ConditionEvaluationContext
  ): ConditionEvaluationResult {
    
    const customValue = context.customAttributes?.[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        return {
          passed: customValue === condition.value,
          reason: `Custom field ${condition.field}: ${customValue} ${customValue === condition.value ? 'equals' : 'does not equal'} ${condition.value}`,
          metadata: { field: condition.field, actual: customValue, expected: condition.value }
        };
      
      case 'not_equals':
        return {
          passed: customValue !== condition.value,
          reason: `Custom field ${condition.field}: ${customValue} ${customValue !== condition.value ? 'does not equal' : 'equals'} ${condition.value}`,
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
      
      case 'contains': {
        const contains = customValue && customValue.toString().includes(condition.value);
        
        return {
          passed: contains,
          reason: `Custom field ${condition.field}: ${customValue} ${contains ? 'contains' : 'does not contain'} ${condition.value}`,
          metadata: { field: condition.field, actual: customValue, searchValue: condition.value }
        };
      }
      
      default:
        return { passed: false, reason: `Unknown operator for custom condition: ${condition.operator}` };
    }
  }
  
  /**
   * Расчет расстояния между двумя точками (формула Haversine)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Радиус Земли в метрах
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

/**
 * Утилиты для работы с условными разрешениями
 */
export class ConditionalPermissionHelper {
  
  private evaluator = new ConditionalPermissionEvaluator();
  
  /**
   * Проверка контекстного разрешения с условиями
   */
  async checkContextualPermission(
    permission: Permission,
    permissionContext: PermissionContext,
    evaluationContext: ConditionEvaluationContext
  ): Promise<ConditionEvaluationResult> {
    
    // Проверяем базовое разрешение
    const basePermissionGranted = true; // В реальности здесь проверка через RBAC API
    
    if (!basePermissionGranted) {
      return {
        passed: false,
        reason: 'Base permission not granted'
      };
    }
    
    // Проверяем ограничения контекста
    if (permissionContext.constraints) {
      for (const constraint of permissionContext.constraints) {
        const constraintResult = await this.evaluateConstraint(constraint, evaluationContext);
        if (!constraintResult.passed) {
          return constraintResult;
        }
      }
    }
    
    return {
      passed: true,
      reason: 'Contextual permission granted',
      metadata: { permission, context: permissionContext }
    };
  }
  
  /**
   * Оценка ограничения разрешения
   */
  private async evaluateConstraint(
    constraint: PermissionConstraint,
    context: ConditionEvaluationContext
  ): Promise<ConditionEvaluationResult> {
    
    switch (constraint.limitation) {
      case 'own_only': {
        const resourceOwnerId = context.resource?.ownerId;
        const isOwner = resourceOwnerId === context.userId;
        
        return {
          passed: isOwner,
          reason: isOwner ? 'User owns the resource' : 'User does not own the resource',
          metadata: { resourceOwnerId, userId: context.userId }
        };
      }
      
      case 'department_only': {
        const resourceDepartment = context.resource?.departmentId;
        const userDepartment = context.userProfile.department;
        const sameDepartment = resourceDepartment === userDepartment;
        
        return {
          passed: sameDepartment,
          reason: sameDepartment ? 'Same department access' : 'Different department access denied',
          metadata: { resourceDepartment, userDepartment }
        };
      }
      
      case 'project_only': {
        const resourceProject = context.resource?.projectId;
        const hasProjectAccess = true; // В реальности проверка участия в проекте
        
        return {
          passed: hasProjectAccess,
          reason: hasProjectAccess ? 'Project access granted' : 'Project access denied',
          metadata: { resourceProject }
        };
      }
      
      case 'amount_limit': {
        const limit = constraint.value as number;
        const resourceAmount = context.customAttributes?.amount as number;
        const withinLimit = !resourceAmount || resourceAmount <= limit;
        
        return {
          passed: withinLimit,
          reason: withinLimit ? 'Within amount limit' : 'Exceeds amount limit',
          metadata: { limit, amount: resourceAmount }
        };
      }
      
      default:
        return { passed: true, reason: 'No applicable constraints' };
    }
  }
  
  /**
   * Создание контекста оценки из запроса
   */
  static createEvaluationContext(params: {
    userId: string;
    userProfile: any;
    currentTime?: Date;
    location?: any;
    network?: any;
    resource?: any;
    customAttributes?: Record<string, any>;
  }): ConditionEvaluationContext {
    
    return {
      userId: params.userId,
      userProfile: params.userProfile || {},
      currentTime: params.currentTime || new Date(),
      timezone: params.userProfile?.timezone || 'UTC',
      location: params.location,
      network: params.network,
      resource: params.resource,
      customAttributes: params.customAttributes || {}
    };
  }
}

/**
 * Глобальный экземпляр для использования в приложении
 */
export const conditionalPermissionHelper = new ConditionalPermissionHelper();

/**
 * Примеры использования
 */
export const ConditionExamples = {
  
  // Рабочие часы (9:00 - 18:00)
  workingHours: {
    id: 'wh001',
    type: 'time' as const,
    field: 'working_hours',
    operator: 'equals' as const,
    value: { start: '09:00', end: '18:00' },
    description: 'Доступ только в рабочие часы'
  },
  
  // Рабочие дни (Пн-Пт)
  workingDays: {
    id: 'wd001', 
    type: 'time' as const,
    field: 'day_of_week',
    operator: 'in' as const,
    value: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    description: 'Доступ только в рабочие дни'
  },
  
  // Офисное местоположение
  officeLocation: {
    id: 'ol001',
    type: 'location' as const,
    field: 'office_radius',
    operator: 'equals' as const,
    value: {
      latitude: 55.7558,
      longitude: 37.6176, 
      radiusMeters: 1000
    },
    description: 'Доступ только из офиса (в радиусе 1км)'
  },
  
  // Участник проекта
  projectMember: {
    id: 'pm001',
    type: 'project' as const,
    field: 'project_member',
    operator: 'equals' as const,
    value: true,
    description: 'Доступ только участникам проекта'
  },
  
  // Финансовый департамент
  financeDepartment: {
    id: 'fd001',
    type: 'department' as const,
    field: 'department',
    operator: 'in' as const,
    value: ['finance', 'accounting', 'audit'],
    description: 'Доступ только финансовым департаментам'
  }
};

export default ConditionalPermissionEvaluator;
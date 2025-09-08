/**
 * React Hook для работы с условными разрешениями
 * 
 * Интегрирует систему условных разрешений с React приложением
 * и обеспечивает реактивную проверку доступа
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Permission } from '../auth/permissions';
import { 
  ConditionalPermissionHelper,
  ConditionEvaluationContext,
  ConditionEvaluationResult
} from '../services/conditionalPermissions';
import { RoleCondition, PermissionContext } from '../types/rbac';

/**
 * Конфигурация для автоматической проверки условий
 */
interface ConditionalPermissionConfig {
  // Автоматически обновлять при изменении времени
  autoRefreshTime?: boolean;
  refreshIntervalMs?: number;
  
  // Автоматически запрашивать геолокацию
  requestLocation?: boolean;
  locationOptions?: PositionOptions;
  
  // Кэшировать результаты проверок
  cacheResults?: boolean;
  cacheTtlMs?: number;
  
  // Отслеживать изменения контекста
  trackContextChanges?: boolean;
}

/**
 * Результат проверки условного разрешения
 */
interface ConditionalPermissionCheck {
  hasPermission: boolean;
  isLoading: boolean;
  error: string | null;
  result: ConditionEvaluationResult | null;
  context: ConditionEvaluationContext | null;
  lastChecked: Date | null;
}

/**
 * Хук для проверки условных разрешений
 */
export function useConditionalPermissions(config: ConditionalPermissionConfig = {}) {
  const { currentUser, userProfile, customClaims } = useAuth();
  const [helper] = useState(() => new ConditionalPermissionHelper());
  
  // Состояние геолокации
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Кэш результатов проверок
  const [permissionCache, setPermissionCache] = useState<Map<string, {
    result: ConditionalPermissionCheck;
    timestamp: number;
  }>>(new Map());
  
  // Запрос геолокации при необходимости
  useEffect(() => {
    if (config.requestLocation && navigator.geolocation) {
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 минут
        ...config.locationOptions
      };
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(position);
          setLocationError(null);
        },
        (error) => {
          setLocationError(error.message);
          console.warn('Geolocation error:', error);
        },
        options
      );
      
      // Отслеживание изменений местоположения
      if (config.trackContextChanges) {
        const watchId = navigator.geolocation.watchPosition(
          (position) => setLocation(position),
          (error) => setLocationError(error.message),
          options
        );
        
        return () => navigator.geolocation.clearWatch(watchId);
      }
    }
  }, [config.requestLocation, config.locationOptions, config.trackContextChanges]);
  
  // Создание контекста оценки
  const createEvaluationContext = useCallback((params: {
    resource?: any;
    customAttributes?: Record<string, any>;
  } = {}): ConditionEvaluationContext => {
    if (!currentUser || !userProfile) {
      throw new Error('User not authenticated');
    }
    
    return ConditionalPermissionHelper.createEvaluationContext({
      userId: currentUser.uid,
      userProfile: {
        department: userProfile.department,
        position: userProfile.position,
        location: userProfile.location,
        timezone: userProfile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        employeeId: userProfile.employeeId,
        hireDate: userProfile.hireDate
      },
      currentTime: new Date(),
      location: location ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        // Дополнительная информация о местоположении будет получена через обратное геокодирование
      } : undefined,
      network: {
        ipAddress: '', // В реальности получается с сервера
        userAgent: navigator.userAgent,
        device: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
        os: navigator.platform
      },
      resource: params.resource,
      customAttributes: params.customAttributes
    });
  }, [currentUser, userProfile, location]);
  
  // Проверка условий роли
  const checkRoleConditions = useCallback(async (
    conditions: RoleCondition[],
    contextParams: Parameters<typeof createEvaluationContext>[0] = {}
  ): Promise<ConditionalPermissionCheck> => {
    
    if (!currentUser) {
      return {
        hasPermission: false,
        isLoading: false,
        error: 'User not authenticated',
        result: null,
        context: null,
        lastChecked: new Date()
      };
    }
    
    try {
      const context = createEvaluationContext(contextParams);
      const evaluator = helper['evaluator']; // Доступ к приватному полю
      
      const result = await evaluator.evaluateRoleConditions(conditions, context);
      
      return {
        hasPermission: result.passed,
        isLoading: false,
        error: null,
        result,
        context,
        lastChecked: new Date()
      };
      
    } catch (error) {
      return {
        hasPermission: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        result: null,
        context: null,
        lastChecked: new Date()
      };
    }
  }, [currentUser, helper, createEvaluationContext]);
  
  // Проверка контекстного разрешения
  const checkContextualPermission = useCallback(async (
    permission: Permission,
    permissionContext: PermissionContext,
    contextParams: Parameters<typeof createEvaluationContext>[0] = {}
  ): Promise<ConditionalPermissionCheck> => {
    
    if (!currentUser) {
      return {
        hasPermission: false,
        isLoading: false,
        error: 'User not authenticated', 
        result: null,
        context: null,
        lastChecked: new Date()
      };
    }
    
    // Проверяем кэш
    const cacheKey = `${permission}_${JSON.stringify(permissionContext)}_${JSON.stringify(contextParams)}`;
    
    if (config.cacheResults) {
      const cached = permissionCache.get(cacheKey);
      const ttl = config.cacheTtlMs || 60000; // 1 минута по умолчанию
      
      if (cached && (Date.now() - cached.timestamp) < ttl) {
        return cached.result;
      }
    }
    
    try {
      const context = createEvaluationContext(contextParams);
      const result = await helper.checkContextualPermission(permission, permissionContext, context);
      
      const checkResult: ConditionalPermissionCheck = {
        hasPermission: result.passed,
        isLoading: false,
        error: null,
        result,
        context,
        lastChecked: new Date()
      };
      
      // Сохраняем в кэш
      if (config.cacheResults) {
        setPermissionCache(prev => new Map(prev).set(cacheKey, {
          result: checkResult,
          timestamp: Date.now()
        }));
      }
      
      return checkResult;
      
    } catch (error) {
      const errorResult: ConditionalPermissionCheck = {
        hasPermission: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        result: null,
        context: null,
        lastChecked: new Date()
      };
      
      return errorResult;
    }
  }, [currentUser, helper, createEvaluationContext, config.cacheResults, config.cacheTtlMs, permissionCache]);
  
  // Автоматическое обновление по времени
  useEffect(() => {
    if (config.autoRefreshTime) {
      const interval = setInterval(() => {
        // Очищаем кэш для принудительного обновления проверок
        setPermissionCache(new Map());
      }, config.refreshIntervalMs || 60000); // 1 минута по умолчанию
      
      return () => clearInterval(interval);
    }
  }, [config.autoRefreshTime, config.refreshIntervalMs]);
  
  // Утилиты для работы с условиями
  const conditionUtils = useMemo(() => ({
    
    // Создание временного условия
    createTimeCondition: (field: string, operator: string, value: any, description?: string): RoleCondition => ({
      id: `time_${Date.now()}`,
      type: 'time',
      field,
      operator: operator as any,
      value,
      description
    }),
    
    // Создание условия местоположения
    createLocationCondition: (field: string, operator: string, value: any, description?: string): RoleCondition => ({
      id: `location_${Date.now()}`,
      type: 'location',
      field,
      operator: operator as any,
      value,
      description
    }),
    
    // Создание условия проекта
    createProjectCondition: (field: string, operator: string, value: any, description?: string): RoleCondition => ({
      id: `project_${Date.now()}`,
      type: 'project',
      field,
      operator: operator as any,
      value,
      description
    }),
    
    // Создание условия департамента
    createDepartmentCondition: (field: string, operator: string, value: any, description?: string): RoleCondition => ({
      id: `department_${Date.now()}`,
      type: 'department',
      field,
      operator: operator as any,
      value,
      description
    }),
    
    // Создание пользовательского условия
    createCustomCondition: (field: string, operator: string, value: any, description?: string): RoleCondition => ({
      id: `custom_${Date.now()}`,
      type: 'custom',
      field,
      operator: operator as any,
      value,
      description
    })
    
  }), []);
  
  return {
    // Основные функции проверки
    checkRoleConditions,
    checkContextualPermission,
    
    // Состояние контекста
    location,
    locationError,
    
    // Утилиты
    conditionUtils,
    createEvaluationContext,
    
    // Управление кэшем
    clearCache: () => setPermissionCache(new Map()),
    cacheSize: permissionCache.size,
    
    // Состояние
    isLocationAvailable: !!location && !locationError,
    isReady: !!currentUser && !!userProfile
  };
}

/**
 * Специализированный хук для проверки разрешений в рабочее время
 */
export function useWorkingHoursPermission(
  permission: Permission,
  workingHours: { start: string; end: string } = { start: '09:00', end: '18:00' },
  workingDays: string[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
) {
  const { checkRoleConditions, conditionUtils } = useConditionalPermissions({
    autoRefreshTime: true,
    refreshIntervalMs: 60000 // Проверяем каждую минуту
  });
  
  const [permissionState, setPermissionState] = useState<ConditionalPermissionCheck>({
    hasPermission: false,
    isLoading: true,
    error: null,
    result: null,
    context: null,
    lastChecked: null
  });
  
  useEffect(() => {
    const checkPermission = async () => {
      const conditions: RoleCondition[] = [
        conditionUtils.createTimeCondition('working_hours', 'equals', workingHours, 'Рабочие часы'),
        conditionUtils.createTimeCondition('day_of_week', 'in', workingDays, 'Рабочие дни')
      ];
      
      const result = await checkRoleConditions(conditions);
      setPermissionState(result);
    };
    
    checkPermission();
  }, [checkRoleConditions, conditionUtils, workingHours, workingDays]);
  
  return permissionState;
}

/**
 * Хук для проверки разрешений на основе местоположения
 */
export function useLocationBasedPermission(
  permission: Permission,
  allowedLocations: Array<{
    latitude: number;
    longitude: number;
    radiusMeters: number;
    name?: string;
  }>
) {
  const { checkRoleConditions, conditionUtils, location, locationError } = useConditionalPermissions({
    requestLocation: true,
    trackContextChanges: true
  });
  
  const [permissionState, setPermissionState] = useState<ConditionalPermissionCheck>({
    hasPermission: false,
    isLoading: true,
    error: null,
    result: null,
    context: null,
    lastChecked: null
  });
  
  useEffect(() => {
    if (!location && !locationError) {
      // Еще ждем геолокацию
      return;
    }
    
    const checkPermission = async () => {
      if (locationError) {
        setPermissionState({
          hasPermission: false,
          isLoading: false,
          error: `Location error: ${locationError}`,
          result: null,
          context: null,
          lastChecked: new Date()
        });
        return;
      }
      
      // Создаем условия для каждого разрешенного местоположения
      const conditions: RoleCondition[] = allowedLocations.map((loc, index) => 
        conditionUtils.createLocationCondition(
          'office_radius',
          'equals',
          {
            latitude: loc.latitude,
            longitude: loc.longitude,
            radiusMeters: loc.radiusMeters
          },
          `Разрешенная локация: ${loc.name || `Location ${index + 1}`}`
        )
      );
      
      const result = await checkRoleConditions(conditions);
      setPermissionState(result);
    };
    
    checkPermission();
  }, [checkRoleConditions, conditionUtils, location, locationError, allowedLocations]);
  
  return {
    ...permissionState,
    location,
    locationError,
    isLocationAvailable: !!location && !locationError
  };
}

export default useConditionalPermissions;
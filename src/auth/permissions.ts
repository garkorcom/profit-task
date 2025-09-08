/**
 * RBAC (Role-Based Access Control) - Система ролевого доступа
 * 
 * Определяет роли пользователей и их разрешения в системе
 */

import { CustomClaims } from './customClaims';

/**
 * Все возможные разрешения в системе
 */
export enum Permission {
  // Проекты
  VIEW_ALL_PROJECTS = 'view_all_projects',
  VIEW_OWN_PROJECTS = 'view_own_projects',
  CREATE_PROJECTS = 'create_projects',
  EDIT_PROJECTS = 'edit_projects',
  DELETE_PROJECTS = 'delete_projects',
  
  // Задачи
  VIEW_ALL_TASKS = 'view_all_tasks',
  VIEW_OWN_TASKS = 'view_own_tasks',
  CREATE_TASKS = 'create_tasks',
  EDIT_ALL_TASKS = 'edit_all_tasks',
  EDIT_OWN_TASKS = 'edit_own_tasks',
  DELETE_TASKS = 'delete_tasks',
  ASSIGN_TASKS = 'assign_tasks',
  
  // Сметы
  VIEW_ESTIMATES = 'view_estimates',
  CREATE_ESTIMATES = 'create_estimates',
  EDIT_ESTIMATES = 'edit_estimates',
  DELETE_ESTIMATES = 'delete_estimates',
  APPROVE_ESTIMATES = 'approve_estimates',
  
  // Финансы
  VIEW_FINANCES = 'view_finances',
  MANAGE_FINANCES = 'manage_finances',
  VIEW_REPORTS = 'view_reports',
  EXPORT_REPORTS = 'export_reports',
  
  // Пользователи
  VIEW_ALL_USERS = 'view_all_users',
  CREATE_USERS = 'create_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  CHANGE_USER_ROLES = 'change_user_roles',
  
  // Склад
  VIEW_WAREHOUSE = 'view_warehouse',
  MANAGE_WAREHOUSE = 'manage_warehouse',
  CREATE_PRODUCTS = 'create_products',
  EDIT_PRODUCTS = 'edit_products',
  DELETE_PRODUCTS = 'delete_products',
  MANAGE_STOCK = 'manage_stock',
  
  // Контрагенты
  VIEW_CONTRACTORS = 'view_contractors',
  CREATE_CONTRACTORS = 'create_contractors',
  EDIT_CONTRACTORS = 'edit_contractors',
  DELETE_CONTRACTORS = 'delete_contractors',
  
  // Учет времени
  TRACK_TIME = 'track_time',
  VIEW_ALL_TIME_ENTRIES = 'view_all_time_entries',
  VIEW_OWN_TIME_ENTRIES = 'view_own_time_entries',
  EDIT_TIME_ENTRIES = 'edit_time_entries',
  DELETE_TIME_ENTRIES = 'delete_time_entries',
  CREATE_TIME_ENTRY_DRAFT = 'create_time_entry_draft',
  SUBMIT_TIME_ENTRY = 'submit_time_entry',
  RECALL_TIME_ENTRY = 'recall_time_entry',
  APPROVE_TIME_ENTRY = 'approve_time_entry',
  REJECT_TIME_ENTRY = 'reject_time_entry',
  BULK_APPROVE_TIME = 'bulk_approve_time',
  
  // Ставки и расценки
  VIEW_LABOR_RATES = 'view_labor_rates',
  MANAGE_LABOR_RATES = 'manage_labor_rates',
  VIEW_OWN_LABOR_RATES = 'view_own_labor_rates',
  
  // ERP модуль
  CREATE_ESTIMATE_TASKS = 'create_estimate_tasks',
  EDIT_ESTIMATE_TASKS = 'edit_estimate_tasks',
  VIEW_ESTIMATE_TASKS = 'view_estimate_tasks',
  MANAGE_INCLUDE_MODE = 'manage_include_mode',
  VIEW_COGS_RECORDS = 'view_cogs_records',
  MANAGE_COGS_RECORDS = 'manage_cogs_records',
  
  // Отчеты ERP
  VIEW_COGS_REPORT = 'view_cogs_report',
  VIEW_TIMESHEET_REPORT = 'view_timesheet_report',
  VIEW_VARIANCE_REPORT = 'view_variance_report',
  EXPORT_ERP_REPORTS = 'export_erp_reports',
  
  // Настройки
  VIEW_SETTINGS = 'view_settings',
  MANAGE_SETTINGS = 'manage_settings',
  
  // RBAC Management - Динамические роли
  MANAGE_ROLES = 'manage_roles',
  VIEW_ROLES = 'view_roles',
  CREATE_ROLES = 'create_roles',
  DELETE_ROLES = 'delete_roles',
  
  // RBAC - Пользователи и роли
  MANAGE_USERS = 'manage_users',
  VIEW_USER_ROLES = 'view_user_roles',
  ASSIGN_ROLES = 'assign_roles',
  
  // RBAC - Группы пользователей
  MANAGE_GROUPS = 'manage_groups',
  VIEW_GROUPS = 'view_groups',
  CREATE_GROUPS = 'create_groups',
  DELETE_GROUPS = 'delete_groups',
  
  // RBAC - Временные роли
  MANAGE_TEMPORARY_ROLES = 'manage_temporary_roles',
  VIEW_TEMPORARY_ROLES = 'view_temporary_roles',
  CREATE_TEMPORARY_ROLES = 'create_temporary_roles',
  
  // RBAC - Делегирование полномочий
  MANAGE_DELEGATIONS = 'manage_delegations',
  VIEW_DELEGATIONS = 'view_delegations',
  CREATE_DELEGATIONS = 'create_delegations',
  REVOKE_DELEGATIONS = 'revoke_delegations',
  
  // RBAC - Разрешения и аудит
  VIEW_USER_PERMISSIONS = 'view_user_permissions',
  VIEW_RBAC_STATS = 'view_rbac_stats',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  
  // Разработка
  ACCESS_DEV_TOOLS = 'access_dev_tools',
  RUN_TESTS = 'run_tests',
}

/**
 * Типы ролей в системе
 */
export type UserRole = 'owner' | 'manager' | 'employee' | 'contractor' | 'estimator' | 'pm' | 'accountant' | 'field' | 'pending_approval' | 'deactivated';

/**
 * Конфигурация разрешений для каждой роли
 */
export const rolePermissions: Record<UserRole, Permission[]> = {
  owner: [
    // Владелец имеет все права
    ...Object.values(Permission),
  ],
  
  manager: [
    // Проекты
    Permission.VIEW_ALL_PROJECTS,
    Permission.CREATE_PROJECTS,
    Permission.EDIT_PROJECTS,
    
    // Задачи
    Permission.VIEW_ALL_TASKS,
    Permission.CREATE_TASKS,
    Permission.EDIT_ALL_TASKS,
    Permission.DELETE_TASKS,
    Permission.ASSIGN_TASKS,
    
    // Сметы
    Permission.VIEW_ESTIMATES,
    Permission.CREATE_ESTIMATES,
    Permission.EDIT_ESTIMATES,
    Permission.APPROVE_ESTIMATES,
    
    // Финансы
    Permission.VIEW_FINANCES,
    Permission.VIEW_REPORTS,
    
    // Пользователи
    Permission.VIEW_ALL_USERS,
    
    // Склад
    Permission.VIEW_WAREHOUSE,
    Permission.MANAGE_WAREHOUSE,
    Permission.CREATE_PRODUCTS,
    Permission.EDIT_PRODUCTS,
    Permission.MANAGE_STOCK,
    
    // Контрагенты
    Permission.VIEW_CONTRACTORS,
    Permission.CREATE_CONTRACTORS,
    Permission.EDIT_CONTRACTORS,
    
    // Учет времени
    Permission.TRACK_TIME,
    Permission.VIEW_ALL_TIME_ENTRIES,
    Permission.EDIT_TIME_ENTRIES,
  ],
  
  employee: [
    // Проекты
    Permission.VIEW_OWN_PROJECTS,
    
    // Задачи
    Permission.VIEW_OWN_TASKS,
    Permission.EDIT_OWN_TASKS,
    
    // Сметы
    Permission.VIEW_ESTIMATES,
    
    // Склад
    Permission.VIEW_WAREHOUSE,
    
    // Контрагенты
    Permission.VIEW_CONTRACTORS,
    
    // Учет времени
    Permission.TRACK_TIME,
    Permission.VIEW_OWN_TIME_ENTRIES,
  ],
  
  contractor: [
    // Проекты
    Permission.VIEW_OWN_PROJECTS,
    
    // Задачи
    Permission.VIEW_OWN_TASKS,
    
    // Учет времени
    Permission.TRACK_TIME,
    Permission.VIEW_OWN_TIME_ENTRIES,
  ],
  
  // Сметчик/Инженер - Pre-construction work
  estimator: [
    // Сметы
    Permission.VIEW_ESTIMATES,
    Permission.CREATE_ESTIMATES,
    Permission.EDIT_ESTIMATES,
    
    // ERP модуль
    Permission.CREATE_ESTIMATE_TASKS,
    Permission.EDIT_ESTIMATE_TASKS,
    Permission.VIEW_ESTIMATE_TASKS,
    Permission.MANAGE_INCLUDE_MODE,
    
    // Учет времени
    Permission.TRACK_TIME,
    Permission.VIEW_OWN_TIME_ENTRIES,
    Permission.CREATE_TIME_ENTRY_DRAFT,
    Permission.SUBMIT_TIME_ENTRY,
    Permission.RECALL_TIME_ENTRY,
    
    // Контрагенты
    Permission.VIEW_CONTRACTORS,
    
    // Ставки (только свои)
    Permission.VIEW_OWN_LABOR_RATES,
  ],
  
  // Руководитель проекта (PM)
  pm: [
    // Проекты
    Permission.VIEW_ALL_PROJECTS,
    Permission.CREATE_PROJECTS,
    Permission.EDIT_PROJECTS,
    
    // Задачи
    Permission.VIEW_ALL_TASKS,
    Permission.CREATE_TASKS,
    Permission.EDIT_ALL_TASKS,
    Permission.DELETE_TASKS,
    Permission.ASSIGN_TASKS,
    
    // Сметы
    Permission.VIEW_ESTIMATES,
    Permission.CREATE_ESTIMATES,
    Permission.EDIT_ESTIMATES,
    Permission.APPROVE_ESTIMATES,
    
    // ERP модуль
    Permission.VIEW_ESTIMATE_TASKS,
    Permission.VIEW_COGS_RECORDS,
    
    // Учет времени - управление командой
    Permission.TRACK_TIME,
    Permission.VIEW_ALL_TIME_ENTRIES,
    Permission.VIEW_OWN_TIME_ENTRIES,
    Permission.CREATE_TIME_ENTRY_DRAFT,
    Permission.SUBMIT_TIME_ENTRY,
    Permission.RECALL_TIME_ENTRY,
    Permission.APPROVE_TIME_ENTRY,
    Permission.REJECT_TIME_ENTRY,
    Permission.BULK_APPROVE_TIME,
    
    // Отчетность
    Permission.VIEW_REPORTS,
    Permission.VIEW_COGS_REPORT,
    Permission.VIEW_TIMESHEET_REPORT,
    Permission.VIEW_VARIANCE_REPORT,
    Permission.EXPORT_ERP_REPORTS,
    
    // Контрагенты
    Permission.VIEW_CONTRACTORS,
    Permission.CREATE_CONTRACTORS,
    Permission.EDIT_CONTRACTORS,
  ],
  
  // Бухгалтер/Финансовый менеджер
  accountant: [
    // Финансы
    Permission.VIEW_FINANCES,
    Permission.MANAGE_FINANCES,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,
    
    // Ставки и расценки
    Permission.VIEW_LABOR_RATES,
    Permission.MANAGE_LABOR_RATES,
    
    // ERP модуль
    Permission.VIEW_COGS_RECORDS,
    Permission.MANAGE_COGS_RECORDS,
    
    // Учет времени - утверждение административных/OH записей
    Permission.VIEW_ALL_TIME_ENTRIES,
    Permission.APPROVE_TIME_ENTRY,
    Permission.REJECT_TIME_ENTRY,
    Permission.BULK_APPROVE_TIME,
    
    // Отчетность ERP
    Permission.VIEW_COGS_REPORT,
    Permission.VIEW_TIMESHEET_REPORT,
    Permission.VIEW_VARIANCE_REPORT,
    Permission.EXPORT_ERP_REPORTS,
    
    // Контрагенты
    Permission.VIEW_CONTRACTORS,
    Permission.CREATE_CONTRACTORS,
    Permission.EDIT_CONTRACTORS,
    
    // Интеграции
    Permission.VIEW_SETTINGS,
  ],
  
  // Исполнитель (Field) - работники на объекте
  field: [
    // Проекты (только свои)
    Permission.VIEW_OWN_PROJECTS,
    
    // Задачи проекта
    Permission.VIEW_OWN_TASKS,
    
    // Учет времени (основная функция)
    Permission.TRACK_TIME,
    Permission.VIEW_OWN_TIME_ENTRIES,
    Permission.CREATE_TIME_ENTRY_DRAFT,
    Permission.SUBMIT_TIME_ENTRY,
    Permission.RECALL_TIME_ENTRY,
    
    // НЕТ доступа к:
    // - Финансам и ставкам
    // - Сметам 
    // - Управлению проектами
    // - Утверждению времени других
  ],

  // Ожидает одобрения - нет разрешений
  pending_approval: [],

  // Деактивированный - нет разрешений  
  deactivated: []
};

/**
 * Группы разрешений для удобной проверки
 */
export const permissionGroups = {
  projectManagement: [
    Permission.CREATE_PROJECTS,
    Permission.EDIT_PROJECTS,
    Permission.DELETE_PROJECTS,
  ],
  
  taskManagement: [
    Permission.CREATE_TASKS,
    Permission.EDIT_ALL_TASKS,
    Permission.DELETE_TASKS,
    Permission.ASSIGN_TASKS,
  ],
  
  financialAccess: [
    Permission.VIEW_FINANCES,
    Permission.MANAGE_FINANCES,
    Permission.VIEW_REPORTS,
  ],
  
  userManagement: [
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS,
    Permission.CHANGE_USER_ROLES,
  ],
  
  warehouseManagement: [
    Permission.MANAGE_WAREHOUSE,
    Permission.CREATE_PRODUCTS,
    Permission.EDIT_PRODUCTS,
    Permission.DELETE_PRODUCTS,
    Permission.MANAGE_STOCK,
  ],
  
  // ERP-специфические группы
  timeTrackingWorkflow: [
    Permission.CREATE_TIME_ENTRY_DRAFT,
    Permission.SUBMIT_TIME_ENTRY,
    Permission.RECALL_TIME_ENTRY,
    Permission.APPROVE_TIME_ENTRY,
    Permission.REJECT_TIME_ENTRY,
    Permission.BULK_APPROVE_TIME,
  ],
  
  laborRateManagement: [
    Permission.VIEW_LABOR_RATES,
    Permission.MANAGE_LABOR_RATES,
    Permission.VIEW_OWN_LABOR_RATES,
  ],
  
  estimateTaskManagement: [
    Permission.CREATE_ESTIMATE_TASKS,
    Permission.EDIT_ESTIMATE_TASKS,
    Permission.VIEW_ESTIMATE_TASKS,
    Permission.MANAGE_INCLUDE_MODE,
  ],
  
  cogsManagement: [
    Permission.VIEW_COGS_RECORDS,
    Permission.MANAGE_COGS_RECORDS,
  ],
  
  erpReporting: [
    Permission.VIEW_COGS_REPORT,
    Permission.VIEW_TIMESHEET_REPORT,
    Permission.VIEW_VARIANCE_REPORT,
    Permission.EXPORT_ERP_REPORTS,
  ],
};

/**
 * Проверка наличия разрешения у роли
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) || false;
}

/**
 * Проверка наличия любого из указанных разрешений
 */
export function roleHasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => roleHasPermission(role, permission));
}

/**
 * Проверка наличия всех указанных разрешений
 */
export function roleHasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => roleHasPermission(role, permission));
}

/**
 * Получение всех разрешений для роли
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Получение всех возможных разрешений в системе
 */
export function getAllPermissions(): Permission[] {
  return Object.values(Permission);
}

/**
 * Описания ролей для UI
 */
export const roleDescriptions: Record<UserRole, { name: string; description: string; color: string }> = {
  owner: {
    name: 'Владелец',
    description: 'Полный доступ ко всем функциям системы',
    color: '#9c27b0',
  },
  manager: {
    name: 'Менеджер',
    description: 'Управление проектами, задачами и ресурсами',
    color: '#2196f3',
  },
  employee: {
    name: 'Сотрудник',
    description: 'Выполнение задач и учет времени',
    color: '#4caf50',
  },
  contractor: {
    name: 'Подрядчик',
    description: 'Ограниченный доступ к назначенным задачам',
    color: '#ff9800',
  },
  estimator: {
    name: 'Сметчик/Инженер',
    description: 'Подготовка смет, pre-construction работы',
    color: '#795548',
  },
  pm: {
    name: 'Руководитель проекта (PM)',
    description: 'Управление проектами, утверждение времени команды',
    color: '#3f51b5',
  },
  accountant: {
    name: 'Бухгалтер/Финансист',
    description: 'Управление финансами, ставками и отчетностью',
    color: '#607d8b',
  },
  field: {
    name: 'Исполнитель (Field)',
    description: 'Работник на объекте, учет времени и задач',
    color: '#8bc34a',
  },
  pending_approval: {
    name: 'Ожидает одобрения',
    description: 'Новый пользователь, ждет одобрения администратора',
    color: '#ffa726',
  },
  deactivated: {
    name: 'Деактивирован',
    description: 'Пользователь деактивирован администратором',
    color: '#f44336',
  },
};

/**
 * Описания разрешений для UI
 */
export const permissionDescriptions: Record<Permission, string> = {
  [Permission.VIEW_ALL_PROJECTS]: 'Просмотр всех проектов',
  [Permission.VIEW_OWN_PROJECTS]: 'Просмотр своих проектов',
  [Permission.CREATE_PROJECTS]: 'Создание проектов',
  [Permission.EDIT_PROJECTS]: 'Редактирование проектов',
  [Permission.DELETE_PROJECTS]: 'Удаление проектов',
  
  [Permission.VIEW_ALL_TASKS]: 'Просмотр всех задач',
  [Permission.VIEW_OWN_TASKS]: 'Просмотр своих задач',
  [Permission.CREATE_TASKS]: 'Создание задач',
  [Permission.EDIT_ALL_TASKS]: 'Редактирование всех задач',
  [Permission.EDIT_OWN_TASKS]: 'Редактирование своих задач',
  [Permission.DELETE_TASKS]: 'Удаление задач',
  [Permission.ASSIGN_TASKS]: 'Назначение задач',
  
  [Permission.VIEW_ESTIMATES]: 'Просмотр смет',
  [Permission.CREATE_ESTIMATES]: 'Создание смет',
  [Permission.EDIT_ESTIMATES]: 'Редактирование смет',
  [Permission.DELETE_ESTIMATES]: 'Удаление смет',
  [Permission.APPROVE_ESTIMATES]: 'Утверждение смет',
  
  [Permission.VIEW_FINANCES]: 'Просмотр финансов',
  [Permission.MANAGE_FINANCES]: 'Управление финансами',
  [Permission.VIEW_REPORTS]: 'Просмотр отчетов',
  [Permission.EXPORT_REPORTS]: 'Экспорт отчетов',
  
  [Permission.VIEW_ALL_USERS]: 'Просмотр всех пользователей',
  [Permission.CREATE_USERS]: 'Создание пользователей',
  [Permission.EDIT_USERS]: 'Редактирование пользователей',
  [Permission.DELETE_USERS]: 'Удаление пользователей',
  [Permission.CHANGE_USER_ROLES]: 'Изменение ролей пользователей',
  
  [Permission.VIEW_WAREHOUSE]: 'Просмотр склада',
  [Permission.MANAGE_WAREHOUSE]: 'Управление складом',
  [Permission.CREATE_PRODUCTS]: 'Создание товаров',
  [Permission.EDIT_PRODUCTS]: 'Редактирование товаров',
  [Permission.DELETE_PRODUCTS]: 'Удаление товаров',
  [Permission.MANAGE_STOCK]: 'Управление запасами',
  
  [Permission.VIEW_CONTRACTORS]: 'Просмотр контрагентов',
  [Permission.CREATE_CONTRACTORS]: 'Создание контрагентов',
  [Permission.EDIT_CONTRACTORS]: 'Редактирование контрагентов',
  [Permission.DELETE_CONTRACTORS]: 'Удаление контрагентов',
  
  [Permission.TRACK_TIME]: 'Учет времени',
  [Permission.VIEW_ALL_TIME_ENTRIES]: 'Просмотр всех записей времени',
  [Permission.VIEW_OWN_TIME_ENTRIES]: 'Просмотр своих записей времени',
  [Permission.EDIT_TIME_ENTRIES]: 'Редактирование записей времени',
  [Permission.DELETE_TIME_ENTRIES]: 'Удаление записей времени',
  [Permission.CREATE_TIME_ENTRY_DRAFT]: 'Создание черновика записи времени',
  [Permission.SUBMIT_TIME_ENTRY]: 'Подача записи времени на утверждение',
  [Permission.RECALL_TIME_ENTRY]: 'Отзыв поданной записи времени',
  [Permission.APPROVE_TIME_ENTRY]: 'Утверждение записей времени',
  [Permission.REJECT_TIME_ENTRY]: 'Отклонение записей времени',
  [Permission.BULK_APPROVE_TIME]: 'Массовое утверждение времени',
  
  [Permission.VIEW_LABOR_RATES]: 'Просмотр ставок труда',
  [Permission.MANAGE_LABOR_RATES]: 'Управление ставками труда',
  [Permission.VIEW_OWN_LABOR_RATES]: 'Просмотр своих ставок',
  
  [Permission.CREATE_ESTIMATE_TASKS]: 'Создание задач для сметы',
  [Permission.EDIT_ESTIMATE_TASKS]: 'Редактирование задач сметы',
  [Permission.VIEW_ESTIMATE_TASKS]: 'Просмотр задач сметы',
  [Permission.MANAGE_INCLUDE_MODE]: 'Управление режимом включения (COGS/OH/NONE)',
  [Permission.VIEW_COGS_RECORDS]: 'Просмотр записей себестоимости',
  [Permission.MANAGE_COGS_RECORDS]: 'Управление записями себестоимости',
  
  [Permission.VIEW_COGS_REPORT]: 'Просмотр отчета COGS',
  [Permission.VIEW_TIMESHEET_REPORT]: 'Просмотр отчета времени',
  [Permission.VIEW_VARIANCE_REPORT]: 'Просмотр отчета отклонений',
  [Permission.EXPORT_ERP_REPORTS]: 'Экспорт ERP отчетов',
  
  [Permission.VIEW_SETTINGS]: 'Просмотр настроек',
  [Permission.MANAGE_SETTINGS]: 'Управление настройками',
  
  // RBAC описания
  [Permission.MANAGE_ROLES]: 'Управление ролями RBAC',
  [Permission.VIEW_ROLES]: 'Просмотр ролей RBAC',
  [Permission.CREATE_ROLES]: 'Создание ролей RBAC',
  [Permission.DELETE_ROLES]: 'Удаление ролей RBAC',
  [Permission.MANAGE_USERS]: 'Управление пользователями RBAC',
  [Permission.VIEW_USER_ROLES]: 'Просмотр ролей пользователей',
  [Permission.ASSIGN_ROLES]: 'Назначение ролей пользователям',
  [Permission.MANAGE_GROUPS]: 'Управление группами пользователей',
  [Permission.VIEW_GROUPS]: 'Просмотр групп пользователей',
  [Permission.CREATE_GROUPS]: 'Создание групп пользователей',
  [Permission.DELETE_GROUPS]: 'Удаление групп пользователей',
  [Permission.MANAGE_TEMPORARY_ROLES]: 'Управление временными ролями',
  [Permission.VIEW_TEMPORARY_ROLES]: 'Просмотр временных ролей',
  [Permission.CREATE_TEMPORARY_ROLES]: 'Создание временных ролей',
  [Permission.MANAGE_DELEGATIONS]: 'Управление делегированием полномочий',
  [Permission.VIEW_DELEGATIONS]: 'Просмотр делегированных полномочий',
  [Permission.CREATE_DELEGATIONS]: 'Создание делегирования полномочий',
  [Permission.REVOKE_DELEGATIONS]: 'Отзыв делегированных полномочий',
  [Permission.VIEW_USER_PERMISSIONS]: 'Просмотр разрешений пользователей',
  [Permission.VIEW_RBAC_STATS]: 'Просмотр статистики RBAC',
  [Permission.VIEW_AUDIT_LOGS]: 'Просмотр журнала аудита',
  
  [Permission.ACCESS_DEV_TOOLS]: 'Доступ к инструментам разработки',
  [Permission.RUN_TESTS]: 'Запуск тестов',
};

/**
 * ИНТЕГРАЦИЯ С CUSTOM CLAIMS
 * 
 * Эти функции обеспечивают совместимость с новой архитектурой Custom Claims
 * при сохранении обратной совместимости с существующими профилями
 */

/**
 * Проверка разрешения с поддержкой Custom Claims
 * Приоритет: Custom Claims > Profile Role > Fallback
 */
export function hasPermissionSecure(
  customClaims: CustomClaims | null,
  profileRole: UserRole | null,
  permission: Permission
): boolean {
  // 1. Проверяем Custom Claims (приоритет)
  if (customClaims?.isActive && customClaims?.permissions) {
    return customClaims.permissions.includes(permission);
  }
  
  // 2. Фоллбэк на роль из профиля
  if (profileRole) {
    return roleHasPermission(profileRole, permission);
  }
  
  // 3. По умолчанию - нет доступа
  return false;
}

/**
 * Проверка роли с поддержкой Custom Claims
 */
export function hasRoleSecure(
  customClaims: CustomClaims | null,
  profileRole: UserRole | null,
  requiredRole: UserRole
): boolean {
  // 1. Проверяем Custom Claims
  if (customClaims?.isActive && customClaims?.role) {
    return customClaims.role === requiredRole;
  }
  
  // 2. Фоллбэк на роль из профиля
  if (profileRole) {
    return profileRole === requiredRole;
  }
  
  return false;
}

/**
 * Проверка активности пользователя
 */
export function isUserActiveSecure(
  customClaims: CustomClaims | null,
  profileActive: boolean = true
): boolean {
  // Если есть Custom Claims - используем их
  if (customClaims !== null) {
    return customClaims.isActive === true;
  }
  
  // Фоллбэк на статус из профиля
  return profileActive;
}

/**
 * Получение эффективной роли пользователя
 */
export function getEffectiveRole(
  customClaims: CustomClaims | null,
  profileRole: UserRole | null
): UserRole | null {
  // Приоритет Custom Claims
  if (customClaims?.isActive && customClaims?.role) {
    return customClaims.role as UserRole;
  }
  
  // Фоллбэк на роль из профиля
  return profileRole;
}

/**
 * Получение эффективных разрешений пользователя
 */
export function getEffectivePermissions(
  customClaims: CustomClaims | null,
  profileRole: UserRole | null
): Permission[] {
  // Если есть активные Custom Claims с разрешениями
  if (customClaims?.isActive && customClaims?.permissions) {
    return customClaims.permissions.map(p => p as Permission);
  }
  
  // Фоллбэк на разрешения роли из профиля
  if (profileRole) {
    return getRolePermissions(profileRole);
  }
  
  return [];
}

/**
 * Проверка административных прав (owner/manager)
 */
export function hasAdminRightsSecure(
  customClaims: CustomClaims | null,
  profileRole: UserRole | null
): boolean {
  const effectiveRole = getEffectiveRole(customClaims, profileRole);
  return effectiveRole === 'owner' || effectiveRole === 'manager';
}

/**
 * Проверка финансовых прав (owner/accountant)
 */
export function hasFinancialRightsSecure(
  customClaims: CustomClaims | null,
  profileRole: UserRole | null
): boolean {
  const effectiveRole = getEffectiveRole(customClaims, profileRole);
  return effectiveRole === 'owner' || effectiveRole === 'accountant';
}

/**
 * Hook для использования в React компонентах
 */
export function usePermissions(
  customClaims: CustomClaims | null,
  profileRole: UserRole | null
) {
  return {
    hasPermission: (permission: Permission) => 
      hasPermissionSecure(customClaims, profileRole, permission),
    
    hasRole: (role: UserRole) => 
      hasRoleSecure(customClaims, profileRole, role),
    
    hasAnyPermission: (permissions: Permission[]) => 
      permissions.some(p => hasPermissionSecure(customClaims, profileRole, p)),
    
    hasAllPermissions: (permissions: Permission[]) => 
      permissions.every(p => hasPermissionSecure(customClaims, profileRole, p)),
    
    isActive: () => 
      isUserActiveSecure(customClaims, true),
    
    isAdmin: () => 
      hasAdminRightsSecure(customClaims, profileRole),
    
    hasFinancialAccess: () => 
      hasFinancialRightsSecure(customClaims, profileRole),
    
    getRole: () => 
      getEffectiveRole(customClaims, profileRole),
    
    getPermissions: () => 
      getEffectivePermissions(customClaims, profileRole),
  };
}

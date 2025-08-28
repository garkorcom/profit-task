/**
 * RBAC (Role-Based Access Control) - Система ролевого доступа
 * 
 * Определяет роли пользователей и их разрешения в системе
 */

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
  
  // Настройки
  VIEW_SETTINGS = 'view_settings',
  MANAGE_SETTINGS = 'manage_settings',
  
  // Разработка
  ACCESS_DEV_TOOLS = 'access_dev_tools',
  RUN_TESTS = 'run_tests',
}

/**
 * Типы ролей в системе
 */
export type UserRole = 'owner' | 'manager' | 'employee' | 'contractor';

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
  
  [Permission.VIEW_SETTINGS]: 'Просмотр настроек',
  [Permission.MANAGE_SETTINGS]: 'Управление настройками',
  
  [Permission.ACCESS_DEV_TOOLS]: 'Доступ к инструментам разработки',
  [Permission.RUN_TESTS]: 'Запуск тестов',
};

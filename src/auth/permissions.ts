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
  
  // Разработка
  ACCESS_DEV_TOOLS = 'access_dev_tools',
  RUN_TESTS = 'run_tests',
}

/**
 * Типы ролей в системе
 */
export type UserRole = 'owner' | 'manager' | 'employee' | 'contractor' | 'estimator' | 'pm' | 'accountant' | 'field';

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
  
  [Permission.ACCESS_DEV_TOOLS]: 'Доступ к инструментам разработки',
  [Permission.RUN_TESTS]: 'Запуск тестов',
};

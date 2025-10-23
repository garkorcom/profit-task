"use strict";
/**
 * RBAC (Role-Based Access Control) - Система ролевого доступа
 *
 * Определяет роли пользователей и их разрешения в системе
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePermissions = exports.hasFinancialRightsSecure = exports.hasAdminRightsSecure = exports.getEffectivePermissions = exports.getEffectiveRole = exports.isUserActiveSecure = exports.hasRoleSecure = exports.hasPermissionSecure = exports.permissionDescriptions = exports.roleDescriptions = exports.getAllPermissions = exports.getRolePermissions = exports.roleHasAllPermissions = exports.roleHasAnyPermission = exports.roleHasPermission = exports.permissionGroups = exports.rolePermissions = exports.Permission = void 0;
/**
 * Все возможные разрешения в системе
 */
var Permission;
(function (Permission) {
    // Проекты
    Permission["VIEW_ALL_PROJECTS"] = "view_all_projects";
    Permission["VIEW_OWN_PROJECTS"] = "view_own_projects";
    Permission["CREATE_PROJECTS"] = "create_projects";
    Permission["EDIT_PROJECTS"] = "edit_projects";
    Permission["DELETE_PROJECTS"] = "delete_projects";
    // Задачи
    Permission["VIEW_ALL_TASKS"] = "view_all_tasks";
    Permission["VIEW_OWN_TASKS"] = "view_own_tasks";
    Permission["CREATE_TASKS"] = "create_tasks";
    Permission["EDIT_ALL_TASKS"] = "edit_all_tasks";
    Permission["EDIT_OWN_TASKS"] = "edit_own_tasks";
    Permission["DELETE_TASKS"] = "delete_tasks";
    Permission["ASSIGN_TASKS"] = "assign_tasks";
    // Сметы
    Permission["VIEW_ESTIMATES"] = "view_estimates";
    Permission["CREATE_ESTIMATES"] = "create_estimates";
    Permission["EDIT_ESTIMATES"] = "edit_estimates";
    Permission["DELETE_ESTIMATES"] = "delete_estimates";
    Permission["APPROVE_ESTIMATES"] = "approve_estimates";
    // Финансы
    Permission["VIEW_FINANCES"] = "view_finances";
    Permission["MANAGE_FINANCES"] = "manage_finances";
    Permission["VIEW_REPORTS"] = "view_reports";
    Permission["EXPORT_REPORTS"] = "export_reports";
    // Пользователи
    Permission["VIEW_ALL_USERS"] = "view_all_users";
    Permission["CREATE_USERS"] = "create_users";
    Permission["EDIT_USERS"] = "edit_users";
    Permission["DELETE_USERS"] = "delete_users";
    Permission["CHANGE_USER_ROLES"] = "change_user_roles";
    // Склад
    Permission["VIEW_WAREHOUSE"] = "view_warehouse";
    Permission["MANAGE_WAREHOUSE"] = "manage_warehouse";
    Permission["CREATE_PRODUCTS"] = "create_products";
    Permission["EDIT_PRODUCTS"] = "edit_products";
    Permission["DELETE_PRODUCTS"] = "delete_products";
    Permission["MANAGE_STOCK"] = "manage_stock";
    // Контрагенты
    Permission["VIEW_CONTRACTORS"] = "view_contractors";
    Permission["CREATE_CONTRACTORS"] = "create_contractors";
    Permission["EDIT_CONTRACTORS"] = "edit_contractors";
    Permission["DELETE_CONTRACTORS"] = "delete_contractors";
    // Учет времени
    Permission["TRACK_TIME"] = "track_time";
    Permission["VIEW_ALL_TIME_ENTRIES"] = "view_all_time_entries";
    Permission["VIEW_OWN_TIME_ENTRIES"] = "view_own_time_entries";
    Permission["EDIT_TIME_ENTRIES"] = "edit_time_entries";
    Permission["DELETE_TIME_ENTRIES"] = "delete_time_entries";
    Permission["CREATE_TIME_ENTRY_DRAFT"] = "create_time_entry_draft";
    Permission["SUBMIT_TIME_ENTRY"] = "submit_time_entry";
    Permission["RECALL_TIME_ENTRY"] = "recall_time_entry";
    Permission["APPROVE_TIME_ENTRY"] = "approve_time_entry";
    Permission["REJECT_TIME_ENTRY"] = "reject_time_entry";
    Permission["BULK_APPROVE_TIME"] = "bulk_approve_time";
    // Ставки и расценки
    Permission["VIEW_LABOR_RATES"] = "view_labor_rates";
    Permission["MANAGE_LABOR_RATES"] = "manage_labor_rates";
    Permission["VIEW_OWN_LABOR_RATES"] = "view_own_labor_rates";
    // ERP модуль
    Permission["CREATE_ESTIMATE_TASKS"] = "create_estimate_tasks";
    Permission["EDIT_ESTIMATE_TASKS"] = "edit_estimate_tasks";
    Permission["VIEW_ESTIMATE_TASKS"] = "view_estimate_tasks";
    Permission["MANAGE_INCLUDE_MODE"] = "manage_include_mode";
    Permission["VIEW_COGS_RECORDS"] = "view_cogs_records";
    Permission["MANAGE_COGS_RECORDS"] = "manage_cogs_records";
    // Отчеты ERP
    Permission["VIEW_COGS_REPORT"] = "view_cogs_report";
    Permission["VIEW_TIMESHEET_REPORT"] = "view_timesheet_report";
    Permission["VIEW_VARIANCE_REPORT"] = "view_variance_report";
    Permission["EXPORT_ERP_REPORTS"] = "export_erp_reports";
    // Настройки
    Permission["VIEW_SETTINGS"] = "view_settings";
    Permission["MANAGE_SETTINGS"] = "manage_settings";
    // RBAC Management - Динамические роли
    Permission["MANAGE_ROLES"] = "manage_roles";
    Permission["VIEW_ROLES"] = "view_roles";
    Permission["CREATE_ROLES"] = "create_roles";
    Permission["DELETE_ROLES"] = "delete_roles";
    // RBAC - Пользователи и роли
    Permission["MANAGE_USERS"] = "manage_users";
    Permission["VIEW_USER_ROLES"] = "view_user_roles";
    Permission["ASSIGN_ROLES"] = "assign_roles";
    // RBAC - Группы пользователей
    Permission["MANAGE_GROUPS"] = "manage_groups";
    Permission["VIEW_GROUPS"] = "view_groups";
    Permission["CREATE_GROUPS"] = "create_groups";
    Permission["DELETE_GROUPS"] = "delete_groups";
    // RBAC - Временные роли
    Permission["MANAGE_TEMPORARY_ROLES"] = "manage_temporary_roles";
    Permission["VIEW_TEMPORARY_ROLES"] = "view_temporary_roles";
    Permission["CREATE_TEMPORARY_ROLES"] = "create_temporary_roles";
    // RBAC - Делегирование полномочий
    Permission["MANAGE_DELEGATIONS"] = "manage_delegations";
    Permission["VIEW_DELEGATIONS"] = "view_delegations";
    Permission["CREATE_DELEGATIONS"] = "create_delegations";
    Permission["REVOKE_DELEGATIONS"] = "revoke_delegations";
    // RBAC - Разрешения и аудит
    Permission["VIEW_USER_PERMISSIONS"] = "view_user_permissions";
    Permission["VIEW_RBAC_STATS"] = "view_rbac_stats";
    Permission["VIEW_AUDIT_LOGS"] = "view_audit_logs";
    // Разработка
    Permission["ACCESS_DEV_TOOLS"] = "access_dev_tools";
    Permission["RUN_TESTS"] = "run_tests";
})(Permission = exports.Permission || (exports.Permission = {}));
/**
 * Конфигурация разрешений для каждой роли
 */
exports.rolePermissions = {
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
exports.permissionGroups = {
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
function roleHasPermission(role, permission) {
    var _a;
    return ((_a = exports.rolePermissions[role]) === null || _a === void 0 ? void 0 : _a.includes(permission)) || false;
}
exports.roleHasPermission = roleHasPermission;
/**
 * Проверка наличия любого из указанных разрешений
 */
function roleHasAnyPermission(role, permissions) {
    return permissions.some(permission => roleHasPermission(role, permission));
}
exports.roleHasAnyPermission = roleHasAnyPermission;
/**
 * Проверка наличия всех указанных разрешений
 */
function roleHasAllPermissions(role, permissions) {
    return permissions.every(permission => roleHasPermission(role, permission));
}
exports.roleHasAllPermissions = roleHasAllPermissions;
/**
 * Получение всех разрешений для роли
 */
function getRolePermissions(role) {
    return exports.rolePermissions[role] || [];
}
exports.getRolePermissions = getRolePermissions;
/**
 * Получение всех возможных разрешений в системе
 */
function getAllPermissions() {
    return Object.values(Permission);
}
exports.getAllPermissions = getAllPermissions;
/**
 * Описания ролей для UI
 */
exports.roleDescriptions = {
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
exports.permissionDescriptions = {
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
function hasPermissionSecure(customClaims, profileRole, permission) {
    // 1. Проверяем Custom Claims (приоритет)
    if ((customClaims === null || customClaims === void 0 ? void 0 : customClaims.isActive) && (customClaims === null || customClaims === void 0 ? void 0 : customClaims.permissions)) {
        return customClaims.permissions.includes(permission);
    }
    // 2. Фоллбэк на роль из профиля
    if (profileRole) {
        return roleHasPermission(profileRole, permission);
    }
    // 3. По умолчанию - нет доступа
    return false;
}
exports.hasPermissionSecure = hasPermissionSecure;
/**
 * Проверка роли с поддержкой Custom Claims
 */
function hasRoleSecure(customClaims, profileRole, requiredRole) {
    // 1. Проверяем Custom Claims
    if ((customClaims === null || customClaims === void 0 ? void 0 : customClaims.isActive) && (customClaims === null || customClaims === void 0 ? void 0 : customClaims.role)) {
        return customClaims.role === requiredRole;
    }
    // 2. Фоллбэк на роль из профиля
    if (profileRole) {
        return profileRole === requiredRole;
    }
    return false;
}
exports.hasRoleSecure = hasRoleSecure;
/**
 * Проверка активности пользователя
 */
function isUserActiveSecure(customClaims, profileActive = true) {
    // Если есть Custom Claims - используем их
    if (customClaims !== null) {
        return customClaims.isActive === true;
    }
    // Фоллбэк на статус из профиля
    return profileActive;
}
exports.isUserActiveSecure = isUserActiveSecure;
/**
 * Получение эффективной роли пользователя
 */
function getEffectiveRole(customClaims, profileRole) {
    // Приоритет Custom Claims
    if ((customClaims === null || customClaims === void 0 ? void 0 : customClaims.isActive) && (customClaims === null || customClaims === void 0 ? void 0 : customClaims.role)) {
        return customClaims.role;
    }
    // Фоллбэк на роль из профиля
    return profileRole;
}
exports.getEffectiveRole = getEffectiveRole;
/**
 * Получение эффективных разрешений пользователя
 */
function getEffectivePermissions(customClaims, profileRole) {
    // Если есть активные Custom Claims с разрешениями
    if ((customClaims === null || customClaims === void 0 ? void 0 : customClaims.isActive) && (customClaims === null || customClaims === void 0 ? void 0 : customClaims.permissions)) {
        return customClaims.permissions.map(p => p);
    }
    // Фоллбэк на разрешения роли из профиля
    if (profileRole) {
        return getRolePermissions(profileRole);
    }
    return [];
}
exports.getEffectivePermissions = getEffectivePermissions;
/**
 * Проверка административных прав (owner/manager)
 */
function hasAdminRightsSecure(customClaims, profileRole) {
    const effectiveRole = getEffectiveRole(customClaims, profileRole);
    return effectiveRole === 'owner' || effectiveRole === 'manager';
}
exports.hasAdminRightsSecure = hasAdminRightsSecure;
/**
 * Проверка финансовых прав (owner/accountant)
 */
function hasFinancialRightsSecure(customClaims, profileRole) {
    const effectiveRole = getEffectiveRole(customClaims, profileRole);
    return effectiveRole === 'owner' || effectiveRole === 'accountant';
}
exports.hasFinancialRightsSecure = hasFinancialRightsSecure;
/**
 * Hook для использования в React компонентах
 */
function usePermissions(customClaims, profileRole) {
    return {
        hasPermission: (permission) => hasPermissionSecure(customClaims, profileRole, permission),
        hasRole: (role) => hasRoleSecure(customClaims, profileRole, role),
        hasAnyPermission: (permissions) => permissions.some(p => hasPermissionSecure(customClaims, profileRole, p)),
        hasAllPermissions: (permissions) => permissions.every(p => hasPermissionSecure(customClaims, profileRole, p)),
        isActive: () => isUserActiveSecure(customClaims, true),
        isAdmin: () => hasAdminRightsSecure(customClaims, profileRole),
        hasFinancialAccess: () => hasFinancialRightsSecure(customClaims, profileRole),
        getRole: () => getEffectiveRole(customClaims, profileRole),
        getPermissions: () => getEffectivePermissions(customClaims, profileRole),
    };
}
exports.usePermissions = usePermissions;
//# sourceMappingURL=permissions.js.map
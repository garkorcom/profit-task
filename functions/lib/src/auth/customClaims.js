"use strict";
/**
 * Утилиты для работы с Custom Claims
 *
 * Интеграция с Firebase Auth Custom Claims для серверного
 * управления ролями и разрешениями
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoleDescription = exports.checkAccess = exports.hasFinancialRights = exports.hasAdminRights = exports.hasAllPermissions = exports.hasAnyPermission = exports.hasPermission = exports.isUserActive = exports.hasRole = exports.refreshUserCustomClaims = exports.getUserCustomClaims = void 0;
/**
 * Получение Custom Claims из ID токена пользователя
 */
const getUserCustomClaims = async (user) => {
    if (!user)
        return null;
    try {
        const idTokenResult = await user.getIdTokenResult();
        return {
            role: idTokenResult.claims.role,
            isActive: idTokenResult.claims.isActive,
            permissions: idTokenResult.claims.permissions
        };
    }
    catch (error) {
        console.error('Error fetching custom claims:', error);
        return null;
    }
};
exports.getUserCustomClaims = getUserCustomClaims;
/**
 * Форсированное обновление Custom Claims
 * Используется после изменения роли на сервере
 */
const refreshUserCustomClaims = async (user) => {
    if (!user)
        return null;
    try {
        // Форсируем обновление токена (true = force refresh)
        const idTokenResult = await user.getIdTokenResult(true);
        return {
            role: idTokenResult.claims.role,
            isActive: idTokenResult.claims.isActive,
            permissions: idTokenResult.claims.permissions
        };
    }
    catch (error) {
        console.error('Error refreshing custom claims:', error);
        return null;
    }
};
exports.refreshUserCustomClaims = refreshUserCustomClaims;
/**
 * Проверка роли пользователя через Custom Claims
 */
const hasRole = (claims, role) => {
    return (claims === null || claims === void 0 ? void 0 : claims.role) === role;
};
exports.hasRole = hasRole;
/**
 * Проверка активности пользователя через Custom Claims
 */
const isUserActive = (claims) => {
    return (claims === null || claims === void 0 ? void 0 : claims.isActive) === true;
};
exports.isUserActive = isUserActive;
/**
 * Проверка разрешения через Custom Claims
 */
const hasPermission = (claims, permission) => {
    var _a;
    return ((_a = claims === null || claims === void 0 ? void 0 : claims.permissions) === null || _a === void 0 ? void 0 : _a.includes(permission)) || false;
};
exports.hasPermission = hasPermission;
/**
 * Проверка любого из разрешений через Custom Claims
 */
const hasAnyPermission = (claims, permissions) => {
    if (!(claims === null || claims === void 0 ? void 0 : claims.permissions))
        return false;
    return permissions.some(permission => { var _a; return (_a = claims.permissions) === null || _a === void 0 ? void 0 : _a.includes(permission); });
};
exports.hasAnyPermission = hasAnyPermission;
/**
 * Проверка всех разрешений через Custom Claims
 */
const hasAllPermissions = (claims, permissions) => {
    if (!(claims === null || claims === void 0 ? void 0 : claims.permissions))
        return false;
    return permissions.every(permission => { var _a; return (_a = claims.permissions) === null || _a === void 0 ? void 0 : _a.includes(permission); });
};
exports.hasAllPermissions = hasAllPermissions;
/**
 * Проверка административных прав
 */
const hasAdminRights = (claims) => {
    return (0, exports.hasRole)(claims, 'owner') || (0, exports.hasRole)(claims, 'manager');
};
exports.hasAdminRights = hasAdminRights;
/**
 * Проверка финансовых прав
 */
const hasFinancialRights = (claims) => {
    return (0, exports.hasRole)(claims, 'owner') || (0, exports.hasRole)(claims, 'accountant');
};
exports.hasFinancialRights = hasFinancialRights;
/**
 * Безопасная проверка доступа с фоллбэком на роль из профиля
 * Используется в переходный период до полного перехода на Custom Claims
 */
const checkAccess = (claims, profileRole, requiredRole, requiredPermission) => {
    // Если есть Custom Claims, используем их
    if (claims && (0, exports.isUserActive)(claims)) {
        if (requiredRole) {
            return (0, exports.hasRole)(claims, requiredRole);
        }
        if (requiredPermission) {
            return (0, exports.hasPermission)(claims, requiredPermission);
        }
    }
    // Фоллбэк на роль из профиля (для совместимости)
    if (profileRole && requiredRole) {
        return profileRole === requiredRole;
    }
    return false;
};
exports.checkAccess = checkAccess;
/**
 * Получение описания роли
 */
const getRoleDescription = (role) => {
    const descriptions = {
        'pending_approval': {
            name: 'Ожидает одобрения',
            description: 'Новый пользователь, ждет одобрения администратора',
            color: '#ffa726'
        },
        'field': {
            name: 'Исполнитель (Field)',
            description: 'Работник на объекте, учет времени и задач',
            color: '#8bc34a'
        },
        'employee': {
            name: 'Сотрудник',
            description: 'Выполнение задач и учет времени',
            color: '#4caf50'
        },
        'contractor': {
            name: 'Подрядчик',
            description: 'Ограниченный доступ к назначенным задачам',
            color: '#ff9800'
        },
        'estimator': {
            name: 'Сметчик/Инженер',
            description: 'Подготовка смет, pre-construction работы',
            color: '#795548'
        },
        'pm': {
            name: 'Руководитель проекта (PM)',
            description: 'Управление проектами, утверждение времени команды',
            color: '#3f51b5'
        },
        'accountant': {
            name: 'Бухгалтер/Финансист',
            description: 'Управление финансами, ставками и отчетностью',
            color: '#607d8b'
        },
        'manager': {
            name: 'Менеджер',
            description: 'Управление проектами, задачами и ресурсами',
            color: '#2196f3'
        },
        'owner': {
            name: 'Владелец',
            description: 'Полный доступ ко всем функциям системы',
            color: '#9c27b0'
        },
        'deactivated': {
            name: 'Деактивирован',
            description: 'Пользователь деактивирован администратором',
            color: '#f44336'
        }
    };
    return descriptions[role] || descriptions['employee'];
};
exports.getRoleDescription = getRoleDescription;
//# sourceMappingURL=customClaims.js.map
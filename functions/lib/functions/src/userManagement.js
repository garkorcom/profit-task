"use strict";
/**
 * Firebase Cloud Functions для безопасного управления пользователями
 *
 * КРИТИЧЕСКИ ВАЖНО: Все операции с ролями, ставками и привилегиями
 * должны происходить только на бэкенде для предотвращения злоупотреблений
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserProfileUpdate = exports.refreshUserCustomClaims = exports.deactivateUser = exports.updateUserHourlyRate = exports.updateUserRole = exports.onUserCreate = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();
const auth = admin.auth();
/**
 * 1.1 - ТРИГГЕР: Автоматическое создание профиля при регистрации
 * Срабатывает при создании нового пользователя в Firebase Auth
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    var _a;
    console.log(`Creating profile for new user: ${user.uid}`);
    try {
        // Определяем роль по умолчанию на основе домена email или других критериев
        let defaultRole = 'pending_approval';
        let isActive = false;
        // Белый список доменов для автоматического одобрения (опционально)
        const trustedDomains = ['yourdomain.com']; // Замените на ваши домены
        const emailDomain = (_a = user.email) === null || _a === void 0 ? void 0 : _a.split('@')[1];
        if (emailDomain && trustedDomains.includes(emailDomain)) {
            defaultRole = 'field'; // Базовая роль для сотрудников
            isActive = true;
        }
        // Первый пользователь становится owner (если нет других)
        const existingUsersQuery = await db.collection('users').limit(1).get();
        if (existingUsersQuery.empty) {
            defaultRole = 'owner';
            isActive = true;
            console.log('First user created, assigning owner role');
        }
        // Создаем базовый профиль с минимальными правами
        const newProfile = {
            id: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            phoneNumber: user.phoneNumber || '',
            role: defaultRole,
            isActive,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Сохраняем в Firestore
        await db.collection('users').doc(user.uid).set(newProfile);
        // Получаем разрешения для роли
        const permissions = getRolePermissions(defaultRole);
        // Устанавливаем Custom Claims с полным набором данных
        await auth.setCustomUserClaims(user.uid, {
            role: defaultRole,
            isActive,
            permissions: permissions,
            lastClaimsUpdate: Date.now()
        });
        // Логируем создание аккаунта
        await createAuditLog({
            userId: user.uid,
            actorId: 'system',
            action: 'ACCOUNT_CREATED',
            resource: 'user_profile',
            resourceId: user.uid,
            newValue: newProfile,
            success: true
        });
        console.log(`Profile created successfully for user: ${user.uid}`);
    }
    catch (error) {
        console.error(`Error creating profile for user ${user.uid}:`, error);
        // Логируем ошибку
        await createAuditLog({
            userId: user.uid,
            actorId: 'system',
            action: 'ACCOUNT_CREATED',
            resource: 'user_profile',
            resourceId: user.uid,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
});
/**
 * 1.2 - ЗАЩИЩЕННАЯ ФУНКЦИЯ: Обновление роли пользователя
 * Только администраторы (owner/manager) могут изменять роли
 */
exports.updateUserRole = functions.https.onCall(async (data, context) => {
    // Проверка аутентификации
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    // Проверка прав доступа
    const actorId = context.auth.uid;
    const actorClaims = context.auth.token;
    if (!hasAdminRights(actorClaims)) {
        await createAuditLog({
            userId: data.targetUserId,
            actorId,
            action: 'UPDATE_USER_ROLE',
            resource: 'user_profile',
            resourceId: data.targetUserId,
            success: false,
            errorMessage: 'Insufficient permissions'
        });
        throw new functions.https.HttpsError('permission-denied', 'Only owners and managers can change user roles');
    }
    const { targetUserId, newRole, reason } = data;
    if (!targetUserId || !newRole) {
        throw new functions.https.HttpsError('invalid-argument', 'targetUserId and newRole are required');
    }
    try {
        // Получаем текущий профиль
        const userRef = db.collection('users').doc(targetUserId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        const currentProfile = userDoc.data();
        const oldRole = currentProfile.role;
        // Обновляем профиль
        await userRef.update({
            role: newRole,
            isActive: newRole !== 'pending_approval',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Получаем новые разрешения для роли
        const permissions = getRolePermissions(newRole);
        const isActive = newRole !== 'pending_approval' && newRole !== 'deactivated';
        // Обновляем Custom Claims с полным набором данных
        await auth.setCustomUserClaims(targetUserId, {
            role: newRole,
            isActive,
            permissions: permissions,
            lastClaimsUpdate: Date.now()
        });
        // Логируем изменение
        await createAuditLog({
            userId: targetUserId,
            actorId,
            action: 'UPDATE_USER_ROLE',
            resource: 'user_profile',
            resourceId: targetUserId,
            oldValue: { role: oldRole },
            newValue: { role: newRole, reason },
            success: true
        });
        console.log(`Role updated: ${oldRole} -> ${newRole} for user ${targetUserId} by ${actorId}`);
        return {
            success: true,
            message: `Role updated from ${oldRole} to ${newRole}`,
            oldRole,
            newRole
        };
    }
    catch (error) {
        console.error(`Error updating role for user ${targetUserId}:`, error);
        await createAuditLog({
            userId: targetUserId,
            actorId,
            action: 'UPDATE_USER_ROLE',
            resource: 'user_profile',
            resourceId: targetUserId,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to update user role');
    }
});
/**
 * 1.3 - ЗАЩИЩЕННАЯ ФУНКЦИЯ: Обновление часовой ставки
 * Только accountant и owner могут изменять ставки
 */
exports.updateUserHourlyRate = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const actorId = context.auth.uid;
    const actorClaims = context.auth.token;
    // Проверяем права на изменение ставок
    if (!hasFinancialRights(actorClaims)) {
        await createAuditLog({
            userId: data.targetUserId,
            actorId,
            action: 'UPDATE_HOURLY_RATE',
            resource: 'user_profile',
            resourceId: data.targetUserId,
            success: false,
            errorMessage: 'Insufficient permissions'
        });
        throw new functions.https.HttpsError('permission-denied', 'Only owners and accountants can change hourly rates');
    }
    const { targetUserId, newHourlyRate, effectiveDate, reason } = data;
    if (!targetUserId || typeof newHourlyRate !== 'number') {
        throw new functions.https.HttpsError('invalid-argument', 'targetUserId and newHourlyRate are required');
    }
    try {
        const userRef = db.collection('users').doc(targetUserId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        const currentProfile = userDoc.data();
        const oldRate = currentProfile.hourlyRate;
        // Обновляем ставку в профиле
        await userRef.update({
            hourlyRate: newHourlyRate,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Создаем историческую запись в LaborRates
        const laborRateRef = db.collection(`users/${targetUserId}/laborRates`).doc();
        await laborRateRef.set({
            userId: targetUserId,
            hourlyRate: newHourlyRate,
            effectiveFrom: effectiveDate || admin.firestore.FieldValue.serverTimestamp(),
            reason: reason || 'Manual update',
            createdBy: actorId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Логируем изменение
        await createAuditLog({
            userId: targetUserId,
            actorId,
            action: 'UPDATE_HOURLY_RATE',
            resource: 'user_profile',
            resourceId: targetUserId,
            oldValue: { hourlyRate: oldRate },
            newValue: { hourlyRate: newHourlyRate, reason },
            success: true
        });
        console.log(`Hourly rate updated: ${oldRate} -> ${newHourlyRate} for user ${targetUserId} by ${actorId}`);
        return {
            success: true,
            message: `Hourly rate updated from ${oldRate} to ${newHourlyRate}`,
            oldRate,
            newRate: newHourlyRate
        };
    }
    catch (error) {
        console.error(`Error updating hourly rate for user ${targetUserId}:`, error);
        await createAuditLog({
            userId: targetUserId,
            actorId,
            action: 'UPDATE_HOURLY_RATE',
            resource: 'user_profile',
            resourceId: targetUserId,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to update hourly rate');
    }
});
/**
 * 1.4 - ЗАЩИЩЕННАЯ ФУНКЦИЯ: Деактивация пользователя (Offboarding)
 */
exports.deactivateUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const actorId = context.auth.uid;
    const actorClaims = context.auth.token;
    if (!hasAdminRights(actorClaims)) {
        throw new functions.https.HttpsError('permission-denied', 'Only owners and managers can deactivate users');
    }
    const { targetUserId, reason } = data;
    if (!targetUserId) {
        throw new functions.https.HttpsError('invalid-argument', 'targetUserId is required');
    }
    try {
        // Обновляем профиль
        const userRef = db.collection('users').doc(targetUserId);
        await userRef.update({
            isActive: false,
            deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
            deactivatedBy: actorId,
            deactivationReason: reason,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Обновляем Custom Claims
        await auth.setCustomUserClaims(targetUserId, {
            role: 'deactivated',
            isActive: false
        });
        // Отключаем аккаунт в Firebase Auth
        await auth.updateUser(targetUserId, { disabled: true });
        // Отзываем все refresh токены (принудительный выход)
        await auth.revokeRefreshTokens(targetUserId);
        // Логируем деактивацию
        await createAuditLog({
            userId: targetUserId,
            actorId,
            action: 'USER_DEACTIVATED',
            resource: 'user_profile',
            resourceId: targetUserId,
            newValue: { reason },
            success: true
        });
        console.log(`User ${targetUserId} deactivated by ${actorId}`);
        return { success: true, message: 'User deactivated successfully' };
    }
    catch (error) {
        console.error(`Error deactivating user ${targetUserId}:`, error);
        await createAuditLog({
            userId: targetUserId,
            actorId,
            action: 'USER_DEACTIVATED',
            resource: 'user_profile',
            resourceId: targetUserId,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new functions.https.HttpsError('internal', 'Failed to deactivate user');
    }
});
/**
 * 1.5 - СЛУЖЕБНАЯ ФУНКЦИЯ: Принудительное обновление Custom Claims
 * Для синхронизации Claims с актуальными ролями в базе
 */
exports.refreshUserCustomClaims = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const actorId = context.auth.uid;
    const actorClaims = context.auth.token;
    // Только администраторы могут принудительно обновлять Claims
    if (!hasAdminRights(actorClaims)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can refresh Custom Claims');
    }
    const { targetUserId } = data;
    const userId = targetUserId || actorId; // Если не указан - обновляем свои
    try {
        // Получаем актуальный профиль из Firestore
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        const userData = userDoc.data();
        const permissions = getRolePermissions(userData.role);
        // Обновляем Custom Claims согласно актуальным данным профиля
        await auth.setCustomUserClaims(userId, {
            role: userData.role,
            isActive: userData.isActive,
            permissions: permissions,
            lastClaimsUpdate: Date.now()
        });
        // Логируем операцию
        await createAuditLog({
            userId,
            actorId,
            action: 'REFRESH_CUSTOM_CLAIMS',
            resource: 'user_profile',
            resourceId: userId,
            newValue: { role: userData.role, isActive: userData.isActive, permissionCount: permissions.length },
            success: true
        });
        console.log(`Custom Claims refreshed for user ${userId} by ${actorId}`);
        return {
            success: true,
            message: 'Custom Claims refreshed successfully',
            role: userData.role,
            isActive: userData.isActive,
            permissions: permissions.length
        };
    }
    catch (error) {
        console.error(`Error refreshing custom claims for user ${userId}:`, error);
        await createAuditLog({
            userId,
            actorId,
            action: 'REFRESH_CUSTOM_CLAIMS',
            resource: 'user_profile',
            resourceId: userId,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to refresh custom claims');
    }
});
/**
 * ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
 */
/**
 * Получение разрешений для роли (базируется на permissions.ts из клиента)
 * ВАЖНО: Это серверная копия логики разрешений для синхронизации с Custom Claims
 */
function getRolePermissions(role) {
    const rolePermissions = {
        owner: [
            // Owner имеет ВСЕ разрешения
            'view_all_projects', 'create_projects', 'edit_projects', 'delete_projects',
            'view_all_tasks', 'create_tasks', 'edit_all_tasks', 'delete_tasks', 'assign_tasks',
            'view_estimates', 'create_estimates', 'edit_estimates', 'delete_estimates', 'approve_estimates',
            'view_finances', 'manage_finances', 'view_reports', 'export_reports',
            'view_all_users', 'create_users', 'edit_users', 'delete_users', 'change_user_roles',
            'view_warehouse', 'manage_warehouse', 'create_products', 'edit_products', 'delete_products', 'manage_stock',
            'view_contractors', 'create_contractors', 'edit_contractors', 'delete_contractors',
            'track_time', 'view_all_time_entries', 'edit_time_entries', 'delete_time_entries',
            'create_time_entry_draft', 'submit_time_entry', 'recall_time_entry', 'approve_time_entry', 'reject_time_entry', 'bulk_approve_time',
            'view_labor_rates', 'manage_labor_rates',
            'create_estimate_tasks', 'edit_estimate_tasks', 'view_estimate_tasks', 'manage_include_mode',
            'view_cogs_records', 'manage_cogs_records', 'view_cogs_report', 'view_timesheet_report', 'view_variance_report', 'export_erp_reports',
            'view_settings', 'manage_settings',
            'manage_roles', 'view_roles', 'create_roles', 'delete_roles',
            'manage_users', 'view_user_roles', 'assign_roles',
            'manage_groups', 'view_groups', 'create_groups', 'delete_groups',
            'view_audit_logs', 'access_dev_tools', 'run_tests'
        ],
        manager: [
            'view_all_projects', 'create_projects', 'edit_projects',
            'view_all_tasks', 'create_tasks', 'edit_all_tasks', 'delete_tasks', 'assign_tasks',
            'view_estimates', 'create_estimates', 'edit_estimates', 'approve_estimates',
            'view_finances', 'view_reports',
            'view_all_users',
            'view_warehouse', 'manage_warehouse', 'create_products', 'edit_products', 'manage_stock',
            'view_contractors', 'create_contractors', 'edit_contractors',
            'track_time', 'view_all_time_entries', 'edit_time_entries', 'approve_time_entry', 'bulk_approve_time'
        ],
        pm: [
            'view_all_projects', 'create_projects', 'edit_projects',
            'view_all_tasks', 'create_tasks', 'edit_all_tasks', 'delete_tasks', 'assign_tasks',
            'view_estimates', 'create_estimates', 'edit_estimates', 'approve_estimates',
            'view_estimate_tasks', 'view_cogs_records',
            'track_time', 'view_all_time_entries', 'view_own_time_entries',
            'create_time_entry_draft', 'submit_time_entry', 'recall_time_entry', 'approve_time_entry', 'reject_time_entry', 'bulk_approve_time',
            'view_reports', 'view_cogs_report', 'view_timesheet_report', 'view_variance_report', 'export_erp_reports',
            'view_contractors', 'create_contractors', 'edit_contractors'
        ],
        accountant: [
            'view_finances', 'manage_finances', 'view_reports', 'export_reports',
            'view_labor_rates', 'manage_labor_rates',
            'view_cogs_records', 'manage_cogs_records',
            'view_all_time_entries', 'approve_time_entry', 'reject_time_entry', 'bulk_approve_time',
            'view_cogs_report', 'view_timesheet_report', 'view_variance_report', 'export_erp_reports',
            'view_contractors', 'create_contractors', 'edit_contractors',
            'view_settings'
        ],
        estimator: [
            'view_estimates', 'create_estimates', 'edit_estimates',
            'create_estimate_tasks', 'edit_estimate_tasks', 'view_estimate_tasks', 'manage_include_mode',
            'track_time', 'view_own_time_entries', 'create_time_entry_draft', 'submit_time_entry', 'recall_time_entry',
            'view_contractors', 'view_own_labor_rates'
        ],
        employee: [
            'view_own_projects',
            'view_own_tasks', 'edit_own_tasks',
            'view_estimates',
            'view_warehouse', 'view_contractors',
            'track_time', 'view_own_time_entries'
        ],
        contractor: [
            'view_own_projects', 'view_own_tasks',
            'track_time', 'view_own_time_entries'
        ],
        field: [
            'view_own_projects', 'view_own_tasks',
            'track_time', 'view_own_time_entries', 'create_time_entry_draft', 'submit_time_entry', 'recall_time_entry'
        ],
        pending_approval: [],
        deactivated: []
    };
    return rolePermissions[role] || [];
}
/**
 * Проверка административных прав
 */
function hasAdminRights(claims) {
    return claims.role === 'owner' || claims.role === 'manager';
}
/**
 * Проверка финансовых прав
 */
function hasFinancialRights(claims) {
    return claims.role === 'owner' || claims.role === 'accountant';
}
/**
 * Создание записи аудита
 */
async function createAuditLog(entry) {
    try {
        const auditRef = db.collection('auditLogs').doc();
        await auditRef.set(Object.assign({ id: auditRef.id, timestamp: admin.firestore.FieldValue.serverTimestamp() }, entry));
    }
    catch (error) {
        console.error('Failed to create audit log:', error);
        // Не бросаем ошибку, чтобы не нарушить основную операцию
    }
}
/**
 * Триггер для логирования изменений профиля
 */
exports.onUserProfileUpdate = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const userId = context.params.userId;
    // Определяем изменённые поля
    const changedFields = {};
    for (const field of ['role', 'hourlyRate', 'isActive', 'employeeId', 'contractorId']) {
        if (before[field] !== after[field]) {
            changedFields[field] = { old: before[field], new: after[field] };
        }
    }
    // Если есть критические изменения, логируем их
    if (Object.keys(changedFields).length > 0) {
        await createAuditLog({
            userId,
            actorId: after.updatedBy || 'system',
            action: 'PROFILE_UPDATED',
            resource: 'user_profile',
            resourceId: userId,
            oldValue: changedFields,
            newValue: changedFields,
            success: true
        });
    }
});
//# sourceMappingURL=userManagement.js.map
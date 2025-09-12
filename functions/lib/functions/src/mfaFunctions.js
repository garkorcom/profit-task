"use strict";
/**
 * Cloud Functions для Multi-Factor Authentication (MFA)
 *
 * Модуль 15: MFA (Multi-Factor Authentication)
 * - TOTP (Google Authenticator, Authy)
 * - SMS backup коды
 * - Принудительное включение для админов
 * - Recovery коды
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMSCode = exports.enableSMSBackup = exports.getMFAStatus = exports.regenerateBackupCodes = exports.disableMFA = exports.verifyMFACode = exports.completeMFASetup = exports.initiateMFASetup = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const crypto = require("crypto");
const db = admin.firestore();
/**
 * Генерация Base32 секрета для TOTP
 */
function generateBase32Secret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
        secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
}
/**
 * Генерация TOTP кода на основе секрета
 */
function generateTOTP(secret, window = 0) {
    const time = Math.floor(Date.now() / 1000 / 30) + window;
    const timeBuffer = Buffer.allocUnsafe(8);
    timeBuffer.writeUInt32BE(Math.floor(time / 0x100000000), 0);
    timeBuffer.writeUInt32BE(time & 0xffffffff, 4);
    const key = Buffer.from(base32Decode(secret));
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(timeBuffer);
    const hash = hmac.digest();
    const offset = hash[19] & 0xf;
    const code = ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff);
    return (code % 1000000).toString().padStart(6, '0');
}
/**
 * Base32 декодер
 */
function base32Decode(encoded) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = [];
    for (let i = 0; i < encoded.length; i++) {
        const char = encoded[i];
        const index = chars.indexOf(char.toUpperCase());
        if (index === -1)
            continue;
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            output.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(output);
}
/**
 * Проверка TOTP кода с учетом временного окна
 */
function verifyTOTP(secret, token, window = 1) {
    for (let i = -window; i <= window; i++) {
        const expectedToken = generateTOTP(secret, i);
        if (expectedToken === token) {
            return true;
        }
    }
    return false;
}
/**
 * Генерация резервных кодов
 */
function generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code.substring(0, 6));
    }
    return codes;
}
/**
 * Инициация настройки MFA для пользователя
 */
exports.initiateMFASetup = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const { auth: authContext } = request;
    if (!authContext) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    try {
        const userId = authContext.uid;
        const secret = generateBase32Secret();
        const backupCodes = generateBackupCodes();
        // Получаем пользователя для определения email
        const userRecord = await admin.auth().getUser(userId);
        const email = userRecord.email || `user_${userId}`;
        // Создаем OTPAuth URL для QR кода
        const issuer = 'MyBusinessApp';
        const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
        // Сохраняем временную настройку (не активную)
        await db.collection('mfa_setup_temp').doc(userId).set({
            userId,
            secret,
            backupCodes,
            otpauthUrl,
            isActive: false,
            createdAt: firestore_1.Timestamp.now(),
            expiresAt: firestore_1.Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000)) // 15 минут
        });
        return {
            secret,
            qrCode: otpauthUrl,
            backupCodes,
            setupId: userId
        };
    }
    catch (error) {
        console.error('Error initiating MFA setup:', error);
        throw new https_1.HttpsError('internal', 'Failed to initiate MFA setup');
    }
});
/**
 * Завершение настройки MFA с верификацией TOTP кода
 */
exports.completeMFASetup = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const { auth: authContext, data } = request;
    if (!authContext) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const { setupId, verificationCode } = data;
    if (!setupId || !verificationCode) {
        throw new https_1.HttpsError('invalid-argument', 'setupId and verificationCode are required');
    }
    try {
        const userId = authContext.uid;
        if (setupId !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Invalid setup ID');
        }
        // Получаем временную настройку
        const setupDoc = await db.collection('mfa_setup_temp').doc(userId).get();
        if (!setupDoc.exists) {
            throw new https_1.HttpsError('not-found', 'MFA setup session not found or expired');
        }
        const setup = setupDoc.data();
        // Проверяем истечение сессии
        if (setup.expiresAt.toDate() < new Date()) {
            await db.collection('mfa_setup_temp').doc(userId).delete();
            throw new https_1.HttpsError('deadline-exceeded', 'MFA setup session expired');
        }
        // Верифицируем TOTP код
        const isValidCode = verifyTOTP(setup.secret, verificationCode);
        if (!isValidCode) {
            throw new https_1.HttpsError('invalid-argument', 'Invalid verification code');
        }
        // Активируем MFA
        const batch = db.batch();
        // Сохраняем MFA настройки
        const mfaRef = db.collection('user_mfa').doc(userId);
        batch.set(mfaRef, {
            userId,
            isEnabled: true,
            totpSecret: setup.secret,
            backupCodes: setup.backupCodes.map((code) => ({
                code: crypto.createHash('sha256').update(code).digest('hex'),
                isUsed: false,
                createdAt: firestore_1.Timestamp.now()
            })),
            methods: {
                totp: true,
                sms: false,
                email: false
            },
            enabledAt: firestore_1.Timestamp.now(),
            lastVerified: firestore_1.Timestamp.now()
        });
        // Обновляем профиль пользователя
        const userRef = db.collection('users').doc(userId);
        batch.update(userRef, {
            mfaEnabled: true,
            mfaEnabledAt: firestore_1.Timestamp.now()
        });
        // Удаляем временную настройку
        batch.delete(db.collection('mfa_setup_temp').doc(userId));
        await batch.commit();
        // Логируем в audit trail
        await db.collection('audit_logs').add({
            timestamp: firestore_1.Timestamp.now(),
            userId,
            action: 'MFA_ENABLED',
            category: 'SECURITY',
            details: {
                method: 'TOTP',
                setupId
            },
            ipAddress: request.rawRequest.ip,
            userAgent: request.rawRequest.headers['user-agent'],
            outcome: 'SUCCESS'
        });
        return {
            success: true,
            message: 'MFA successfully enabled',
            backupCodes: setup.backupCodes
        };
    }
    catch (error) {
        console.error('Error completing MFA setup:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to complete MFA setup');
    }
});
/**
 * Верификация MFA кода при входе
 */
exports.verifyMFACode = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    var _a;
    const { auth: authContext, data } = request;
    if (!authContext) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const { code, isBackupCode = false } = data;
    if (!code) {
        throw new https_1.HttpsError('invalid-argument', 'Verification code is required');
    }
    try {
        const userId = authContext.uid;
        // Получаем MFA настройки
        const mfaDoc = await db.collection('user_mfa').doc(userId).get();
        if (!mfaDoc.exists || !((_a = mfaDoc.data()) === null || _a === void 0 ? void 0 : _a.isEnabled)) {
            throw new https_1.HttpsError('failed-precondition', 'MFA is not enabled for this user');
        }
        const mfaData = mfaDoc.data();
        let isValid = false;
        let usedBackupCode = null;
        if (isBackupCode) {
            // Проверяем резервный код
            const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
            for (let i = 0; i < mfaData.backupCodes.length; i++) {
                const backupCode = mfaData.backupCodes[i];
                if (backupCode.code === hashedCode && !backupCode.isUsed) {
                    isValid = true;
                    usedBackupCode = i;
                    break;
                }
            }
            if (isValid && usedBackupCode !== null) {
                // Отмечаем резервный код как использованный
                mfaData.backupCodes[usedBackupCode].isUsed = true;
                mfaData.backupCodes[usedBackupCode].usedAt = firestore_1.Timestamp.now();
                await db.collection('user_mfa').doc(userId).update({
                    backupCodes: mfaData.backupCodes,
                    lastVerified: firestore_1.Timestamp.now()
                });
            }
        }
        else {
            // Проверяем TOTP код
            isValid = verifyTOTP(mfaData.totpSecret, code);
            if (isValid) {
                await db.collection('user_mfa').doc(userId).update({
                    lastVerified: firestore_1.Timestamp.now()
                });
            }
        }
        // Логируем попытку верификации
        await db.collection('audit_logs').add({
            timestamp: firestore_1.Timestamp.now(),
            userId,
            action: 'MFA_VERIFICATION_ATTEMPT',
            category: 'SECURITY',
            details: {
                method: isBackupCode ? 'BACKUP_CODE' : 'TOTP',
                success: isValid,
                backupCodeUsed: usedBackupCode !== null ? usedBackupCode : undefined
            },
            ipAddress: request.rawRequest.ip,
            userAgent: request.rawRequest.headers['user-agent'],
            outcome: isValid ? 'SUCCESS' : 'FAILURE'
        });
        if (!isValid) {
            throw new https_1.HttpsError('invalid-argument', 'Invalid verification code');
        }
        return {
            success: true,
            verified: true,
            backupCodeUsed: usedBackupCode !== null
        };
    }
    catch (error) {
        console.error('Error verifying MFA code:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to verify MFA code');
    }
});
/**
 * Отключение MFA
 */
exports.disableMFA = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    var _a;
    const { auth: authContext, data } = request;
    if (!authContext) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const { confirmationCode } = data;
    try {
        const userId = authContext.uid;
        // Проверяем, не является ли MFA обязательным для этого пользователя
        const userRecord = await admin.auth().getUser(userId);
        const customClaims = userRecord.customClaims || {};
        if (customClaims.role === 'admin' || customClaims.role === 'owner') {
            throw new https_1.HttpsError('failed-precondition', 'MFA cannot be disabled for administrators');
        }
        // Если предоставлен код подтверждения, верифицируем его
        if (confirmationCode) {
            const mfaDoc = await db.collection('user_mfa').doc(userId).get();
            if (mfaDoc.exists && ((_a = mfaDoc.data()) === null || _a === void 0 ? void 0 : _a.isEnabled)) {
                const mfaData = mfaDoc.data();
                const isValidCode = verifyTOTP(mfaData.totpSecret, confirmationCode);
                if (!isValidCode) {
                    throw new https_1.HttpsError('invalid-argument', 'Invalid confirmation code');
                }
            }
        }
        // Удаляем MFA настройки
        const batch = db.batch();
        batch.delete(db.collection('user_mfa').doc(userId));
        batch.update(db.collection('users').doc(userId), {
            mfaEnabled: false,
            mfaDisabledAt: firestore_1.Timestamp.now()
        });
        await batch.commit();
        // Логируем отключение MFA
        await db.collection('audit_logs').add({
            timestamp: firestore_1.Timestamp.now(),
            userId,
            action: 'MFA_DISABLED',
            category: 'SECURITY',
            details: {
                confirmedWithCode: !!confirmationCode
            },
            ipAddress: request.rawRequest.ip,
            userAgent: request.rawRequest.headers['user-agent'],
            outcome: 'SUCCESS'
        });
        return {
            success: true,
            message: 'MFA successfully disabled'
        };
    }
    catch (error) {
        console.error('Error disabling MFA:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to disable MFA');
    }
});
/**
 * Генерация новых резервных кодов
 */
exports.regenerateBackupCodes = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    var _a;
    const { auth: authContext, data } = request;
    if (!authContext) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const { confirmationCode } = data;
    try {
        const userId = authContext.uid;
        // Получаем текущие MFA настройки
        const mfaDoc = await db.collection('user_mfa').doc(userId).get();
        if (!mfaDoc.exists || !((_a = mfaDoc.data()) === null || _a === void 0 ? void 0 : _a.isEnabled)) {
            throw new https_1.HttpsError('failed-precondition', 'MFA is not enabled for this user');
        }
        const mfaData = mfaDoc.data();
        // Верифицируем TOTP код для подтверждения
        if (!verifyTOTP(mfaData.totpSecret, confirmationCode)) {
            throw new https_1.HttpsError('invalid-argument', 'Invalid confirmation code');
        }
        // Генерируем новые резервные коды
        const newBackupCodes = generateBackupCodes();
        // Обновляем настройки MFA
        await db.collection('user_mfa').doc(userId).update({
            backupCodes: newBackupCodes.map(code => ({
                code: crypto.createHash('sha256').update(code).digest('hex'),
                isUsed: false,
                createdAt: firestore_1.Timestamp.now()
            })),
            backupCodesRegeneratedAt: firestore_1.Timestamp.now()
        });
        // Логируем регенерацию кодов
        await db.collection('audit_logs').add({
            timestamp: firestore_1.Timestamp.now(),
            userId,
            action: 'MFA_BACKUP_CODES_REGENERATED',
            category: 'SECURITY',
            details: {
                newCodesCount: newBackupCodes.length
            },
            ipAddress: request.rawRequest.ip,
            userAgent: request.rawRequest.headers['user-agent'],
            outcome: 'SUCCESS'
        });
        return {
            success: true,
            backupCodes: newBackupCodes
        };
    }
    catch (error) {
        console.error('Error regenerating backup codes:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to regenerate backup codes');
    }
});
/**
 * Получение статуса MFA пользователя
 */
exports.getMFAStatus = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    var _a, _b;
    const { auth: authContext } = request;
    if (!authContext) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    try {
        const userId = authContext.uid;
        // Получаем MFA настройки
        const mfaDoc = await db.collection('user_mfa').doc(userId).get();
        // Проверяем, является ли MFA обязательным
        const userRecord = await admin.auth().getUser(userId);
        const customClaims = userRecord.customClaims || {};
        const isMandatory = customClaims.role === 'admin' || customClaims.role === 'owner';
        if (!mfaDoc.exists) {
            return {
                isEnabled: false,
                isMandatory,
                methods: {
                    totp: false,
                    sms: false,
                    email: false
                },
                backupCodes: {
                    total: 0,
                    used: 0,
                    remaining: 0
                }
            };
        }
        const mfaData = mfaDoc.data();
        const usedCodes = ((_a = mfaData.backupCodes) === null || _a === void 0 ? void 0 : _a.filter((code) => code.isUsed).length) || 0;
        const totalCodes = ((_b = mfaData.backupCodes) === null || _b === void 0 ? void 0 : _b.length) || 0;
        return {
            isEnabled: mfaData.isEnabled,
            isMandatory,
            methods: mfaData.methods,
            backupCodes: {
                total: totalCodes,
                used: usedCodes,
                remaining: totalCodes - usedCodes
            },
            enabledAt: mfaData.enabledAt,
            lastVerified: mfaData.lastVerified
        };
    }
    catch (error) {
        console.error('Error getting MFA status:', error);
        throw new https_1.HttpsError('internal', 'Failed to get MFA status');
    }
});
/**
 * Настройка SMS как дополнительного метода MFA
 */
exports.enableSMSBackup = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    var _a;
    const { auth: authContext, data } = request;
    if (!authContext) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    const { phoneNumber, confirmationCode } = data;
    if (!phoneNumber || !confirmationCode) {
        throw new https_1.HttpsError('invalid-argument', 'Phone number and confirmation code are required');
    }
    try {
        const userId = authContext.uid;
        // Получаем текущие MFA настройки
        const mfaDoc = await db.collection('user_mfa').doc(userId).get();
        if (!mfaDoc.exists || !((_a = mfaDoc.data()) === null || _a === void 0 ? void 0 : _a.isEnabled)) {
            throw new https_1.HttpsError('failed-precondition', 'MFA must be enabled before adding SMS backup');
        }
        const mfaData = mfaDoc.data();
        // Верифицируем TOTP код
        if (!verifyTOTP(mfaData.totpSecret, confirmationCode)) {
            throw new https_1.HttpsError('invalid-argument', 'Invalid confirmation code');
        }
        // Обновляем настройки MFA
        await db.collection('user_mfa').doc(userId).update({
            'methods.sms': true,
            phoneNumber: phoneNumber,
            smsEnabledAt: firestore_1.Timestamp.now()
        });
        // Логируем включение SMS
        await db.collection('audit_logs').add({
            timestamp: firestore_1.Timestamp.now(),
            userId,
            action: 'MFA_SMS_ENABLED',
            category: 'SECURITY',
            details: {
                phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*') // Маскируем номер
            },
            ipAddress: request.rawRequest.ip,
            userAgent: request.rawRequest.headers['user-agent'],
            outcome: 'SUCCESS'
        });
        return {
            success: true,
            message: 'SMS backup successfully enabled'
        };
    }
    catch (error) {
        console.error('Error enabling SMS backup:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to enable SMS backup');
    }
});
/**
 * Отправка SMS кода (заглушка для интеграции с SMS провайдером)
 */
exports.sendSMSCode = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    var _a;
    const { auth: authContext } = request;
    if (!authContext) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required');
    }
    try {
        const userId = authContext.uid;
        // Получаем настройки MFA
        const mfaDoc = await db.collection('user_mfa').doc(userId).get();
        if (!mfaDoc.exists || !((_a = mfaDoc.data()) === null || _a === void 0 ? void 0 : _a.methods.sms)) {
            throw new https_1.HttpsError('failed-precondition', 'SMS backup is not enabled for this user');
        }
        const mfaData = mfaDoc.data();
        // Генерируем SMS код
        const smsCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Сохраняем код временно (5 минут)
        await db.collection('sms_codes_temp').doc(userId).set({
            userId,
            code: crypto.createHash('sha256').update(smsCode).digest('hex'),
            phoneNumber: mfaData.phoneNumber,
            createdAt: firestore_1.Timestamp.now(),
            expiresAt: firestore_1.Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)) // 5 минут
        });
        // TODO: Интеграция с SMS провайдером (Twilio, AWS SNS, etc.)
        console.log(`SMS code ${smsCode} for phone ${mfaData.phoneNumber}`);
        return {
            success: true,
            message: 'SMS code sent successfully'
        };
    }
    catch (error) {
        console.error('Error sending SMS code:', error);
        throw new https_1.HttpsError('internal', 'Failed to send SMS code');
    }
});
//# sourceMappingURL=mfaFunctions.js.map
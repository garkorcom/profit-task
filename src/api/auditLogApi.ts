/**
 * API для работы с системой Audit Log
 * 
 * Immutable audit logging с cryptographic integrity checks
 */

import { 
  collection, 
  doc, 
  addDoc,
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  startAfter,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/firebase';
import { 
  AuditLogEntry,
  AuditAction,
  AuditResource,
  AuditOutcome,
  AuditSeverity,
  AuditDetails,
  AuditMetadata,
  AuditLogQuery,
  AuditLogSearchResult,
  AuditLogExportRequest,
  AuditLogExportResult,
  ComplianceReport,
  ComplianceReportType,
  AuditAlert,
  AuditLogStats,
  AuditLogIntegrityCheck,
  AuditLogRetentionPolicy
} from '../types/auditLog';

// ================================
// CORE AUDIT LOGGING
// ================================

/**
 * Создание audit log записи
 * Используется серверная функция для обеспечения immutability и integrity
 */
export const createAuditLogEntry = async (
  action: AuditAction,
  resource: AuditResource,
  outcome: AuditOutcome,
  severity: AuditSeverity,
  details: AuditDetails,
  metadata?: Partial<AuditMetadata>,
  resourceId?: string,
  impersonatedUserId?: string
): Promise<string> => {
  const createAuditEntry = httpsCallable(functions, 'createAuditLogEntry');
  
  try {
    const result = await createAuditEntry({
      action,
      resource,
      resourceId,
      outcome,
      severity,
      details,
      metadata: {
        source: 'WEB_APP',
        ...metadata
      },
      impersonatedUserId
    });
    
    return (result.data as any).entryId;
  } catch (error) {
    console.error('Error creating audit log entry:', error);
    throw error;
  }
};

/**
 * Поиск audit log записей с фильтрацией
 */
export const searchAuditLog = async (
  query: AuditLogQuery
): Promise<AuditLogSearchResult> => {
  const searchAuditLogSecure = httpsCallable(functions, 'searchAuditLog');
  
  try {
    const result = await searchAuditLogSecure(query);
    return result.data as AuditLogSearchResult;
  } catch (error) {
    console.error('Error searching audit log:', error);
    throw error;
  }
};

/**
 * Получение конкретной audit log записи по ID
 */
export const getAuditLogEntry = async (entryId: string): Promise<AuditLogEntry | null> => {
  try {
    const docRef = doc(db, 'audit_log', entryId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      timestamp: data.timestamp?.toDate() || new Date(),
      ...data
    } as AuditLogEntry;
  } catch (error) {
    console.error('Error getting audit log entry:', error);
    return null;
  }
};

/**
 * Получение audit log записей для пользователя
 */
export const getUserAuditLog = async (
  userId: string, 
  limit: number = 50,
  startAfterDoc?: any
): Promise<{ entries: AuditLogEntry[]; hasMore: boolean }> => {
  try {
    let baseQuery = query(
      collection(db, 'audit_log'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      firestoreLimit(limit + 1) // +1 to check if there are more
    );
    
    if (startAfterDoc) {
      baseQuery = query(baseQuery, startAfter(startAfterDoc));
    }
    
    const querySnapshot = await getDocs(baseQuery);
    const entries: AuditLogEntry[] = [];
    
    querySnapshot.docs.forEach((doc, index) => {
      if (index < limit) { // Exclude the extra doc used for hasMore check
        const data = doc.data();
        entries.push({
          id: doc.id,
          timestamp: data.timestamp?.toDate() || new Date(),
          ...data
        } as AuditLogEntry);
      }
    });
    
    return {
      entries,
      hasMore: querySnapshot.docs.length > limit
    };
  } catch (error) {
    console.error('Error getting user audit log:', error);
    return { entries: [], hasMore: false };
  }
};

// ================================
// ЭКСПОРТ И REPORTING
// ================================

/**
 * Экспорт audit log данных
 */
export const exportAuditLog = async (
  exportRequest: AuditLogExportRequest
): Promise<AuditLogExportResult> => {
  const exportAuditLogSecure = httpsCallable(functions, 'exportAuditLog');
  
  try {
    const result = await exportAuditLogSecure(exportRequest);
    return result.data as AuditLogExportResult;
  } catch (error) {
    console.error('Error exporting audit log:', error);
    throw error;
  }
};

/**
 * Генерация compliance отчета
 */
export const generateComplianceReport = async (
  reportType: ComplianceReportType,
  startDate: Date,
  endDate: Date,
  includeViolations: boolean = true
): Promise<ComplianceReport> => {
  const generateComplianceReportSecure = httpsCallable(functions, 'generateComplianceReport');
  
  try {
    const result = await generateComplianceReportSecure({
      reportType,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      includeViolations
    });
    
    return result.data as ComplianceReport;
  } catch (error) {
    console.error('Error generating compliance report:', error);
    throw error;
  }
};

// ================================
// АЛЕРТЫ И МОНИТОРИНГ
// ================================

/**
 * Создание audit alert
 */
export const createAuditAlert = async (
  alert: Omit<AuditAlert, 'id' | 'createdAt' | 'lastTriggered'>
): Promise<string> => {
  const createAuditAlertSecure = httpsCallable(functions, 'createAuditAlert');
  
  try {
    const result = await createAuditAlertSecure(alert);
    return (result.data as any).alertId;
  } catch (error) {
    console.error('Error creating audit alert:', error);
    throw error;
  }
};

/**
 * Получение всех audit alerts
 */
export const getAllAuditAlerts = async (): Promise<AuditAlert[]> => {
  const getAllAuditAlertsSecure = httpsCallable(functions, 'getAllAuditAlerts');
  
  try {
    const result = await getAllAuditAlertsSecure({});
    return (result.data as any).alerts as AuditAlert[];
  } catch (error) {
    console.error('Error getting audit alerts:', error);
    return [];
  }
};

/**
 * Обновление audit alert
 */
export const updateAuditAlert = async (
  alertId: string,
  updates: Partial<AuditAlert>
): Promise<void> => {
  const updateAuditAlertSecure = httpsCallable(functions, 'updateAuditAlert');
  
  try {
    await updateAuditAlertSecure({ alertId, updates });
  } catch (error) {
    console.error('Error updating audit alert:', error);
    throw error;
  }
};

/**
 * Удаление audit alert
 */
export const deleteAuditAlert = async (alertId: string): Promise<void> => {
  const deleteAuditAlertSecure = httpsCallable(functions, 'deleteAuditAlert');
  
  try {
    await deleteAuditAlertSecure({ alertId });
  } catch (error) {
    console.error('Error deleting audit alert:', error);
    throw error;
  }
};

// ================================
// СТАТИСТИКА И АНАЛИТИКА
// ================================

/**
 * Получение статистики audit log
 */
export const getAuditLogStats = async (): Promise<AuditLogStats> => {
  const getAuditLogStatsSecure = httpsCallable(functions, 'getAuditLogStats');
  
  try {
    const result = await getAuditLogStatsSecure({});
    return result.data as AuditLogStats;
  } catch (error) {
    console.error('Error getting audit log stats:', error);
    throw error;
  }
};

/**
 * Получение активности пользователя за период
 */
export const getUserActivity = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalActions: number;
  actionBreakdown: { [action: string]: number };
  hourlyActivity: { [hour: string]: number };
  riskScore: number;
}> => {
  const getUserActivitySecure = httpsCallable(functions, 'getUserActivity');
  
  try {
    const result = await getUserActivitySecure({
      userId,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate)
    });
    
    return result.data as {
      totalActions: number;
      actionBreakdown: { [action: string]: number };
      hourlyActivity: { [hour: string]: number };
      riskScore: number;
    };
  } catch (error) {
    console.error('Error getting user activity:', error);
    throw error;
  }
};

// ================================
// ЦЕЛОСТНОСТЬ И БЕЗОПАСНОСТЬ
// ================================

/**
 * Проверка целостности audit log
 */
export const performIntegrityCheck = async (
  startDate?: Date,
  endDate?: Date
): Promise<AuditLogIntegrityCheck> => {
  const performIntegrityCheckSecure = httpsCallable(functions, 'performAuditLogIntegrityCheck');
  
  try {
    const result = await performIntegrityCheckSecure({
      startDate: startDate ? Timestamp.fromDate(startDate) : undefined,
      endDate: endDate ? Timestamp.fromDate(endDate) : undefined
    });
    
    return result.data as AuditLogIntegrityCheck;
  } catch (error) {
    console.error('Error performing integrity check:', error);
    throw error;
  }
};

/**
 * Получение политик хранения
 */
export const getRetentionPolicies = async (): Promise<AuditLogRetentionPolicy[]> => {
  const getRetentionPoliciesSecure = httpsCallable(functions, 'getAuditLogRetentionPolicies');
  
  try {
    const result = await getRetentionPoliciesSecure({});
    return (result.data as any).policies as AuditLogRetentionPolicy[];
  } catch (error) {
    console.error('Error getting retention policies:', error);
    return [];
  }
};

/**
 * Создание или обновление политики хранения
 */
export const saveRetentionPolicy = async (
  policy: Omit<AuditLogRetentionPolicy, 'id' | 'lastExecuted' | 'nextExecution'>
): Promise<string> => {
  const saveRetentionPolicySecure = httpsCallable(functions, 'saveAuditLogRetentionPolicy');
  
  try {
    const result = await saveRetentionPolicySecure(policy);
    return (result.data as any).policyId;
  } catch (error) {
    console.error('Error saving retention policy:', error);
    throw error;
  }
};

// ================================
// УТИЛИТЫ ДЛЯ РАЗРАБОТКИ
// ================================

/**
 * Добавление метаданных к audit entry (автоматическое получение контекста)
 */
export const enrichAuditMetadata = (metadata: Partial<AuditMetadata> = {}): AuditMetadata => {
  const enriched: AuditMetadata = {
    source: 'WEB_APP',
    // timestamp will be added on server
    userAgent: navigator.userAgent,
    ...metadata
  };

  // Попытка получить IP адрес (в реальном приложении это будет делаться на сервере)
  if (!enriched.ipAddress) {
    // IP будет добавлен серверной функцией
  }

  // Добавление информации о устройстве
  if (!enriched.deviceId) {
    enriched.deviceId = getDeviceFingerprint();
  }

  // Версия клиентского приложения
  if (!enriched.clientVersion) {
    enriched.clientVersion = process.env.REACT_APP_VERSION || '1.0.0';
  }

  return enriched;
};

/**
 * Генерация уникального отпечатка устройства
 */
const getDeviceFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    window.screen.width + 'x' + window.screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|');

  // Простой hash функция
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16);
};

/**
 * Helper functions для создания common audit entries
 */
export const AuditHelpers = {
  // Аутентификация
  loginSuccess: (metadata?: Partial<AuditMetadata>) =>
    createAuditLogEntry(
      'LOGIN_SUCCESS', 
      'SESSION', 
      'SUCCESS', 
      'MEDIUM',
      { description: 'User logged in successfully' },
      enrichAuditMetadata(metadata)
    ),

  loginFailed: (reason: string, metadata?: Partial<AuditMetadata>) =>
    createAuditLogEntry(
      'LOGIN_FAILED', 
      'SESSION', 
      'FAILURE', 
      'HIGH',
      { description: 'Login attempt failed', reason },
      enrichAuditMetadata(metadata)
    ),

  logout: (metadata?: Partial<AuditMetadata>) =>
    createAuditLogEntry(
      'LOGOUT', 
      'SESSION', 
      'SUCCESS', 
      'LOW',
      { description: 'User logged out' },
      enrichAuditMetadata(metadata)
    ),

  // Доступ к ресурсам
  accessGranted: (resource: AuditResource, resourceId: string, permission: string, metadata?: Partial<AuditMetadata>) =>
    createAuditLogEntry(
      'ACCESS_GRANTED',
      resource,
      'SUCCESS',
      'LOW',
      { 
        description: `Access granted to ${resource}`,
        additionalData: { permission, resourceId }
      },
      enrichAuditMetadata(metadata),
      resourceId
    ),

  accessDenied: (resource: AuditResource, resourceId: string, permission: string, reason: string, metadata?: Partial<AuditMetadata>) =>
    createAuditLogEntry(
      'ACCESS_DENIED',
      resource,
      'FAILURE',
      'MEDIUM',
      { 
        description: `Access denied to ${resource}`,
        reason,
        additionalData: { permission, resourceId }
      },
      enrichAuditMetadata(metadata),
      resourceId
    ),

  // Изменения данных
  resourceCreated: (resource: AuditResource, resourceId: string, newValue: any, metadata?: Partial<AuditMetadata>) =>
    createAuditLogEntry(
      resource === 'USER' ? 'USER_CREATED' : 
      resource === 'ROLE' ? 'ROLE_CREATED' :
      resource === 'PROJECT' ? 'PROJECT_CREATED' : 'USER_CREATED',
      resource,
      'SUCCESS',
      'MEDIUM',
      {
        description: `${resource} created`,
        newValue,
        additionalData: { resourceId }
      },
      enrichAuditMetadata(metadata),
      resourceId
    ),

  resourceUpdated: (resource: AuditResource, resourceId: string, oldValue: any, newValue: any, affectedFields: string[], metadata?: Partial<AuditMetadata>) =>
    createAuditLogEntry(
      resource === 'USER' ? 'USER_UPDATED' : 
      resource === 'ROLE' ? 'ROLE_UPDATED' :
      resource === 'PROJECT' ? 'PROJECT_UPDATED' : 'USER_UPDATED',
      resource,
      'SUCCESS',
      'MEDIUM',
      {
        description: `${resource} updated`,
        oldValue,
        newValue,
        affectedFields,
        additionalData: { resourceId }
      },
      enrichAuditMetadata(metadata),
      resourceId
    ),

  // Импровизация
  impersonationStarted: (targetUserId: string, reason: string, metadata?: Partial<AuditMetadata>) =>
    createAuditLogEntry(
      'IMPERSONATION_STARTED',
      'USER',
      'SUCCESS',
      'CRITICAL',
      {
        description: 'User impersonation session started',
        reason,
        additionalData: { targetUserId }
      },
      enrichAuditMetadata(metadata),
      targetUserId,
      targetUserId
    ),

  // Конфиденциальные операции
  sensitiveDataAccessed: (resource: AuditResource, resourceId: string, dataType: string, metadata?: Partial<AuditMetadata>) =>
    createAuditLogEntry(
      'SENSITIVE_DATA_ACCESSED',
      resource,
      'SUCCESS',
      'HIGH',
      {
        description: `Sensitive ${dataType} data accessed`,
        additionalData: { dataType, resourceId }
      },
      enrichAuditMetadata(metadata),
      resourceId
    )
};

// Default export
const auditLogApi = {
  createAuditLogEntry,
  searchAuditLog,
  getAuditLogEntry,
  getUserAuditLog,
  exportAuditLog,
  generateComplianceReport,
  createAuditAlert,
  getAllAuditAlerts,
  updateAuditAlert,
  deleteAuditAlert,
  getAuditLogStats,
  getUserActivity,
  performIntegrityCheck,
  getRetentionPolicies,
  saveRetentionPolicy,
  enrichAuditMetadata,
  AuditHelpers
};

export default auditLogApi;
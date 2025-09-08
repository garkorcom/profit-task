/**
 * Типы для системы Audit Log
 * 
 * Immutable audit logging для compliance и безопасности
 */

export interface AuditLogEntry {
  id: string;                    // Уникальный ID записи
  timestamp: Date;               // Время события (серверное время)
  userId?: string;               // ID пользователя (может быть null для системных событий)
  impersonatedUserId?: string;   // ID импровизируемого пользователя (если применимо)
  sessionId?: string;           // ID сессии пользователя
  action: AuditAction;          // Тип действия
  resource: AuditResource;      // Ресурс, с которым произошло действие
  resourceId?: string;          // ID конкретного ресурса
  outcome: AuditOutcome;        // Результат операции
  severity: AuditSeverity;      // Критичность события
  details: AuditDetails;        // Детали события
  metadata: AuditMetadata;      // Метаданные (IP, User-Agent, etc.)
  hash?: string;                // Cryptographic hash для проверки целостности
  previousHash?: string;        // Hash предыдущей записи для blockchain-like integrity
}

export type AuditAction = 
  // Аутентификация и авторизация
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_COMPLETE'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'MFA_SUCCESS'
  | 'MFA_FAILED'
  | 'SESSION_CREATED'
  | 'SESSION_EXPIRED'
  | 'SESSION_TERMINATED'
  
  // RBAC операции
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REVOKED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  | 'PERMISSION_CHECK'
  | 'ACCESS_GRANTED'
  | 'ACCESS_DENIED'
  
  // Управление пользователями
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_ACTIVATED'
  | 'USER_DEACTIVATED'
  | 'USER_DELETED'
  | 'PROFILE_UPDATED'
  
  // Группы пользователей
  | 'GROUP_CREATED'
  | 'GROUP_UPDATED'
  | 'GROUP_DELETED'
  | 'GROUP_MEMBER_ADDED'
  | 'GROUP_MEMBER_REMOVED'
  
  // Импровизация
  | 'IMPERSONATION_STARTED'
  | 'IMPERSONATION_ENDED'
  | 'IMPERSONATION_FAILED'
  
  // Конфиденциальные операции
  | 'SENSITIVE_DATA_ACCESSED'
  | 'SENSITIVE_DATA_EXPORTED'
  | 'SENSITIVE_DATA_DELETED'
  | 'ADMIN_PANEL_ACCESSED'
  | 'DEBUG_MODE_ENABLED'
  | 'DEBUG_MODE_DISABLED'
  
  // Системные события
  | 'SYSTEM_BACKUP_CREATED'
  | 'SYSTEM_RESTORE_INITIATED'
  | 'SYSTEM_MAINTENANCE_START'
  | 'SYSTEM_MAINTENANCE_END'
  | 'SECURITY_POLICY_CHANGED'
  | 'AUDIT_LOG_ACCESSED'
  | 'AUDIT_LOG_EXPORTED'
  
  // Бизнес-логика
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  | 'ESTIMATE_CREATED'
  | 'ESTIMATE_APPROVED'
  | 'ESTIMATE_REJECTED'
  | 'TIME_ENTRY_CREATED'
  | 'TIME_ENTRY_APPROVED'
  | 'TIME_ENTRY_REJECTED'
  | 'FINANCIAL_DATA_ACCESSED';

export type AuditResource = 
  | 'USER'
  | 'ROLE'
  | 'PERMISSION'
  | 'GROUP'
  | 'PROJECT'
  | 'ESTIMATE'
  | 'TIME_ENTRY'
  | 'FINANCE'
  | 'SYSTEM'
  | 'AUDIT_LOG'
  | 'SESSION'
  | 'MFA_DEVICE';

export type AuditOutcome = 
  | 'SUCCESS'
  | 'FAILURE'
  | 'WARNING'
  | 'INFO'
  | 'PARTIAL_SUCCESS';

export type AuditSeverity = 
  | 'LOW'        // Обычные операции
  | 'MEDIUM'     // Важные операции
  | 'HIGH'       // Критичные операции (доступ к конфиденциальной информации)
  | 'CRITICAL';  // Системные изменения, нарушения безопасности

export interface AuditDetails {
  description: string;           // Человеко-читаемое описание
  oldValue?: any;               // Старое значение (для UPDATE операций)
  newValue?: any;               // Новое значение (для UPDATE операций)
  affectedFields?: string[];    // Поля, которые были изменены
  affectedUsers?: string[];     // Затронутые пользователи
  reason?: string;              // Причина действия
  correlationId?: string;       // ID для связывания связанных событий
  additionalData?: { [key: string]: any }; // Дополнительные данные
}

export interface AuditMetadata {
  ipAddress?: string;           // IP адрес клиента
  userAgent?: string;          // User-Agent браузера
  deviceId?: string;           // Уникальный ID устройства
  location?: {                 // Геолокация (если доступна)
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  requestId?: string;          // ID запроса для трассировки
  apiVersion?: string;         // Версия API
  clientVersion?: string;      // Версия клиентского приложения
  source: AuditSource;         // Источник события
  tags?: string[];             // Теги для категоризации
}

export type AuditSource = 
  | 'WEB_APP'
  | 'API'
  | 'SYSTEM'
  | 'SCHEDULED_JOB'
  | 'WEBHOOK'
  | 'IMPORT'
  | 'MANUAL'
  | 'AUTOMATION';

// ================================
// ПОИСК И ФИЛЬТРАЦИЯ
// ================================

export interface AuditLogQuery {
  userId?: string;
  impersonatedUserId?: string;
  actions?: AuditAction[];
  resources?: AuditResource[];
  outcomes?: AuditOutcome[];
  severities?: AuditSeverity[];
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  resourceId?: string;
  correlationId?: string;
  searchText?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'action';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLogSearchResult {
  entries: AuditLogEntry[];
  totalCount: number;
  hasMore: boolean;
  aggregations?: AuditLogAggregations;
}

export interface AuditLogAggregations {
  actionCounts: { [action: string]: number };
  outcomeCounts: { [outcome: string]: number };
  severityCounts: { [severity: string]: number };
  resourceCounts: { [resource: string]: number };
  hourlyActivity: { [hour: string]: number };
  topUsers: Array<{ userId: string; count: number }>;
  topResources: Array<{ resourceId: string; count: number }>;
}

// ================================
// ЭКСПОРТ И АРХИВИРОВАНИЕ
// ================================

export interface AuditLogExportRequest {
  query: AuditLogQuery;
  format: 'JSON' | 'CSV' | 'PDF';
  includeMetadata: boolean;
  includeHashes: boolean;
  compression?: 'gzip' | 'zip';
  encryption?: {
    algorithm: string;
    publicKey: string;
  };
}

export interface AuditLogExportResult {
  exportId: string;
  downloadUrl: string;
  expiresAt: Date;
  fileSize: number;
  recordCount: number;
  checksum: string;
}

// ================================
// ИНТЕГРАЦИЯ С COMPLIANCE
// ================================

export interface ComplianceReport {
  reportId: string;
  reportType: ComplianceReportType;
  period: {
    startDate: Date;
    endDate: Date;
  };
  generatedAt: Date;
  generatedBy: string;
  entries: AuditLogEntry[];
  summary: ComplianceSummary;
  violations?: ComplianceViolation[];
  recommendations?: string[];
}

export type ComplianceReportType = 
  | 'SOX'          // Sarbanes-Oxley
  | 'GDPR'         // General Data Protection Regulation
  | 'SOC2'         // Service Organization Control 2
  | 'ISO27001'     // Information Security Management
  | 'CUSTOM';      // Пользовательский отчет

export interface ComplianceSummary {
  totalEvents: number;
  criticalEvents: number;
  failedLogins: number;
  adminActions: number;
  dataAccess: number;
  configurationChanges: number;
  complianceScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ComplianceViolation {
  violationType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedEntries: string[]; // IDs audit log entries
  recommendation: string;
  requiresAction: boolean;
}

// ================================
// СИСТЕМА АЛЕРТОВ
// ================================

export interface AuditAlert {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  conditions: AuditAlertCondition[];
  actions: AuditAlertAction[];
  cooldownMinutes: number;    // Минимальное время между срабатываниями
  lastTriggered?: Date;
  createdAt: Date;
  createdBy: string;
}

export interface AuditAlertCondition {
  field: keyof AuditLogEntry;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
  logicOperator?: 'AND' | 'OR'; // Для соединения с следующим условием
}

export interface AuditAlertAction {
  type: 'EMAIL' | 'WEBHOOK' | 'SLACK' | 'TEAMS' | 'SMS';
  target: string; // email, webhook URL, etc.
  template: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

// ================================
// СТАТИСТИКА И АНАЛИТИКА
// ================================

export interface AuditLogStats {
  totalEntries: number;
  entriesLast24h: number;
  entriesLastWeek: number;
  entriesLastMonth: number;
  averageEntriesPerDay: number;
  topActions: Array<{ action: AuditAction; count: number }>;
  topUsers: Array<{ userId: string; count: number }>;
  securityEvents: number;
  failedOperations: number;
  systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  integrityStatus: 'VERIFIED' | 'PENDING' | 'COMPROMISED';
  oldestEntry?: Date;
  newestEntry?: Date;
  storageUsageMB: number;
}

// ================================
// ЦЕЛОСТНОСТЬ И БЕЗОПАСНОСТЬ
// ================================

export interface AuditLogIntegrityCheck {
  checkId: string;
  performedAt: Date;
  performedBy: string;
  result: 'PASSED' | 'FAILED' | 'WARNING';
  checkedEntries: number;
  corruptedEntries: number;
  missingHashes: number;
  brokenChains: number;
  details: string[];
  recommendations?: string[];
}

export interface AuditLogRetentionPolicy {
  id: string;
  name: string;
  description: string;
  retentionPeriodDays: number;
  archiveBeforeDelete: boolean;
  archiveLocation?: string;
  autoDelete: boolean;
  exceptions: Array<{
    condition: AuditLogQuery;
    retentionPeriodDays: number;
    reason: string;
  }>;
  isActive: boolean;
  lastExecuted?: Date;
  nextExecution?: Date;
}

// ================================
// ЭКСПОРТИРОВАННЫЕ УТИЛИТЫ
// ================================

export const SENSITIVE_ACTIONS: AuditAction[] = [
  'PASSWORD_CHANGE',
  'PASSWORD_RESET_COMPLETE',
  'MFA_DISABLED',
  'ROLE_ASSIGNED',
  'ROLE_REVOKED',
  'USER_ACTIVATED',
  'USER_DEACTIVATED',
  'USER_DELETED',
  'IMPERSONATION_STARTED',
  'SENSITIVE_DATA_ACCESSED',
  'SENSITIVE_DATA_EXPORTED',
  'SENSITIVE_DATA_DELETED',
  'ADMIN_PANEL_ACCESSED',
  'SECURITY_POLICY_CHANGED',
  'AUDIT_LOG_ACCESSED',
  'FINANCIAL_DATA_ACCESSED'
];

export const CRITICAL_ACTIONS: AuditAction[] = [
  'USER_DELETED',
  'ROLE_DELETED',
  'GROUP_DELETED',
  'IMPERSONATION_STARTED',
  'SENSITIVE_DATA_DELETED',
  'SECURITY_POLICY_CHANGED',
  'SYSTEM_RESTORE_INITIATED',
  'AUDIT_LOG_EXPORTED'
];

// Utility functions
export const isHighRiskAction = (action: AuditAction): boolean => {
  return SENSITIVE_ACTIONS.includes(action) || CRITICAL_ACTIONS.includes(action);
};

export const getSeverityColor = (severity: AuditSeverity): string => {
  switch (severity) {
    case 'LOW': return '#4caf50';
    case 'MEDIUM': return '#ff9800';
    case 'HIGH': return '#ff5722';
    case 'CRITICAL': return '#f44336';
    default: return '#9e9e9e';
  }
};

export const getOutcomeColor = (outcome: AuditOutcome): string => {
  switch (outcome) {
    case 'SUCCESS': return '#4caf50';
    case 'FAILURE': return '#f44336';
    case 'WARNING': return '#ff9800';
    case 'INFO': return '#2196f3';
    case 'PARTIAL_SUCCESS': return '#9c27b0';
    default: return '#9e9e9e';
  }
};
/**
 * Cloud Functions для автоматической деактивации пользователей
 * 
 * Модуль 14: User Offboarding/Deactivation Workflow
 * - Автоматическая деактивация при увольнении
 * - Отзыв всех разрешений и токенов  
 * - Архивация данных пользователя
 * - Уведомления команды и HR
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();
const auth = admin.auth();

/**
 * Статусы деактивации пользователя
 */
export enum OffboardingStatus {
  ACTIVE = 'active',
  PENDING_DEACTIVATION = 'pending_deactivation', 
  DEACTIVATED = 'deactivated',
  ARCHIVED = 'archived'
}

/**
 * Типы деактивации
 */
export enum OffboardingType {
  VOLUNTARY_RESIGNATION = 'voluntary_resignation',
  INVOLUNTARY_TERMINATION = 'involuntary_termination', 
  CONTRACT_EXPIRATION = 'contract_expiration',
  ADMINISTRATIVE = 'administrative'
}

/**
 * Интерфейс для запроса деактивации
 */
export interface OffboardingRequest {
  targetUserId: string;
  type: OffboardingType;
  effectiveDate: Date;
  reason: string;
  requestedBy: string;
  notifyTeam?: boolean;
  notifyHR?: boolean;
  immediateDeactivation?: boolean;
  dataRetentionDays?: number; // По умолчанию 90 дней
}

/**
 * Результат процесса деактивации
 */
export interface OffboardingResult {
  offboardingId: string;
  status: OffboardingStatus;
  completedSteps: string[];
  failedSteps: Array<{ step: string; error: string }>;
  estimatedCompletionTime: Date;
  dataArchiveLocation?: string;
}

/**
 * Инициация процесса деактивации пользователя
 */
export const initiateUserOffboarding = onCall(
  { region: 'us-central1' },
  async (request) => {
    const { auth: authContext, data } = request;
    
    // Проверяем права администратора или HR
    if (!authContext || !authContext.token.admin) {
      throw new HttpsError('permission-denied', 'Only administrators can initiate offboarding');
    }

    const offboardingRequest: OffboardingRequest = {
      ...data,
      effectiveDate: new Date(data.effectiveDate),
      requestedBy: authContext.uid,
      dataRetentionDays: data.dataRetentionDays || 90
    };

    try {
      // Создаем запрос на деактивацию
      const offboardingId = `offboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.collection('offboarding_requests').doc(offboardingId).set({
        ...offboardingRequest,
        offboardingId,
        status: OffboardingStatus.PENDING_DEACTIVATION,
        createdAt: Timestamp.now(),
        effectiveDate: Timestamp.fromDate(offboardingRequest.effectiveDate),
        steps: {
          user_notification: false,
          permissions_revoked: false,
          sessions_terminated: false,
          data_archived: false,
          team_notified: false,
          hr_notified: false,
          audit_logged: false
        }
      });

      // Немедленная деактивация или запланированная
      if (offboardingRequest.immediateDeactivation) {
        await executeOffboarding(offboardingId);
      }

      // Логируем в audit trail
      await db.collection('audit_logs').add({
        timestamp: Timestamp.now(),
        userId: authContext.uid,
        targetUserId: offboardingRequest.targetUserId,
        action: 'OFFBOARDING_INITIATED',
        category: 'USER_MANAGEMENT',
        details: {
          type: offboardingRequest.type,
          effectiveDate: offboardingRequest.effectiveDate,
          immediateDeactivation: offboardingRequest.immediateDeactivation
        },
        ipAddress: request.rawRequest.ip,
        userAgent: request.rawRequest.headers['user-agent'],
        outcome: 'SUCCESS'
      });

      return {
        offboardingId,
        status: OffboardingStatus.PENDING_DEACTIVATION,
        message: offboardingRequest.immediateDeactivation 
          ? 'User offboarding initiated immediately' 
          : `User offboarding scheduled for ${offboardingRequest.effectiveDate.toISOString()}`
      };

    } catch (error) {
      console.error('Error initiating offboarding:', error);
      throw new HttpsError('internal', 'Failed to initiate offboarding process');
    }
  }
);

/**
 * Выполнение процесса деактивации пользователя
 */
async function executeOffboarding(offboardingId: string): Promise<OffboardingResult> {
  const offboardingDoc = await db.collection('offboarding_requests').doc(offboardingId).get();
  
  if (!offboardingDoc.exists) {
    throw new Error(`Offboarding request not found: ${offboardingId}`);
  }

  const offboarding = offboardingDoc.data() as any;
  const completedSteps: string[] = [];
  const failedSteps: Array<{ step: string; error: string }> = [];

  try {
    // Шаг 1: Отключение Firebase Auth аккаунта
    try {
      await auth.updateUser(offboarding.targetUserId, { 
        disabled: true 
      });
      
      // Удаляем Custom Claims
      await auth.setCustomUserClaims(offboarding.targetUserId, null);
      
      completedSteps.push('user_account_disabled');
      
      await db.collection('offboarding_requests').doc(offboardingId).update({
        'steps.user_notification': true
      });
    } catch (error) {
      failedSteps.push({ 
        step: 'user_account_disabled', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    // Шаг 2: Отзыв всех разрешений и ролей
    try {
      await revokeAllUserPermissions(offboarding.targetUserId);
      completedSteps.push('permissions_revoked');
      
      await db.collection('offboarding_requests').doc(offboardingId).update({
        'steps.permissions_revoked': true
      });
    } catch (error) {
      failedSteps.push({ 
        step: 'permissions_revoked', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    // Шаг 3: Завершение всех активных сессий
    try {
      await terminateAllUserSessions(offboarding.targetUserId);
      completedSteps.push('sessions_terminated');
      
      await db.collection('offboarding_requests').doc(offboardingId).update({
        'steps.sessions_terminated': true
      });
    } catch (error) {
      failedSteps.push({ 
        step: 'sessions_terminated', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    // Шаг 4: Архивация данных пользователя
    try {
      const archiveLocation = await archiveUserData(offboarding.targetUserId, offboarding.dataRetentionDays);
      completedSteps.push('data_archived');
      
      await db.collection('offboarding_requests').doc(offboardingId).update({
        'steps.data_archived': true,
        dataArchiveLocation: archiveLocation
      });
    } catch (error) {
      failedSteps.push({ 
        step: 'data_archived', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    // Шаг 5: Уведомления команды и HR
    if (offboarding.notifyTeam) {
      try {
        await notifyTeamMembers(offboarding.targetUserId, offboarding.type);
        completedSteps.push('team_notified');
        
        await db.collection('offboarding_requests').doc(offboardingId).update({
          'steps.team_notified': true
        });
      } catch (error) {
        failedSteps.push({ 
          step: 'team_notified', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    if (offboarding.notifyHR) {
      try {
        await notifyHRDepartment(offboarding.targetUserId, offboarding);
        completedSteps.push('hr_notified');
        
        await db.collection('offboarding_requests').doc(offboardingId).update({
          'steps.hr_notified': true
        });
      } catch (error) {
        failedSteps.push({ 
          step: 'hr_notified', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    // Шаг 6: Финальное логирование в audit trail
    try {
      await db.collection('audit_logs').add({
        timestamp: Timestamp.now(),
        userId: offboarding.requestedBy,
        targetUserId: offboarding.targetUserId,
        action: 'USER_OFFBOARDED',
        category: 'USER_MANAGEMENT',
        details: {
          offboardingId,
          type: offboarding.type,
          completedSteps,
          failedSteps: failedSteps.length,
          totalSteps: completedSteps.length + failedSteps.length
        },
        outcome: failedSteps.length === 0 ? 'SUCCESS' : 'PARTIAL_FAILURE'
      });
      
      completedSteps.push('audit_logged');
      
      await db.collection('offboarding_requests').doc(offboardingId).update({
        'steps.audit_logged': true
      });
    } catch (error) {
      failedSteps.push({ 
        step: 'audit_logged', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }

    // Обновляем статус пользователя
    await db.collection('users').doc(offboarding.targetUserId).update({
      isActive: false,
      deactivatedAt: Timestamp.now(),
      deactivatedBy: offboarding.requestedBy,
      deactivationReason: offboarding.reason,
      offboardingId,
      status: OffboardingStatus.DEACTIVATED
    });

    // Обновляем статус offboarding request
    const finalStatus = failedSteps.length === 0 
      ? OffboardingStatus.DEACTIVATED 
      : OffboardingStatus.PENDING_DEACTIVATION;
      
    await db.collection('offboarding_requests').doc(offboardingId).update({
      status: finalStatus,
      completedAt: Timestamp.now(),
      completedSteps,
      failedSteps
    });

    return {
      offboardingId,
      status: finalStatus,
      completedSteps,
      failedSteps,
      estimatedCompletionTime: new Date(),
      dataArchiveLocation: completedSteps.includes('data_archived') ? `archive/${offboarding.targetUserId}` : undefined
    };

  } catch (error) {
    console.error(`Offboarding failed for ${offboardingId}:`, error);
    
    await db.collection('offboarding_requests').doc(offboardingId).update({
      status: OffboardingStatus.PENDING_DEACTIVATION,
      lastError: error instanceof Error ? error.message : 'Unknown error',
      lastAttempt: Timestamp.now()
    });

    throw error;
  }
}

/**
 * Отзыв всех разрешений пользователя
 */
async function revokeAllUserPermissions(userId: string): Promise<void> {
  const batch = db.batch();

  // Обновляем RBAC профиль
  const rbacProfileRef = db.collection('user_rbac_profiles').doc(userId);
  batch.update(rbacProfileRef, {
    primaryRoles: [],
    temporaryRoles: [],
    groups: [],
    individualPermissions: [],
    revokedAt: Timestamp.now(),
    revokedReason: 'User offboarded'
  });

  // Деактивируем все временные роли
  const tempRolesQuery = await db.collection('temporary_roles')
    .where('userId', '==', userId)
    .where('isActive', '==', true)
    .get();

  tempRolesQuery.docs.forEach(doc => {
    batch.update(doc.ref, {
      isActive: false,
      revokedAt: Timestamp.now(),
      revokedBy: 'SYSTEM_OFFBOARDING'
    });
  });

  // Отзываем все делегирования (полученные и выданные)
  const delegationsQuery = await db.collection('delegations')
    .where('isActive', '==', true)
    .get();

  delegationsQuery.docs.forEach(doc => {
    const delegation = doc.data();
    if (delegation.fromUserId === userId || delegation.toUserId === userId) {
      batch.update(doc.ref, {
        isActive: false,
        revokedAt: Timestamp.now(),
        revokedBy: 'SYSTEM_OFFBOARDING',
        revokedReason: 'User offboarded'
      });
    }
  });

  await batch.commit();
}

/**
 * Завершение всех активных сессий пользователя
 */
async function terminateAllUserSessions(userId: string): Promise<void> {
  // Обновляем tokensValidAfterTime для принудительного logout
  await auth.revokeRefreshTokens(userId);
  
  // Записываем в коллекцию сессий (если используется)
  await db.collection('user_sessions').doc(userId).update({
    allSessionsTerminatedAt: Timestamp.now(),
    terminatedBy: 'SYSTEM_OFFBOARDING'
  });
}

/**
 * Архивация данных пользователя
 */
async function archiveUserData(userId: string, retentionDays: number): Promise<string> {
  const archiveId = `archive_${userId}_${Date.now()}`;
  const archiveLocation = `user_archives/${archiveId}`;
  
  // Собираем все данные пользователя
  const userData = {
    profile: (await db.collection('users').doc(userId).get()).data(),
    timeEntries: (await db.collection('time_entries').where('userId', '==', userId).get()).docs.map(doc => doc.data()),
    projects: (await db.collection('user_projects').where('userId', '==', userId).get()).docs.map(doc => doc.data()),
    auditLogs: (await db.collection('audit_logs').where('userId', '==', userId).limit(1000).get()).docs.map(doc => doc.data())
  };

  // Сохраняем архив
  await db.collection('user_archives').doc(archiveId).set({
    userId,
    archivedAt: Timestamp.now(),
    retentionUntil: Timestamp.fromDate(new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000)),
    dataSize: JSON.stringify(userData).length,
    collections: Object.keys(userData),
    userData
  });

  return archiveLocation;
}

/**
 * Уведомление членов команды
 */
async function notifyTeamMembers(userId: string, offboardingType: OffboardingType): Promise<void> {
  // Находим проекты пользователя
  const userProjectsQuery = await db.collection('user_projects')
    .where('userId', '==', userId)
    .get();

  const projectIds = userProjectsQuery.docs.map(doc => doc.data().projectId);
  
  // Уведомляем менеджеров проектов
  for (const projectId of projectIds) {
    await db.collection('notifications').add({
      type: 'USER_OFFBOARDED',
      projectId,
      targetUserId: userId,
      message: `Team member has been ${offboardingType === OffboardingType.VOLUNTARY_RESIGNATION ? 'resigned' : 'terminated'}`,
      createdAt: Timestamp.now(),
      priority: 'HIGH'
    });
  }
}

/**
 * Уведомление HR департамента
 */
async function notifyHRDepartment(userId: string, offboarding: any): Promise<void> {
  await db.collection('hr_notifications').add({
    type: 'EMPLOYEE_OFFBOARDED',
    userId,
    offboardingType: offboarding.type,
    effectiveDate: offboarding.effectiveDate,
    reason: offboarding.reason,
    completedAt: Timestamp.now(),
    priority: 'HIGH',
    requiresAction: true,
    actions: [
      'Update payroll system',
      'Collect company equipment',
      'Update org chart',
      'Exit interview scheduling'
    ]
  });
}

/**
 * Запланированная функция для обработки отложенных деактиваций
 */
export const processScheduledOffboardings = onSchedule(
  {
    schedule: 'every day 09:00',
    timeZone: 'America/New_York',
    region: 'us-central1'
  },
  async () => {
    console.log('Processing scheduled offboardings...');
    
    const now = Timestamp.now();
    const pendingQuery = await db.collection('offboarding_requests')
      .where('status', '==', OffboardingStatus.PENDING_DEACTIVATION)
      .where('effectiveDate', '<=', now)
      .get();

    const results = [];
    
    for (const doc of pendingQuery.docs) {
      try {
        const result = await executeOffboarding(doc.id);
        results.push({ offboardingId: doc.id, success: true, result });
      } catch (error) {
        console.error(`Failed to process offboarding ${doc.id}:`, error);
        results.push({ offboardingId: doc.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    console.log(`Processed ${results.length} scheduled offboardings:`, results);
  }
);

/**
 * Получение статуса процесса деактивации
 */
export const getOffboardingStatus = onCall(
  { region: 'us-central1' },
  async (request) => {
    const { auth: authContext, data } = request;
    
    if (!authContext) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { offboardingId } = data;
    
    const offboardingDoc = await db.collection('offboarding_requests').doc(offboardingId).get();
    
    if (!offboardingDoc.exists) {
      throw new HttpsError('not-found', 'Offboarding request not found');
    }

    return offboardingDoc.data();
  }
);

/**
 * Отмена процесса деактивации (только до выполнения)
 */
export const cancelOffboarding = onCall(
  { region: 'us-central1' },
  async (request) => {
    const { auth: authContext, data } = request;
    
    if (!authContext || !authContext.token.admin) {
      throw new HttpsError('permission-denied', 'Only administrators can cancel offboarding');
    }

    const { offboardingId, reason } = data;
    
    const offboardingDoc = await db.collection('offboarding_requests').doc(offboardingId).get();
    
    if (!offboardingDoc.exists) {
      throw new HttpsError('not-found', 'Offboarding request not found');
    }

    const offboarding = offboardingDoc.data();
    
    if (offboarding?.status !== OffboardingStatus.PENDING_DEACTIVATION) {
      throw new HttpsError('failed-precondition', 'Can only cancel pending offboarding requests');
    }

    await db.collection('offboarding_requests').doc(offboardingId).update({
      status: 'CANCELLED',
      cancelledAt: Timestamp.now(),
      cancelledBy: authContext.uid,
      cancellationReason: reason
    });

    // Логируем отмену
    await db.collection('audit_logs').add({
      timestamp: Timestamp.now(),
      userId: authContext.uid,
      targetUserId: offboarding.targetUserId,
      action: 'OFFBOARDING_CANCELLED',
      category: 'USER_MANAGEMENT',
      details: { offboardingId, reason },
      outcome: 'SUCCESS'
    });

    return { success: true, message: 'Offboarding cancelled successfully' };
  }
);
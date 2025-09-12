/**
 * ============================================================================
 * GLOBAL ACTION BLOCKING LOGIC - Technical Requirements Implementation
 * ============================================================================
 * 
 * Implements TZ requirement for disabling critical actions when startability
 * issues exist. Provides centralized logic for determining when actions
 * should be blocked based on startability analysis.
 * 
 * @author Senior Full-Stack Engineer + UX Architect
 * @version 1.0.0 - Technical Requirements
 * @feature estimates.startability_v1
 */

import { StartabilitySnapshot, SummaryStatus, BlockerReason } from '../types/startability.types';

// =====================================================
// GLOBAL ACTION BLOCKING TYPES
// =====================================================

export type BlockableAction = 
  | 'SEND_ESTIMATE'           // Send estimate to client
  | 'CONVERT_TO_CONTRACT'     // Convert estimate to contract
  | 'APPROVE_ESTIMATE'        // Mark estimate as approved
  | 'START_WORK'              // Begin work on project
  | 'DELETE_ITEMS'            // Delete estimate items
  | 'MODIFY_CRITICAL_ITEMS'   // Modify items with critical blockers
  | 'EXPORT_ESTIMATE'         // Export estimate
  | 'DUPLICATE_ESTIMATE'      // Create copy of estimate
  | 'ARCHIVE_ESTIMATE';       // Archive completed estimate

export type BlockingReason = {
  action: BlockableAction;
  blocked: boolean;
  reason?: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  criticalIssueCount?: number;
  warningIssueCount?: number;
};

export type GlobalActionBlockingState = {
  hasCriticalIssues: boolean;
  hasWarningIssues: boolean;
  criticalIssueCount: number;
  warningIssueCount: number;
  totalIssues: number;
  blockedActions: BlockableAction[];
  actionStates: Record<BlockableAction, BlockingReason>;
};

// =====================================================
// CORE BLOCKING LOGIC
// =====================================================

/**
 * Analyze startability snapshot and determine which actions should be blocked
 */
export function analyzeGlobalActionBlocking(
  snapshot: StartabilitySnapshot | null,
  itemStartabilities?: Record<string, any>
): GlobalActionBlockingState {
  
  // Default state - no blocking
  const defaultState: GlobalActionBlockingState = {
    hasCriticalIssues: false,
    hasWarningIssues: false,
    criticalIssueCount: 0,
    warningIssueCount: 0,
    totalIssues: 0,
    blockedActions: [],
    actionStates: {} as Record<BlockableAction, BlockingReason>
  };

  if (!snapshot) {
    // Initialize all actions as allowed when no startability data
    return initializeActionStates(defaultState);
  }

  // Count issues by severity
  const criticalReasons = snapshot.reasons?.filter(r => r.severity === 'critical') || [];
  const warningReasons = snapshot.reasons?.filter(r => r.severity === 'warning') || [];
  
  // Check item-level startabilities for additional critical issues
  let itemCriticalCount = 0;
  let itemWarningCount = 0;
  
  if (itemStartabilities) {
    Object.values(itemStartabilities).forEach(item => {
      if (item?.blockers) {
        itemCriticalCount += item.blockers.filter((b: any) => b.severity === 'CRITICAL').length;
        itemWarningCount += item.blockers.filter((b: any) => b.severity === 'WARNING').length;
      }
    });
  }

  const totalCriticalCount = criticalReasons.length + itemCriticalCount;
  const totalWarningCount = warningReasons.length + itemWarningCount;
  
  const state: GlobalActionBlockingState = {
    hasCriticalIssues: totalCriticalCount > 0,
    hasWarningIssues: totalWarningCount > 0,
    criticalIssueCount: totalCriticalCount,
    warningIssueCount: totalWarningCount,
    totalIssues: totalCriticalCount + totalWarningCount,
    blockedActions: [],
    actionStates: {} as Record<BlockableAction, BlockingReason>
  };

  // Define blocking rules based on TZ requirements
  const blockingRules: Array<{
    action: BlockableAction;
    blockOnCritical: boolean;
    blockOnWarning: boolean;
    reason: string;
  }> = [
    {
      action: 'SEND_ESTIMATE',
      blockOnCritical: true,
      blockOnWarning: false,
      reason: 'Нельзя отправить смету пока есть критические проблемы'
    },
    {
      action: 'CONVERT_TO_CONTRACT',
      blockOnCritical: true,
      blockOnWarning: false,
      reason: 'Нельзя преобразовать в договор пока есть критические проблемы'
    },
    {
      action: 'START_WORK',
      blockOnCritical: true,
      blockOnWarning: true,
      reason: 'Нельзя начать работу пока есть блокирующие проблемы'
    },
    {
      action: 'DELETE_ITEMS',
      blockOnCritical: true,
      blockOnWarning: false,
      reason: 'Удаление заблокировано из-за критических проблем'
    },
    {
      action: 'MODIFY_CRITICAL_ITEMS',
      blockOnCritical: true,
      blockOnWarning: false,
      reason: 'Изменение заблокировано из-за критических проблем'
    },
    {
      action: 'APPROVE_ESTIMATE',
      blockOnCritical: true,
      blockOnWarning: false,
      reason: 'Нельзя утвердить смету пока есть критические проблемы'
    },
    {
      action: 'EXPORT_ESTIMATE',
      blockOnCritical: false,
      blockOnWarning: false,
      reason: 'Экспорт разрешен'
    },
    {
      action: 'DUPLICATE_ESTIMATE',
      blockOnCritical: false,
      blockOnWarning: false,
      reason: 'Копирование разрешено'
    },
    {
      action: 'ARCHIVE_ESTIMATE',
      blockOnCritical: true,
      blockOnWarning: false,
      reason: 'Архивирование заблокировано из-за критических проблем'
    }
  ];

  // Apply blocking rules
  blockingRules.forEach(rule => {
    const shouldBlock = 
      (rule.blockOnCritical && state.hasCriticalIssues) ||
      (rule.blockOnWarning && state.hasWarningIssues);

    if (shouldBlock) {
      state.blockedActions.push(rule.action);
    }

    state.actionStates[rule.action] = {
      action: rule.action,
      blocked: shouldBlock,
      reason: shouldBlock ? rule.reason : undefined,
      severity: rule.blockOnCritical && state.hasCriticalIssues ? 'CRITICAL' : 
                rule.blockOnWarning && state.hasWarningIssues ? 'WARNING' : 'INFO',
      criticalIssueCount: state.criticalIssueCount,
      warningIssueCount: state.warningIssueCount
    };
  });

  return state;
}

/**
 * Initialize all action states when no startability data available
 */
function initializeActionStates(state: GlobalActionBlockingState): GlobalActionBlockingState {
  const allActions: BlockableAction[] = [
    'SEND_ESTIMATE',
    'CONVERT_TO_CONTRACT', 
    'APPROVE_ESTIMATE',
    'START_WORK',
    'DELETE_ITEMS',
    'MODIFY_CRITICAL_ITEMS',
    'EXPORT_ESTIMATE',
    'DUPLICATE_ESTIMATE',
    'ARCHIVE_ESTIMATE'
  ];

  allActions.forEach(action => {
    state.actionStates[action] = {
      action,
      blocked: false,
      severity: 'INFO'
    };
  });

  return state;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Check if a specific action is blocked
 */
export function isActionBlocked(
  action: BlockableAction,
  blockingState: GlobalActionBlockingState
): boolean {
  return blockingState.actionStates[action]?.blocked || false;
}

/**
 * Get blocking reason for a specific action
 */
export function getActionBlockingReason(
  action: BlockableAction,
  blockingState: GlobalActionBlockingState
): string | undefined {
  return blockingState.actionStates[action]?.reason;
}

/**
 * Get tooltip text for blocked actions
 */
export function getActionTooltip(
  action: BlockableAction,
  blockingState: GlobalActionBlockingState
): string {
  const actionState = blockingState.actionStates[action];
  
  if (!actionState?.blocked) {
    return getActionDescription(action);
  }

  const baseReason = actionState.reason || 'Действие заблокировано';
  const issueCount = actionState.criticalIssueCount || 0;
  const warningCount = actionState.warningIssueCount || 0;
  
  if (issueCount > 0) {
    return `${baseReason}. Критических проблем: ${issueCount}`;
  } else if (warningCount > 0) {
    return `${baseReason}. Предупреждений: ${warningCount}`;
  }

  return baseReason;
}

/**
 * Get action descriptions for tooltips
 */
function getActionDescription(action: BlockableAction): string {
  const descriptions: Record<BlockableAction, string> = {
    'SEND_ESTIMATE': 'Отправить смету клиенту',
    'CONVERT_TO_CONTRACT': 'Преобразовать смету в договор',
    'APPROVE_ESTIMATE': 'Утвердить смету',
    'START_WORK': 'Начать выполнение работ',
    'DELETE_ITEMS': 'Удалить позиции',
    'MODIFY_CRITICAL_ITEMS': 'Изменить критические позиции',
    'EXPORT_ESTIMATE': 'Экспортировать смету',
    'DUPLICATE_ESTIMATE': 'Создать копию сметы',
    'ARCHIVE_ESTIMATE': 'Архивировать смету'
  };

  return descriptions[action] || 'Выполнить действие';
}

/**
 * Get severity color for UI components
 */
export function getSeverityColor(severity: 'CRITICAL' | 'WARNING' | 'INFO'): 'error' | 'warning' | 'info' {
  switch (severity) {
    case 'CRITICAL': return 'error';
    case 'WARNING': return 'warning';
    case 'INFO': return 'info';
  }
}

// =====================================================
// REACT HOOK INTEGRATION
// =====================================================

/**
 * Custom hook for using global action blocking in React components
 */
export function useGlobalActionBlocking(
  snapshot: StartabilitySnapshot | null,
  itemStartabilities?: Record<string, any>
): GlobalActionBlockingState & {
  isBlocked: (action: BlockableAction) => boolean;
  getTooltip: (action: BlockableAction) => string;
  getReason: (action: BlockableAction) => string | undefined;
} {
  const blockingState = analyzeGlobalActionBlocking(snapshot, itemStartabilities);

  return {
    ...blockingState,
    isBlocked: (action: BlockableAction) => isActionBlocked(action, blockingState),
    getTooltip: (action: BlockableAction) => getActionTooltip(action, blockingState),
    getReason: (action: BlockableAction) => getActionBlockingReason(action, blockingState)
  };
}

export default {
  analyzeGlobalActionBlocking,
  isActionBlocked,
  getActionBlockingReason,
  getActionTooltip,
  useGlobalActionBlocking
};
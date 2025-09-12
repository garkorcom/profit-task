/**
 * ============================================================================
 * STARTABILITY V2 API - Technical Requirements Implementation
 * ============================================================================
 * 
 * Enhanced API layer implementing TZ specifications for actionable startability
 * analysis with Master-Detail UI integration.
 * 
 * @author Senior Full-Stack Engineer + UX Architect
 * @version 2.0.0 - Technical Requirements
 * @feature estimates.startability_v1
 */

import { 
  StartabilityReport,
  ItemStartabilityV2, 
  BlockerReason,
  ResolutionAction,
  SummaryStatus,
  StartabilityCTA
} from '../types/startability.types';

import { functions } from '../firebase/firebase';
import { httpsCallable } from 'firebase/functions';

// =====================================================
// TZ REQUIREMENT 1: BACKEND API & DATA STRUCTURE
// =====================================================

/**
 * GET /api/v2/projects/{projectId}/startability-analysis?estimateId={estimateId}
 * 
 * Main endpoint implementing TZ requirements for actionable startability analysis.
 * Returns comprehensive report with resolution instructions for each blocker.
 */
export async function getStartabilityAnalysis(
  projectId: string,
  estimateId: string,
  options: {
    includeResolutions?: boolean;
    forceRefresh?: boolean;
  } = {}
): Promise<StartabilityReport> {
  try {
    const analyzeStartabilityFn = httpsCallable(functions, 'analyzeStartabilityV2');
    
    const response = await analyzeStartabilityFn({
      projectId,
      estimateId,
      includeResolutions: options.includeResolutions ?? true,
      forceRefresh: options.forceRefresh ?? false
    });

    const data = (response.data as any).data;
    
    return transformToStartabilityReport(data, projectId);
    
  } catch (error) {
    console.error('Startability V2 analysis failed:', error);
    throw new Error(`Failed to analyze startability: ${error}`);
  }
}

// =====================================================
// DATA TRANSFORMATION
// =====================================================

/**
 * Transform Cloud Function response to StartabilityReport format
 * Implements TZ DTO structure requirements
 */
function transformToStartabilityReport(
  data: any, 
  projectId: string
): StartabilityReport {
  const itemsStartability: Record<string, ItemStartabilityV2> = {};
  
  // Transform each estimate item/task into ItemStartability
  if (data.items) {
    Object.entries(data.items).forEach(([itemId, itemData]: [string, any]) => {
      itemsStartability[itemId] = {
        itemId,
        summaryStatus: mapToSummaryStatus(itemData.status),
        blockers: transformBlockers(itemData.blockers || [])
      };
    });
  }
  
  return {
    projectId,
    isProjectStartable: data.isProjectStartable ?? true,
    itemsStartability
  };
}

/**
 * Map internal status to TZ SummaryStatus format
 */
function mapToSummaryStatus(status: string): SummaryStatus {
  switch (status?.toLowerCase()) {
    case 'ready':
    case 'startable':
      return 'READY';
    case 'warning':
    case 'attention':
      return 'WARNING'; 
    case 'blocked':
    case 'critical':
      return 'BLOCKED';
    case 'done':
    case 'completed':
      return 'DONE';
    default:
      return 'WARNING';
  }
}

/**
 * Transform blocker data to TZ BlockerReason format with ResolutionActions
 */
function transformBlockers(blockers: any[]): BlockerReason[] {
  return blockers.map(blocker => ({
    code: blocker.code,
    category: mapBlockerCategory(blocker.category),
    description: blocker.description || blocker.message,
    severity: blocker.severity?.toUpperCase() === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
    resolutionAction: createResolutionAction(blocker)
  }));
}

/**
 * Map internal categories to TZ format
 */
function mapBlockerCategory(category: string): 'Project' | 'Task' | 'Permissions' | 'Business' {
  switch (category?.toUpperCase()) {
    case 'PROJECT':
      return 'Project';
    case 'TASKS':
    case 'TASK':
      return 'Task';
    case 'PERMISSIONS':
      return 'Permissions';
    case 'BUSINESS':
    case 'ESTIMATE':
      return 'Business';
    default:
      return 'Task';
  }
}

// =====================================================
// TZ REQUIREMENT: RESOLUTION ACTION CREATION
// =====================================================

/**
 * Core logic: Create ResolutionAction for each blocker
 * Maps blocker codes to actionable UI components with API endpoints
 */
function createResolutionAction(blocker: any): ResolutionAction | null {
  const code = blocker.code;
  
  switch (code) {
    case 'MISSING_ASSIGNMENT':
      return {
        type: 'ASSIGN_USER',
        label: 'Назначить исполнителя',
        apiEndpoint: '/api/v2/tasks/assign',
        contextData: {
          taskId: blocker.meta?.taskId,
          estimateId: blocker.meta?.estimateId,
          allowedRoles: ['executor', 'contractor']
        }
      };
      
    case 'BUDGET_OR_APPROVAL_REQUIRED':
      return {
        type: 'REQUEST_APPROVAL',
        label: 'Запросить одобрение',
        apiEndpoint: '/api/v2/approvals/request',
        contextData: {
          projectId: blocker.meta?.projectId,
          estimateId: blocker.meta?.estimateId,
          approvalType: 'budget'
        }
      };
      
    case 'DEPENDENCIES_NOT_MET':
      return {
        type: 'VIEW_DEPENDENCY',
        label: 'Показать зависимости',
        contextData: {
          dependentTaskId: blocker.meta?.dependentTaskId,
          blockedByTaskId: blocker.meta?.blockedByTaskId
        }
      };
      
    case 'COMPLIANCE_HOLD':
      return {
        type: 'UPLOAD_DOCUMENT',
        label: 'Загрузить документы',
        apiEndpoint: '/api/v2/compliance/upload',
        contextData: {
          requiredDocuments: blocker.meta?.requiredDocuments,
          complianceType: blocker.meta?.complianceType
        }
      };
      
    case 'NO_ESTIMATES':
    case 'INCOMPLETE_ESTIMATE_BLOCKS':
      return {
        type: 'NAVIGATE',
        label: 'Открыть смету',
        contextData: {
          route: `/estimates/${blocker.meta?.estimateId}`,
          section: 'blocks'
        }
      };
      
    case 'PROJECT_STATUS_NOT_STARTABLE':
      return {
        type: 'CHANGE_PROJECT_STATUS',
        label: 'Изменить статус проекта',
        apiEndpoint: '/api/v2/projects/status',
        contextData: {
          projectId: blocker.meta?.projectId,
          currentStatus: blocker.meta?.currentStatus,
          suggestedStatus: 'active'
        }
      };
      
    case 'MATERIAL_AVAILABILITY_HOLD':
      return {
        type: 'RESOLVE_MATERIALS',
        label: 'Решить вопрос с материалами',
        apiEndpoint: '/api/v2/materials/resolve',
        contextData: {
          materialIds: blocker.meta?.materialIds,
          supplierId: blocker.meta?.supplierId
        }
      };
      
    default:
      // Generic navigation for unknown codes
      return {
        type: 'NAVIGATE',
        label: 'Подробнее',
        contextData: {
          route: `/projects/${blocker.meta?.projectId}`,
          section: 'issues'
        }
      };
  }
}

// =====================================================
// RESOLUTION EXECUTION API
// =====================================================

/**
 * Execute a resolution action
 * Called when user clicks on resolution UI component
 */
export async function executeResolutionAction(
  resolutionAction: ResolutionAction,
  additionalData?: Record<string, any>
): Promise<{
  success: boolean;
  message: string;
  updatedItems?: string[];
}> {
  if (!resolutionAction.apiEndpoint) {
    // Navigation-only action, no API call needed
    return {
      success: true,
      message: 'Navigation action completed',
    };
  }
  
  try {
    const executeActionFn = httpsCallable(functions, 'executeResolutionAction');
    
    const response = await executeActionFn({
      actionType: resolutionAction.type,
      endpoint: resolutionAction.apiEndpoint,
      contextData: resolutionAction.contextData,
      additionalData
    });
    
    const result = (response.data as any);
    
    return {
      success: result.success ?? false,
      message: result.message ?? 'Action completed',
      updatedItems: result.updatedItems
    };
    
  } catch (error) {
    console.error('Resolution action execution failed:', error);
    return {
      success: false,
      message: `Failed to execute action: ${error}`
    };
  }
}

// =====================================================
// CACHE MANAGEMENT
// =====================================================

/**
 * Clear startability analysis cache for refresh
 */
export async function clearStartabilityCache(
  projectId: string, 
  estimateId?: string
): Promise<void> {
  try {
    const clearCacheFn = httpsCallable(functions, 'clearStartabilityCacheV2');
    await clearCacheFn({ projectId, estimateId });
  } catch (error) {
    console.warn('Failed to clear startability cache:', error);
  }
}

export default {
  getStartabilityAnalysis,
  executeResolutionAction,
  clearStartabilityCache
};
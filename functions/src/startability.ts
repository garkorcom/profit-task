import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { z } from 'zod';

// Types matching frontend
type StartabilityStatus = 'ready' | 'blocked' | 'attention';
type StartabilitySeverity = 'critical' | 'warning' | 'info';
type StartabilityCTA = 'ASSIGN' | 'REQUEST_APPROVAL' | 'VIEW_DEPENDENCIES' | 'OPEN_COMPLIANCE' | 'COMPLETE_ESTIMATE_BLOCK' | 'APPROVE_ESTIMATE' | 'RESOLVE_MATERIALS' | 'CHANGE_PROJECT_STATUS';

type StartabilityCode =
  | 'PROJECT_STATUS_NOT_STARTABLE'
  | 'PROJECT_ON_HOLD'
  | 'NO_TASKS'
  | 'ALL_TASKS_BLOCKED'
  | 'NO_ESTIMATES'
  | 'NO_STARTABLE_ITEMS_IN_ESTIMATES'
  | 'MISSING_ASSIGNMENT'
  | 'MISSING_PERMISSIONS'
  | 'DEPENDENCIES_NOT_MET'
  | 'BUDGET_OR_APPROVAL_REQUIRED'
  | 'COMPLIANCE_HOLD'
  | 'ESTIMATE_STATUS_BLOCKED'
  | 'MISSING_COUNTERPARTY_APPROVAL'
  | 'INCOMPLETE_ESTIMATE_BLOCKS'
  | 'SERVICE_ITEMS_NOT_ASSIGNED'
  | 'MATERIAL_AVAILABILITY_HOLD';

interface StartabilityReason {
  code: StartabilityCode;
  severity: StartabilitySeverity;
  category: string;
  entityType: string;
  entityId: string;
  description: string;
  cta?: StartabilityCTA;
  meta?: Record<string, any>;
}

interface StartabilitySnapshot {
  overall: StartabilityStatus;
  reasons: StartabilityReason[];
  itemCount: {
    total: number;
    startable: number;
    blocked: number;
    attention: number;
  };
  lastEvaluated: Date;
}

interface EvaluateStartabilityRequest {
  projectId: string;
  estimateId: string;
  includeItems?: boolean;
  forceRefresh?: boolean;
}

// Validation schemas
const evaluateRequestSchema = z.object({
  projectId: z.string().min(1),
  estimateId: z.string().min(1),
  includeItems: z.boolean().optional().default(true),
  forceRefresh: z.boolean().optional().default(false)
});

const ctaExecutionSchema = z.object({
  projectId: z.string().min(1),
  estimateId: z.string().min(1),
  cta: z.enum(['ASSIGN', 'REQUEST_APPROVAL', 'VIEW_DEPENDENCIES', 'OPEN_COMPLIANCE', 'COMPLETE_ESTIMATE_BLOCK', 'APPROVE_ESTIMATE', 'RESOLVE_MATERIALS', 'CHANGE_PROJECT_STATUS']),
  reasonCode: z.string(),
  metadata: z.record(z.any()).optional()
});

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Helper functions
const isProjectStatusStartable = (status: string): boolean => {
  const startableStatuses = ['idea', 'planning', 'active'];
  return startableStatuses.includes(status?.toLowerCase() || '');
};

const isTaskStatusBlocked = (status: string): boolean => {
  const blockedStatuses = ['blocked', 'done', 'cancelled', 'archived'];
  return blockedStatuses.includes(status?.toLowerCase() || '');
};

const getProjectAccessLevel = async (userId: string, projectId: string): Promise<'owner' | 'admin' | 'member' | 'viewer' | null> => {
  try {
    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return null;
    }

    const project = projectDoc.data()!;
    
    // Check ownership
    if (project.createdBy === userId || project.ownerId === userId) {
      return 'owner';
    }

    // Check team membership
    const teamMembers = project.teamMembers || [];
    const member = teamMembers.find((m: any) => m.userId === userId);
    
    if (member) {
      return member.role || 'member';
    }

    return null;
  } catch (error) {
    console.error('Error getting project access level:', error);
    return null;
  }
};

const evaluateProjectStartability = async (
  userId: string,
  projectId: string,
  estimateId: string,
  includeItems: boolean = true
): Promise<StartabilitySnapshot> => {
  const reasons: StartabilityReason[] = [];

  try {
    // Get project data
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      throw new Error('Project not found');
    }
    
    const project = projectDoc.data()!;

    // Check project status
    if (!isProjectStatusStartable(project.status)) {
      reasons.push({
        code: project.status === 'on_hold' ? 'PROJECT_ON_HOLD' : 'PROJECT_STATUS_NOT_STARTABLE',
        severity: 'critical',
        category: 'project',
        entityType: 'project',
        entityId: projectId,
        description: `Project status "${project.status}" does not allow starting work`,
        cta: 'CHANGE_PROJECT_STATUS',
        meta: { currentStatus: project.status, projectId }
      });
    }

    // Get tasks
    const tasksSnapshot = await db.collection('tasks')
      .where('projectId', '==', projectId)
      .get();

    const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    if (tasks.length === 0) {
      reasons.push({
        code: 'NO_TASKS',
        severity: 'critical',
        category: 'tasks',
        entityType: 'project',
        entityId: projectId,
        description: 'No tasks defined in project',
        cta: 'ASSIGN',
        meta: { projectId }
      });
    } else {
      // Check if all tasks are blocked
      const availableTasks = tasks.filter(task => !isTaskStatusBlocked(task.status));
      
      if (availableTasks.length === 0) {
        reasons.push({
          code: 'ALL_TASKS_BLOCKED',
          severity: 'critical',
          category: 'tasks',
          entityType: 'project',
          entityId: projectId,
          description: 'All tasks are blocked or completed',
          meta: { totalTasks: tasks.length, blockedTasks: tasks.length }
        });
      }

      // Check individual task issues
      for (const task of availableTasks) {
        // Missing assignment
        if (!task.assignedTo || task.assignedTo.length === 0) {
          reasons.push({
            code: 'MISSING_ASSIGNMENT',
            severity: 'critical',
            category: 'permissions',
            entityType: 'task',
            entityId: task.id,
            description: `Task "${task.title}" is not assigned to anyone`,
            cta: 'ASSIGN',
            meta: { taskId: task.id, taskTitle: task.title }
          });
        }

        // Check dependencies
        if (task.dependencies && task.dependencies.length > 0) {
          const dependencyDocs = await Promise.all(
            task.dependencies.map((depId: string) => 
              db.collection('tasks').doc(depId).get()
            )
          );

          const uncompletedDeps = dependencyDocs
            .filter(doc => doc.exists)
            .map(doc => ({ id: doc.id, ...(doc.data()! as any) }))
            .filter((dep: any) => dep.status !== 'done');

          if (uncompletedDeps.length > 0) {
            reasons.push({
              code: 'DEPENDENCIES_NOT_MET',
              severity: 'warning',
              category: 'tasks',
              entityType: 'task',
              entityId: task.id,
              description: `Task has ${uncompletedDeps.length} uncompleted dependencies`,
              cta: 'VIEW_DEPENDENCIES',
              meta: { taskId: task.id, dependencies: uncompletedDeps.map((d: any) => d.id) }
            });
          }
        }
      }
    }

    // Get estimates
    const estimatesSnapshot = await db.collection('estimates')
      .where('projectId', '==', projectId)
      .get();

    const estimates = estimatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    if (estimates.length === 0) {
      reasons.push({
        code: 'NO_ESTIMATES',
        severity: 'warning',
        category: 'estimate',
        entityType: 'project',
        entityId: projectId,
        description: 'No estimates available for project',
        meta: { projectId }
      });
    } else {
      // Check estimate-specific issues
      const targetEstimate = estimates.find(e => e.id === estimateId) || estimates[0];
      
      if (targetEstimate) {
        // Check estimate status
        if (targetEstimate.status === 'draft' && targetEstimate.requiresApproval) {
          reasons.push({
            code: 'MISSING_COUNTERPARTY_APPROVAL',
            severity: 'warning',
            category: 'business',
            entityType: 'estimate',
            entityId: targetEstimate.id,
            description: 'Estimate requires client approval',
            cta: 'REQUEST_APPROVAL',
            meta: { estimateId: targetEstimate.id, approvalType: 'client' }
          });
        }

        // Check incomplete estimate blocks
        if (targetEstimate.blocks) {
          const incompleteBlocks = targetEstimate.blocks.filter((block: any) => 
            block.required && (!block.items || block.items.length === 0)
          );

          for (const block of incompleteBlocks) {
            reasons.push({
              code: 'INCOMPLETE_ESTIMATE_BLOCKS',
              severity: 'warning',
              category: 'estimate',
              entityType: 'estimate',
              entityId: targetEstimate.id,
              description: `Required estimate section "${block.name}" is incomplete`,
              cta: 'COMPLETE_ESTIMATE_BLOCK',
              meta: { estimateId: targetEstimate.id, blockId: block.id, blockName: block.name }
            });
          }
        }
      }
    }

    // Check permissions
    const accessLevel = await getProjectAccessLevel(userId, projectId);
    if (!accessLevel || accessLevel === 'viewer') {
      reasons.push({
        code: 'MISSING_PERMISSIONS',
        severity: 'critical',
        category: 'permissions',
        entityType: 'project',
        entityId: projectId,
        description: 'Insufficient permissions to start work on this project',
        meta: { userId, accessLevel, projectId }
      });
    }

    // Determine overall status
    const criticalIssues = reasons.filter(r => r.severity === 'critical');
    const warningIssues = reasons.filter(r => r.severity === 'warning');

    let overall: StartabilityStatus;
    if (criticalIssues.length > 0) {
      overall = 'blocked';
    } else if (warningIssues.length > 0) {
      overall = 'attention';
    } else {
      overall = 'ready';
    }

    // Calculate item counts
    const startableTasks = tasks.filter((task: any) => 
      !isTaskStatusBlocked(task.status) && 
      task.assignedTo && 
      task.assignedTo.length > 0
    );

    return {
      overall,
      reasons,
      itemCount: {
        total: tasks.length,
        startable: startableTasks.length,
        blocked: tasks.filter((task: any) => isTaskStatusBlocked(task.status)).length,
        attention: Math.max(0, tasks.length - startableTasks.length - tasks.filter((task: any) => isTaskStatusBlocked(task.status)).length)
      },
      lastEvaluated: new Date()
    };

  } catch (error) {
    console.error('Error evaluating startability:', error);
    throw error;
  }
};

// Cloud Functions
export const evaluateStartability = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
  })
  .https.onCall(async (data, context) => {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to evaluate startability'
      );
    }

    const userId = context.auth.uid;

    try {
      // Validate input
      const request = evaluateRequestSchema.parse(data);

      // Check cache first (unless force refresh)
      const cacheKey = `startability:${request.projectId}:${request.estimateId}`;
      const cacheRef = db.collection('cache').doc(cacheKey);

      if (!request.forceRefresh) {
        const cacheDoc = await cacheRef.get();
        if (cacheDoc.exists) {
          const cacheData = cacheDoc.data()!;
          const cacheAge = Date.now() - cacheData.timestamp.toMillis();
          
          // Use cache if less than 30 seconds old
          if (cacheAge < 30000) {
            return {
              success: true,
              data: {
                snapshot: cacheData.snapshot,
                itemStartabilities: cacheData.itemStartabilities || {}
              },
              fromCache: true
            };
          }
        }
      }

      // Evaluate startability
      const snapshot = await evaluateProjectStartability(
        userId,
        request.projectId,
        request.estimateId,
        request.includeItems
      );

      // Cache the result
      await cacheRef.set({
        snapshot,
        itemStartabilities: {}, // TODO: Implement item-level startability
        timestamp: admin.firestore.Timestamp.now(),
        userId,
        ttl: admin.firestore.Timestamp.fromMillis(Date.now() + 30000) // 30s TTL
      });

      return {
        success: true,
        data: {
          snapshot,
          itemStartabilities: {}
        },
        fromCache: false
      };

    } catch (error) {
      console.error('Startability evaluation error:', error);
      
      if (error instanceof z.ZodError) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid request parameters',
          error.errors
        );
      }

      throw new functions.https.HttpsError(
        'internal',
        'Failed to evaluate startability',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  });

export const executeCTA = functions
  .runWith({
    timeoutSeconds: 30,
    memory: '256MB'
  })
  .https.onCall(async (data, context) => {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to execute CTA'
      );
    }

    const userId = context.auth.uid;

    try {
      // Validate input
      const request = ctaExecutionSchema.parse(data);

      // Check permissions
      const accessLevel = await getProjectAccessLevel(userId, request.projectId);
      if (!accessLevel) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'No access to this project'
        );
      }

      // Execute CTA based on type
      let result: any = {};

      switch (request.cta) {
        case 'ASSIGN':
          if (request.metadata?.taskId && request.metadata?.assigneeId) {
            await db.collection('tasks').doc(request.metadata.taskId).update({
              assignedTo: admin.firestore.FieldValue.arrayUnion(request.metadata.assigneeId),
              updatedAt: admin.firestore.Timestamp.now(),
              updatedBy: userId
            });
            result = { assigned: true, taskId: request.metadata.taskId };
          }
          break;

        case 'REQUEST_APPROVAL':
          // Create approval request
          const approvalRef = await db.collection('approvals').add({
            projectId: request.projectId,
            estimateId: request.estimateId,
            type: request.metadata?.approvalType || 'client',
            status: 'pending',
            requestedBy: userId,
            requestedAt: admin.firestore.Timestamp.now(),
            message: request.metadata?.message || '',
            priority: request.metadata?.priority || 'normal'
          });
          result = { approvalId: approvalRef.id };
          break;

        case 'CHANGE_PROJECT_STATUS':
          if (request.metadata?.newStatus && (accessLevel === 'owner' || accessLevel === 'admin')) {
            await db.collection('projects').doc(request.projectId).update({
              status: request.metadata.newStatus,
              statusChangedAt: admin.firestore.Timestamp.now(),
              statusChangedBy: userId
            });
            result = { statusChanged: true, newStatus: request.metadata.newStatus };
          }
          break;

        case 'COMPLETE_ESTIMATE_BLOCK':
          // Mark estimate block as complete or ready for completion
          if (request.metadata?.blockId) {
            result = { blockId: request.metadata.blockId, action: 'redirect_to_editor' };
          }
          break;

        default:
          result = { acknowledged: true, cta: request.cta };
      }

      // Clear cache after CTA execution
      const cacheKey = `startability:${request.projectId}:${request.estimateId}`;
      await db.collection('cache').doc(cacheKey).delete();

      return {
        success: true,
        result,
        cta: request.cta
      };

    } catch (error) {
      console.error('CTA execution error:', error);
      
      if (error instanceof z.ZodError) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid request parameters',
          error.errors
        );
      }

      throw new functions.https.HttpsError(
        'internal',
        'Failed to execute CTA',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  });

export const clearStartabilityCache = functions
  .runWith({
    timeoutSeconds: 10,
    memory: '128MB'
  })
  .https.onCall(async (data, context) => {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    try {
      const { projectId, estimateId } = data;

      if (projectId && estimateId) {
        // Clear specific cache
        const cacheKey = `startability:${projectId}:${estimateId}`;
        await db.collection('cache').doc(cacheKey).delete();
      } else if (projectId) {
        // Clear all caches for project
        const cacheSnapshot = await db.collection('cache')
          .where(admin.firestore.FieldPath.documentId(), '>=', `startability:${projectId}:`)
          .where(admin.firestore.FieldPath.documentId(), '<', `startability:${projectId}:\uffff`)
          .get();

        const batch = db.batch();
        cacheSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }

      return { success: true, cleared: true };

    } catch (error) {
      console.error('Cache clear error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to clear cache',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  });

// =====================================================
// V2 STARTABILITY API - TECHNICAL REQUIREMENTS
// =====================================================

/**
 * Enhanced startability analysis for Master-Detail UI integration
 * Returns StartabilityReport format with actionable ResolutionActions
 */
export const analyzeStartabilityV2 = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const { projectId, estimateId, includeResolutions = true, forceRefresh = false } = data;

  if (!projectId || !estimateId) {
    throw new functions.https.HttpsError('invalid-argument', 'projectId and estimateId are required');
  }

  try {
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cacheDoc = await db.collection('cache')
        .doc(`startability_v2_${projectId}_${estimateId}`)
        .get();
      
      if (cacheDoc.exists) {
        const cacheData = cacheDoc.data();
        if (cacheData && cacheData.ttl > admin.firestore.Timestamp.now()) {
          console.log(`Returning cached V2 startability for project ${projectId}`);
          return { success: true, data: cacheData.data };
        }
      }
    }

    // Fetch project and estimate data
    const [projectDoc, estimateDoc] = await Promise.all([
      db.collection('projects').doc(projectId).get(),
      db.collection('estimates').doc(estimateId).get()
    ]);

    if (!projectDoc.exists || !estimateDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Project or estimate not found');
    }

    const project = projectDoc.data();
    const estimate = estimateDoc.data();

    // Analyze estimate items for startability
    const itemsStartability: Record<string, any> = {};
    let projectStartable = true;

    if (estimate?.blocks) {
      for (const [blockKey, block] of Object.entries(estimate.blocks)) {
        if (block && typeof block === 'object' && 'items' in block) {
          const blockItems = (block as any).items;
          
          for (const [itemId, item] of Object.entries(blockItems || {})) {
            const analysis = await analyzeEstimateItem(
              itemId, 
              item as any, 
              project, 
              estimate, 
              context.auth.uid,
              includeResolutions
            );
            
            itemsStartability[itemId] = analysis;
            
            // If any item is BLOCKED, project is not startable
            if (analysis.summaryStatus === 'BLOCKED') {
              projectStartable = false;
            }
          }
        }
      }
    }

    const result = {
      projectId,
      isProjectStartable: projectStartable,
      itemsStartability,
      analyzedAt: admin.firestore.Timestamp.now(),
      estimateId
    };

    // Cache result for 5 minutes
    await db.collection('cache')
      .doc(`startability_v2_${projectId}_${estimateId}`)
      .set({
        data: result,
        ttl: admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 60 * 1000),
        createdAt: admin.firestore.Timestamp.now()
      });

    return { success: true, data: result };

  } catch (error) {
    console.error('V2 Startability analysis error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to analyze startability V2',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

/**
 * Analyze individual estimate item for blockers and resolutions
 */
async function analyzeEstimateItem(
  itemId: string,
  item: any,
  project: any,
  estimate: any,
  userId: string,
  includeResolutions: boolean
): Promise<any> {
  const blockers: any[] = [];
  let summaryStatus = 'READY';

  // Check project-level blockers
  if (project.status === 'cancelled' || project.status === 'completed') {
    blockers.push({
      code: 'PROJECT_STATUS_NOT_STARTABLE',
      category: 'Project',
      description: 'Статус проекта не допускает начало работ',
      severity: 'CRITICAL',
      meta: { projectId: project.id, currentStatus: project.status }
    });
    summaryStatus = 'BLOCKED';
  }

  // Check estimate status
  if (estimate.status === 'cancelled' || estimate.status === 'rejected') {
    blockers.push({
      code: 'ESTIMATE_STATUS_BLOCKED',
      category: 'Business',
      description: 'Статус сметы блокирует работы',
      severity: 'CRITICAL',
      meta: { estimateId: estimate.id, currentStatus: estimate.status }
    });
    summaryStatus = 'BLOCKED';
  }

  // Check item assignment
  if (!item.assignedTo && item.type === 'service') {
    blockers.push({
      code: 'MISSING_ASSIGNMENT',
      category: 'Task',
      description: 'Услуга не назначена исполнителю',
      severity: 'WARNING',
      meta: { 
        itemId, 
        estimateId: estimate.id,
        taskId: itemId,
        itemType: item.type 
      }
    });
    if (summaryStatus === 'READY') summaryStatus = 'WARNING';
  }

  // Check client approval if required
  if (estimate.requiresApproval && !estimate.approvedAt) {
    blockers.push({
      code: 'MISSING_COUNTERPARTY_APPROVAL',
      category: 'Business',
      description: 'Ожидается утверждение клиента',
      severity: 'WARNING',
      meta: { 
        estimateId: estimate.id,
        projectId: project.id,
        clientId: project.clientId 
      }
    });
    if (summaryStatus === 'READY') summaryStatus = 'WARNING';
  }

  // Check material availability
  if (item.type === 'material' && item.quantity && item.availableQuantity < item.quantity) {
    blockers.push({
      code: 'MATERIAL_AVAILABILITY_HOLD',
      category: 'Business',
      description: 'Недостаточно материалов на складе',
      severity: 'WARNING',
      meta: {
        itemId,
        materialId: item.materialId,
        required: item.quantity,
        available: item.availableQuantity
      }
    });
    if (summaryStatus === 'READY') summaryStatus = 'WARNING';
  }

  // Add resolution actions if requested
  if (includeResolutions) {
    blockers.forEach(blocker => {
      blocker.resolutionAction = createResolutionActionV2(blocker);
    });
  }

  return {
    itemId,
    summaryStatus,
    blockers
  };
}

/**
 * Create resolution action for V2 system
 */
function createResolutionActionV2(blocker: any): any {
  switch (blocker.code) {
    case 'MISSING_ASSIGNMENT':
      return {
        type: 'ASSIGN_USER',
        label: 'Назначить исполнителя',
        apiEndpoint: '/api/v2/tasks/assign',
        contextData: {
          taskId: blocker.meta?.taskId,
          estimateId: blocker.meta?.estimateId,
          itemId: blocker.meta?.itemId,
          allowedRoles: ['executor', 'contractor']
        }
      };

    case 'MISSING_COUNTERPARTY_APPROVAL':
      return {
        type: 'REQUEST_APPROVAL',
        label: 'Запросить одобрение',
        apiEndpoint: '/api/v2/approvals/request',
        contextData: {
          projectId: blocker.meta?.projectId,
          estimateId: blocker.meta?.estimateId,
          clientId: blocker.meta?.clientId,
          approvalType: 'estimate'
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
          itemId: blocker.meta?.itemId,
          materialId: blocker.meta?.materialId,
          required: blocker.meta?.required,
          available: blocker.meta?.available
        }
      };

    default:
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

/**
 * Execute resolution action from V2 UI
 */
export const executeResolutionAction = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const { actionType, endpoint, contextData, additionalData } = data;

  if (!actionType || !contextData) {
    throw new functions.https.HttpsError('invalid-argument', 'actionType and contextData are required');
  }

  try {
    let result;

    switch (actionType) {
      case 'ASSIGN_USER':
        result = await executeAssignUser(contextData, additionalData, context.auth.uid);
        break;
        
      case 'REQUEST_APPROVAL':
        result = await executeRequestApproval(contextData, additionalData, context.auth.uid);
        break;
        
      case 'CHANGE_PROJECT_STATUS':
        result = await executeChangeProjectStatus(contextData, additionalData, context.auth.uid);
        break;
        
      case 'RESOLVE_MATERIALS':
        result = await executeResolveMaterials(contextData, additionalData, context.auth.uid);
        break;
        
      default:
        // Navigation-only actions don't need server execution
        result = {
          success: true,
          message: 'Navigation action completed',
          action: 'navigate'
        };
    }

    // Clear related cache after successful action
    if (result.success && contextData.projectId && contextData.estimateId) {
      await db.collection('cache')
        .doc(`startability_v2_${contextData.projectId}_${contextData.estimateId}`)
        .delete();
    }

    return result;

  } catch (error) {
    console.error('Resolution action execution error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to execute resolution action',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

/**
 * Execute ASSIGN_USER resolution action
 */
async function executeAssignUser(contextData: any, additionalData: any, userId: string): Promise<any> {
  const { taskId, estimateId, itemId, assigneeId } = { ...contextData, ...additionalData };

  if (!assigneeId) {
    throw new functions.https.HttpsError('invalid-argument', 'assigneeId is required');
  }

  // Update estimate item assignment
  const estimateRef = db.collection('estimates').doc(estimateId);
  const estimateDoc = await estimateRef.get();
  
  if (!estimateDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Estimate not found');
  }

  const estimate = estimateDoc.data();
  const updatedBlocks = { ...estimate?.blocks };

  // Find and update the item
  let itemUpdated = false;
  for (const [blockKey, block] of Object.entries(updatedBlocks)) {
    if (block && typeof block === 'object' && 'items' in block) {
      const blockItems = (block as any).items || {};
      if (blockItems[itemId]) {
        blockItems[itemId] = {
          ...blockItems[itemId],
          assignedTo: assigneeId,
          assignedAt: admin.firestore.Timestamp.now(),
          assignedBy: userId
        };
        itemUpdated = true;
        break;
      }
    }
  }

  if (!itemUpdated) {
    throw new functions.https.HttpsError('not-found', 'Item not found in estimate');
  }

  await estimateRef.update({
    blocks: updatedBlocks,
    updatedAt: admin.firestore.Timestamp.now(),
    updatedBy: userId
  });

  return {
    success: true,
    message: 'Задача успешно назначена',
    updatedItems: [itemId]
  };
}

/**
 * Execute REQUEST_APPROVAL resolution action
 */
async function executeRequestApproval(contextData: any, additionalData: any, userId: string): Promise<any> {
  const { projectId, estimateId, clientId, approvalType, message } = { ...contextData, ...additionalData };

  // Create approval request record
  await db.collection('approvals').add({
    type: approvalType || 'estimate',
    projectId,
    estimateId,
    clientId,
    requestedBy: userId,
    requestedAt: admin.firestore.Timestamp.now(),
    status: 'pending',
    message: message || 'Запрос на утверждение сметы',
    priority: additionalData?.priority || 'normal'
  });

  // Update estimate status
  await db.collection('estimates').doc(estimateId).update({
    status: 'pending_approval',
    approvalRequestedAt: admin.firestore.Timestamp.now(),
    approvalRequestedBy: userId,
    updatedAt: admin.firestore.Timestamp.now()
  });

  return {
    success: true,
    message: 'Запрос на утверждение отправлен',
    updatedItems: []
  };
}

/**
 * Execute CHANGE_PROJECT_STATUS resolution action
 */
async function executeChangeProjectStatus(contextData: any, additionalData: any, userId: string): Promise<any> {
  const { projectId, suggestedStatus } = { ...contextData, ...additionalData };
  const newStatus = additionalData?.newStatus || suggestedStatus || 'active';

  await db.collection('projects').doc(projectId).update({
    status: newStatus,
    statusChangedAt: admin.firestore.Timestamp.now(),
    statusChangedBy: userId,
    updatedAt: admin.firestore.Timestamp.now()
  });

  return {
    success: true,
    message: `Статус проекта изменен на ${newStatus}`,
    updatedItems: []
  };
}

/**
 * Execute RESOLVE_MATERIALS resolution action
 */
async function executeResolveMaterials(contextData: any, additionalData: any, userId: string): Promise<any> {
  const { materialId, required, available } = contextData;
  const { action } = additionalData;

  // This would integrate with inventory management system
  // For now, just mark as resolved
  await db.collection('material_requests').add({
    materialId,
    requiredQuantity: required,
    availableQuantity: available,
    requestedBy: userId,
    requestedAt: admin.firestore.Timestamp.now(),
    status: 'pending',
    action: action || 'request_more',
    priority: additionalData?.priority || 'normal'
  });

  return {
    success: true,
    message: 'Запрос на материалы создан',
    updatedItems: []
  };
}

/**
 * Clear V2 startability cache
 */
export const clearStartabilityCacheV2 = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const { projectId, estimateId } = data;

  try {
    if (projectId && estimateId) {
      // Clear specific cache entry
      await db.collection('cache')
        .doc(`startability_v2_${projectId}_${estimateId}`)
        .delete();
    } else if (projectId) {
      // Clear all cache entries for project
      const cacheQuery = await db.collection('cache')
        .where('data.projectId', '==', projectId)
        .get();
      
      const batch = db.batch();
      cacheQuery.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    return { success: true, message: 'Cache cleared successfully' };

  } catch (error) {
    console.error('V2 Cache clear error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to clear V2 cache',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// Background function to clean up expired cache entries
export const cleanupStartabilityCache = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    try {
      const now = admin.firestore.Timestamp.now();
      
      // Find expired cache entries
      const expiredSnapshot = await db.collection('cache')
        .where('ttl', '<=', now)
        .limit(100)
        .get();

      if (expiredSnapshot.empty) {
        console.log('No expired cache entries found');
        return null;
      }

      // Delete expired entries
      const batch = db.batch();
      expiredSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      console.log(`Cleaned up ${expiredSnapshot.docs.length} expired cache entries`);
      return null;

    } catch (error) {
      console.error('Cache cleanup error:', error);
      return null;
    }
  });
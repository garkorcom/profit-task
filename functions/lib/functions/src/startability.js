"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupStartabilityCache = exports.clearStartabilityCache = exports.executeCTA = exports.evaluateStartability = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const zod_1 = require("zod");
// Validation schemas
const evaluateRequestSchema = zod_1.z.object({
    projectId: zod_1.z.string().min(1),
    estimateId: zod_1.z.string().min(1),
    includeItems: zod_1.z.boolean().optional().default(true),
    forceRefresh: zod_1.z.boolean().optional().default(false)
});
const ctaExecutionSchema = zod_1.z.object({
    projectId: zod_1.z.string().min(1),
    estimateId: zod_1.z.string().min(1),
    cta: zod_1.z.enum(['ASSIGN', 'REQUEST_APPROVAL', 'VIEW_DEPENDENCIES', 'OPEN_COMPLIANCE', 'COMPLETE_ESTIMATE_BLOCK', 'APPROVE_ESTIMATE', 'RESOLVE_MATERIALS', 'CHANGE_PROJECT_STATUS']),
    reasonCode: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Helper functions
const isProjectStatusStartable = (status) => {
    const startableStatuses = ['idea', 'planning', 'active'];
    return startableStatuses.includes((status === null || status === void 0 ? void 0 : status.toLowerCase()) || '');
};
const isTaskStatusBlocked = (status) => {
    const blockedStatuses = ['blocked', 'done', 'cancelled', 'archived'];
    return blockedStatuses.includes((status === null || status === void 0 ? void 0 : status.toLowerCase()) || '');
};
const getProjectAccessLevel = async (userId, projectId) => {
    try {
        const projectDoc = await db.collection('projects').doc(projectId).get();
        if (!projectDoc.exists) {
            return null;
        }
        const project = projectDoc.data();
        // Check ownership
        if (project.createdBy === userId || project.ownerId === userId) {
            return 'owner';
        }
        // Check team membership
        const teamMembers = project.teamMembers || [];
        const member = teamMembers.find((m) => m.userId === userId);
        if (member) {
            return member.role || 'member';
        }
        return null;
    }
    catch (error) {
        console.error('Error getting project access level:', error);
        return null;
    }
};
const evaluateProjectStartability = async (userId, projectId, estimateId, includeItems = true) => {
    const reasons = [];
    try {
        // Get project data
        const projectDoc = await db.collection('projects').doc(projectId).get();
        if (!projectDoc.exists) {
            throw new Error('Project not found');
        }
        const project = projectDoc.data();
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
        const tasks = tasksSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
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
        }
        else {
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
                    const dependencyDocs = await Promise.all(task.dependencies.map((depId) => db.collection('tasks').doc(depId).get()));
                    const uncompletedDeps = dependencyDocs
                        .filter(doc => doc.exists)
                        .map(doc => (Object.assign({ id: doc.id }, doc.data())))
                        .filter((dep) => dep.status !== 'done');
                    if (uncompletedDeps.length > 0) {
                        reasons.push({
                            code: 'DEPENDENCIES_NOT_MET',
                            severity: 'warning',
                            category: 'tasks',
                            entityType: 'task',
                            entityId: task.id,
                            description: `Task has ${uncompletedDeps.length} uncompleted dependencies`,
                            cta: 'VIEW_DEPENDENCIES',
                            meta: { taskId: task.id, dependencies: uncompletedDeps.map((d) => d.id) }
                        });
                    }
                }
            }
        }
        // Get estimates
        const estimatesSnapshot = await db.collection('estimates')
            .where('projectId', '==', projectId)
            .get();
        const estimates = estimatesSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
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
        }
        else {
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
                    const incompleteBlocks = targetEstimate.blocks.filter((block) => block.required && (!block.items || block.items.length === 0));
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
        let overall;
        if (criticalIssues.length > 0) {
            overall = 'blocked';
        }
        else if (warningIssues.length > 0) {
            overall = 'attention';
        }
        else {
            overall = 'ready';
        }
        // Calculate item counts
        const startableTasks = tasks.filter((task) => !isTaskStatusBlocked(task.status) &&
            task.assignedTo &&
            task.assignedTo.length > 0);
        return {
            overall,
            reasons,
            itemCount: {
                total: tasks.length,
                startable: startableTasks.length,
                blocked: tasks.filter((task) => isTaskStatusBlocked(task.status)).length,
                attention: Math.max(0, tasks.length - startableTasks.length - tasks.filter((task) => isTaskStatusBlocked(task.status)).length)
            },
            lastEvaluated: new Date()
        };
    }
    catch (error) {
        console.error('Error evaluating startability:', error);
        throw error;
    }
};
// Cloud Functions
exports.evaluateStartability = functions
    .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
})
    .https.onCall(async (data, context) => {
    // Validate authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to evaluate startability');
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
                const cacheData = cacheDoc.data();
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
        const snapshot = await evaluateProjectStartability(userId, request.projectId, request.estimateId, request.includeItems);
        // Cache the result
        await cacheRef.set({
            snapshot,
            itemStartabilities: {},
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
    }
    catch (error) {
        console.error('Startability evaluation error:', error);
        if (error instanceof zod_1.z.ZodError) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid request parameters', error.errors);
        }
        throw new functions.https.HttpsError('internal', 'Failed to evaluate startability', error instanceof Error ? error.message : 'Unknown error');
    }
});
exports.executeCTA = functions
    .runWith({
    timeoutSeconds: 30,
    memory: '256MB'
})
    .https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g;
    // Validate authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to execute CTA');
    }
    const userId = context.auth.uid;
    try {
        // Validate input
        const request = ctaExecutionSchema.parse(data);
        // Check permissions
        const accessLevel = await getProjectAccessLevel(userId, request.projectId);
        if (!accessLevel) {
            throw new functions.https.HttpsError('permission-denied', 'No access to this project');
        }
        // Execute CTA based on type
        let result = {};
        switch (request.cta) {
            case 'ASSIGN':
                if (((_a = request.metadata) === null || _a === void 0 ? void 0 : _a.taskId) && ((_b = request.metadata) === null || _b === void 0 ? void 0 : _b.assigneeId)) {
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
                    type: ((_c = request.metadata) === null || _c === void 0 ? void 0 : _c.approvalType) || 'client',
                    status: 'pending',
                    requestedBy: userId,
                    requestedAt: admin.firestore.Timestamp.now(),
                    message: ((_d = request.metadata) === null || _d === void 0 ? void 0 : _d.message) || '',
                    priority: ((_e = request.metadata) === null || _e === void 0 ? void 0 : _e.priority) || 'normal'
                });
                result = { approvalId: approvalRef.id };
                break;
            case 'CHANGE_PROJECT_STATUS':
                if (((_f = request.metadata) === null || _f === void 0 ? void 0 : _f.newStatus) && (accessLevel === 'owner' || accessLevel === 'admin')) {
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
                if ((_g = request.metadata) === null || _g === void 0 ? void 0 : _g.blockId) {
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
    }
    catch (error) {
        console.error('CTA execution error:', error);
        if (error instanceof zod_1.z.ZodError) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid request parameters', error.errors);
        }
        throw new functions.https.HttpsError('internal', 'Failed to execute CTA', error instanceof Error ? error.message : 'Unknown error');
    }
});
exports.clearStartabilityCache = functions
    .runWith({
    timeoutSeconds: 10,
    memory: '128MB'
})
    .https.onCall(async (data, context) => {
    // Validate authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        const { projectId, estimateId } = data;
        if (projectId && estimateId) {
            // Clear specific cache
            const cacheKey = `startability:${projectId}:${estimateId}`;
            await db.collection('cache').doc(cacheKey).delete();
        }
        else if (projectId) {
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
    }
    catch (error) {
        console.error('Cache clear error:', error);
        throw new functions.https.HttpsError('internal', 'Failed to clear cache', error instanceof Error ? error.message : 'Unknown error');
    }
});
// Background function to clean up expired cache entries
exports.cleanupStartabilityCache = functions.pubsub
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
    }
    catch (error) {
        console.error('Cache cleanup error:', error);
        return null;
    }
});
//# sourceMappingURL=startability.js.map
/**
 * Firebase API for Unified Task System (SSOT)
 * Bridges the unified task types with Firebase Firestore operations
 */

import { db } from '../firebase/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  DocumentReference,
  Query,
  Unsubscribe
} from 'firebase/firestore';

import {
  UnifiedTask,
  EstimateTaskUnified,
  ProjectTaskUnified,
  CreateTaskDto,
  CreateEstimateTaskDto,
  CreateProjectTaskDto,
  UpdateTaskDto,
  TaskFilters,
  TaskSortOptions,
  isEstimateTask,
  isProjectTask,
  TaskStatus
} from '../types/unified-task.types';

import { Task as LegacyTask } from './taskApi';

/**
 * Converts legacy Task to UnifiedTask
 */
const legacyTaskToUnified = (legacyTask: LegacyTask & { id: string }): UnifiedTask => {
  // Determine if this is an estimate or project task based on available fields
  const hasEstimateFields = Boolean(legacyTask.estimateItemId);
  
  // Map legacy priority to unified priority
  let unifiedPriority: any = legacyTask.priority || 'medium';
  if (legacyTask.priority === 'critical') {
    unifiedPriority = 'urgent'; // Map critical to urgent for unified system
  }
  
  const baseTask = {
    id: legacyTask.id,
    name: legacyTask.task, // Legacy uses 'task' field for name
    description: legacyTask.description || '',
    status: (legacyTask.status || 'new') as TaskStatus,
    priority: unifiedPriority as any,
    plannedHours: legacyTask.plannedDuration || 1,
    actualHours: legacyTask.actualDuration || 0,
    tags: [], // Legacy doesn't have tags
    createdAt: legacyTask.createdAt || new Date(),
    updatedAt: legacyTask.updatedAt || new Date(),
    createdBy: legacyTask.authorId || 'unknown',
    updatedBy: legacyTask.authorId || 'unknown',
    assignedUserId: legacyTask.assigneeId,
  };

  if (hasEstimateFields) {
    // Convert to EstimateTask
    return {
      ...baseTask,
      phase: 'pre_construction',
      estimateId: legacyTask.estimateItemId!,
      includeMode: 'COGS', // Default value
      categoryId: '',
      relatedEstimateItems: []
    } as EstimateTaskUnified;
  } else {
    // Convert to ProjectTask
    return {
      ...baseTask,
      phase: 'execution',
      projectId: legacyTask.projectId || 'unknown',
      plannedCost: 0, // Legacy doesn't have planned cost
      actualCost: 0,
      wbsCode: '',
      milestone: '',
      progressPct: 0,
      budgetUtilizationPct: 0,
      assignedTeam: [],
      changeOrders: [],
      estimateItemId: legacyTask.estimateItemId,
      categoryId: '',
      parentTaskId: undefined,
      budgetLimit: undefined,
      hourlyLimit: undefined,
      requiresApprovalOver: undefined
    } as ProjectTaskUnified;
  }
};

/**
 * Converts UnifiedTask to legacy Task format for Firebase storage
 */
const unifiedTaskToLegacy = (unifiedTask: Partial<UnifiedTask>): Partial<LegacyTask> => {
  // Map unified priority to legacy priority
  let legacyPriority = unifiedTask.priority;
  if (unifiedTask.priority === 'urgent') {
    legacyPriority = 'critical'; // Map urgent to critical for legacy compatibility
  }
  
  const legacyTask: Partial<LegacyTask> = {
    task: unifiedTask.name, // Map name -> task
    description: unifiedTask.description,
    status: unifiedTask.status,
    priority: legacyPriority as any,
    plannedDuration: unifiedTask.plannedHours,
    actualDuration: unifiedTask.actualHours,
    authorId: unifiedTask.createdBy,
    assigneeId: unifiedTask.assignedUserId,
  };

  if (isEstimateTask(unifiedTask as UnifiedTask)) {
    const estimateTask = unifiedTask as EstimateTaskUnified;
    legacyTask.estimateItemId = estimateTask.estimateId;
  } else if (isProjectTask(unifiedTask as UnifiedTask)) {
    const projectTask = unifiedTask as ProjectTaskUnified;
    legacyTask.projectId = projectTask.projectId;
  }

  return legacyTask;
};

/**
 * Gets the tasks collection reference for a user
 */
const getUserTasksCollection = (userId: string) => {
  return collection(db, 'users', userId, 'tasks');
};

/**
 * Creates a new unified task in Firebase
 */
export const createUnifiedTask = async (
  userId: string, 
  taskData: CreateTaskDto
): Promise<string> => {
  const tasksCollection = getUserTasksCollection(userId);
  const legacyTaskData = unifiedTaskToLegacy(taskData);
  
  const docRef = await addDoc(tasksCollection, {
    ...legacyTaskData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return docRef.id;
};

/**
 * Updates an existing unified task in Firebase
 */
export const updateUnifiedTask = async (
  userId: string,
  taskId: string,
  updates: UpdateTaskDto
): Promise<void> => {
  const taskDoc = doc(db, 'users', userId, 'tasks', taskId);
  const legacyUpdates = unifiedTaskToLegacy(updates);
  
  await updateDoc(taskDoc, {
    ...legacyUpdates,
    updatedAt: serverTimestamp()
  });
};

/**
 * Deletes a unified task from Firebase
 */
export const deleteUnifiedTask = async (
  userId: string,
  taskId: string
): Promise<void> => {
  const taskDoc = doc(db, 'users', userId, 'tasks', taskId);
  await deleteDoc(taskDoc);
};

/**
 * Gets a single unified task by ID
 */
export const getUnifiedTask = async (
  userId: string,
  taskId: string
): Promise<UnifiedTask | null> => {
  const taskDoc = doc(db, 'users', userId, 'tasks', taskId);
  const docSnap = await getDoc(taskDoc);
  
  if (docSnap.exists()) {
    const legacyTask = { id: docSnap.id, ...docSnap.data() } as LegacyTask & { id: string };
    return legacyTaskToUnified(legacyTask);
  }
  
  return null;
};

/**
 * Builds Firestore query from unified filters
 */
const buildQuery = (
  userId: string,
  filters?: TaskFilters,
  sortOptions?: TaskSortOptions,
  limitCount?: number
): Query => {
  const tasksCollection = getUserTasksCollection(userId);
  const constraints: any[] = [];

  if (filters) {
    if (filters.status && filters.status.length > 0) {
      constraints.push(where('status', 'in', filters.status));
    }
    if (filters.priority && filters.priority.length > 0) {
      constraints.push(where('priority', 'in', filters.priority));
    }
    if (filters.projectId) {
      constraints.push(where('projectId', '==', filters.projectId));
    }
    if (filters.estimateId) {
      constraints.push(where('estimateItemId', '==', filters.estimateId));
    }
    if (filters.assignedUserId) {
      constraints.push(where('assigneeId', '==', filters.assignedUserId));
    }
  }

  // Add sorting
  if (sortOptions) {
    const sortField = sortOptions.field === 'name' ? 'task' : sortOptions.field;
    constraints.push(orderBy(sortField, sortOptions.direction));
  } else {
    constraints.push(orderBy('updatedAt', 'desc'));
  }

  // Add limit
  if (limitCount) {
    constraints.push(limit(limitCount));
  }

  return query(tasksCollection, ...constraints);
};

/**
 * Gets unified tasks with filters and sorting
 */
export const getUnifiedTasks = async (
  userId: string,
  filters?: TaskFilters,
  sortOptions?: TaskSortOptions,
  limitCount?: number
): Promise<UnifiedTask[]> => {
  const q = buildQuery(userId, filters, sortOptions, limitCount);
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => {
    const legacyTask = { id: doc.id, ...doc.data() } as LegacyTask & { id: string };
    return legacyTaskToUnified(legacyTask);
  });
};

/**
 * Subscribes to unified tasks with real-time updates
 */
export const subscribeToUnifiedTasks = (
  userId: string,
  callback: (tasks: UnifiedTask[]) => void,
  filters?: TaskFilters,
  sortOptions?: TaskSortOptions,
  limitCount?: number
): Unsubscribe => {
  const q = buildQuery(userId, filters, sortOptions, limitCount);
  
  return onSnapshot(q, (querySnapshot) => {
    const tasks = querySnapshot.docs.map(doc => {
      const legacyTask = { id: doc.id, ...doc.data() } as LegacyTask & { id: string };
      return legacyTaskToUnified(legacyTask);
    });
    callback(tasks);
  });
};

/**
 * Gets unified tasks for a specific estimate
 */
export const getEstimateTasks = async (
  userId: string,
  estimateId: string
): Promise<EstimateTaskUnified[]> => {
  const tasks = await getUnifiedTasks(userId, {
    estimateId,
    phase: 'pre_construction'
  });
  
  return tasks.filter(isEstimateTask);
};

/**
 * Gets unified tasks for a specific project
 */
export const getProjectTasks = async (
  userId: string,
  projectId: string
): Promise<ProjectTaskUnified[]> => {
  const tasks = await getUnifiedTasks(userId, {
    projectId,
    phase: 'execution'
  });
  
  return tasks.filter(isProjectTask);
};

/**
 * Subscribes to estimate tasks with real-time updates
 */
export const subscribeToEstimateTasks = (
  userId: string,
  estimateId: string,
  callback: (tasks: EstimateTaskUnified[]) => void
): Unsubscribe => {
  return subscribeToUnifiedTasks(
    userId,
    (tasks) => {
      const estimateTasks = tasks.filter(task => 
        isEstimateTask(task) && task.estimateId === estimateId
      ) as EstimateTaskUnified[];
      callback(estimateTasks);
    },
    { estimateId, phase: 'pre_construction' }
  );
};

/**
 * Subscribes to project tasks with real-time updates
 */
export const subscribeToProjectTasks = (
  userId: string,
  projectId: string,
  callback: (tasks: ProjectTaskUnified[]) => void
): Unsubscribe => {
  return subscribeToUnifiedTasks(
    userId,
    (tasks) => {
      const projectTasks = tasks.filter(task => 
        isProjectTask(task) && task.projectId === projectId
      ) as ProjectTaskUnified[];
      callback(projectTasks);
    },
    { projectId, phase: 'execution' }
  );
};
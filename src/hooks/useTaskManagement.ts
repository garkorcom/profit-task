/**
 * Централизованный хук для управления задачами (SSOT)
 * Объединяет логику работы с EstimateTask и ProjectTask
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  TaskValidationResult,
  TaskStatistics,
  TaskPriority,
  isEstimateTask,
  isProjectTask,
  TASK_STATUS_TRANSITIONS,
  STATUSES_REQUIRING_CONFIRMATION,
  ACTIVE_TASK_STATUSES,
  COMPLETED_TASK_STATUSES
} from '../types/unified-task.types';
import { TaskStatus } from '../api/taskApi';
import { Permission } from '../auth/permissions';
import { usePermissions } from '../auth/usePermissions';
import { useAuth } from '../auth/AuthContext';
import {
  createUnifiedTask,
  updateUnifiedTask,
  deleteUnifiedTask,
  getUnifiedTasks,
  subscribeToUnifiedTasks
} from '../api/unifiedTaskApi';

// ==================== ИНТЕРФЕЙСЫ ХУКА ====================

interface UseTaskManagementOptions {
  autoSync?: boolean;
  enableRealTimeUpdates?: boolean;
  cacheTimeout?: number;
}

interface TaskManagementState {
  tasks: UnifiedTask[];
  loading: boolean;
  error: string | null;
  statistics: TaskStatistics;
}

interface TaskManagementActions {
  // CRUD операции
  createTask: (data: CreateTaskDto) => Promise<UnifiedTask>;
  updateTask: (id: string, data: UpdateTaskDto) => Promise<UnifiedTask>;
  deleteTask: (id: string) => Promise<void>;
  duplicateTask: (id: string) => Promise<UnifiedTask>;
  
  // Управление статусами
  changeTaskStatus: (id: string, newStatus: TaskStatus, reason?: string) => Promise<void>;
  bulkStatusUpdate: (ids: string[], newStatus: TaskStatus) => Promise<void>;
  
  // Фильтрация и поиск
  filterTasks: (filters: TaskFilters) => void;
  sortTasks: (options: TaskSortOptions) => void;
  searchTasks: (query: string) => void;
  clearFilters: () => void;
  
  // Валидация и проверки
  validateTask: (task: Partial<UnifiedTask>) => TaskValidationResult;
  canChangeStatus: (taskId: string, newStatus: TaskStatus) => boolean;
  
  // Утилиты
  refreshTasks: () => Promise<void>;
  getTaskById: (id: string) => UnifiedTask | undefined;
  getTasksByProject: (projectId: string) => ProjectTaskUnified[];
  getTasksByEstimate: (estimateId: string) => EstimateTaskUnified[];
}

// ==================== ОСНОВНОЙ ХУК ====================

export const useTaskManagement = (
  options: UseTaskManagementOptions = {}
): TaskManagementState & TaskManagementActions => {
  
  const { hasPermission } = usePermissions();
  const { currentUser } = useAuth();
  const { autoSync = true, enableRealTimeUpdates = true, cacheTimeout = 300000 } = options;
  
  // ==================== СОСТОЯНИЕ ====================
  
  const [state, setState] = useState<TaskManagementState>({
    tasks: [],
    loading: false,
    error: null,
    statistics: {
      total: 0,
      byStatus: {} as Record<TaskStatus, number>,
      byPriority: {} as Record<TaskPriority, number>,
      byPhase: { pre_construction: 0, execution: 0 },
      totalPlannedHours: 0,
      totalActualHours: 0,
      completionRate: 0
    }
  });
  
  const [filters, setFilters] = useState<TaskFilters>({});
  const [sortOptions, setSortOptions] = useState<TaskSortOptions>({
    field: 'updatedAt',
    direction: 'desc'
  });
  
  // ==================== ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ ====================
  
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...state.tasks];
    
    // Применяем фильтры
    if (filters.phase) {
      result = result.filter(task => task.phase === filters.phase);
    }
    
    if (filters.status && filters.status.length > 0) {
      result = result.filter(task => filters.status!.includes(task.status));
    }
    
    if (filters.priority && filters.priority.length > 0) {
      result = result.filter(task => filters.priority!.includes(task.priority));
    }
    
    if (filters.assignedUserId) {
      result = result.filter(task => task.assignedUserId === filters.assignedUserId);
    }
    
    if (filters.projectId) {
      result = result.filter(task => 
        isProjectTask(task) && task.projectId === filters.projectId
      );
    }
    
    if (filters.estimateId) {
      result = result.filter(task => 
        isEstimateTask(task) && task.estimateId === filters.estimateId
      );
    }
    
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(task => 
        task.name.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    if (filters.tags && filters.tags.length > 0) {
      result = result.filter(task => 
        task.tags?.some(tag => filters.tags!.includes(tag))
      );
    }
    
    // Применяем сортировку
    result.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortOptions.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'priority':
          const priorityWeight = { low: 1, medium: 2, high: 3, urgent: 4, critical: 5 };
          aValue = priorityWeight[a.priority];
          bValue = priorityWeight[b.priority];
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        case 'plannedStartDate':
          aValue = a.plannedStartDate ? new Date(a.plannedStartDate) : new Date(0);
          bValue = b.plannedStartDate ? new Date(b.plannedStartDate) : new Date(0);
          break;
        case 'plannedEndDate':
          aValue = a.plannedEndDate ? new Date(a.plannedEndDate) : new Date(0);
          bValue = b.plannedEndDate ? new Date(b.plannedEndDate) : new Date(0);
          break;
        default:
          aValue = a.updatedAt;
          bValue = b.updatedAt;
      }
      
      if (sortOptions.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return result;
  }, [state.tasks, filters, sortOptions]);
  
  const statistics = useMemo((): TaskStatistics => {
    const tasks = filteredAndSortedTasks;
    const total = tasks.length;
    
    const byStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<TaskStatus, number>);
    
    const byPriority = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<TaskPriority, number>);
    
    const byPhase = tasks.reduce((acc, task) => {
      acc[task.phase] = (acc[task.phase] || 0) + 1;
      return acc;
    }, { pre_construction: 0, execution: 0 });
    
    const totalPlannedHours = tasks.reduce((sum, task) => sum + task.plannedHours, 0);
    const totalActualHours = tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
    
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const completionRate = total > 0 ? (completedTasks / total) * 100 : 0;
    
    return {
      total,
      byStatus,
      byPriority,
      byPhase,
      totalPlannedHours,
      totalActualHours,
      completionRate
    };
  }, [filteredAndSortedTasks]);
  
  // ==================== API ФУНКЦИИ ====================
  
  const createTask = useCallback(async (data: CreateTaskDto): Promise<UnifiedTask> => {
    if (!currentUser) throw new Error('Пользователь не авторизован');
    
    // Проверка прав доступа
    if (!hasPermission(Permission.CREATE_TASKS)) {
      throw new Error('Недостаточно прав для создания задач');
    }
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Валидация данных
      const validationResult = validateTask(data);
      if (!validationResult.isValid) {
        throw new Error(`Ошибка валидации: ${validationResult.errors?.join(', ')}`);
      }
      
      // Создание задачи в зависимости от типа
      const baseTaskData = {
        ...data,
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'new' as TaskStatus,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      let newTask: UnifiedTask;
      
      if (data.phase === 'pre_construction') {
        const estimateData = data as CreateEstimateTaskDto;
        newTask = {
          ...baseTaskData,
          phase: 'pre_construction',
          estimateId: estimateData.estimateId,
          categoryId: estimateData.categoryId,
          includeMode: estimateData.includeMode,
          relatedEstimateItems: estimateData.relatedEstimateItems
        } as EstimateTaskUnified;
      } else {
        const projectData = data as CreateProjectTaskDto;
        newTask = {
          ...baseTaskData,
          phase: 'execution',
          projectId: projectData.projectId,
          estimateItemId: projectData.estimateItemId,
          categoryId: projectData.categoryId,
          wbsCode: projectData.wbsCode,
          parentTaskId: projectData.parentTaskId,
          plannedCost: projectData.plannedCost,
          actualCost: 0,
          budgetUtilizationPct: 0,
          assignedTeam: projectData.assignedTeam || [],
          progressPct: 0,
          milestone: projectData.milestone,
          budgetLimit: projectData.budgetLimit,
          hourlyLimit: projectData.hourlyLimit,
          requiresApprovalOver: projectData.requiresApprovalOver,
          changeOrders: []
        } as ProjectTaskUnified;
      }
      
      // Сохранение в Firebase
      const taskId = await createUnifiedTask(currentUser.uid, data);
      newTask.id = taskId;
      
      setState(prev => ({
        ...prev,
        tasks: [...prev.tasks, newTask],
        loading: false
      }));
      
      return newTask;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Ошибка создания задачи'
      }));
      throw error;
    }
  }, [currentUser, hasPermission]);
  
  const updateTask = useCallback(async (id: string, data: UpdateTaskDto): Promise<UnifiedTask> => {
    if (!currentUser) throw new Error('Пользователь не авторизован');
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const existingTask = state.tasks.find(task => task.id === id);
      if (!existingTask) {
        throw new Error('Задача не найдена');
      }
      
      // Проверка прав доступа
      const canEditAll = hasPermission(Permission.EDIT_ALL_TASKS);
      const canEditOwn = hasPermission(Permission.EDIT_OWN_TASKS) && 
                        (existingTask.createdBy === currentUser.uid || existingTask.assignedUserId === currentUser.uid);
      
      if (!canEditAll && !canEditOwn) {
        throw new Error('Недостаточно прав для редактирования задачи');
      }
      
      const updatedTask: UnifiedTask = {
        ...existingTask,
        ...data,
        id, // Защита от изменения ID
        updatedBy: currentUser.uid,
        updatedAt: new Date().toISOString()
      };
      
      // Валидация обновленных данных
      const validationResult = validateTask(updatedTask);
      if (!validationResult.isValid) {
        throw new Error(`Ошибка валидации: ${validationResult.errors?.join(', ')}`);
      }
      
      // Обновление в Firebase
      await updateUnifiedTask(currentUser.uid, id, data);
      
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(task => task.id === id ? updatedTask : task),
        loading: false
      }));
      
      return updatedTask;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Ошибка обновления задачи'
      }));
      throw error;
    }
  }, [currentUser, hasPermission, state.tasks]);
  
  const deleteTask = useCallback(async (id: string): Promise<void> => {
    if (!currentUser) throw new Error('Пользователь не авторизован');
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const existingTask = state.tasks.find(task => task.id === id);
      if (!existingTask) {
        throw new Error('Задача не найдена');
      }
      
      // Проверка прав доступа
      const canDeleteAll = hasPermission(Permission.DELETE_TASKS);
      const canDeleteOwn = hasPermission(Permission.DELETE_TASKS) && existingTask.createdBy === currentUser.uid;
      
      if (!canDeleteAll && !canDeleteOwn) {
        throw new Error('Недостаточно прав для удаления задачи');
      }
      
      // Удаление из Firebase
      await deleteUnifiedTask(currentUser.uid, id);
      
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.filter(task => task.id !== id),
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Ошибка удаления задачи'
      }));
      throw error;
    }
  }, [currentUser, hasPermission, state.tasks]);
  
  const changeTaskStatus = useCallback(async (
    id: string, 
    newStatus: TaskStatus, 
    reason?: string
  ): Promise<void> => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) throw new Error('Задача не найдена');
    
    if (!canChangeStatus(id, newStatus)) {
      throw new Error(`Недопустимый переход статуса с "${task.status}" на "${newStatus}"`);
    }
    
    const updateData: UpdateTaskDto = { 
      status: newStatus,
      ...(newStatus === 'completed' && { completedBy: currentUser?.uid, completedAt: new Date().toISOString() }),
      ...(reason && { notes: `${task.notes ? task.notes + '\n' : ''}Изменение статуса: ${reason}` })
    };
    
    await updateTask(id, updateData);
  }, [state.tasks, currentUser, updateTask]);
  
  const validateTask = useCallback((task: Partial<UnifiedTask>): TaskValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Обязательные поля
    if (!task.name?.trim()) {
      errors.push('Название задачи обязательно');
    }
    
    if (!task.plannedHours || task.plannedHours <= 0) {
      errors.push('Плановые часы должны быть больше 0');
    }
    
    // Валидация для EstimateTask
    if (task.phase === 'pre_construction') {
      const estimateTask = task as Partial<EstimateTaskUnified>;
      if (!estimateTask.estimateId) {
        errors.push('ID сметы обязателен для задач планирования');
      }
      if (!estimateTask.includeMode) {
        errors.push('Режим включения в расчеты обязателен');
      }
    }
    
    // Валидация для ProjectTask
    if (task.phase === 'execution') {
      const projectTask = task as Partial<ProjectTaskUnified>;
      if (!projectTask.projectId) {
        errors.push('ID проекта обязателен для задач выполнения');
      }
      if (!projectTask.plannedCost || projectTask.plannedCost <= 0) {
        errors.push('Плановая стоимость должна быть больше 0');
      }
    }
    
    // Проверка дат
    if (task.plannedStartDate && task.plannedEndDate) {
      const startDate = new Date(task.plannedStartDate);
      const endDate = new Date(task.plannedEndDate);
      if (startDate >= endDate) {
        errors.push('Дата начала должна быть раньше даты окончания');
      }
    }
    
    // Предупреждения
    if (task.actualHours && task.plannedHours && task.actualHours > task.plannedHours * 1.2) {
      warnings.push('Фактические часы превышают плановые на 20%');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }, []);
  
  const canChangeStatus = useCallback((taskId: string, newStatus: TaskStatus): boolean => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return false;
    
    const allowedTransitions = TASK_STATUS_TRANSITIONS[task.status] || [];
    return allowedTransitions.includes(newStatus);
  }, [state.tasks]);
  
  // ==================== УТИЛИТАРНЫЕ ФУНКЦИИ ====================
  
  const getTaskById = useCallback((id: string): UnifiedTask | undefined => {
    return state.tasks.find(task => task.id === id);
  }, [state.tasks]);
  
  const getTasksByProject = useCallback((projectId: string): ProjectTaskUnified[] => {
    return state.tasks.filter((task): task is ProjectTaskUnified => 
      isProjectTask(task) && task.projectId === projectId
    );
  }, [state.tasks]);
  
  const getTasksByEstimate = useCallback((estimateId: string): EstimateTaskUnified[] => {
    return state.tasks.filter((task): task is EstimateTaskUnified => 
      isEstimateTask(task) && task.estimateId === estimateId
    );
  }, [state.tasks]);
  
  const filterTasks = useCallback((newFilters: TaskFilters) => {
    setFilters(newFilters);
  }, []);
  
  const sortTasks = useCallback((options: TaskSortOptions) => {
    setSortOptions(options);
  }, []);
  
  const searchTasks = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);
  
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);
  
  const refreshTasks = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    // Здесь будет загрузка данных из Firebase
    setState(prev => ({ ...prev, loading: false }));
  }, []);
  
  const duplicateTask = useCallback(async (id: string): Promise<UnifiedTask> => {
    const originalTask = state.tasks.find(task => task.id === id);
    if (!originalTask) throw new Error('Задача не найдена');
    
    const { id: _, createdAt: __, updatedAt: ___, ...taskData } = originalTask;
    const duplicateData = {
      ...taskData,
      name: `${taskData.name} (копия)`,
      status: 'new' as TaskStatus,
      actualHours: undefined,
      actualStartDate: undefined,
      actualEndDate: undefined,
      completedBy: undefined,
      completedAt: undefined
    };
    
    return createTask(duplicateData as CreateTaskDto);
  }, [state.tasks, createTask]);
  
  const bulkStatusUpdate = useCallback(async (
    ids: string[], 
    newStatus: TaskStatus
  ): Promise<void> => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const updatePromises = ids.map(id => changeTaskStatus(id, newStatus));
      await Promise.all(updatePromises);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Ошибка массового обновления'
      }));
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [changeTaskStatus]);
  
  // ==================== ЭФФЕКТЫ ====================
  
  // Подписка на задачи в Firebase
  useEffect(() => {
    if (!currentUser || !enableRealTimeUpdates) return;
    
    setState(prev => ({ ...prev, loading: true }));
    
    const unsubscribe = subscribeToUnifiedTasks(
      currentUser.uid,
      (tasks) => {
        setState(prev => ({
          ...prev,
          tasks,
          loading: false,
          error: null
        }));
      },
      filters,
      sortOptions
    );
    
    return unsubscribe;
  }, [currentUser, enableRealTimeUpdates, filters, sortOptions]);
  
  useEffect(() => {
    setState(prev => ({ ...prev, statistics }));
  }, [statistics]);
  
  // ==================== ВОЗВРАТ ====================
  
  return {
    // Состояние
    tasks: filteredAndSortedTasks,
    loading: state.loading,
    error: state.error,
    statistics: state.statistics,
    
    // Действия
    createTask,
    updateTask,
    deleteTask,
    duplicateTask,
    changeTaskStatus,
    bulkStatusUpdate,
    filterTasks,
    sortTasks,
    searchTasks,
    clearFilters,
    validateTask,
    canChangeStatus,
    refreshTasks,
    getTaskById,
    getTasksByProject,
    getTasksByEstimate
  };
};
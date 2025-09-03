/**
 * Провайдер конфигурации для системы задач
 * Предоставляет UI конфигурации для статусов, приоритетов и переходов
 */

import React, { createContext, useContext } from 'react';
import {
  TaskStatus,
  TaskPriority,
  TaskStatusConfig,
  TaskPriorityConfig,
  TASK_STATUS_TRANSITIONS,
  STATUSES_REQUIRING_CONFIRMATION,
  ACTIVE_TASK_STATUSES,
  COMPLETED_TASK_STATUSES
} from '../../../types/unified-task.types';
import {
  CheckCircle as CompletedIcon,
  Cancel as CancelledIcon,
  PlayArrow as InProgressIcon,
  Pause as OnHoldIcon,
  RateReview as ReviewIcon,
  Edit as ReworkIcon,
  Assignment as AssignedIcon,
  FiberNew as NewIcon,
  KeyboardArrowDown as LowIcon,
  Remove as MediumIcon,
  KeyboardArrowUp as HighIcon,
  PriorityHigh as UrgentIcon
} from '@mui/icons-material';

// ==================== КОНФИГУРАЦИИ ====================

const TASK_STATUS_CONFIG: Record<TaskStatus, TaskStatusConfig> = {
  'new': {
    label: 'Новая',
    color: 'default',
    description: 'Задача создана, но еще не назначена',
    allowedTransitions: TASK_STATUS_TRANSITIONS['new']
  },
  'assigned': {
    label: 'Назначена',
    color: 'info',
    description: 'Задача назначена исполнителю',
    allowedTransitions: TASK_STATUS_TRANSITIONS['assigned']
  },
  'in_progress': {
    label: 'В работе',
    color: 'primary',
    description: 'Задача активно выполняется',
    allowedTransitions: TASK_STATUS_TRANSITIONS['in_progress']
  },
  'on_hold': {
    label: 'Приостановлена',
    color: 'warning',
    description: 'Выполнение задачи временно приостановлено',
    allowedTransitions: TASK_STATUS_TRANSITIONS['on_hold']
  },
  'review': {
    label: 'На проверке',
    color: 'secondary',
    description: 'Задача ожидает проверки и подтверждения',
    allowedTransitions: TASK_STATUS_TRANSITIONS['review']
  },
  'rework': {
    label: 'На доработку',
    color: 'error',
    description: 'Задача возвращена на доработку',
    allowedTransitions: TASK_STATUS_TRANSITIONS['rework']
  },
  'completed': {
    label: 'Выполнена',
    color: 'success',
    description: 'Задача успешно завершена',
    allowedTransitions: TASK_STATUS_TRANSITIONS['completed']
  },
  'cancelled': {
    label: 'Отменена',
    color: 'default',
    description: 'Выполнение задачи отменено',
    allowedTransitions: TASK_STATUS_TRANSITIONS['cancelled']
  }
};

const TASK_PRIORITY_CONFIG: Record<TaskPriority, TaskPriorityConfig> = {
  'low': {
    label: 'Низкий',
    color: 'default',
    icon: <LowIcon />,
    weight: 1
  },
  'medium': {
    label: 'Средний',
    color: 'info',
    icon: <MediumIcon />,
    weight: 2
  },
  'high': {
    label: 'Высокий',
    color: 'warning',
    icon: <HighIcon />,
    weight: 3
  },
  'critical': {
    label: 'Критический',
    color: 'error',
    icon: <UrgentIcon />,
    weight: 4
  },
  'urgent': {
    label: 'Срочный',
    color: 'error',
    icon: <UrgentIcon />,
    weight: 4
  }
};

const STATUS_ICONS: Record<TaskStatus, React.ReactElement> = {
  'new': <NewIcon />,
  'assigned': <AssignedIcon />,
  'in_progress': <InProgressIcon />,
  'on_hold': <OnHoldIcon />,
  'review': <ReviewIcon />,
  'rework': <ReworkIcon />,
  'completed': <CompletedIcon />,
  'cancelled': <CancelledIcon />
};

// ==================== КОНТЕКСТ ====================

interface TaskConfigContextValue {
  // Конфигурации
  statusConfig: Record<TaskStatus, TaskStatusConfig>;
  priorityConfig: Record<TaskPriority, TaskPriorityConfig>;
  statusIcons: Record<TaskStatus, React.ReactElement>;
  
  // Утилиты
  getStatusLabel: (status: TaskStatus) => string;
  getStatusColor: (status: TaskStatus) => TaskStatusConfig['color'];
  getStatusDescription: (status: TaskStatus) => string;
  getStatusIcon: (status: TaskStatus) => React.ReactElement;
  getAllowedTransitions: (status: TaskStatus) => TaskStatus[];
  
  getPriorityLabel: (priority: TaskPriority) => string;
  getPriorityColor: (priority: TaskPriority) => TaskPriorityConfig['color'];
  getPriorityIcon: (priority: TaskPriority) => React.ReactElement | undefined;
  getPriorityWeight: (priority: TaskPriority) => number;
  
  // Проверки
  canTransitionTo: (fromStatus: TaskStatus, toStatus: TaskStatus) => boolean;
  requiresConfirmation: (status: TaskStatus) => boolean;
  isActiveStatus: (status: TaskStatus) => boolean;
  isCompletedStatus: (status: TaskStatus) => boolean;
  
  // Сортировка и группировка
  sortStatusesByTransition: (statuses: TaskStatus[]) => TaskStatus[];
  sortPrioritiesByWeight: (priorities: TaskPriority[]) => TaskPriority[];
  groupTasksByStatus: <T extends { status: TaskStatus }>(tasks: T[]) => Record<TaskStatus, T[]>;
  groupTasksByPriority: <T extends { priority: TaskPriority }>(tasks: T[]) => Record<TaskPriority, T[]>;
}

const TaskConfigContext = createContext<TaskConfigContextValue | undefined>(undefined);

// ==================== ПРОВАЙДЕР ====================

interface TaskConfigProviderProps {
  children: React.ReactNode;
  customStatusConfig?: Partial<Record<TaskStatus, Partial<TaskStatusConfig>>>;
  customPriorityConfig?: Partial<Record<TaskPriority, Partial<TaskPriorityConfig>>>;
}

export const TaskConfigProvider: React.FC<TaskConfigProviderProps> = ({
  children,
  customStatusConfig = {},
  customPriorityConfig = {}
}) => {
  
  // Объединяем пользовательские конфигурации с дефолтными
  const statusConfig = React.useMemo(() => {
    const merged = { ...TASK_STATUS_CONFIG };
    Object.entries(customStatusConfig).forEach(([status, config]) => {
      if (merged[status as TaskStatus]) {
        merged[status as TaskStatus] = {
          ...merged[status as TaskStatus],
          ...config
        };
      }
    });
    return merged;
  }, [customStatusConfig]);

  const priorityConfig = React.useMemo(() => {
    const merged = { ...TASK_PRIORITY_CONFIG };
    Object.entries(customPriorityConfig).forEach(([priority, config]) => {
      if (merged[priority as TaskPriority]) {
        merged[priority as TaskPriority] = {
          ...merged[priority as TaskPriority],
          ...config
        };
      }
    });
    return merged;
  }, [customPriorityConfig]);

  // Утилиты для статусов
  const getStatusLabel = (status: TaskStatus): string => {
    return statusConfig[status]?.label || status;
  };

  const getStatusColor = (status: TaskStatus): TaskStatusConfig['color'] => {
    return statusConfig[status]?.color || 'default';
  };

  const getStatusDescription = (status: TaskStatus): string => {
    return statusConfig[status]?.description || '';
  };

  const getStatusIcon = (status: TaskStatus): React.ReactElement => {
    return STATUS_ICONS[status] || <NewIcon />;
  };

  const getAllowedTransitions = (status: TaskStatus): TaskStatus[] => {
    return statusConfig[status]?.allowedTransitions || [];
  };

  // Утилиты для приоритетов
  const getPriorityLabel = (priority: TaskPriority): string => {
    return priorityConfig[priority]?.label || priority;
  };

  const getPriorityColor = (priority: TaskPriority): TaskPriorityConfig['color'] => {
    return priorityConfig[priority]?.color || 'default';
  };

  const getPriorityIcon = (priority: TaskPriority): React.ReactElement | undefined => {
    return priorityConfig[priority]?.icon;
  };

  const getPriorityWeight = (priority: TaskPriority): number => {
    return priorityConfig[priority]?.weight || 0;
  };

  // Проверки
  const canTransitionTo = (fromStatus: TaskStatus, toStatus: TaskStatus): boolean => {
    const allowedTransitions = getAllowedTransitions(fromStatus);
    return allowedTransitions.includes(toStatus);
  };

  const requiresConfirmation = (status: TaskStatus): boolean => {
    return STATUSES_REQUIRING_CONFIRMATION.includes(status);
  };

  const isActiveStatus = (status: TaskStatus): boolean => {
    return ACTIVE_TASK_STATUSES.includes(status);
  };

  const isCompletedStatus = (status: TaskStatus): boolean => {
    return COMPLETED_TASK_STATUSES.includes(status);
  };

  // Сортировка и группировка
  const sortStatusesByTransition = (statuses: TaskStatus[]): TaskStatus[] => {
    const statusOrder: TaskStatus[] = ['new', 'assigned', 'in_progress', 'on_hold', 'review', 'rework', 'completed', 'cancelled'];
    return statuses.sort((a, b) => {
      return statusOrder.indexOf(a) - statusOrder.indexOf(b);
    });
  };

  const sortPrioritiesByWeight = (priorities: TaskPriority[]): TaskPriority[] => {
    return priorities.sort((a, b) => {
      return getPriorityWeight(b) - getPriorityWeight(a); // По убыванию важности
    });
  };

  const groupTasksByStatus = <T extends { status: TaskStatus }>(tasks: T[]): Record<TaskStatus, T[]> => {
    const grouped = {} as Record<TaskStatus, T[]>;
    
    // Инициализируем все статусы пустыми массивами
    Object.keys(statusConfig).forEach(status => {
      grouped[status as TaskStatus] = [];
    });
    
    // Группируем задачи
    tasks.forEach(task => {
      if (!grouped[task.status]) {
        grouped[task.status] = [];
      }
      grouped[task.status].push(task);
    });
    
    return grouped;
  };

  const groupTasksByPriority = <T extends { priority: TaskPriority }>(tasks: T[]): Record<TaskPriority, T[]> => {
    const grouped = {} as Record<TaskPriority, T[]>;
    
    // Инициализируем все приоритеты пустыми массивами
    Object.keys(priorityConfig).forEach(priority => {
      grouped[priority as TaskPriority] = [];
    });
    
    // Группируем задачи
    tasks.forEach(task => {
      if (!grouped[task.priority]) {
        grouped[task.priority] = [];
      }
      grouped[task.priority].push(task);
    });
    
    return grouped;
  };

  const contextValue: TaskConfigContextValue = {
    statusConfig,
    priorityConfig,
    statusIcons: STATUS_ICONS,
    
    getStatusLabel,
    getStatusColor,
    getStatusDescription,
    getStatusIcon,
    getAllowedTransitions,
    
    getPriorityLabel,
    getPriorityColor,
    getPriorityIcon,
    getPriorityWeight,
    
    canTransitionTo,
    requiresConfirmation,
    isActiveStatus,
    isCompletedStatus,
    
    sortStatusesByTransition,
    sortPrioritiesByWeight,
    groupTasksByStatus,
    groupTasksByPriority
  };

  return (
    <TaskConfigContext.Provider value={contextValue}>
      {children}
    </TaskConfigContext.Provider>
  );
};

// ==================== ХУК ====================

export const useTaskConfig = (): TaskConfigContextValue => {
  const context = useContext(TaskConfigContext);
  if (!context) {
    throw new Error('useTaskConfig must be used within a TaskConfigProvider');
  }
  return context;
};

// ==================== УТИЛИТЫ ====================

/**
 * Хук для получения следующего возможного статуса
 */
export const useNextStatus = (currentStatus: TaskStatus): TaskStatus[] => {
  const { getAllowedTransitions } = useTaskConfig();
  return getAllowedTransitions(currentStatus);
};

/**
 * Хук для проверки возможности перехода статуса
 */
export const useCanTransition = (fromStatus: TaskStatus, toStatus: TaskStatus): boolean => {
  const { canTransitionTo } = useTaskConfig();
  return canTransitionTo(fromStatus, toStatus);
};

/**
 * Хук для получения задач, сгруппированных по статусам, с сортировкой
 */
export const useTasksGroupedByStatus = <T extends { status: TaskStatus }>(
  tasks: T[]
): [TaskStatus, T[]][] => {
  const { groupTasksByStatus, sortStatusesByTransition } = useTaskConfig();
  
  const grouped = groupTasksByStatus(tasks);
  const sortedStatuses = sortStatusesByTransition(Object.keys(grouped) as TaskStatus[]);
  
  return sortedStatuses.map(status => [status, grouped[status]]);
};

export default TaskConfigProvider;
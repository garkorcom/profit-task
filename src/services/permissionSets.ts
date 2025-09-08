/**
 * Permission Sets - Система группировки разрешений
 * 
 * Позволяет группировать 100+ разрешений в логические наборы
 * для упрощения управления ролями
 */

// Временные типы для быстрой компиляции
type Permission = string;

export interface PermissionSet {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: PermissionCategory;
  permissions: Permission[];
  dependencies?: string[]; // IDs других наборов, от которых зависит этот
  icon?: string;
  color?: string;
  level: 'basic' | 'intermediate' | 'advanced' | 'expert';
  isSystem: boolean; // Системные наборы нельзя удалять
  tags?: string[];
}

export type PermissionCategory = 
  | 'projects'
  | 'tasks' 
  | 'finances'
  | 'users'
  | 'time'
  | 'warehouse'
  | 'reports'
  | 'admin'
  | 'system';

/**
 * Предопределенные наборы разрешений
 */
export const systemPermissionSets: PermissionSet[] = [
  // === ПРОЕКТЫ ===
  {
    id: 'project_viewer',
    name: 'project_viewer',
    displayName: 'Просмотр проектов',
    description: 'Базовый доступ для просмотра проектов',
    category: 'projects',
    level: 'basic',
    isSystem: true,
    permissions: [
      'VIEW_OWN_PROJECTS' as Permission
    ],
    icon: 'visibility',
    color: '#2196f3'
  },
  {
    id: 'project_manager',
    name: 'project_manager',
    displayName: 'Управление проектами: Базовое',
    description: 'Создание и редактирование проектов',
    category: 'projects',
    level: 'intermediate',
    isSystem: true,
    dependencies: ['project_viewer'],
    permissions: [
      'VIEW_ALL_PROJECTS',
      'CREATE_PROJECTS',
      'EDIT_PROJECTS'
    ],
    icon: 'folder',
    color: '#2196f3'
  },
  {
    id: 'project_admin',
    name: 'project_admin',
    displayName: 'Управление проектами: Полное',
    description: 'Полное управление проектами включая удаление',
    category: 'projects',
    level: 'advanced',
    isSystem: true,
    dependencies: ['project_manager'],
    permissions: [
      'VIEW_ALL_PROJECTS',
      'CREATE_PROJECTS',
      'EDIT_PROJECTS',
      'DELETE_PROJECTS'
    ],
    icon: 'folder_special',
    color: '#2196f3',
    tags: ['administrative']
  },

  // === ЗАДАЧИ ===
  {
    id: 'task_worker',
    name: 'task_worker',
    displayName: 'Работа с задачами',
    description: 'Просмотр и выполнение назначенных задач',
    category: 'tasks',
    level: 'basic',
    isSystem: true,
    permissions: [
      'VIEW_OWN_TASKS',
      'EDIT_OWN_TASKS'
    ],
    icon: 'task',
    color: '#4caf50'
  },
  {
    id: 'task_manager',
    name: 'task_manager',
    displayName: 'Управление задачами',
    description: 'Создание, назначение и управление задачами',
    category: 'tasks',
    level: 'intermediate',
    isSystem: true,
    dependencies: ['task_worker'],
    permissions: [
      'VIEW_ALL_TASKS',
      'CREATE_TASKS',
      'EDIT_ALL_TASKS',
      'ASSIGN_TASKS'
    ],
    icon: 'assignment',
    color: '#4caf50'
  },
  {
    id: 'task_admin',
    name: 'task_admin',
    displayName: 'Администрирование задач',
    description: 'Полное управление задачами включая удаление',
    category: 'tasks',
    level: 'advanced',
    isSystem: true,
    dependencies: ['task_manager'],
    permissions: [
      'VIEW_ALL_TASKS',
      'CREATE_TASKS',
      'EDIT_ALL_TASKS',
      'ASSIGN_TASKS',
      'DELETE_TASKS'
    ],
    icon: 'admin_panel_settings',
    color: '#4caf50',
    tags: ['administrative']
  },

  // === СМЕТЫ ===
  {
    id: 'estimate_viewer',
    name: 'estimate_viewer',
    displayName: 'Просмотр смет',
    description: 'Доступ к просмотру смет',
    category: 'projects',
    level: 'basic',
    isSystem: true,
    permissions: [
      'VIEW_ESTIMATES'
    ],
    icon: 'description',
    color: '#795548'
  },
  {
    id: 'estimate_creator',
    name: 'estimate_creator',
    displayName: 'Создание смет',
    description: 'Создание и редактирование смет',
    category: 'projects',
    level: 'intermediate',
    isSystem: true,
    dependencies: ['estimate_viewer'],
    permissions: [
      'VIEW_ESTIMATES',
      'CREATE_ESTIMATES',
      'EDIT_ESTIMATES'
    ],
    icon: 'create',
    color: '#795548'
  },
  {
    id: 'estimate_approver',
    name: 'estimate_approver',
    displayName: 'Утверждение смет',
    description: 'Утверждение и финализация смет',
    category: 'projects',
    level: 'advanced',
    isSystem: true,
    dependencies: ['estimate_creator'],
    permissions: [
      'VIEW_ESTIMATES',
      'CREATE_ESTIMATES',
      'EDIT_ESTIMATES',
      'APPROVE_ESTIMATES',
      'DELETE_ESTIMATES'
    ],
    icon: 'verified',
    color: '#795548',
    tags: ['approval']
  },

  // === ФИНАНСЫ ===
  {
    id: 'finance_viewer',
    name: 'finance_viewer',
    displayName: 'Просмотр финансов',
    description: 'Доступ к финансовой отчетности',
    category: 'finances',
    level: 'basic',
    isSystem: true,
    permissions: [
      'VIEW_FINANCES',
      'VIEW_REPORTS'
    ],
    icon: 'account_balance',
    color: '#ff9800'
  },
  {
    id: 'finance_manager',
    name: 'finance_manager',
    displayName: 'Управление финансами',
    description: 'Управление финансами и ставками',
    category: 'finances',
    level: 'advanced',
    isSystem: true,
    dependencies: ['finance_viewer'],
    permissions: [
      'VIEW_FINANCES',
      'MANAGE_FINANCES',
      'VIEW_REPORTS',
      'EXPORT_REPORTS',
      'VIEW_LABOR_RATES',
      'MANAGE_LABOR_RATES'
    ],
    icon: 'monetization_on',
    color: '#ff9800',
    tags: ['sensitive']
  },

  // === УЧЕТ ВРЕМЕНИ ===
  {
    id: 'time_tracker',
    name: 'time_tracker',
    displayName: 'Учет времени: Базовый',
    description: 'Отслеживание собственного рабочего времени',
    category: 'time',
    level: 'basic',
    isSystem: true,
    permissions: [
      'TRACK_TIME',
      'VIEW_OWN_TIME_ENTRIES',
      'CREATE_TIME_ENTRY_DRAFT',
      'SUBMIT_TIME_ENTRY',
      'RECALL_TIME_ENTRY'
    ],
    icon: 'access_time',
    color: '#9c27b0'
  },
  {
    id: 'time_supervisor',
    name: 'time_supervisor',
    displayName: 'Учет времени: Руководитель',
    description: 'Просмотр и утверждение времени команды',
    category: 'time',
    level: 'intermediate',
    isSystem: true,
    dependencies: ['time_tracker'],
    permissions: [
      'TRACK_TIME',
      'VIEW_ALL_TIME_ENTRIES',
      'VIEW_OWN_TIME_ENTRIES',
      'CREATE_TIME_ENTRY_DRAFT',
      'SUBMIT_TIME_ENTRY',
      'RECALL_TIME_ENTRY',
      'APPROVE_TIME_ENTRY',
      'REJECT_TIME_ENTRY'
    ],
    icon: 'supervisor_account',
    color: '#9c27b0'
  },
  {
    id: 'time_admin',
    name: 'time_admin',
    displayName: 'Учет времени: Администратор',
    description: 'Полное управление системой учета времени',
    category: 'time',
    level: 'advanced',
    isSystem: true,
    dependencies: ['time_supervisor'],
    permissions: [
      'TRACK_TIME',
      'VIEW_ALL_TIME_ENTRIES',
      'EDIT_TIME_ENTRIES',
      'DELETE_TIME_ENTRIES',
      'APPROVE_TIME_ENTRY',
      'REJECT_TIME_ENTRY',
      'BULK_APPROVE_TIME'
    ],
    icon: 'admin_panel_settings',
    color: '#9c27b0',
    tags: ['administrative']
  },

  // === ПОЛЬЗОВАТЕЛИ ===
  {
    id: 'user_viewer',
    name: 'user_viewer',
    displayName: 'Просмотр пользователей',
    description: 'Просмотр списка пользователей',
    category: 'users',
    level: 'basic',
    isSystem: true,
    permissions: [
      'VIEW_ALL_USERS'
    ],
    icon: 'people',
    color: '#607d8b'
  },
  {
    id: 'user_manager',
    name: 'user_manager',
    displayName: 'Управление пользователями',
    description: 'Создание и редактирование пользователей',
    category: 'users',
    level: 'intermediate',
    isSystem: true,
    dependencies: ['user_viewer'],
    permissions: [
      'VIEW_ALL_USERS',
      'CREATE_USERS',
      'EDIT_USERS'
    ],
    icon: 'person_add',
    color: '#607d8b'
  },
  {
    id: 'user_admin',
    name: 'user_admin',
    displayName: 'Администрирование пользователей',
    description: 'Полное управление пользователями и ролями',
    category: 'users',
    level: 'advanced',
    isSystem: true,
    dependencies: ['user_manager'],
    permissions: [
      'VIEW_ALL_USERS',
      'CREATE_USERS',
      'EDIT_USERS',
      'DELETE_USERS',
      'CHANGE_USER_ROLES'
    ],
    icon: 'admin_panel_settings',
    color: '#607d8b',
    tags: ['administrative', 'sensitive']
  },

  // === RBAC УПРАВЛЕНИЕ ===
  {
    id: 'rbac_viewer',
    name: 'rbac_viewer',
    displayName: 'Просмотр RBAC',
    description: 'Просмотр ролей и разрешений',
    category: 'admin',
    level: 'intermediate',
    isSystem: true,
    permissions: [
      'VIEW_ROLES',
      'VIEW_USER_ROLES',
      'VIEW_GROUPS'
    ],
    icon: 'security',
    color: '#3f51b5'
  },
  {
    id: 'rbac_manager',
    name: 'rbac_manager',
    displayName: 'Управление RBAC',
    description: 'Управление ролями и группами',
    category: 'admin',
    level: 'advanced',
    isSystem: true,
    dependencies: ['rbac_viewer'],
    permissions: [
      'MANAGE_ROLES',
      'VIEW_ROLES',
      'CREATE_ROLES',
      'MANAGE_USERS',
      'VIEW_USER_ROLES',
      'ASSIGN_ROLES',
      'MANAGE_GROUPS',
      'VIEW_GROUPS',
      'CREATE_GROUPS'
    ],
    icon: 'admin_panel_settings',
    color: '#3f51b5',
    tags: ['administrative', 'security']
  },
  {
    id: 'rbac_admin',
    name: 'rbac_admin',
    displayName: 'RBAC Администратор',
    description: 'Полное управление системой RBAC',
    category: 'admin',
    level: 'expert',
    isSystem: true,
    dependencies: ['rbac_manager'],
    permissions: [
      'MANAGE_ROLES',
      'VIEW_ROLES',
      'CREATE_ROLES',
      'DELETE_ROLES',
      'MANAGE_USERS',
      'VIEW_USER_ROLES',
      'ASSIGN_ROLES',
      'MANAGE_GROUPS',
      'VIEW_GROUPS',
      'CREATE_GROUPS',
      'DELETE_GROUPS',
      'MANAGE_TEMPORARY_ROLES',
      'VIEW_TEMPORARY_ROLES',
      'CREATE_TEMPORARY_ROLES',
      'MANAGE_DELEGATIONS',
      'VIEW_DELEGATIONS',
      'CREATE_DELEGATIONS',
      'REVOKE_DELEGATIONS',
      'VIEW_USER_PERMISSIONS',
      'VIEW_RBAC_STATS',
      'VIEW_AUDIT_LOGS'
    ],
    icon: 'shield',
    color: '#3f51b5',
    tags: ['administrative', 'security', 'expert']
  },

  // === ERP и ОТЧЕТНОСТЬ ===
  {
    id: 'erp_basic',
    name: 'erp_basic',
    displayName: 'ERP: Базовый доступ',
    description: 'Базовый доступ к ERP функциям',
    category: 'reports',
    level: 'basic',
    isSystem: true,
    permissions: [
      'VIEW_ESTIMATE_TASKS',
      'VIEW_COGS_RECORDS'
    ],
    icon: 'business',
    color: '#795548'
  },
  {
    id: 'erp_manager',
    name: 'erp_manager',
    displayName: 'ERP: Управление',
    description: 'Управление ERP процессами и отчетами',
    category: 'reports',
    level: 'intermediate',
    isSystem: true,
    dependencies: ['erp_basic'],
    permissions: [
      'CREATE_ESTIMATE_TASKS',
      'EDIT_ESTIMATE_TASKS',
      'VIEW_ESTIMATE_TASKS',
      'MANAGE_INCLUDE_MODE',
      'VIEW_COGS_RECORDS',
      'MANAGE_COGS_RECORDS',
      'VIEW_COGS_REPORT',
      'VIEW_TIMESHEET_REPORT',
      'VIEW_VARIANCE_REPORT',
      'EXPORT_ERP_REPORTS'
    ],
    icon: 'analytics',
    color: '#795548'
  },

  // === СКЛАД ===
  {
    id: 'warehouse_worker',
    name: 'warehouse_worker',
    displayName: 'Складской работник',
    description: 'Базовые операции на складе',
    category: 'warehouse',
    level: 'basic',
    isSystem: true,
    permissions: [
      'VIEW_WAREHOUSE'
    ],
    icon: 'inventory',
    color: '#8bc34a'
  },
  {
    id: 'warehouse_manager',
    name: 'warehouse_manager',
    displayName: 'Управление складом',
    description: 'Управление товарами и запасами',
    category: 'warehouse',
    level: 'intermediate',
    isSystem: true,
    dependencies: ['warehouse_worker'],
    permissions: [
      'VIEW_WAREHOUSE',
      'MANAGE_WAREHOUSE',
      'CREATE_PRODUCTS',
      'EDIT_PRODUCTS',
      'MANAGE_STOCK'
    ],
    icon: 'store',
    color: '#8bc34a'
  },
  {
    id: 'warehouse_admin',
    name: 'warehouse_admin',
    displayName: 'Администратор склада',
    description: 'Полное управление складской системой',
    category: 'warehouse',
    level: 'advanced',
    isSystem: true,
    dependencies: ['warehouse_manager'],
    permissions: [
      'VIEW_WAREHOUSE',
      'MANAGE_WAREHOUSE',
      'CREATE_PRODUCTS',
      'EDIT_PRODUCTS',
      'DELETE_PRODUCTS',
      'MANAGE_STOCK'
    ],
    icon: 'admin_panel_settings',
    color: '#8bc34a',
    tags: ['administrative']
  },

  // === СИСТЕМНЫЕ ===
  {
    id: 'developer_tools',
    name: 'developer_tools',
    displayName: 'Инструменты разработчика',
    description: 'Доступ к инструментам разработки',
    category: 'system',
    level: 'expert',
    isSystem: true,
    permissions: [
      'ACCESS_DEV_TOOLS',
      'RUN_TESTS'
    ],
    icon: 'code',
    color: '#f44336',
    tags: ['development', 'expert']
  }
];

/**
 * Утилиты для работы с наборами разрешений
 */
export class PermissionSetService {
  
  /**
   * Получение всех системных наборов разрешений
   */
  static getSystemPermissionSets(): PermissionSet[] {
    return systemPermissionSets;
  }

  /**
   * Получение наборов по категории
   */
  static getPermissionSetsByCategory(category: PermissionCategory): PermissionSet[] {
    return systemPermissionSets.filter(set => set.category === category);
  }

  /**
   * Получение наборов по уровню
   */
  static getPermissionSetsByLevel(level: PermissionSet['level']): PermissionSet[] {
    return systemPermissionSets.filter(set => set.level === level);
  }

  /**
   * Поиск наборов по тегам
   */
  static getPermissionSetsByTag(tag: string): PermissionSet[] {
    return systemPermissionSets.filter(set => set.tags?.includes(tag));
  }

  /**
   * Получение набора по ID
   */
  static getPermissionSetById(id: string): PermissionSet | undefined {
    return systemPermissionSets.find(set => set.id === id);
  }

  /**
   * Разрешение зависимостей наборов разрешений
   * Возвращает все разрешения с учетом зависимостей
   */
  static resolvePermissionSets(setIds: string[]): Permission[] {
    const resolvedSets = new Set<string>();
    const allPermissions = new Set<Permission>();

    const resolveSet = (setId: string) => {
      if (resolvedSets.has(setId)) return;
      
      const permissionSet = this.getPermissionSetById(setId);
      if (!permissionSet) return;

      // Сначала разрешаем зависимости
      if (permissionSet.dependencies) {
        for (const depId of permissionSet.dependencies) {
          resolveSet(depId);
        }
      }

      // Добавляем разрешения этого набора
      for (const permission of permissionSet.permissions) {
        allPermissions.add(permission);
      }

      resolvedSets.add(setId);
    };

    // Разрешаем все наборы
    for (const setId of setIds) {
      resolveSet(setId);
    }

    return Array.from(allPermissions);
  }

  /**
   * Получение рекомендуемых наборов для роли
   */
  static getRecommendedSetsForRole(roleType: string): PermissionSet[] {
    const recommendations: { [key: string]: string[] } = {
      'field': ['time_tracker', 'task_worker'],
      'employee': ['time_tracker', 'task_worker', 'project_viewer'],
      'contractor': ['time_tracker', 'task_worker'],
      'estimator': ['estimate_creator', 'erp_basic', 'time_tracker'],
      'pm': ['project_manager', 'task_manager', 'time_supervisor', 'estimate_approver'],
      'manager': ['project_admin', 'task_admin', 'user_manager', 'time_admin'],
      'accountant': ['finance_manager', 'time_admin', 'erp_manager'],
      'owner': ['rbac_admin', 'user_admin', 'project_admin', 'finance_manager']
    };

    const setIds = recommendations[roleType] || [];
    return setIds.map(id => this.getPermissionSetById(id)).filter(Boolean) as PermissionSet[];
  }

  /**
   * Валидация набора разрешений
   */
  static validatePermissionSet(permissionSet: Partial<PermissionSet>): string[] {
    const errors: string[] = [];

    if (!permissionSet.name) {
      errors.push('Название набора обязательно');
    }

    if (!permissionSet.displayName) {
      errors.push('Отображаемое название обязательно');
    }

    if (!permissionSet.permissions || permissionSet.permissions.length === 0) {
      errors.push('Набор должен содержать хотя бы одно разрешение');
    }

    if (!permissionSet.category) {
      errors.push('Категория обязательна');
    }

    if (!permissionSet.level) {
      errors.push('Уровень сложности обязателен');
    }

    // Проверка зависимостей
    if (permissionSet.dependencies) {
      for (const depId of permissionSet.dependencies) {
        if (!this.getPermissionSetById(depId)) {
          errors.push(`Зависимость "${depId}" не найдена`);
        }
      }
    }

    return errors;
  }

  /**
   * Получение иерархии зависимостей
   */
  static getDependencyHierarchy(setId: string): string[] {
    const hierarchy: string[] = [];
    const visited = new Set<string>();

    const buildHierarchy = (currentId: string, depth: number = 0) => {
      if (visited.has(currentId) || depth > 10) return; // Защита от циклов

      visited.add(currentId);
      hierarchy.push(currentId);

      const set = this.getPermissionSetById(currentId);
      if (set?.dependencies) {
        for (const depId of set.dependencies) {
          buildHierarchy(depId, depth + 1);
        }
      }
    };

    buildHierarchy(setId);
    return hierarchy.reverse(); // От базовых к производным
  }

  /**
   * Проверка на циклические зависимости
   */
  static hasCircularDependency(setId: string, dependencyId: string): boolean {
    const visited = new Set<string>();
    
    const checkCircular = (currentId: string): boolean => {
      if (currentId === setId) return true;
      if (visited.has(currentId)) return false;

      visited.add(currentId);
      const set = this.getPermissionSetById(currentId);
      
      if (set?.dependencies) {
        for (const depId of set.dependencies) {
          if (checkCircular(depId)) return true;
        }
      }

      return false;
    };

    return checkCircular(dependencyId);
  }

  /**
   * Группировка наборов по категориям для UI
   */
  static getPermissionSetsGrouped(): { [category: string]: PermissionSet[] } {
    const grouped: { [category: string]: PermissionSet[] } = {};
    
    for (const set of systemPermissionSets) {
      if (!grouped[set.category]) {
        grouped[set.category] = [];
      }
      grouped[set.category].push(set);
    }

    // Сортируем по уровню внутри каждой категории
    for (const category in grouped) {
      grouped[category].sort((a, b) => {
        const levelOrder = { 'basic': 0, 'intermediate': 1, 'advanced': 2, 'expert': 3 };
        return levelOrder[a.level] - levelOrder[b.level];
      });
    }

    return grouped;
  }
}

export default PermissionSetService;
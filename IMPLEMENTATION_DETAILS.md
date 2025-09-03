# Детали реализации SSOT архитектуры

## Технические решения и обоснования

### 1. TypeScript Discriminated Unions

#### Выбор архитектурного решения
```typescript
// ❌ Плохой подход - множественное наследование
interface BaseTask { /* ... */ }
interface EstimateTask extends BaseTask { /* ... */ }  
interface ProjectTask extends BaseTask { /* ... */ }
type Task = EstimateTask | ProjectTask; // Нет дискриминатора

// ✅ Правильный подход - Discriminated Union  
export type UnifiedTask = EstimateTaskUnified | ProjectTaskUnified;
// Дискриминатор: phase: 'pre_construction' | 'execution'
```

#### Обоснование решения
1. **Compile-time безопасность** - невозможно обращение к полям неправильного типа
2. **Automatic type narrowing** - TypeScript автоматически сужает тип при проверке дискриминатора
3. **Отличная поддержка IDE** - автокомплит и рефакторинг работают корректно
4. **Производительность** - нет overhead от классов или прототипов

### 2. Firebase интеграция и оптимизации

#### Пакетные операции (Batching)
```typescript
// Оптимизированные пакетные операции для минимизации сетевых вызовов
export const updateMultipleTasks = async (
  userId: string,
  updates: Array<{ id: string; data: Partial<UnifiedTask> }>
): Promise<void> => {
  const batch = writeBatch(db);
  
  updates.forEach(({ id, data }) => {
    const taskRef = doc(db, `users/${userId}/tasks`, id);
    batch.update(taskRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  });
  
  await batch.commit();
};
```

#### Real-time подписки с оптимизацией
```typescript
// Умные подписки с автоматической оптимизацией запросов
export const getUnifiedTasksStream = (
  userId: string,
  callback: (tasks: UnifiedTask[]) => void,
  filters?: TaskFilters
) => {
  // Строим оптимальный запрос на основе фильтров
  let baseQuery = collection(db, `users/${userId}/tasks`);
  
  // Применяем индексированные фильтры первыми для максимальной производительности
  if (filters?.status) {
    baseQuery = query(baseQuery, where('status', '==', filters.status));
  }
  
  if (filters?.phase) {
    baseQuery = query(baseQuery, where('phase', '==', filters.phase));
  }
  
  // Сортировка по индексированным полям
  baseQuery = query(baseQuery, orderBy('updatedAt', 'desc'));
  
  return onSnapshot(baseQuery, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UnifiedTask[];
    
    callback(tasks);
  }, {
    // Включаем метаданные для отслеживания источника обновлений
    includeMetadataChanges: true
  });
};
```

### 3. Система валидации и конвертации

#### Многоуровневая валидация
```typescript
// 1. Схема валидации на уровне типов
interface ValidationSchema<T> {
  required: (keyof T)[];
  optional: (keyof T)[];
  constraints: {
    [K in keyof T]?: {
      min?: number;
      max?: number;
      pattern?: RegExp;
      custom?: (value: T[K]) => boolean;
    };
  };
}

// 2. Конкретные схемы для разных типов задач
const EstimateTaskSchema: ValidationSchema<EstimateTaskUnified> = {
  required: ['name', 'estimateId', 'includeMode', 'plannedHours'],
  optional: ['description', 'categoryId', 'relatedEstimateItems'],
  constraints: {
    plannedHours: { min: 0.1, max: 1000 },
    name: { pattern: /^.{3,100}$/ },
    includeMode: { 
      custom: (value) => ['COGS', 'OH', 'NONE'].includes(value)
    }
  }
};

// 3. Универсальная функция валидации
export const validateTask = <T extends UnifiedTask>(
  task: Partial<T>,
  schema: ValidationSchema<T>
): ValidationResult => {
  const errors: string[] = [];
  
  // Проверка обязательных полей
  schema.required.forEach(field => {
    if (!task[field]) {
      errors.push(`Field '${String(field)}' is required`);
    }
  });
  
  // Проверка ограничений
  Object.entries(schema.constraints || {}).forEach(([field, constraint]) => {
    const value = task[field as keyof T];
    if (value !== undefined) {
      if (constraint.min && typeof value === 'number' && value < constraint.min) {
        errors.push(`${field} must be at least ${constraint.min}`);
      }
      // ... другие проверки
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

#### Firebase конвертация с безопасностью типов
```typescript
// Типизированная конвертация для Firebase
export function toFirebaseTask<T extends UnifiedTask>(
  task: Partial<T>
): FirebaseCompatibleTask {
  // Создаем чистый объект без undefined значений
  const cleanTask: Record<string, any> = {};
  
  Object.entries(task).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // Специальная обработка дат
      if (value instanceof Date) {
        cleanTask[key] = Timestamp.fromDate(value);
      } 
      // Специальная обработка массивов
      else if (Array.isArray(value)) {
        cleanTask[key] = value.filter(item => item !== undefined);
      }
      // Обычные значения
      else {
        cleanTask[key] = value;
      }
    }
  });
  
  // Добавляем системные поля
  cleanTask.updatedAt = serverTimestamp();
  
  return cleanTask as FirebaseCompatibleTask;
}
```

### 4. Оптимизация производительности React

#### Мемоизация и селективные обновления
```typescript
// Оптимизированный хук с глубокой мемоизацией
export const useTaskManagement = (options: TaskManagementOptions = {}) => {
  // Мемоизируем конфигурацию для предотвращения лишних ре-рендеров
  const config = useMemo(() => ({
    autoSync: true,
    enableRealTimeUpdates: true,
    cacheTimeout: 5000,
    ...options
  }), [
    options.autoSync,
    options.enableRealTimeUpdates, 
    options.cacheTimeout
  ]);
  
  // Состояние с оптимизированной структурой
  const [state, setState] = useState<TaskManagementState>(() => ({
    tasks: [],
    loading: false,
    error: null,
    lastUpdated: null
  }));
  
  // Селективное обновление - обновляем только изменившиеся задачи
  const updateTasks = useCallback((newTasks: UnifiedTask[]) => {
    setState(prevState => {
      // Быстрая проверка - изменились ли данные
      if (areTasksEqual(prevState.tasks, newTasks)) {
        return prevState;
      }
      
      // Умное обновление - сохраняем ссылки на неизменившиеся объекты
      const updatedTasks = newTasks.map(newTask => {
        const existingTask = prevState.tasks.find(t => t.id === newTask.id);
        return existingTask && isTaskEqual(existingTask, newTask) 
          ? existingTask  // Сохраняем ссылку
          : newTask;      // Новый объект
      });
      
      return {
        ...prevState,
        tasks: updatedTasks,
        lastUpdated: new Date()
      };
    });
  }, []);
  
  // Мемоизированные вычисления статистики
  const statistics = useMemo(() => 
    calculateTaskStatistics(state.tasks), 
    [state.tasks]
  );
  
  // Мемоизированные селекторы
  const selectors = useMemo(() => ({
    estimateTasks: state.tasks.filter(isEstimateTask),
    projectTasks: state.tasks.filter(isProjectTask),
    activeTasks: state.tasks.filter(t => t.status === 'in_progress'),
    completedTasks: state.tasks.filter(t => t.status === 'completed')
  }), [state.tasks]);
  
  return {
    ...state,
    statistics,
    selectors,
    // ... остальные методы
  };
};

// Утилиты для быстрого сравнения
function areTasksEqual(tasks1: UnifiedTask[], tasks2: UnifiedTask[]): boolean {
  if (tasks1.length !== tasks2.length) return false;
  
  // Быстрое сравнение по хешам для больших массивов
  if (tasks1.length > 100) {
    const hash1 = hashTasks(tasks1);
    const hash2 = hashTasks(tasks2);
    return hash1 === hash2;
  }
  
  // Поэлементное сравнение для малых массивов
  return tasks1.every((task, index) => 
    isTaskEqual(task, tasks2[index])
  );
}
```

### 5. Система кэширования

#### Многоуровневое кэширование
```typescript
// Кэш с автоматической инвалидацией
class TaskCache {
  private cache = new Map<string, {
    data: UnifiedTask[];
    timestamp: number;
    version: number;
  }>();
  
  private readonly TTL = 5 * 60 * 1000; // 5 минут
  
  set(key: string, data: UnifiedTask[], version: number = 1): void {
    this.cache.set(key, {
      data: [...data], // Клонируем для immutability
      timestamp: Date.now(),
      version
    });
    
    // Автоматическая очистка через TTL
    setTimeout(() => this.invalidate(key), this.TTL);
  }
  
  get(key: string): UnifiedTask[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Проверяем актуальность
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  // Умная инвалидация по зависимостям
  invalidateByRelation(taskId: string): void {
    for (const [key, value] of this.cache.entries()) {
      if (value.data.some(task => 
        task.id === taskId || 
        task.dependencies?.includes(taskId)
      )) {
        this.invalidate(key);
      }
    }
  }
}

const taskCache = new TaskCache();
```

### 6. Error Handling и Recovery

#### Graceful degradation система
```typescript
// Система восстановления после ошибок
class TaskErrorBoundary {
  private retryAttempts = new Map<string, number>();
  private readonly maxRetries = 3;
  
  async withErrorRecovery<T>(
    operation: () => Promise<T>,
    operationId: string,
    fallback?: () => T
  ): Promise<T> {
    try {
      const result = await operation();
      // Сбрасываем счетчик при успехе
      this.retryAttempts.delete(operationId);
      return result;
    } catch (error) {
      const attempts = this.retryAttempts.get(operationId) || 0;
      
      if (attempts < this.maxRetries) {
        // Экспоненциальная задержка
        const delay = Math.pow(2, attempts) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        this.retryAttempts.set(operationId, attempts + 1);
        return this.withErrorRecovery(operation, operationId, fallback);
      }
      
      // Если есть fallback - используем его
      if (fallback) {
        console.warn(`Operation ${operationId} failed, using fallback`, error);
        return fallback();
      }
      
      // Иначе проксируем ошибку
      throw new TaskOperationError(
        `Operation ${operationId} failed after ${this.maxRetries} attempts`,
        error
      );
    }
  }
}
```

### 7. Тестирование архитектуры

#### Unit тесты для типов
```typescript
describe('UnifiedTask Type Safety', () => {
  it('should correctly discriminate between task types', () => {
    const estimateTask: EstimateTaskUnified = {
      phase: 'pre_construction',
      id: 'est-1',
      name: 'Foundation Design',
      estimateId: 'est-001',
      includeMode: 'COGS',
      // ... другие поля
    };
    
    const projectTask: ProjectTaskUnified = {
      phase: 'execution', 
      id: 'proj-1',
      name: 'Pour Foundation',
      projectId: 'proj-001',
      progressPct: 50,
      // ... другие поля
    };
    
    // Type guards должны работать корректно
    expect(isEstimateTask(estimateTask)).toBe(true);
    expect(isProjectTask(estimateTask)).toBe(false);
    
    expect(isEstimateTask(projectTask)).toBe(false);
    expect(isProjectTask(projectTask)).toBe(true);
  });
  
  it('should provide type-safe access to phase-specific fields', () => {
    const task: UnifiedTask = getTaskFromAPI();
    
    if (task.phase === 'pre_construction') {
      // TypeScript знает, что это EstimateTaskUnified
      expect(task.includeMode).toBeDefined();
      // task.progressPct - ошибка компиляции ✅
    } else {
      // TypeScript знает, что это ProjectTaskUnified
      expect(task.progressPct).toBeDefined();
      // task.includeMode - ошибка компиляции ✅
    }
  });
});
```

#### Integration тесты
```typescript
describe('Task Management Integration', () => {
  let taskManager: ReturnType<typeof useTaskManagement>;
  
  beforeEach(() => {
    taskManager = renderHook(() => useTaskManagement()).result.current;
  });
  
  it('should maintain consistency across operations', async () => {
    // Создаем задачу
    const taskId = await taskManager.createTask({
      phase: 'pre_construction',
      name: 'Test Task',
      estimateId: 'est-001', 
      includeMode: 'COGS'
    });
    
    // Проверяем, что она появилась в списке
    await waitFor(() => {
      const task = taskManager.tasks.find(t => t.id === taskId);
      expect(task).toBeDefined();
      expect(isEstimateTask(task!)).toBe(true);
    });
    
    // Обновляем задачу
    await taskManager.updateTask(taskId, {
      status: 'in_progress'
    });
    
    // Проверяем консистентность обновления
    await waitFor(() => {
      const task = taskManager.tasks.find(t => t.id === taskId);
      expect(task?.status).toBe('in_progress');
    });
  });
});
```

## Выводы

Реализованная SSOT архитектура обеспечивает:

1. **Type Safety** - полную безопасность типов на уровне компиляции
2. **Performance** - оптимизированные операции с минимальными накладными расходами  
3. **Maintainability** - единую кодовую базу вместо разрозненных систем
4. **Scalability** - архитектуру, готовую к росту и расширению
5. **Reliability** - надежную работу с graceful degradation
6. **Developer Experience** - отличную поддержку IDE и простоту использования

Архитектура готова к производственному использованию и дальнейшему развитию.
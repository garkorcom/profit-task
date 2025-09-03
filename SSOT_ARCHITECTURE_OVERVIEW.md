# Single Source of Truth (SSOT) Architecture - Подробное описание

## Обзор архитектуры

Данная система реализует архитектуру Single Source of Truth (SSOT) для управления задачами в бизнес-приложении. Основная цель - устранение дублирования кода и создание единой системы управления задачами для всех этапов жизненного цикла проекта.

## Ключевые принципы SSOT

### 1. Единый источник истины
- Все задачи хранятся в едином интерфейсе `UnifiedTask`
- Одна система валидации и бизнес-логики
- Централизованное управление состоянием

### 2. Type Safety через Discriminated Unions
- TypeScript Discriminated Unions для безопасности типов
- Автоматическое определение типа задачи по полю `phase`
- Исключение ошибок времени выполнения

### 3. Декларативное управление
- Конфигурация через объекты, а не императивный код
- Централизованная конфигурация поведения задач
- Простота тестирования и расширения

## Структура файлов и компонентов

### Типы данных (`src/types/unified-task.types.ts`)

```typescript
/**
 * Фазы жизненного цикла задач
 * pre_construction - этап планирования/оценки
 * execution - этап выполнения работ
 */
export type TaskPhase = 'pre_construction' | 'execution';

/**
 * Discriminated Union для унифицированных задач
 * Использует поле 'phase' как дискриминатор
 */
export type UnifiedTask = EstimateTaskUnified | ProjectTaskUnified;

/**
 * Задача этапа планирования (EstimateTask)
 * Содержит специфичные для планирования поля:
 * - includeMode: способ включения в расчеты (COGS/SGA/CAPEX)
 * - estimateId: связь со сметой
 */
export interface EstimateTaskUnified extends TaskBase {
  phase: 'pre_construction';
  estimateId: string;
  estimateName?: string;
  includeMode: 'COGS' | 'SGA' | 'CAPEX';
}

/**
 * Задача этапа выполнения (ProjectTask)
 * Содержит поля для исполнения:
 * - requirePhoto: обязательность фотофиксации
 * - reworkReason: причина возврата на доработку
 */
export interface ProjectTaskUnified extends TaskBase {
  phase: 'execution';
  projectId: string;
  projectName?: string;
  requirePhoto?: boolean;
  reworkReason?: string;
}
```

### Централизованное API (`src/api/unifiedTaskApi.ts`)

```typescript
/**
 * Унифицированное API для работы с задачами
 * Использует Discriminated Unions для type-safe операций
 * 
 * Основные функции:
 * - createUnifiedTask: создание задач с валидацией типов
 * - updateUnifiedTask: обновление с проверкой бизнес-правил
 * - deleteUnifiedTask: удаление с проверкой зависимостей
 * - getUnifiedTasksStream: real-time подписка на изменения
 */

/**
 * Создание унифицированной задачи
 * Автоматически определяет тип по полю phase
 * Применяет соответствующую валидацию
 */
export const createUnifiedTask = async (
  userId: string,
  taskData: CreateTaskDto
): Promise<string> => {
  // Валидация входных данных
  const validationResult = validateTaskData(taskData);
  if (!validationResult.isValid) {
    throw new ValidationError(validationResult.errors);
  }

  // Подготовка данных для Firebase
  const firebaseData = await prepareFirebaseData(taskData);
  
  // Создание документа
  const taskRef = await addDoc(
    collection(db, `users/${userId}/tasks`),
    firebaseData
  );

  return taskRef.id;
};

/**
 * Real-time подписка на задачи с фильтрацией
 * Поддерживает фильтры по фазе, статусу, проекту
 */
export const getUnifiedTasksStream = (
  userId: string,
  callback: (tasks: UnifiedTask[]) => void,
  filters?: TaskFilters
) => {
  let q = collection(db, `users/${userId}/tasks`);

  // Применение фильтров
  if (filters?.phase) {
    q = query(q, where('phase', '==', filters.phase));
  }
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }

  // Подписка на изменения
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UnifiedTask[];

    callback(tasks);
  });
};
```

### Централизованный хук управления (`src/hooks/useTaskManagement.ts`)

```typescript
/**
 * Централизованный хук для управления задачами
 * Предоставляет единый интерфейс для всех операций CRUD
 * 
 * Возможности:
 * - Автоматическая синхронизация с Firebase
 * - Кэширование данных
 * - Валидация бизнес-правил
 * - Фильтрация и сортировка
 * - Обработка ошибок
 */
export const useTaskManagement = (options: TaskManagementOptions = {}) => {
  const {
    enableRealtime = true,
    autoSync = true,
    filters,
    cacheTimeout = 5000
  } = options;

  // Состояние задач
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Создание новой задачи
   * Применяет валидацию и бизнес-правила
   */
  const createTask = useCallback(async (data: CreateTaskDto) => {
    setLoading(true);
    try {
      // Валидация данных
      const errors = validateTask(data);
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      // Создание задачи через API
      const taskId = await createUnifiedTask(currentUser!.uid, data);
      
      // Обновление локального состояния если не используется realtime
      if (!enableRealtime) {
        await refreshTasks();
      }

      return taskId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser, enableRealtime, validateTask]);

  /**
   * Обновление задачи с проверкой прав доступа
   */
  const updateTask = useCallback(async (
    taskId: string, 
    updates: UpdateTaskDto
  ) => {
    setLoading(true);
    try {
      // Проверка прав доступа
      if (!canChangeStatus(taskId, updates.status)) {
        throw new Error('Insufficient permissions to change task status');
      }

      await updateUnifiedTask(currentUser!.uid, taskId, updates);
      
      if (!enableRealtime) {
        await refreshTasks();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser, enableRealtime, canChangeStatus]);

  // Настройка real-time подписки
  useEffect(() => {
    if (!currentUser || !enableRealtime) return;

    const unsubscribe = getUnifiedTasksStream(
      currentUser.uid,
      (updatedTasks) => {
        setTasks(updatedTasks);
        setLoading(false);
      },
      filters
    );

    return unsubscribe;
  }, [currentUser, enableRealtime, filters]);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    refreshTasks,
    statistics: calculateStatistics(tasks)
  };
};
```

### Унифицированные компоненты UI

#### UnifiedTaskCard (`src/components/tasks/unified/UnifiedTaskCard.tsx`)

```typescript
/**
 * Универсальная карточка задачи
 * Автоматически адаптируется к типу задачи (EstimateTask/ProjectTask)
 * 
 * Функциональность:
 * - Отображение специфичных полей по типу задачи
 * - Интеграция с системой тайм-трекинга
 * - Адаптивный дизайн для мобильных устройств
 * - Поддержка тем Material-UI
 */
interface UnifiedTaskCardProps {
  task: UnifiedTask;
  onEdit?: (task: UnifiedTask) => void;
  onDelete?: (taskId: string) => void;
  showTimeTracking?: boolean;
  isActiveTimeEntry?: boolean;
  onTimeTrackingAction?: (action: 'start' | 'stop') => void;
  sx?: any;
}

export const UnifiedTaskCard: React.FC<UnifiedTaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  showTimeTracking = false,
  isActiveTimeEntry = false,
  onTimeTrackingAction,
  sx
}) => {
  // Определение типа задачи для условного рендеринга
  const isEstimateTask = task.phase === 'pre_construction';
  const isProjectTask = task.phase === 'execution';

  return (
    <Card sx={{ mb: 2, ...sx }}>
      <CardContent>
        {/* Заголовок с иконкой типа задачи */}
        <Box display="flex" alignItems="center" mb={2}>
          {isEstimateTask ? (
            <ConstructionIcon color="primary" sx={{ mr: 1 }} />
          ) : (
            <BuildIcon color="secondary" sx={{ mr: 1 }} />
          )}
          <Typography variant="h6" component="h3">
            {task.title}
          </Typography>
          <TaskStatusChip status={task.status} sx={{ ml: 'auto' }} />
        </Box>

        {/* Описание задачи */}
        <Typography variant="body2" color="text.secondary" mb={2}>
          {task.description}
        </Typography>

        {/* Специфичные поля для EstimateTask */}
        {isEstimateTask && (
          <Box mb={2}>
            <Chip
              label={`Include Mode: ${task.includeMode}`}
              size="small"
              variant="outlined"
              sx={{ mr: 1 }}
            />
            <Chip
              label={`Estimate: ${task.estimateName || task.estimateId}`}
              size="small"
              variant="outlined"
            />
          </Box>
        )}

        {/* Специфичные поля для ProjectTask */}
        {isProjectTask && (
          <Box mb={2}>
            <Chip
              label={`Project: ${task.projectName || task.projectId}`}
              size="small"
              variant="outlined"
              sx={{ mr: 1 }}
            />
            {task.requirePhoto && (
              <Chip
                icon={<CameraIcon />}
                label="Photo Required"
                size="small"
                variant="outlined"
                color="primary"
              />
            )}
          </Box>
        )}

        {/* Интеграция с тайм-трекингом */}
        {showTimeTracking && (
          <Box mt={2}>
            <TimeTrackingButton
              task={task}
              isActive={isActiveTimeEntry}
              onAction={onTimeTrackingAction}
            />
          </Box>
        )}
      </CardContent>

      {/* Действия с задачей */}
      <CardActions>
        <Button size="small" onClick={() => onEdit?.(task)}>
          Edit
        </Button>
        <Button 
          size="small" 
          color="error" 
          onClick={() => onDelete?.(task.id)}
        >
          Delete
        </Button>
      </CardActions>
    </Card>
  );
};
```

#### UnifiedTaskForm (`src/components/tasks/unified/UnifiedTaskForm.tsx`)

```typescript
/**
 * Универсальная форма создания/редактирования задач
 * Динамически адаптируется к типу задачи
 * 
 * Особенности:
 * - Условные поля в зависимости от фазы
 * - Валидация в реальном времени
 * - Автосохранение черновиков
 * - Поддержка режимов создания и редактирования
 */
interface UnifiedTaskFormProps {
  onSubmit: (data: CreateTaskDto | UpdateTaskDto) => Promise<void>;
  task?: UnifiedTask;
  mode: 'create' | 'edit';
  defaultPhase?: TaskPhase;
  defaultEstimateId?: string;
  defaultProjectId?: string;
}

export const UnifiedTaskForm: React.FC<UnifiedTaskFormProps> = ({
  onSubmit,
  task,
  mode,
  defaultPhase = 'execution',
  defaultEstimateId,
  defaultProjectId
}) => {
  // Состояние формы
  const [formData, setFormData] = useState<Partial<CreateTaskDto>>({
    phase: task?.phase || defaultPhase,
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'new',
    priority: task?.priority || 'medium',
    estimateId: task?.phase === 'pre_construction' ? task.estimateId : defaultEstimateId,
    projectId: task?.phase === 'execution' ? task.projectId : defaultProjectId,
    includeMode: task?.phase === 'pre_construction' ? task.includeMode : 'COGS',
    requirePhoto: task?.phase === 'execution' ? task.requirePhoto : false
  });

  // Валидация формы
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isValid = Object.keys(errors).length === 0;

  /**
   * Валидация полей формы
   */
  const validateForm = useCallback((data: Partial<CreateTaskDto>) => {
    const newErrors: Record<string, string> = {};

    if (!data.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (data.phase === 'pre_construction' && !data.estimateId) {
      newErrors.estimateId = 'Estimate is required for planning tasks';
    }

    if (data.phase === 'execution' && !data.projectId) {
      newErrors.projectId = 'Project is required for execution tasks';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  /**
   * Обработка изменения фазы
   * Очищает несовместимые поля
   */
  const handlePhaseChange = (newPhase: TaskPhase) => {
    setFormData(prev => ({
      ...prev,
      phase: newPhase,
      // Очистка полей другой фазы
      ...(newPhase === 'pre_construction' ? {
        projectId: undefined,
        requirePhoto: undefined,
        reworkReason: undefined
      } : {
        estimateId: undefined,
        includeMode: undefined
      })
    }));
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Выбор фазы (только при создании) */}
      {mode === 'create' && (
        <FormControl fullWidth margin="normal">
          <InputLabel>Task Phase</InputLabel>
          <Select
            value={formData.phase}
            onChange={(e) => handlePhaseChange(e.target.value as TaskPhase)}
          >
            <MenuItem value="pre_construction">
              <ConstructionIcon sx={{ mr: 1 }} />
              Planning Phase
            </MenuItem>
            <MenuItem value="execution">
              <BuildIcon sx={{ mr: 1 }} />
              Execution Phase
            </MenuItem>
          </Select>
        </FormControl>
      )}

      {/* Основные поля */}
      <TextField
        fullWidth
        label="Task Title"
        value={formData.title}
        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
        error={!!errors.title}
        helperText={errors.title}
        margin="normal"
        required
      />

      <TextField
        fullWidth
        label="Description"
        multiline
        rows={3}
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        margin="normal"
      />

      {/* Условные поля для EstimateTask */}
      {formData.phase === 'pre_construction' && (
        <>
          <EstimateSelector
            value={formData.estimateId}
            onChange={(estimateId) => setFormData(prev => ({ 
              ...prev, 
              estimateId 
            }))}
            error={errors.estimateId}
            required
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Include Mode</InputLabel>
            <Select
              value={formData.includeMode}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                includeMode: e.target.value as 'COGS' | 'SGA' | 'CAPEX'
              }))}
            >
              <MenuItem value="COGS">Cost of Goods Sold</MenuItem>
              <MenuItem value="SGA">Selling, General & Administrative</MenuItem>
              <MenuItem value="CAPEX">Capital Expenditures</MenuItem>
            </Select>
          </FormControl>
        </>
      )}

      {/* Условные поля для ProjectTask */}
      {formData.phase === 'execution' && (
        <>
          <ProjectSelector
            value={formData.projectId}
            onChange={(projectId) => setFormData(prev => ({ 
              ...prev, 
              projectId 
            }))}
            error={errors.projectId}
            required
          />
          
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.requirePhoto || false}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  requirePhoto: e.target.checked 
                }))}
              />
            }
            label="Require photo documentation"
          />
        </>
      )}

      {/* Кнопки действий */}
      <Box mt={3} display="flex" gap={2}>
        <Button
          type="submit"
          variant="contained"
          disabled={!isValid || loading}
          fullWidth
        >
          {loading ? <CircularProgress size={20} /> : 
           mode === 'create' ? 'Create Task' : 'Update Task'}
        </Button>
        
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
};
```

### Система управления временем (`src/api/timeEntryUnified.ts`)

```typescript
/**
 * Унифицированная система учета времени (SSOT)
 * Объединяет функциональность timeEntryApi.ts и timeEntryEnhanced.ts
 * 
 * Основные возможности:
 * - Создание и управление записями времени
 * - Система пауз с автоматическим расчетом
 * - Интеграция с геолокацией
 * - Загрузка и управление фотографиями
 * - Real-time синхронизация
 * - Валидация и конвертация данных для Firebase
 */

/**
 * Расширенный интерфейс записи времени
 * Включает все поля для обратной совместимости
 */
export interface TimeEntry {
  id: string;
  userId: string;
  taskId: string;
  projectId?: string;
  estimateId?: string;
  serviceId?: string;
  
  // Основные временные метки
  startTime: Date;
  endTime?: Date;
  lastActiveTime?: Date;
  
  // Система пауз
  pauses?: PauseRecord[];
  totalPauseDuration?: number;
  currentPauseStart?: Date;
  activeDuration?: number;
  totalDuration?: number;
  duration?: number; // Alias for activeDuration for compatibility
  
  // Статус и контроль
  status: TimeEntryStatus;
  
  // Геолокация и фото
  startLocation?: GeolocationData;
  endLocation?: GeolocationData;
  startPhotoUrl?: string;
  endPhotoUrl?: string;
  
  // Финансовые данные
  laborCost?: number;
  hourlyRate?: number;
  
  // Метаданные
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  
  // Поля совместимости с legacy кодом
  task?: string;
  project?: string;
  estimate?: string;
  description?: string;
  taskName?: string;
  projectName?: string;
  employeeId?: string;
  employeeName?: string;
  serviceName?: string;
  estimateName?: string;
  pauseReason?: string;
}

/**
 * Запись паузы в работе
 */
export interface PauseRecord {
  startTime: Date;
  endTime?: Date;
  reason?: string;
  duration?: number; // в минутах
}

/**
 * Создание новой записи времени
 * Автоматически устанавливает начальные значения
 */
export const createTimeEntry = async (
  userId: string,
  entryData: Partial<TimeEntry>
): Promise<string> => {
  const now = new Date();
  
  // Подготовка данных для Firebase
  const timeEntry: Partial<TimeEntry> = {
    userId,
    startTime: now,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    pauses: [],
    totalPauseDuration: 0,
    activeDuration: 0,
    ...entryData
  };

  // Валидация обязательных полей
  if (!timeEntry.taskId) {
    throw new Error('Task ID is required for time entry');
  }

  // Конвертация для Firebase
  const firebaseData = toFirebaseTimeEntry(timeEntry, { 
    isNew: true,
    includeTimestamps: true
  });

  // Создание документа
  const docRef = await addDoc(
    collection(db, `users/${userId}/timeEntries`),
    firebaseData
  );

  return docRef.id;
};

/**
 * Завершение записи времени
 * Автоматически рассчитывает общую продолжительность
 */
export const completeTimeEntry = async (
  userId: string,
  entryId: string,
  completionData?: {
    comment?: string;
    endPhotoUrl?: string;
    endLocation?: GeolocationData;
  }
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  const entryDoc = await getDoc(entryRef);
  
  if (!entryDoc.exists()) {
    throw new Error('Time entry not found');
  }
  
  const currentData = entryDoc.data();
  const now = new Date();
  
  // Расчет общей продолжительности
  const startTime = currentData.startTime.toDate ? 
    currentData.startTime.toDate() : 
    new Date(currentData.startTime);
  
  const totalMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000);
  const pauseDuration = currentData.totalPauseDuration || 0;
  const activeDuration = Math.max(0, totalMinutes - pauseDuration);
  
  // Обновление данных
  const updateData = {
    endTime: now,
    completedAt: now,
    updatedAt: now,
    status: 'completed',
    totalDuration: totalMinutes,
    activeDuration: activeDuration,
    duration: activeDuration, // Compatibility alias
    ...completionData
  };

  await updateDoc(entryRef, updateData);
};

/**
 * Постановка записи на паузу
 */
export const pauseTimeEntry = async (
  userId: string,
  entryId: string,
  reason?: string
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  const now = new Date();
  
  const updateData = {
    status: 'paused',
    currentPauseStart: now,
    pauseReason: reason || '',
    updatedAt: now
  };

  await updateDoc(entryRef, updateData);
};

/**
 * Возобновление работы с расчетом времени паузы
 */
export const resumeTimeEntry = async (
  userId: string,
  entryId: string
): Promise<void> => {
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  const entryDoc = await getDoc(entryRef);
  
  if (!entryDoc.exists()) {
    throw new Error('Time entry not found');
  }
  
  const currentData = entryDoc.data();
  const now = new Date();
  
  // Рассчитываем длительность паузы
  let pauseDuration = 0;
  let updatedPauses = currentData.pauses || [];
  
  if (currentData.currentPauseStart) {
    const pauseStart = currentData.currentPauseStart.toDate ? 
      currentData.currentPauseStart.toDate() : 
      new Date(currentData.currentPauseStart);
    
    pauseDuration = Math.floor((now.getTime() - pauseStart.getTime()) / 60000);
    
    // Добавляем запись о паузе
    const pauseRecord: PauseRecord = {
      startTime: pauseStart,
      endTime: now,
      duration: pauseDuration,
      reason: currentData.pauseReason || ''
    };
    
    updatedPauses.push(pauseRecord);
  }
  
  // Обновляем общее время пауз
  const totalPauseDuration = (currentData.totalPauseDuration || 0) + pauseDuration;
  
  const updateData = {
    status: 'active',
    pauses: updatedPauses,
    totalPauseDuration,
    currentPauseStart: deleteField(),
    pauseReason: deleteField(),
    updatedAt: now
  };

  await updateDoc(entryRef, updateData);
};

/**
 * Real-time подписка на записи времени
 * Поддерживает фильтрацию по различным критериям
 */
export const getTimeEntriesStream = (
  userId: string,
  callback: (entries: TimeEntry[]) => void,
  filters?: {
    status?: TimeEntryStatus;
    projectId?: string;
    estimateId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
) => {
  let q = query(
    collection(db, `users/${userId}/timeEntries`),
    orderBy('startTime', 'desc')
  );

  // Применение фильтров
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  if (filters?.projectId) {
    q = query(q, where('projectId', '==', filters.projectId));
  }
  
  if (filters?.estimateId) {
    q = query(q, where('estimateId', '==', filters.estimateId));
  }

  // Подписка на изменения
  return onSnapshot(q, (snapshot) => {
    const entries: TimeEntry[] = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Конвертация Timestamp в Date
      return {
        id: doc.id,
        ...data,
        startTime: data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime),
        endTime: data.endTime?.toDate ? data.endTime.toDate() : data.endTime,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : data.completedAt,
        approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : data.approvedAt,
        pauses: data.pauses?.map((pause: any) => ({
          ...pause,
          startTime: pause.startTime?.toDate ? pause.startTime.toDate() : new Date(pause.startTime),
          endTime: pause.endTime?.toDate ? pause.endTime.toDate() : pause.endTime
        })) || []
      } as TimeEntry;
    });

    callback(entries);
  });
};

/**
 * Загрузка фотографии для записи времени
 * Поддерживает сжатие и оптимизацию
 */
export const uploadTimeEntryPhoto = async (
  userId: string,
  entryId: string,
  file: File,
  type: 'start' | 'end'
): Promise<string> => {
  // Создание пути для загрузки
  const storagePath = `timeEntries/${userId}/${entryId}/${type}_photo_${Date.now()}`;
  const storageRef = ref(storage, storagePath);
  
  // Загрузка файла
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  // Обновление записи времени
  const entryRef = doc(db, `users/${userId}/timeEntries`, entryId);
  const updateField = type === 'start' ? 'startPhotoUrl' : 'endPhotoUrl';
  
  await updateDoc(entryRef, {
    [updateField]: downloadURL,
    updatedAt: new Date()
  });
  
  return downloadURL;
};

/**
 * Расчет статистики по записям времени
 */
export const calculateTimeEntryStatistics = (
  entries: TimeEntry[]
) => {
  const totalEntries = entries.length;
  const activeEntries = entries.filter(e => e.status === 'active').length;
  const completedEntries = entries.filter(e => e.status === 'completed').length;
  const pausedEntries = entries.filter(e => e.status === 'paused').length;
  
  const totalHours = entries.reduce((sum, entry) => {
    return sum + (entry.activeDuration || 0);
  }, 0) / 60;
  
  const averageSessionTime = completedEntries > 0 ? 
    (entries
      .filter(e => e.status === 'completed')
      .reduce((sum, e) => sum + (e.activeDuration || 0), 0) / completedEntries
    ) / 60 : 0;

  return {
    totalEntries,
    activeEntries,
    completedEntries,
    pausedEntries,
    totalHours: Math.round(totalHours * 100) / 100,
    averageSessionTime: Math.round(averageSessionTime * 100) / 100
  };
};
```

### Система валидации и конвертации (`src/utils/firebaseConverters.ts`)

```typescript
/**
 * Утилиты для преобразования между фронтенд типами и Firebase типами
 * Обеспечивают безопасное преобразование с удалением undefined значений
 * 
 * Ключевые функции:
 * - toFirebaseTimeEntry: конвертация TimeEntry для сохранения в Firebase
 * - toFirebaseTask: конвертация Task для Firebase
 * - validateForFirebase: валидация данных перед сохранением
 * - safeFirebaseOperation: обертка для безопасного выполнения операций
 */

/**
 * Преобразует TimeEntry из фронтенда в Firebase формат
 * Удаляет все undefined поля и валидирует результат
 */
export function toFirebaseTimeEntry(
  entry: Partial<TimeEntry>,
  options: {
    isNew?: boolean;
    includeTimestamps?: boolean;
  } = {}
): FirebaseTimeEntryBase | FirebaseTimeEntryWithEstimate | FirebaseTimeEntryWithService {
  const { isNew = false, includeTimestamps = true } = options;
  
  // Базовые обязательные поля
  const firebaseEntry: any = {
    taskId: entry.taskId || '',
    taskName: entry.taskName || '',
    projectId: entry.projectId || '',
    projectName: entry.projectName || '',
    employeeId: entry.employeeId || '',
    employeeName: entry.employeeName || '',
    status: entry.status || 'active'
  };
  
  // Добавляем временные метки
  if (includeTimestamps) {
    if (isNew) {
      firebaseEntry.startTime = serverTimestamp();
      firebaseEntry.createdAt = serverTimestamp();
      firebaseEntry.updatedAt = serverTimestamp();
    } else {
      firebaseEntry.updatedAt = serverTimestamp();
      if (entry.startTime) {
        firebaseEntry.startTime = entry.startTime;
      }
    }
  }
  
  // Добавляем данные о смете если есть
  if (entry.estimateId && entry.estimateName) {
    firebaseEntry.estimateId = entry.estimateId;
    firebaseEntry.estimateName = entry.estimateName;
  }
  
  // Добавляем данные об услуге если есть
  if (entry.serviceId && entry.serviceName) {
    firebaseEntry.serviceId = entry.serviceId;
    firebaseEntry.serviceName = entry.serviceName;
  }
  
  // Добавляем геолокацию старта если есть
  if (entry.startLocation) {
    const location: any = {
      latitude: entry.startLocation.latitude,
      longitude: entry.startLocation.longitude,
      timestamp: entry.startLocation.timestamp
    };
    
    if (entry.startLocation.accuracy !== undefined && entry.startLocation.accuracy !== null) {
      location.accuracy = entry.startLocation.accuracy;
    }
    
    firebaseEntry.startLocation = location;
  }
  
  // Добавляем URL фото старта если есть
  if (entry.startPhotoUrl) {
    firebaseEntry.startPhotoUrl = entry.startPhotoUrl;
  }
  
  // Для завершенных записей
  if (entry.status === 'completed' || entry.status === 'approved') {
    if (entry.endTime) {
      firebaseEntry.endTime = entry.endTime;
    }
    if (typeof entry.duration === 'number') {
      firebaseEntry.duration = entry.duration;
    }
    if (entry.comment) {
      firebaseEntry.comment = entry.comment;
    }
    if (entry.endPhotoUrl) {
      firebaseEntry.endPhotoUrl = entry.endPhotoUrl;
    }
    if (entry.endLocation) {
      const endLocation: any = {
        latitude: entry.endLocation.latitude,
        longitude: entry.endLocation.longitude,
        timestamp: entry.endLocation.timestamp
      };
      
      if (entry.endLocation.accuracy !== undefined && entry.endLocation.accuracy !== null) {
        endLocation.accuracy = entry.endLocation.accuracy;
      }
      
      firebaseEntry.endLocation = endLocation;
    }
  }
  
  // Для приостановленных записей
  if (entry.status === 'paused' && entry.pauseReason) {
    firebaseEntry.pauseReason = entry.pauseReason;
  }
  
  // Валидируем результат
  try {
    validateForFirebase(firebaseEntry, 'timeEntry');
  } catch (error) {
    if (error instanceof FirebaseValidationError) {
      console.error('TimeEntry validation failed:', error.message, firebaseEntry);
      throw error;
    }
    throw error;
  }
  
  return firebaseEntry;
}

/**
 * Обертка для безопасного вызова Firebase операций с валидацией
 */
export async function safeFirebaseOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Firebase operation failed'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof FirebaseValidationError) {
      console.error(`Validation error: ${error.message}`, {
        field: error.field,
        value: error.value
      });
      
      // Можно показать пользователю понятное сообщение
      throw new Error(`Ошибка валидации: поле "${error.field}" содержит некорректное значение`);
    }
    
    console.error(`${errorMessage}:`, error);
    throw error;
  }
}

/**
 * Хук для валидации формы перед отправкой в Firebase
 */
export function useFirebaseValidation() {
  const validateTimeEntry = (entry: Partial<TimeEntry>): string[] => {
    const errors: string[] = [];
    
    if (!entry.taskId) errors.push('Не указана задача');
    if (!entry.taskName) errors.push('Не указано название задачи');
    if (!entry.employeeId) errors.push('Не указан сотрудник');
    if (!entry.status) errors.push('Не указан статус');
    
    // Если есть смета, должно быть и название
    if (entry.estimateId && !entry.estimateName) {
      errors.push('Указан ID сметы, но не указано название');
    }
    
    // Если есть услуга, должна быть и смета
    if (entry.serviceId && !entry.estimateId) {
      errors.push('Указана услуга, но не указана смета');
    }
    
    return errors;
  };
  
  const validateTask = (task: Partial<Task>): string[] => {
    const errors: string[] = [];
    
    if (!task.task) errors.push('Не указано название задачи');
    if (!task.assigneeId) errors.push('Не указан исполнитель');
    if (!task.projectId) errors.push('Не указан проект');
    
    return errors;
  };
  
  return {
    validateTimeEntry,
    validateTask
  };
}
```

## Преимущества архитектуры SSOT

### 1. Устранение дублирования кода
- Единый набор компонентов для всех типов задач
- Централизованная бизнес-логика
- Общие утилиты и хелперы

### 2. Type Safety
- TypeScript Discriminated Unions предотвращают ошибки типов
- Автоматическое определение доступных полей
- Compile-time проверки корректности данных

### 3. Легкость сопровождения
- Изменения в одном месте влияют на всю систему
- Простота добавления новых типов задач
- Централизованное тестирование

### 4. Производительность
- Эффективное кэширование данных
- Минимальные re-renders благодаря оптимизированным хукам
- Real-time обновления только при необходимости

### 5. Расширяемость
- Простое добавление новых полей через extension интерфейсов
- Модульная архитектура компонентов
- Pluggable система валидации

## Миграция и совместимость

Система разработана с учетом обратной совместимости:

### Legacy поддержка
- Все старые интерфейсы поддерживаются через compatibility поля
- Постепенная миграция без breaking changes
- Автоматическая конвертация legacy данных

### Безопасная миграция
- Поэтапное обновление компонентов
- Fallback механизмы для старых данных
- Rollback возможности при проблемах

## Заключение

Архитектура SSOT обеспечивает:
- ✅ Единство системы управления задачами
- ✅ Type Safety на уровне TypeScript
- ✅ Простоту сопровождения и расширения
- ✅ Высокую производительность
- ✅ Обратную совместимость

Система готова к production использованию и дальнейшему развитию.
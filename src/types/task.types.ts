/**
 * ============================================================================
 * TASK TYPES - ТИПЫ И ИНТЕРФЕЙСЫ ДЛЯ МОДУЛЯ "ЗАДАЧИ" V2
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * ═══════════
 * Единый источник правды для всех типов, связанных с задачами в системе.
 * Обеспечивает строгую типизацию и совместимость между компонентами.
 * 
 * АРХИТЕКТУРА:
 * ════════════
 * 
 * 🎯 БАЗОВЫЕ ТИПЫ:
 * ├─ TaskStatus - жизненный цикл задачи (new → assigned → in_progress → completed)
 * ├─ TaskPriority - приоритеты (low, medium, high, critical)
 * └─ Task - основная сущность задачи
 * 
 * 📊 ВЛОЖЕННЫЕ СТРУКТУРЫ:
 * ├─ PhotoSession - фотофиксация выполнения
 * ├─ Location - геолокация для мобильных работников
 * ├─ ReservedProduct - резервирование товаров для задачи
 * └─ Временные метки работы (startedAt, finishedAt, reviewedAt)
 * 
 * 🔄 DTO И ФИЛЬТРЫ:
 * ├─ CreateTaskDto - данные для создания задачи
 * ├─ UpdateTaskDto - данные для обновления
 * ├─ TaskFilters - фильтры для поиска и сортировки
 * └─ TaskSortOptions - настройки сортировки
 * 
 * 🏗️ СОВМЕСТИМОСТЬ:
 * ├─ Полная совместимость с taskApi.ts
 * ├─ Поддержка legacy полей для миграции
 * ├─ Интеграция с проектами (projectId, projectName)
 * └─ Связи со сметами (estimateItemId)
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * ═════════════
 * import { Task, TaskStatus, CreateTaskDto } from '../types/task.types';
 * 
 * const task: Task = {
 *   id: '123',
 *   task: 'Название задачи',
 *   projectId: 'project-id',
 *   status: 'new',
 *   priority: 'medium'
 * };
 * 
 * ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ: 2025 - Создан для унификации типов V2
 * ============================================================================
 */

// ==================== БАЗОВЫЕ ТИПЫ ====================

/**
 * Статус жизненного цикла задачи
 */
export type TaskStatus = 
  | 'new'        // Новая - только создана
  | 'assigned'   // Назначена - исполнитель определен
  | 'in_progress' // В работе - активно выполняется
  | 'on_hold'    // Приостановлена - временно остановлена
  | 'review'     // На проверке - ожидает проверки руководителем
  | 'rework'     // На доработку - возвращена на исправление
  | 'completed'  // Выполнена - успешно завершена
  | 'cancelled'; // Отменена - больше не актуальна

/**
 * Приоритет задачи
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

// ==================== ВЛОЖЕННЫЕ СТРУКТУРЫ ====================

/**
 * Фотосессия для задачи
 */
export interface PhotoSession {
  sessionId: string;
  startPhotoUrl?: string;
  endPhotoUrl?: string;
  startTime?: any;
  endTime?: any;
}

/**
 * Геолокация
 */
export interface Location {
  latitude: number;
  longitude: number;
}

/**
 * Зарезервированный товар
 */
export interface ReservedProduct {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

// ==================== ОСНОВНАЯ СУЩНОСТЬ ====================

/**
 * Задача
 */
export interface Task {
  // Идентификация
  id: string;
  task: string;  // Название задачи
  description?: string;  // Детальное описание
  
  // Жизненный цикл и приоритет
  status?: TaskStatus;
  priority?: TaskPriority;
  
  // Привязки
  projectId?: string;  // Привязка к проекту (обязательно для новых задач)
  projectName?: string;
  estimateItemId?: string;  // Привязка к позиции сметы (опционально)
  contractorId?: string;
  contractorName?: string;
  
  // Участники
  assigneeId?: string;  // ID исполнителя
  assigneeName?: string;
  authorId?: string;  // ID автора задачи
  authorName?: string;
  
  // Планирование
  deadline?: any;  // Срок выполнения
  plannedDuration?: number;  // Плановые трудозатраты в часах
  actualDuration?: number;  // Фактические трудозатраты (автоматически рассчитывается)
  
  // Фотофиксация
  requirePhoto?: boolean;  // Флаг обязательной фотофиксации
  photoSessions?: PhotoSession[];  // Массив фотосессий для множественных сессий работы
  
  // Геолокация
  startLocation?: Location;
  endLocation?: Location;
  
  // Временные метки работы
  startedAt?: any;  // Когда впервые начата работа
  finishedAt?: any;  // Когда завершена работа
  reviewedAt?: any;  // Когда проверена руководителем
  
  // Дополнительные поля
  questions?: string;  // Вопросы и уточнения
  whatToBuy?: string;  // Список покупок
  holdReason?: string;  // Причина приостановки (для статуса on_hold)
  reworkReason?: string;  // Причина возврата на доработку
  reviewComment?: string;  // Комментарий руководителя при проверке
  
  // Зарезервированные товары
  reservedProducts?: ReservedProduct[];
  
  // Теги для дополнительной классификации
  tags?: string[];
  
  // Системные поля
  createdAt?: any;
  updatedAt?: any;
}

// ==================== DTO И ФИЛЬТРЫ ====================

/**
 * Данные для создания задачи
 */
export interface CreateTaskDto {
  task: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  deadline?: any;
  priority?: TaskPriority;
  requirePhoto?: boolean;
}

/**
 * Данные для обновления задачи
 */
export interface UpdateTaskDto extends Partial<Omit<Task, 'id' | 'createdAt'>> {}

/**
 * Фильтры для списка задач
 */
export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  projectId?: string;
  assigneeId?: string;
  authorId?: string;
  hasDeadline?: boolean;
  overdue?: boolean;
  requiresPhoto?: boolean;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

/**
 * Настройки сортировки задач
 */
export interface TaskSortOptions {
  field: 'task' | 'status' | 'priority' | 'deadline' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}
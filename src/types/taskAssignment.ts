/**
 * ============================================================================
 * TASK ASSIGNMENT SYSTEM - СИСТЕМА ПОСТАНОВКИ ЗАДАЧ V3
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * ═══════════
 * Расширенная система постановки задач сотрудникам с:
 * • Полным жизненным циклом (assigned → approved)
 * • Интеграцией учета времени
 * • Telegram уведомлениями
 * • Фотофиксацией и геолокацией
 * • Внутренней перепиской
 * 
 * ЖИЗНЕННЫЙ ЦИКЛ ЗАДАЧИ:
 * ══════════════════════════
 * 
 * assigned → acknowledged → started → in_progress → paused → completed → verified → approved
 *     ↓           ↓            ↓           ↓           ↓           ↓           ↓
 *  Назначена   Принята   Приступил   Активная   Пауза   Завершена   Проверена  Одобрена
 *                                      работа
 * 
 * ИНТЕГРАЦИЯ:
 * ═══════════
 * • timeEntryUnified.ts - учет времени
 * • project.types.ts - связь с проектами  
 * • estimate.types.ts - связь со сметами
 * • Firebase Auth - права доступа
 * • Telegram Bot - уведомления
 * 
 * ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ: 2025 - Система постановки задач V3
 * ============================================================================
 */

// ==================== БАЗОВЫЕ ТИПЫ ====================

/**
 * Статусы жизненного цикла задачи
 */
export type AssignmentTaskStatus = 
  | 'assigned'       // Задача назначена сотруднику (новая)
  | 'acknowledged'   // Сотрудник принял задачу (увидел и подтвердил)
  | 'started'        // Приступил к работе (первый старт таймера)
  | 'in_progress'    // Активная работа (таймер идет)
  | 'paused'         // Работа приостановлена
  | 'completed'      // Работа завершена сотрудником
  | 'verified'       // Проверено руководителем
  | 'approved'       // Одобрено и закрыто
  | 'rejected';      // Отклонено руководителем

/**
 * Приоритет задачи
 */
export type AssignmentTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Геолокация (совместимо с Firebase GeoPoint)
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// ==================== КОММЕНТАРИИ И ПЕРЕПИСКА ====================

/**
 * Комментарий к задаче (внутренняя переписка)
 */
export interface AssignmentTaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userRole?: string;
  text: string;
  timestamp: any; // Firebase Timestamp
  read: boolean;
  photos?: string[];           // URL фотографий в комментарии
  replyTo?: string;           // ID комментария на который отвечают
  edited?: boolean;           // Был ли отредактирован
  editedAt?: any;            // Время редактирования
}

/**
 * Настройки уведомлений
 */
export interface NotificationSettings {
  telegram: boolean;          // Telegram уведомления
  email: boolean;            // Email уведомления
  push: boolean;             // Push уведомления PWA
  newTask: boolean;          // При назначении новой задачи
  statusChange: boolean;     // При изменении статуса
  comments: boolean;         // При новых комментариях
  reminders: boolean;        // Напоминания о просроченных
}

// ==================== ОСНОВНАЯ СУЩНОСТЬ ====================

/**
 * Задача для системы постановки сотрудникам
 */
export interface AssignmentTask {
  // ==================== ИДЕНТИФИКАЦИЯ ====================
  id: string;
  projectId: string;          // Обязательная привязка к проекту
  estimateId?: string;        // Привязка к смете (опционально)
  estimateItemId?: string;    // Привязка к позиции сметы
  
  // ==================== НАЗНАЧЕНИЕ ====================
  assignedTo: string;         // userId исполнителя
  assignedBy: string;         // userId руководителя
  assignedAt: any;           // Timestamp назначения
  
  // ==================== ОСНОВНЫЕ ДАННЫЕ ====================
  title: string;              // Краткое название задачи
  description: string;        // Детальное описание
  priority: AssignmentTaskPriority; // Приоритет выполнения
  
  // ==================== ВРЕМЕННЫЕ РАМКИ ====================
  dueDate?: any;             // Срок выполнения (Timestamp)
  estimatedDuration?: number; // Планируемое время в минутах
  
  // ==================== СТАТУС И ПРОГРЕСС ====================
  status: AssignmentTaskStatus; // Текущий статус
  acknowledgedAt?: any;       // Когда принял задачу
  startedAt?: any;           // Когда приступил к работе
  completedAt?: any;         // Когда завершил работу
  verifiedAt?: any;          // Когда проверено руководителем
  approvedAt?: any;          // Когда одобрено
  rejectedAt?: any;          // Когда отклонено
  rejectionReason?: string;   // Причина отклонения
  
  // ==================== УЧЕТ ВРЕМЕНИ ====================
  timeEntries: string[];      // Массив ID записей времени
  totalActiveDuration: number; // Общее чистое время работы (минуты)
  totalPauseDuration: number; // Общее время пауз (минуты)
  currentTimeEntryId?: string; // ID активной записи времени
  pauseReason?: string;       // Причина текущей паузы
  
  // ==================== ГЕОЛОКАЦИЯ ====================
  locationRequired: boolean;   // Требуется ли фиксация местоположения
  workLocation?: GeoPoint;     // Место выполнения задачи
  startLocation?: GeoPoint;    // Фактическое место начала работы
  endLocation?: GeoPoint;      // Фактическое место завершения
  
  // ==================== ФОТОФИКСАЦИЯ ====================
  photosRequired: boolean;     // Требуется ли фото до/после
  startPhotos: string[];       // URL фото начала работы
  completionPhotos: string[];  // URL фото завершения работы
  
  // ==================== ПЕРЕПИСКА ====================
  comments: AssignmentTaskComment[]; // Внутренняя переписка
  unreadCount: number;        // Количество непрочитанных сообщений
  lastCommentAt?: any;        // Время последнего комментария
  lastCommentBy?: string;     // Автор последнего комментария
  
  // ==================== УВЕДОМЛЕНИЯ ====================
  telegramNotifications: boolean; // Включены ли Telegram уведомления
  lastNotificationAt?: any;   // Время последнего уведомления
  remindersSent: number;      // Количество отправленных напоминаний
  notificationSettings?: NotificationSettings;
  
  // ==================== ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ ====================
  tags?: string[];            // Теги для классификации
  attachments?: string[];     // Дополнительные файлы
  requirements?: string[];    // Специальные требования
  tools?: string[];           // Необходимые инструменты
  materials?: string[];       // Необходимые материалы
  
  // ==================== МЕТАДАННЫЕ ====================
  createdAt: any;            // Timestamp создания
  updatedAt: any;            // Timestamp последнего обновления
  
  // ==================== КЭШИРОВАННЫЕ ДАННЫЕ ====================
  assigneeName?: string;      // Имя исполнителя (кэш)
  assignedByName?: string;    // Имя назначившего (кэш)
  assignedToName?: string;    // Алиас для assigneeName (для обратной совместимости)
  projectName?: string;       // Название проекта (кэш)
  timeSpent?: number;         // Общее потраченное время в секундах (кэш)
  requireLocation?: boolean;  // Алиас для locationRequired (для обратной совместимости)
  requireStartPhoto?: boolean; // Требуется фото начала работы
  requireEndPhoto?: boolean;  // Требуется фото завершения работы
}

// ==================== DTO И ОПЕРАЦИИ ====================

/**
 * Данные для создания задачи (менеджерами)
 */
export interface CreateAssignmentTaskDto {
  title: string;
  description?: string;
  assignedTo: string;
  assignedToName: string;
  assignedBy: string;
  assignedByName: string;
  projectId: string;
  projectName: string;
  estimateId?: string;
  estimateItemId?: string;
  priority: AssignmentTaskPriority;
  dueDate?: Date;
  estimatedDuration?: number;
  requireLocation?: boolean;
  locationRequired?: boolean;
  workLocation?: string;
  requireStartPhoto?: boolean;
  requireEndPhoto?: boolean;
  photosRequired?: boolean;
  telegramNotifications?: boolean;
  tags?: string[];
  requirements?: string[];
}

/**
 * Данные для обновления задачи
 */
export interface UpdateAssignmentTaskDto extends Partial<Omit<AssignmentTask, 'id' | 'createdAt' | 'assignedAt'>> {}

/**
 * Фильтры для поиска задач
 */
export interface AssignmentTaskFilters {
  status?: AssignmentTaskStatus[];
  priority?: AssignmentTaskPriority[];
  assignedTo?: string;       // Конкретный исполнитель
  assignedBy?: string;       // Конкретный назначивший
  projectId?: string;        // Конкретный проект
  dueDate?: {               // Фильтр по срокам
    from?: string;
    to?: string;
  };
  overdue?: boolean;        // Только просроченные
  withLocation?: boolean;   // Только с требованием геолокации
  withPhotos?: boolean;     // Только с требованием фото
  hasUnread?: boolean;      // С непрочитанными сообщениями
  tags?: string[];          // По тегам
  searchQuery?: string;     // Поиск по тексту
}

/**
 * Настройки сортировки задач
 */
export interface AssignmentTaskSortOptions {
  field: 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt' | 'updatedAt' | 'assignedAt';
  direction: 'asc' | 'desc';
}

/**
 * Статистика по задачам
 */
export interface AssignmentTaskStatistics {
  total: number;
  byStatus: Record<AssignmentTaskStatus, number>;
  byPriority: Record<AssignmentTaskPriority, number>;
  overdue: number;
  completedToday: number;
  averageCompletionTime: number; // в минутах
  totalTimeSpent: number;        // в минутах
}

/**
 * Результат операции с задачей
 */
export interface AssignmentTaskOperationResult {
  success: boolean;
  taskId?: string;
  error?: string;
  data?: any;
}

// ==================== УТИЛИТЫ ====================

/**
 * Проверка, может ли пользователь выполнить действие над задачей
 */
export interface TaskPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canApprove: boolean;
  canComment: boolean;
  canStart: boolean;
  canComplete: boolean;
}

/**
 * Действия, доступные для задачи в зависимости от статуса
 */
export interface TaskActions {
  acknowledge?: boolean;      // Принять задачу
  start?: boolean;           // Приступить к работе
  pause?: boolean;           // Приостановить работу
  resume?: boolean;          // Возобновить работу
  complete?: boolean;        // Завершить работу
  verify?: boolean;          // Проверить (для руководителя)
  approve?: boolean;         // Одобрить (для руководителя)
  reject?: boolean;          // Отклонить (для руководителя)
  comment?: boolean;         // Добавить комментарий
  edit?: boolean;           // Редактировать
}

// ==================== КОНСТАНТЫ ====================

/**
 * Константы статусов для удобства использования
 */
export const ASSIGNMENT_TASK_STATUS = {
  ASSIGNED: 'assigned' as const,
  ACKNOWLEDGED: 'acknowledged' as const,
  STARTED: 'started' as const,
  IN_PROGRESS: 'in_progress' as const,
  PAUSED: 'paused' as const,
  COMPLETED: 'completed' as const,
  VERIFIED: 'verified' as const,
  APPROVED: 'approved' as const,
  REJECTED: 'rejected' as const,
} as const;

/**
 * Константы приоритетов
 */
export const ASSIGNMENT_TASK_PRIORITY = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  URGENT: 'urgent' as const,
} as const;

/**
 * Маппинг статусов для отображения
 */
export const ASSIGNMENT_TASK_STATUS_LABELS: Record<AssignmentTaskStatus, string> = {
  assigned: 'Назначена',
  acknowledged: 'Принята',
  started: 'Начата',
  in_progress: 'В работе',
  paused: 'Приостановлена',
  completed: 'Завершена',
  verified: 'Проверена',
  approved: 'Одобрена',
  rejected: 'Отклонена',
};

/**
 * Маппинг приоритетов для отображения
 */
export const ASSIGNMENT_TASK_PRIORITY_LABELS: Record<AssignmentTaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочно',
};

/**
 * Цвета для статусов
 */
export const ASSIGNMENT_TASK_STATUS_COLORS: Record<AssignmentTaskStatus, string> = {
  assigned: '#f44336',      // Красный - требует внимания
  acknowledged: '#ff9800',  // Оранжевый - принята
  started: '#2196f3',       // Синий - начата
  in_progress: '#4caf50',   // Зеленый - активная работа
  paused: '#ff9800',        // Оранжевый - пауза
  completed: '#9c27b0',     // Фиолетовый - завершена
  verified: '#607d8b',      // Серо-синий - проверена
  approved: '#4caf50',      // Зеленый - одобрена
  rejected: '#f44336',      // Красный - отклонена
};

/**
 * Цвета для приоритетов
 */
export const ASSIGNMENT_TASK_PRIORITY_COLORS: Record<AssignmentTaskPriority, string> = {
  low: '#607d8b',       // Серый
  medium: '#ff9800',    // Оранжевый
  high: '#f44336',      // Красный
  urgent: '#9c27b0',    // Фиолетовый
};

// ==================== УТИЛИТАРНЫЕ ФУНКЦИИ ====================

/**
 * Получение цвета статуса для UI компонентов
 */
export const getStatusColor = (status: AssignmentTaskStatus): string => {
  return ASSIGNMENT_TASK_STATUS_COLORS[status] || 'default';
};

/**
 * Получение текстовой метки статуса
 */
export const getStatusLabel = (status: AssignmentTaskStatus): string => {
  return ASSIGNMENT_TASK_STATUS_LABELS[status] || status;
};

/**
 * Получение цвета приоритета для UI компонентов
 */
export const getPriorityColor = (priority: AssignmentTaskPriority): string => {
  return ASSIGNMENT_TASK_PRIORITY_COLORS[priority] || 'default';
};

/**
 * Получение текстовой метки приоритета
 */
export const getPriorityLabel = (priority: AssignmentTaskPriority): string => {
  return ASSIGNMENT_TASK_PRIORITY_LABELS[priority] || priority;
};

// ==================== ЭКСПОРТ ====================

export default AssignmentTask;
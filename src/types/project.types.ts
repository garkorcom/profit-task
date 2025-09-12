/**
 * Типы и интерфейсы для модуля "Проекты"
 * Учет объектов работ с адресами, участниками и ограничениями
 */

// ==================== БАЗОВЫЕ ТИПЫ ====================

/**
 * Статус жизненного цикла проекта
 */
export type ProjectStatus = 
  | 'idea'          // Идея/Intake
  | 'pre_sale'      // Pre-Sale
  | 'planning'      // Планирование
  | 'active'        // Активен
  | 'on_hold'       // На паузе
  | 'completed'     // Завершен
  | 'closed'        // Закрыт
  | 'warranty';     // Гарантийный период

/**
 * Тип проекта
 */
export type ProjectType = 
  | 'residential_new'      // Жилой новострой
  | 'residential_remodel'  // Жилой ремонт
  | 'commercial_new'       // Коммерческий новострой
  | 'commercial_remodel'   // Коммерческий ремонт
  | 'industrial'          // Промышленный
  | 'infrastructure'      // Инфраструктура
  | 'other';

/**
 * Приоритет проекта
 */
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Роли участников проекта
 */
export type ProjectParticipantRole = 
  | 'owner'           // Владелец/заказчик
  | 'general_contractor' // Генподрядчик
  | 'subcontractor'   // Субподрядчик
  | 'architect'       // Архитектор
  | 'engineer'        // Инженер
  | 'inspector'       // Инспектор
  | 'consultant'      // Консультант
  | 'supplier';       // Поставщик

/**
 * Типы разрешений
 */
export type PermitType = 
  | 'building'        // Строительное
  | 'electrical'      // Электрическое
  | 'plumbing'        // Сантехническое
  | 'mechanical'      // Механическое
  | 'demolition'      // На снос
  | 'occupancy'       // На ввод в эксплуатацию
  | 'other';

/**
 * Статус разрешения
 */
export type PermitStatus = 
  | 'not_required'    // Не требуется
  | 'pending'         // Ожидается
  | 'submitted'       // Подано
  | 'approved'        // Одобрено
  | 'rejected'        // Отклонено
  | 'expired';        // Истекло

// ==================== ВЛОЖЕННЫЕ СТРУКТУРЫ ====================

/**
 * Локация проекта
 */
export interface ProjectLocation {
  address: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  jurisdiction?: string;              // Налоговая юрисдикция
  municipality?: string;              // Муниципалитет
  taxZone?: string;                   // Налоговая зона
  notes?: string;
}

/**
 * Контакт площадки
 */
export interface SiteContact {
  role: string;                       // Facility Manager, HOA, Building Management
  name: string;
  phone?: string;
  email?: string;
  alternatePhone?: string;
  notes?: string;
}

/**
 * Правила площадки
 */
export interface SiteRules {
  // Временные ограничения
  workHours: {
    weekdays?: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
    holidays?: boolean;
  };
  noiseRestrictions?: {
    quietHours: { start: string; end: string };
    maxDecibels?: number;
    notes?: string;
  };
  
  // Доступ
  accessRequirements?: {
    badgeRequired: boolean;
    escortRequired: boolean;
    advanceNotice?: number;            // Часов заранее
    checkInLocation?: string;
    securityContact?: SiteContact;
  };
  
  // Парковка и логистика
  parkingRules?: {
    permitRequired: boolean;
    locations?: string[];
    restrictions?: string;
  };
  freightElevator?: {
    available: boolean;
    reservationRequired: boolean;
    dimensions?: string;
    maxWeight?: number;
  };
  
  // Требования безопасности
  safetyRequirements?: {
    ppeRequired: string[];             // hard hat, safety glasses, etc.
    inductionRequired: boolean;
    insuranceCertRequired: boolean;
    minimumCoverage?: number;
  };
  
  // Прочие ограничения
  restrictions?: string[];              // Массив текстовых ограничений
  specialConditions?: string;
}

/**
 * Участник проекта
 */
export interface ProjectParticipant {
  id: string;
  counterpartyId: string;              // Ссылка на контрагента
  counterpartyName?: string;
  role: ProjectParticipantRole;
  isPrimary: boolean;                  // Основной для роли
  responsibilities?: string[];
  contactPersonId?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

/**
 * Разрешение
 */
export interface Permit {
  id: string;
  type: PermitType;
  number?: string;
  status: PermitStatus;
  authority?: string;                  // Кто выдает
  submittedDate?: string;
  approvedDate?: string;
  expiryDate?: string;
  cost?: number;
  responsiblePerson?: string;
  documents?: string[];                // URLs документов
  inspections?: Array<{
    date: string;
    type: string;
    result: 'passed' | 'failed' | 'pending';
    notes?: string;
  }>;
  notes?: string;
}

/**
 * Структура проекта (зоны/помещения)
 */
export interface ProjectStructure {
  zones?: Array<{
    id: string;
    name: string;                     // Этаж 1, Крыло А
    type: 'floor' | 'wing' | 'section' | 'room' | 'area';
    parentId?: string;                // Для иерархии
    description?: string;
    drawings?: string[];              // URLs чертежей
  }>;
  totalArea?: number;                 // Общая площадь
  areaUnit?: 'sqm' | 'sqft';
}

/**
 * Финансовые параметры проекта
 */
export interface ProjectFinancials {
  currency: string;
  budgetTotal?: number;
  budgetLines?: Array<{
    category: string;
    amount: number;
    notes?: string;
  }>;
  contractValue?: number;
  actualCost?: number;
  profitMargin?: number;
  markupPolicy?: {
    materials: number;                // % наценки на материалы
    labor: number;                    // % наценки на работы
    subcontract: number;              // % наценки на субподряд
  };
  retentionPercent?: number;         // % удержания
  depositPercent?: number;           // % депозита
  billingSchedule?: 'milestone' | 'monthly' | 'completion';
}

/**
 * Риск/ограничение проекта
 */
export interface ProjectRisk {
  id: string;
  category: 'safety' | 'financial' | 'schedule' | 'quality' | 'environmental' | 'other';
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  probability: 'low' | 'medium' | 'high';
  mitigation?: string;                // План митигации
  owner?: string;                     // Ответственный
  status: 'identified' | 'mitigating' | 'resolved' | 'accepted';
  identifiedDate: string;
  resolvedDate?: string;
}

/**
 * Документ проекта
 */
export interface ProjectDocument {
  id: string;
  type: 'drawing' | 'specification' | 'contract' | 'permit' | 'report' | 'photo' | 'other';
  name: string;
  version?: string;
  uploadedBy: string;
  uploadedAt: string;
  fileUrl: string;
  fileSize?: number;
  tags?: string[];
  relatedZone?: string;               // ID зоны
  notes?: string;
}

// ==================== ОСНОВНАЯ СУЩНОСТЬ ====================

/**
 * Проект
 */
export interface Project {
  // Идентификация
  id: string;
  internalCode?: string;              // Внутренний код проекта
  number?: string;                    // Номер проекта
  
  // Основные данные
  name: string;
  description?: string;
  type: ProjectType;
  status: ProjectStatus;
  priority: ProjectPriority;
  tags?: string[];
  
  // Локация и площадка
  location: ProjectLocation;
  siteContacts?: SiteContact[];
  siteRules?: SiteRules;
  
  // Участники
  participants: ProjectParticipant[];
  clientId?: string;                  // Основной заказчик (контрагент)
  clientName?: string;
  
  // Временные рамки
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  warrantyEndDate?: string;
  
  // Финансы
  financials: ProjectFinancials;
  
  // Разрешения и соответствие
  permits?: Permit[];
  applicableСodes?: string[];         // Применимые нормы/коды
  complianceNotes?: string;
  
  // Структура проекта
  structure?: ProjectStructure;
  
  // Риски и ограничения
  risks?: ProjectRisk[];
  
  // Документы
  documents?: ProjectDocument[];
  
  // Связи
  relatedEstimates?: string[];        // IDs связанных смет
  primaryEstimateId?: string;         // Основная смета/контракт
  relatedTasks?: string[];           // IDs задач
  relatedInvoices?: string[];        // IDs счетов
  
  // Управление
  projectManager?: string;            // ID менеджера проекта
  projectManagerName?: string;
  team?: Array<{
    userId: string;
    userName: string;
    role: string;
  }>;
  
  // Коммуникации
  communicationLog?: Array<{
    id: string;
    date: string;
    type: 'meeting' | 'rfi' | 'change_order' | 'note';
    subject: string;
    participants?: string[];
    content?: string;
    attachments?: string[];
  }>;
  
  // Метаданные
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
  completedBy?: string;
  completedAt?: string;
  
  // Дополнительные поля
  notes?: string;
  customFields?: Record<string, any>;
}

// ==================== DTO И ФИЛЬТРЫ ====================

/**
 * Данные для создания проекта
 */
export interface CreateProjectDto {
  name: string;
  type: ProjectType;
  description?: string;
  status?: ProjectStatus;
  clientId?: string;
  location: Partial<ProjectLocation>;
  estimatedStartDate?: string;
  estimatedEndDate?: string;
  financials?: Partial<ProjectFinancials>;
}

/**
 * Данные для обновления проекта
 */
export interface UpdateProjectDto extends Partial<Omit<Project, 'id' | 'createdBy' | 'createdAt'>> {}

/**
 * Фильтры для списка проектов
 */
export interface ProjectFilters {
  status?: ProjectStatus[];
  type?: ProjectType[];
  priority?: ProjectPriority[];
  projectManager?: string;
  clientId?: string;
  hasActivePermits?: boolean;
  hasExpiredPermits?: boolean;
  city?: string[];
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

/**
 * Проверка перехода статусов проекта
 */
export interface ProjectStatusTransition {
  from: ProjectStatus;
  to: ProjectStatus;
  requirements?: string[];
  gates?: Array<{
    check: string;
    required: boolean;
  }>;
}

/**
 * Правила переходов между статусами
 */
export const PROJECT_STATUS_TRANSITIONS: ProjectStatusTransition[] = [
  {
    from: 'idea',
    to: 'pre_sale',
    requirements: ['Заполнено название', 'Указан тип проекта'],
  },
  {
    from: 'pre_sale',
    to: 'planning',
    gates: [
      { check: 'Заполнен адрес объекта', required: true },
      { check: 'Указан контакт площадки', required: false },
    ],
  },
  {
    from: 'planning',
    to: 'active',
    gates: [
      { check: 'Есть принятая смета или контракт', required: true },
      { check: 'Определены ключевые параметры', required: true },
      { check: 'Получены необходимые разрешения', required: false },
    ],
  },
  {
    from: 'active',
    to: 'completed',
    requirements: ['Все работы выполнены', 'Акты подписаны'],
  },
  {
    from: 'completed',
    to: 'closed',
    requirements: ['Финальные расчеты проведены', 'Документы переданы'],
  },
];

// ==================== ШАБЛОНЫ И НАСТРОЙКИ ====================

/**
 * Шаблон проекта
 */
export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
  siteRules?: Partial<SiteRules>;
  requiredPermits?: PermitType[];
  financials?: Partial<ProjectFinancials>;
  structure?: ProjectStructure;
  customFields?: Record<string, any>;
}

/**
 * Настройки модуля проектов
 */
export interface ProjectModuleSettings {
  requireClientBeforeActive: boolean;
  requirePermitsBeforeActive: boolean;
  defaultMarkupRates: {
    materials: number;
    labor: number;
    subcontract: number;
  };
  riskAssessmentRequired: boolean;
  warrantyPeriodMonths: number;
  customFieldDefinitions?: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'date' | 'select';
    options?: string[];
    required?: boolean;
  }>;
}

// ==================== ОТЧЕТЫ И KPI ====================

/**
 * KPI проектов
 */
export interface ProjectKPI {
  totalCount: number;
  byStatus: Record<ProjectStatus, number>;
  byType: Record<ProjectType, number>;
  onSchedule: number;
  overBudget: number;
  averageDuration: number;              // Дней
  averageMargin: number;                // %
  permitComplianceRate: number;         // %
  riskMitigationRate: number;          // %
}

/**
 * Отчет по проекту
 */
export interface ProjectReport {
  project: Project;
  progressPercent: number;
  budgetUtilization: number;
  scheduleVariance: number;              // Дней опережения/отставания
  costVariance: number;                  // Перерасход/экономия
  openRisks: number;
  upcomingMilestones: Array<{
    date: string;
    description: string;
  }>;
  permitStatus: {
    approved: number;
    pending: number;
    expired: number;
  };
  documentCount: number;
  lastActivity?: string;
}

/**
 * Воронка проектов
 */
export interface ProjectFunnel {
  stage: ProjectStatus;
  count: number;
  value: number;                        // Общая стоимость
  averageTime: number;                  // Среднее время на этапе (дней)
  conversionRate?: number;              // % перехода на следующий этап
}

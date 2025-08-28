/**
 * Типы и интерфейсы для модуля "Контрагенты"
 * Централизованное управление клиентами, поставщиками, субподрядчиками
 */

// ==================== БАЗОВЫЕ ТИПЫ ====================

/**
 * Роли контрагента (может быть несколько)
 */
export type CounterpartyRole = 'customer' | 'vendor' | 'subcontractor' | 'partner';

/**
 * Статус жизненного цикла контрагента
 */
export type CounterpartyStatus = 
  | 'new'           // Новый
  | 'potential'     // Потенциальный
  | 'active'        // Активный
  | 'on_hold'       // На паузе
  | 'archived'      // Архив
  | 'blacklisted';  // В черном списке

/**
 * Роли контактных лиц
 */
export type ContactRole = 'primary' | 'billing' | 'site' | 'legal' | 'technical';

/**
 * Типы адресов
 */
export type AddressType = 'billing' | 'shipping' | 'legal' | 'site';

/**
 * Условия оплаты
 */
export type PaymentTerms = 'DueOnReceipt' | 'Net7' | 'Net15' | 'Net30' | 'Custom';

/**
 * Типы документов соответствия
 */
export type ComplianceDocType = 
  | 'general_liability'    // Общая страховка
  | 'workers_comp'         // Страхование работников
  | 'license'             // Лицензия
  | 'w9'                  // W-9 форма
  | 'certificate'         // Сертификат
  | 'bond'                // Гарантия
  | 'other';              // Прочее

/**
 * Каналы связи
 */
export type CommunicationChannel = 'email' | 'phone' | 'whatsapp' | 'telegram' | 'sms';

/**
 * Приоритет контрагента
 */
export type CounterpartyPriority = 'low' | 'medium' | 'high' | 'vip';

// ==================== ВЛОЖЕННЫЕ СТРУКТУРЫ ====================

/**
 * Контактное лицо
 */
export interface ContactPerson {
  id: string;
  role: ContactRole;
  firstName: string;
  lastName: string;
  title?: string;                      // Должность
  email?: string;
  phone?: string;
  mobile?: string;
  preferredChannel?: CommunicationChannel;
  notes?: string;
  isPrimary: boolean;
  isActive: boolean;
}

/**
 * Адрес
 */
export interface Address {
  id: string;
  type: AddressType;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  isPrimary: boolean;
  notes?: string;
}

/**
 * Документ соответствия
 */
export interface ComplianceDocument {
  id: string;
  type: ComplianceDocType;
  name: string;
  documentNumber?: string;
  issuer?: string;                     // Кто выдал
  issueDate?: string;                  // ISO date
  expiryDate?: string;                 // ISO date
  coverageAmount?: number;              // Сумма покрытия (для страховок)
  fileUrl?: string;
  status: 'valid' | 'expiring_soon' | 'expired' | 'pending_review';
  reminderDays?: number;               // За сколько дней напоминать
  notes?: string;
}

/**
 * Финансовые настройки
 */
export interface FinancialSettings {
  paymentTerms: PaymentTerms;
  customPaymentTerms?: string;
  creditLimit?: number;
  requiredDeposit?: number;            // Требуемый депозит %
  discountRate?: number;               // Скидка %
  priceLevel?: string;                 // Ценовой уровень
  currency: string;                     // ISO код валюты
  taxProfile?: string;                  // Налоговый профиль
  taxExempt?: boolean;                 // Освобожден от налогов
  taxExemptId?: string;                // Номер налогового освобождения
}

/**
 * Взаимодействие/коммуникация
 */
export interface Interaction {
  id: string;
  date: string;                        // ISO date
  type: 'email' | 'call' | 'meeting' | 'note' | 'task';
  subject: string;
  description?: string;
  userId: string;                      // Кто провел взаимодействие
  userName?: string;
  nextAction?: string;
  nextActionDate?: string;
  attachments?: string[];              // URLs файлов
}

/**
 * Оценка риска
 */
export interface RiskAssessment {
  creditRisk: 'low' | 'medium' | 'high';
  paymentHistory?: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  assessedBy?: string;
  assessedAt?: string;                 // ISO date
}

// ==================== ОСНОВНАЯ СУЩНОСТЬ ====================

/**
 * Контрагент
 */
export interface Counterparty {
  // Идентификация
  id: string;
  internalCode?: string;               // Внутренний код
  
  // Основные данные
  legalName: string;                   // Полное юридическое наименование
  displayName: string;                 // Краткое отображаемое имя
  taxId?: string;                      // ИНН/Tax ID
  website?: string;
  
  // Классификация
  roles: CounterpartyRole[];           // Роли (может быть несколько)
  status: CounterpartyStatus;
  priority: CounterpartyPriority;
  industry?: string;                   // Отрасль
  category?: string;                   // Категория
  tags?: string[];                     // Теги для фильтрации
  
  // Контакты и адреса
  contacts: ContactPerson[];
  addresses: Address[];
  primaryContactId?: string;
  primaryAddressId?: string;
  
  // Финансы
  financial: FinancialSettings;
  
  // Документы соответствия (для вендоров/субподрядчиков)
  complianceDocuments?: ComplianceDocument[];
  
  // Риски и кредит
  riskAssessment?: RiskAssessment;
  
  // Взаимодействия
  interactions?: Interaction[];
  lastInteractionDate?: string;
  
  // Связи
  relatedProjects?: string[];          // IDs проектов
  relatedEstimates?: string[];         // IDs смет
  parentCompanyId?: string;            // Головная компания
  subsidiaries?: string[];             // Дочерние компании
  
  // Управление
  assignedTo?: string;                 // ID ответственного менеджера
  assignedToName?: string;
  
  // Метаданные
  createdBy: string;
  createdAt: string;                   // ISO date
  updatedBy?: string;
  updatedAt: string;                   // ISO date
  archivedBy?: string;
  archivedAt?: string;
  
  // Дополнительные поля
  notes?: string;
  customFields?: Record<string, any>;
}

// ==================== DTO И ФИЛЬТРЫ ====================

/**
 * Данные для создания контрагента
 */
export interface CreateCounterpartyDto {
  legalName: string;
  displayName?: string;
  roles: CounterpartyRole[];
  taxId?: string;
  primaryContact?: Omit<ContactPerson, 'id'>;
  primaryAddress?: Omit<Address, 'id'>;
  financial?: Partial<FinancialSettings>;
}

/**
 * Данные для обновления контрагента
 */
export interface UpdateCounterpartyDto extends Partial<Omit<Counterparty, 'id' | 'createdBy' | 'createdAt'>> {}

/**
 * Фильтры для списка контрагентов
 */
export interface CounterpartyFilters {
  roles?: CounterpartyRole[];
  status?: CounterpartyStatus[];
  priority?: CounterpartyPriority[];
  industry?: string[];
  tags?: string[];
  assignedTo?: string;
  hasExpiredDocuments?: boolean;
  hasExpiringDocuments?: boolean;      // В течение 30 дней
  searchQuery?: string;
}

/**
 * Проверка перехода статусов
 */
export interface StatusTransitionRule {
  from: CounterpartyStatus;
  to: CounterpartyStatus;
  requirements?: string[];              // Требования для перехода
  validationFunction?: string;          // Имя функции валидации
}

/**
 * Правила валидации для статусов
 */
export const STATUS_TRANSITION_RULES: StatusTransitionRule[] = [
  {
    from: 'new',
    to: 'potential',
    requirements: ['Заполнено название', 'Указана роль'],
  },
  {
    from: 'potential',
    to: 'active',
    requirements: [
      'Есть основной контакт',
      'Указаны платежные условия',
      'Для субподрядчиков - действующие документы',
    ],
  },
  {
    from: 'active',
    to: 'on_hold',
    requirements: [],
  },
  {
    from: 'on_hold',
    to: 'active',
    requirements: ['Проверка актуальности данных'],
  },
  {
    from: 'active',
    to: 'archived',
    requirements: ['Нет активных проектов', 'Нет открытых смет'],
  },
];

// ==================== ШАБЛОНЫ И НАСТРОЙКИ ====================

/**
 * Шаблон контрагента для быстрого создания
 */
export interface CounterpartyTemplate {
  id: string;
  name: string;
  description?: string;
  roles: CounterpartyRole[];
  financial: Partial<FinancialSettings>;
  requiredDocuments?: ComplianceDocType[];
  customFields?: Record<string, any>;
}

/**
 * Настройки модуля контрагентов
 */
export interface CounterpartyModuleSettings {
  requireTaxId: boolean;
  requirePrimaryContact: boolean;
  documentExpiryWarningDays: number;   // За сколько дней предупреждать
  allowDuplicates: boolean;
  defaultPaymentTerms: PaymentTerms;
  defaultCurrency: string;
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
 * KPI контрагентов
 */
export interface CounterpartyKPI {
  totalCount: number;
  byStatus: Record<CounterpartyStatus, number>;
  byRole: Record<CounterpartyRole, number>;
  withCompleteDocuments: number;
  withExpiringDocuments: number;
  withExpiredDocuments: number;
  averageInteractionFrequency: number;  // Дней между взаимодействиями
  winRate?: number;                     // % выигранных смет
}

/**
 * Отчет по контрагенту
 */
export interface CounterpartyReport {
  counterparty: Counterparty;
  totalEstimates: number;
  acceptedEstimates: number;
  totalRevenue: number;
  outstandingBalance?: number;
  lastInteraction?: Interaction;
  upcomingTasks?: Array<{
    date: string;
    description: string;
  }>;
  documentStatus: {
    valid: number;
    expiringSoon: number;
    expired: number;
  };
}

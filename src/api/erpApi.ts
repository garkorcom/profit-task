/**
 * API для ERP-модуля: управление задачами смет, трудозатратами и расчетом себестоимости
 * Реализация функционала согласно Техническому Заданию (ТЗ)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

import {
  EstimateTask,
  ProjectTask,
  LaborRate,
  TimeEntry,
  Expense,
  COGSRecord,
  ChangeOrder,
  EstimateCategory,
  TaskTemplate,
  TimeTrackingSettings,
  COGSCalculationSettings,
  IncludeMode,
  TaskStatus,
  CostSnapshot,
  ProjectCOGS,
  ProjectProfitLoss,
  EstimateVarianceReport,
} from '../types/erp.types';

// ==================== СПРАВОЧНИКИ И НАСТРОЙКИ ====================

/**
 * Управление категориями смет (CSI коды)
 */
export const estimateCategoriesApi = {
  /**
   * Получить все категории
   */
  async getAll(userId: string): Promise<EstimateCategory[]> {
    const q = query(
      collection(db, `users/${userId}/estimateCategories`),
      orderBy('level', 'asc'),
      orderBy('code', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EstimateCategory));
  },

  /**
   * Создать категорию
   */
  async create(userId: string, categoryData: Omit<EstimateCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, `users/${userId}/estimateCategories`), {
      ...categoryData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Обновить категорию
   */
  async update(userId: string, categoryId: string, updates: Partial<EstimateCategory>): Promise<void> {
    await updateDoc(doc(db, `users/${userId}/estimateCategories/${categoryId}`), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Удалить категорию
   */
  async delete(userId: string, categoryId: string): Promise<void> {
    await deleteDoc(doc(db, `users/${userId}/estimateCategories/${categoryId}`));
  },

  /**
   * Подписка на изменения
   */
  subscribe(userId: string, callback: (categories: EstimateCategory[]) => void): () => void {
    const q = query(
      collection(db, `users/${userId}/estimateCategories`),
      orderBy('level', 'asc'),
      orderBy('code', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EstimateCategory));
      callback(categories);
    });
  },
};

/**
 * Управление ставками трудозатрат
 */
export const laborRatesApi = {
  /**
   * Получить действующие ставки на дату
   */
  async getEffectiveRates(userId: string, effectiveDate?: string): Promise<LaborRate[]> {
    const dateFilter = effectiveDate || new Date().toISOString();
    
    const q = query(
      collection(db, `users/${userId}/laborRates`),
      where('effectiveFrom', '<=', dateFilter),
      orderBy('effectiveFrom', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const rates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LaborRate));
    
    // Фильтруем только активные на указанную дату
    return rates.filter(rate => 
      !rate.effectiveTo || rate.effectiveTo >= dateFilter
    );
  },

  /**
   * Найти ставку для пользователя/роли/проекта
   */
  async findRate(
    userId: string, 
    params: { 
      targetUserId?: string; 
      roleId?: string; 
      projectId?: string;
      effectiveDate?: string;
    }
  ): Promise<LaborRate | null> {
    const rates = await this.getEffectiveRates(userId, params.effectiveDate);
    
    // Приоритет: проектная ставка > персональная > ролевая
    const candidates = rates.filter(rate => {
      if (params.projectId && rate.projectId === params.projectId) return true;
      if (params.targetUserId && rate.userId === params.targetUserId && !rate.projectId) return true;
      if (params.roleId && rate.roleId === params.roleId && !rate.userId && !rate.projectId) return true;
      return false;
    });

    // Возвращаем наиболее специфичную ставку
    if (candidates.length === 0) return null;
    
    return candidates.sort((a, b) => {
      // Проектные ставки имеют высший приоритет
      if (a.projectId && !b.projectId) return -1;
      if (!a.projectId && b.projectId) return 1;
      // Персональные ставки приоритетнее ролевых
      if (a.userId && !b.userId) return -1;
      if (!a.userId && b.userId) return 1;
      // При равном приоритете - более свежая дата
      return b.effectiveFrom.localeCompare(a.effectiveFrom);
    })[0];
  },

  /**
   * Создать ставку
   */
  async create(userId: string, rateData: Omit<LaborRate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, `users/${userId}/laborRates`), {
      ...rateData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Обновить ставку
   */
  async update(userId: string, rateId: string, updates: Partial<LaborRate>): Promise<void> {
    await updateDoc(doc(db, `users/${userId}/laborRates/${rateId}`), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },
};

// ==================== ЗАДАЧИ ДЛЯ СМЕТ (PRE-CONSTRUCTION) ====================

/**
 * Управление задачами смет
 */
export const estimateTasksApi = {
  /**
   * Получить задачи сметы
   */
  async getByEstimate(userId: string, estimateId: string): Promise<EstimateTask[]> {
    const q = query(
      collection(db, `users/${userId}/estimateTasks`),
      where('estimateId', '==', estimateId),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EstimateTask));
  },

  /**
   * Создать задачу
   */
  async create(userId: string, taskData: Omit<EstimateTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, `users/${userId}/estimateTasks`), {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Обновить задачу
   */
  async update(userId: string, taskId: string, updates: Partial<EstimateTask>): Promise<void> {
    await updateDoc(doc(db, `users/${userId}/estimateTasks/${taskId}`), {
      ...updates,
      updatedAt: serverTimestamp(),
      ...(updates.status === 'approved' && { completedAt: serverTimestamp() }),
    });
  },

  /**
   * Удалить задачу
   */
  async delete(userId: string, taskId: string): Promise<void> {
    await deleteDoc(doc(db, `users/${userId}/estimateTasks/${taskId}`));
  },

  /**
   * Подписка на изменения задач сметы
   */
  subscribe(userId: string, estimateId: string, callback: (tasks: EstimateTask[]) => void): () => void {
    const q = query(
      collection(db, `users/${userId}/estimateTasks`),
      where('estimateId', '==', estimateId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EstimateTask));
      callback(tasks);
    });
  },
};

// ==================== ЗАДАЧИ ПРОЕКТОВ (EXECUTION) ====================

/**
 * Управление задачами проектов
 */
export const projectTasksApi = {
  /**
   * Получить задачи проекта
   */
  async getByProject(userId: string, projectId: string): Promise<ProjectTask[]> {
    const q = query(
      collection(db, `users/${userId}/projectTasks`),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectTask));
  },

  /**
   * Создать задачу проекта
   */
  async create(userId: string, taskData: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, `users/${userId}/projectTasks`), {
      ...taskData,
      progressPct: taskData.progressPct || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Конвертация EstimateTask в ProjectTask (маппинг из сметы)
   */
  async createFromEstimateTask(
    userId: string, 
    projectId: string, 
    estimateTask: EstimateTask,
    estimateItemId?: string
  ): Promise<string> {
    const projectTaskData: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'> = {
      projectId,
      estimateItemId,
      categoryId: estimateTask.categoryId,
      name: estimateTask.name,
      description: estimateTask.description,
      plannedHours: estimateTask.plannedHours,
      actualHours: 0,
      plannedCost: 0, // Будет рассчитано на основе ставок
      actualCost: 0,
      assignedRole: estimateTask.assignedRole,
      assignedUserId: estimateTask.assignedUserId,
      status: 'not_started',
      priority: estimateTask.priority,
      progressPct: 0,
      plannedStartDate: estimateTask.plannedStartDate,
      plannedEndDate: estimateTask.plannedEndDate,
      tags: estimateTask.tags,
      notes: `Создано из задачи сметы: ${estimateTask.name}`,
      createdBy: estimateTask.createdBy,
    };

    return await this.create(userId, projectTaskData);
  },

  /**
   * Обновить задачу проекта
   */
  async update(userId: string, taskId: string, updates: Partial<ProjectTask>): Promise<void> {
    await updateDoc(doc(db, `users/${userId}/projectTasks/${taskId}`), {
      ...updates,
      updatedAt: serverTimestamp(),
      ...(updates.status === 'approved' && { completedAt: serverTimestamp() }),
    });
  },
};

// ==================== УЧЕТ ВРЕМЕНИ ====================

/**
 * Расчет стоимости времени
 */
export const costCalculationApi = {
  /**
   * Создать снимок стоимости для записи времени
   */
  async createCostSnapshot(
    userId: string,
    timeEntry: Partial<TimeEntry>
  ): Promise<CostSnapshot> {
    // Найти подходящую ставку
    const laborRate = await laborRatesApi.findRate(userId, {
      targetUserId: timeEntry.userId,
      effectiveDate: timeEntry.date,
      // TODO: добавить roleId и projectId когда будут доступны
    });

    if (!laborRate) {
      throw new Error(`Не найдена ставка для пользователя ${timeEntry.userId} на дату ${timeEntry.date}`);
    }

    // Определить множители (сверхурочные, ночная смена)
    const effectiveMultiplier = 1; // TODO: реализовать логику определения множителей
    const overtimeMultiplier = effectiveMultiplier > 1 ? effectiveMultiplier : undefined;
    
    // Рассчитать стоимость
    const directLaborCost = (timeEntry.hours || 0) * laborRate.hourlyRate * effectiveMultiplier;
    const burderedLaborCost = directLaborCost * laborRate.burdenFactor;
    const loadedRate = laborRate.hourlyRate * laborRate.burdenFactor;

    const costSnapshot: CostSnapshot = {
      hourlyRate: laborRate.hourlyRate,
      burdenFactor: laborRate.burdenFactor,
      loadedRate,
      overtimeMultiplier,
      effectiveMultiplier,
      directLaborCost,
      burderedLaborCost,
      laborRateId: laborRate.id,
      calculatedAt: new Date().toISOString(),
      calculationRules: {
        roundingRule: 'nearest', // TODO: из настроек
      },
    };

    return costSnapshot;
  },
};

/**
 * Управление записями времени
 */
export const timeEntriesApi = {
  /**
   * Получить записи времени пользователя
   */
  async getByUser(
    userId: string, 
    targetUserId: string, 
    dateFrom?: string, 
    dateTo?: string
  ): Promise<TimeEntry[]> {
    let q = query(
      collection(db, `users/${userId}/timeEntries`),
      where('userId', '==', targetUserId),
      orderBy('date', 'desc')
    );

    if (dateFrom) {
      q = query(q, where('date', '>=', dateFrom));
    }
    if (dateTo) {
      q = query(q, where('date', '<=', dateTo));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry));
  },

  /**
   * Создать запись времени
   */
  async create(userId: string, entryData: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Валидация
    await this.validateTimeEntry(userId, entryData);

    const docRef = await addDoc(collection(db, `users/${userId}/timeEntries`), {
      ...entryData,
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Подать время на утверждение
   */
  async submit(userId: string, entryId: string, submittedBy: string): Promise<void> {
    await updateDoc(doc(db, `users/${userId}/timeEntries/${entryId}`), {
      status: 'submitted',
      submittedBy,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Утвердить время (переход в posted с созданием COGS)
   */
  async approve(userId: string, entryId: string, approvedBy: string): Promise<void> {
    const entryDoc = await getDoc(doc(db, `users/${userId}/timeEntries/${entryId}`));
    if (!entryDoc.exists()) {
      throw new Error('Запись времени не найдена');
    }

    const timeEntry = { id: entryDoc.id, ...entryDoc.data() } as TimeEntry;

    // Создать снимок стоимости
    const costSnapshot = await costCalculationApi.createCostSnapshot(userId, timeEntry);

    // Обновить запись времени
    await updateDoc(doc(db, `users/${userId}/timeEntries/${entryId}`), {
      status: 'approved',
      approvedBy,
      approvedAt: serverTimestamp(),
      costSnapshot,
      updatedAt: serverTimestamp(),
    });

    // Автоматически перевести в posted и создать COGS запись
    await this.postToSystem(userId, entryId);
  },

  /**
   * Провести в систему (создать COGSRecord)
   */
  async postToSystem(userId: string, entryId: string): Promise<void> {
    const entryDoc = await getDoc(doc(db, `users/${userId}/timeEntries/${entryId}`));
    if (!entryDoc.exists()) {
      throw new Error('Запись времени не найдена');
    }

    const timeEntry = { id: entryDoc.id, ...entryDoc.data() } as TimeEntry;
    
    if (timeEntry.status !== 'approved' || !timeEntry.costSnapshot) {
      throw new Error('Запись должна быть утверждена и иметь снимок стоимости');
    }

    // Определить, нужно ли включать в COGS
    let shouldIncludeInCOGS = false;
    let includeMode: IncludeMode = 'NONE';

    if (timeEntry.taskType === 'project_task') {
      shouldIncludeInCOGS = true; // Задачи проекта всегда в COGS
      includeMode = 'COGS';
    } else if (timeEntry.taskType === 'estimate_task') {
      // Для задач сметы нужно проверить includeMode
      // TODO: получить EstimateTask и проверить includeMode
      shouldIncludeInCOGS = false; // Временно
    }

    // Создать COGS запись, если необходимо
    if (shouldIncludeInCOGS) {
      await cogsApi.createFromTimeEntry(userId, timeEntry);
    }

    // Обновить статус записи времени
    await updateDoc(doc(db, `users/${userId}/timeEntries/${entryId}`), {
      status: 'posted',
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Валидация записи времени
   */
  async validateTimeEntry(userId: string, entryData: Partial<TimeEntry>): Promise<void> {
    const errors: string[] = [];

    // Базовые проверки
    if (!entryData.hours || entryData.hours <= 0) {
      errors.push('Количество часов должно быть больше 0');
    }

    if (!entryData.date) {
      errors.push('Дата обязательна');
    }

    // Проверка на будущие даты
    if (entryData.date && entryData.date > new Date().toISOString().split('T')[0]) {
      errors.push('Нельзя логировать время в будущем');
    }

    // TODO: добавить другие валидации из ТЗ
    // - проверка дневных/недельных лимитов
    // - проверка пересекающихся записей
    // - проверка статуса задачи

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
  },
};

// ==================== СЕБЕСТОИМОСТЬ (COGS) ====================

/**
 * Управление записями себестоимости
 */
export const cogsApi = {
  /**
   * Создать COGS запись из TimeEntry
   */
  async createFromTimeEntry(userId: string, timeEntry: TimeEntry): Promise<string> {
    if (!timeEntry.costSnapshot) {
      throw new Error('TimeEntry должна иметь costSnapshot для создания COGS');
    }

    const cogsData: Omit<COGSRecord, 'id'> = {
      projectId: timeEntry.projectId || '',
      sourceType: 'time_entry',
      sourceId: timeEntry.id,
      categoryId: '', // TODO: получить из задачи
      category: 'Labor',
      subCategory: 'burdened_labor',
      amount: timeEntry.costSnapshot.burderedLaborCost,
      currency: 'USD',
      costType: 'burdened_labor',
      hours: timeEntry.hours,
      hourlyRate: timeEntry.costSnapshot.loadedRate,
      periodDate: timeEntry.date.substring(0, 7), // YYYY-MM
      fiscalYear: new Date().getFullYear().toString(),
      fiscalQuarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
      generatedAt: new Date().toISOString(),
      generatedBy: 'system',
    };

    const docRef = await addDoc(collection(db, `users/${userId}/cogsRecords`), cogsData);
    return docRef.id;
  },

  /**
   * Получить COGS записи проекта
   */
  async getByProject(userId: string, projectId: string): Promise<COGSRecord[]> {
    const q = query(
      collection(db, `users/${userId}/cogsRecords`),
      where('projectId', '==', projectId),
      orderBy('generatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as COGSRecord));
  },

  /**
   * Рассчитать общую себестоимость проекта
   */
  async calculateProjectCOGS(userId: string, projectId: string): Promise<ProjectCOGS> {
    const cogsRecords = await this.getByProject(userId, projectId);
    
    // Группировка по типам затрат
    const totals = cogsRecords.reduce((acc, record) => {
      switch (record.costType) {
        case 'direct_labor':
          acc.directLabor += record.amount;
          break;
        case 'burdened_labor':
          acc.burderedLabor += record.amount;
          break;
        case 'materials':
          acc.materials += record.amount;
          break;
        case 'equipment':
          acc.equipment += record.amount;
          break;
        case 'subcontract':
          acc.subcontract += record.amount;
          break;
        default:
          acc.otherDirect += record.amount;
      }
      return acc;
    }, {
      directLabor: 0,
      burderedLabor: 0,
      materials: 0,
      equipment: 0,
      subcontract: 0,
      otherDirect: 0,
    });

    const totalCOGS = Object.values(totals).reduce((sum, value) => sum + value, 0);

    const projectCOGS: ProjectCOGS = {
      projectId,
      calculatedAt: new Date().toISOString(),
      ...totals,
      preConstructionLabor: 0, // TODO: рассчитать из EstimateTask с режимом COGS
      totalCOGS,
      overhead: 0, // TODO: рассчитать накладные
      breakdown: [], // TODO: группировка по категориям
    };

    return projectCOGS;
  },
};

// ==================== ЭКСПОРТ ====================
// Все API экспортированы как export const выше
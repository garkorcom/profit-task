/**
 * API для работы с модулем "Проекты" версия 2
 */

import { db } from '../firebase/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

import {
  Project,
  ProjectStatus,
  ProjectType,
  ProjectFilters,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectLocation,
  SiteContact,
  ProjectParticipant,
  Permit,
  ProjectRisk,
  ProjectDocument,
  ProjectKPI,
  PROJECT_STATUS_TRANSITIONS,
} from '../types/project.types';

import { cleanForFirestore } from '../utils/firebaseUtils';

// ==================== CRUD ОПЕРАЦИИ ====================

/**
 * Генерация номера проекта
 */
const generateProjectNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const counterRef = doc(db, 'counters', 'projects', year.toString(), 'sequence');
  
  const batch = writeBatch(db);
  const counterDoc = await getDoc(counterRef);
  const currentValue = counterDoc.exists() ? counterDoc.data().value : 0;
  const nextValue = currentValue + 1;
  
  batch.set(counterRef, { value: nextValue }, { merge: true });
  await batch.commit();
  
  return `PRJ-${year}-${String(nextValue).padStart(4, '0')}`;
};

/**
 * Создание нового проекта
 */
export const createProject = async (
  userId: string,
  data: CreateProjectDto
): Promise<string> => {
  const projectId = doc(collection(db, 'projects')).id;
  const projectNumber = await generateProjectNumber();
  
  const newProject: Project = {
    id: projectId,
    number: projectNumber,
    name: data.name,
    type: data.type,
    description: data.description,
    status: 'idea',
    priority: 'medium',
    
    location: {
      address: data.location.address || '',
      city: data.location.city || '',
      country: data.location.country || 'RU',
      ...data.location,
    },
    
    participants: [],
    
    financials: {
      currency: data.financials?.currency || 'RUB',
      ...data.financials,
    },
    
    clientId: data.clientId,
    estimatedStartDate: data.estimatedStartDate,
    estimatedEndDate: data.estimatedEndDate,
    
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const projectRef = doc(db, `users/${userId}/projects`, projectId);
  await setDoc(projectRef, cleanForFirestore(newProject));
  
  // Создаем запись в глобальном индексе
  const indexRef = doc(db, 'projects_index', projectId);
  await setDoc(indexRef, {
    userId,
    name: newProject.name,
    number: newProject.number,
    status: newProject.status,
    type: newProject.type,
    city: newProject.location.city,
    createdAt: serverTimestamp(),
  });
  
  return projectId;
};

/**
 * Удаление проекта
 */
export const deleteProject = async (
  _userId: string,
  projectId: string
): Promise<void> => {
  // Коллекция проектов хранится на корневом уровне: 'projects/{id}'
  await deleteDoc(doc(db, 'projects', projectId));
};

/**
 * Получение проекта по ID
 */
export const getProject = async (
  userId: string,
  projectId: string
): Promise<Project | null> => {
  const projectRef = doc(db, `users/${userId}/projects`, projectId);
  const projectDoc = await getDoc(projectRef);
  
  if (!projectDoc.exists()) {
    return null;
  }
  
  return { id: projectDoc.id, ...projectDoc.data() } as Project;
};

/**
 * Обновление проекта
 */
export const updateProject = async (
  userId: string,
  projectId: string,
  updates: UpdateProjectDto
): Promise<void> => {
  const projectRef = doc(db, `users/${userId}/projects`, projectId);
  
  const cleanedUpdates = cleanForFirestore({
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });
  
  await updateDoc(projectRef, cleanedUpdates);
  
  // Обновляем глобальный индекс если изменились ключевые поля
  if (updates.name || updates.status || updates.type || updates.location) {
    const indexRef = doc(db, 'projects_index', projectId);
    const indexUpdates: any = {
      updatedAt: serverTimestamp(),
    };
    
    if (updates.name) indexUpdates.name = updates.name;
    if (updates.status) indexUpdates.status = updates.status;
    if (updates.type) indexUpdates.type = updates.type;
    if (updates.location?.city) indexUpdates.city = updates.location.city;
    
    await updateDoc(indexRef, indexUpdates);
  }
};

/**
 * Закрытие проекта
 */
export const closeProject = async (
  userId: string,
  projectId: string
): Promise<void> => {
  await updateProject(userId, projectId, {
    status: 'closed',
    completedAt: new Date().toISOString(),
    completedBy: userId,
  });
};

// ==================== УПРАВЛЕНИЕ СТАТУСАМИ ====================

/**
 * Изменение статуса проекта с валидацией
 */
export const changeProjectStatus = async (
  userId: string,
  projectId: string,
  newStatus: ProjectStatus
): Promise<void> => {
  const project = await getProject(userId, projectId);
  
  if (!project) {
    throw new Error('Проект не найден');
  }
  
  // Проверяем возможность перехода
  const transition = PROJECT_STATUS_TRANSITIONS.find(
    rule => rule.from === project.status && rule.to === newStatus
  );
  
  if (!transition) {
    throw new Error(`Переход из статуса ${project.status} в ${newStatus} не разрешен`);
  }
  
  // Валидация гейтов
  if (transition.gates) {
    for (const gate of transition.gates) {
      if (gate.required) {
        // Проверяем конкретные требования
        switch (gate.check) {
          case 'Заполнен адрес объекта':
            if (!project.location.address) {
              throw new Error('Требуется заполнить адрес объекта');
            }
            break;
            
          case 'Есть принятая смета или контракт':
            if (!project.primaryEstimateId) {
              throw new Error('Требуется принятая смета или контракт');
            }
            break;
            
          case 'Определены ключевые параметры':
            if (!project.estimatedStartDate || !project.estimatedEndDate) {
              throw new Error('Требуется определить сроки проекта');
            }
            break;
        }
      }
    }
  }
  
  // Обновляем статус и фиксируем даты
  const updates: UpdateProjectDto = { status: newStatus };
  
  if (newStatus === 'active' && !project.actualStartDate) {
    updates.actualStartDate = new Date().toISOString();
  }
  
  if (newStatus === 'completed' && !project.actualEndDate) {
    updates.actualEndDate = new Date().toISOString();
  }
  
  await updateProject(userId, projectId, updates);
};

// ==================== УПРАВЛЕНИЕ УЧАСТНИКАМИ ====================

/**
 * Добавление участника проекта
 */
export const addProjectParticipant = async (
  userId: string,
  projectId: string,
  participant: Omit<ProjectParticipant, 'id'>
): Promise<string> => {
  const project = await getProject(userId, projectId);
  if (!project) {
    throw new Error('Проект не найден');
  }
  
  const participantId = doc(collection(db, 'temp')).id;
  const newParticipant: ProjectParticipant = {
    ...participant,
    id: participantId,
  };
  
  const updatedParticipants = [...(project.participants || []), newParticipant];
  
  await updateProject(userId, projectId, {
    participants: updatedParticipants,
  });
  
  return participantId;
};

/**
 * Обновление участника проекта
 */
export const updateProjectParticipant = async (
  userId: string,
  projectId: string,
  participantId: string,
  updates: Partial<ProjectParticipant>
): Promise<void> => {
  const project = await getProject(userId, projectId);
  if (!project) {
    throw new Error('Проект не найден');
  }
  
  const updatedParticipants = project.participants?.map(p => 
    p.id === participantId ? { ...p, ...updates } : p
  ) || [];
  
  await updateProject(userId, projectId, {
    participants: updatedParticipants,
  });
};

/**
 * Удаление участника из проекта
 */
export const removeProjectParticipant = async (
  userId: string,
  projectId: string,
  participantId: string
): Promise<void> => {
  const project = await getProject(userId, projectId);
  if (!project) {
    throw new Error('Проект не найден');
  }
  
  const updatedParticipants = project.participants?.filter(
    p => p.id !== participantId
  ) || [];
  
  await updateProject(userId, projectId, {
    participants: updatedParticipants,
  });
};

// ==================== УПРАВЛЕНИЕ РАЗРЕШЕНИЯМИ ====================

/**
 * Добавление разрешения
 */
export const addPermit = async (
  userId: string,
  projectId: string,
  permit: Omit<Permit, 'id'>
): Promise<string> => {
  const project = await getProject(userId, projectId);
  if (!project) {
    throw new Error('Проект не найден');
  }
  
  const permitId = doc(collection(db, 'temp')).id;
  const newPermit: Permit = {
    ...permit,
    id: permitId,
  };
  
  const updatedPermits = [...(project.permits || []), newPermit];
  
  await updateProject(userId, projectId, {
    permits: updatedPermits,
  });
  
  return permitId;
};

/**
 * Обновление статуса разрешения
 */
export const updatePermitStatus = async (
  userId: string,
  projectId: string,
  permitId: string,
  status: Permit['status'],
  additionalData?: Partial<Permit>
): Promise<void> => {
  const project = await getProject(userId, projectId);
  if (!project) {
    throw new Error('Проект не найден');
  }
  
  const updatedPermits = project.permits?.map(p => 
    p.id === permitId
      ? { 
          ...p,
          status,
          ...(status === 'approved' && { approvedDate: new Date().toISOString() }),
          ...additionalData,
        }
      : p
  ) || [];
  
  await updateProject(userId, projectId, {
    permits: updatedPermits,
  });
};

// ==================== УПРАВЛЕНИЕ РИСКАМИ ====================

/**
 * Добавление риска проекта
 */
export const addProjectRisk = async (
  userId: string,
  projectId: string,
  risk: Omit<ProjectRisk, 'id' | 'identifiedDate'>
): Promise<string> => {
  const project = await getProject(userId, projectId);
  if (!project) {
    throw new Error('Проект не найден');
  }
  
  const riskId = doc(collection(db, 'temp')).id;
  const newRisk: ProjectRisk = {
    ...risk,
    id: riskId,
    identifiedDate: new Date().toISOString(),
  };
  
  const updatedRisks = [...(project.risks || []), newRisk];
  
  await updateProject(userId, projectId, {
    risks: updatedRisks,
  });
  
  return riskId;
};

/**
 * Обновление статуса риска
 */
export const updateRiskStatus = async (
  userId: string,
  projectId: string,
  riskId: string,
  status: ProjectRisk['status'],
  mitigation?: string
): Promise<void> => {
  const project = await getProject(userId, projectId);
  if (!project) {
    throw new Error('Проект не найден');
  }
  
  const updatedRisks = project.risks?.map(r => 
    r.id === riskId
      ? { 
          ...r,
          status,
          mitigation: mitigation || r.mitigation,
          ...(status === 'resolved' && { resolvedDate: new Date().toISOString() }),
        }
      : r
  ) || [];
  
  await updateProject(userId, projectId, {
    risks: updatedRisks,
  });
};

// ==================== УПРАВЛЕНИЕ ДОКУМЕНТАМИ ====================

/**
 * Добавление документа проекта
 */
export const addProjectDocument = async (
  userId: string,
  projectId: string,
  document: Omit<ProjectDocument, 'id' | 'uploadedAt'>
): Promise<string> => {
  const project = await getProject(userId, projectId);
  if (!project) {
    throw new Error('Проект не найден');
  }
  
  const documentId = doc(collection(db, 'temp')).id;
  const newDocument: ProjectDocument = {
    ...document,
    id: documentId,
    uploadedBy: userId,
    uploadedAt: new Date().toISOString(),
  };
  
  const updatedDocuments = [...(project.documents || []), newDocument];
  
  await updateProject(userId, projectId, {
    documents: updatedDocuments,
  });
  
  return documentId;
};

// ==================== ПОИСК И ФИЛЬТРАЦИЯ ====================

/**
 * Получение списка проектов с фильтрами
 */
export const getProjects = async (
  userId: string,
  filters?: ProjectFilters
): Promise<Project[]> => {
  if (!userId) {
    console.warn('getProjects called without userId. Returning empty array.');
    return [];
  }
  let projectsQuery = collection(db, `users/${userId}/projects`);
  const constraints: any[] = [];
  
  // Применяем фильтры
  if (filters?.status && filters.status.length > 0) {
    constraints.push(where('status', 'in', filters.status));
  }
  
  if (filters?.priority && filters.priority.length > 0) {
    constraints.push(where('priority', 'in', filters.priority));
  }
  
  if (filters?.projectManager) {
    constraints.push(where('projectManager', '==', filters.projectManager));
  }
  
  if (filters?.clientId) {
    constraints.push(where('clientId', '==', filters.clientId));
  }
  
  // Сортировка по умолчанию
  constraints.push(orderBy('updatedAt', 'desc'));
  
  const finalQuery = query(projectsQuery as any, ...constraints);
  const snapshot = await getDocs(finalQuery);
  
  let projects = snapshot.docs.map(doc => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      ...data,
    } as Project;
  });
  
  // Клиентская фильтрация
  if (filters?.type && filters.type.length > 0) {
    projects = projects.filter(p => 
      filters.type!.includes(p.type)
    );
  }
  
  if (filters?.city && filters.city.length > 0) {
    projects = projects.filter(p => 
      p.location?.city && filters.city!.includes(p.location.city)
    );
  }
  
  if (filters?.hasActivePermits) {
    projects = projects.filter(p => 
      p.permits?.some(permit => permit.status === 'approved')
    );
  }
  
  if (filters?.hasExpiredPermits) {
    projects = projects.filter(p => 
      p.permits?.some(permit => permit.status === 'expired')
    );
  }
  
  if (filters?.searchQuery) {
    const search = filters.searchQuery.toLowerCase();
    projects = projects.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.description?.toLowerCase().includes(search) ||
      p.number?.toLowerCase().includes(search)
    );
  }
  
  // Фильтрация по датам
  if (filters?.dateFrom || filters?.dateTo) {
    projects = projects.filter(p => {
      const projectDate = p.createdAt;
      if (filters.dateFrom && projectDate < filters.dateFrom) return false;
      if (filters.dateTo && projectDate > filters.dateTo) return false;
      return true;
    });
  }
  
  return projects;
};

// ==================== СВЯЗИ С ДРУГИМИ СУЩНОСТЯМИ ====================

/**
 * Привязка сметы к проекту
 */
export const linkEstimateToProject = async (
  userId: string,
  projectId: string,
  estimateId: string,
  isPrimary: boolean = false
): Promise<void> => {
  const project = await getProject(userId, projectId);
  if (!project) {
    throw new Error('Проект не найден');
  }
  
  const relatedEstimates = project.relatedEstimates || [];
  
  if (!relatedEstimates.includes(estimateId)) {
    relatedEstimates.push(estimateId);
  }
  
  const updates: UpdateProjectDto = {
    relatedEstimates,
  };
  
  if (isPrimary) {
    updates.primaryEstimateId = estimateId;
  }
  
  await updateProject(userId, projectId, updates);
};

// ==================== ПОДПИСКИ ====================

/**
 * Подписка на изменения проекта
 */
export const subscribeToProject = (
  userId: string,
  projectId: string,
  callback: (project: Project | null) => void
): () => void => {
  const projectRef = doc(db, `users/${userId}/projects`, projectId);
  
  const unsubscribe = onSnapshot(projectRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data() || {};
      callback({ id: doc.id, ...data } as Project);
    } else {
      callback(null);
    }
  });
  
  return unsubscribe;
};

/**
 * Подписка на список проектов
 */
export const subscribeToProjects = (
  userId: string,
  callback: (projects: Project[]) => void,
  filters?: ProjectFilters
): () => void => {
  let projectsQuery = collection(db, `users/${userId}/projects`);
  const constraints: any[] = [];
  
  if (filters?.status && filters.status.length > 0) {
    constraints.push(where('status', 'in', filters.status));
  }
  
  constraints.push(orderBy('updatedAt', 'desc'));
  
  const finalQuery = query(projectsQuery as any, ...constraints);
  
  const unsubscribe = onSnapshot(finalQuery, (snapshot) => {
    let projects = snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
      } as Project;
    });
    
    // Применяем клиентскую фильтрацию
    if (filters?.type && filters.type.length > 0) {
      projects = projects.filter(p => 
        filters.type!.includes(p.type)
      );
    }
    
    callback(projects);
  });
  
  return unsubscribe;
};

// ==================== KPI И ОТЧЕТНОСТЬ ====================

/**
 * Получение KPI проектов
 */
export const getProjectKPI = async (userId: string): Promise<ProjectKPI> => {
  const projects = await getProjects(userId);
  const now = new Date();
  
  const kpi: ProjectKPI = {
    totalCount: projects.length,
    byStatus: {} as Record<ProjectStatus, number>,
    byType: {} as Record<ProjectType, number>,
    onSchedule: 0,
    overBudget: 0,
    averageDuration: 0,
    averageMargin: 0,
    permitComplianceRate: 0,
    riskMitigationRate: 0,
  };
  
  let totalDuration = 0;
  let totalMargin = 0;
  let projectsWithDuration = 0;
  let projectsWithMargin = 0;
  let totalPermits = 0;
  let approvedPermits = 0;
  let totalRisks = 0;
  let resolvedRisks = 0;
  
  projects.forEach(p => {
    // Подсчет по статусам
    kpi.byStatus[p.status] = (kpi.byStatus[p.status] || 0) + 1;
    
    // Подсчет по типам
    kpi.byType[p.type] = (kpi.byType[p.type] || 0) + 1;
    
    // Проверка расписания
    if (p.estimatedEndDate && p.status === 'active') {
      const estimatedEnd = new Date(p.estimatedEndDate);
      if (now <= estimatedEnd) {
        kpi.onSchedule++;
      }
    }
    
    // Проверка бюджета (учитываем, что в старых записях financials может отсутствовать)
    if (p.financials?.budgetTotal != null && p.financials?.actualCost != null) {
      if (p.financials.actualCost > p.financials.budgetTotal) {
        kpi.overBudget++;
      }
    }
    
    // Средняя длительность
    if (p.actualStartDate && p.actualEndDate) {
      const start = new Date(p.actualStartDate);
      const end = new Date(p.actualEndDate);
      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      totalDuration += duration;
      projectsWithDuration++;
    }
    
    // Средняя маржа
    if (typeof p.financials?.profitMargin === 'number') {
      totalMargin += p.financials!.profitMargin as number;
      projectsWithMargin++;
    }
    
    // Соответствие разрешений
    p.permits?.forEach(permit => {
      totalPermits++;
      if (permit.status === 'approved') {
        approvedPermits++;
      }
    });
    
    // Митигация рисков
    p.risks?.forEach(risk => {
      totalRisks++;
      if (risk.status === 'resolved' || risk.status === 'mitigating') {
        resolvedRisks++;
      }
    });
  });
  
  // Расчет средних значений
  if (projectsWithDuration > 0) {
    kpi.averageDuration = Math.round(totalDuration / projectsWithDuration);
  }
  
  if (projectsWithMargin > 0) {
    kpi.averageMargin = Math.round((totalMargin / projectsWithMargin) * 100) / 100;
  }
  
  if (totalPermits > 0) {
    kpi.permitComplianceRate = Math.round((approvedPermits / totalPermits) * 100);
  }
  
  if (totalRisks > 0) {
    kpi.riskMitigationRate = Math.round((resolvedRisks / totalRisks) * 100);
  }
  
  return kpi;
};

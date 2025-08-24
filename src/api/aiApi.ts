// API endpoints для интеграции с ИИ
// Предоставляет доступ к данным проекта для анализа и планирования

import { db } from '../firebase/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { Task, TaskStatus } from './taskApi';
import { TimeEntry } from './timeEntryApi';
import { Project } from './projectApi';
import { Employee } from './employeeApi';

// Интерфейсы для ИИ-анализа
export interface TaskAnalytics {
  taskId: string;
  taskName: string;
  status: TaskStatus;
  plannedDuration: number;
  actualDuration: number;
  efficiency: number; // actualDuration / plannedDuration
  photoQuality?: 'good' | 'poor' | 'missing';
  reworkCount: number;
  timeEntries: TimeEntry[];
}

export interface ProjectAnalytics {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  delayedTasks: number;
  totalPlannedHours: number;
  totalActualHours: number;
  efficiency: number;
  taskAnalytics: TaskAnalytics[];
}

export interface EmployeePerformance {
  employeeId: string;
  employeeName: string;
  totalTasks: number;
  completedTasks: number;
  averageCompletionTime: number;
  efficiency: number;
  reworkRate: number; // процент задач, возвращенных на доработку
  photoComplianceRate: number; // процент задач с корректными фото
}

export interface AIRecommendation {
  type: 'optimization' | 'risk' | 'resource' | 'quality';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedTasks?: string[];
  suggestedActions?: string[];
}

/**
 * Получить аналитику по проекту для ИИ
 */
export const getProjectAnalyticsForAI = async (
  userId: string,
  projectId: string
): Promise<ProjectAnalytics> => {
  // Получаем все задачи проекта
  const tasksQuery = query(
    collection(db, `users/${userId}/tasks`),
    where('projectId', '==', projectId)
  );
  const tasksSnapshot = await getDocs(tasksQuery);
  const tasks = tasksSnapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  })) as Task[];

  // Получаем все TimeEntries для задач проекта
  const taskAnalytics: TaskAnalytics[] = [];
  
  for (const task of tasks) {
    const entriesQuery = query(
      collection(db, `users/${userId}/timeEntries`),
      where('taskId', '==', task.id)
    );
    const entriesSnapshot = await getDocs(entriesQuery);
    const entries = entriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeEntry[];

    // Подсчет фактической длительности
    const actualDuration = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    
    // Подсчет количества возвратов на доработку
    const reworkCount = task.reworkReason ? 1 : 0; // Упрощенно, можно расширить

    // Оценка качества фото
    let photoQuality: 'good' | 'poor' | 'missing' = 'missing';
    if (task.requirePhoto) {
      const hasPhotos = entries.some(e => e.startPhotoUrl && e.endPhotoUrl);
      photoQuality = hasPhotos ? 'good' : 'missing';
    }

    taskAnalytics.push({
      taskId: task.id,
      taskName: task.task,
      status: task.status as TaskStatus,
      plannedDuration: (task.plannedDuration || 0) * 60, // в минутах
      actualDuration,
      efficiency: task.plannedDuration ? actualDuration / (task.plannedDuration * 60) : 1,
      photoQuality,
      reworkCount,
      timeEntries: entries
    });
  }

  // Подсчет статистики
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const delayedTasks = tasks.filter(t => {
    if (!t.deadline) return false;
    const deadline = t.deadline.toDate ? t.deadline.toDate() : new Date(t.deadline);
    return deadline < new Date() && t.status !== 'completed';
  }).length;

  const totalPlannedHours = taskAnalytics.reduce((sum, ta) => sum + ta.plannedDuration, 0) / 60;
  const totalActualHours = taskAnalytics.reduce((sum, ta) => sum + ta.actualDuration, 0) / 60;

  return {
    projectId,
    projectName: tasks[0]?.projectName || '',
    totalTasks: tasks.length,
    completedTasks,
    inProgressTasks,
    delayedTasks,
    totalPlannedHours,
    totalActualHours,
    efficiency: totalPlannedHours ? totalActualHours / totalPlannedHours : 1,
    taskAnalytics
  };
};

/**
 * Получить производительность сотрудников для ИИ
 */
export const getEmployeePerformanceForAI = async (
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<EmployeePerformance[]> => {
  // Получаем всех сотрудников
  const employeesQuery = query(collection(db, `users/${userId}/employees`));
  const employeesSnapshot = await getDocs(employeesQuery);
  const employees = employeesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Employee[];

  const performances: EmployeePerformance[] = [];

  for (const employee of employees) {
    // Получаем задачи сотрудника
    const tasksQuery = query(
      collection(db, `users/${userId}/tasks`),
      where('assigneeId', '==', employee.id)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];

    // Получаем TimeEntries сотрудника
    const entriesQuery = query(
      collection(db, `users/${userId}/timeEntries`),
      where('employeeId', '==', employee.id)
    );
    const entriesSnapshot = await getDocs(entriesQuery);
    const entries = entriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeEntry[];

    // Подсчет метрик
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const tasksWithRework = tasks.filter(t => t.reworkReason).length;
    const tasksRequiringPhoto = tasks.filter(t => t.requirePhoto).length;
    const tasksWithCompletePhotos = tasks.filter(t => {
      if (!t.requirePhoto) return false;
      const taskEntries = entries.filter(e => e.taskId === t.id);
      return taskEntries.some(e => e.startPhotoUrl && e.endPhotoUrl);
    }).length;

    const totalDuration = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const averageCompletionTime = completedTasks > 0 ? totalDuration / completedTasks : 0;

    performances.push({
      employeeId: employee.id,
      employeeName: employee.fullName || 'Неизвестный сотрудник',
      totalTasks: tasks.length,
      completedTasks,
      averageCompletionTime,
      efficiency: tasks.length > 0 ? completedTasks / tasks.length : 0,
      reworkRate: tasks.length > 0 ? tasksWithRework / tasks.length : 0,
      photoComplianceRate: tasksRequiringPhoto > 0 ? tasksWithCompletePhotos / tasksRequiringPhoto : 1
    });
  }

  return performances;
};

/**
 * Получить рекомендации ИИ на основе анализа данных
 */
export const generateAIRecommendations = async (
  userId: string,
  projectId?: string
): Promise<AIRecommendation[]> => {
  const recommendations: AIRecommendation[] = [];

  // Анализ задач с превышением сроков
  const tasksQuery = projectId 
    ? query(
        collection(db, `users/${userId}/tasks`),
        where('projectId', '==', projectId),
        where('status', '!=', 'completed')
      )
    : query(
        collection(db, `users/${userId}/tasks`),
        where('status', '!=', 'completed')
      );
  
  const tasksSnapshot = await getDocs(tasksQuery);
  const tasks = tasksSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Task[];

  // Проверка просроченных задач
  const overdueTasks = tasks.filter(t => {
    if (!t.deadline) return false;
    const deadline = t.deadline.toDate ? t.deadline.toDate() : new Date(t.deadline);
    return deadline < new Date();
  });

  if (overdueTasks.length > 0) {
    recommendations.push({
      type: 'risk',
      priority: 'high',
      title: 'Обнаружены просроченные задачи',
      description: `${overdueTasks.length} задач превысили установленные сроки выполнения`,
      affectedTasks: overdueTasks.map(t => t.id),
      suggestedActions: [
        'Пересмотреть приоритеты задач',
        'Назначить дополнительные ресурсы',
        'Обновить сроки выполнения'
      ]
    });
  }

  // Проверка задач без фотофиксации
  const photoRequiredTasks = tasks.filter(t => t.requirePhoto && !t.photoSessions?.length);
  if (photoRequiredTasks.length > 0) {
    recommendations.push({
      type: 'quality',
      priority: 'medium',
      title: 'Отсутствует фотофиксация',
      description: `${photoRequiredTasks.length} задач требуют фотофиксации, но фото не загружены`,
      affectedTasks: photoRequiredTasks.map(t => t.id),
      suggestedActions: [
        'Напомнить исполнителям о необходимости фотофиксации',
        'Проверить настройки мобильного приложения',
        'Провести обучение по использованию фотофиксации'
      ]
    });
  }

  // Анализ эффективности
  for (const task of tasks) {
    if (task.plannedDuration && task.actualDuration) {
      const efficiency = task.actualDuration / (task.plannedDuration * 60);
      if (efficiency > 1.5) {
        recommendations.push({
          type: 'optimization',
          priority: 'medium',
          title: `Превышение плановых трудозатрат: ${task.task}`,
          description: `Фактическое время выполнения превышает плановое на ${Math.round((efficiency - 1) * 100)}%`,
          affectedTasks: [task.id],
          suggestedActions: [
            'Пересмотреть оценку сложности задачи',
            'Выявить причины задержек',
            'Оптимизировать процесс выполнения'
          ]
        });
      }
    }
  }

  return recommendations;
};

/**
 * Получить прогноз завершения проекта для ИИ
 */
export const getProjectCompletionForecast = async (
  userId: string,
  projectId: string
): Promise<{
  estimatedCompletionDate: Date;
  confidenceLevel: number; // 0-1
  risks: string[];
  assumptions: string[];
}> => {
  const analytics = await getProjectAnalyticsForAI(userId, projectId);
  
  // Простой прогноз на основе текущей скорости выполнения
  const completionRate = analytics.completedTasks / analytics.totalTasks;
  const remainingTasks = analytics.totalTasks - analytics.completedTasks;
  
  // Средняя скорость выполнения (задач в день)
  // Для упрощения предполагаем 1 задачу в день на сотрудника
  const averageVelocity = 0.5; // задач в день
  
  const daysToComplete = remainingTasks / averageVelocity;
  const estimatedCompletionDate = new Date();
  estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + Math.ceil(daysToComplete));
  
  // Оценка уверенности на основе эффективности
  const confidenceLevel = Math.max(0.3, Math.min(1, 2 - analytics.efficiency));
  
  const risks: string[] = [];
  const assumptions: string[] = [];
  
  if (analytics.delayedTasks > 0) {
    risks.push(`${analytics.delayedTasks} задач уже просрочены`);
  }
  
  if (analytics.efficiency > 1.2) {
    risks.push('Фактические трудозатраты превышают плановые');
  }
  
  assumptions.push(`Средняя скорость выполнения: ${averageVelocity} задач/день`);
  assumptions.push('Отсутствие блокирующих факторов');
  assumptions.push('Стабильная доступность ресурсов');
  
  return {
    estimatedCompletionDate,
    confidenceLevel,
    risks,
    assumptions
  };
};

/**
 * Экспорт данных для обучения ИИ-модели
 */
export const exportTrainingDataForAI = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  tasks: Task[];
  timeEntries: TimeEntry[];
  projects: Project[];
  employees: Employee[];
  metadata: {
    exportDate: Date;
    dateRange: { start: Date; end: Date };
    totalRecords: number;
  };
}> => {
  // Получаем все данные за период
  const tasksQuery = query(
    collection(db, `users/${userId}/tasks`),
    where('createdAt', '>=', Timestamp.fromDate(startDate)),
    where('createdAt', '<=', Timestamp.fromDate(endDate))
  );
  const tasksSnapshot = await getDocs(tasksQuery);
  const tasks = tasksSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Task[];

  const entriesQuery = query(
    collection(db, `users/${userId}/timeEntries`),
    where('startTime', '>=', Timestamp.fromDate(startDate)),
    where('startTime', '<=', Timestamp.fromDate(endDate))
  );
  const entriesSnapshot = await getDocs(entriesQuery);
  const timeEntries = entriesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TimeEntry[];

  const projectsQuery = query(collection(db, `users/${userId}/projects`));
  const projectsSnapshot = await getDocs(projectsQuery);
  const projects = projectsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Project[];

  const employeesQuery = query(collection(db, `users/${userId}/employees`));
  const employeesSnapshot = await getDocs(employeesQuery);
  const employees = employeesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Employee[];

  return {
    tasks,
    timeEntries,
    projects,
    employees,
    metadata: {
      exportDate: new Date(),
      dateRange: { start: startDate, end: endDate },
      totalRecords: tasks.length + timeEntries.length + projects.length + employees.length
    }
  };
};

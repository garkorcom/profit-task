/**
 * ============================================================================
 * USE START WORK DATA - ЦЕНТРАЛИЗОВАННЫЙ ХУК УПРАВЛЕНИЯ ДАННЫМИ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * ═══════════
 * Оптимизированный хук для загрузки и кэширования данных в StartWork компонентах.
 * Убирает дублирование кода и обеспечивает консистентную загрузку данных.
 * 
 * ПРЕИМУЩЕСТВА:
 * ═════════════
 * 
 * ⚡ ПРОИЗВОДИТЕЛЬНОСТЬ:
 * ├─ Единократная загрузка всех смет с client-side фильтрацией
 * ├─ Мемоизация дорогих операций через useCallback
 * ├─ Умные зависимости useEffect для минимизации re-renders
 * └─ Автоматическое управление подписками и отписками
 * 
 * 🛡️ НАДЕЖНОСТЬ:
 * ├─ Стандартизированная обработка ошибок через errorHandling.ts
 * ├─ Graceful degradation при сбоях API
 * ├─ Loading states для всех операций
 * └─ Автоматическая очистка данных при размонтировании
 * 
 * 🔄 REAL-TIME СИНХРОНИЗАЦИЯ:
 * ├─ subscribeToProjects - live обновления проектов
 * ├─ getTasksStream - live обновления задач для проекта
 * ├─ Фильтрация смет в реальном времени
 * └─ Автоматическое обновление при изменении selectedProjectId
 * 
 * 📊 ВОЗВРАЩАЕМЫЕ ДАННЫЕ:
 * ├─ projects, tasks, estimates, allEstimates - данные
 * ├─ isLoading* - состояния загрузки для каждого типа
 * ├─ *Error - ошибки с пользовательскими сообщениями
 * └─ refetchEstimates, clearData - действия для управления
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * ═════════════
 * const { projects, tasks, estimates, isLoadingProjects } = useStartWorkData({
 *   userId: user?.uid,
 *   selectedProjectId: project?.id,
 *   open: dialogOpen
 * });
 * 
 * ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ: 2025 - Добавлена интеграция с errorHandling
 * ============================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { subscribeToProjects } from '../api/projectV2Api';
import { getTasksStream } from '../api/taskApi';
import { getEstimates } from '../api/estimateV2Api';
import { Project } from '../types/project.types';
import { Task } from '../types/task.types';
import { Estimate } from '../types/estimate.types';
import { useErrorHandler, getErrorMessage } from '../utils/errorHandling';

interface UseStartWorkDataProps {
  userId?: string;
  selectedProjectId?: string;
  open?: boolean;
}

interface UseStartWorkDataReturn {
  // Data
  projects: Project[];
  tasks: Task[];
  estimates: Estimate[];
  allEstimates: Estimate[];
  
  // Loading states
  isLoadingProjects: boolean;
  isLoadingTasks: boolean;
  isLoadingEstimates: boolean;
  
  // Errors
  projectsError: string | null;
  tasksError: string | null;
  estimatesError: string | null;
  
  // Actions
  refetchEstimates: () => Promise<void>;
  clearData: () => void;
}

export const useStartWorkData = ({
  userId,
  selectedProjectId,
  open = true
}: UseStartWorkDataProps): UseStartWorkDataReturn => {
  const { handleError } = useErrorHandler();
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [allEstimates, setAllEstimates] = useState<Estimate[]>([]);
  
  // Loading states
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingEstimates, setIsLoadingEstimates] = useState(false);
  
  // Errors
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [estimatesError, setEstimatesError] = useState<string | null>(null);

  // Мемоизированная функция загрузки всех смет
  const loadAllEstimates = useCallback(async () => {
    if (!userId || !open) return;
    
    setIsLoadingEstimates(true);
    setEstimatesError(null);
    
    try {
      const loadedEstimates = await getEstimates(userId);
      setAllEstimates(loadedEstimates);
      console.log('📊 All estimates loaded:', loadedEstimates.length);
    } catch (error) {
      const appError = handleError(error, 'loadAllEstimates');
      setEstimatesError(getErrorMessage(appError));
    } finally {
      setIsLoadingEstimates(false);
    }
  }, [userId, open]);

  // Загрузка проектов
  useEffect(() => {
    if (!userId || !open) {
      setProjects([]);
      return;
    }

    setIsLoadingProjects(true);
    setProjectsError(null);

    const unsubscribe = subscribeToProjects(userId, (loadedProjects) => {
      setProjects(loadedProjects);
      setIsLoadingProjects(false);
      console.log('📁 Projects loaded:', loadedProjects.length);
    });

    return () => {
      unsubscribe();
      setIsLoadingProjects(false);
    };
  }, [userId, open]);

  // Загрузка всех смет
  useEffect(() => {
    loadAllEstimates();
  }, [loadAllEstimates]);

  // Загрузка задач для выбранного проекта
  useEffect(() => {
    if (!userId || !selectedProjectId || !open) {
      setTasks([]);
      return;
    }

    setIsLoadingTasks(true);
    setTasksError(null);

    const unsubscribe = getTasksStream(userId, (loadedTasks) => {
      setTasks(loadedTasks);
      setIsLoadingTasks(false);
      console.log('📋 Tasks loaded:', loadedTasks.length, 'for project:', selectedProjectId);
    }, selectedProjectId);

    return () => {
      unsubscribe();
      setIsLoadingTasks(false);
    };
  }, [userId, selectedProjectId, open]);

  // Фильтрация смет для выбранного проекта
  const projectEstimates = useMemo(() => {
    if (!selectedProjectId) return [];
    return allEstimates.filter(estimate => estimate.projectId === selectedProjectId);
  }, [allEstimates, selectedProjectId]);

  // Обновление смет для проекта
  useEffect(() => {
    setEstimates(projectEstimates);
  }, [projectEstimates]);

  // Actions
  const refetchEstimates = useCallback(async () => {
    await loadAllEstimates();
  }, [loadAllEstimates]);

  const clearData = useCallback(() => {
    setProjects([]);
    setTasks([]);
    setEstimates([]);
    setAllEstimates([]);
    setProjectsError(null);
    setTasksError(null);
    setEstimatesError(null);
  }, []);

  return {
    // Data
    projects,
    tasks,
    estimates,
    allEstimates,
    
    // Loading states
    isLoadingProjects,
    isLoadingTasks,
    isLoadingEstimates,
    
    // Errors
    projectsError,
    tasksError,
    estimatesError,
    
    // Actions
    refetchEstimates,
    clearData
  };
};

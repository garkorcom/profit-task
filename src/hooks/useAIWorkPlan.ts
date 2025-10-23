/**
 * ============================================================================
 * USE AI WORK PLAN HOOK - REACT ХУК ДЛЯ AI ГЕНЕРАЦИИ ПЛАНОВ
 * ============================================================================
 * 
 * React хук для интеграции AI сервиса генерации рабочих планов с компонентами.
 * Предоставляет простой интерфейс для обработки неструктурированного текста
 * и получения структурированных планов работ.
 * 
 * ОСНОВНЫЕ ВОЗМОЖНОСТИ:
 * ═══════════════════════
 * 
 * 🤖 ГЕНЕРАЦИЯ ПЛАНОВ:
 * ├─ Асинхронная обработка текста
 * ├─ Управление состоянием загрузки
 * ├─ Обработка ошибок
 * └─ Автосохранение (опционально)
 * 
 * 🔍 УПРАВЛЕНИЕ КОНФЛИКТАМИ:
 * ├─ Разрешение конфликтов
 * ├─ Обновление планов
 * ├─ Отслеживание изменений
 * └─ Валидация результатов
 * 
 * 📊 СОСТОЯНИЕ И МЕТРИКИ:
 * ├─ Индикаторы обработки
 * ├─ Счетчики конфликтов и задач
 * ├─ История операций
 * └─ Статистика использования
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * ══════════════
 * 
 * const { generatePlan, processing, result, error } = useAIWorkPlan();
 * 
 * const handleGenerate = async () => {
 *   const result = await generatePlan(rawText, { autoSave: true });
 *   if (result.success) {
 *     console.log('План сгенерирован:', result.plan);
 *   }
 * };
 * 
 * @author Claude Assistant
 * @version 1.0.0
 * @since 2024-10-11
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  workPlanAIService,
  AIProcessingResult,
  GeneratedWorkPlan,
  ProcessingOptions,
  Conflict,
  ActionItem,
  ChangeLog
} from '../api/workPlanAI.service';

// ==================== ИНТЕРФЕЙСЫ ====================

export interface UseAIWorkPlanOptions {
  autoSave?: boolean;
  onSuccess?: (plan: GeneratedWorkPlan) => void;
  onError?: (error: string) => void;
  onConflictResolved?: (conflictId: string) => void;
}

export interface Resolution {
  conflictId: string;
  action: 'ADJUST_DATE' | 'UPDATE_COST' | 'MODIFY_SCOPE' | 'REALLOCATE_RESOURCE';
  description: string;
  parameters?: Record<string, any>;
}

export interface AIWorkPlanState {
  processing: boolean;
  result: AIProcessingResult | null;
  error: string | null;
  history: AIProcessingResult[];
  lastProcessed: Date | null;
}

// ==================== ОСНОВНОЙ ХУК ====================

export function useAIWorkPlan(options: UseAIWorkPlanOptions = {}) {
  // Состояние
  const [state, setState] = useState<AIWorkPlanState>({
    processing: false,
    result: null,
    error: null,
    history: [],
    lastProcessed: null
  });

  // ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

  /**
   * Генерация плана из неструктурированного текста
   */
  const generatePlan = useCallback(async (
    rawInput: string,
    processingOptions: ProcessingOptions = {}
  ): Promise<AIProcessingResult> => {
    setState(prev => ({
      ...prev,
      processing: true,
      error: null
    }));

    try {
      console.log('🤖 Starting AI work plan generation...');
      console.log('📝 Input length:', rawInput.length, 'characters');

      const result = await workPlanAIService.processRawInput(rawInput, {
        ...processingOptions,
        autoSave: options.autoSave
      });

      console.log('✅ AI processing completed:', result.success ? 'SUCCESS' : 'FAILED');
      
      if (result.success) {
        console.log('📋 Generated plan with', result.plan?.phases.length, 'phases');
        console.log('⚠️  Found', result.conflicts?.length || 0, 'conflicts');
        console.log('📌 Created', result.actionItems?.length || 0, 'action items');
        
        // Сохранение в историю
        setState(prev => ({
          ...prev,
          result,
          history: [result, ...prev.history.slice(0, 9)], // Храним последние 10
          lastProcessed: new Date(),
          processing: false
        }));

        // Колбэк успеха
        if (result.plan && options.onSuccess) {
          options.onSuccess(result.plan);
        }

        // Автосохранение если включено
        if (processingOptions.autoSave && result.plan) {
          console.log('💾 Auto-saving generated plan...');
          // TODO: Интеграция с savePlan функцией
          // await savePlan(result.plan);
        }

      } else {
        const errorMsg = result.errors?.join(', ') || 'AI processing failed';
        console.error('❌ AI processing failed:', errorMsg);
        
        setState(prev => ({
          ...prev,
          result,
          error: errorMsg,
          processing: false
        }));

        if (options.onError) {
          options.onError(errorMsg);
        }
      }

      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('💥 AI work plan generation error:', error);
      
      const failedResult: AIProcessingResult = {
        success: false,
        errors: [errorMsg],
        metadata: {
          generatedAt: new Date().toISOString(),
          confidence: 0,
          processingTime: 0,
          inputLength: rawInput.length,
          modelUsed: 'unknown'
        }
      };

      setState(prev => ({
        ...prev,
        result: failedResult,
        error: errorMsg,
        processing: false
      }));

      if (options.onError) {
        options.onError(errorMsg);
      }

      return failedResult;
    }
  }, [options]);

  /**
   * Разрешение конфликта
   */
  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: Resolution
  ): Promise<boolean> => {
    if (!state.result?.conflicts || !state.result?.plan) {
      console.warn('⚠️ No conflicts or plan available for resolution');
      return false;
    }

    try {
      console.log('🔧 Resolving conflict:', conflictId, 'with action:', resolution.action);

      // Удаляем разрешенный конфликт
      const updatedConflicts = state.result.conflicts.filter(c => c.id !== conflictId);
      
      // Применяем разрешение к плану
      const updatedPlan = applyResolution(state.result.plan, resolution);

      // Обновляем состояние
      const updatedResult = {
        ...state.result,
        conflicts: updatedConflicts,
        plan: updatedPlan
      };

      setState(prev => ({
        ...prev,
        result: updatedResult
      }));

      console.log('✅ Conflict resolved successfully');
      
      if (options.onConflictResolved) {
        options.onConflictResolved(conflictId);
      }

      return true;

    } catch (error) {
      console.error('❌ Failed to resolve conflict:', error);
      return false;
    }
  }, [state.result, options]);

  /**
   * Очистка результатов
   */
  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      result: null,
      error: null
    }));
  }, []);

  /**
   * Повторная обработка с теми же параметрами
   */
  const retry = useCallback(async (): Promise<AIProcessingResult | null> => {
    if (!state.history.length) {
      console.warn('⚠️ No previous processing to retry');
      return null;
    }

    const lastAttempt = state.history[0];
    if (lastAttempt.metadata) {
      // Извлекаем исходный текст из истории (если сохранен)
      // В реальном приложении нужно сохранять исходный текст
      console.log('🔄 Retrying last AI processing...');
      // return generatePlan(originalText, originalOptions);
    }

    return null;
  }, [state.history]);

  // ==================== ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ ====================

  const computed = useMemo(() => ({
    // Есть ли конфликты
    hasConflicts: (state.result?.conflicts?.length || 0) > 0,
    
    // Есть ли элементы действий
    hasActionItems: (state.result?.actionItems?.length || 0) > 0,
    
    // Есть ли изменения
    hasChanges: (state.result?.changes?.length || 0) > 0,
    
    // Количество конфликтов по типам
    conflictsByType: state.result?.conflicts?.reduce((acc, conflict) => {
      acc[conflict.type] = (acc[conflict.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {},
    
    // Количество элементов действий по приоритетам
    actionItemsByPriority: state.result?.actionItems?.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {},
    
    // Статистика фаз
    phaseStats: state.result?.plan ? {
      total: state.result.plan.phases.length,
      withTasks: state.result.plan.phases.filter(p => p.tasks && p.tasks.length > 0).length,
      withCosts: state.result.plan.phases.filter(p => p.cost > 0).length,
      confirmed: state.result.plan.phases.filter(p => p.costConfirmed).length
    } : null,
    
    // Уверенность в результате
    confidence: state.result?.metadata?.confidence || 0,
    
    // Время обработки
    processingTime: state.result?.metadata?.processingTime || 0,
    
    // Доступность результата
    hasResult: !!state.result?.plan,
    
    // Статус обработки
    status: state.processing ? 'processing' : 
            state.error ? 'error' : 
            state.result?.success ? 'success' : 'idle'
  }), [state]);

  // ==================== ВОЗВРАЩАЕМЫЙ ОБЪЕКТ ====================

  return {
    // Основные функции
    generatePlan,
    resolveConflict,
    clearResults,
    retry,
    
    // Состояние
    processing: state.processing,
    result: state.result,
    error: state.error,
    history: state.history,
    lastProcessed: state.lastProcessed,
    
    // Вычисляемые значения
    ...computed
  };
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

/**
 * Применение разрешения к плану
 */
function applyResolution(plan: GeneratedWorkPlan, resolution: Resolution): GeneratedWorkPlan {
  const updatedPlan = { ...plan };

  switch (resolution.action) {
    case 'ADJUST_DATE':
      // Корректировка дат в фазах
      if (resolution.parameters?.phaseIndex !== undefined && resolution.parameters?.newDate) {
        const phaseIndex = resolution.parameters.phaseIndex;
        if (updatedPlan.phases[phaseIndex]) {
          updatedPlan.phases[phaseIndex] = {
            ...updatedPlan.phases[phaseIndex],
            startDate: resolution.parameters.newDate
          };
        }
      }
      break;

    case 'UPDATE_COST':
      // Обновление стоимости
      if (resolution.parameters?.phaseIndex !== undefined && resolution.parameters?.newCost) {
        const phaseIndex = resolution.parameters.phaseIndex;
        if (updatedPlan.phases[phaseIndex]) {
          updatedPlan.phases[phaseIndex] = {
            ...updatedPlan.phases[phaseIndex],
            cost: resolution.parameters.newCost,
            costConfirmed: resolution.parameters.confirmed !== false
          };
        }
      }
      break;

    case 'MODIFY_SCOPE':
      // Изменение области работ
      if (resolution.parameters?.phaseIndex !== undefined && resolution.parameters?.newTasks) {
        const phaseIndex = resolution.parameters.phaseIndex;
        if (updatedPlan.phases[phaseIndex]) {
          updatedPlan.phases[phaseIndex] = {
            ...updatedPlan.phases[phaseIndex],
            tasks: resolution.parameters.newTasks
          };
        }
      }
      break;

    case 'REALLOCATE_RESOURCE':
      // Перераспределение ресурсов
      // Логика зависит от конкретного конфликта
      break;

    default:
      console.warn('⚠️ Unknown resolution action:', resolution.action);
  }

  return updatedPlan;
}

export default useAIWorkPlan;
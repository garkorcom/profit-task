/**
 * ============================================================================
 * WORK PLAN AI SERVICE - AI ГЕНЕРАЦИЯ РАБОЧИХ ПЛАНОВ
 * ============================================================================
 * 
 * Сервис для генерации структурированных рабочих планов из неструктурированного
 * текста с использованием Claude API. Интегрирован с существующей системой
 * Work Plans и использует anthropicApi.ts.
 * 
 * ОСНОВНЫЕ ФУНКЦИИ:
 * ═════════════════════
 * 
 * 🤖 ГЕНЕРАЦИЯ ПЛАНОВ:
 * ├─ Обработка неструктурированного текста
 * ├─ Извлечение фаз работ
 * ├─ Расчет стоимости с уровнем уверенности
 * └─ Детекция конфликтов и противоречий
 * 
 * 🔍 АНАЛИЗ ИЗМЕНЕНИЙ:
 * ├─ Сравнение с существующими планами
 * ├─ Выявление ключевых изменений
 * ├─ Отслеживание обновлений стоимости
 * └─ Создание логов изменений
 * 
 * 🚨 УПРАВЛЕНИЕ КОНФЛИКТАМИ:
 * ├─ Автоматическая детекция конфликтов
 * ├─ Предложения по разрешению
 * ├─ Оценка серьезности конфликтов
 * └─ Интеллектуальные рекомендации
 * 
 * 📊 КАЛЬКУЛЯЦИЯ СТОИМОСТИ:
 * ├─ Разделение подтвержденных/неподтвержденных затрат
 * ├─ Расчет итоговых сумм
 * ├─ Учет накладных расходов ГП
 * └─ Детализированная разбивка по категориям
 * 
 * @author Claude Assistant  
 * @version 1.0.0
 * @since 2024-10-11
 */

import { sendClaudeMessage, CLAUDE_MODELS, ClaudeModel } from './anthropicApi';

// ==================== ТИПЫ И ИНТЕРФЕЙСЫ ====================

export interface AIProcessingResult {
  success: boolean;
  plan?: GeneratedWorkPlan;
  changes?: ChangeLog[];
  conflicts?: Conflict[];
  actionItems?: ActionItem[];
  errors?: string[];
  metadata?: {
    generatedAt: string;
    confidence: number;
    processingTime: number;
    inputLength: number;
    modelUsed: string;
  };
}

export interface GeneratedWorkPlan {
  phases: WorkPlanPhase[];
  costSummary: CostSummary;
  excludedCosts: string[];
  keyChanges: string[];
  metadata: {
    generatedAt: string;
    confidence: number;
    processingTime: number;
    inputLength: number;
  };
}

export interface WorkPlanPhase {
  name: string;
  type: WorkPhaseType;
  tasks: WorkPlanTask[];
  cost: number;
  costConfirmed: boolean;
  startDate?: string;
  endDate?: string;
  inspections: string[];
  notes: string[];
  status: WorkStatus;
  dependencies?: string[];
  estimatedDuration?: number; // в днях
}

export interface WorkPlanTask {
  title: string;
  description?: string;
  estimatedHours?: number;
  assignedTo?: string;
  dependencies?: string[];
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'done';
}

export type WorkPhaseType = 
  | 'Preparation'
  | 'RoughIn' 
  | 'Trim'
  | 'Finish'
  | 'Inspection'
  | 'PunchList'
  | 'Other';

export type WorkStatus = 
  | 'Pending'
  | 'InProgress'
  | 'Done'
  | 'OnHold'
  | 'Blocked';

export interface Conflict {
  id: string;
  type: 'DATE' | 'COST' | 'SCOPE' | 'RESOURCE';
  description: string;
  items: string[];
  suggestedResolution?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  affectedPhases: string[];
}

export interface ActionItem {
  id: string;
  category: 'Cost' | 'Schedule' | 'Scope' | 'Resource';
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate?: string;
  assignedTo?: string;
}

export interface CostSummary {
  baseTotal: number;
  confirmedTotal: number;
  unconfirmedTotal: number;
  gcOverheadPercent?: number;
  finalTotal: number;
  breakdown: CostBreakdown[];
}

export interface CostBreakdown {
  category: string;
  amount: number;
  confirmed: boolean;
  notes?: string;
}

export interface ChangeLog {
  id: string;
  type: 'Added' | 'Modified' | 'Deleted';
  category: 'Phase' | 'Task' | 'Cost' | 'Timeline';
  description: string;
  oldValue?: any;
  newValue?: any;
  timestamp: string;
}

export interface ProcessingOptions {
  existingPlan?: any;
  detectChanges?: boolean;
  handleConflicts?: boolean;
  autoSave?: boolean;
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
  gcOverheadPercent?: number;
}

// ==================== AI PROCESSING SERVICE ====================

class WorkPlanAIService {
  private model: ClaudeModel = CLAUDE_MODELS.SONNET_NEW;
  
  private readonly systemPrompt = `
Ты - эксперт AI менеджер проектов для строительных и ремонтных работ.
Преобразуй неструктурированные заметки в структурированные данные рабочего плана.

ПРАВИЛА:
1. Извлекай фазы работ: Preparation|RoughIn|Trim|Finish|Inspection|PunchList
2. Определяй стоимость - помечай неточные как неподтвержденные
3. Выявляй конфликты и противоречия
4. Извлекай элементы действий, требующие решений
5. Рассчитывай итоги исключая неподтвержденные затраты
6. Форматируй даты как ISO строки
7. Группируй задачи логично по фазам
8. Определяй необходимые проверки

ФОРМАТ ВХОДНЫХ ДАННЫХ:
- Необработанные заметки, email'ы или списки задач
- Могут содержать противоречия
- Могут иметь неполные данные
- Могут включать обновления стоимости

ФОРМАТ ВЫВОДА (JSON):
{
  "phases": [
    {
      "name": "Название фазы",
      "type": "Preparation|RoughIn|Trim|Finish|Inspection|PunchList",
      "tasks": [{"title": "Задача", "description": "Детали"}],
      "cost": 0,
      "costConfirmed": true/false,
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD", 
      "inspections": ["Тип проверки"],
      "notes": ["Важные заметки"],
      "status": "Pending|InProgress|Done|OnHold|Blocked",
      "estimatedDuration": 0
    }
  ],
  "costSummary": {
    "baseTotal": 0,
    "confirmedTotal": 0,
    "unconfirmedTotal": 0,
    "gcOverheadPercent": 0,
    "finalTotal": 0,
    "breakdown": [
      {"category": "Электрика", "amount": 0, "confirmed": true}
    ]
  },
  "keyChanges": ["Описание изменений"],
  "actionItems": [
    {
      "category": "Cost|Schedule|Scope|Resource",
      "description": "Требуемое действие",
      "priority": "High|Medium|Low"
    }
  ],
  "conflicts": [
    {
      "type": "DATE|COST|SCOPE|RESOURCE",
      "description": "Описание конфликта",
      "items": ["Конфликтный элемент 1", "Конфликтный элемент 2"],
      "severity": "HIGH|MEDIUM|LOW",
      "affectedPhases": ["Название фазы"]
    }
  ],
  "excludedCosts": ["Неподтвержденные элементы"]
}

ДЕТЕКЦИЯ КОНФЛИКТОВ:
- Конфликты дат: пересекающиеся или невозможные временные рамки
- Конфликты стоимости: противоречивое ценообразование
- Конфликты области: противоречивые определения задач
- Конфликты ресурсов: избыточное распределение

ПРИМЕРЫ:
Вход: "Электромонтаж нужно сделать к пятнице, стоимость около 5000 но ждем финальную смету"
Выход: Фаза с costConfirmed: false, notes: ["Ждем финальную смету"]

Вход: "Начать каркас в понедельник но доставка пиломатериала в среду"
Выход: Конфликт type: "DATE", severity: "HIGH"

Отвечай ТОЛЬКО валидным JSON без дополнительного текста.
`;

  /**
   * Обработка неструктурированного входного текста
   */
  async processRawInput(input: string, options: ProcessingOptions = {}): Promise<AIProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Шаг 1: Валидация входных данных
      const validation = this.validateInput(input);
      if (!validation.valid) {
        return { 
          success: false, 
          errors: validation.errors,
          metadata: {
            generatedAt: new Date().toISOString(),
            confidence: 0,
            processingTime: Date.now() - startTime,
            inputLength: input.length,
            modelUsed: options.model || this.model
          }
        };
      }

      // Шаг 2: Предобработка текста
      const preprocessed = this.preprocessText(input);

      // Шаг 3: Вызов AI API
      const aiResponse = await this.callAI(preprocessed, options);

      // Шаг 4: Парсинг и валидация ответа
      const parsed = await this.parseAIResponse(aiResponse);

      // Шаг 5: Постобработка результатов
      const processed = this.postProcess(parsed, options);

      // Шаг 6: Детекция изменений при сравнении
      let changes: ChangeLog[] = [];
      if (options.existingPlan) {
        changes = this.detectChanges(options.existingPlan, processed.plan!);
      }

      const confidence = this.calculateConfidence(processed.plan!);
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        plan: processed.plan,
        changes,
        conflicts: processed.conflicts,
        actionItems: processed.actionItems,
        metadata: {
          generatedAt: new Date().toISOString(),
          confidence,
          processingTime,
          inputLength: input.length,
          modelUsed: options.model || this.model
        }
      };

    } catch (error) {
      console.error('❌ WorkPlan AI processing error:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown processing error'],
        metadata: {
          generatedAt: new Date().toISOString(),
          confidence: 0,
          processingTime: Date.now() - startTime,
          inputLength: input.length,
          modelUsed: options.model || this.model
        }
      };
    }
  }

  /**
   * Валидация входных данных
   */
  private validateInput(input: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input || input.trim().length === 0) {
      errors.push('Входные данные не могут быть пустыми');
    }

    if (input.length < 20) {
      errors.push('Входные данные слишком короткие для анализа');
    }

    if (input.length > 10000) {
      errors.push('Входные данные слишком длинные (максимум 10000 символов)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Предобработка текста
   */
  private preprocessText(input: string): string {
    return input
      .trim()
      .replace(/\s+/g, ' ') // Нормализация пробелов
      .replace(/\n\s*\n/g, '\n') // Удаление множественных переносов строк
      .substring(0, 8000); // Ограничение длины для API
  }

  /**
   * Вызов AI API с повторными попытками
   */
  private async callAI(input: string, options: ProcessingOptions = {}): Promise<string> {
    const maxRetries = 3;
    let attempt = 0;
    const model = options.model || this.model;

    while (attempt < maxRetries) {
      try {
        const response = await sendClaudeMessage({
          model,
          messages: [
            { role: 'user', content: input }
          ],
          systemPrompt: this.systemPrompt,
          maxTokens: options.maxTokens || 4000,
          temperature: options.temperature || 0.3
        });

        return response.content;

      } catch (error) {
        attempt++;
        console.warn(`🔄 AI API attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Экспоненциальная задержка
        await this.delay(1000 * Math.pow(2, attempt - 1));
      }
    }

    throw new Error('All AI API attempts failed');
  }

  /**
   * Парсинг ответа AI
   */
  private async parseAIResponse(response: string): Promise<{
    plan: GeneratedWorkPlan;
    conflicts: Conflict[];
    actionItems: ActionItem[];
  }> {
    try {
      // Очистка ответа от возможного мусора
      let cleanResponse = response.trim();
      
      // Удаление markdown форматирования если есть
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanResponse);

      // Валидация структуры
      if (!parsed.phases || !Array.isArray(parsed.phases)) {
        throw new Error('Invalid response structure: missing phases array');
      }

      // Добавляем уникальные ID для конфликтов и элементов действий
      const conflicts: Conflict[] = (parsed.conflicts || []).map((conflict: any, index: number) => ({
        id: `conflict-${Date.now()}-${index}`,
        ...conflict
      }));

      const actionItems: ActionItem[] = (parsed.actionItems || []).map((item: any, index: number) => ({
        id: `action-${Date.now()}-${index}`,
        ...item
      }));

      const plan: GeneratedWorkPlan = {
        phases: parsed.phases,
        costSummary: parsed.costSummary || {
          baseTotal: 0,
          confirmedTotal: 0,
          unconfirmedTotal: 0,
          finalTotal: 0,
          breakdown: []
        },
        excludedCosts: parsed.excludedCosts || [],
        keyChanges: parsed.keyChanges || [],
        metadata: {
          generatedAt: new Date().toISOString(),
          confidence: 0, // Будет рассчитан позже
          processingTime: 0, // Будет рассчитан позже
          inputLength: 0 // Будет установлен позже
        }
      };

      return { plan, conflicts, actionItems };

    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Постобработка результатов
   */
  private postProcess(parsed: {
    plan: GeneratedWorkPlan;
    conflicts: Conflict[];
    actionItems: ActionItem[];
  }, options: ProcessingOptions): {
    plan: GeneratedWorkPlan;
    conflicts: Conflict[];
    actionItems: ActionItem[];
  } {
    // Пересчет стоимости с проверкой
    const recalculatedCosts = this.recalculateCosts(parsed.plan.phases, options.gcOverheadPercent || 0);
    parsed.plan.costSummary = recalculatedCosts;

    // Сортировка конфликтов по серьезности
    parsed.conflicts.sort((a, b) => {
      const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    // Сортировка элементов действий по приоритету
    parsed.actionItems.sort((a, b) => {
      const priorityOrder = { High: 3, Medium: 2, Low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return parsed;
  }

  /**
   * Детекция изменений
   */
  private detectChanges(oldPlan: any, newPlan: GeneratedWorkPlan): ChangeLog[] {
    const changes: ChangeLog[] = [];
    const timestamp = new Date().toISOString();

    // Простая детекция изменений - можно расширить
    if (oldPlan.phases && newPlan.phases) {
      // Изменения в количестве фаз
      if (oldPlan.phases.length !== newPlan.phases.length) {
        changes.push({
          id: `change-${Date.now()}-phases`,
          type: 'Modified',
          category: 'Phase',
          description: `Количество фаз изменилось с ${oldPlan.phases.length} на ${newPlan.phases.length}`,
          oldValue: oldPlan.phases.length,
          newValue: newPlan.phases.length,
          timestamp
        });
      }

      // Изменения в стоимости
      const oldTotal = oldPlan.costSummary?.finalTotal || 0;
      const newTotal = newPlan.costSummary.finalTotal;
      if (Math.abs(oldTotal - newTotal) > 0.01) {
        changes.push({
          id: `change-${Date.now()}-cost`,
          type: 'Modified',
          category: 'Cost',
          description: `Общая стоимость изменилась с ${oldTotal} на ${newTotal}`,
          oldValue: oldTotal,
          newValue: newTotal,
          timestamp
        });
      }
    }

    return changes;
  }

  /**
   * Пересчет стоимости
   */
  private recalculateCosts(phases: WorkPlanPhase[], gcOverheadPercent?: number): CostSummary {
    const confirmed = phases
      .filter(p => p.costConfirmed)
      .reduce((sum, p) => sum + (p.cost || 0), 0);

    const unconfirmed = phases
      .filter(p => !p.costConfirmed)
      .reduce((sum, p) => sum + (p.cost || 0), 0);

    const baseTotal = confirmed;
    const withOverhead = gcOverheadPercent 
      ? baseTotal * (1 + gcOverheadPercent / 100)
      : baseTotal;

    // Создание разбивки по категориям
    const breakdown: CostBreakdown[] = [];
    const categories = new Map<string, { amount: number; confirmed: boolean }>();

    phases.forEach(phase => {
      const category = this.getCostCategory(phase.type);
      const existing = categories.get(category) || { amount: 0, confirmed: true };
      
      existing.amount += phase.cost || 0;
      existing.confirmed = existing.confirmed && phase.costConfirmed;
      
      categories.set(category, existing);
    });

    categories.forEach((data, category) => {
      breakdown.push({
        category,
        amount: data.amount,
        confirmed: data.confirmed
      });
    });

    return {
      baseTotal,
      confirmedTotal: confirmed,
      unconfirmedTotal: unconfirmed,
      gcOverheadPercent,
      finalTotal: withOverhead,
      breakdown
    };
  }

  /**
   * Получение категории стоимости по типу фазы
   */
  private getCostCategory(phaseType: WorkPhaseType): string {
    const categoryMap: Record<WorkPhaseType, string> = {
      'Preparation': 'Подготовительные работы',
      'RoughIn': 'Черновые работы', 
      'Trim': 'Отделочные работы',
      'Finish': 'Финишные работы',
      'Inspection': 'Проверки и контроль',
      'PunchList': 'Исправления',
      'Other': 'Прочие работы'
    };

    return categoryMap[phaseType] || 'Прочие работы';
  }

  /**
   * Расчет уверенности в результате
   */
  private calculateConfidence(plan: GeneratedWorkPlan): number {
    let score = 50; // Базовый скор

    // Бонус за наличие подтвержденных затрат
    const confirmedRatio = plan.costSummary.confirmedTotal / 
      (plan.costSummary.confirmedTotal + plan.costSummary.unconfirmedTotal);
    score += confirmedRatio * 30;

    // Бонус за детализированные фазы
    const avgTasksPerPhase = plan.phases.reduce((sum, p) => sum + (p.tasks?.length || 0), 0) / 
      plan.phases.length;
    score += Math.min(avgTasksPerPhase * 5, 20);

    // Штраф за конфликты (будет учтен в вызывающем коде)

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Задержка для повторных попыток
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== ЭКСПОРТ ====================

export const workPlanAIService = new WorkPlanAIService();

export default workPlanAIService;
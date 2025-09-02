// Anthropic Claude API интеграция для бизнес-приложения
import Anthropic from '@anthropic-ai/sdk';

// Инициализация клиента Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.REACT_APP_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true, // Только для development
});

// Доступные модели Claude
export const CLAUDE_MODELS = {
  OPUS: 'claude-3-opus-20240229', // Стабильная мощная модель
  SONNET: 'claude-3-5-sonnet-20241022', // Deprecated но оставляем
  SONNET_NEW: 'claude-3-5-sonnet-20241022', // Используем ту же что работала
  HAIKU: 'claude-3-haiku-20240307', // Проверенная быстрая модель
  HAIKU_NEW: 'claude-3-haiku-20240307' // Дублируем стабильную
} as const;

export type ClaudeModel = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS];

// Интерфейсы для работы с Claude
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeRequest {
  model: ClaudeModel;
  messages: ClaudeMessage[];
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface ClaudeResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Отправить сообщение в Claude API
 * @param request - Параметры запроса
 * @returns Ответ от Claude
 */
export const sendClaudeMessage = async (request: ClaudeRequest): Promise<ClaudeResponse> => {
  try {
    const response = await anthropic.messages.create({
      model: request.model,
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
      system: request.systemPrompt,
      messages: request.messages,
    });

    // Извлекаем текст из ответа
    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');

    return {
      content,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      }
    };
  } catch (error) {
    console.error('Ошибка при обращении к Claude API:', error);
    throw new Error(`Claude API error: ${error}`);
  }
};

/**
 * Анализ проекта с помощью Claude
 * @param projectData - Данные проекта
 * @param model - Модель Claude для использования
 * @returns Анализ и рекомендации
 */
export const analyzeProjectWithClaude = async (
  projectData: {
    name: string;
    description: string;
    budget?: number;
    timeline?: string;
    tasks?: string[];
  },
  model: ClaudeModel = CLAUDE_MODELS.HAIKU
): Promise<string> => {
  const systemPrompt = `
Ты - эксперт по управлению проектами и бизнес-анализу. 
Проанализируй предоставленные данные проекта и дай рекомендации по:
1. Оптимизации бюджета
2. Управлению рисками
3. Планированию задач
4. KPI и метрикам успеха

Отвечай на русском языке, структурированно и практично.
`;

  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: `Проанализируй проект:
      
Название: ${projectData.name}
Описание: ${projectData.description}
Бюджет: ${projectData.budget ? `$${projectData.budget}` : 'Не указан'}
Временные рамки: ${projectData.timeline || 'Не указаны'}
Задачи: ${projectData.tasks?.join(', ') || 'Не указаны'}

Дай подробный анализ и рекомендации.`
    }
  ];

  const response = await sendClaudeMessage({
    model,
    messages,
    systemPrompt,
    maxTokens: 2000,
    temperature: 0.3
  });

  return response.content;
};

/**
 * Генерация сметы с помощью Claude
 * @param projectDescription - Описание проекта
 * @param model - Модель Claude
 * @returns Структурированная смета
 */
export interface GeneratedEstimate {
  sections: {
    name: string;
    items: {
      name: string;
      description: string;
      quantity: number;
      unit: string;
      rate: number;
      total: number;
    }[];
  }[];
  totalCost: number;
  recommendations: string[];
}

export const generateEstimateWithClaude = async (
  projectDescription: string,
  model: ClaudeModel = CLAUDE_MODELS.HAIKU
): Promise<GeneratedEstimate> => {
  const systemPrompt = `
Ты - эксперт по составлению смет и ценообразованию в строительстве и IT.
На основе описания проекта создай детальную смету в JSON формате.

Структура ответа:
{
  "sections": [
    {
      "name": "Название раздела",
      "items": [
        {
          "name": "Название работы/материала",
          "description": "Подробное описание",
          "quantity": число,
          "unit": "единица измерения",
          "rate": цена_за_единицу,
          "total": общая_стоимость
        }
      ]
    }
  ],
  "totalCost": общая_сумма,
  "recommendations": ["рекомендация1", "рекомендация2"]
}

Отвечай ТОЛЬКО валидным JSON без дополнительного текста.
`;

  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: `Создай смету для проекта: ${projectDescription}`
    }
  ];

  const response = await sendClaudeMessage({
    model,
    messages,
    systemPrompt,
    maxTokens: 3000,
    temperature: 0.2
  });

  try {
    return JSON.parse(response.content);
  } catch (error) {
    throw new Error('Не удалось распарсить ответ Claude как JSON');
  }
};

/**
 * Анализ задач и автоматическое планирование
 * @param tasks - Список задач
 * @param model - Модель Claude
 * @returns Оптимизированный план задач
 */
export const optimizeTasksWithClaude = async (
  tasks: Array<{
    name: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    estimatedHours?: number;
  }>,
  model: ClaudeModel = CLAUDE_MODELS.HAIKU
): Promise<{
  optimizedTasks: Array<{
    name: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    estimatedHours: number;
    dependencies: string[];
    phase: string;
  }>;
  timeline: string;
  risks: string[];
}> => {
  const systemPrompt = `
Ты - эксперт по планированию проектов и управлению задачами.
Проанализируй список задач и создай оптимизированный план с учетом:
- Зависимостей между задачами
- Приоритизации
- Оценки времени
- Группировки по фазам
- Выявления рисков

Отвечай в JSON формате.
`;

  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: `Оптимизируй план задач: ${JSON.stringify(tasks, null, 2)}`
    }
  ];

  const response = await sendClaudeMessage({
    model,
    messages,
    systemPrompt,
    maxTokens: 2000,
    temperature: 0.3
  });

  try {
    return JSON.parse(response.content);
  } catch (error) {
    throw new Error('Не удалось распарсить план задач от Claude');
  }
};

/**
 * Проверить доступность Claude API
 * @returns Статус подключения
 */
export const testClaudeConnection = async (): Promise<{
  connected: boolean;
  model: string;
  error?: string;
}> => {
  try {
    const response = await sendClaudeMessage({
      model: CLAUDE_MODELS.HAIKU, // Используем стабильную быструю модель для теста
      messages: [{ role: 'user', content: 'Привет! Ответь одним словом: работает' }],
      maxTokens: 10
    });

    return {
      connected: true,
      model: CLAUDE_MODELS.HAIKU,
    };
  } catch (error) {
    return {
      connected: false,
      model: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export default anthropic;
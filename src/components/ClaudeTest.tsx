import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  Assessment as AssessmentIcon,
  Construction as ConstructionIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import {
  sendClaudeMessage,
  analyzeProjectWithClaude,
  generateEstimateWithClaude,
  optimizeTasksWithClaude,
  testClaudeConnection,
  CLAUDE_MODELS,
  ClaudeModel,
  type GeneratedEstimate
} from '../api/anthropicApi';

const ClaudeTest: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<ClaudeModel>(CLAUDE_MODELS.HAIKU);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    model?: string;
    error?: string;
  } | null>(null);

  // Состояния для разных функций
  const [projectAnalysis, setProjectAnalysis] = useState('');
  const [generatedEstimate, setGeneratedEstimate] = useState<GeneratedEstimate | null>(null);
  const [optimizedTasks, setOptimizedTasks] = useState<any>(null);

  // Тестирование подключения
  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const status = await testClaudeConnection();
      setConnectionStatus(status);
    } catch (error) {
      setConnectionStatus({
        connected: false,
        error: error instanceof Error ? error.message : 'Ошибка подключения'
      });
    }
    setLoading(false);
  };

  // Отправка произвольного сообщения
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    setResponse('');
    
    try {
      const result = await sendClaudeMessage({
        model: selectedModel,
        messages: [{ role: 'user', content: message }],
        maxTokens: 1000
      });
      
      setResponse(result.content);
    } catch (error) {
      setResponse(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
    
    setLoading(false);
  };

  // Анализ проекта
  const handleAnalyzeProject = async () => {
    setLoading(true);
    setProjectAnalysis('');
    
    const sampleProject = {
      name: 'Мобильное приложение для доставки',
      description: 'Разработка iOS/Android приложения для заказа и доставки еды с интеграцией платежей и геолокации',
      budget: 500000,
      timeline: '3 месяца',
      tasks: ['UI/UX дизайн', 'Frontend разработка', 'Backend API', 'Интеграция платежей', 'Тестирование']
    };
    
    try {
      const analysis = await analyzeProjectWithClaude(sampleProject, selectedModel);
      setProjectAnalysis(analysis);
    } catch (error) {
      setProjectAnalysis(`Ошибка анализа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
    
    setLoading(false);
  };

  // Генерация сметы
  const handleGenerateEstimate = async () => {
    setLoading(true);
    setGeneratedEstimate(null);
    
    const projectDescription = 'Создание веб-сайта для небольшой компании: дизайн, верстка, CMS, SEO оптимизация';
    
    try {
      const estimate = await generateEstimateWithClaude(projectDescription, selectedModel);
      setGeneratedEstimate(estimate);
    } catch (error) {
      console.error('Ошибка генерации сметы:', error);
    }
    
    setLoading(false);
  };

  // Оптимизация задач
  const handleOptimizeTasks = async () => {
    setLoading(true);
    setOptimizedTasks(null);
    
    const sampleTasks = [
      { name: 'Создание дизайна', priority: 'high' as const, estimatedHours: 40 },
      { name: 'Frontend разработка', priority: 'high' as const, estimatedHours: 80 },
      { name: 'Backend API', priority: 'medium' as const, estimatedHours: 60 },
      { name: 'Тестирование', priority: 'medium' as const, estimatedHours: 20 },
      { name: 'Деплой', priority: 'low' as const, estimatedHours: 8 }
    ];
    
    try {
      const optimized = await optimizeTasksWithClaude(sampleTasks, selectedModel);
      setOptimizedTasks(optimized);
    } catch (error) {
      console.error('Ошибка оптимизации задач:', error);
    }
    
    setLoading(false);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        🤖 Claude API Тестирование
      </Typography>

      {/* Статус подключения */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="outlined" onClick={handleTestConnection} disabled={loading}>
              Проверить подключение
            </Button>
            {connectionStatus && (
              <Chip 
                label={connectionStatus.connected ? 'Подключено' : 'Ошибка'}
                color={connectionStatus.connected ? 'success' : 'error'}
              />
            )}
            {connectionStatus?.error && (
              <Alert severity="error" sx={{ flex: 1 }}>
                {connectionStatus.error}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Выбор модели */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <FormControl fullWidth>
            <InputLabel>Модель Claude</InputLabel>
            <Select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as ClaudeModel)}
              label="Модель Claude"
            >
              <MenuItem value={CLAUDE_MODELS.HAIKU}>
                Claude 3 Haiku (рекомендуется - стабильная) ⭐
              </MenuItem>
              <MenuItem value={CLAUDE_MODELS.OPUS}>
                Claude 3 Opus (мощная, медленная)
              </MenuItem>
              <MenuItem value={CLAUDE_MODELS.SONNET}>
                Claude 3.5 Sonnet (может не работать) ⚠️
              </MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Произвольное сообщение */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <PsychologyIcon sx={{ mr: 1 }} />
          <Typography>Произвольное сообщение</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <TextField
              multiline
              rows={3}
              fullWidth
              label="Сообщение для Claude"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Например: Напиши план развития бизнеса для кафе"
            />
            <Button 
              variant="contained" 
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
            >
              {loading ? <CircularProgress size={20} /> : 'Отправить'}
            </Button>
            {response && (
              <Alert severity="info">
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {response}
                </Typography>
              </Alert>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Анализ проекта */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <AssessmentIcon sx={{ mr: 1 }} />
          <Typography>Анализ проекта</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Button 
              variant="contained" 
              onClick={handleAnalyzeProject}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Проанализировать тестовый проект'}
            </Button>
            {projectAnalysis && (
              <Alert severity="success">
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {projectAnalysis}
                </Typography>
              </Alert>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Генерация сметы */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <ConstructionIcon sx={{ mr: 1 }} />
          <Typography>Генерация сметы</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Button 
              variant="contained" 
              onClick={handleGenerateEstimate}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Сгенерировать смету веб-сайта'}
            </Button>
            {generatedEstimate && (
              <Alert severity="success">
                <Typography variant="h6" mb={2}>
                  💰 Общая стоимость: ${generatedEstimate.totalCost.toLocaleString()}
                </Typography>
                {generatedEstimate.sections.map((section, sectionIndex) => (
                  <Box key={sectionIndex} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {section.name}
                    </Typography>
                    {section.items.map((item, itemIndex) => (
                      <Box key={itemIndex} sx={{ ml: 2, mb: 1 }}>
                        <Typography variant="body2">
                          <strong>{item.name}</strong> - {item.quantity} {item.unit} × ${item.rate} = ${item.total}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.description}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ))}
                <Typography variant="subtitle2" mt={2}>
                  📋 Рекомендации:
                </Typography>
                {generatedEstimate.recommendations.map((rec, index) => (
                  <Typography key={index} variant="body2" sx={{ ml: 1 }}>
                    • {rec}
                  </Typography>
                ))}
              </Alert>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Оптимизация задач */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <ScheduleIcon sx={{ mr: 1 }} />
          <Typography>Оптимизация задач</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Button 
              variant="contained" 
              onClick={handleOptimizeTasks}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Оптимизировать план задач'}
            </Button>
            {optimizedTasks && (
              <Alert severity="success">
                <Typography variant="h6" mb={2}>📅 Оптимизированный план</Typography>
                <Typography variant="subtitle2">⏱️ Временные рамки:</Typography>
                <Typography variant="body2" mb={2}>{optimizedTasks.timeline}</Typography>
                
                <Typography variant="subtitle2">📋 Задачи:</Typography>
                {optimizedTasks.optimizedTasks?.map((task: any, index: number) => (
                  <Box key={index} sx={{ ml: 1, mb: 1 }}>
                    <Typography variant="body2">
                      <Chip label={task.priority} size="small" color={
                        task.priority === 'high' ? 'error' : 
                        task.priority === 'medium' ? 'warning' : 'default'
                      } sx={{ mr: 1 }} />
                      <strong>{task.name}</strong> ({task.estimatedHours}ч)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Фаза: {task.phase} | Зависимости: {task.dependencies?.join(', ') || 'Нет'}
                    </Typography>
                  </Box>
                ))}
                
                <Typography variant="subtitle2" mt={2}>⚠️ Риски:</Typography>
                {optimizedTasks.risks?.map((risk: string, index: number) => (
                  <Typography key={index} variant="body2" sx={{ ml: 1 }}>
                    • {risk}
                  </Typography>
                ))}
              </Alert>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>⚠️ Важно:</strong> Для работы с Claude API нужно добавить REACT_APP_ANTHROPIC_API_KEY в .env.local файл.
          Получить ключ можно на <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>
        </Typography>
      </Alert>
    </Box>
  );
};

export default ClaudeTest;
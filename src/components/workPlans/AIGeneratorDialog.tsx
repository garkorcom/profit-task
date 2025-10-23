/**
 * ============================================================================
 * AI GENERATOR DIALOG - ДИАЛОГ AI ГЕНЕРАЦИИ РАБОЧИХ ПЛАНОВ
 * ============================================================================
 * 
 * Диалоговый компонент для генерации рабочих планов из неструктурированного
 * текста с использованием AI. Предоставляет интуитивный интерфейс для ввода
 * заметок, настройки параметров и просмотра результатов.
 * 
 * ОСНОВНЫЕ ВОЗМОЖНОСТИ:
 * ═══════════════════════
 * 
 * 📝 ВВОД ДАННЫХ:
 * ├─ Текстовое поле для заметок/описаний
 * ├─ Поддержка больших объемов текста
 * ├─ Примеры и подсказки для пользователя
 * └─ Валидация входных данных
 * 
 * ⚙️  НАСТРОЙКИ ОБРАБОТКИ:
 * ├─ Выбор модели AI (Haiku/Sonnet/Opus)
 * ├─ Настройки обнаружения изменений
 * ├─ Управление конфликтами
 * └─ Автосохранение результатов
 * 
 * 📊 ПРЕДВАРИТЕЛЬНЫЙ ПРОСМОТР:
 * ├─ Структурированный план работ
 * ├─ Список конфликтов с деталями
 * ├─ Элементы действий по приоритетам
 * └─ Сводка по стоимости
 * 
 * 🎯 УПРАВЛЕНИЕ КОНФЛИКТАМИ:
 * ├─ Визуализация найденных конфликтов
 * ├─ Предложения по разрешению
 * ├─ Интерактивное разрешение
 * └─ Отслеживание статуса
 * 
 * @author Claude Assistant
 * @version 1.0.0
 * @since 2024-10-11
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  LinearProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as TaskIcon,
  AttachMoney as CostIcon,
  Schedule as TimeIcon,
  Psychology as AIIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material';

import { useAIWorkPlan } from '../../hooks/useAIWorkPlan';
import { CLAUDE_MODELS, ClaudeModel } from '../../api/anthropicApi';
import { 
  GeneratedWorkPlan, 
  Conflict, 
  ActionItem,
  ProcessingOptions 
} from '../../api/workPlanAI.service';

// ==================== ИНТЕРФЕЙСЫ ====================

export interface AIGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (plan: GeneratedWorkPlan) => void;
  existingPlan?: any;
  defaultInput?: string;
}

interface GenerationSettings {
  model: ClaudeModel;
  detectChanges: boolean;
  handleConflicts: boolean;
  autoSave: boolean;
  temperature: number;
  maxTokens: number;
}

// ==================== ОСНОВНОЙ КОМПОНЕНТ ====================

export const AIGeneratorDialog: React.FC<AIGeneratorDialogProps> = ({
  open,
  onClose,
  onGenerate,
  existingPlan,
  defaultInput = ''
}) => {
  // Состояние
  const [input, setInput] = useState(defaultInput);
  const [settings, setSettings] = useState<GenerationSettings>({
    model: CLAUDE_MODELS.SONNET_NEW,
    detectChanges: !!existingPlan,
    handleConflicts: true,
    autoSave: false,
    temperature: 0.3,
    maxTokens: 4000
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // AI хук
  const {
    generatePlan,
    resolveConflict,
    processing,
    result,
    error,
    hasConflicts,
    hasActionItems,
    conflictsByType,
    actionItemsByPriority,
    phaseStats,
    confidence,
    processingTime,
    clearResults
  } = useAIWorkPlan({
    autoSave: settings.autoSave,
    onSuccess: (plan) => {
      console.log('✅ Plan generated successfully:', plan);
    },
    onError: (error) => {
      console.error('❌ Generation failed:', error);
    }
  });

  // ==================== ОБРАБОТЧИКИ ====================

  /**
   * Генерация плана
   */
  const handleGenerate = useCallback(async () => {
    if (!input.trim()) {
      return;
    }

    const options: ProcessingOptions = {
      model: settings.model,
      detectChanges: settings.detectChanges,
      handleConflicts: settings.handleConflicts,
      autoSave: settings.autoSave,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      existingPlan: existingPlan
    };

    const result = await generatePlan(input, options);
    
    if (result.success && result.plan) {
      // Если нет конфликтов, сразу передаем план
      if (!hasConflicts) {
        onGenerate(result.plan);
      }
    }
  }, [input, settings, existingPlan, generatePlan, hasConflicts, onGenerate]);

  /**
   * Принятие плана с конфликтами
   */
  const handleAcceptWithConflicts = useCallback(() => {
    if (result?.plan) {
      onGenerate(result.plan);
    }
  }, [result, onGenerate]);

  /**
   * Обновление настроек
   */
  const updateSettings = useCallback((updates: Partial<GenerationSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Сброс формы
   */
  const handleReset = useCallback(() => {
    setInput(defaultInput);
    clearResults();
  }, [defaultInput, clearResults]);

  // Сброс при закрытии
  useEffect(() => {
    if (!open) {
      setInput(defaultInput);
      clearResults();
    }
  }, [open, defaultInput, clearResults]);

  // ==================== ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ====================

  /**
   * Предварительный просмотр плана
   */
  const WorkPlanPreview: React.FC<{ plan: GeneratedWorkPlan }> = ({ plan }) => (
    <Card elevation={1}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <TaskIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Сгенерированный план</Typography>
          <Chip 
            label={`${confidence.toFixed(0)}% уверенности`}
            color={confidence > 80 ? 'success' : confidence > 60 ? 'warning' : 'error'}
            size="small"
            sx={{ ml: 'auto' }}
          />
        </Box>

        {/* Статистика */}
        {phaseStats && (
          <Grid container spacing={2} mb={2}>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">Фазы</Typography>
              <Typography variant="h6">{phaseStats.total}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">С задачами</Typography>
              <Typography variant="h6">{phaseStats.withTasks}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">Со стоимостью</Typography>
              <Typography variant="h6">{phaseStats.withCosts}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">Подтверждено</Typography>
              <Typography variant="h6">{phaseStats.confirmed}</Typography>
            </Grid>
          </Grid>
        )}

        {/* Стоимость */}
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            <CostIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            Стоимость
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                Подтверждено: ₽{plan.costSummary.confirmedTotal.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                Неподтверждено: ₽{plan.costSummary.unconfirmedTotal.toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
          <Typography variant="h6" color="primary">
            Итого: ₽{plan.costSummary.finalTotal.toLocaleString()}
          </Typography>
        </Box>

        {/* Фазы */}
        <Typography variant="subtitle2" gutterBottom>
          Фазы работ:
        </Typography>
        <List dense>
          {plan.phases.slice(0, 3).map((phase, index) => (
            <ListItem key={index} disablePadding>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckCircleIcon 
                  color={phase.costConfirmed ? 'success' : 'warning'} 
                  fontSize="small" 
                />
              </ListItemIcon>
              <ListItemText
                primary={phase.name}
                secondary={`${phase.tasks?.length || 0} задач, ₽${phase.cost?.toLocaleString() || 0}`}
              />
            </ListItem>
          ))}
          {plan.phases.length > 3 && (
            <ListItem disablePadding>
              <ListItemText
                sx={{ pl: 4 }}
                secondary={`... и еще ${plan.phases.length - 3} фаз`}
              />
            </ListItem>
          )}
        </List>
      </CardContent>
    </Card>
  );

  /**
   * Список конфликтов
   */
  const ConflictsList: React.FC<{ conflicts: Conflict[] }> = ({ conflicts }) => (
    <Card elevation={1}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <WarningIcon color="warning" sx={{ mr: 1 }} />
          <Typography variant="h6">Обнаруженные конфликты</Typography>
          <Badge badgeContent={conflicts.length} color="warning" sx={{ ml: 'auto' }}>
            <ErrorIcon />
          </Badge>
        </Box>

        <List dense>
          {conflicts.map((conflict) => (
            <ListItem key={conflict.id} divider>
              <ListItemIcon>
                <ErrorIcon 
                  color={
                    conflict.severity === 'HIGH' ? 'error' : 
                    conflict.severity === 'MEDIUM' ? 'warning' : 
                    'info'
                  }
                  fontSize="small"
                />
              </ListItemIcon>
              <ListItemText
                primary={conflict.description}
                secondary={
                  <Box>
                    <Chip 
                      label={conflict.type} 
                      size="small" 
                      variant="outlined" 
                      sx={{ mr: 1, fontSize: '0.7rem' }}
                    />
                    <Chip 
                      label={conflict.severity} 
                      size="small"
                      color={
                        conflict.severity === 'HIGH' ? 'error' : 
                        conflict.severity === 'MEDIUM' ? 'warning' : 
                        'default'
                      }
                      sx={{ fontSize: '0.7rem' }}
                    />
                    {conflict.suggestedResolution && (
                      <Typography variant="caption" display="block" mt={0.5}>
                        💡 {conflict.suggestedResolution}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  /**
   * Список элементов действий
   */
  const ActionItemsList: React.FC<{ items: ActionItem[] }> = ({ items }) => (
    <Card elevation={1}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <TaskIcon color="info" sx={{ mr: 1 }} />
          <Typography variant="h6">Требуемые действия</Typography>
          <Badge badgeContent={items.length} color="info" sx={{ ml: 'auto' }}>
            <TaskIcon />
          </Badge>
        </Box>

        <List dense>
          {items.map((item) => (
            <ListItem key={item.id} divider>
              <ListItemIcon>
                <CheckCircleIcon 
                  color={
                    item.priority === 'High' ? 'error' : 
                    item.priority === 'Medium' ? 'warning' : 
                    'success'
                  }
                  fontSize="small"
                />
              </ListItemIcon>
              <ListItemText
                primary={item.description}
                secondary={
                  <Box>
                    <Chip 
                      label={item.category} 
                      size="small" 
                      variant="outlined" 
                      sx={{ mr: 1, fontSize: '0.7rem' }}
                    />
                    <Chip 
                      label={item.priority} 
                      size="small"
                      color={
                        item.priority === 'High' ? 'error' : 
                        item.priority === 'Medium' ? 'warning' : 
                        'success'
                      }
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  // ==================== РЕНДЕР ====================

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xl" 
      fullWidth
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <AIIcon color="primary" sx={{ mr: 1 }} />
          Генерация рабочего плана с помощью AI
          <Box ml="auto">
            <IconButton onClick={handleReset} size="small">
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {processing && (
          <Box mb={2}>
            <LinearProgress />
            <Typography variant="body2" color="textSecondary" mt={1}>
              🤖 AI обрабатывает ваши заметки...
            </Typography>
          </Box>
        )}

        <Grid container spacing={3} sx={{ height: '100%' }}>
          {/* Левая панель - ввод */}
          <Grid item xs={12} md={6}>
            <Box height="100%" display="flex" flexDirection="column">
              <TextField
                multiline
                rows={20}
                fullWidth
                label="Вставьте ваши заметки, сметы или логи"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Пример:
- Электромонтаж до пятницы
- Стоимость около 5000 рублей  
- Нужна проверка после
- Начать каркас в понедельник
- Доставка материала в среду`}
                variant="outlined"
                sx={{ flexGrow: 1 }}
              />

              {/* Настройки */}
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">
                    ⚙️ Настройки обработки
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Модель AI</InputLabel>
                        <Select
                          value={settings.model}
                          label="Модель AI"
                          onChange={(e) => updateSettings({ model: e.target.value as ClaudeModel })}
                        >
                          <MenuItem value={CLAUDE_MODELS.HAIKU}>
                            Haiku (быстро, экономно)
                          </MenuItem>
                          <MenuItem value={CLAUDE_MODELS.SONNET_NEW}>
                            Sonnet (сбалансированно)
                          </MenuItem>
                          <MenuItem value={CLAUDE_MODELS.OPUS}>
                            Opus (максимальное качество)
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={settings.detectChanges}
                              onChange={(e) => updateSettings({ detectChanges: e.target.checked })}
                            />
                          }
                          label="Обнаруживать изменения от существующего плана"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={settings.handleConflicts}
                              onChange={(e) => updateSettings({ handleConflicts: e.target.checked })}
                            />
                          }
                          label="Выявлять конфликты"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={settings.autoSave}
                              onChange={(e) => updateSettings({ autoSave: e.target.checked })}
                            />
                          }
                          label="Автосохранение после генерации"
                        />
                      </FormGroup>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Grid>

          {/* Правая панель - результат */}
          <Grid item xs={12} md={6}>
            <Box height="100%" overflow="auto">
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {result?.plan && (
                <Box mb={2}>
                  <WorkPlanPreview plan={result.plan} />
                </Box>
              )}

              {hasConflicts && result?.conflicts && (
                <Box mb={2}>
                  <ConflictsList conflicts={result.conflicts} />
                </Box>
              )}

              {hasActionItems && result?.actionItems && (
                <Box mb={2}>
                  <ActionItemsList items={result.actionItems} />
                </Box>
              )}

              {result?.metadata && (
                <Card elevation={0} sx={{ bgcolor: 'grey.50' }}>
                  <CardContent>
                    <Typography variant="caption" color="textSecondary">
                      <TimeIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                      Обработано за {processingTime}мс, уверенность {confidence.toFixed(0)}%
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose} variant="outlined">
          Отмена
        </Button>
        
        {hasConflicts && result?.plan && (
          <Button 
            onClick={handleAcceptWithConflicts}
            variant="outlined"
            color="warning"
            startIcon={<WarningIcon />}
          >
            Принять с конфликтами
          </Button>
        )}
        
        <LoadingButton
          onClick={handleGenerate}
          loading={processing}
          variant="contained"
          disabled={!input.trim()}
          startIcon={<AIIcon />}
        >
          Генерировать план
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

export default AIGeneratorDialog;
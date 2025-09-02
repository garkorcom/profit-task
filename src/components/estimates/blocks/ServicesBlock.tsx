/**
 * Блок "Услуги" для конструктора смет (MVP)
 * Возможности:
 * - Секции и строки услуг
 * - PERT-оценки времени (optimistic/mostLikely/pessimistic)
 * - Расчет трудозатрат и стоимости по ставке
 * - Привязка к задаче
 * - Импорт из шаблонов услуг
 */

import React, { useEffect, useMemo, useState } from 'react';
import { 
  Box, Typography, Button, Alert, Stack, TextField, IconButton, Divider, Chip,
  MenuItem, Select, InputLabel, FormControl, Card, CardContent, CardActions,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, ListItemButton,
  useTheme, useMediaQuery, CircularProgress
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Download as ImportIcon, 
  Save as SaveIcon,
  Psychology as AIIcon,
  AutoAwesome as MagicIcon,
  SmartToy as BotIcon
} from '@mui/icons-material';
import { Estimate, BlockState } from '../../../types/estimate.types';
import { useAuth } from '../../../auth/AuthContext';
import { ServiceTemplate, getServiceTemplatesStream } from '../../../api/serviceTemplateApi';
import { generateEstimateWithClaude, CLAUDE_MODELS } from '../../../api/anthropicApi';

interface ServicesBlockProps {
  estimate: Estimate;
  block: BlockState;
  onSave: (data: any) => void;
  saving: boolean;
}

type Pert = { optimistic: number; mostLikely: number; pessimistic: number };

type ServiceRow = {
  id: string;
  sectionId: string;
  name: string;
  description?: string;
  taskId?: string;
  unit: string;
  rate: number; // ставка за единицу
  pert: Pert;   // оценка времени в часах
};

type Section = { id: string; title: string };

type ServicesState = {
  sections: Section[];
  rows: ServiceRow[];
  hourlyRate: number; // базовая ставка для расчета
};

const uuid = () => Math.random().toString(36).slice(2, 10);

const defaultState: ServicesState = {
  sections: [{ id: 'sec-1', title: 'Основные работы' }],
  rows: [],
  hourlyRate: 1200,
};

const ServicesBlock: React.FC<ServicesBlockProps> = ({ estimate, block, onSave, saving }) => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const initialData = (block?.data as any) || {};
  const [state, setState] = useState<ServicesState>({
    sections: initialData.sections || defaultState.sections,
    rows: initialData.rows || defaultState.rows,
    hourlyRate: initialData.hourlyRate ?? defaultState.hourlyRate,
  });

  // Templates
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  // AI Integration
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDescription, setAiDescription] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const unsub = getServiceTemplatesStream(currentUser.uid, setTemplates);
    return () => unsub && unsub();
  }, [currentUser]);

  const addSection = () => {
    setState((s) => ({ ...s, sections: [...s.sections, { id: uuid(), title: `Секция ${s.sections.length + 1}` }] }));
  };

  const removeSection = (sectionId: string) => {
    setState((s) => ({
      ...s,
      sections: s.sections.filter((sec) => sec.id !== sectionId),
      rows: s.rows.filter((r) => r.sectionId !== sectionId),
    }));
  };

  const addRow = (sectionId: string) => {
    setState((s) => ({
      ...s,
      rows: [
        ...s.rows,
        {
          id: uuid(),
          sectionId,
          name: 'Новая услуга',
          description: '',
          unit: 'ч',
          rate: s.hourlyRate,
          pert: { optimistic: 1, mostLikely: 2, pessimistic: 3 },
        },
      ],
    }));
  };

  const removeRow = (rowId: string) => setState((s) => ({ ...s, rows: s.rows.filter((r) => r.id !== rowId) }));

  const updateRow = (rowId: string, updates: Partial<ServiceRow>) => {
    setState((s) => ({
      ...s,
      rows: s.rows.map((r) => (r.id === rowId ? { ...r, ...updates } : r)),
    }));
  };

  const expectedHours = (pert: Pert) => (pert.optimistic + 4 * pert.mostLikely + pert.pessimistic) / 6;

  const totals = useMemo(() => {
    const hours = state.rows.reduce((sum, r) => sum + expectedHours(r.pert), 0);
    const cost = state.rows.reduce((sum, r) => sum + expectedHours(r.pert) * r.rate, 0);
    return { hours, cost };
  }, [state.rows]);

  const handleSave = () => {
    const data = {
      ...state,
      totals,
    };
    onSave(data);
  };

  const importFromTemplate = (tpl: ServiceTemplate) => {
    // Конвертируем компоненты шаблона в строки услуг с 1 часом по умолчанию
    const newRows: ServiceRow[] = tpl.components.map((c) => ({
      id: uuid(),
      sectionId: state.sections[0]?.id || uuid(),
      name: c.name,
      unit: c.unit || 'ч',
      rate: state.hourlyRate,
      pert: { optimistic: 0.5, mostLikely: 1, pessimistic: 2 },
    }));
    setState((s) => ({ ...s, rows: [...s.rows, ...newRows] }));
    setImportOpen(false);
  };

  // AI функция для генерации услуг
  const generateServicesWithAI = async () => {
    if (!aiDescription.trim()) return;
    
    setAiLoading(true);
    try {
      const aiEstimate = await generateEstimateWithClaude(aiDescription, CLAUDE_MODELS.HAIKU);
      
      // Конвертируем AI смету в наши услуги
      const newRows: ServiceRow[] = [];
      let targetSectionId = state.sections[0]?.id;
      
      aiEstimate.sections.forEach((section) => {
        // Создаем новую секцию если нужно
        if (section.name !== 'Основные работы') {
          const sectionId = uuid();
          setState((s) => ({ 
            ...s, 
            sections: [...s.sections, { id: sectionId, title: section.name }]
          }));
          targetSectionId = sectionId;
        }
        
        // Добавляем услуги из секции
        section.items.forEach((item) => {
          // Конвертируем в PERT оценку (предполагаем что rate это часы)
          const hours = item.quantity || 1;
          const pertHours = {
            optimistic: Math.max(0.5, hours * 0.7),
            mostLikely: hours,
            pessimistic: hours * 1.5
          };
          
          newRows.push({
            id: uuid(),
            sectionId: targetSectionId || state.sections[0]?.id || uuid(),
            name: item.name,
            description: item.description,
            unit: item.unit === 'шт' ? 'шт' : 'ч',
            rate: item.unit === 'ч' ? state.hourlyRate : item.rate,
            pert: pertHours,
          });
        });
      });
      
      setState((s) => ({ ...s, rows: [...s.rows, ...newRows] }));
      setAiDialogOpen(false);
      setAiDescription('');
      
    } catch (error) {
      console.error('AI генерация не удалась:', error);
      alert('Ошибка при генерации услуг с помощью AI. Попробуйте еще раз.');
    }
    setAiLoading(false);
  };

  return (
    <Box>
      <Stack 
        direction={isMobile ? "column" : "row"} 
        alignItems={isMobile ? "stretch" : "center"} 
        justifyContent="space-between" 
        sx={{ mb: 2 }}
        spacing={isMobile ? 2 : 0}
      >
        <Typography variant="h6" sx={{ textAlign: isMobile ? 'center' : 'left' }}>
          Услуги
        </Typography>
        <Stack 
          direction={isMobile ? "column" : "row"} 
          spacing={1} 
          sx={{ width: isMobile ? '100%' : 'auto' }}
        >
          <Button 
            variant="outlined" 
            startIcon={<AIIcon />} 
            onClick={() => setAiDialogOpen(true)}
            fullWidth={isMobile}
            sx={{ 
              color: '#9c27b0',
              borderColor: '#9c27b0',
              minHeight: 48,
              '&:hover': {
                borderColor: '#7b1fa2',
                backgroundColor: 'rgba(156, 39, 176, 0.04)'
              }
            }}
          >
            🤖 AI Генератор
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<ImportIcon />} 
            onClick={() => setImportOpen(true)}
            fullWidth={isMobile}
            sx={{ minHeight: 48 }}
          >
            Импорт из шаблонов
          </Button>
          <Button 
            variant="contained" 
            startIcon={<SaveIcon />} 
            onClick={handleSave} 
            disabled={saving}
            fullWidth={isMobile}
            sx={{ minHeight: 48 }}
          >
            {saving ? 'Сохранение...' : 'Сохранить блок'}
          </Button>
        </Stack>
      </Stack>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack 
            direction={isMobile ? "column" : "row"} 
            spacing={2} 
            alignItems={isMobile ? "stretch" : "center"}
          >
            <TextField
              label="Базовая ставка ($/час)"
              type="number"
              value={state.hourlyRate}
              onChange={(e) => setState((s) => ({ ...s, hourlyRate: Number(e.target.value || 0) }))}
              sx={{ width: isMobile ? '100%' : 220 }}
              inputProps={{ min: 0 }}
            />
            <Chip 
              label={`Итого: ${totals.hours.toFixed(1)} ч / $${totals.cost.toFixed(0)}`} 
              color="success"
              sx={{ alignSelf: isMobile ? 'center' : 'auto' }}
            />
          </Stack>
        </CardContent>
      </Card>

      {state.sections.map((sec) => (
        <Card key={sec.id} variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Stack 
              direction={isMobile ? "column" : "row"} 
              spacing={1} 
              alignItems={isMobile ? "stretch" : "center"} 
              justifyContent="space-between"
            >
              <TextField
                label="Название секции"
                value={sec.title}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    sections: s.sections.map((x) => (x.id === sec.id ? { ...x, title: e.target.value } : x)),
                  }))
                }
                fullWidth
              />
              <IconButton 
                aria-label="Удалить секцию" 
                onClick={() => removeSection(sec.id)}
                sx={{ 
                  alignSelf: isMobile ? 'flex-end' : 'center',
                  minHeight: 48,
                  minWidth: 48 
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1}>
              {state.rows
                .filter((r) => r.sectionId === sec.id)
                .map((row) => {
                  const hours = expectedHours(row.pert);
                  const lineTotal = hours * row.rate;
                  return (
                    <Card key={row.id} variant="outlined" sx={{ p: 1 }}>
                      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} alignItems="center">
                        <TextField
                          label="Услуга / работа"
                          value={row.name}
                          onChange={(e) => updateRow(row.id, { name: e.target.value })}
                          sx={{ 
                            flex: isMobile ? undefined : 2, 
                            minWidth: isMobile ? '100%' : 220,
                            width: isMobile ? '100%' : 'auto'
                          }}
                        />
                        <TextField
                          label="Описание"
                          value={row.description || ''}
                          onChange={(e) => updateRow(row.id, { description: e.target.value })}
                          sx={{ 
                            flex: isMobile ? undefined : 3, 
                            minWidth: isMobile ? '100%' : 260,
                            width: isMobile ? '100%' : 'auto'
                          }}
                        />
                        
                        {/* Мобильная версия: компактный ряд для числовых полей */}
                        {isMobile ? (
                          <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                            <FormControl sx={{ minWidth: 80, flex: 1 }}>
                              <InputLabel>Ед.</InputLabel>
                              <Select
                                label="Ед."
                                value={row.unit}
                                onChange={(e) => updateRow(row.id, { unit: e.target.value as string })}
                              >
                                <MenuItem value="ч">ч</MenuItem>
                                <MenuItem value="шт">шт</MenuItem>
                                <MenuItem value="м2">м2</MenuItem>
                              </Select>
                            </FormControl>
                            <TextField
                              type="number"
                              label="Ставка"
                              value={row.rate}
                              onChange={(e) => updateRow(row.id, { rate: Number(e.target.value || 0) })}
                              sx={{ flex: 1 }}
                              inputProps={{ min: 0 }}
                            />
                          </Stack>
                        ) : (
                          <>
                            <FormControl sx={{ width: 120 }}>
                              <InputLabel>Ед.</InputLabel>
                              <Select
                                label="Ед."
                                value={row.unit}
                                onChange={(e) => updateRow(row.id, { unit: e.target.value as string })}
                              >
                                <MenuItem value="ч">ч</MenuItem>
                                <MenuItem value="шт">шт</MenuItem>
                                <MenuItem value="м2">м2</MenuItem>
                              </Select>
                            </FormControl>
                            <TextField
                              type="number"
              label="Ставка ($/ед)"
                              value={row.rate}
                              onChange={(e) => updateRow(row.id, { rate: Number(e.target.value || 0) })}
                              sx={{ width: 140 }}
                              inputProps={{ min: 0 }}
                            />
                          </>
                        )}
                        
                        {/* PERT поля */}
                        {isMobile ? (
                          <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                            <TextField
                              type="number"
                              label="Мин"
                              value={row.pert.optimistic}
                              onChange={(e) => updateRow(row.id, { pert: { ...row.pert, optimistic: Number(e.target.value || 0) } })}
                              sx={{ flex: 1 }}
                              inputProps={{ min: 0 }}
                            />
                            <TextField
                              type="number"
                              label="Ожид"
                              value={row.pert.mostLikely}
                              onChange={(e) => updateRow(row.id, { pert: { ...row.pert, mostLikely: Number(e.target.value || 0) } })}
                              sx={{ flex: 1 }}
                              inputProps={{ min: 0 }}
                            />
                            <TextField
                              type="number"
                              label="Макс"
                              value={row.pert.pessimistic}
                              onChange={(e) => updateRow(row.id, { pert: { ...row.pert, pessimistic: Number(e.target.value || 0) } })}
                              sx={{ flex: 1 }}
                              inputProps={{ min: 0 }}
                            />
                          </Stack>
                        ) : (
                          <>
                            <TextField
                              type="number"
                              label="PERT min"
                              value={row.pert.optimistic}
                              onChange={(e) => updateRow(row.id, { pert: { ...row.pert, optimistic: Number(e.target.value || 0) } })}
                              sx={{ width: 110 }}
                              inputProps={{ min: 0 }}
                            />
                            <TextField
                              type="number"
                              label="PERT ml"
                              value={row.pert.mostLikely}
                              onChange={(e) => updateRow(row.id, { pert: { ...row.pert, mostLikely: Number(e.target.value || 0) } })}
                              sx={{ width: 110 }}
                              inputProps={{ min: 0 }}
                            />
                            <TextField
                              type="number"
                              label="PERT max"
                              value={row.pert.pessimistic}
                              onChange={(e) => updateRow(row.id, { pert: { ...row.pert, pessimistic: Number(e.target.value || 0) } })}
                              sx={{ width: 110 }}
                              inputProps={{ min: 0 }}
                            />
                          </>
                        )}
                        {/* Мобильная версия: результат и кнопка удаления в отдельном ряду */}
                        {isMobile ? (
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
                            <Chip 
                              label={`${hours.toFixed(1)} ч / $${lineTotal.toFixed(0)}`} 
                              color="info" 
                              sx={{ fontSize: '0.875rem' }}
                            />
                            <IconButton 
                              aria-label="Удалить строку" 
                              onClick={() => removeRow(row.id)}
                              color="error"
                              sx={{ minHeight: 48, minWidth: 48 }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        ) : (
                          <>
                            <Chip label={`${hours.toFixed(1)} ч / $${lineTotal.toFixed(0)}`} color="info" />
                            <IconButton aria-label="Удалить строку" onClick={() => removeRow(row.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </Stack>
                    </Card>
                  );
                })}
              <Button 
                startIcon={<AddIcon />} 
                onClick={() => addRow(sec.id)}
                fullWidth={isMobile}
                variant="outlined"
                sx={{ minHeight: 48 }}
              >
                Добавить строку
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ))}

      <Stack direction="row" spacing={1}>
        <Button 
          startIcon={<AddIcon />} 
          onClick={addSection}
          variant="contained"
          fullWidth={isMobile}
          sx={{ minHeight: 48 }}
        >
          Добавить секцию
        </Button>
      </Stack>

      {/* AI Генератор услуг */}
      <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AIIcon sx={{ color: '#9c27b0' }} />
            <Typography variant="h6">🤖 AI Генератор услуг</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Опишите проект или услуги, и AI автоматически создаст детальную смету с PERT-оценками времени.
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Описание проекта или услуг"
            value={aiDescription}
            onChange={(e) => setAiDescription(e.target.value)}
            placeholder="Например: Разработка интернет-магазина с каталогом товаров, корзиной, системой оплаты и админ-панелью"
            sx={{ mb: 2 }}
          />
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>💡 Подсказка:</strong> Чем детальнее описание, тем точнее будет смета. 
              Укажите технологии, функциональность, сложность задач.
            </Typography>
          </Alert>

          {aiLoading && (
            <Alert severity="info">
              <Stack direction="row" alignItems="center" spacing={1}>
                <BotIcon sx={{ animation: 'spin 1s linear infinite' }} />
                <Typography>AI анализирует проект и создает смету...</Typography>
              </Stack>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiDialogOpen(false)} disabled={aiLoading}>
            Отмена
          </Button>
          <Button 
            variant="contained" 
            onClick={generateServicesWithAI}
            disabled={!aiDescription.trim() || aiLoading}
            startIcon={<MagicIcon />}
            sx={{ 
              background: 'linear-gradient(45deg, #9c27b0 30%, #e91e63 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #7b1fa2 30%, #c2185b 90%)'
              }
            }}
          >
            {aiLoading ? 'Генерирую...' : 'Сгенерировать услуги'}
          </Button>
        </DialogActions>
        
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </Dialog>

      {/* Импорт из шаблонов */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Импорт услуг из шаблонов</DialogTitle>
        <DialogContent>
          {templates.length === 0 ? (
            <Alert severity="info">Шаблоны услуг не найдены</Alert>
          ) : (
            <List>
              {templates.map((tpl) => (
                <ListItem key={tpl.id} disablePadding>
                  <ListItemButton onClick={() => importFromTemplate(tpl)}>
                    <ListItemText primary={tpl.name} secondary={`${tpl.components?.length || 0} поз.`} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServicesBlock;

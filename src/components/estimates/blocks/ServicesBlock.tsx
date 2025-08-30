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
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, ListItemButton
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Download as ImportIcon, Save as SaveIcon } from '@mui/icons-material';
import { Estimate, BlockState } from '../../../types/estimate.types';
import { useAuth } from '../../../auth/AuthContext';
import { ServiceTemplate, getServiceTemplatesStream } from '../../../api/serviceTemplateApi';

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
  const initialData = (block?.data as any) || {};
  const [state, setState] = useState<ServicesState>({
    sections: initialData.sections || defaultState.sections,
    rows: initialData.rows || defaultState.rows,
    hourlyRate: initialData.hourlyRate ?? defaultState.hourlyRate,
  });

  // Templates
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [importOpen, setImportOpen] = useState(false);

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

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">Услуги</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ImportIcon />} onClick={() => setImportOpen(true)}>
            Импорт из шаблонов
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить блок'}
          </Button>
        </Stack>
      </Stack>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Базовая ставка (₽/час)"
              type="number"
              value={state.hourlyRate}
              onChange={(e) => setState((s) => ({ ...s, hourlyRate: Number(e.target.value || 0) }))}
              sx={{ width: 220 }}
              inputProps={{ min: 0 }}
            />
            <Chip label={`Итого: ${totals.hours.toFixed(1)} ч / ${totals.cost.toFixed(0)} ₽`} color="success" />
          </Stack>
        </CardContent>
      </Card>

      {state.sections.map((sec) => (
        <Card key={sec.id} variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
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
              <IconButton aria-label="Удалить секцию" onClick={() => removeSection(sec.id)}>
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
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
                        <TextField
                          label="Услуга / работа"
                          value={row.name}
                          onChange={(e) => updateRow(row.id, { name: e.target.value })}
                          sx={{ flex: 2, minWidth: 220 }}
                        />
                        <TextField
                          label="Описание"
                          value={row.description || ''}
                          onChange={(e) => updateRow(row.id, { description: e.target.value })}
                          sx={{ flex: 3, minWidth: 260 }}
                        />
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
                          label="Ставка (₽/ед)"
                          value={row.rate}
                          onChange={(e) => updateRow(row.id, { rate: Number(e.target.value || 0) })}
                          sx={{ width: 140 }}
                          inputProps={{ min: 0 }}
                        />
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
                        <Chip label={`${hours.toFixed(1)} ч / ${lineTotal.toFixed(0)} ₽`} color="info" />
                        <IconButton aria-label="Удалить строку" onClick={() => removeRow(row.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </Card>
                  );
                })}
              <Button startIcon={<AddIcon />} onClick={() => addRow(sec.id)}>
                Добавить строку
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ))}

      <Stack direction="row" spacing={1}>
        <Button startIcon={<AddIcon />} onClick={addSection}>
          Добавить секцию
        </Button>
      </Stack>

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

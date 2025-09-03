/**
 * Унифицированная форма создания/редактирования задач
 * Поддерживает создание как EstimateTask, так и ProjectTask
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Autocomplete,
  FormControlLabel,
  Switch,
  Alert,
  Divider
} from '@mui/material';
// Используем Box вместо Grid для упрощения Material-UI v7
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import {
  UnifiedTask,
  CreateTaskDto,
  CreateEstimateTaskDto,
  CreateProjectTaskDto,
  UpdateTaskDto,
  isEstimateTask,
  isProjectTask,
  IncludeMode
} from '../../../types/unified-task.types';
import { TaskStatus } from '../../../api/taskApi';
import { TaskPriority } from '../../../types/unified-task.types';

interface UnifiedTaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskDto | UpdateTaskDto) => Promise<void>;
  task?: UnifiedTask;
  mode: 'create' | 'edit';
  defaultPhase?: 'pre_construction' | 'execution';
  defaultProjectId?: string;
  defaultEstimateId?: string;
  availableProjects?: Array<{ id: string; name: string }>;
  availableEstimates?: Array<{ id: string; number: string }>;
  availableUsers?: Array<{ id: string; name: string }>;
  availableRoles?: string[];
}

const UnifiedTaskForm: React.FC<UnifiedTaskFormProps> = ({
  open,
  onClose,
  onSubmit,
  task,
  mode,
  defaultPhase = 'execution',
  defaultProjectId,
  defaultEstimateId,
  availableProjects = [],
  availableEstimates = [],
  availableUsers = [],
  availableRoles = []
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Основные поля
  const [phase, setPhase] = useState<'pre_construction' | 'execution'>(
    task?.phase || defaultPhase
  );
  const [name, setName] = useState(task?.name || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority || 'medium'
  );
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'new');
  
  // Планирование
  const [plannedHours, setPlannedHours] = useState(task?.plannedHours || 1);
  const [actualHours, setActualHours] = useState(task?.actualHours || 0);
  const [plannedStartDate, setPlannedStartDate] = useState<Date | null>(
    task?.plannedStartDate ? new Date(task.plannedStartDate) : null
  );
  const [plannedEndDate, setPlannedEndDate] = useState<Date | null>(
    task?.plannedEndDate ? new Date(task.plannedEndDate) : null
  );
  
  // Назначение
  const [assignedUserId, setAssignedUserId] = useState(task?.assignedUserId || '');
  const [assignedRole, setAssignedRole] = useState(task?.assignedRole || '');
  
  // Поля для EstimateTask
  const [estimateId, setEstimateId] = useState(
    (task && isEstimateTask(task)) ? task.estimateId : (defaultEstimateId || '')
  );
  const [includeMode, setIncludeMode] = useState<IncludeMode>(
    (task && isEstimateTask(task)) ? task.includeMode : 'COGS'
  );
  const [categoryId, setCategoryId] = useState(task?.categoryId || '');
  
  // Поля для ProjectTask
  const [projectId, setProjectId] = useState(
    (task && isProjectTask(task)) ? task.projectId : (defaultProjectId || '')
  );
  const [plannedCost, setPlannedCost] = useState(
    (task && isProjectTask(task)) ? task.plannedCost : 0
  );
  const [actualCost, setActualCost] = useState(
    (task && isProjectTask(task)) ? task.actualCost || 0 : 0
  );
  const [progressPct, setProgressPct] = useState(
    (task && isProjectTask(task)) ? task.progressPct : 0
  );
  const [wbsCode, setWbsCode] = useState(
    (task && isProjectTask(task)) ? task.wbsCode || '' : ''
  );
  const [milestone, setMilestone] = useState(
    (task && isProjectTask(task)) ? task.milestone || '' : ''
  );
  const [budgetLimit, setBudgetLimit] = useState(
    (task && isProjectTask(task)) ? task.budgetLimit || 0 : 0
  );
  
  // Дополнительные поля
  const [tags, setTags] = useState<string[]>(task?.tags || []);
  const [notes, setNotes] = useState(task?.notes || '');
  
  // Расширенные настройки
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (task) {
      setPhase(task.phase);
      setName(task.name);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setPlannedHours(task.plannedHours);
      setActualHours(task.actualHours || 0);
      setPlannedStartDate(task.plannedStartDate ? new Date(task.plannedStartDate) : null);
      setPlannedEndDate(task.plannedEndDate ? new Date(task.plannedEndDate) : null);
      setAssignedUserId(task.assignedUserId || '');
      setAssignedRole(task.assignedRole || '');
      setTags(task.tags || []);
      setNotes(task.notes || '');
      setCategoryId(task.categoryId || '');

      if (isEstimateTask(task)) {
        setEstimateId(task.estimateId);
        setIncludeMode(task.includeMode);
      }

      if (isProjectTask(task)) {
        setProjectId(task.projectId);
        setPlannedCost(task.plannedCost);
        setActualCost(task.actualCost || 0);
        setProgressPct(task.progressPct);
        setWbsCode(task.wbsCode || '');
        setMilestone(task.milestone || '');
        setBudgetLimit(task.budgetLimit || 0);
      }
    }
  }, [task]);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      // Валидация
      if (!name.trim()) {
        throw new Error('Название задачи обязательно');
      }

      if (plannedHours <= 0) {
        throw new Error('Плановые часы должны быть больше 0');
      }

      if (plannedStartDate && plannedEndDate && plannedStartDate >= plannedEndDate) {
        throw new Error('Дата начала должна быть раньше даты окончания');
      }

      // Базовые данные
      const baseData = {
        name: name.trim(),
        description: description.trim() || undefined,
        priority,
        plannedHours,
        actualHours: actualHours > 0 ? actualHours : undefined,
        plannedStartDate: plannedStartDate?.toISOString(),
        plannedEndDate: plannedEndDate?.toISOString(),
        assignedUserId: assignedUserId || undefined,
        assignedRole: assignedRole.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        notes: notes.trim() || undefined,
        categoryId: categoryId || undefined
      };

      let submitData: CreateTaskDto | UpdateTaskDto;

      if (mode === 'edit') {
        // Режим редактирования
        submitData = {
          ...baseData,
          status,
          ...(phase === 'execution' && {
            plannedCost,
            actualCost: actualCost > 0 ? actualCost : undefined,
            progressPct,
            wbsCode: wbsCode.trim() || undefined,
            milestone: milestone.trim() || undefined,
            budgetLimit: budgetLimit > 0 ? budgetLimit : undefined
          }),
          ...(phase === 'pre_construction' && {
            includeMode
          })
        };
      } else {
        // Режим создания
        if (phase === 'pre_construction') {
          if (!estimateId) {
            throw new Error('Выберите смету');
          }
          
          submitData = {
            ...baseData,
            phase: 'pre_construction',
            estimateId,
            includeMode
          } as CreateEstimateTaskDto;
        } else {
          if (!projectId) {
            throw new Error('Выберите проект');
          }
          
          if (plannedCost <= 0) {
            throw new Error('Плановая стоимость должна быть больше 0');
          }
          
          submitData = {
            ...baseData,
            phase: 'execution',
            projectId,
            plannedCost,
            wbsCode: wbsCode.trim() || undefined,
            milestone: milestone.trim() || undefined,
            budgetLimit: budgetLimit > 0 ? budgetLimit : undefined
          } as CreateProjectTaskDto;
        }
      }

      await onSubmit(submitData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const renderPhaseSpecificFields = () => {
    if (phase === 'pre_construction') {
      return (
        <>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Смета</InputLabel>
            <Select
              value={estimateId}
              onChange={(e) => setEstimateId(e.target.value)}
              label="Смета"
              disabled={mode === 'edit'}
            >
              {availableEstimates.map((estimate) => (
                <MenuItem key={estimate.id} value={estimate.id}>
                  {estimate.number}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal" required>
            <InputLabel>Режим включения в расчеты</InputLabel>
            <Select
              value={includeMode}
              onChange={(e) => setIncludeMode(e.target.value as IncludeMode)}
              label="Режим включения в расчеты"
            >
              <MenuItem value="COGS">COGS - Себестоимость</MenuItem>
              <MenuItem value="OH">OH - Накладные расходы</MenuItem>
              <MenuItem value="NONE">NONE - Не включать</MenuItem>
            </Select>
          </FormControl>
        </>
      );
    } else {
      return (
        <>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Проект</InputLabel>
            <Select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              label="Проект"
              disabled={mode === 'edit'}
            >
              {availableProjects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <TextField
                fullWidth
                margin="normal"
                label="Плановая стоимость, ₽"
                type="number"
                value={plannedCost}
                onChange={(e) => setPlannedCost(Number(e.target.value))}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <TextField
                fullWidth
                margin="normal"
                label="Прогресс, %"
                type="number"
                value={progressPct}
                onChange={(e) => setProgressPct(Number(e.target.value))}
                inputProps={{ min: 0, max: 100 }}
                disabled={mode === 'create'}
              />
            </Box>
          </Box>

          {showAdvanced && (
            <>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 250 }}>
                  <TextField
                    fullWidth
                    margin="normal"
                    label="WBS код"
                    value={wbsCode}
                    onChange={(e) => setWbsCode(e.target.value)}
                    placeholder="1.2.3.4"
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 250 }}>
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Веха"
                    value={milestone}
                    onChange={(e) => setMilestone(e.target.value)}
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 250 }}>
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Лимит бюджета, ₽"
                    type="number"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(Number(e.target.value))}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Box>
                {mode === 'edit' && (
                  <Box sx={{ flex: 1, minWidth: 250 }}>
                    <TextField
                      fullWidth
                      margin="normal"
                      label="Фактическая стоимость, ₽"
                      type="number"
                      value={actualCost}
                      onChange={(e) => setActualCost(Number(e.target.value))}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Box>
                )}
              </Box>
            </>
          )}
        </>
      );
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '60vh' }
        }}
      >
        <DialogTitle>
          {mode === 'create' ? 'Создать задачу' : 'Редактировать задачу'}
          {mode === 'create' && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip
                label={phase === 'pre_construction' ? 'Планирование' : 'Выполнение'}
                color={phase === 'pre_construction' ? 'info' : 'primary'}
                size="small"
              />
            </Box>
          )}
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Основные поля */}
          <TextField
            fullWidth
            margin="normal"
            label="Название задачи"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <TextField
            fullWidth
            margin="normal"
            label="Описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
          />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Приоритет</InputLabel>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  label="Приоритет"
                >
                  <MenuItem value="low">Низкий</MenuItem>
                  <MenuItem value="medium">Средний</MenuItem>
                  <MenuItem value="high">Высокий</MenuItem>
                  <MenuItem value="urgent">Критический</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {mode === 'edit' && (
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Статус</InputLabel>
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    label="Статус"
                  >
                    <MenuItem value="new">Новая</MenuItem>
                    <MenuItem value="assigned">Назначена</MenuItem>
                    <MenuItem value="in_progress">В работе</MenuItem>
                    <MenuItem value="on_hold">Приостановлена</MenuItem>
                    <MenuItem value="review">На проверке</MenuItem>
                    <MenuItem value="rework">На доработку</MenuItem>
                    <MenuItem value="completed">Выполнена</MenuItem>
                    <MenuItem value="cancelled">Отменена</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>

          {/* Специфичные поля по фазе */}
          {renderPhaseSpecificFields()}

          {/* Планирование */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            Планирование
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <TextField
                fullWidth
                margin="normal"
                label="Плановые часы"
                type="number"
                value={plannedHours}
                onChange={(e) => setPlannedHours(Number(e.target.value))}
                required
                inputProps={{ min: 0.1, step: 0.1 }}
              />
            </Box>
            {mode === 'edit' && (
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Фактические часы"
                  type="number"
                  value={actualHours}
                  onChange={(e) => setActualHours(Number(e.target.value))}
                  inputProps={{ min: 0, step: 0.1 }}
                />
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <DatePicker
                label="Плановая дата начала"
                value={plannedStartDate}
                onChange={setPlannedStartDate}
                slots={{ textField: TextField }}
                slotProps={{ textField: { fullWidth: true, margin: "normal" } }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <DatePicker
                label="Плановая дата окончания"
                value={plannedEndDate}
                onChange={setPlannedEndDate}
                slots={{ textField: TextField }}
                slotProps={{ textField: { fullWidth: true, margin: "normal" } }}
              />
            </Box>
          </Box>

          {/* Назначение */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            Назначение
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Исполнитель</InputLabel>
                <Select
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  label="Исполнитель"
                >
                  <MenuItem value="">Не назначен</MenuItem>
                  {availableUsers.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <Autocomplete
                options={availableRoles}
                value={assignedRole}
                onChange={(_, newValue) => setAssignedRole(newValue || '')}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Роль исполнителя"
                    margin="normal"
                    fullWidth
                  />
                )}
              />
            </Box>
          </Box>

          {/* Дополнительные поля */}
          <FormControlLabel
            control={
              <Switch
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
              />
            }
            label="Показать расширенные настройки"
            sx={{ mt: 2 }}
          />

          {showAdvanced && (
            <>
              <Autocomplete
                multiple
                options={[]}
                value={tags}
                onChange={(_, newValue) => setTags(newValue)}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Теги"
                    placeholder="Добавить тег..."
                    margin="normal"
                    fullWidth
                  />
                )}
                renderTags={(tagValue, getTagProps) =>
                  tagValue.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      size="small"
                    />
                  ))
                }
              />

              <TextField
                fullWidth
                margin="normal"
                label="Заметки"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={3}
              />
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Сохранение...' : mode === 'create' ? 'Создать' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default UnifiedTaskForm;
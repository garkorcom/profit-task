/**
 * Редактор условных разрешений для административной панели
 * 
 * Позволяет настраивать сложные условия доступа для ролей и разрешений
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Grid,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

import { RoleCondition, ContextPermission, PermissionContext } from '../../types/rbac';
import { Permission } from '../../auth/permissions';
import { ConditionExamples } from '../../services/conditionalPermissions';

/**
 * Пропсы компонента
 */
interface ConditionalPermissionsEditorProps {
  // Текущие условия роли
  conditions: RoleCondition[];
  onConditionsChange: (conditions: RoleCondition[]) => void;
  
  // Контекстные разрешения
  contextPermissions?: ContextPermission[];
  onContextPermissionsChange?: (permissions: ContextPermission[]) => void;
  
  // Доступные разрешения
  availablePermissions: Permission[];
  
  // Режим только для чтения
  readOnly?: boolean;
}

/**
 * Типы условий с их описаниями
 */
const CONDITION_TYPES = [
  { value: 'time', label: 'Временные', icon: <ScheduleIcon />, color: '#2196f3' },
  { value: 'location', label: 'Местоположение', icon: <LocationIcon />, color: '#4caf50' },
  { value: 'project', label: 'Проектные', icon: <BusinessIcon />, color: '#ff9800' },
  { value: 'department', label: 'Департамент', icon: <GroupIcon />, color: '#9c27b0' },
  { value: 'custom', label: 'Пользовательские', icon: <SettingsIcon />, color: '#607d8b' }
];

/**
 * Поля для каждого типа условий
 */
const CONDITION_FIELDS = {
  time: [
    { value: 'working_hours', label: 'Рабочие часы' },
    { value: 'day_of_week', label: 'День недели' },
    { value: 'date_range', label: 'Диапазон дат' }
  ],
  location: [
    { value: 'office_radius', label: 'Радиус офиса' },
    { value: 'city', label: 'Город' },
    { value: 'country', label: 'Страна' }
  ],
  project: [
    { value: 'project_member', label: 'Участник проекта' },
    { value: 'project_role', label: 'Роль в проекте' },
    { value: 'project_status', label: 'Статус проекта' }
  ],
  department: [
    { value: 'department', label: 'Департамент' },
    { value: 'position', label: 'Должность' }
  ],
  custom: [
    { value: 'custom_field', label: 'Пользовательское поле' }
  ]
};

/**
 * Операторы сравнения
 */
const OPERATORS = [
  { value: 'equals', label: 'Равно' },
  { value: 'not_equals', label: 'Не равно' },
  { value: 'in', label: 'В списке' },
  { value: 'not_in', label: 'Не в списке' },
  { value: 'greater', label: 'Больше' },
  { value: 'less', label: 'Меньше' },
  { value: 'contains', label: 'Содержит' }
];

export default function ConditionalPermissionsEditor({
  conditions,
  onConditionsChange,
  contextPermissions = [],
  onContextPermissionsChange,
  availablePermissions,
  readOnly = false
}: ConditionalPermissionsEditorProps) {
  
  // Состояние для редактирования условий
  const [editingCondition, setEditingCondition] = useState<RoleCondition | null>(null);
  const [isConditionDialogOpen, setIsConditionDialogOpen] = useState(false);
  
  // Состояние для предварительного просмотра
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  // Добавление нового условия
  const handleAddCondition = useCallback(() => {
    const newCondition: RoleCondition = {
      id: `condition_${Date.now()}`,
      type: 'time',
      field: 'working_hours',
      operator: 'equals',
      value: { start: '09:00', end: '18:00' },
      description: ''
    };
    
    setEditingCondition(newCondition);
    setIsConditionDialogOpen(true);
  }, []);
  
  // Редактирование условия
  const handleEditCondition = useCallback((condition: RoleCondition) => {
    setEditingCondition({ ...condition });
    setIsConditionDialogOpen(true);
  }, []);
  
  // Сохранение условия
  const handleSaveCondition = useCallback(() => {
    if (!editingCondition) return;
    
    const existingIndex = conditions.findIndex(c => c.id === editingCondition.id);
    
    if (existingIndex >= 0) {
      // Обновляем существующее условие
      const newConditions = [...conditions];
      newConditions[existingIndex] = editingCondition;
      onConditionsChange(newConditions);
    } else {
      // Добавляем новое условие
      onConditionsChange([...conditions, editingCondition]);
    }
    
    setIsConditionDialogOpen(false);
    setEditingCondition(null);
  }, [editingCondition, conditions, onConditionsChange]);
  
  // Удаление условия
  const handleDeleteCondition = useCallback((conditionId: string) => {
    const newConditions = conditions.filter(c => c.id !== conditionId);
    onConditionsChange(newConditions);
  }, [conditions, onConditionsChange]);
  
  // Использование примера условия
  const handleUseExample = useCallback((exampleCondition: RoleCondition) => {
    const conditionWithId = {
      ...exampleCondition,
      id: `condition_${Date.now()}`
    };
    
    setEditingCondition(conditionWithId);
    setIsConditionDialogOpen(true);
  }, []);
  
  // Рендер поля значения в зависимости от типа условия
  const renderValueField = useCallback(() => {
    if (!editingCondition) return null;
    
    switch (editingCondition.field) {
      case 'working_hours':
        return (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Начало"
                type="time"
                value={(editingCondition.value as any)?.start || '09:00'}
                onChange={(e) => setEditingCondition({
                  ...editingCondition,
                  value: { ...editingCondition.value as any, start: e.target.value }
                })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Окончание"
                type="time"
                value={(editingCondition.value as any)?.end || '18:00'}
                onChange={(e) => setEditingCondition({
                  ...editingCondition,
                  value: { ...editingCondition.value as any, end: e.target.value }
                })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        );
      
      case 'day_of_week':
        const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayLabels = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        
        return (
          <FormControl fullWidth>
            <InputLabel>Дни недели</InputLabel>
            <Select
              multiple
              value={Array.isArray(editingCondition.value) ? editingCondition.value : []}
              onChange={(e) => setEditingCondition({
                ...editingCondition,
                value: e.target.value
              })}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => {
                    const index = weekDays.indexOf(value);
                    return (
                      <Chip 
                        key={value} 
                        label={index >= 0 ? dayLabels[index] : value} 
                        size="small" 
                      />
                    );
                  })}
                </Box>
              )}
            >
              {weekDays.map((day, index) => (
                <MenuItem key={day} value={day}>
                  {dayLabels[index]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      
      case 'office_radius':
        const locationValue = editingCondition.value as any || {};
        return (
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Широта"
                type="number"
                value={locationValue.latitude || ''}
                onChange={(e) => setEditingCondition({
                  ...editingCondition,
                  value: { ...locationValue, latitude: parseFloat(e.target.value) }
                })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Долгота"
                type="number"
                value={locationValue.longitude || ''}
                onChange={(e) => setEditingCondition({
                  ...editingCondition,
                  value: { ...locationValue, longitude: parseFloat(e.target.value) }
                })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Радиус (м)"
                type="number"
                value={locationValue.radiusMeters || ''}
                onChange={(e) => setEditingCondition({
                  ...editingCondition,
                  value: { ...locationValue, radiusMeters: parseInt(e.target.value) }
                })}
              />
            </Grid>
          </Grid>
        );
      
      default:
        return (
          <TextField
            fullWidth
            label="Значение"
            value={typeof editingCondition.value === 'string' ? editingCondition.value : JSON.stringify(editingCondition.value)}
            onChange={(e) => {
              let value: any = e.target.value;
              try {
                // Пытаемся распарсить как JSON
                value = JSON.parse(value);
              } catch {
                // Оставляем как строку
              }
              setEditingCondition({ ...editingCondition, value });
            }}
            multiline
            rows={2}
          />
        );
    }
  }, [editingCondition]);
  
  // Рендер карточки условия
  const renderConditionCard = useCallback((condition: RoleCondition) => {
    const conditionType = CONDITION_TYPES.find(t => t.value === condition.type);
    const conditionField = CONDITION_FIELDS[condition.type]?.find(f => f.value === condition.field);
    const operator = OPERATORS.find(o => o.value === condition.operator);
    
    return (
      <Card key={condition.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {conditionType?.icon}
                <Chip
                  label={conditionType?.label || condition.type}
                  size="small"
                  sx={{ 
                    ml: 1, 
                    backgroundColor: conditionType?.color + '20',
                    color: conditionType?.color 
                  }}
                />
              </Box>
              
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>{conditionField?.label || condition.field}</strong> {operator?.label || condition.operator}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {typeof condition.value === 'object' 
                  ? JSON.stringify(condition.value, null, 2)
                  : String(condition.value)
                }
              </Typography>
              
              {condition.description && (
                <Typography variant="caption" color="text.secondary">
                  {condition.description}
                </Typography>
              )}
            </Box>
            
            {!readOnly && (
              <Box>
                <IconButton 
                  size="small" 
                  onClick={() => handleEditCondition(condition)}
                  sx={{ mr: 1 }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => handleDeleteCondition(condition.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }, [readOnly, handleEditCondition, handleDeleteCondition]);
  
  return (
    <Box>
      {/* Заголовок */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Условные разрешения ({conditions.length})
        </Typography>
        
        <Box>
          <Button
            startIcon={<PreviewIcon />}
            onClick={() => setPreviewDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Предварительный просмотр
          </Button>
          
          {!readOnly && (
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={handleAddCondition}
            >
              Добавить условие
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Список условий */}
      {conditions.length > 0 ? (
        <Box>
          {conditions.map(renderConditionCard)}
        </Box>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Условия не настроены
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Добавьте условия для создания динамических правил доступа
          </Typography>
        </Paper>
      )}
      
      {/* Примеры условий */}
      {!readOnly && (
        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Примеры условий</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {Object.entries(ConditionExamples).map(([key, example]) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {example.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {example.field} {example.operator} {typeof example.value === 'object' ? 'объект' : example.value}
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => handleUseExample(example)}
                      >
                        Использовать
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}
      
      {/* Диалог редактирования условия */}
      <Dialog 
        open={isConditionDialogOpen} 
        onClose={() => setIsConditionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingCondition && conditions.some(c => c.id === editingCondition.id) 
            ? 'Редактирование условия' 
            : 'Добавление условия'
          }
        </DialogTitle>
        <DialogContent>
          {editingCondition && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Тип условия</InputLabel>
                  <Select
                    value={editingCondition.type}
                    onChange={(e) => setEditingCondition({
                      ...editingCondition,
                      type: e.target.value as any,
                      field: CONDITION_FIELDS[e.target.value as keyof typeof CONDITION_FIELDS]?.[0]?.value || ''
                    })}
                  >
                    {CONDITION_TYPES.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {type.icon}
                          <Typography sx={{ ml: 1 }}>{type.label}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Поле</InputLabel>
                  <Select
                    value={editingCondition.field}
                    onChange={(e) => setEditingCondition({
                      ...editingCondition,
                      field: e.target.value
                    })}
                  >
                    {CONDITION_FIELDS[editingCondition.type]?.map(field => (
                      <MenuItem key={field.value} value={field.value}>
                        {field.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Оператор</InputLabel>
                  <Select
                    value={editingCondition.operator}
                    onChange={(e) => setEditingCondition({
                      ...editingCondition,
                      operator: e.target.value as any
                    })}
                  >
                    {OPERATORS.map(op => (
                      <MenuItem key={op.value} value={op.value}>
                        {op.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Значение
                </Typography>
                {renderValueField()}
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Описание (необязательно)"
                  value={editingCondition.description || ''}
                  onChange={(e) => setEditingCondition({
                    ...editingCondition,
                    description: e.target.value
                  })}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConditionDialogOpen(false)} startIcon={<CancelIcon />}>
            Отмена
          </Button>
          <Button onClick={handleSaveCondition} variant="contained" startIcon={<SaveIcon />}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Диалог предварительного просмотра */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Предварительный просмотр условий</DialogTitle>
        <DialogContent>
          {conditions.length > 0 ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Для получения доступа должны быть выполнены ВСЕ указанные условия
              </Alert>
              
              <List>
                {conditions.map((condition, index) => {
                  const conditionType = CONDITION_TYPES.find(t => t.value === condition.type);
                  const conditionField = CONDITION_FIELDS[condition.type]?.find(f => f.value === condition.field);
                  const operator = OPERATORS.find(o => o.value === condition.operator);
                  
                  return (
                    <React.Fragment key={condition.id}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1" sx={{ mr: 1 }}>
                                {index + 1}.
                              </Typography>
                              {conditionType?.icon}
                              <Typography variant="body1" sx={{ ml: 1 }}>
                                {conditionField?.label || condition.field} {operator?.label || condition.operator}
                              </Typography>
                            </Box>
                          }
                          secondary={condition.description || 'Без описания'}
                        />
                      </ListItem>
                      {index < conditions.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            </Box>
          ) : (
            <Typography color="text.secondary">
              Условия не настроены
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
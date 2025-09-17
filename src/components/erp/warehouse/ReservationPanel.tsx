/**
 * ReservationPanel - Компонент для управления резервированием товаров
 * Показывает активные резервы, позволяет создавать новые и отменять существующие
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Stack,
  Paper,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Cancel as CancelIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Schedule as ScheduleIcon,
  Assignment as EstimateIcon,
  Build as ProjectIcon,
  ShoppingCart as OrderIcon,
  Edit as ManualIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useForm, Controller } from 'react-hook-form';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
  StockReservation, 
  ReservationType,
  CreateReservationDto 
} from '../../../types/warehouse.types';
import { Item } from '../../../types/item.types';
import { 
  getReservations, 
  createReservation, 
  cancelReservation 
} from '../../../api/warehouseApi';
import { ItemSelector } from '../items';
import { useAuth } from '../../../auth/AuthContext';
import LoadingSpinner from '../../common/LoadingSpinner';

interface ReservationPanelProps {
  warehouseId?: string;
  itemId?: string;
  estimateId?: string; // Для автоматической фильтрации по смете
  projectId?: string;  // Для автоматической фильтрации по проекту
  showCreateButton?: boolean;
  compact?: boolean;
}

interface ReservationWithItem extends StockReservation {
  item?: Item;
  daysToExpiry?: number;
}

const ReservationPanel: React.FC<ReservationPanelProps> = ({
  warehouseId,
  itemId,
  estimateId,
  projectId,
  showCreateButton = true,
  compact = false
}) => {
  const { currentUser } = useAuth();
  const [reservations, setReservations] = useState<ReservationWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateReservationDto>({
    defaultValues: {
      itemId: itemId || '',
      warehouseId: warehouseId || '',
      quantity: 1,
      unit: 'pcs',
      type: estimateId ? 'estimate' : projectId ? 'project' : 'manual',
      referenceId: estimateId || projectId || '',
      priority: 'medium'
    }
  });

  const loadReservations = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Мок данные для демонстрации
      const mockReservations: ReservationWithItem[] = [
        {
          id: 'res-1',
          itemId: 'item-1',
          warehouseId: 'wh-1',
          type: 'estimate',
          referenceId: estimateId || 'estimate-123',
          referenceName: 'Смета на строительство дома',
          requestedQuantity: 100,
          reservedQuantity: 100,
          unit: 'pcs',
          lotAllocations: [
            { lotId: 'lot-1', quantity: 100 }
          ],
          reservedDate: '2024-10-01T10:00:00Z',
          requiredDate: '2024-11-01T00:00:00Z',
          expiryDate: '2024-12-01T00:00:00Z',
          status: 'active',
          priority: 'high',
          createdBy: currentUser.uid,
          createdAt: '2024-10-01T10:00:00Z',
          updatedAt: '2024-10-01T10:00:00Z',
          item: {
            id: 'item-1',
            name: 'Кирпич керамический',
            code: 'BRICK-001'
          } as Item,
          daysToExpiry: differenceInDays(parseISO('2024-12-01T00:00:00Z'), new Date())
        }
      ];
      
      setReservations(mockReservations);
      
    } catch (err) {
      console.error('Error loading reservations:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [currentUser, warehouseId, itemId, estimateId, projectId]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const getReservationTypeIcon = (type: ReservationType) => {
    switch (type) {
      case 'estimate': return <EstimateIcon />;
      case 'project': return <ProjectIcon />;
      case 'order': return <OrderIcon />;
      case 'manual': return <ManualIcon />;
      default: return <ScheduleIcon />;
    }
  };

  const getReservationTypeLabel = (type: ReservationType) => {
    switch (type) {
      case 'estimate': return 'Смета';
      case 'project': return 'Проект';
      case 'order': return 'Заказ';
      case 'manual': return 'Ручное';
      default: return type;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const handleCreateReservation = async (data: CreateReservationDto) => {
    try {
      setSaving(true);
      await createReservation(data);
      await loadReservations();
      setCreateDialogOpen(false);
      reset();
    } catch (error) {
      console.error('Error creating reservation:', error);
      setError(error instanceof Error ? error.message : 'Ошибка создания резерва');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!window.confirm('Отменить резервирование?')) return;
    
    try {
      await cancelReservation(reservationId);
      await loadReservations();
    } catch (error) {
      console.error('Error canceling reservation:', error);
      setError(error instanceof Error ? error.message : 'Ошибка отмены резерва');
    }
  };

  if (loading && reservations.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Card>
        <CardHeader 
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon />
              Резервирование
              {reservations.length > 0 && (
                <Chip label={`${reservations.length} резервов`} size="small" />
              )}
            </Box>
          }
          action={
            showCreateButton && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Создать резерв
              </Button>
            )
          }
        />
        
        <CardContent sx={{ p: 0 }}>
          {reservations.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Активных резервов нет
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size={compact ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow>
                    <TableCell>Тип</TableCell>
                    <TableCell>Товар</TableCell>
                    <TableCell>Ссылка</TableCell>
                    <TableCell align="right">Количество</TableCell>
                    <TableCell>Срок резерва</TableCell>
                    <TableCell>Приоритет</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell align="center">Действия</TableCell>
                  </TableRow>
                </TableHead>
                
                <TableBody>
                  {reservations.map((reservation) => (
                    <TableRow key={reservation.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getReservationTypeIcon(reservation.type)}
                          <Typography variant="caption">
                            {getReservationTypeLabel(reservation.type)}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {reservation.item?.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {reservation.item?.code}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {reservation.referenceName || reservation.referenceId}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {reservation.reservedQuantity} {reservation.unit}
                        </Typography>
                        {reservation.requestedQuantity !== reservation.reservedQuantity && (
                          <Typography variant="caption" color="warning.main" display="block">
                            Запрошено: {reservation.requestedQuantity}
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {reservation.expiryDate && (
                          <Box>
                            <Typography variant="caption">
                              до {format(parseISO(reservation.expiryDate), 'dd.MM.yyyy', { locale: ru })}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              display="block" 
                              color={reservation.daysToExpiry! < 7 ? 'warning.main' : 'textSecondary'}
                            >
                              {reservation.daysToExpiry! > 0 
                                ? `${reservation.daysToExpiry} дн.`
                                : 'Просрочен'
                              }
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={reservation.priority}
                          color={getPriorityColor(reservation.priority)}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={reservation.status === 'active' ? 'Активен' : reservation.status}
                          color={reservation.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Подробности">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Отменить резерв">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleCancelReservation(reservation.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Диалог создания резерва */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Создание резерва</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Controller
                name="itemId"
                control={control}
                rules={{ required: 'Выберите товар' }}
                render={({ field }) => (
                  <ItemSelector
                    selectedItem={null}
                    onSelect={(item) => field.onChange(item.id)}
                    filter={{ type: ['product'] }}
                    showStock={true}
                    label="Товар для резервирования"
                    error={errors.itemId?.message}
                    required
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="quantity"
                control={control}
                rules={{ required: 'Укажите количество', min: { value: 0.01, message: 'Количество должно быть больше 0' } }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Количество"
                    type="number"
                    fullWidth
                    error={!!errors.quantity}
                    helperText={errors.quantity?.message}
                    InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Тип резерва</InputLabel>
                    <Select {...field} label="Тип резерва">
                      <MenuItem value="estimate">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EstimateIcon />
                          Под смету
                        </Box>
                      </MenuItem>
                      <MenuItem value="project">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ProjectIcon />
                          Под проект
                        </Box>
                      </MenuItem>
                      <MenuItem value="order">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <OrderIcon />
                          Под заказ
                        </Box>
                      </MenuItem>
                      <MenuItem value="manual">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ManualIcon />
                          Ручное
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="referenceId"
                control={control}
                rules={{ required: 'Укажите ссылку' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="ID сметы/проекта/заказа"
                    fullWidth
                    error={!!errors.referenceId}
                    helperText={errors.referenceId?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="referenceName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Название (опционально)"
                    fullWidth
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="requiredDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? new Date(field.value) : null}
                    onChange={(date) => field.onChange(date?.toISOString())}
                    label="Требуемая дата"
                    slotProps={{
                      textField: { fullWidth: true }
                    }}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Приоритет</InputLabel>
                    <Select {...field} label="Приоритет">
                      <MenuItem value="low">Низкий</MenuItem>
                      <MenuItem value="medium">Средний</MenuItem>
                      <MenuItem value="high">Высокий</MenuItem>
                      <MenuItem value="urgent">Срочный</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Примечания"
                    fullWidth
                    multiline
                    rows={3}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Отмена
          </Button>
          <Button 
            variant="contained"
            onClick={handleSubmit(handleCreateReservation)}
            disabled={saving}
            startIcon={saving ? <LinearProgress /> : <SaveIcon />}
          >
            Создать резерв
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReservationPanel;

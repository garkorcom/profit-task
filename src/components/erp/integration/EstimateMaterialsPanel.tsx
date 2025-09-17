/**
 * EstimateMaterialsPanel - Панель управления материалами в смете
 * Интегрирует смету со складской системой, показывает остатки, резервы
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
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Tooltip,
  Stack,
  Paper,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as StockIcon,
  Schedule as ReserveIcon,
  Send as IssueIcon,
  Warning as WarningIcon,
  CheckCircle as OkIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { 
  EstimateItemWarehouse 
} from '../../../types/warehouse.types';
import { Item, isProductItem } from '../../../types/item.types';
import { ItemSelector } from '../items';
// import { ReservationPanel } from '../warehouse';
import { 
  getEstimateWarehouseLinks,
  autoReserveMaterialsForEstimate,
  issueMaterialsForEstimate
} from '../../../api/estimateWarehouseApi';
import { useAuth } from '../../../auth/AuthContext';
import LoadingSpinner from '../../common/LoadingSpinner';

interface EstimateMaterialsPanelProps {
  estimateId: string;
  estimateStatus?: string;
  readonly?: boolean;
  compact?: boolean;
}

interface MaterialWithAvailability extends EstimateItemWarehouse {
  item?: Item;
  stockShortfall?: number;
  fulfillmentPercentage?: number;
}

const EstimateMaterialsPanel: React.FC<EstimateMaterialsPanelProps> = ({
  estimateId,
  estimateStatus = 'draft',
  readonly = false,
  compact = false
}) => {
  const { currentUser } = useAuth();
  const [materials, setMaterials] = useState<MaterialWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadMaterials = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Мок данные для демонстрации
      const mockMaterials: MaterialWithAvailability[] = [
        {
          estimateId,
          estimateItemId: 'est-item-1',
          itemId: 'item-1',
          requiredQuantity: 1000,
          unit: 'pcs',
          reservationStrategy: 'auto',
          reservationId: 'res-1',
          preferredWarehouseId: 'wh-1',
          availabilityStatus: 'available',
          availableQuantity: 800,
          shortfallQuantity: 200,
          issueMethod: 'pick_and_stage',
          issuedQuantity: 0,
          actualConsumption: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          item: {
            id: 'item-1',
            name: 'Кирпич керамический',
            code: 'BRICK-001',
            baseUnit: 'pcs'
          } as Item,
          stockShortfall: 200,
          fulfillmentPercentage: 0
        },
        {
          estimateId,
          estimateItemId: 'est-item-2', 
          itemId: 'item-2',
          requiredQuantity: 50,
          unit: 'kg',
          reservationStrategy: 'manual',
          preferredWarehouseId: 'wh-1',
          availabilityStatus: 'partial',
          availableQuantity: 30,
          shortfallQuantity: 20,
          issueMethod: 'direct_issue',
          issuedQuantity: 0,
          actualConsumption: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          item: {
            id: 'item-2',
            name: 'Цемент М400',
            code: 'CEMENT-M400',
            baseUnit: 'kg'
          } as Item,
          stockShortfall: 20,
          fulfillmentPercentage: 0
        }
      ];
      
      setMaterials(mockMaterials);
      
    } catch (err) {
      console.error('Error loading materials:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [currentUser, estimateId]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const getAvailabilityStatus = (material: MaterialWithAvailability) => {
    if (material.availableQuantity >= material.requiredQuantity) {
      return { status: 'available', label: 'В наличии', color: 'success' as const };
    } else if (material.availableQuantity > 0) {
      return { status: 'partial', label: 'Частично', color: 'warning' as const };
    } else {
      return { status: 'unavailable', label: 'Нет в наличии', color: 'error' as const };
    }
  };

  const getFulfillmentIcon = (material: MaterialWithAvailability) => {
    const percentage = material.fulfillmentPercentage || 0;
    
    if (percentage === 0) return <WarningIcon color="disabled" />;
    if (percentage < 100) return <WarningIcon color="warning" />;
    return <OkIcon color="success" />;
  };

  const handleAddItem = async (item: Item) => {
    try {
      // В реальности здесь будет вызов API для добавления материала в смету
      console.log('Adding item to estimate:', item);
      
      await loadMaterials();
      setAddItemDialogOpen(false);
      
    } catch (error) {
      console.error('Error adding item:', error);
      setError(error instanceof Error ? error.message : 'Ошибка добавления');
    }
  };

  const handleReserveAll = async () => {
    try {
      setProcessing(true);
      await autoReserveMaterialsForEstimate(estimateId);
      await loadMaterials();
    } catch (error) {
      console.error('Error reserving materials:', error);
      setError(error instanceof Error ? error.message : 'Ошибка резервирования');
    } finally {
      setProcessing(false);
    }
  };

  const handleIssueAll = async () => {
    try {
      setProcessing(true);
      await issueMaterialsForEstimate(estimateId, []);
      await loadMaterials();
    } catch (error) {
      console.error('Error issuing materials:', error);
      setError(error instanceof Error ? error.message : 'Ошибка выдачи');
    } finally {
      setProcessing(false);
    }
  };

  const calculateTotalValue = () => {
    return materials.reduce((sum, material) => {
      const item = material.item;
      if (item && isProductItem(item) && item.productData.standardCost) {
        return sum + (material.requiredQuantity * item.productData.standardCost);
      }
      return sum;
    }, 0);
  };

  if (loading && materials.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Сводка по материалам */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6">
                  {materials.length}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Позиций материалов
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                <Typography variant="h6" color="success.contrastText">
                  {materials.filter(m => m.availabilityStatus === 'available').length}
                </Typography>
                <Typography variant="caption" color="success.contrastText">
                  В наличии
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                <Typography variant="h6" color="warning.contrastText">
                  {materials.filter(m => m.availabilityStatus === 'partial').length}
                </Typography>
                <Typography variant="caption" color="warning.contrastText">
                  Частично
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
                <Typography variant="h6" color="info.contrastText">
                  ₽{calculateTotalValue().toFixed(0)}
                </Typography>
                <Typography variant="caption" color="info.contrastText">
                  Общая стоимость
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* Основная таблица материалов */}
      <Card>
        <CardHeader 
          title="Материалы сметы"
          action={
            !readonly && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setAddItemDialogOpen(true)}
                >
                  Добавить
                </Button>
                {estimateStatus === 'approved' && (
                  <>
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<ReserveIcon />}
                      onClick={handleReserveAll}
                      disabled={processing}
                    >
                      Зарезервировать все
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<IssueIcon />}
                      onClick={handleIssueAll}
                      disabled={processing}
                    >
                      Выдать все
                    </Button>
                  </>
                )}
                <IconButton onClick={loadMaterials}>
                  <RefreshIcon />
                </IconButton>
              </Stack>
            )
          }
        />
        
        <CardContent sx={{ p: 0 }}>
          {materials.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Материалы не добавлены
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size={compact ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow>
                    <TableCell>Материал</TableCell>
                    <TableCell align="right">Требуется</TableCell>
                    <TableCell align="right">Доступно</TableCell>
                    <TableCell align="right">Зарезервировано</TableCell>
                    <TableCell align="right">Выдано</TableCell>
                    <TableCell>Обеспечение</TableCell>
                    <TableCell>Статус</TableCell>
                    {!readonly && <TableCell align="center">Действия</TableCell>}
                  </TableRow>
                </TableHead>
                
                <TableBody>
                  {materials.map((material) => {
                    const availability = getAvailabilityStatus(material);
                    
                    return (
                      <TableRow key={material.estimateItemId} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StockIcon color="primary" />
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {material.item?.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {material.item?.code}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {material.requiredQuantity} {material.unit}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography 
                            variant="body2"
                            color={material.availableQuantity >= material.requiredQuantity ? 'success.main' : 'warning.main'}
                          >
                            {material.availableQuantity} {material.unit}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography variant="body2">
                            {material.reservationId ? 'Да' : 'Нет'}
                          </Typography>
                        </TableCell>
                        
                        <TableCell align="right">
                          <Box>
                            <Typography variant="body2">
                              {material.issuedQuantity || 0} {material.unit}
                            </Typography>
                            {material.issuedQuantity && material.issuedQuantity > 0 && (
                              <LinearProgress 
                                variant="determinate" 
                                value={(material.issuedQuantity / material.requiredQuantity) * 100}
                                sx={{ mt: 0.5, height: 4 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={availability.label}
                              color={availability.color}
                              size="small"
                            />
                            {material.stockShortfall && material.stockShortfall > 0 && (
                              <Tooltip title={`Дефицит: ${material.stockShortfall} ${material.unit}`}>
                                <WarningIcon color="warning" fontSize="small" />
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getFulfillmentIcon(material)}
                            <Typography variant="caption">
                              {material.fulfillmentPercentage || 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        {!readonly && (
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="Редактировать">
                                <IconButton size="small">
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              
                              {!material.reservationId && estimateStatus === 'approved' && (
                                <Tooltip title="Зарезервировать">
                                  <IconButton size="small" color="warning">
                                    <ReserveIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              {material.reservationId && !material.issuedQuantity && (
                                <Tooltip title="Выдать">
                                  <IconButton size="small" color="primary">
                                    <IssueIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              <Tooltip title="Удалить">
                                <IconButton size="small" color="error">
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  
                  {/* Итоговая строка */}
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle1" fontWeight="bold">
                        ИТОГО:
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle1" fontWeight="bold">
                        {materials.reduce((sum, m) => sum + m.requiredQuantity, 0)} поз.
                      </Typography>
                    </TableCell>
                    <TableCell colSpan={3} />
                    <TableCell>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {materials.filter(m => m.availabilityStatus === 'available').length}/
                        {materials.length} обеспечено
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle1" fontWeight="bold">
                        ₽{calculateTotalValue().toFixed(0)}
                      </Typography>
                    </TableCell>
                    {!readonly && <TableCell />}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Диалог добавления материала */}
      <Dialog 
        open={addItemDialogOpen} 
        onClose={() => setAddItemDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Добавить материал в смету</DialogTitle>
        <DialogContent>
          <ItemSelector
            onSelect={handleAddItem}
            filter={{ type: ['product'] }}
            showStock={true}
            placeholder="Выберите товар..."
            label="Товар"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemDialogOpen(false)}>
            Отмена
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог резервирования */}
      <Dialog 
        open={reservationDialogOpen} 
        onClose={() => setReservationDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Резервирование материалов</DialogTitle>
        <DialogContent>
          {/* TODO: Restore ReservationPanel when react-hook-form conflicts are resolved */}
          <Typography>
            Резервирование материалов будет доступно после восстановления компонента ReservationPanel
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReservationDialogOpen(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EstimateMaterialsPanel;

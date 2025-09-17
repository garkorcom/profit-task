/**
 * LotTracker - Компонент для отслеживания партий товаров
 * Показывает информацию о партиях, сроках годности, остатках
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
  Tooltip,
  Alert,
  LinearProgress,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as OkIcon,
  Schedule as ExpiryIcon,
  Inventory as StockIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { StockLot, LotStatus } from '../../../types/warehouse.types';
import { Item } from '../../../types/item.types';
import { getStockLots, getStockBalance } from '../../../api/warehouseApi';
import { useAuth } from '../../../auth/AuthContext';
import LoadingSpinner from '../../common/LoadingSpinner';

interface LotTrackerProps {
  warehouseId?: string;
  itemId?: string;
  showFilters?: boolean;
  compact?: boolean;
}

interface LotWithItem extends StockLot {
  item?: Item;
  daysToExpiry?: number;
  expiryStatus?: 'ok' | 'warning' | 'expired';
}

const LotTracker: React.FC<LotTrackerProps> = ({
  warehouseId,
  itemId,
  showFilters = true,
  compact = false
}) => {
  const { currentUser } = useAuth();
  const [lots, setLots] = useState<LotWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Фильтры
  const [filters, setFilters] = useState({
    warehouseId: warehouseId || '',
    itemId: itemId || '',
    status: '' as LotStatus | '',
    expiryWarning: false,
    searchQuery: ''
  });

  const loadLots = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // В реальной системе здесь был бы вызов API
      // const result = await getStockLots(filters);
      
      // Мок данные для демонстрации
      const mockLots: LotWithItem[] = [
        {
          id: 'lot-1',
          itemId: 'item-1',
          warehouseId: 'wh-1',
          lotNumber: 'LOT-20241001-001',
          quantity: 50,
          reservedQuantity: 10,
          availableQuantity: 40,
          unit: 'pcs',
          unitCost: 150.00,
          totalCost: 7500.00,
          currency: 'RUB',
          receivedDate: '2024-10-01T10:00:00Z',
          expiryDate: '2025-04-01T00:00:00Z',
          status: 'available',
          createdBy: currentUser.uid,
          createdAt: '2024-10-01T10:00:00Z',
          updatedAt: '2024-10-01T10:00:00Z',
          version: 1,
          item: {
            id: 'item-1',
            name: 'Кирпич керамический',
            code: 'BRICK-001'
          } as Item,
          daysToExpiry: differenceInDays(parseISO('2025-04-01T00:00:00Z'), new Date()),
          expiryStatus: 'ok'
        },
        {
          id: 'lot-2',
          itemId: 'item-2',
          warehouseId: 'wh-1',
          lotNumber: 'LOT-20241015-002',
          quantity: 25,
          reservedQuantity: 25,
          availableQuantity: 0,
          unit: 'kg',
          unitCost: 75.50,
          totalCost: 1887.50,
          currency: 'RUB',
          receivedDate: '2024-10-15T14:30:00Z',
          expiryDate: '2024-12-15T00:00:00Z',
          status: 'reserved',
          createdBy: currentUser.uid,
          createdAt: '2024-10-15T14:30:00Z',
          updatedAt: '2024-10-15T14:30:00Z',
          version: 1,
          item: {
            id: 'item-2',
            name: 'Цемент М400',
            code: 'CEMENT-M400'
          } as Item,
          daysToExpiry: differenceInDays(parseISO('2024-12-15T00:00:00Z'), new Date()),
          expiryStatus: 'warning'
        }
      ];
      
      setLots(mockLots);
      
    } catch (err) {
      console.error('Error loading lots:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [currentUser, filters]);

  useEffect(() => {
    loadLots();
  }, [loadLots]);

  const getStatusColor = (status: LotStatus) => {
    switch (status) {
      case 'available': return 'success';
      case 'reserved': return 'warning';
      case 'quarantine': return 'info';
      case 'expired': return 'error';
      case 'damaged': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: LotStatus) => {
    switch (status) {
      case 'available': return 'Доступна';
      case 'reserved': return 'Зарезервирована';
      case 'quarantine': return 'Карантин';
      case 'expired': return 'Просрочена';
      case 'damaged': return 'Повреждена';
      default: return status;
    }
  };

  const getExpiryIcon = (lot: LotWithItem) => {
    if (!lot.expiryDate) return null;
    
    switch (lot.expiryStatus) {
      case 'expired':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'ok':
        return <OkIcon color="success" />;
      default:
        return null;
    }
  };

  const renderFilters = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Поиск по номеру партии, товару..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as LotStatus }))}
                label="Статус"
              >
                <MenuItem value="">Все</MenuItem>
                <MenuItem value="available">Доступные</MenuItem>
                <MenuItem value="reserved">Зарезервированные</MenuItem>
                <MenuItem value="quarantine">Карантин</MenuItem>
                <MenuItem value="expired">Просроченные</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => setFilters({
                  warehouseId: warehouseId || '',
                  itemId: itemId || '',
                  status: '',
                  expiryWarning: false,
                  searchQuery: ''
                })}
                size="small"
              >
                Очистить
              </Button>
              <Button
                variant="outlined"
                onClick={loadLots}
                startIcon={<RefreshIcon />}
                size="small"
              >
                Обновить
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  if (loading && lots.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {showFilters && renderFilters()}
      
      <Card>
        <CardHeader 
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StockIcon />
              Партии товаров
              {lots.length > 0 && (
                <Chip label={`${lots.length} партий`} size="small" />
              )}
            </Box>
          }
        />
        
        <CardContent sx={{ p: 0 }}>
          {lots.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Партии не найдены
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size={compact ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow>
                    <TableCell>Партия</TableCell>
                    <TableCell>Товар</TableCell>
                    <TableCell align="right">Количество</TableCell>
                    <TableCell align="right">Зарезервировано</TableCell>
                    <TableCell align="right">Доступно</TableCell>
                    <TableCell align="right">Стоимость</TableCell>
                    <TableCell>Срок годности</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell align="center">Действия</TableCell>
                  </TableRow>
                </TableHead>
                
                <TableBody>
                  {lots.map((lot) => (
                    <TableRow key={lot.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {lot.lotNumber}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {format(parseISO(lot.receivedDate), 'dd.MM.yyyy', { locale: ru })}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {lot.item?.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {lot.item?.code}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography variant="body2">
                          {lot.quantity} {lot.unit}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography variant="body2" color={lot.reservedQuantity > 0 ? 'warning.main' : 'textSecondary'}>
                          {lot.reservedQuantity} {lot.unit}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {lot.availableQuantity} {lot.unit}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography variant="body2">
                          ₽{lot.totalCost.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" display="block">
                          ₽{lot.unitCost.toFixed(2)}/{lot.unit}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        {lot.expiryDate ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getExpiryIcon(lot)}
                            <Box>
                              <Typography variant="caption">
                                {format(parseISO(lot.expiryDate), 'dd.MM.yyyy', { locale: ru })}
                              </Typography>
                              <Typography variant="caption" display="block" color="textSecondary">
                                {lot.daysToExpiry! > 0 
                                  ? `через ${lot.daysToExpiry} дн.`
                                  : `просрочено на ${Math.abs(lot.daysToExpiry!)} дн.`
                                }
                              </Typography>
                            </Box>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            Без ограничений
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(lot.status)}
                          color={getStatusColor(lot.status)}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell align="center">
                        <Tooltip title="Подробности">
                          <IconButton size="small">
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
      
      {/* Сводка по срокам годности */}
      {lots.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardHeader 
            title="Анализ сроков годности"
            avatar={<ExpiryIcon />}
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                  <Typography variant="h6" color="success.contrastText">
                    {lots.filter(l => l.expiryStatus === 'ok').length}
                  </Typography>
                  <Typography variant="caption" color="success.contrastText">
                    В норме
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                  <Typography variant="h6" color="warning.contrastText">
                    {lots.filter(l => l.expiryStatus === 'warning').length}
                  </Typography>
                  <Typography variant="caption" color="warning.contrastText">
                    Скоро истекут
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light' }}>
                  <Typography variant="h6" color="error.contrastText">
                    {lots.filter(l => l.expiryStatus === 'expired').length}
                  </Typography>
                  <Typography variant="caption" color="error.contrastText">
                    Просрочены
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
                  <Typography variant="h6" color="info.contrastText">
                    ₽{lots.reduce((sum, lot) => sum + lot.totalCost, 0).toFixed(0)}
                  </Typography>
                  <Typography variant="caption" color="info.contrastText">
                    Общая стоимость
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default LotTracker;

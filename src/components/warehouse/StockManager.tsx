/**
 * Компонент управления складскими остатками
 * Отображает остатки, позволяет создавать транзакции и управлять резервированием
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  LinearProgress,
  Stack,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  SwapHoriz as TransferIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  BookmarkBorder as ReserveIcon,
  History as HistoryIcon,
  GetApp as ExportIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  getStockBalances,
  getStockTransactions,
  createStockTransaction,
  getWarehouses,
  checkAvailability
} from '../../api/warehouseApi';
import { getItemsByIds } from '../../api/itemApi';
import {
  StockBalance,
  StockTransaction,
  Warehouse,
  CreateStockTransactionDto,
  StockBalanceFilters,
  AvailabilityCheck
} from '../../types/warehouse.types';
import { Item } from '../../types/item.types';

interface TransactionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (transaction: CreateStockTransactionDto) => Promise<void>;
  balance?: StockBalance;
  warehouses: Warehouse[];
}

const TransactionDialog: React.FC<TransactionDialogProps> = ({
  open,
  onClose,
  onConfirm,
  balance,
  warehouses
}) => {
  const [formData, setFormData] = useState<Partial<CreateStockTransactionDto>>({
    type: 'receipt',
    quantity: 1,
    warehouseId: balance?.warehouseId || '',
    itemId: balance?.itemId || '',
    unit: balance?.unit || 'pcs'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!formData.itemId || !formData.warehouseId || !formData.quantity) {
      setError('Заполните обязательные поля');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm(formData as CreateStockTransactionDto);
      onClose();
      setFormData({
        type: 'receipt',
        quantity: 1,
        warehouseId: balance?.warehouseId || '',
        itemId: balance?.itemId || '',
        unit: balance?.unit || 'pcs'
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка создания транзакции');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Складская операция
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Тип операции</InputLabel>
              <Select
                value={formData.type || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  type: e.target.value as any
                })}
              >
                <MenuItem value="receipt">Поступление</MenuItem>
                <MenuItem value="issue">Расход</MenuItem>
                <MenuItem value="adjustment">Корректировка</MenuItem>
                <MenuItem value="transfer">Перемещение</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Количество"
              type="number"
              value={formData.quantity || ''}
              onChange={(e) => setFormData({
                ...formData,
                quantity: Number(e.target.value)
              })}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Склад</InputLabel>
              <Select
                value={formData.warehouseId || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  warehouseId: e.target.value
                })}
              >
                {warehouses.map(warehouse => (
                  <MenuItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {(formData.type === 'receipt' || formData.type === 'adjustment') && (
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Себестоимость"
                type="number"
                value={formData.unitCost || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  unitCost: Number(e.target.value)
                })}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
          )}
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Примечание"
              multiline
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => setFormData({
                ...formData,
                notes: e.target.value
              })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Отмена
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Создание...' : 'Создать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const StockManager: React.FC = () => {
  const navigate = useNavigate();
  const [stockBalances, setStockBalances] = useState<StockBalance[]>([]);
  const [items, setItems] = useState<Map<string, Item>>(new Map());
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Фильтры
  const [filters, setFilters] = useState<StockBalanceFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(0); // 0: все, 1: в наличии, 2: резервы, 3: проблемы
  
  // Диалоги
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<StockBalance | null>(null);
  
  // Статистика
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    negativeStock: 0,
    lowStock: 0,
    reserved: 0
  });

  useEffect(() => {
    loadData();
  }, [filters, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Загружаем остатки с фильтрами
      const currentFilters: StockBalanceFilters = {
        ...filters,
        searchQuery: searchQuery || undefined
      };
      
      const balances = await getStockBalances(currentFilters);
      setStockBalances(balances);
      
      // Загружаем информацию о товарах
      const itemIds = Array.from(new Set(balances.map(b => b.itemId)));
      if (itemIds.length > 0) {
        const itemsList = await getItemsByIds(itemIds);
        const itemsMap = new Map(itemsList.map(item => [item.id, item]));
        setItems(itemsMap);
      }
      
      // Загружаем склады
      const warehousesData = await getWarehouses(true); // только активные
      setWarehouses(warehousesData);
      
      // Рассчитываем статистику
      const newStats = {
        totalItems: balances.length,
        totalValue: balances.reduce((sum, b) => sum + b.totalValue, 0),
        negativeStock: balances.filter(b => b.totalQuantity < 0).length,
        lowStock: balances.filter(b => b.totalQuantity > 0 && b.totalQuantity <= 5).length,
        reserved: balances.filter(b => b.reservedQuantity > 0).length
      };
      setStats(newStats);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (transactionDto: CreateStockTransactionDto) => {
    await createStockTransaction(transactionDto);
    await loadData(); // Перезагружаем данные
  };

  const handleTransactionClick = (balance: StockBalance) => {
    setSelectedBalance(balance);
    setTransactionDialogOpen(true);
  };

  const getFilteredBalances = () => {
    let filtered = stockBalances;
    
    // Фильтрация по вкладке
    switch (selectedTab) {
      case 1: // В наличии
        filtered = filtered.filter(b => b.totalQuantity > 0);
        break;
      case 2: // Резервы
        filtered = filtered.filter(b => b.reservedQuantity > 0);
        break;
      case 3: // Проблемы
        filtered = filtered.filter(b => b.totalQuantity < 0 || (b.totalQuantity > 0 && b.totalQuantity <= 5));
        break;
    }
    
    return filtered;
  };

  const getStockStatusColor = (balance: StockBalance): 'error' | 'warning' | 'success' | 'default' => {
    if (balance.totalQuantity < 0) return 'error';
    if (balance.totalQuantity <= 5) return 'warning';
    if (balance.totalQuantity > 0) return 'success';
    return 'default';
  };

  const getStockStatusText = (balance: StockBalance): string => {
    if (balance.totalQuantity < 0) return 'Отрицательный остаток';
    if (balance.totalQuantity === 0) return 'Нет в наличии';
    if (balance.totalQuantity <= 5) return 'Заканчивается';
    return 'В наличии';
  };

  const filteredBalances = getFilteredBalances();

  return (
    <Box p={3}>
      {/* Заголовок и действия */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Складские остатки
        </Typography>
        
        <Box display="flex" gap={1}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
            variant="outlined"
          >
            Обновить
          </Button>
          
          <Button
            startIcon={<ExportIcon />}
            variant="outlined"
            onClick={() => {
              // TODO: реализовать экспорт остатков
              console.log('Экспорт остатков');
            }}
          >
            Экспорт
          </Button>
          
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => navigate('/warehouse/transactions/new')}
          >
            Операция
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Статистические карточки */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ pb: 2 }}>
              <Typography color="text.secondary" variant="body2">
                Всего позиций
              </Typography>
              <Typography variant="h5">
                {stats.totalItems}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ pb: 2 }}>
              <Typography color="text.secondary" variant="body2">
                Общая стоимость
              </Typography>
              <Typography variant="h5">
                {stats.totalValue.toLocaleString()} ₽
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ pb: 2 }}>
              <Typography color="text.secondary" variant="body2">
                Зарезервировано
              </Typography>
              <Typography variant="h5" color="info.main">
                {stats.reserved}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ pb: 2 }}>
              <Typography color="text.secondary" variant="body2">
                Заканчивается
              </Typography>
              <Typography variant="h5" color="warning.main">
                {stats.lowStock}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ pb: 2 }}>
              <Typography color="text.secondary" variant="body2">
                Отрицательные
              </Typography>
              <Typography variant="h5" color="error.main">
                {stats.negativeStock}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Поиск и фильтры */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Поиск товара"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Код или название товара..."
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Склад</InputLabel>
                <Select
                  value={filters.warehouseId || ''}
                  onChange={(e) => setFilters({
                    ...filters,
                    warehouseId: e.target.value || undefined
                  })}
                >
                  <MenuItem value="">Все склады</MenuItem>
                  {warehouses.map(warehouse => (
                    <MenuItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setFilters({});
                  setSearchQuery('');
                }}
              >
                Сбросить фильтры
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Вкладки */}
      <Tabs 
        value={selectedTab} 
        onChange={(_, newValue) => setSelectedTab(newValue)}
        sx={{ mb: 2 }}
      >
        <Tab 
          label={
            <Badge badgeContent={stockBalances.length} color="primary">
              Все остатки
            </Badge>
          }
        />
        <Tab 
          label={
            <Badge badgeContent={stockBalances.filter(b => b.totalQuantity > 0).length} color="success">
              В наличии
            </Badge>
          }
        />
        <Tab 
          label={
            <Badge badgeContent={stats.reserved} color="info">
              Зарезервировано
            </Badge>
          }
        />
        <Tab 
          label={
            <Badge badgeContent={stats.negativeStock + stats.lowStock} color="error">
              Проблемы
            </Badge>
          }
        />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Таблица остатков */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Товар</TableCell>
              <TableCell align="right">Количество</TableCell>
              <TableCell align="right">Зарезервировано</TableCell>
              <TableCell align="right">Доступно</TableCell>
              <TableCell align="right">Стоимость</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBalances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {loading ? 'Загрузка...' : 'Нет данных'}
                </TableCell>
              </TableRow>
            ) : (
              filteredBalances.map((balance) => {
                const item = items.get(balance.itemId);
                const warehouse = warehouses.find(w => w.id === balance.warehouseId);
                
                return (
                  <TableRow key={balance.id} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" fontWeight="medium">
                          {item?.name || 'Неизвестный товар'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item?.code} • {warehouse?.name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        color={balance.totalQuantity < 0 ? 'error.main' : 'inherit'}
                        fontWeight={balance.totalQuantity < 0 ? 'bold' : 'normal'}
                      >
                        {balance.totalQuantity} {balance.unit}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography 
                        variant="body2"
                        color={balance.reservedQuantity > 0 ? 'info.main' : 'text.secondary'}
                      >
                        {balance.reservedQuantity} {balance.unit}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography variant="body2">
                        {balance.availableQuantity} {balance.unit}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography variant="body2">
                        {balance.totalValue.toLocaleString()} ₽
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({balance.avgUnitCost.toFixed(2)} ₽/{balance.unit})
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={getStockStatusText(balance)}
                        color={getStockStatusColor(balance)}
                        size="small"
                        icon={
                          balance.totalQuantity < 0 ? <ErrorIcon /> :
                          balance.totalQuantity <= 5 ? <WarningIcon /> :
                          <InfoIcon />
                        }
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="История">
                          <IconButton 
                            size="small"
                            onClick={() => navigate(`/warehouse/transactions?itemId=${balance.itemId}&warehouseId=${balance.warehouseId}`)}
                          >
                            <HistoryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Операция">
                          <IconButton 
                            size="small"
                            onClick={() => handleTransactionClick(balance)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        {balance.availableQuantity > 0 && (
                          <Tooltip title="Зарезервировать">
                            <IconButton 
                              size="small"
                              onClick={() => navigate(`/warehouse/reservations/new?itemId=${balance.itemId}&warehouseId=${balance.warehouseId}`)}
                            >
                              <ReserveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Диалог создания транзакции */}
      <TransactionDialog
        open={transactionDialogOpen}
        onClose={() => {
          setTransactionDialogOpen(false);
          setSelectedBalance(null);
        }}
        onConfirm={handleCreateTransaction}
        balance={selectedBalance || undefined}
        warehouses={warehouses}
      />
    </Box>
  );
};

export default StockManager;
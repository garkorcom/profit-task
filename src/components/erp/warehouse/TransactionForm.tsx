/**
 * TransactionForm - Форма создания складских документов
 * Поддерживает поступление, расход, перемещение, корректировку
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Paper,
  Stack
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Receipt as ReceiptIcon,
  Send as IssueIcon,
  SwapHoriz as TransferIcon,
  Edit as AdjustIcon
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
  StockTransactionType,
  TransactionStatus,
  CreateStockTransactionDto
} from '../../../types/warehouse.types';
import { Item, isProductItem } from '../../../types/item.types';
import { 
  createStockTransaction,
  getWarehouses,
  getWarehouseBins
} from '../../../api/warehouseApi';
import { ItemSelector } from '../items';
import { useAuth } from '../../../auth/AuthContext';
import LoadingSpinner from '../../common/LoadingSpinner';

interface TransactionLine {
  itemId: string;
  item?: Item;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  binId?: string;
  lotNumber?: string;
  notes?: string;
}

interface TransactionFormData {
  type: StockTransactionType;
  warehouseId: string;
  toWarehouseId?: string;
  transactionDate: Date;
  documentNumber?: string;
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  notes?: string;
  lines: TransactionLine[];
}

interface TransactionFormProps {
  warehouseId?: string;
  onSave: (transaction: CreateStockTransactionDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const TRANSACTION_TYPES: { value: StockTransactionType; label: string; icon: React.ReactNode }[] = [
  { value: 'receipt', label: 'Поступление', icon: <ReceiptIcon /> },
  { value: 'issue', label: 'Расход', icon: <IssueIcon /> },
  { value: 'transfer', label: 'Перемещение', icon: <TransferIcon /> },
  { value: 'adjustment', label: 'Корректировка', icon: <AdjustIcon /> }
];

const TransactionForm: React.FC<TransactionFormProps> = ({
  warehouseId,
  onSave,
  onCancel,
  loading = false
}) => {
  const { currentUser } = useAuth();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [bins, setBins] = useState<any[]>([]);
  const [itemSelectorOpen, setItemSelectorOpen] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<TransactionFormData>({
    defaultValues: {
      type: 'receipt',
      warehouseId: warehouseId || '',
      transactionDate: new Date(),
      lines: []
    }
  });

  const { fields: lines, append, remove, update } = useFieldArray({
    control,
    name: 'lines'
  });

  const watchedType = watch('type');
  const watchedWarehouseId = watch('warehouseId');

  // Загрузка складов
  useEffect(() => {
    const loadWarehouses = async () => {
      if (!currentUser) return;
      
      try {
        const result = await getWarehouses();
        setWarehouses(result);
        
        if (!warehouseId && result.length > 0) {
          setValue('warehouseId', result[0].id);
        }
      } catch (error) {
        console.error('Error loading warehouses:', error);
      }
    };

    loadWarehouses();
  }, [currentUser, warehouseId, setValue]);

  // Загрузка ячеек склада
  useEffect(() => {
    const loadBins = async () => {
      if (!watchedWarehouseId) return;
      
      try {
        const result = await getWarehouseBins(watchedWarehouseId);
        setBins(result);
      } catch (error) {
        console.error('Error loading bins:', error);
      }
    };

    loadBins();
  }, [watchedWarehouseId]);

  const handleAddItem = (item: Item) => {
    const newLine: TransactionLine = {
      itemId: item.id,
      item: item,
      quantity: 1,
      unitCost: isProductItem(item) ? item.productData.standardCost : undefined,
      totalCost: isProductItem(item) ? item.productData.standardCost : undefined
    };

    append(newLine);
    setItemSelectorOpen(false);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const line = lines[index];
    const unitCost = line.unitCost || 0;
    const totalCost = quantity * unitCost;
    
    update(index, {
      ...line,
      quantity,
      totalCost
    });
  };

  const handleUnitCostChange = (index: number, unitCost: number) => {
    const line = lines[index];
    const totalCost = line.quantity * unitCost;
    
    update(index, {
      ...line,
      unitCost,
      totalCost
    });
  };

  const calculateTotal = () => {
    return lines.reduce((sum, line) => sum + (line.totalCost || 0), 0);
  };

  const onSubmit = async (data: TransactionFormData) => {
    try {
      if (lines.length === 0) {
        throw new Error('Добавьте хотя бы одну позицию');
      }

      // Создаем DTO для каждой строки (в реальности может быть один документ с множественными строками)
      for (const line of data.lines) {
        const transactionDto: CreateStockTransactionDto = {
          type: data.type,
          itemId: line.itemId,
          quantity: data.type === 'issue' ? -line.quantity : line.quantity,
          unit: line.item?.baseUnit || 'pcs',
          warehouseId: data.warehouseId,
          binId: line.binId,
          toWarehouseId: data.toWarehouseId,
          unitCost: line.unitCost,
          currency: 'RUB',
          newLotData: data.type === 'receipt' ? {
            lotNumber: line.lotNumber || `LOT-${Date.now()}`,
            productionDate: data.transactionDate.toISOString(),
          } : undefined,
          referenceType: data.referenceType as any,
          referenceId: data.referenceId,
          documentNumber: data.documentNumber,
          reason: data.reason,
          notes: data.notes
        };

        await createStockTransaction(transactionDto);
      }

      await onSave({} as any); // Уведомляем родительский компонент
      
    } catch (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
  };

  const getTransactionTypeIcon = (type: StockTransactionType) => {
    return TRANSACTION_TYPES.find(t => t.value === type)?.icon;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader 
        title="Складской документ"
        avatar={getTransactionTypeIcon(watchedType)}
        action={
          <Stack direction="row" spacing={1}>
            <Button 
              variant="outlined" 
              onClick={onCancel}
              startIcon={<CancelIcon />}
            >
              Отмена
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSubmit(onSubmit)}
              startIcon={<SaveIcon />}
            >
              Сохранить
            </Button>
          </Stack>
        }
      />
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Заголовок документа */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Тип операции</InputLabel>
                    <Select {...field} label="Тип операции">
                      {TRANSACTION_TYPES.map(type => (
                        <MenuItem key={type.value} value={type.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {type.icon}
                            {type.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Controller
                name="warehouseId"
                control={control}
                rules={{ required: 'Выберите склад' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.warehouseId}>
                    <InputLabel>Склад</InputLabel>
                    <Select {...field} label="Склад">
                      {warehouses.map(warehouse => (
                        <MenuItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            
            {watchedType === 'transfer' && (
              <Grid item xs={12} md={3}>
                <Controller
                  name="toWarehouseId"
                  control={control}
                  rules={{ required: 'Выберите склад назначения' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.toWarehouseId}>
                      <InputLabel>Склад назначения</InputLabel>
                      <Select {...field} label="Склад назначения">
                        {warehouses
                          .filter(w => w.id !== watchedWarehouseId)
                          .map(warehouse => (
                            <MenuItem key={warehouse.id} value={warehouse.id}>
                              {warehouse.name}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            )}
            
            <Grid item xs={12} md={3}>
              <Controller
                name="transactionDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    {...field}
                    label="Дата операции"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.transactionDate
                      }
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>

          {/* Дополнительные поля */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Controller
                name="documentNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Номер документа"
                    fullWidth
                    placeholder="Авто-генерация"
                  />
                )}
              />
            </Grid>
            
            {(watchedType === 'adjustment' || watchedType === 'loss') && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="reason"
                  control={control}
                  rules={{ required: 'Укажите причину' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.reason}>
                      <InputLabel>Причина</InputLabel>
                      <Select {...field} label="Причина">
                        <MenuItem value="inventory">Инвентаризация</MenuItem>
                        <MenuItem value="damage">Брак/порча</MenuItem>
                        <MenuItem value="loss">Техническая потеря</MenuItem>
                        <MenuItem value="error">Ошибка учета</MenuItem>
                        <MenuItem value="return">Возврат</MenuItem>
                        <MenuItem value="other">Прочее</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Строки документа */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Позиции документа</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setItemSelectorOpen(true)}
              >
                Добавить товар
              </Button>
            </Box>

            {lines.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">
                  Добавьте товары в документ
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Товар</TableCell>
                      <TableCell align="right">Количество</TableCell>
                      <TableCell align="right">Цена</TableCell>
                      <TableCell align="right">Сумма</TableCell>
                      <TableCell>Ячейка</TableCell>
                      {watchedType === 'receipt' && <TableCell>Партия</TableCell>}
                      <TableCell align="center">Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {line.item?.name || line.itemId}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {line.item?.code} • {line.item?.baseUnit}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={line.quantity}
                            onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                            inputProps={{ min: 0, step: 0.01 }}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        
                        <TableCell align="right">
                          {(watchedType === 'receipt' || watchedType === 'adjustment') && (
                            <TextField
                              type="number"
                              size="small"
                              value={line.unitCost || ''}
                              onChange={(e) => handleUnitCostChange(index, parseFloat(e.target.value) || 0)}
                              inputProps={{ min: 0, step: 0.01 }}
                              sx={{ width: 100 }}
                            />
                          )}
                        </TableCell>
                        
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {line.totalCost ? `₽${line.totalCost.toFixed(2)}` : '-'}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <Select
                              value={line.binId || ''}
                              onChange={(e) => update(index, { ...line, binId: e.target.value })}
                              displayEmpty
                            >
                              <MenuItem value="">Не указана</MenuItem>
                              {bins.map(bin => (
                                <MenuItem key={bin.id} value={bin.id}>
                                  {bin.code}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        
                        {watchedType === 'receipt' && (
                          <TableCell>
                            <TextField
                              size="small"
                              placeholder="LOT-001"
                              value={line.lotNumber || ''}
                              onChange={(e) => update(index, { ...line, lotNumber: e.target.value })}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                        )}
                        
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => remove(index)}
                          >
                            <RemoveIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {/* Итоговая строка */}
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          ИТОГО:
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1" fontWeight="bold">
                          ₽{calculateTotal().toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell colSpan={watchedType === 'receipt' ? 3 : 2} />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          {/* Примечания */}
          <Grid container spacing={3}>
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
        </form>
      </CardContent>

      {/* Селектор товаров */}
      <Dialog
        open={itemSelectorOpen}
        onClose={() => setItemSelectorOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Выбор товара</DialogTitle>
        <DialogContent>
          <ItemSelector
            onSelect={handleAddItem}
            filter={{ type: ['product'] }} // Только товары для складских операций
            showStock={true}
            placeholder="Найти товар..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemSelectorOpen(false)}>
            Отмена
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default TransactionForm;

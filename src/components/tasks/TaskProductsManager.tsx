/**
 * Компонент для управления товарами в задаче
 * Позволяет резервировать товары под задачу и отслеживать их использование
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { Product, getProductsStream, reserveStock, unreserveStock } from '../../api/productApi';
import { Task } from '../../api/taskApi';

interface TaskProductsManagerProps {
  task: Task;
  userId: string;
  onUpdate: (reservedProducts: Task['reservedProducts']) => void;
  disabled?: boolean;
}

const TaskProductsManager: React.FC<TaskProductsManagerProps> = ({
  task,
  userId,
  onUpdate,
  disabled = false
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Загружаем список товаров
  useEffect(() => {
    if (!userId) return;
    
    const unsubscribe = getProductsStream(userId, (data) => {
      setProducts(data);
    });
    
    return () => unsubscribe();
  }, [userId]);

  // Обработчик добавления товара
  const handleAddProduct = async () => {
    if (!selectedProduct || quantity <= 0) return;
    
    setLoading(true);
    setError('');
    
    try {
      const product = products.find(p => p.id === selectedProduct);
      if (!product) throw new Error('Товар не найден');
      
      // Резервируем товар
      await reserveStock(userId, selectedProduct, quantity, task.id, task.task);
      
      // Обновляем список зарезервированных товаров
      const newReservedProducts = [
        ...(task.reservedProducts || []),
        {
          productId: selectedProduct,
          productName: product.name,
          quantity,
          unit: product.unit
        }
      ];
      
      onUpdate(newReservedProducts);
      
      // Закрываем диалог и сбрасываем форму
      setDialogOpen(false);
      setSelectedProduct('');
      setQuantity(1);
    } catch (err: any) {
      setError(err.message || 'Ошибка при резервировании товара');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик удаления товара из резерва
  const handleRemoveProduct = async (productId: string, quantity: number) => {
    setLoading(true);
    
    try {
      // Снимаем резерв с товара
      await unreserveStock(userId, productId, quantity, task.id, task.task);
      
      // Обновляем список зарезервированных товаров
      const newReservedProducts = (task.reservedProducts || [])
        .filter(p => p.productId !== productId);
      
      onUpdate(newReservedProducts);
    } catch (err: any) {
      setError(err.message || 'Ошибка при снятии резерва');
    } finally {
      setLoading(false);
    }
  };

  // Получаем доступные товары (с учётом уже зарезервированных)
  const availableProducts = products.filter(product => {
    // Исключаем уже зарезервированные товары
    const isAlreadyReserved = task.reservedProducts?.some(
      rp => rp.productId === product.id
    );
    // Показываем только товары с доступным остатком
    const hasAvailableStock = (product.availableStock || 0) > 0;
    
    return !isAlreadyReserved && hasAvailableStock;
  });

  // Выбранный товар для отображения информации
  const selectedProductData = products.find(p => p.id === selectedProduct);

  return (
    <Box>
      {/* Заголовок и кнопка добавления */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle2" color="text.secondary">
          <InventoryIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
          Зарезервированные товары
        </Typography>
        {!disabled && (
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            disabled={availableProducts.length === 0}
          >
            Добавить
          </Button>
        )}
      </Box>

      {/* Список зарезервированных товаров */}
      {task.reservedProducts && task.reservedProducts.length > 0 ? (
        <List dense>
          {task.reservedProducts.map((item, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={item.productName}
                secondary={`${item.quantity} ${item.unit}`}
              />
              {!disabled && (
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleRemoveProduct(item.productId, item.quantity)}
                    disabled={loading}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Нет зарезервированных товаров
        </Typography>
      )}

      {/* Диалог добавления товара */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Резервировать товар</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            
            {availableProducts.length === 0 ? (
              <Alert severity="warning">
                Нет доступных товаров для резервирования
              </Alert>
            ) : (
              <>
                <FormControl fullWidth>
                  <InputLabel>Товар</InputLabel>
                  <Select
                    value={selectedProduct}
                    label="Товар"
                    onChange={(e) => setSelectedProduct(e.target.value)}
                  >
                    {availableProducts.map(product => (
                      <MenuItem key={product.id} value={product.id}>
                        <Box width="100%">
                          <Typography>{product.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Доступно: {product.availableStock} {product.unit}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {selectedProductData && (
                  <>
                    <TextField
                      label="Количество"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {selectedProductData.unit}
                          </InputAdornment>
                        ),
                        inputProps: {
                          min: 1,
                          max: selectedProductData.availableStock || 0
                        }
                      }}
                      helperText={`Максимум: ${selectedProductData.availableStock} ${selectedProductData.unit}`}
                    />
                    
                    {selectedProductData.description && (
                      <Alert severity="info">
                        {selectedProductData.description}
                      </Alert>
                    )}
                  </>
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleAddProduct}
            variant="contained"
            disabled={!selectedProduct || quantity <= 0 || loading}
          >
            {loading ? 'Резервирование...' : 'Резервировать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskProductsManager;

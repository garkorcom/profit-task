import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  AddCircle as IncomeIcon,
  RemoveCircle as ExpenseIcon,
  Warning as WarningIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Notification from '../components/common/Notification';
import {
  Product,
  StockMovement,
  getProductsStream,
  getCriticalStockProducts,
  getStockMovementsStream,
  addProduct,
  updateProduct,
  deleteProduct,
  addStock,
  removeStock
} from '../api/productApi';

// ... (StockIndicator component remains the same)

const ProductsPage: React.FC = () => {
  const { currentUser } = useAuth();
  
  // ... (all existing state remains the same)
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    type: 'product',
    sku: '',
    unit: 'шт',
    category: '',
    minStock: 0,
    currentStock: 0,
    costPrice: 0,
    salePrice: 0,
    supplier: '',
    description: ''
  });

  // ... (useEffect and other handlers remain mostly the same, with adjustments for the new `type` field)
  
  const handleOpenProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        ...product
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        type: 'product',
        sku: '',
        unit: 'шт',
        category: '',
        minStock: 0,
        currentStock: 0,
        costPrice: 0,
        salePrice: 0,
        supplier: '',
        description: ''
      });
    }
    setProductDialog(true);
  };

  const handleSaveProduct = async () => {
    if (!currentUser || !productForm.name || !productForm.unit) return;
    
    try {
      if (editingProduct) {
        await updateProduct(currentUser.uid, editingProduct.id, productForm);
        setNotification({
          open: true,
          message: 'Позиция успешно обновлена',
          severity: 'success'
        });
      } else {
        await addProduct(currentUser.uid, productForm as Omit<Product, 'id'>);
        setNotification({
          open: true,
          message: 'Позиция успешно добавлена',
          severity: 'success'
        });
      }
      handleCloseProductDialog();
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      setNotification({
        open: true,
        message: 'Ошибка при сохранении',
        severity: 'error'
      });
    }
  };


  // ... (rest of the component remains the same, with UI adjustments)
  
  return (
    <Box>
       {/* Header */}
       <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          <CategoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Товары и Услуги
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<IncomeIcon />}
            onClick={() => handleOpenMovementDialog('income')}
            color="success"
          >
            Приход
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExpenseIcon />}
            onClick={() => handleOpenMovementDialog('expense')}
            color="error"
          >
            Расход
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenProductDialog()}
          >
            Новая позиция
          </Button>
        </Box>
      </Box>

      {/* ... (rest of the render method with adjustments) */}

      {/* Dialog for new/edit product */}
      <Dialog open={productDialog} onClose={handleCloseProductDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProduct ? 'Редактировать позицию' : 'Новая позиция'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <ToggleButtonGroup
              value={productForm.type}
              exclusive
              onChange={(e, newType) => {
                if (newType) setProductForm({...productForm, type: newType });
              }}
              fullWidth
              sx={{ mb: 1 }}
            >
              <ToggleButton value="product">Товар</ToggleButton>
              <ToggleButton value="service">Услуга</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              label="Название"
              value={productForm.name}
              onChange={(e) => setProductForm({...productForm, name: e.target.value})}
              required
              fullWidth
            />
            {/* ... other fields */}

            {productForm.type === 'product' && (
              <>
                <Box display="flex" gap={2}>
                  {!editingProduct && (
                    <TextField
                      label="Начальный остаток"
                      type="number"
                      value={productForm.currentStock}
                      onChange={(e) => setProductForm({...productForm, currentStock: Number(e.target.value)})}
                      fullWidth
                    />
                  )}
                  <TextField
                    label="Минимальный остаток"
                    type="number"
                    value={productForm.minStock}
                    onChange={(e) => setProductForm({...productForm, minStock: Number(e.target.value)})}
                    fullWidth
                    helperText="Для уведомлений"
                  />
                </Box>
              </>
            )}
            {/* ... other fields */}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProductDialog}>Отмена</Button>
          <Button 
            onClick={handleSaveProduct} 
            variant="contained"
            disabled={!productForm.name || !productForm.unit}
          >
            {editingProduct ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* ... (rest of the component) */}
    </Box>
  );
};

export default ProductsPage;



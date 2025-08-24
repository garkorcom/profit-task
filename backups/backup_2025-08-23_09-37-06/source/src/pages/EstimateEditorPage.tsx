import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
} from '@mui/material';
import { Delete as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Estimate, EstimateItem, getEstimateStream, addEstimate, updateEstimate } from '../api/estimateApi';
import { Product, getProductsStream, addProduct } from '../api/productApi';
import { createFilterOptions } from '@mui/material/Autocomplete';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';

const EstimateEditorPage: React.FC = () => {
  const { projectId, estimateId } = useParams<{ projectId: string; estimateId: string }>();
  const { currentUser, ownerUid } = useAuth();
  const navigate = useNavigate();

  const [estimate, setEstimate] = useState<Partial<Estimate>>({
    items: [],
    total: 0,
    status: 'draft',
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const filter = createFilterOptions<any>();

  useEffect(() => {
    if (!currentUser) return;
    
    if (estimateId && estimateId !== 'new') {
      const uid = ownerUid || currentUser.uid;
      const unsubEstimate = getEstimateStream(uid, estimateId, (data) => {
        if (data) setEstimate(data);
        setLoading(false);
      });
      return unsubEstimate;
    } else {
      setLoading(false);
    }
  }, [currentUser, ownerUid, estimateId]);

  useEffect(() => {
    if (!currentUser) return;
    const uid = ownerUid || currentUser.uid;
    const unsubProducts = getProductsStream(uid, setProducts);
    return unsubProducts;
  }, [currentUser, ownerUid]);

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...(estimate.items || [])];
    const item = { ...items[index], [field]: value } as EstimateItem;
    if (field === 'quantity' || field === 'rate') {
      item.total = (item.quantity || 0) * (item.rate || 0);
    }
    items[index] = item;
    recalculateTotals(items);
  };

  const addItem = (product: Product | null) => {
    if (!product) return;
    const newItem: EstimateItem = {
      id: product.id,
      name: product.name,
      unit: product.unit || 'шт',
      quantity: 1,
      rate: product.salePrice || 0,
      total: product.salePrice || 0,
      type: product.type === 'product' ? 'material' : 'work',
      order: estimate.items?.length || 0,
      level: 0
    };
    const items = [...(estimate.items || []), newItem];
    recalculateTotals(items);
  };

  const removeItem = (index: number) => {
    const items = [...(estimate.items || [])];
    items.splice(index, 1);
    recalculateTotals(items);
  };

  const recalculateTotals = (items: EstimateItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal; // здесь можно учесть налоги/скидки при необходимости
    setEstimate(prev => ({ ...prev, items, subtotal, total }));
  };

  const handleSave = async () => {
    if (!currentUser || !projectId) return;
    try {
      const uid = ownerUid || currentUser.uid;
      if (estimateId === 'new') {
        const newEstimate = {
          ...estimate,
          projectId,
          number: `СМ-${Date.now()}`, // Simple number generation
        } as Omit<Estimate, 'id'>;
        await addEstimate(uid, projectId!, newEstimate);
      } else if(estimateId) {
        await updateEstimate(uid, estimateId, estimate);
      }
      setNotification({ open: true, message: 'Смета сохранена', severity: 'success' });
      navigate(`/projects/${projectId}/estimates`);
    } catch (error) {
      setNotification({ open: true, message: 'Ошибка сохранения', severity: 'error' });
    }
  };

  if (loading) return <LoadingSpinner />;
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {estimateId === 'new' ? 'Новая смета' : `Редактирование сметы №${estimate.number}`}
      </Typography>
      
      <TextField
        label="Описание"
        value={estimate.description || ''}
        onChange={(e) => setEstimate({...estimate, description: e.target.value})}
        fullWidth
        sx={{ mb: 2 }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Наименование</TableCell>
              <TableCell align="right">Кол-во</TableCell>
              <TableCell>Ед.изм.</TableCell>
              <TableCell align="right">Цена</TableCell>
              <TableCell align="right">Сумма</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(estimate.items || []).map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.name}</TableCell>
                <TableCell align="right">
                  <TextField type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))} size="small" />
                </TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell align="right">
                  <TextField type="number" value={item.rate || 0} onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value))} size="small" />
                </TableCell>
                <TableCell align="right">{item.total.toFixed(2)}</TableCell>
                <TableCell>
                  <IconButton onClick={() => removeItem(index)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Autocomplete
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        freeSolo
        options={products}
        filterOptions={(options, params) => {
          const filtered = filter(options, params);
          const { inputValue } = params;
          const isExisting = options.some((option) => option.name.toLowerCase() === inputValue.toLowerCase());
          if (inputValue !== '' && !isExisting) {
            filtered.push({ inputValue, name: `Создать "${inputValue}"`, isNew: true });
          }
          return filtered;
        }}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          if ((option as any).isNew) return (option as any).name;
          return (option as Product).name;
        }}
        onChange={async (e, value) => {
          if (!currentUser) return;
          if (!value) return;
          // Если пользователь нажал Enter по введённому тексту
          if (typeof value === 'string') {
            const byName = products.find(p => p.name.toLowerCase() === value.toLowerCase());
            if (byName) {
              addItem(byName);
              return;
            }
            // Создаём новую позицию с введённым именем
            try {
              const newId = await addProduct(currentUser.uid, {
                name: value,
                type: 'product',
                unit: 'шт',
                sku: '',
                category: '',
                minStock: 0,
                currentStock: 0,
                costPrice: 0,
                salePrice: 0,
                supplier: '',
                description: ''
              } as Omit<Product, 'id'>);
              const created: Product = {
                id: newId,
                name: value,
                type: 'product',
                unit: 'шт',
                currentStock: 0,
                salePrice: 0
              } as Product;
              addItem(created);
              setNotification({ open: true, message: `Позиция "${value}" создана и добавлена`, severity: 'success' });
            } catch (err) {
              setNotification({ open: true, message: 'Ошибка при создании позиции', severity: 'error' });
            }
            return;
          }
          if ((value as any).isNew) {
            const inputValue = (value as any).inputValue as string;
            try {
              const newId = await addProduct(currentUser.uid, {
                name: inputValue,
                type: 'product',
                unit: 'шт',
                sku: '',
                category: '',
                minStock: 0,
                currentStock: 0,
                costPrice: 0,
                salePrice: 0,
                supplier: '',
                description: ''
              } as Omit<Product, 'id'>);
              const created: Product = {
                id: newId,
                name: inputValue,
                type: 'product',
                unit: 'шт',
                currentStock: 0,
                salePrice: 0
              } as Product;
              addItem(created);
              setNotification({ open: true, message: `Позиция "${inputValue}" создана и добавлена`, severity: 'success' });
            } catch (err) {
              setNotification({ open: true, message: 'Ошибка при создании позиции', severity: 'error' });
            }
          } else {
            addItem(value as Product);
          }
        }}
        renderInput={(params) => <TextField {...params} label="Добавить позицию" sx={{ mt: 2 }} />}
      />

      <Typography variant="h5" align="right" sx={{ mt: 2 }}>
        Итого: {estimate.total?.toFixed(2) || '0.00'} ₽
      </Typography>

      <Button
        variant="contained"
        startIcon={<SaveIcon />}
        onClick={handleSave}
        sx={{ mt: 2 }}
      >
        Сохранить смету
      </Button>
      
      <Notification 
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification({ ...notification, open: false })}
      />
    </Box>
  );
};

export default EstimateEditorPage;

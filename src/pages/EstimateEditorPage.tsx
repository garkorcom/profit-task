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
import { Estimate, EstimateItem as CoreEstimateItem, getEstimateStream, addEstimate, updateEstimate } from '../api/estimateApi';
import { Product, getProductsStream } from '../api/productApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';

// Extend local item type to temporarily carry price for simple calc
type EstimateItem = CoreEstimateItem & { price?: number };

const EstimateEditorPage: React.FC = () => {
  const { projectId, estimateId } = useParams<{ projectId: string; estimateId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [estimate, setEstimate] = useState<Partial<Estimate>>({
    items: [],
    subtotal: 0,
    total: 0,
    status: 'draft',
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    if (!currentUser) return;
    
    if (estimateId && estimateId !== 'new') {
      const unsubEstimate = getEstimateStream(currentUser.uid, estimateId, (data) => {
        if (data) setEstimate(data);
        setLoading(false);
      });
      return unsubEstimate;
    } else {
      setLoading(false);
    }
  }, [currentUser, estimateId]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubProducts = getProductsStream(currentUser.uid, setProducts);
    return unsubProducts;
  }, [currentUser]);

  const updateItem = (index: number, field: keyof EstimateItem, value: any) => {
    const items = [...(estimate.items || [])];
    const item = { ...(items[index] as EstimateItem), [field]: value } as EstimateItem;
    if (field === 'quantity' || field === 'price') {
      item.total = (item.quantity || 0) * ((item.price as number) || 0);
    }
    items[index] = item;
    recalculateTotals(items);
  };

  const addItem = (product: Product | null) => {
    if (!product) return;
    const newItem: EstimateItem = {
      id: product.id,
      name: product.name,
      unit: product.unit,
      quantity: 1,
      price: product.salePrice || 0,
      total: product.salePrice || 0,
      type: product.type === 'service' ? 'work' : 'material',
      level: 0,
      order: (estimate.items?.length || 0),
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
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const total = subtotal; // no tax/discount here
    setEstimate(prev => ({ ...prev, items, subtotal, total }));
  };

  const handleSave = async () => {
    if (!currentUser || !projectId) return;
    try {
      if (estimateId === 'new') {
        const newEstimate = {
          ...estimate,
          projectId,
          number: `СМ-${Date.now()}`, // Simple number generation
        } as Omit<Estimate, 'id'>;
        await addEstimate(currentUser.uid, newEstimate);
      } else if(estimateId) {
        await updateEstimate(currentUser.uid, estimateId, estimate);
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
                  <TextField type="number" value={(item as any).price ?? 0} onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))} size="small" />
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
        options={products}
        getOptionLabel={(option) => option.name}
        onChange={(e, value) => addItem(value)}
        renderInput={(params) => <TextField {...params} label="Добавить позицию" sx={{ mt: 2 }} />}
      />

      <Typography variant="h5" align="right" sx={{ mt: 2 }}>
        Итого: {(estimate.total || 0).toFixed(2)} ₽
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

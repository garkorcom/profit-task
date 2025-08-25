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
import { Delete as DeleteIcon, Save as SaveIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Estimate, EstimateItem as CoreEstimateItem, getEstimateStream, addEstimate, updateEstimate, updateEstimateStatus } from '../api/estimateApi';
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
  const productById = React.useMemo(() => {
    const map: Record<string, Product> = {};
    products.forEach(p => { map[p.id] = p; });
    return map;
  }, [products]);
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
      id: `${Date.now()}-${product.id}`,
      name: product.name,
      unit: product.unit,
      quantity: 1,
      price: product.salePrice || 0,
      total: product.salePrice || 0,
      type: product.type === 'service' ? 'work' : 'material',
      level: 0,
      order: (estimate.items?.length || 0),
      // Привязка к товару для резервирования
      productId: product.type === 'service' ? undefined : product.id,
      // Дублируем значения в material-поля для совместимости
      materialQuantity: product.type === 'service' ? undefined : 1,
      materialUnit: product.type === 'service' ? undefined : product.unit,
      materialCost: product.type === 'service' ? undefined : (product.salePrice || 0),
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

  const handleChangeStatus = async (next: 'sent' | 'approved' | 'rejected' | 'cancelled') => {
    if (!currentUser || !estimateId) return;
    try {
      // Предупреждение о превышении доступного при одобрении
      if (next === 'approved') {
        const over: { name: string; need: number; avail: number }[] = [];
        (estimate.items || []).forEach((it: any) => {
          if (it.type === 'material' && it.productId) {
            const prod = productById[it.productId];
            const need = it.materialQuantity ?? it.quantity ?? 0;
            const avail = (prod?.availableStock ?? (prod?.currentStock || 0) - (prod?.reservedStock || 0)) || 0;
            if (need > avail) over.push({ name: it.name, need, avail });
          }
        });
        if (over.length > 0) {
          // Только предупредим, не блокируем
          setNotification({ open: true, message: `Внимание: в ${over.length} позициях недостаточно доступного остатка`, severity: 'error' });
        }
      }
      // Передаём текущий снимок сметы для корректной обработки резервов
      await updateEstimateStatus(currentUser.uid, estimateId, next, {
        id: estimateId,
        projectId: projectId || '',
        number: (estimate as any).number,
        name: (estimate as any).name,
        items: (estimate.items || []) as any,
        subtotal: estimate.subtotal || 0,
        total: estimate.total || 0,
        status: (estimate.status as any) || 'draft'
      } as Estimate);
      setEstimate(prev => ({ ...prev, status: next }));
      setNotification({ open: true, message: `Статус изменён: ${next}`, severity: 'success' });
    } catch (e) {
      setNotification({ open: true, message: 'Ошибка смены статуса', severity: 'error' });
    }
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
              <TableCell>Доступно для резерва</TableCell>
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
                  {item.type === 'material' && (item as any).productId ? (
                    (() => {
                      const prod = productById[(item as any).productId as any];
                      const avail = (prod?.availableStock ?? (prod?.currentStock || 0) - (prod?.reservedStock || 0)) || 0;
                      const need = (item as any).materialQuantity ?? item.quantity ?? 0;
                      const exceeds = need > avail;
                      return (
                        <Box display="flex" alignItems="center" gap={1}>
                          {exceeds && <WarningIcon color="warning" fontSize="small" />}
                          <Typography variant="caption" color={exceeds ? 'error' : 'text.secondary'}>
                            {exceeds ? `Недостаточно: есть ${avail}, нужно ${need}` : `Доступно: ${avail}`}
                          </Typography>
                        </Box>
                      );
                    })()
                  ) : (
                    <Typography variant="caption" color="text.secondary">—</Typography>
                  )}
                </TableCell>
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
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <Box display="flex" justifyContent="space-between" width="100%">
              <span>{option.name}</span>
              <Typography variant="caption" color="text.secondary">Доступно: {option.availableStock ?? (option.currentStock - (option.reservedStock || 0) || 0)} {option.unit}</Typography>
            </Box>
          </li>
        )}
        renderInput={(params) => <TextField {...params} label="Добавить позицию (показывает доступный остаток)" sx={{ mt: 2 }} />}
      />

      <Typography variant="h5" align="right" sx={{ mt: 2 }}>
        Итого: {(estimate.total || 0).toFixed(2)} ₽
      </Typography>

      <Box display="flex" gap={1} sx={{ mt: 2 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
        >
          Сохранить
        </Button>
        <Button size="small" onClick={() => handleChangeStatus('sent')}>Отправить</Button>
        <Button size="small" color="success" variant="outlined" onClick={() => handleChangeStatus('approved')}>Одобрить (резерв)</Button>
        <Button size="small" color="warning" variant="outlined" onClick={() => handleChangeStatus('cancelled')}>Отменить (снять резерв)</Button>
        <Button size="small" color="error" variant="outlined" onClick={() => handleChangeStatus('rejected')}>Отклонить (снять резерв)</Button>
      </Box>
      
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

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
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
  ToggleButton,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AddCircle as IncomeIcon,
  RemoveCircle as ExpenseIcon,
  Warning as WarningIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Category as CategoryIcon,
  ViewModule as ViewGridIcon,
  ViewList as ViewListIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Notification from '../components/common/Notification';
import ServiceComponentsEditor from '../components/products/ServiceComponentsEditor';
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
  removeStock,
  ServiceComponent
} from '../api/productApi';

const StockIndicator: React.FC<{ current: number; min?: number; reserved?: number }> = ({ 
  current, 
  min = 0, 
  reserved = 0 
}) => {
  const available = current - reserved;
  const isCritical = min > 0 && available <= min;
  const isOut = available <= 0;
  
  if (isNaN(current)) return null;

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Typography variant="body2" color={isOut ? 'error' : isCritical ? 'warning.main' : 'text.primary'}>
        Остаток: {current}
      </Typography>
      {reserved > 0 && (
        <Chip 
          label={`Резерв: ${reserved}`} 
          size="small" 
          color="info" 
          variant="outlined" 
        />
      )}
      {available !== current && (
        <Chip 
          label={`Доступно: ${available}`} 
          size="small" 
          color={isOut ? 'error' : isCritical ? 'warning' : 'success'} 
        />
      )}
      {isCritical && <WarningIcon color="warning" fontSize="small" />}
    </Box>
  );
};

const ProductsPage: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [criticalProducts, setCriticalProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'stock_desc'>('name_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<'income' | 'expense'>('income');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
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
    description: '',
    components: []
  });
  
  const [movementForm, setMovementForm] = useState({
    quantity: 1,
    document: '',
    comment: ''
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'success' });
  
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    
    const unsubProducts = getProductsStream(currentUser.uid, (data) => {
      setProducts(data);
      setLoading(false);
    });
    
    const unsubCritical = getCriticalStockProducts(currentUser.uid, setCriticalProducts);
    
    const unsubMovements = getStockMovementsStream(currentUser.uid, undefined, (data) => {
      setMovements(data.slice(0, 50)); 
    });
    
    return () => {
      unsubProducts();
      unsubCritical();
      unsubMovements();
    };
  }, [currentUser]);

  const handleOpenProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({ ...product });
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

  const handleCloseProductDialog = () => {
    setProductDialog(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async () => {
    if (!currentUser || !productForm.name || !productForm.unit) return;
    
    try {
      // Если услуга составная — пересчитаем себестоимость по составу (рекурсивно)
      let payload: Partial<Product> = { ...productForm };
      if (productForm.type === 'service') {
        const computeServiceCost = (service: Partial<Product>, catalog: Product[], depth = 0): number => {
          if (!service.components || service.components.length === 0) return 0;
          if (depth > 5) return 0; // защита от циклов
          return service.components.reduce((sum, comp) => {
            const ref = catalog.find(p => p.id === comp.refId);
            if (!ref) return sum;
            const unitCost = ref.type === 'service'
              ? (ref.costPrice ?? computeServiceCost(ref, catalog, depth + 1))
              : (ref.costPrice ?? ref.salePrice ?? 0);
            return sum + (unitCost * (comp.quantity || 0));
          }, 0);
        };
        const calculatedCost = computeServiceCost(productForm as Product, products);
        payload.costPrice = Number.isFinite(calculatedCost) ? Number(calculatedCost.toFixed(2)) : 0;
      }
      if (editingProduct) {
        await updateProduct(currentUser.uid, editingProduct.id, payload);
        setNotification({ open: true, message: 'Позиция успешно обновлена', severity: 'success' });
      } else {
        await addProduct(currentUser.uid, payload as Omit<Product, 'id'>);
        setNotification({ open: true, message: 'Позиция успешно добавлена', severity: 'success' });
      }
      handleCloseProductDialog();
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      setNotification({ open: true, message: 'Ошибка при сохранении', severity: 'error' });
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!currentUser) return;
    try {
      await deleteProduct(currentUser.uid, product.id);
      setNotification({ open: true, message: 'Позиция удалена', severity: 'success' });
    } catch (error) {
      setNotification({ open: true, message: 'Ошибка при удалении', severity: 'error' });
    }
    setConfirmDelete(null);
  };

  const handleOpenMovementDialog = (type: 'income' | 'expense', product?: Product) => {
    setMovementType(type);
    setSelectedProduct(product || null);
    setMovementForm({ quantity: 1, document: '', comment: '' });
    // TODO: Implement movement dialog
    // setMovementDialogOpen(true);
  };

  const handleCloseMovementDialog = () => {
    // TODO: Implement movement dialog
    // setMovementDialogOpen(false);
    setSelectedProduct(null);
  };



  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    const matchesType = typeFilter === 'all' || product.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'name_asc') {
      return a.name.localeCompare(b.name, 'ru');
    }
    // stock_desc for products; services go last
    const aAvail = (a.currentStock || 0) - (a.reservedStock || 0);
    const bAvail = (b.currentStock || 0) - (b.reservedStock || 0);
    if (a.type !== b.type) return a.type === 'product' ? -1 : 1;
    return (bAvail) - (aAvail);
  });

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const getMovementTypeLabel = (type: string) => {
    const labels = { income: 'Приход', expense: 'Расход', reserve: 'Резерв', unreserve: 'Снятие резерва' };
    return labels[type as keyof typeof labels] || type;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4"><CategoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />Товары и Услуги</Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<IncomeIcon />} onClick={() => handleOpenMovementDialog('income')} color="success">Приход</Button>
          <Button variant="outlined" startIcon={<ExpenseIcon />} onClick={() => handleOpenMovementDialog('expense')} color="error">Расход</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenProductDialog()}>Новая позиция</Button>
        </Box>
      </Box>

      {criticalProducts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Критические остатки ({criticalProducts.length}):</Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {criticalProducts.map(p => (<Chip key={p.id} label={`${p.name}: ${p.availableStock}/${p.minStock} ${p.unit}`} color="warning" size="small" onClick={() => handleOpenMovementDialog('income', p)} />))}
          </Box>
        </Alert>
      )}

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Номенклатура (${products.length})`} icon={<CategoryIcon />} iconPosition="start" />
        <Tab label="История движений" icon={<HistoryIcon />} iconPosition="start" />
      </Tabs>

      {activeTab === 0 && (
        <>
          <Box display="flex" gap={2} mb={1} flexWrap="wrap" alignItems="center">
            <TextField placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }} sx={{ flexGrow: 1, minWidth: 260 }} />
            <ToggleButtonGroup size="small" value={typeFilter} exclusive onChange={(e, v) => v && setTypeFilter(v)}>
              <ToggleButton value="all">Все</ToggleButton>
              <ToggleButton value="product">Товары</ToggleButton>
              <ToggleButton value="service">Услуги</ToggleButton>
            </ToggleButtonGroup>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Сортировка</InputLabel>
              <Select value={sortBy} label="Сортировка" onChange={(e) => setSortBy(e.target.value as any)}>
                <MenuItem value="name_asc">По названию (А→Я)</MenuItem>
                <MenuItem value="stock_desc">По остатку (по убыв.)</MenuItem>
              </Select>
            </FormControl>
            <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(e, v) => v && setViewMode(v)}>
              <ToggleButton value="grid"><ViewGridIcon fontSize="small" /></ToggleButton>
              <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {categories.length > 0 && (
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
              <Chip label="Все категории" size="small" onClick={() => setCategoryFilter('')} color={!categoryFilter ? 'primary' : 'default'} />
              {categories.map(cat => (
                <Chip
                  key={cat}
                  label={cat as any}
                  size="small"
                  color={categoryFilter === cat ? 'primary' : 'default'}
                  onClick={() => setCategoryFilter(cat as any)}
                />
              ))}
            </Box>
          )}

          {!sortedProducts.length ? (
            <Card><CardContent><Typography color="text.secondary" align="center">Ничего не найдено</Typography></CardContent></Card>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <Box display="flex" flexWrap="wrap" gap={2}>
                  {sortedProducts.map(p => (
                    <Box key={p.id} sx={{ width: { xs: '100%', md: 'calc(50% - 8px)', lg: 'calc(33.333% - 11px)' } }}>
                      <Card>
                        <CardHeader
                          avatar={<Avatar sx={{ bgcolor: p.type === 'service' ? 'secondary.main' : 'primary.main' }}>{p.type === 'service' ? 'S' : 'P'}</Avatar>}
                          title={<Box display="flex" alignItems="center" gap={1}><Typography variant="subtitle1">{p.name}</Typography>{p.type === 'service' && <Chip size="small" label={`Состав: ${(p.components || []).length}`} />}</Box>}
                          subheader={<Typography variant="caption" color="text.secondary">{p.sku ? `Артикул: ${p.sku} • ` : ''}{p.unit}</Typography>}
                          action={
                            <Box>
                              {p.type === 'product' && (
                                <Tooltip title="Приход/Расход"><IconButton size="small" onClick={() => handleOpenMovementDialog('income', p)}><IncomeIcon fontSize="small" color="success" /></IconButton></Tooltip>
                              )}
                              <IconButton size="small" onClick={() => handleOpenProductDialog(p)}><EditIcon fontSize="small" /></IconButton>
                              <IconButton size="small" color="error" onClick={() => setConfirmDelete(p)}><DeleteIcon fontSize="small" /></IconButton>
                            </Box>
                          }
                        />
                        <CardContent>
                          {p.type === 'product' ? (
                            <>
                              <StockIndicator current={p.currentStock} min={p.minStock} reserved={p.reservedStock} />
                              <Box mt={1} display="flex" gap={2}>
                                {p.salePrice !== undefined && <Chip size="small" label={`Цена: ${p.salePrice} ₽`} />}
                                {p.costPrice !== undefined && <Chip size="small" variant="outlined" label={`Себест.: ${p.costPrice} ₽`} />}
                              </Box>
                            </>
                          ) : (
                            <Box>
                              <Typography variant="body2" color="text.secondary">Ед.: {p.unit}</Typography>
                              <Box mt={1} display="flex" gap={2}>
                                {p.salePrice !== undefined && <Chip size="small" label={`Цена: ${p.salePrice} ₽`} />}
                                {p.costPrice !== undefined && <Chip size="small" variant="outlined" label={`Себест.: ${p.costPrice} ₽`} />}
                              </Box>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Box>
                  ))}
                </Box>
              ) : (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Название</TableCell>
                        <TableCell>Тип</TableCell>
                        <TableCell>Ед.</TableCell>
                        <TableCell align="right">Цена</TableCell>
                        <TableCell align="right">Себест.</TableCell>
                        <TableCell align="right">Доступно</TableCell>
                        <TableCell align="right">Действия</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedProducts.map(p => (
                        <TableRow key={p.id} hover>
                          <TableCell>{p.name}{p.sku && <Typography variant="caption" color="text.secondary" display="block">{p.sku}</Typography>}</TableCell>
                          <TableCell>{p.type === 'service' ? 'Услуга' : 'Товар'}</TableCell>
                          <TableCell>{p.unit}</TableCell>
                          <TableCell align="right">{p.salePrice ?? '-'}</TableCell>
                          <TableCell align="right">{p.costPrice ?? '-'}</TableCell>
                          <TableCell align="right">{p.type === 'product' ? (p.currentStock - (p.reservedStock || 0)) : '-'}</TableCell>
                          <TableCell align="right">
                            {p.type === 'product' && (
                              <Tooltip title="Приход/Расход"><IconButton size="small" onClick={() => handleOpenMovementDialog('income', p)}><IncomeIcon fontSize="small" color="success" /></IconButton></Tooltip>
                            )}
                            <IconButton size="small" onClick={() => handleOpenProductDialog(p)}><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => setConfirmDelete(p)}><DeleteIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Дата</TableCell><TableCell>Товар</TableCell><TableCell>Операция</TableCell>
                <TableCell align="right">Количество</TableCell><TableCell align="right">Было → Стало</TableCell><TableCell>Комментарий</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!movements.length ? (
                <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary">История пуста</Typography></TableCell></TableRow>
              ) : (
                movements.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>{m.createdAt?.toDate?.().toLocaleString('ru-RU') || 'Н/Д'}</TableCell>
                    <TableCell>{m.productName}</TableCell>
                    <TableCell><Chip label={getMovementTypeLabel(m.type)} size="small" color={m.quantity > 0 ? 'success' : 'error'} /></TableCell>
                    <TableCell align="right"><Typography color={m.quantity > 0 ? 'success.main' : 'error.main'}>{m.quantity > 0 ? '+' : ''}{m.quantity}</Typography></TableCell>
                    <TableCell align="right">{m.previousStock} → {m.newStock}</TableCell>
                    <TableCell>{m.comment}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={productDialog} onClose={handleCloseProductDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProduct ? 'Редактировать позицию' : 'Новая позиция'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <ToggleButtonGroup value={productForm.type} exclusive onChange={(e, v) => v && setProductForm({ ...productForm, type: v })} fullWidth sx={{ mb: 1 }}>
              <ToggleButton value="product">Товар</ToggleButton>
              <ToggleButton value="service">Услуга</ToggleButton>
            </ToggleButtonGroup>
            <TextField label="Название" value={productForm.name || ''} onChange={e => setProductForm({ ...productForm, name: e.target.value })} required fullWidth />
            <Box display="flex" gap={2}>
              <TextField label="Артикул" value={productForm.sku || ''} onChange={e => setProductForm({ ...productForm, sku: e.target.value })} fullWidth />
              <FormControl fullWidth required><InputLabel>Ед. изм.</InputLabel><Select value={productForm.unit || 'шт'} label="Ед. изм." onChange={e => setProductForm({ ...productForm, unit: e.target.value })}><MenuItem value="шт">шт</MenuItem><MenuItem value="кг">кг</MenuItem><MenuItem value="л">л</MenuItem><MenuItem value="м">м</MenuItem></Select></FormControl>
            </Box>
            {productForm.type === 'product' && (
              <Box display="flex" gap={2}>
                {!editingProduct && <TextField label="Начальный остаток" type="number" value={productForm.currentStock || 0} onChange={e => setProductForm({ ...productForm, currentStock: Number(e.target.value) })} fullWidth />}
                <TextField label="Мин. остаток" type="number" value={productForm.minStock || 0} onChange={e => setProductForm({ ...productForm, minStock: Number(e.target.value) })} fullWidth helperText="Для уведомлений" />
              </Box>
            )}
            {productForm.type === 'service' && (
              <Box>
                <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>Состав услуги</Typography>
                <ServiceComponentsEditor
                  components={(productForm.components || []) as ServiceComponent[]}
                  onChange={(next: ServiceComponent[]) => setProductForm({ ...productForm, components: next })}
                  products={products}
                />
              </Box>
            )}
            <TextField label="Цена продажи" type="number" value={productForm.salePrice || 0} onChange={e => setProductForm({ ...productForm, salePrice: Number(e.target.value) })} fullWidth InputProps={{ endAdornment: <InputAdornment position="end">₽</InputAdornment> }} />
            <TextField label="Описание" value={productForm.description || ''} onChange={e => setProductForm({ ...productForm, description: e.target.value })} multiline rows={2} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProductDialog}>Отмена</Button>
          <Button onClick={handleSaveProduct} variant="contained" disabled={!productForm.name || !productForm.unit}>Сохранить</Button>
        </DialogActions>
      </Dialog>
      
      {/* ... (movement dialog, confirm dialog, notification) */}
      <ConfirmDialog open={!!confirmDelete} title="Удалить?" message={`Удалить "${confirmDelete?.name}"?`} onConfirm={() => confirmDelete && handleDeleteProduct(confirmDelete)} onClose={() => setConfirmDelete(null)} />
      <Notification open={notification.open} message={notification.message} severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })} />
    </Box>
  );
};

export default ProductsPage;



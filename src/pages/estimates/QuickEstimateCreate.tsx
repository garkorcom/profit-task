/**
 * Быстрое создание сметы с мобильного устройства
 * Оптимизировано для скорости и удобства
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Autocomplete,
  InputAdornment,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  QrCodeScanner as ScanIcon,
  Calculate as CalcIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  CheckCircle as DoneIcon,
  AddShoppingCart as AddToCartIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  Estimate,
  EstimateItem,
  addEstimate,
} from '../../legacy/api/estimateApi';
import {
  Product,
  getProductsStream,
  createProduct,
} from '../../api/productApi';
import {
  Project,
  getProjectsStream,
} from '../../api/projectApi';
import {
  Contractor,
  getContractorsStream,
} from '../../api/contractorApi';

interface QuickEstimateItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  type: 'service' | 'material';
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

const QuickEstimateCreate: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isVerySmall = useMediaQuery(theme.breakpoints.down(375));
  
  // Master data
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  
  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [estimateForm, setEstimateForm] = useState({
    name: '',
    description: '',
    projectId: '',
    contractorId: '',
    status: 'draft' as Estimate['status'],
  });
  const [items, setItems] = useState<QuickEstimateItem[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddDialog, setQuickAddDialog] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    name: '',
    type: 'service' as 'service' | 'material',
    unit: 'шт',
    price: 0,
    quantity: 1,
  });
  
  // Load data
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubProducts = getProductsStream(currentUser.uid, setProducts);
    const unsubProjects = getProjectsStream(currentUser.uid, setProjects);
    const unsubContractors = getContractorsStream(currentUser.uid, setContractors);
    
    return () => {
      unsubProducts();
      unsubProjects();
      unsubContractors();
    };
  }, [currentUser]);
  
  // Handlers
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleAddProduct = (product: Product) => {
    const newItem: QuickEstimateItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      productId: product.id,
      name: product.name,
      description: product.description,
      type: product.type === 'service' ? 'service' : 'material',
      quantity: 1,
      unit: product.unit || 'шт',
      unitPrice: product.salePrice || 0,
      total: product.salePrice || 0,
    };
    setItems([...items, newItem]);
  };
  
  const handleQuickAdd = () => {
    const newItem: QuickEstimateItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      name: quickAddForm.name,
      type: quickAddForm.type,
      quantity: quickAddForm.quantity,
      unit: quickAddForm.unit,
      unitPrice: quickAddForm.price,
      total: quickAddForm.price * quickAddForm.quantity,
    };
    setItems([...items, newItem]);
    setQuickAddDialog(false);
    setQuickAddForm({
      name: '',
      type: 'service',
      unit: 'шт',
      price: 0,
      quantity: 1,
    });
  };
  
  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity < 0) return;
    
    setItems(items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          quantity,
          total: quantity * item.unitPrice,
        };
      }
      return item;
    }));
  };
  
  const handleUpdatePrice = (id: string, price: number) => {
    if (price < 0) return;
    
    setItems(items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          unitPrice: price,
          total: item.quantity * price,
        };
      }
      return item;
    }));
  };
  
  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };
  
  const handleSave = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Convert items to EstimateItem format
      const estimateItems: EstimateItem[] = items.map((item, index) => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        description: item.description,
        type: item.type,
        quantity: item.quantity,
        materialQuantity: item.type === 'material' ? item.quantity : undefined,
        unit: item.unit,
        unitPrice: item.unitPrice,
        materialPrice: item.type === 'material' ? item.unitPrice : undefined,
        total: item.total,
        level: 0,
        order: index,
        isGroup: false,
      }));
      
      // Create estimate
      const total = items.reduce((sum, item) => sum + item.total, 0);
      const estimateData: Omit<Estimate, 'id'> = {
        ...estimateForm,
        items: estimateItems,
        subtotal: total,
        total: total,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft',
      };
      
      const estimateId = await addEstimate(currentUser.uid, estimateData);
      
      // Navigate to the created estimate
      navigate(`/mobile/estimate/${estimateId}`);
    } catch (error) {
      console.error('Error creating estimate:', error);
      alert('Ошибка при создании сметы');
    } finally {
      setLoading(false);
    }
  };
  
  const total = items.reduce((sum, item) => sum + item.total, 0);
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const steps = [
    'Основная информация',
    'Добавление позиций',
    'Проверка и сохранение',
  ];
  
  return (
    <Box sx={{ p: isMobile ? 1.5 : 2, pb: isMobile ? 10 : 2 }}>
      <Paper sx={{ p: isMobile ? 1.5 : 2, mb: 2 }}>
        <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
          Быстрое создание сметы
        </Typography>
        
        <Stepper activeStep={activeStep} orientation="vertical">
          <Step>
            <StepLabel>
              {steps[0]}
            </StepLabel>
            <StepContent>
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Название сметы"
                  value={estimateForm.name}
                  onChange={(e) => setEstimateForm({ ...estimateForm, name: e.target.value })}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="Описание"
                  value={estimateForm.description}
                  onChange={(e) => setEstimateForm({ ...estimateForm, description: e.target.value })}
                  multiline
                  rows={2}
                  sx={{ mb: 2 }}
                />
                
                <Autocomplete
                  options={projects}
                  getOptionLabel={(option) => option.name}
                  value={projects.find(p => p.id === estimateForm.projectId) || null}
                  onChange={(e, value) => setEstimateForm({
                    ...estimateForm,
                    projectId: value?.id || '',
                  })}
                  renderInput={(params) => (
                    <TextField {...params} label="Проект" />
                  )}
                  sx={{ mb: 2 }}
                />
                
                <Autocomplete
                  options={contractors}
                  getOptionLabel={(option) => option.name}
                  value={contractors.find(c => c.id === estimateForm.contractorId) || null}
                  onChange={(e, value) => setEstimateForm({
                    ...estimateForm,
                    contractorId: value?.id || '',
                  })}
                  renderInput={(params) => (
                    <TextField {...params} label="Контрагент" />
                  )}
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!estimateForm.name}
                  endIcon={<NextIcon />}
                >
                  Далее
                </Button>
              </Box>
            </StepContent>
          </Step>
          
          <Step>
            <StepLabel>
              {steps[1]}
              {items.length > 0 && (
                <Chip 
                  label={`${items.length} позиций`} 
                  size="small" 
                  color="primary"
                  sx={{ ml: 1 }}
                />
              )}
            </StepLabel>
            <StepContent>
              <Box sx={{ mb: 2 }}>
                {/* Search */}
                <TextField
                  fullWidth
                  placeholder="Поиск товаров и услуг..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                
                {/* Quick add button */}
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setQuickAddDialog(true)}
                  sx={{ mb: 2 }}
                >
                  Быстрое добавление позиции
                </Button>
                
                {/* Product list */}
                {searchQuery && (
                  <Paper variant="outlined" sx={{ mb: 2, maxHeight: 200, overflow: 'auto' }}>
                    <List dense>
                      {filteredProducts.map(product => (
                        <ListItem key={product.id}>
                          <ListItemText
                            primary={product.name}
                            secondary={`${product.salePrice?.toLocaleString('ru-RU')} ₽/${product.unit}`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton 
                              edge="end" 
                              onClick={() => handleAddProduct(product)}
                              color="primary"
                            >
                              <AddToCartIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
                
                {/* Selected items */}
                {items.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Добавленные позиции:
                    </Typography>
                    <List>
                      {items.map(item => (
                        <Paper key={item.id} sx={{ mb: 1, p: 1 }}>
                          <ListItem disablePadding>
                            <Box sx={{ width: '100%' }}>
                              <Typography variant="body2" fontWeight="bold">
                                {item.name}
                              </Typography>
                              
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <RemoveIcon fontSize="small" />
                                </IconButton>
                                
                                <TextField
                                  size="small"
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value))}
                                  sx={{ width: 70 }}
                                />
                                
                                <IconButton
                                  size="small"
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                >
                                  <AddIcon fontSize="small" />
                                </IconButton>
                                
                                <Typography variant="body2">
                                  {item.unit}
                                </Typography>
                                
                                <Typography variant="body2">
                                  ×
                                </Typography>
                                
                                <TextField
                                  size="small"
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdatePrice(item.id, Number(e.target.value))}
                                  sx={{ width: 100 }}
                                  InputProps={{
                                    endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                                  }}
                                />
                                
                                <Typography variant="body2" fontWeight="bold">
                                  = {item.total.toLocaleString('ru-RU')} ₽
                                </Typography>
                                
                                <Box flex={1} />
                                
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoveItem(item.id)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Box>
                          </ListItem>
                        </Paper>
                      ))}
                    </List>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="h6" align="right">
                      Итого: {total.toLocaleString('ru-RU')} ₽
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Button onClick={handleBack} sx={{ mr: 1 }}>
                  Назад
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={items.length === 0}
                  endIcon={<NextIcon />}
                >
                  Далее
                </Button>
              </Box>
            </StepContent>
          </Step>
          
          <Step>
            <StepLabel>
              {steps[2]}
            </StepLabel>
            <StepContent>
              <Box sx={{ mb: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Проверьте данные перед сохранением
                </Alert>
                
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {estimateForm.name}
                  </Typography>
                  
                  {estimateForm.description && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {estimateForm.description}
                    </Typography>
                  )}
                  
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    {estimateForm.projectId && (
                      <Chip 
                        label={`Проект: ${projects.find(p => p.id === estimateForm.projectId)?.name || 'Неизвестный'}`} 
                        size="small" 
                      />
                    )}
                    {estimateForm.contractorId && (
                      <Chip 
                        label={`Контрагент: ${contractors.find(c => c.id === estimateForm.contractorId)?.name || 'Неизвестный'}`} 
                        size="small" 
                      />
                    )}
                  </Stack>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Позиции ({items.length}):
                  </Typography>
                  
                  <List dense>
                    {items.map(item => (
                      <ListItem key={item.id}>
                        <ListItemText
                          primary={item.name}
                          secondary={`${item.quantity} ${item.unit} × ${item.unitPrice} ₽ = ${item.total.toLocaleString('ru-RU')} ₽`}
                        />
                      </ListItem>
                    ))}
                  </List>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="h6" align="right" color="primary">
                    Итого: {total.toLocaleString('ru-RU')} ₽
                  </Typography>
                </Paper>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Button onClick={handleBack} sx={{ mr: 1 }}>
                  Назад
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleSave}
                  disabled={loading}
                  endIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {loading ? 'Сохранение...' : 'Сохранить смету'}
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>
        
        {activeStep === steps.length && (
          <Paper square elevation={0} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <DoneIcon color="success" sx={{ verticalAlign: 'middle', mr: 1 }} />
              Смета создана!
            </Typography>
            <Button onClick={() => navigate('/estimates')} sx={{ mt: 1, mr: 1 }}>
              К списку смет
            </Button>
          </Paper>
        )}
      </Paper>
      
      {/* Quick add dialog */}
      <Dialog open={quickAddDialog} onClose={() => setQuickAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Быстрое добавление позиции</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название"
            value={quickAddForm.name}
            onChange={(e) => setQuickAddForm({ ...quickAddForm, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Тип</InputLabel>
              <Select
                value={quickAddForm.type}
                onChange={(e) => setQuickAddForm({ ...quickAddForm, type: e.target.value as 'service' | 'material' })}
                label="Тип"
              >
                <MenuItem value="service">Услуга</MenuItem>
                <MenuItem value="material">Материал</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Единица измерения"
              value={quickAddForm.unit}
              onChange={(e) => setQuickAddForm({ ...quickAddForm, unit: e.target.value })}
            />
            <TextField
              fullWidth
              label="Количество"
              type="number"
              value={quickAddForm.quantity}
              onChange={(e) => setQuickAddForm({ ...quickAddForm, quantity: Number(e.target.value) })}
            />
            <TextField
              fullWidth
              label="Цена за единицу"
              type="number"
              value={quickAddForm.price}
              onChange={(e) => setQuickAddForm({ ...quickAddForm, price: Number(e.target.value) })}
              InputProps={{
                endAdornment: <InputAdornment position="end">₽</InputAdornment>,
              }}
            />
          </Box>
          
          <Typography variant="body2" sx={{ mt: 2 }}>
            Сумма: {(quickAddForm.quantity * quickAddForm.price).toLocaleString('ru-RU')} ₽
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickAddDialog(false)}>
            Отмена
          </Button>
          <Button onClick={handleQuickAdd} variant="contained" disabled={!quickAddForm.name}>
            Добавить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuickEstimateCreate;

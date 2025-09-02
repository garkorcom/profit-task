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
  Psychology as AIIcon,
  AutoAwesome as MagicIcon,
  CheckCircle as DoneIcon,
  AddShoppingCart as AddToCartIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { generateEstimateWithClaude, CLAUDE_MODELS } from '../../api/anthropicApi';
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
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
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
  
  // AI Integration
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
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

  // AI функция для автоматического создания сметы
  const generateEstimateWithAI = async () => {
    if (!aiDescription.trim()) return;
    
    setAiLoading(true);
    try {
      const aiEstimate = await generateEstimateWithClaude(aiDescription, CLAUDE_MODELS.HAIKU);
      
      // Конвертируем AI смету в QuickEstimateItem
      const aiItems: QuickEstimateItem[] = [];
      
      aiEstimate.sections.forEach((section) => {
        section.items.forEach((item) => {
          aiItems.push({
            id: `ai-item-${Date.now()}-${Math.random()}`,
            name: item.name,
            type: item.unit === 'ч' ? 'service' : 'material',
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.rate,
            total: item.total,
          });
        });
      });
      
      // Заполняем название сметы из описания если еще не заполнено
      if (!estimateForm.name.trim()) {
        const shortName = aiDescription.length > 50 
          ? `${aiDescription.substring(0, 50)}...` 
          : aiDescription;
        setEstimateForm(prev => ({ ...prev, name: shortName }));
      }
      
      // Добавляем AI позиции к существующим
      setItems(prevItems => [...prevItems, ...aiItems]);
      setAiDialogOpen(false);
      setAiDescription('');
      
    } catch (error) {
      console.error('AI генерация не удалась:', error);
      alert('Ошибка при генерации сметы с помощью AI. Попробуйте еще раз.');
    }
    setAiLoading(false);
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
                
                {/* Quick add and AI buttons */}
                <Stack direction={isMobile ? "column" : "row"} spacing={1} sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<AIIcon />}
                    onClick={() => setAiDialogOpen(true)}
                    fullWidth={isMobile}
                    sx={{ 
                      color: '#9c27b0',
                      borderColor: '#9c27b0',
                      '&:hover': {
                        borderColor: '#7b1fa2',
                        backgroundColor: 'rgba(156, 39, 176, 0.04)'
                      }
                    }}
                  >
                    🤖 AI Смета
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setQuickAddDialog(true)}
                  >
                    Быстрое добавление
                  </Button>
                </Stack>
                
                {/* Product list */}
                {searchQuery && (
                  <Paper variant="outlined" sx={{ mb: 2, maxHeight: 200, overflow: 'auto' }}>
                    <List dense>
                      {filteredProducts.map(product => (
                        <ListItem key={product.id}>
                          <ListItemText
                            primary={product.name}
                            secondary={`$${product.salePrice?.toLocaleString('en-US')}/${product.unit}`}
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
                              
                              {/* Мобильная оптимизация: вертикальная раскладка */}
                              {isMobile ? (
                                <Stack spacing={2} sx={{ mt: 1 }}>
                                  {/* Количество */}
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="body2" sx={{ minWidth: 80 }}>
                                      Количество:
                                    </Typography>
                                    <IconButton
                                      size="medium"
                                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                      disabled={item.quantity <= 1}
                                      sx={{ minHeight: 40, minWidth: 40 }}
                                    >
                                      <RemoveIcon />
                                    </IconButton>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value))}
                                      sx={{ width: 80 }}
                                    />
                                    <Typography variant="body2" sx={{ minWidth: 30 }}>
                                      {item.unit}
                                    </Typography>
                                    <IconButton
                                      size="medium"
                                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                      sx={{ minHeight: 40, minWidth: 40 }}
                                    >
                                      <AddIcon />
                                    </IconButton>
                                  </Stack>
                                  
                                  {/* Цена */}
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="body2" sx={{ minWidth: 80 }}>
                                      Цена:
                                    </Typography>
                                    <TextField
                                      size="small"
                                      type="number"
                                      value={item.unitPrice}
                                      onChange={(e) => handleUpdatePrice(item.id, Number(e.target.value))}
                                      sx={{ flex: 1 }}
                                      InputProps={{
                                        endAdornment: <InputAdornment position="end">$</InputAdornment>,
                                      }}
                                    />
                                  </Stack>
                                  
                                  {/* Итого и удаление */}
                                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6" color="primary">
                                      = ${item.total.toLocaleString('en-US')}
                                    </Typography>
                                    <IconButton
                                      color="error"
                                      onClick={() => handleRemoveItem(item.id)}
                                      sx={{ minHeight: 44, minWidth: 44 }}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </Stack>
                                </Stack>
                              ) : (
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
                                      endAdornment: <InputAdornment position="end">$</InputAdornment>,
                                    }}
                                  />
                                  
                                  <Typography variant="body2" fontWeight="bold">
                                    = ${item.total.toLocaleString('en-US')}
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
                              )}
                            </Box>
                          </ListItem>
                        </Paper>
                      ))}
                    </List>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="h6" align="right">
                      Итого: ${total.toLocaleString('en-US')}
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
                          secondary={`${item.quantity} ${item.unit} × $${item.unitPrice} = $${item.total.toLocaleString('en-US')}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="h6" align="right" color="primary">
                    Итого: ${total.toLocaleString('en-US')}
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
                endAdornment: <InputAdornment position="end">$</InputAdornment>,
              }}
            />
          </Box>
          
          <Typography variant="body2" sx={{ mt: 2 }}>
            Сумма: ${(quickAddForm.quantity * quickAddForm.price).toLocaleString('en-US')}
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

      {/* AI Generate Dialog */}
      <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AIIcon sx={{ color: '#9c27b0' }} />
            <Typography variant="h6">🤖 AI Автосмета</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>🎯 Опишите проект</strong>, и AI создаст детальную смету автоматически!
            </Typography>
          </Alert>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Описание проекта"
            value={aiDescription}
            onChange={(e) => setAiDescription(e.target.value)}
            placeholder="Например: Создание корпоративного сайта с 5 страницами, контактной формой, адаптивной версткой и CMS системой"
            sx={{ mb: 2 }}
          />
          
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              💡 Примеры описаний:
            </Typography>
            {[
              "Дизайн логотипа и фирменного стиля для IT-компании",
              "Разработка мобильного приложения с авторизацией и чатом", 
              "SEO продвижение интернет-магазина на 6 месяцев",
              "Ремонт квартиры 60м2: покраска стен, укладка ламината"
            ].map((example, index) => (
              <Chip
                key={index}
                label={example}
                variant="outlined"
                size="small"
                onClick={() => setAiDescription(example)}
                sx={{ 
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              />
            ))}
          </Stack>

          {aiLoading && (
            <Alert severity="info">
              <Stack direction="row" alignItems="center" spacing={1}>
                <CircularProgress size={20} />
                <Typography>AI анализирует проект и создает смету...</Typography>
              </Stack>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiDialogOpen(false)} disabled={aiLoading}>
            Отмена
          </Button>
          <Button 
            variant="contained" 
            onClick={generateEstimateWithAI}
            disabled={!aiDescription.trim() || aiLoading}
            startIcon={<MagicIcon />}
            sx={{ 
              background: 'linear-gradient(45deg, #9c27b0 30%, #e91e63 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #7b1fa2 30%, #c2185b 90%)'
              }
            }}
          >
            {aiLoading ? 'Генерирую смету...' : 'Создать смету с AI'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuickEstimateCreate;

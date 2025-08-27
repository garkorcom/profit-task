import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, IconButton, Fab, TextField, Button, Chip,
  List, ListItem, ListItemButton, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions,
  InputAdornment, Select, MenuItem, FormControl, InputLabel,
  AppBar, Toolbar, Paper, SwipeableDrawer,
  Alert, Snackbar, CircularProgress, Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Group as GroupIcon,
  ArrowBack as BackIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Estimate, EstimateItem, getEstimatesStream,
  updateEstimate, generateEstimatePDF
} from '../api/estimateApi';
import {
  Product, getProductsStream,
  createProduct
} from '../api/productApi';
import { Project, getProjectsStream } from '../api/projectApi';
import { Contractor, getContractorsStream } from '../api/contractorApi';
import debounce from 'lodash-es/debounce';

interface MobileEstimateItem extends Omit<EstimateItem, 'type' | 'level' | 'order'> {
  isExpanded?: boolean;
  isSelected?: boolean;
  parentEstimateItemId?: string;
  productId?: string;
  type?: 'service' | 'material' | 'product' | 'section' | 'work' | 'expense';
  materialQuantity?: number;
  level?: number;
  order?: number;
}

const sanitizeItemsForFirebase = (items: MobileEstimateItem[]): EstimateItem[] => {
  return items.map(({ isExpanded, isSelected, children, type, ...rest }) => {
    
    // Приводим тип к одному из двух допустимых
    const sanitizedType = (type === 'product' || type === 'material') ? 'material' : 'service';
    
    const sanitizedRest: EstimateItem = {
      ...rest,
      level: rest.level ?? 0,
      order: rest.order ?? 0,
      type: sanitizedType,
      children: children ? sanitizeItemsForFirebase(children as MobileEstimateItem[]) : []
    };
    return sanitizedRest;
  });
};

const MobileEstimatePage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { estimateId } = useParams<{ estimateId?: string }>();
  
  // State
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [items, setItems] = useState<MobileEstimateItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  
  // UI State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [groupDialog, setGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [quickCreateDialog, setQuickCreateDialog] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    type: 'service' as 'service' | 'product',
    unit: 'шт',
    salePrice: 0
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Load data
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubProducts = getProductsStream(currentUser.uid, setProducts);
    const unsubProjects = getProjectsStream(currentUser.uid, setProjects);
    const unsubContractors = getContractorsStream(currentUser.uid, setContractors);
    
    if (estimateId) {
      const unsubEstimates = getEstimatesStream(currentUser.uid, '', (estimates) => {
        const found = estimates.find(e => e.id === estimateId);
        if (found) {
          setEstimate(found);
          setItems(found.items as MobileEstimateItem[] || []);
        }
      });
      return () => {
        unsubProducts();
        unsubProjects();
        unsubContractors();
        unsubEstimates();
      };
    }
    
    return () => {
      unsubProducts();
      unsubProjects();
      unsubContractors();
    };
  }, [currentUser, estimateId]);
  
  // Search with debounce
  const debouncedSearch = useMemo(() => debounce((query: string) => {
      if (!query) {
        setSearchResults([]);
        return;
      }
      const lowerQuery = query.toLowerCase();
      const results = products.filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery)
      );
      setSearchResults(results);
    }, 300),
    [products]
  );
  
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);
  
  // Calculate totals
  const calculateItemTotal = useCallback((item: MobileEstimateItem): number => {
    if (item.children && item.children.length > 0) {
      return item.children.reduce((sum, child) => sum + calculateItemTotal(child as MobileEstimateItem), 0);
    }
    return (item.quantity || 0) * (item.unitPrice || 0);
  }, []);
  
  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      if (!item.parentEstimateItemId) {
        return sum + calculateItemTotal(item);
      }
      return sum;
    }, 0);
  }, [items, calculateItemTotal]);

  const totalCost = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + (item.totalLaborCost || 0);
    }, 0);
  }, [items]);
  
  // Handle item selection
  const handleLongPress = (itemId: string) => {
    setIsSelectionMode(true);
    setSelectedItems(new Set([itemId]));
  };
  
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
    if (newSelection.size === 0) {
      setIsSelectionMode(false);
    }
  };
  
  // Add item from search
  const handleAddItem = async (product: Product) => {
    const newItem: MobileEstimateItem = {
      id: `item-${Date.now()}`,
      name: product.name,
      description: product.description,
      quantity: 1,
      unit: product.unit,
      unitPrice: product.salePrice || product.costPrice || 0,
      total: product.salePrice || product.costPrice || 0,
      type: product.type,
      productId: product.id
    };
    
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setSearchOpen(false);
    setSearchQuery('');
    
    if (estimate) {
      await saveEstimate(updatedItems);
    }
  };
  
  // Quick create product
  const handleQuickCreate = async () => {
    if (!currentUser || !newProductForm.name) return;
    
    setLoading(true);
    try {
      const newProduct = await createProduct(currentUser.uid, {
        ...newProductForm,
        currentStock: 0,
        minStock: 0,
        reservedStock: 0
      } as Product);
      
      await handleAddItem(newProduct);
      setQuickCreateDialog(false);
      setNewProductForm({ name: '', type: 'service', unit: 'шт', salePrice: 0 });
      setNotification({ open: true, message: 'Позиция создана и добавлена', severity: 'success' });
    } catch (error) {
      setNotification({ open: true, message: 'Ошибка создания позиции', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Group items (Bottom-Up)
  const handleGroupItems = async () => {
    if (!groupName || selectedItems.size === 0) return;
    
    const parentId = `group-${Date.now()}`;
    const parentItem: MobileEstimateItem = {
      id: parentId,
      name: groupName,
      quantity: 1,
      unit: 'компл',
      unitPrice: 0,
      total: 0,
      type: 'service',
      children: []
    };
    
    const updatedItems = items.map(item => {
      if (selectedItems.has(item.id)) {
        return { ...item, parentEstimateItemId: parentId };
      }
      return item;
    });
    
    // Calculate parent total
    const childrenTotal = Array.from(selectedItems).reduce((sum, itemId) => {
      const item = items.find(i => i.id === itemId);
      return sum + (item ? calculateItemTotal(item) : 0);
    }, 0);
    
    parentItem.unitPrice = childrenTotal;
    parentItem.total = childrenTotal;
    parentItem.children = updatedItems.filter(i => selectedItems.has(i.id)) as EstimateItem[];
    
    // Add parent and update items
    const finalItems = [parentItem, ...updatedItems];
    setItems(finalItems);
    
    // Clear selection
    setSelectedItems(new Set());
    setIsSelectionMode(false);
    setGroupDialog(false);
    setGroupName('');
    
    if (estimate) {
      await saveEstimate(finalItems);
    }
    
    setNotification({ open: true, message: 'Позиции сгруппированы', severity: 'success' });
  };
  
  // Inline edit
  const handleInlineEdit = async (itemId: string, field: 'quantity' | 'unitPrice', value: number) => {
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        updated.total = (updated.quantity || 0) * (updated.unitPrice || 0);
        return updated;
      }
      return item;
    });
    
    setItems(updatedItems);
    
    // Debounced save
    if (estimate) {
      await saveEstimate(updatedItems);
    }
  };
  
  // Save estimate
  const saveEstimate = async (updatedItems: MobileEstimateItem[]) => {
    if (!currentUser || !estimate) return;
    
    // Очищаем данные перед сохранением
    const sanitizedItems = sanitizeItemsForFirebase(updatedItems);

    try {
      await updateEstimate(currentUser.uid, estimate.id, {
        items: sanitizedItems,
        total: updatedItems.reduce((sum, item) => {
          if (!item.parentEstimateItemId) {
            return sum + calculateItemTotal(item);
          }
          return sum;
        }, 0)
      });
    } catch (error) {
      console.error('Error saving estimate:', error);
    }
  };
  
  // Generate and share PDF
  const handleShare = async () => {
    if (!currentUser || !estimate) return;
    
    setLoading(true);
    try {
      const pdfUrl = await generateEstimatePDF(currentUser.uid, estimate.id);
      
      // Use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: `Смета ${estimate.number}`,
          text: `Смета для ${estimate.name}`,
          url: pdfUrl
        });
      } else {
        // Fallback: open in new tab
        window.open(pdfUrl, '_blank');
      }
      
      setNotification({ open: true, message: 'Смета отправлена', severity: 'success' });
    } catch (error) {
      setNotification({ open: true, message: 'Ошибка отправки', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    const updatedItems = items.filter(item => item.id !== itemId && item.parentEstimateItemId !== itemId);
    setItems(updatedItems);
    
    if (estimate) {
      await saveEstimate(updatedItems);
    }
  };
  
  // Render item with hierarchy
  const renderItem = (item: MobileEstimateItem, level: number = 0) => {
    const itemTotal = calculateItemTotal(item);
    
    return (
      <React.Fragment key={item.id}>
        <ListItem sx={{ pl: level * 2 }}>
          <ListItemText
            primary={item.name}
            secondary={
              <Box component="span">
                <Typography component="span" variant="body2" display="block">
                  {item.quantity} {item.unit} x {(item.unitPrice || 0).toFixed(2)} = <Box component="strong" sx={{ color: 'text.primary' }}>{itemTotal.toFixed(2)} ₽</Box>
                </Typography>
                {item.totalLaborCost && item.totalLaborCost > 0 && (
                  <Typography component="span" variant="caption" display="block" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                    Себестоимость: {item.totalLaborCost.toFixed(2)} ₽
                  </Typography>
                )}
              </Box>
            }
          />
          {/* Actions like delete, etc. */}
        </ListItem>
        {item.children && item.children.map((child: MobileEstimateItem) => renderItem(child, level + 1))}
      </React.Fragment>
    );
  };

  const getTreeItems = () => {
    const itemMap = new Map<string, MobileEstimateItem & { children: MobileEstimateItem[] }>(items.map(i => [i.id, { ...i, children: [] }]));
    const roots: MobileEstimateItem[] = [];
    
    items.forEach(item => {
      if (item.parentEstimateItemId && itemMap.has(item.parentEstimateItemId)) {
        itemMap.get(item.parentEstimateItemId)!.children.push(itemMap.get(item.id)!);
      } else {
        roots.push(itemMap.get(item.id)!);
      }
    });
    return roots;
  };
  
  return (
    <Box sx={{ minHeight: '100vh', pb: 10 }}>
      {/* App Bar */}
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          <IconButton edge="start" onClick={() => navigate(-1)} sx={{ mr: 2 }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {estimate ? `Смета ${estimate.number}` : 'Новая смета'}
          </Typography>
          {estimate && (
            <IconButton onClick={handleShare} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : <ShareIcon />}
            </IconButton>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Selection Mode Toolbar */}
      {isSelectionMode && (
        <Paper sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ flexGrow: 1 }}>
            Выбрано: {selectedItems.size}
          </Typography>
          <Button
            size="small"
            startIcon={<GroupIcon />}
            onClick={() => setGroupDialog(true)}
            disabled={selectedItems.size < 2}
          >
            Группировать
          </Button>
          <Button
            size="small"
            onClick={() => {
              setSelectedItems(new Set());
              setIsSelectionMode(false);
            }}
          >
            Отмена
          </Button>
        </Paper>
      )}
      
      {/* Total */}
      <Paper sx={{ p: 2, m: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="bold">Итого:</Typography>
          <Typography variant="h5" fontWeight="bold">{total.toFixed(2)} ₽</Typography>
        </Stack>
        {totalCost > 0 && (
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
            <Typography variant="body1" color="success.main">Общая себестоимость:</Typography>
            <Typography variant="body1" color="success.main" fontWeight="bold">{totalCost.toFixed(2)} ₽</Typography>
          </Stack>
        )}
      </Paper>
      
      {/* Items List */}
      <List sx={{ px: 1 }}>
        {getTreeItems().map(item => renderItem(item))}
        
        {items.length === 0 && (
          <Alert severity="info" sx={{ m: 2 }}>
            Нажмите + чтобы добавить позиции в смету
          </Alert>
        )}
      </List>
      
      {/* FAB */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setSearchOpen(true)}
      >
        <AddIcon />
      </Fab>
      
      {/* Search Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpen={() => setSearchOpen(true)}
        sx={{
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '80vh'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Добавить позицию
          </Typography>
          
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
              )
            }}
            sx={{ mb: 2 }}
          />
          
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {searchResults.map(product => {
              const availableStock = (product.currentStock || 0) - (product.reservedStock || 0);
              return (
                <ListItem key={product.id} disablePadding>
                  <ListItemButton onClick={() => handleAddItem(product)}>
                    <ListItemText
                      primary={product.name}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography component="span" variant="body2">
                            {`${product.salePrice || product.costPrice || 0} ₽ / ${product.unit}`}
                          </Typography>
                          {product.type === 'product' && (
                            <Chip 
                              label={`Доступно: ${availableStock}`}
                              size="small"
                              color={availableStock > 0 ? 'success' : 'error'}
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                    />
                    <Chip
                      label={product.type === 'service' ? 'Услуга' : 'Товар'}
                      size="small"
                      color={product.type === 'service' ? 'primary' : 'default'}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
            
            {searchQuery && searchResults.length === 0 && (
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => {
                    setNewProductForm({ ...newProductForm, name: searchQuery });
                    setQuickCreateDialog(true);
                  }}
                >
                  <AddIcon sx={{ mr: 2 }} />
                  <ListItemText
                    primary={`Создать: "${searchQuery}"`}
                    secondary="Добавить новую позицию в каталог"
                  />
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </Box>
      </SwipeableDrawer>
      
      {/* Quick Create Dialog */}
      <Dialog open={quickCreateDialog} onClose={() => setQuickCreateDialog(false)} fullWidth>
        <DialogTitle>Создать новую позицию</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название"
            value={newProductForm.name}
            onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Тип</InputLabel>
            <Select
              value={newProductForm.type}
              onChange={(e) => setNewProductForm({ ...newProductForm, type: e.target.value as 'service' | 'product' })}
            >
              <MenuItem value="service">Услуга</MenuItem>
              <MenuItem value="product">Товар</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            label="Единица измерения"
            value={newProductForm.unit}
            onChange={(e) => setNewProductForm({ ...newProductForm, unit: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Цена"
            type="number"
            value={newProductForm.salePrice}
            onChange={(e) => setNewProductForm({ ...newProductForm, salePrice: parseFloat(e.target.value) || 0 })}
            InputProps={{
              endAdornment: <InputAdornment position="end">₽</InputAdornment>
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickCreateDialog(false)}>Отмена</Button>
          <Button onClick={handleQuickCreate} variant="contained" disabled={loading || !newProductForm.name}>
            Создать
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Group Dialog */}
      <Dialog open={groupDialog} onClose={() => setGroupDialog(false)} fullWidth>
        <DialogTitle>Группировать позиции</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Название группы"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Например: Монтажные работы"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialog(false)}>Отмена</Button>
          <Button onClick={handleGroupItems} variant="contained" disabled={!groupName}>
            Создать группу
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert severity={notification.severity as 'success' | 'error'}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MobileEstimatePage;

/**
 * Touch-оптимизированная форма для работы со сметами на мобильных устройствах
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Fab,
  Zoom,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  IconButton,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Collapse,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  ShoppingCart as CartIcon,
  Calculate as CalcIcon,
  AttachMoney as MoneyIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface TouchOptimizedItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

interface TouchOptimizedEstimateFormProps {
  initialItems?: TouchOptimizedItem[];
  onSave: (items: TouchOptimizedItem[], total: number) => Promise<void>;
  onCancel?: () => void;
  title?: string;
  readonly?: boolean;
}

const TouchOptimizedEstimateForm: React.FC<TouchOptimizedEstimateFormProps> = ({
  initialItems = [],
  onSave,
  onCancel,
  title = "Смета",
  readonly = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isVerySmall = useMediaQuery(theme.breakpoints.down(375));

  // State
  const [items, setItems] = useState<TouchOptimizedItem[]>(initialItems);
  const [addItemDrawerOpen, setAddItemDrawerOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    quantity: 1,
    unit: 'шт',
    price: 0,
  });
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Calculate totals
  const total = items.reduce((sum, item) => sum + item.total, 0);
  const itemsCount = items.length;

  // Handlers
  const handleAddItem = useCallback(() => {
    if (!newItemForm.name.trim()) return;

    const newItem: TouchOptimizedItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      name: newItemForm.name.trim(),
      quantity: newItemForm.quantity,
      unit: newItemForm.unit,
      price: newItemForm.price,
      total: newItemForm.quantity * newItemForm.price,
    };

    setItems(prev => [...prev, newItem]);
    setNewItemForm({ name: '', quantity: 1, unit: 'шт', price: 0 });
    setAddItemDrawerOpen(false);
    
    setNotification({
      open: true,
      message: 'Позиция добавлена',
      severity: 'success'
    });
  }, [newItemForm]);

  const handleUpdateQuantity = useCallback((id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return {
          ...item,
          quantity: newQuantity,
          total: newQuantity * item.price,
        };
      }
      return item;
    }));
  }, []);

  const handleUpdatePrice = useCallback((id: string, price: number) => {
    if (price < 0) return;
    
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          price,
          total: item.quantity * price,
        };
      }
      return item;
    }));
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setNotification({
      open: true,
      message: 'Позиция удалена',
      severity: 'success'
    });
  }, []);

  const toggleItemExpanded = useCallback((id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (items.length === 0) {
      setNotification({
        open: true,
        message: 'Добавьте хотя бы одну позицию',
        severity: 'error'
      });
      return;
    }

    setSaving(true);
    try {
      await onSave(items, total);
      setNotification({
        open: true,
        message: 'Смета сохранена',
        severity: 'success'
      });
    } catch (error) {
      setNotification({
        open: true,
        message: 'Ошибка сохранения',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  }, [items, total, onSave]);

  // Common units for quick selection
  const commonUnits = ['шт', 'м', 'м²', 'м³', 'кг', 'час', 'комплект'];

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: isMobile ? 1.5 : 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant={isMobile ? "h6" : "h5"} sx={{ flex: 1 }}>
            {title}
          </Typography>
          
          {onCancel && (
            <IconButton onClick={onCancel} sx={{ minWidth: 44, minHeight: 44 }}>
              <CloseIcon />
            </IconButton>
          )}
        </Stack>

        {/* Summary */}
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Chip
            icon={<CartIcon />}
            label={`${itemsCount} поз.`}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<MoneyIcon />}
            label={`${total.toLocaleString('ru-RU')} ₽`}
            size="small"
            color="primary"
          />
        </Stack>
      </Paper>

      {/* Items List */}
      <Box sx={{ flex: 1, overflow: 'auto', pb: readonly ? 2 : 10 }}>
        {items.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Нет позиций в смете
            </Alert>
            {!readonly && (
              <Button 
                variant="outlined" 
                onClick={() => setAddItemDrawerOpen(true)}
                size="large"
                sx={{ minHeight: 48 }}
              >
                Добавить первую позицию
              </Button>
            )}
          </Box>
        ) : (
          <List sx={{ p: 1 }}>
            {items.map((item, index) => {
              const isExpanded = expandedItems.has(item.id);
              return (
                <Paper key={item.id} sx={{ mb: 1 }}>
                  <ListItem 
                    disablePadding
                    sx={{ 
                      flexDirection: 'column',
                      alignItems: 'stretch'
                    }}
                  >
                    {/* Main item display */}
                    <ListItemButton 
                      onClick={() => !readonly && toggleItemExpanded(item.id)}
                      sx={{ 
                        minHeight: 72,
                        px: isVerySmall ? 1 : 2,
                        py: 1,
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography 
                            variant={isVerySmall ? "body2" : "subtitle1"}
                            fontWeight="bold"
                            noWrap
                          >
                            {item.name}
                          </Typography>
                        }
                        secondary={
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              {item.quantity} {item.unit}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ×
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.price.toLocaleString('ru-RU')} ₽
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              =
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="primary">
                              {item.total.toLocaleString('ru-RU')} ₽
                            </Typography>
                          </Stack>
                        }
                      />
                      {!readonly && (
                        <ListItemIcon sx={{ minWidth: 'auto' }}>
                          {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                        </ListItemIcon>
                      )}
                    </ListItemButton>

                    {/* Expanded controls */}
                    {!readonly && (
                      <Collapse in={isExpanded}>
                        <Box sx={{ px: isVerySmall ? 1 : 2, pb: 2 }}>
                          <Divider sx={{ mb: 2 }} />
                          
                          {/* Quantity controls */}
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ minWidth: 80 }}>
                              Количество:
                            </Typography>
                            <IconButton 
                              size="small"
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              disabled={item.quantity <= 1}
                              sx={{ minWidth: 36, minHeight: 36 }}
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                minWidth: 40, 
                                textAlign: 'center',
                                fontWeight: 'bold'
                              }}
                            >
                              {item.quantity}
                            </Typography>
                            <IconButton 
                              size="small"
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              sx={{ minWidth: 36, minHeight: 36 }}
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Stack>

                          {/* Price input */}
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="body2" sx={{ minWidth: 80 }}>
                              Цена:
                            </Typography>
                            <TextField
                              size="small"
                              type="number"
                              value={item.price}
                              onChange={(e) => handleUpdatePrice(item.id, Number(e.target.value))}
                              InputProps={{
                                endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                              }}
                              sx={{ flex: 1 }}
                              inputProps={{
                                style: {
                                  fontSize: isMobile ? '16px' : '14px',
                                  textAlign: 'right',
                                }
                              }}
                            />
                          </Stack>

                          {/* Remove button */}
                          <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            onClick={() => handleRemoveItem(item.id)}
                            sx={{ minHeight: 44 }}
                          >
                            Удалить позицию
                          </Button>
                        </Box>
                      </Collapse>
                    )}
                  </ListItem>
                </Paper>
              );
            })}
          </List>
        )}
      </Box>

      {/* Fixed Bottom Actions */}
      {!readonly && (
        <>
          {/* Add button */}
          <Zoom in={true}>
            <Fab
              color="primary"
              onClick={() => setAddItemDrawerOpen(true)}
              sx={{
                position: 'fixed',
                bottom: isVerySmall ? 80 : 90,
                right: isVerySmall ? 12 : 16,
                width: isVerySmall ? 48 : 56,
                height: isVerySmall ? 48 : 56,
              }}
            >
              <AddIcon />
            </Fab>
          </Zoom>

          {/* Save button */}
          <Paper 
            elevation={3}
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              p: isVerySmall ? 1 : 2,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleSave}
              disabled={saving || items.length === 0}
              sx={{ minHeight: 56 }}
              startIcon={saving ? undefined : <SaveIcon />}
            >
              {saving ? 'Сохранение...' : `Сохранить (${total.toLocaleString('ru-RU')} ₽)`}
            </Button>
          </Paper>
        </>
      )}

      {/* Add Item Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={addItemDrawerOpen}
        onClose={() => setAddItemDrawerOpen(false)}
        onOpen={() => setAddItemDrawerOpen(true)}
        sx={{
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '90vh',
            pb: 2,
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              Добавить позицию
            </Typography>
            <IconButton onClick={() => setAddItemDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Название"
              value={newItemForm.name}
              onChange={(e) => setNewItemForm(prev => ({ ...prev, name: e.target.value }))}
              inputProps={{
                style: { fontSize: '16px' }
              }}
            />

            <Stack direction="row" spacing={1}>
              <TextField
                label="Количество"
                type="number"
                value={newItemForm.quantity}
                onChange={(e) => setNewItemForm(prev => ({ 
                  ...prev, 
                  quantity: Math.max(1, Number(e.target.value)) 
                }))}
                sx={{ width: 120 }}
                inputProps={{
                  style: { fontSize: '16px', textAlign: 'center' }
                }}
              />
              
              <TextField
                label="Единица"
                value={newItemForm.unit}
                onChange={(e) => setNewItemForm(prev => ({ ...prev, unit: e.target.value }))}
                sx={{ flex: 1 }}
                inputProps={{
                  style: { fontSize: '16px' }
                }}
              />
            </Stack>

            {/* Quick unit selection */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Часто используемые единицы:
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {commonUnits.map(unit => (
                  <Chip
                    key={unit}
                    label={unit}
                    size="small"
                    onClick={() => setNewItemForm(prev => ({ ...prev, unit }))}
                    variant={newItemForm.unit === unit ? "filled" : "outlined"}
                    color={newItemForm.unit === unit ? "primary" : "default"}
                  />
                ))}
              </Stack>
            </Box>

            <TextField
              fullWidth
              label="Цена за единицу"
              type="number"
              value={newItemForm.price}
              onChange={(e) => setNewItemForm(prev => ({ 
                ...prev, 
                price: Math.max(0, Number(e.target.value)) 
              }))}
              InputProps={{
                endAdornment: <InputAdornment position="end">₽</InputAdornment>,
              }}
              inputProps={{
                style: { fontSize: '16px', textAlign: 'right' }
              }}
            />

            {/* Total preview */}
            {newItemForm.name && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary">
                  Итого за позицию:
                </Typography>
                <Typography variant="h6" color="primary">
                  {(newItemForm.quantity * newItemForm.price).toLocaleString('ru-RU')} ₽
                </Typography>
              </Paper>
            )}

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => setAddItemDrawerOpen(false)}
                sx={{ flex: 1, minHeight: 48 }}
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                onClick={handleAddItem}
                disabled={!newItemForm.name.trim()}
                sx={{ flex: 1, minHeight: 48 }}
              >
                Добавить
              </Button>
            </Stack>
          </Stack>
        </Box>
      </SwipeableDrawer>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity={notification.severity}
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TouchOptimizedEstimateForm;
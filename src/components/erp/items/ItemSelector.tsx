/**
 * ItemSelector - Компонент для выбора элементов номенклатуры
 * Используется в сметах, проектах и других местах где нужен выбор товаров/услуг
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Paper,
  Typography,
  Chip,
  Avatar,
  InputAdornment,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Button,
  Stack,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Inventory as ProductIcon,
  Build as ServiceIcon,
  Category as BundleIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { 
  Item, 
  ItemType, 
  ItemCategory,
  ItemFilters,
  isProductItem,
  isServiceItem,
  isBundleItem
} from '../../../types/item.types';
import { getItems } from '../../../api/itemApi';
import { useAuth } from '../../../auth/AuthContext';

interface ItemSelectorProps {
  onSelect: (item: Item) => void;
  onClear?: () => void;
  selectedItem?: Item | null;
  filter?: Partial<ItemFilters>;
  placeholder?: string;
  label?: string;
  showStock?: boolean;
  showPrice?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  multiple?: boolean;
  selectedItems?: Item[];
  onSelectMultiple?: (items: Item[]) => void;
}

const ItemSelector: React.FC<ItemSelectorProps> = ({
  onSelect,
  onClear,
  selectedItem,
  filter = {},
  placeholder = "Выберите элемент номенклатуры...",
  label = "Элемент номенклатуры",
  showStock = false,
  showPrice = false,
  disabled = false,
  required = false,
  error,
  helperText,
  multiple = false,
  selectedItems = [],
  onSelectMultiple
}) => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<ItemFilters>({
    ...filter,
    searchQuery: ''
  });

  // Загрузка элементов с поиском
  const loadItems = useCallback(async (query: string = '') => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      const searchFilters: ItemFilters = {
        ...localFilters,
        searchQuery: query
      };
      
      const result = await getItems(searchFilters, { field: 'name', direction: 'asc' }, 50);
      setItems(result.items);
      
    } catch (err) {
      console.error('Error loading items:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, localFilters]);

  // Загрузка при открытии
  useEffect(() => {
    if (open) {
      loadItems(searchQuery);
    }
  }, [open, loadItems, searchQuery]);

  // Дебаунс для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        loadItems(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, loadItems, open]);

  const getItemIcon = (item: Item) => {
    if (isProductItem(item)) return <ProductIcon sx={{ color: 'primary.main' }} />;
    if (isServiceItem(item)) return <ServiceIcon sx={{ color: 'secondary.main' }} />;
    if (isBundleItem(item)) return <BundleIcon sx={{ color: 'success.main' }} />;
    return null;
  };

  const getItemTypeLabel = (item: Item) => {
    if (isProductItem(item)) return 'Товар';
    if (isServiceItem(item)) return 'Услуга';
    if (isBundleItem(item)) return 'Комплект';
    return '';
  };

  const getItemSubtitle = (item: Item) => {
    const parts = [];
    
    parts.push(getItemTypeLabel(item));
    parts.push(item.code);
    
    if (isProductItem(item) && showStock) {
      parts.push('Остаток: -'); // В будущем: реальный остаток
    }
    
    if (showPrice) {
      if (isProductItem(item) && item.productData.standardCost) {
        parts.push(`₽${item.productData.standardCost}`);
      } else if (isServiceItem(item) && item.serviceData.standardRate) {
        parts.push(`₽${item.serviceData.standardRate}/${item.baseUnit}`);
      }
    }
    
    return parts.join(' • ');
  };

  const renderFilters = () => (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle2">Фильтры</Typography>
        
        <FormControl size="small">
          <InputLabel>Тип элемента</InputLabel>
          <Select
            multiple
            value={localFilters.type || []}
            onChange={(e) => setLocalFilters(prev => ({ 
              ...prev, 
              type: e.target.value as ItemType[] 
            }))}
            input={<OutlinedInput label="Тип элемента" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as ItemType[]).map((value) => (
                  <Chip key={value} label={
                    value === 'product' ? 'Товары' :
                    value === 'service' ? 'Услуги' : 'Комплекты'
                  } size="small" />
                ))}
              </Box>
            )}
          >
            <MenuItem value="product">Товары</MenuItem>
            <MenuItem value="service">Услуги</MenuItem>
            <MenuItem value="bundle">Комплекты</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small">
          <InputLabel>Категория</InputLabel>
          <Select
            multiple
            value={localFilters.category || []}
            onChange={(e) => setLocalFilters(prev => ({ 
              ...prev, 
              category: e.target.value as ItemCategory[] 
            }))}
            input={<OutlinedInput label="Категория" />}
          >
            <MenuItem value="building_materials">Строительные материалы</MenuItem>
            <MenuItem value="electrical_supplies">Электротовары</MenuItem>
            <MenuItem value="plumbing_supplies">Сантехника</MenuItem>
            <MenuItem value="labor_general">Общие работы</MenuItem>
            <MenuItem value="labor_skilled">Квалифицированные работы</MenuItem>
            <MenuItem value="tools">Инструменты</MenuItem>
            <MenuItem value="other">Прочее</MenuItem>
          </Select>
        </FormControl>
        
        {showStock && (
          <FormControl size="small">
            <InputLabel>Наличие на складе</InputLabel>
            <Select
              value={localFilters.stockable || ''}
              onChange={(e) => setLocalFilters(prev => ({ 
                ...prev, 
                stockable: e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined
              }))}
            >
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="true">Только в наличии</MenuItem>
              <MenuItem value="false">Без остатков</MenuItem>
            </Select>
          </FormControl>
        )}
        
        <Button
          size="small"
          onClick={() => setLocalFilters(filter)}
          startIcon={<ClearIcon />}
        >
          Сбросить фильтры
        </Button>
      </Stack>
    </Paper>
  );

  const handleInputChange = (event: any, newValue: string) => {
    setSearchQuery(newValue);
  };

  const handleChange = (event: any, newValue: any) => {
    if (multiple) {
      onSelectMultiple?.(newValue as Item[] || []);
    } else {
      if (newValue) {
        onSelect(newValue as Item);
      } else {
        onClear?.();
      }
    }
  };

  return (
    <Box>
      <Autocomplete
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        multiple={multiple}
        value={multiple ? selectedItems : selectedItem}
        onChange={handleChange}
        onInputChange={handleInputChange}
        options={items}
        loading={loading}
        disabled={disabled}
        getOptionLabel={(option) => {
          const item = option as Item;
          return `${item.code} - ${item.name}`;
        }}
        isOptionEqualToValue={(option, value) => {
          const opt = option as Item;
          const val = value as Item;
          return opt.id === val.id;
        }}
        filterOptions={(x) => x} // Отключаем клиентскую фильтрацию
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            required={required}
            error={!!error}
            helperText={error || helperText}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {showFilters && (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        onClick={() => setShowFilters(!showFilters)}
                        startIcon={<FilterIcon />}
                      >
                        Фильтры
                      </Button>
                    </InputAdornment>
                  )}
                  {params.InputProps.endAdornment}
                </>
              )
            }}
          />
        )}
        renderOption={(props, option) => {
          const item = option as Item;
          return (
            <Box component="li" {...props}>
              <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                {getItemIcon(item)}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  {item.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {getItemSubtitle(item)}
                </Typography>
                {item.description && (
                  <Typography variant="caption" display="block" color="textSecondary">
                    {item.description}
                  </Typography>
                )}
              </Box>
              {isProductItem(item) && showStock && (
                <Box sx={{ textAlign: 'right', ml: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    На складе:
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    - {item.baseUnit}
                  </Typography>
                </Box>
              )}
            </Box>
          );
        }}
        renderTags={(value, getTagProps) =>
          (value as Item[]).map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.id}
              label={`${option.code} - ${option.name}`}
              avatar={<Avatar>{getItemIcon(option)}</Avatar>}
              size="small"
            />
          ))
        }
        noOptionsText={
          searchQuery.length < 2 
            ? "Введите минимум 2 символа для поиска"
            : "Ничего не найдено"
        }
        loadingText="Поиск..."
      />
      
      {/* Расширенные фильтры */}
      {showFilters && open && renderFilters()}
    </Box>
  );
};

export default ItemSelector;

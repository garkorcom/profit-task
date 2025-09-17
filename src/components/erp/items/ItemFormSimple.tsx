/**
 * ItemFormSimple - Упрощенная форма создания и редактирования элементов номенклатуры
 * Использует обычные React формы без внешних зависимостей
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Grid,
  Typography,
  Stack
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { 
  Item, 
  CreateItemDto, 
  UpdateItemDto,
  ItemType, 
  ItemCategory, 
  ItemStatus,
  MeasurementUnit,
  ProductType,
  ServiceType,
  validateItem,
  isProductItem,
  isServiceItem,
  isBundleItem
} from '../../../types/item.types';
import { createItem, updateItem } from '../../../api/itemApi';
import { useAuth } from '../../../auth/AuthContext';
import LoadingSpinner from '../../common/LoadingSpinner';

// Константы для выпадающих списков
const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'building_materials', label: 'Строительные материалы' },
  { value: 'electrical_supplies', label: 'Электротовары' },
  { value: 'plumbing_supplies', label: 'Сантехника' },
  { value: 'hvac_supplies', label: 'Вентиляция и кондиционирование' },
  { value: 'tools', label: 'Инструменты' },
  { value: 'labor_general', label: 'Общие работы' },
  { value: 'labor_skilled', label: 'Квалифицированные работы' },
  { value: 'consulting', label: 'Консультации' },
  { value: 'other', label: 'Прочее' }
];

const UNITS: { value: MeasurementUnit; label: string }[] = [
  { value: 'pcs', label: 'шт.' },
  { value: 'kg', label: 'кг' },
  { value: 'm', label: 'м' },
  { value: 'sqm', label: 'м²' },
  { value: 'cum', label: 'м³' },
  { value: 'l', label: 'л' },
  { value: 'hour', label: 'ч' },
  { value: 'day', label: 'дн.' },
  { value: 'sets', label: 'компл.' }
];

interface ItemFormSimpleProps {
  item?: Item;
  onSave: (item: CreateItemDto | UpdateItemDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const ItemFormSimple: React.FC<ItemFormSimpleProps> = ({ 
  item, 
  onSave, 
  onCancel, 
  loading = false 
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ItemType>(item?.type || 'product');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Базовые поля
  const [code, setCode] = useState(item?.code || '');
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [category, setCategory] = useState<ItemCategory>(item?.category || 'building_materials');
  const [status, setStatus] = useState<ItemStatus>(item?.status || 'active');
  const [baseUnit, setBaseUnit] = useState<MeasurementUnit>(item?.baseUnit || 'pcs');
  
  // Product поля
  const [productType, setProductType] = useState<ProductType>('material');
  const [stockable, setStockable] = useState(true);
  const [serialTracked, setSerialTracked] = useState(false);
  const [lotTracked, setLotTracked] = useState(true);
  const [standardCost, setStandardCost] = useState<string>('');
  const [safetyStock, setSafetyStock] = useState<string>('');
  const [reorderPoint, setReorderPoint] = useState<string>('');
  
  // Service поля
  const [serviceType, setServiceType] = useState<ServiceType>('labor');
  const [estimatedDuration, setEstimatedDuration] = useState<string>('');
  const [skillLevel, setSkillLevel] = useState('middle');
  const [standardRate, setStandardRate] = useState<string>('');
  const [schedulable, setSchedulable] = useState(true);
  
  // Bundle поля
  const [pricingMethod, setPricingMethod] = useState('sum_of_components');
  const [fixedPrice, setFixedPrice] = useState<string>('');
  const [markup, setMarkup] = useState<string>('');
  const [assemblyRequired, setAssemblyRequired] = useState(false);

  // Инициализация данных при редактировании
  useEffect(() => {
    if (item) {
      setActiveTab(item.type);
      setCode(item.code);
      setName(item.name);
      setDescription(item.description || '');
      setCategory(item.category);
      setStatus(item.status);
      setBaseUnit(item.baseUnit);
      
      if (isProductItem(item)) {
        setProductType(item.productData.productType);
        setStockable(item.productData.stockable);
        setSerialTracked(item.productData.serialTracked);
        setLotTracked(item.productData.lotTracked);
        setStandardCost(item.productData.standardCost?.toString() || '');
        setSafetyStock(item.productData.safetyStock?.toString() || '');
        setReorderPoint(item.productData.reorderPoint?.toString() || '');
      } else if (isServiceItem(item)) {
        setServiceType(item.serviceData.serviceType);
        setEstimatedDuration(item.serviceData.estimatedDuration?.toString() || '');
        setSkillLevel(item.serviceData.skillLevel || 'middle');
        setStandardRate(item.serviceData.standardRate?.toString() || '');
        setSchedulable(item.serviceData.schedulable);
      } else if (isBundleItem(item)) {
        setPricingMethod(item.bundleData.pricingMethod);
        setFixedPrice(item.bundleData.fixedPrice?.toString() || '');
        setMarkup(item.bundleData.markup?.toString() || '');
        setAssemblyRequired(item.bundleData.assemblyRequired);
      }
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setValidationErrors([]);
      
      // Создаем DTO в зависимости от типа
      const baseDto: Partial<CreateItemDto> = {
        type: activeTab,
        code,
        name,
        description: description || '',
        category,
        baseUnit,
        tags: []
      };

      // Добавляем специфичные данные
      if (activeTab === 'product') {
        baseDto.productData = {
          productType,
          stockable,
          serialTracked,
          lotTracked,
          standardCost: standardCost ? parseFloat(standardCost) : undefined,
          safetyStock: safetyStock ? parseFloat(safetyStock) : undefined,
          reorderPoint: reorderPoint ? parseFloat(reorderPoint) : undefined
        };
      } else if (activeTab === 'service') {
        baseDto.serviceData = {
          serviceType,
          estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
          skillLevel: skillLevel as any,
          standardRate: standardRate ? parseFloat(standardRate) : undefined,
          schedulable
        };
      } else if (activeTab === 'bundle') {
        baseDto.bundleData = {
          components: [],
          pricingMethod: pricingMethod as any,
          fixedPrice: fixedPrice ? parseFloat(fixedPrice) : undefined,
          markup: markup ? parseFloat(markup) : undefined,
          assemblyRequired,
          storeAsComplete: false,
          disassemblyAllowed: true
        };
      }

      // Валидация
      const mockItem = { 
        ...baseDto, 
        id: 'temp', 
        createdBy: currentUser!.uid, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(), 
        version: 1 
      } as Item;
      
      const validation = validateItem(mockItem);
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors.map(e => e.message));
        return;
      }

      await onSave(baseDto as CreateItemDto);
      
    } catch (error) {
      console.error('Error saving item:', error);
      setValidationErrors([error instanceof Error ? error.message : 'Ошибка сохранения']);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader 
        title={item ? `Редактирование: ${item.name}` : 'Создание элемента номенклатуры'}
        action={
          <Stack direction="row" spacing={1}>
            <Button 
              variant="outlined" 
              onClick={onCancel}
              startIcon={<CancelIcon />}
              disabled={saving}
            >
              Отмена
            </Button>
            <Button 
              variant="contained" 
              type="submit"
              form="item-form"
              startIcon={<SaveIcon />}
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </Stack>
        }
      />
      
      <CardContent>
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2">Ошибки валидации:</Typography>
            <ul>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}
        
        {/* Переключатель типов (только для новых элементов) */}
        {!item && (
          <Box sx={{ mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={(_, value) => setActiveTab(value)}
              variant="fullWidth"
            >
              <Tab label="Товар" value="product" />
              <Tab label="Услуга" value="service" />
              <Tab label="Комплект" value="bundle" />
            </Tabs>
          </Box>
        )}
        
        <form id="item-form" onSubmit={handleSubmit}>
          {/* Базовые поля */}
          <Typography variant="h6" gutterBottom>
            Основная информация
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Код/Артикул"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                fullWidth
                required
                disabled={!!item} // Нельзя менять код существующего элемента
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Название"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Описание"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Категория</InputLabel>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ItemCategory)}
                  label="Категория"
                >
                  {CATEGORIES.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Единица измерения</InputLabel>
                <Select
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value as MeasurementUnit)}
                  label="Единица измерения"
                >
                  {UNITS.map(unit => (
                    <MenuItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Специфичные поля по типу */}
          <Typography variant="h6" gutterBottom>
            {activeTab === 'product' && 'Параметры товара'}
            {activeTab === 'service' && 'Параметры услуги'}
            {activeTab === 'bundle' && 'Параметры комплекта'}
          </Typography>
          
          {activeTab === 'product' && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Стандартная себестоимость"
                  value={standardCost}
                  onChange={(e) => setStandardCost(e.target.value)}
                  type="number"
                  fullWidth
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Складской учет
                </Typography>
                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={stockable} 
                        onChange={(e) => setStockable(e.target.checked)}
                      />
                    }
                    label="Складируется"
                  />
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={lotTracked} 
                        onChange={(e) => setLotTracked(e.target.checked)}
                      />
                    }
                    label="Учет по партиям"
                  />
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={serialTracked} 
                        onChange={(e) => setSerialTracked(e.target.checked)}
                      />
                    }
                    label="Учет по серийным номерам"
                  />
                </Stack>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  label="Страховой запас"
                  value={safetyStock}
                  onChange={(e) => setSafetyStock(e.target.value)}
                  type="number"
                  fullWidth
                  inputProps={{ min: 0 }}
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <TextField
                  label="Точка перезаказа"
                  value={reorderPoint}
                  onChange={(e) => setReorderPoint(e.target.value)}
                  type="number"
                  fullWidth
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Grid>
          )}
          
          {activeTab === 'service' && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Тип услуги</InputLabel>
                  <Select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as ServiceType)}
                    label="Тип услуги"
                  >
                    <MenuItem value="labor">Работы</MenuItem>
                    <MenuItem value="consulting">Консультации</MenuItem>
                    <MenuItem value="logistics">Логистика</MenuItem>
                    <MenuItem value="maintenance">Обслуживание</MenuItem>
                    <MenuItem value="design">Проектирование</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Уровень квалификации</InputLabel>
                  <Select
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value)}
                    label="Уровень квалификации"
                  >
                    <MenuItem value="entry">Начальный</MenuItem>
                    <MenuItem value="junior">Младший</MenuItem>
                    <MenuItem value="middle">Средний</MenuItem>
                    <MenuItem value="senior">Старший</MenuItem>
                    <MenuItem value="expert">Эксперт</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Ориентировочная длительность (мин)"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  type="number"
                  fullWidth
                  inputProps={{ min: 0 }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Стандартная ставка"
                  value={standardRate}
                  onChange={(e) => setStandardRate(e.target.value)}
                  type="number"
                  fullWidth
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={schedulable} 
                      onChange={(e) => setSchedulable(e.target.checked)}
                    />
                  }
                  label="Планируется в календаре"
                />
              </Grid>
            </Grid>
          )}
          
          {activeTab === 'bundle' && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Alert severity="info">
                  Комплекты позволяют объединить несколько товаров и услуг в один элемент номенклатуры.
                  Компоненты комплекта настраиваются в отдельном разделе.
                </Alert>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Метод ценообразования</InputLabel>
                  <Select
                    value={pricingMethod}
                    onChange={(e) => setPricingMethod(e.target.value)}
                    label="Метод ценообразования"
                  >
                    <MenuItem value="sum_of_components">Сумма компонентов</MenuItem>
                    <MenuItem value="fixed_price">Фиксированная цена</MenuItem>
                    <MenuItem value="markup_on_components">Наценка на компоненты</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {pricingMethod === 'fixed_price' && (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Фиксированная цена"
                    value={fixedPrice}
                    onChange={(e) => setFixedPrice(e.target.value)}
                    type="number"
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
              )}
              
              {pricingMethod === 'markup_on_components' && (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Наценка (%)"
                    value={markup}
                    onChange={(e) => setMarkup(e.target.value)}
                    type="number"
                    fullWidth
                    inputProps={{ min: 0, max: 1000 }}
                  />
                </Grid>
              )}
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={assemblyRequired} 
                      onChange={(e) => setAssemblyRequired(e.target.checked)}
                    />
                  }
                  label="Требуется сборка"
                />
              </Grid>
            </Grid>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default ItemFormSimple;

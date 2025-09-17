/**
 * ItemForm - Форма создания и редактирования элементов номенклатуры
 * Поддерживает Product, Service, Bundle с динамическими полями
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
  Chip,
  Autocomplete,
  Grid,
  Typography,
  IconButton,
  Collapse
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
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

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'material', label: 'Материал' },
  { value: 'equipment', label: 'Оборудование' },
  { value: 'consumable', label: 'Расходник' },
  { value: 'spare_part', label: 'Запчасть' }
];

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'labor', label: 'Работы' },
  { value: 'consulting', label: 'Консультации' },
  { value: 'logistics', label: 'Логистика' },
  { value: 'maintenance', label: 'Обслуживание' },
  { value: 'design', label: 'Проектирование' }
];

interface ItemFormProps {
  item?: Item;
  onSave: (item: CreateItemDto | UpdateItemDto) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface FormData {
  type: ItemType;
  code: string;
  name: string;
  description?: string;
  category: ItemCategory;
  status: ItemStatus;
  baseUnit: MeasurementUnit;
  tags: string[];
  
  // Product fields
  productType?: ProductType;
  stockable?: boolean;
  serialTracked?: boolean;
  lotTracked?: boolean;
  shelfLife?: number;
  minOrderQty?: number;
  safetyStock?: number;
  reorderPoint?: number;
  standardCost?: number;
  
  // Service fields  
  serviceType?: ServiceType;
  estimatedDuration?: number;
  skillLevel?: string;
  standardRate?: number;
  schedulable?: boolean;
  
  // Bundle fields
  pricingMethod?: string;
  fixedPrice?: number;
  markup?: number;
  assemblyRequired?: boolean;
}

const ItemForm: React.FC<ItemFormProps> = ({ 
  item, 
  onSave, 
  onCancel, 
  loading = false 
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ItemType>('product');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    inventory: false,
    pricing: false,
    advanced: false
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      type: item?.type || 'product',
      code: item?.code || '',
      name: item?.name || '',
      description: item?.description || '',
      category: item?.category || 'building_materials',
      status: item?.status || 'active',
      baseUnit: item?.baseUnit || 'pcs',
      tags: item?.tags || [],
      
      // Product defaults
      productType: (item && isProductItem(item)) ? item.productData.productType : 'material',
      stockable: (item && isProductItem(item)) ? item.productData.stockable : true,
      serialTracked: (item && isProductItem(item)) ? item.productData.serialTracked : false,
      lotTracked: (item && isProductItem(item)) ? item.productData.lotTracked : true,
      standardCost: (item && isProductItem(item)) ? item.productData.standardCost : undefined,
      
      // Service defaults
      serviceType: (item && isServiceItem(item)) ? item.serviceData.serviceType : 'labor',
      estimatedDuration: (item && isServiceItem(item)) ? item.serviceData.estimatedDuration : undefined,
      skillLevel: (item && isServiceItem(item)) ? item.serviceData.skillLevel : 'middle',
      standardRate: (item && isServiceItem(item)) ? item.serviceData.standardRate : undefined,
      schedulable: (item && isServiceItem(item)) ? item.serviceData.schedulable : true,
      
      // Bundle defaults
      pricingMethod: (item && isBundleItem(item)) ? item.bundleData.pricingMethod : 'sum_of_components',
      assemblyRequired: (item && isBundleItem(item)) ? item.bundleData.assemblyRequired : false
    }
  });

  const watchedType = watch('type');

  useEffect(() => {
    if (item && item.type !== activeTab) {
      setActiveTab(item.type);
      setValue('type', item.type);
    }
  }, [item, activeTab, setValue]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const onSubmit = async (data: FormData) => {
    try {
      setValidationErrors([]);
      
      // Создаем DTO в зависимости от типа
      const baseDto: Partial<CreateItemDto> = {
        type: data.type,
        code: data.code,
        name: data.name,
        description: data.description,
        category: data.category,
        baseUnit: data.baseUnit,
        tags: data.tags
      };

      // Добавляем специфичные данные
      if (data.type === 'product') {
        baseDto.productData = {
          productType: data.productType!,
          stockable: data.stockable!,
          serialTracked: data.serialTracked!,
          lotTracked: data.lotTracked!,
          shelfLife: data.shelfLife,
          minOrderQty: data.minOrderQty,
          safetyStock: data.safetyStock,
          reorderPoint: data.reorderPoint,
          standardCost: data.standardCost
        };
      } else if (data.type === 'service') {
        baseDto.serviceData = {
          serviceType: data.serviceType!,
          estimatedDuration: data.estimatedDuration,
          skillLevel: data.skillLevel as any,
          standardRate: data.standardRate,
          schedulable: data.schedulable!
        };
      } else if (data.type === 'bundle') {
        baseDto.bundleData = {
          components: [], // Будет заполнено в отдельном компоненте
          pricingMethod: data.pricingMethod as any,
          fixedPrice: data.fixedPrice,
          markup: data.markup,
          assemblyRequired: data.assemblyRequired!,
          storeAsComplete: false,
          disassemblyAllowed: true
        };
      }

      // Валидация
      const mockItem = { ...baseDto, id: 'temp', createdBy: currentUser!.uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1 } as Item;
      const validation = validateItem(mockItem);
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors.map(e => e.message));
        return;
      }

      await onSave(baseDto as CreateItemDto);
      
    } catch (error) {
      console.error('Error saving item:', error);
      setValidationErrors([error instanceof Error ? error.message : 'Ошибка сохранения']);
    }
  };

  const renderBasicFields = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Controller
          name="code"
          control={control}
          rules={{ required: 'Код обязателен' }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Код/Артикул"
              fullWidth
              error={!!errors.code}
              helperText={errors.code?.message}
              disabled={!!item} // Нельзя менять код существующего элемента
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="name"
          control={control}
          rules={{ required: 'Название обязательно' }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Название"
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12}>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Описание"
              fullWidth
              multiline
              rows={3}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="category"
          control={control}
          rules={{ required: 'Категория обязательна' }}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.category}>
              <InputLabel>Категория</InputLabel>
              <Select {...field} label="Категория">
                {CATEGORIES.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.category && <FormHelperText>{errors.category.message}</FormHelperText>}
            </FormControl>
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="baseUnit"
          control={control}
          rules={{ required: 'Единица измерения обязательна' }}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.baseUnit}>
              <InputLabel>Единица измерения</InputLabel>
              <Select {...field} label="Единица измерения">
                {UNITS.map(unit => (
                  <MenuItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.baseUnit && <FormHelperText>{errors.baseUnit.message}</FormHelperText>}
            </FormControl>
          )}
        />
      </Grid>
    </Grid>
  );

  const renderProductFields = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Controller
          name="productType"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Тип продукта</InputLabel>
              <Select {...field} label="Тип продукта">
                {PRODUCT_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="standardCost"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Стандартная себестоимость"
              type="number"
              fullWidth
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>
          Складской учет
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Controller
            name="stockable"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} />}
                label="Складируется"
              />
            )}
          />
          <Controller
            name="lotTracked"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} />}
                label="Учет по партиям"
              />
            )}
          />
          <Controller
            name="serialTracked"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} />}
                label="Учет по серийным номерам"
              />
            )}
          />
        </Box>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="safetyStock"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Страховой запас"
              type="number"
              fullWidth
              InputProps={{ inputProps: { min: 0 } }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="reorderPoint"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Точка перезаказа"
              type="number"
              fullWidth
              InputProps={{ inputProps: { min: 0 } }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Controller
          name="minOrderQty"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Мин. партия заказа"
              type="number"
              fullWidth
              InputProps={{ inputProps: { min: 0 } }}
            />
          )}
        />
      </Grid>
    </Grid>
  );

  const renderServiceFields = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Controller
          name="serviceType"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Тип услуги</InputLabel>
              <Select {...field} label="Тип услуги">
                {SERVICE_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="skillLevel"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Уровень квалификации</InputLabel>
              <Select {...field} label="Уровень квалификации">
                <MenuItem value="entry">Начальный</MenuItem>
                <MenuItem value="junior">Младший</MenuItem>
                <MenuItem value="middle">Средний</MenuItem>
                <MenuItem value="senior">Старший</MenuItem>
                <MenuItem value="expert">Эксперт</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="estimatedDuration"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Ориентировочная длительность (мин)"
              type="number"
              fullWidth
              InputProps={{ inputProps: { min: 0 } }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="standardRate"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Стандартная ставка"
              type="number"
              fullWidth
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />
          )}
        />
      </Grid>
      
      <Grid item xs={12}>
        <Controller
          name="schedulable"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch {...field} checked={field.value} />}
              label="Планируется в календаре"
            />
          )}
        />
      </Grid>
    </Grid>
  );

  const renderBundleFields = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info">
          Комплекты позволяют объединить несколько товаров и услуг в один элемент номенклатуры.
          Компоненты комплекта настраиваются в отдельном разделе.
        </Alert>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Controller
          name="pricingMethod"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>Метод ценообразования</InputLabel>
              <Select {...field} label="Метод ценообразования">
                <MenuItem value="sum_of_components">Сумма компонентов</MenuItem>
                <MenuItem value="fixed_price">Фиксированная цена</MenuItem>
                <MenuItem value="markup_on_components">Наценка на компоненты</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>
      
      {watch('pricingMethod') === 'fixed_price' && (
        <Grid item xs={12} md={6}>
          <Controller
            name="fixedPrice"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Фиксированная цена"
                type="number"
                fullWidth
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              />
            )}
          />
        </Grid>
      )}
      
      {watch('pricingMethod') === 'markup_on_components' && (
        <Grid item xs={12} md={6}>
          <Controller
            name="markup"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Наценка (%)"
                type="number"
                fullWidth
                InputProps={{ inputProps: { min: 0, max: 1000 } }}
              />
            )}
          />
        </Grid>
      )}
      
      <Grid item xs={12}>
        <Controller
          name="assemblyRequired"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch {...field} checked={field.value} />}
              label="Требуется сборка"
            />
          )}
        />
      </Grid>
    </Grid>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader 
        title={item ? `Редактирование: ${item.name}` : 'Создание элемента номенклатуры'}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined" 
              onClick={onCancel}
              startIcon={<CancelIcon />}
            >
              Отмена
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSubmit(onSubmit)}
              startIcon={<SaveIcon />}
            >
              Сохранить
            </Button>
          </Box>
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
              onChange={(_, value) => {
                setActiveTab(value);
                setValue('type', value);
              }}
              variant="fullWidth"
            >
              <Tab label="Товар" value="product" />
              <Tab label="Услуга" value="service" />
              <Tab label="Комплект" value="bundle" />
            </Tabs>
          </Box>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Базовые поля */}
          <Box sx={{ mb: 3 }}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                cursor: 'pointer'
              }}
              onClick={() => toggleSection('basic')}
            >
              <Typography variant="h6">Основная информация</Typography>
              <IconButton size="small">
                {expandedSections.basic ? <CollapseIcon /> : <ExpandIcon />}
              </IconButton>
            </Box>
            <Collapse in={expandedSections.basic}>
              {renderBasicFields()}
            </Collapse>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          {/* Специфичные поля по типу */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {watchedType === 'product' && 'Параметры товара'}
              {watchedType === 'service' && 'Параметры услуги'}
              {watchedType === 'bundle' && 'Параметры комплекта'}
            </Typography>
            
            {watchedType === 'product' && renderProductFields()}
            {watchedType === 'service' && renderServiceFields()}
            {watchedType === 'bundle' && renderBundleFields()}
          </Box>
        </form>
      </CardContent>
    </Card>
  );
};

export default ItemForm;

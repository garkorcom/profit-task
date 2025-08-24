import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Divider,
  Grid,
  Card,
  CardContent,
  Fab,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Share as ShareIcon,
  History as HistoryIcon,
  Work as WorkIcon,
  Build as MaterialIcon,
  AttachMoney as ExpenseIcon,
  Folder as SectionIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';
import {
  Estimate,
  EstimateItem,
  EstimateItemType,
  EstimationMethod,
  PertEstimate,
  getEstimateStream,
  updateEstimate,
  calculateEstimateTotal,
  calculatePert,
  createEstimateVersion,
  createShareLink
} from '../api/estimateApi';
import { getProductsStream, Product } from '../api/productApi';
import { EstimateTemplates } from '../components/estimates/EstimateTemplates';
import { EstimateVersionManager, EstimateVersion } from '../components/estimates/EstimateVersionManager';
import { EstimateVersionComparison } from '../components/estimates/EstimateVersionComparison';

/**
 * Компонент для редактирования элемента эстимейта
 */
const EstimateItemEditor: React.FC<{
  item: EstimateItem | null;
  products: Product[];
  defaultRate: number;
  currency: string | undefined;
  onSave: (item: EstimateItem) => void;
  onCancel: () => void;
}> = ({ item, products, defaultRate, currency, onSave, onCancel }) => {
  const [formData, setFormData] = useState<EstimateItem>(
    item || {
      id: `item-${Date.now()}`,
      type: 'work',
      name: '',
      order: 0,
      level: 0,
      total: 0,
      quantity: 1,
      unit: 'час',
      estimationMethod: 'single'
    }
  );

  const [pertValues, setPertValues] = useState<PertEstimate>({
    optimistic: 0,
    mostLikely: 0,
    pessimistic: 0
  });

  useEffect(() => {
    if (item?.pertEstimate) {
      setPertValues(item.pertEstimate);
    }
  }, [item]);

  const handleTypeChange = (type: EstimateItemType) => {
    setFormData({
      ...formData,
      type,
      hours: undefined,
      materialCost: undefined,
      expenseAmount: undefined
    });
  };

  const calculateTotal = () => {
    let total = 0;
    
    switch (formData.type) {
      case 'work':
        const rate = formData.rate || defaultRate;
        if (formData.estimationMethod === 'pert' && pertValues) {
          const hours = calculatePert(pertValues);
          total = hours * rate * (formData.quantity || 1);
        } else {
          total = (formData.hours || 0) * rate * (formData.quantity || 1);
        }
        break;
        
      case 'material':
        total = (formData.materialCost || 0) * (formData.materialQuantity || 0);
        break;
        
      case 'expense':
        total = formData.expenseAmount || 0;
        break;
    }
    
    return total;
  };

  const handleSave = () => {
    const total = calculateTotal();
    const itemToSave: EstimateItem = {
      ...formData,
      total,
      pertEstimate: formData.estimationMethod === 'pert' ? pertValues : undefined
    };
    onSave(itemToSave);
  };

  const getCurrencySymbol = (c?: string) => {
    switch (c) {
      case 'USD': return '$';
      case 'EUR': return '€';
      default: return '₽';
    }
  };

  return (
    <Box p={2}>
      <Grid container spacing={2}>
        <Grid size={12}>
          <ToggleButtonGroup
            value={formData.type}
            exclusive
            onChange={(e, v) => v && handleTypeChange(v)}
            fullWidth
          >
            <ToggleButton value="section">
              <SectionIcon sx={{ mr: 1 }} />
              Раздел
            </ToggleButton>
            <ToggleButton value="work">
              <WorkIcon sx={{ mr: 1 }} />
              Работа
            </ToggleButton>
            <ToggleButton value="material">
              <MaterialIcon sx={{ mr: 1 }} />
              Материал
            </ToggleButton>
            <ToggleButton value="expense">
              <ExpenseIcon sx={{ mr: 1 }} />
              Расход
            </ToggleButton>
          </ToggleButtonGroup>
        </Grid>

        <Grid size={12}>
          <TextField
            label="Название"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            required
          />
        </Grid>

        <Grid size={12}>
          <TextField
            label="Описание"
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
        </Grid>

        {formData.type === 'work' && (
          <>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Метод оценки</InputLabel>
                <Select
                  value={formData.estimationMethod || 'single'}
                  onChange={e => setFormData({ ...formData, estimationMethod: e.target.value as EstimationMethod })}
                >
                  <MenuItem value="single">По одной точке</MenuItem>
                  <MenuItem value="pert">PERT (3 точки)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {formData.estimationMethod === 'single' ? (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Часы"
                  type="number"
                  value={formData.hours || 0}
                  onChange={e => setFormData({ ...formData, hours: Number(e.target.value) })}
                  fullWidth
                />
              </Grid>
            ) : (
              <>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Оптимистичная"
                    type="number"
                    value={pertValues.optimistic}
                    onChange={e => setPertValues({ ...pertValues, optimistic: Number(e.target.value) })}
                    fullWidth
                    helperText="Лучший случай"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Вероятная"
                    type="number"
                    value={pertValues.mostLikely}
                    onChange={e => setPertValues({ ...pertValues, mostLikely: Number(e.target.value) })}
                    fullWidth
                    helperText="Реалистичная"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Пессимистичная"
                    type="number"
                    value={pertValues.pessimistic}
                    onChange={e => setPertValues({ ...pertValues, pessimistic: Number(e.target.value) })}
                    fullWidth
                    helperText="Худший случай"
                  />
                </Grid>
                {pertValues.optimistic > 0 && (
                  <Grid size={12}>
                    <Alert severity="info">
                      PERT расчет: {calculatePert(pertValues).toFixed(2)} часов
                    </Alert>
                  </Grid>
                )}
              </>
            )}

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Количество"
                type="number"
                value={formData.quantity || 1}
                onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Ставка за час"
                type="number"
                value={formData.rate || defaultRate}
                onChange={e => setFormData({ ...formData, rate: Number(e.target.value) })}
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">{getCurrencySymbol(currency)}</InputAdornment>
                }}
              />
            </Grid>
          </>
        )}

        {formData.type === 'material' && (
          <>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Количество"
                type="number"
                value={formData.materialQuantity || 0}
                onChange={e => setFormData({ ...formData, materialQuantity: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Единица"
                value={formData.materialUnit || 'шт'}
                onChange={e => setFormData({ ...formData, materialUnit: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Цена за единицу"
                type="number"
                value={formData.materialCost || 0}
                onChange={e => setFormData({ ...formData, materialCost: Number(e.target.value) })}
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">{getCurrencySymbol(currency)}</InputAdornment>
                }}
              />
            </Grid>
          </>
        )}

        {formData.type === 'expense' && (
          <Grid size={12}>
            <TextField
              label="Сумма расхода"
              type="number"
              value={formData.expenseAmount || 0}
              onChange={e => setFormData({ ...formData, expenseAmount: Number(e.target.value) })}
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">{getCurrencySymbol(currency)}</InputAdornment>
              }}
            />
          </Grid>
        )}

        {formData.type !== 'section' && (
          <Grid size={12}>
            <Alert severity="info">
              Итого: {calculateTotal().toFixed(2)} {getCurrencySymbol(currency)}
            </Alert>
          </Grid>
        )}
      </Grid>

      <Box mt={3} display="flex" gap={2} justifyContent="flex-end">
        <Button onClick={onCancel}>Отмена</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!formData.name}
        >
          Сохранить
        </Button>
      </Box>
    </Box>
  );
};

/**
 * Основная страница конструктора эстимейтов
 */
const EstimateConstructorPage: React.FC = () => {
  const { estimateId } = useParams();
  const { currentUser, ownerUid } = useAuth();
  const getCurrencySymbol = (c?: string) => {
    switch (c) {
      case 'USD': return '$';
      case 'EUR': return '€';
      default: return '₽';
    }
  };

  
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [versions, setVersions] = useState<EstimateVersion[]>([]);
  const [versionManagerOpen, setVersionManagerOpen] = useState(false);
  const [versionComparisonOpen, setVersionComparisonOpen] = useState(false);
  const [versionsToCompare, setVersionsToCompare] = useState<[EstimateVersion?, EstimateVersion?]>([]);
  
  // Диалоги
  const [itemDialog, setItemDialog] = useState<{
    open: boolean;
    item: EstimateItem | null;
    itemType?: EstimateItemType;
  }>({ open: false, item: null });
  
  const [versionDialog, setVersionDialog] = useState(false);
  const [versionNotes, setVersionNotes] = useState('');
  
  // Состояние для шаринга
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  
  // Уведомления
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Загрузка данных
  useEffect(() => {
    if (!currentUser || !estimateId) return;

    const unsubscribeEstimate = getEstimateStream(
      ownerUid || currentUser.uid,
      estimateId,
      (data) => {
        setEstimate(data);
        setLoading(false);
        
        // Инициализируем версии (для демонстрации создаем несколько версий)
        if (data) {
          const currentVersion: EstimateVersion = {
            id: 'v-current',
            version: data.version || '1.0',
            status: data.status as any || 'draft',
            createdAt: new Date(),
            createdBy: currentUser.email || 'Текущий пользователь',
            notes: 'Текущая версия',
            items: data.items || [],
            subtotal: data.subtotal || 0,
            total: data.total || 0,
            taxRate: data.taxRate,
            discountRate: data.discountRate
          };
          
          // Создаем пример предыдущих версий для демонстрации
          const previousVersions: EstimateVersion[] = [
            {
              id: 'v-0.9',
              version: '0.9',
              status: 'draft',
              createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // неделю назад
              createdBy: currentUser.email || 'Текущий пользователь',
              notes: 'Первоначальная версия',
              items: data.items?.slice(0, -1) || [], // без последнего элемента
              subtotal: (data.subtotal || 0) * 0.8,
              total: (data.total || 0) * 0.8,
              taxRate: data.taxRate,
              discountRate: data.discountRate
            },
            {
              id: 'v-0.8',
              version: '0.8',
              status: 'draft',
              createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 недели назад
              createdBy: currentUser.email || 'Текущий пользователь',
              notes: 'Черновик',
              items: data.items?.slice(0, -2) || [], // без двух последних элементов
              subtotal: (data.subtotal || 0) * 0.6,
              total: (data.total || 0) * 0.6,
              taxRate: data.taxRate,
              discountRate: data.discountRate
            }
          ];
          
          setVersions([currentVersion, ...previousVersions]);
        }
      }
    );

    const unsubscribeProducts = getProductsStream(
      ownerUid || currentUser.uid,
      (data) => setProducts(data)
    );

    return () => {
      unsubscribeEstimate();
      unsubscribeProducts();
    };
  }, [currentUser, ownerUid, estimateId, versions.length]);

  // Сохранение элемента
  const handleSaveItem = async (item: EstimateItem) => {
    if (!estimate || !currentUser) return;

    const items = item.id && estimate.items.find(i => i.id === item.id)
      ? estimate.items.map(i => i.id === item.id ? item : i)
      : [...estimate.items, { ...item, order: estimate.items.length }];

    const total = calculateEstimateTotal({ ...estimate, items });

    try {
      setSaving(true);
      await updateEstimate(ownerUid || currentUser.uid, estimate.id, {
        items,
        total,
        subtotal: total
      });
      
      setItemDialog({ open: false, item: null });
      setNotification({
        open: true,
        message: 'Элемент сохранен',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving item:', error);
      setNotification({
        open: true,
        message: 'Ошибка при сохранении',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  // Удаление элемента
  const handleDeleteItem = async (itemId: string) => {
    if (!estimate || !currentUser) return;

    const items = estimate.items.filter(i => i.id !== itemId);
    const total = calculateEstimateTotal({ ...estimate, items });

    try {
      await updateEstimate(ownerUid || currentUser.uid, estimate.id, {
        items,
        total,
        subtotal: total
      });
      
      setNotification({
        open: true,
        message: 'Элемент удален',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      setNotification({
        open: true,
        message: 'Ошибка при удалении',
        severity: 'error'
      });
    }
  };

  // Создание версии
  const handleCreateVersion = async () => {
    if (!estimate || !currentUser) return;

    try {
      const nextVersion = estimate.version.split('.').map((v, i) => 
        i === 1 ? String(Number(v) + 1) : v
      ).join('.');
      
      await createEstimateVersion(
        ownerUid || currentUser.uid,
        estimate.id,
        nextVersion,
        versionNotes
      );
      
      setVersionDialog(false);
      setVersionNotes('');
      setNotification({
        open: true,
        message: `Версия ${nextVersion} создана`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error creating version:', error);
      setNotification({
        open: true,
        message: 'Ошибка при создании версии',
        severity: 'error'
      });
    }
  };

  // Создание публичной ссылки
  const handleCreateShareLink = async () => {
    if (!currentUser || !estimateId) return;

    setGeneratingLink(true);
    try {
      const link = await createShareLink(ownerUid || currentUser.uid, estimateId, {
        isPublic: true,
        allowComments: false,
        requireAuth: false
      });
      setShareLink(link);
      setNotification({
        open: true,
        message: 'Ссылка для шаринга успешно создана!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Ошибка при создании ссылки:', error);
      setNotification({
        open: true,
        message: 'Не удалось создать ссылку',
        severity: 'error'
      });
    } finally {
      setGeneratingLink(false);
    }
  };

  const openAddItemDialog = (type: EstimateItemType) => {
    setItemDialog({ 
      open: true, 
      item: {
        id: `item-${Date.now()}`,
        type,
        name: '',
        order: estimate?.items.length || 0,
        level: 0,
        total: 0,
        quantity: 1,
        unit: 'час',
        estimationMethod: 'single'
      },
      itemType: type
    });
  };

  if (loading) return <LoadingSpinner />;
  if (!estimate) return <Typography>Эстимейт не найден</Typography>;

  return (
    <Box>
      {/* Заголовок */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">{estimate.name || 'Новый эстимейт'}</Typography>
          <Box display="flex" gap={1} mt={1}>
            <Chip label={`Версия ${estimate.version || '1.0'}`} size="small" />
            <Chip 
              label={estimate.status === 'draft' ? 'Черновик' : estimate.status}
              size="small"
              color={estimate.status === 'approved' ? 'success' : 'default'}
            />
            <Chip label={`${estimate.currency || 'RUB'}`} size="small" />
          </Box>
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            startIcon={<SectionIcon />}
            onClick={() => setTemplatesOpen(true)}
          >
            Шаблоны
          </Button>
          <Button
            startIcon={<HistoryIcon />}
            onClick={() => setVersionManagerOpen(true)}
          >
            Версия
          </Button>
          <Button
            startIcon={<ShareIcon />}
            onClick={() => setShareDialogOpen(true)}
          >
            Поделиться
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => {/* Отправить клиенту */}}
          >
            Отправить
          </Button>
        </Box>
      </Box>

      {/* Табы */}
      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
        <Tab label="Конструктор" />
        <Tab label="Настройки" />
        <Tab label="Предпросмотр" />
      </Tabs>

      {/* Конструктор */}
      {activeTab === 0 && (
        <Box mt={3}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell align="center">Кол-во</TableCell>
                  <TableCell align="center">Ед.</TableCell>
                  <TableCell align="right">Цена</TableCell>
                  <TableCell align="right">Сумма</TableCell>
                  <TableCell width={120}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(estimate.items || [])
                  .sort((a, b) => a.order - b.order)
                  .map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {item.type === 'section' && <SectionIcon fontSize="small" />}
                          {item.type === 'work' && <WorkIcon fontSize="small" />}
                          {item.type === 'material' && <MaterialIcon fontSize="small" />}
                          {item.type === 'expense' && <ExpenseIcon fontSize="small" />}
                          <Box>
                            <Typography variant="body2" fontWeight={item.type === 'section' ? 'bold' : 'normal'}>
                              {item.name}
                            </Typography>
                            {item.description && (
                              <Typography variant="caption" color="text.secondary">
                                {item.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {item.type === 'work' && item.quantity}
                        {item.type === 'material' && item.materialQuantity}
                      </TableCell>
                      <TableCell align="center">
                        {item.type === 'work' && item.unit}
                        {item.type === 'material' && item.materialUnit}
                      </TableCell>
                      <TableCell align="right">
                        {item.type === 'work' && `${item.rate || estimate.defaultRate || 0} ${getCurrencySymbol(estimate.currency)}`}
                        {item.type === 'material' && `${item.materialCost || 0} ${getCurrencySymbol(estimate.currency)}`}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="medium">
                          {item.total.toFixed(2)} {getCurrencySymbol(estimate.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <IconButton
                            size="small"
                            onClick={() => setItemDialog({ open: true, item })}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Итоги */}
          <Box mt={3} display="flex" justifyContent="flex-end">
            <Card sx={{ minWidth: 300 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Итого</Typography>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Подитог:</Typography>
                  <Typography>{(estimate.subtotal || 0).toFixed(2)} {getCurrencySymbol(estimate.currency)}</Typography>
                </Box>
                {estimate.taxRate && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Налог ({estimate.taxRate}%):</Typography>
                    <Typography>{(estimate.taxAmount || 0).toFixed(2)} {getCurrencySymbol(estimate.currency)}</Typography>
                  </Box>
                )}
                {estimate.discountRate && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Скидка ({estimate.discountRate}%):</Typography>
                    <Typography>-{(estimate.discountAmount || 0).toFixed(2)} {getCurrencySymbol(estimate.currency)}</Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6">Всего:</Typography>
                  <Typography variant="h6" color="primary">
                    {(estimate.total || 0).toFixed(2)} {getCurrencySymbol(estimate.currency)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Кнопки добавления */}
          <Box position="fixed" bottom={16} right={16} display="flex" flexDirection="column" gap={1}>
            <Fab
              color="primary"
              onClick={() => openAddItemDialog('work')}
              title="Добавить работу"
            >
              <WorkIcon />
            </Fab>
            <Fab
              size="small"
              onClick={() => openAddItemDialog('material')}
              title="Добавить материал"
            >
              <MaterialIcon />
            </Fab>
            <Fab
              size="small"
              onClick={() => openAddItemDialog('expense')}
              title="Добавить расход"
            >
              <ExpenseIcon />
            </Fab>
            <Fab
              size="small"
              onClick={() => openAddItemDialog('section')}
              title="Добавить раздел"
            >
              <SectionIcon />
            </Fab>
          </Box>
        </Box>
      )}

      {/* Настройки */}
      {activeTab === 1 && (
        <Box mt={3}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Основные настройки</Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    label="Название эстимейта"
                    value={estimate.name || ''}
                    onChange={e => setEstimate({ ...estimate, name: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Описание"
                    value={estimate.description || ''}
                    onChange={e => setEstimate({ ...estimate, description: e.target.value })}
                    fullWidth
                    multiline
                    rows={3}
                  />
                  <FormControl fullWidth>
                    <InputLabel>Валюта</InputLabel>
                    <Select
                      value={estimate.currency || 'RUB'}
                      onChange={e => setEstimate({ ...estimate, currency: e.target.value })}
                    >
                      <MenuItem value="RUB">₽ RUB</MenuItem>
                      <MenuItem value="USD">$ USD</MenuItem>
                      <MenuItem value="EUR">€ EUR</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Ставка по умолчанию"
                    type="number"
                    value={estimate.defaultRate || 0}
                    onChange={e => setEstimate({ ...estimate, defaultRate: Number(e.target.value) })}
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">{`${getCurrencySymbol(estimate.currency)}/час`}</InputAdornment>
                    }}
                  />
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Налоги и скидки</Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    label="Налог (%)"
                    type="number"
                    value={estimate.taxRate || 0}
                    onChange={e => setEstimate({ ...estimate, taxRate: Number(e.target.value) })}
                    fullWidth
                  />
                  <TextField
                    label="Скидка (%)"
                    type="number"
                    value={estimate.discountRate || 0}
                    onChange={e => setEstimate({ ...estimate, discountRate: Number(e.target.value) })}
                    fullWidth
                  />
                </Box>
              </Paper>
            </Grid>

            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Дополнительная информация</Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    label="Срок действия предложения"
                    value={estimate.validUntil || ''}
                    onChange={e => setEstimate({ ...estimate, validUntil: e.target.value })}
                    fullWidth
                    helperText="Например: 30 дней"
                  />
                  <TextField
                    label="Условия оплаты"
                    value={estimate.paymentTerms || ''}
                    onChange={e => setEstimate({ ...estimate, paymentTerms: e.target.value })}
                    fullWidth
                    multiline
                    rows={2}
                  />
                  <TextField
                    label="Примечания"
                    value={estimate.notes || ''}
                    onChange={e => setEstimate({ ...estimate, notes: e.target.value })}
                    fullWidth
                    multiline
                    rows={3}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>

          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={async () => {
                if (!currentUser) return;
                try {
                  setSaving(true);
                  await updateEstimate(currentUser.uid, estimate.id, estimate);
                  setNotification({
                    open: true,
                    message: 'Настройки сохранены',
                    severity: 'success'
                  });
                } catch (error) {
                  console.error('Error saving settings:', error);
                  setNotification({
                    open: true,
                    message: 'Ошибка при сохранении',
                    severity: 'error'
                  });
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              Сохранить настройки
            </Button>
          </Box>
        </Box>
      )}

      {/* Диалог редактирования элемента */}
      <Dialog
        open={itemDialog.open}
        onClose={() => setItemDialog({ open: false, item: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {itemDialog.item?.id && estimate.items.find(i => i.id === itemDialog.item?.id) 
            ? 'Редактировать элемент' 
            : 'Добавить элемент'}
        </DialogTitle>
        <DialogContent>
          <EstimateItemEditor
            item={itemDialog.item}
            products={products}
            defaultRate={estimate.defaultRate || 1000}
            currency={estimate.currency}
            onSave={handleSaveItem}
            onCancel={() => setItemDialog({ open: false, item: null })}
          />
        </DialogContent>
      </Dialog>

      {/* Диалог версионирования */}
      <Dialog
        open={versionDialog}
        onClose={() => setVersionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Создать новую версию</DialogTitle>
        <DialogContent>
          <TextField
            label="Описание изменений"
            value={versionNotes}
            onChange={e => setVersionNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialog(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleCreateVersion}
            disabled={!versionNotes}
          >
            Создать версию
          </Button>
        </DialogActions>
      </Dialog>

      {/* Шаблоны эстимейтов */}
      <EstimateTemplates
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onSelectTemplate={(template) => {
          if (estimate) {
            // Применяем шаблон к текущему эстимейту
            const newEstimate = {
              ...estimate,
              items: template.items
            };
            const subtotal = template.items.reduce((sum, item) => sum + item.total, 0);
            setEstimate({
              ...newEstimate,
              subtotal: subtotal,
              total: subtotal * (1 - (estimate.discountRate || 0) / 100) * (1 + (estimate.taxRate || 0) / 100)
            });
            setNotification({
              open: true,
              message: `Применен шаблон "${template.name}"`,
              severity: 'success'
            });
          }
        }}
        currentEstimate={estimate ? {
          name: estimate.name,
          items: estimate.items || []
        } : undefined}
        onSaveAsTemplate={(template) => {
          // Здесь можно добавить сохранение шаблона в Firebase
          setNotification({
            open: true,
            message: `Шаблон "${template.name}" сохранен`,
            severity: 'success'
          });
        }}
      />

      {/* Менеджер версий */}
      <EstimateVersionManager
        open={versionManagerOpen}
        onClose={() => setVersionManagerOpen(false)}
        currentVersion={versions[0] || {
          id: 'v-current',
          version: estimate?.version || '1.0',
          status: estimate?.status as any || 'draft',
          createdAt: new Date(),
          createdBy: currentUser?.email || 'Текущий пользователь',
          notes: 'Текущая версия',
          items: estimate?.items || [],
          subtotal: estimate?.subtotal || 0,
          total: estimate?.total || 0,
          taxRate: estimate?.taxRate,
          discountRate: estimate?.discountRate
        }}
        versions={versions}
        onCreateVersion={(notes) => {
          if (estimate) {
            const newVersion: EstimateVersion = {
              id: `v-${Date.now()}`,
              version: `${parseFloat(estimate.version || '1.0') + 0.1}`,
              status: 'draft',
              createdAt: new Date(),
              createdBy: currentUser?.email || 'Текущий пользователь',
              notes,
              items: estimate.items || [],
              subtotal: estimate.subtotal || 0,
              total: estimate.total || 0,
              taxRate: estimate.taxRate,
              discountRate: estimate.discountRate
            };
            
            setVersions([newVersion, ...versions]);
            setEstimate({
              ...estimate,
              version: newVersion.version
            });
            
            setNotification({
              open: true,
              message: `Создана версия ${newVersion.version}`,
              severity: 'success'
            });
          }
        }}
        onRestoreVersion={(version) => {
          if (estimate) {
            setEstimate({
              ...estimate,
              items: version.items,
              subtotal: version.subtotal,
              total: version.total,
              version: version.version
            });
            
            setNotification({
              open: true,
              message: `Восстановлена версия ${version.version}`,
              severity: 'success'
            });
          }
        }}
        onCompareVersions={(v1, v2) => {
          setVersionsToCompare([v1, v2]);
          setVersionComparisonOpen(true);
        }}
      />

      {/* Сравнение версий */}
      {versionsToCompare[0] && versionsToCompare[1] && (
        <EstimateVersionComparison
          open={versionComparisonOpen}
          onClose={() => setVersionComparisonOpen(false)}
          version1={versionsToCompare[0]}
          version2={versionsToCompare[1]}
          onApplyVersion={(version) => {
            if (estimate) {
              setEstimate({
                ...estimate,
                items: version.items,
                subtotal: version.subtotal,
                total: version.total,
                version: version.version
              });
              
              setNotification({
                open: true,
                message: `Применена версия ${version.version}`,
                severity: 'success'
              });
              setVersionComparisonOpen(false);
            }
          }}
        />
      )}

      {/* Диалог для шаринга */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Поделиться эстимейтом</DialogTitle>
        <DialogContent>
          {shareLink ? (
            <Box>
              <Typography gutterBottom>Ваша публичная ссылка:</Typography>
              <TextField
                fullWidth
                value={shareLink}
                InputProps={{
                  readOnly: true,
                }}
                variant="outlined"
              />
              <Button 
                sx={{ mt: 2 }} 
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  setNotification({ open: true, message: 'Ссылка скопирована!', severity: 'success' });
                }}
              >
                Копировать
              </Button>
            </Box>
          ) : (
            <Box textAlign="center">
              <Typography gutterBottom>Создать публичную ссылку для этого эстимейта?</Typography>
              <Button
                variant="contained"
                onClick={handleCreateShareLink}
                disabled={generatingLink}
              >
                {generatingLink ? <CircularProgress size={24} /> : 'Создать ссылку'}
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      {/* Уведомления */}
      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification({ ...notification, open: false })}
      />
    </Box>
  );
};

export default EstimateConstructorPage;
/**
 * Компонент управления номенклатурой (товары, услуги, комплекты)
 * Поддерживает CRUD операции, поиск, фильтрацию и импорт/экспорт
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Tabs,
  Tab,
  Badge,
  Menu,
  MenuList,
  ListItemIcon,
  ListItemText,
  Divider,
  Fab,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  Publish as ImportIcon,
  ContentCopy as DuplicateIcon,
  MoreVert as MoreIcon,
  Inventory2 as ProductIcon,
  Build as ServiceIcon,
  Category as BundleIcon,
  Visibility as ViewIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  getItems,
  deleteItem,
  bulkUpdateItemStatus,
  duplicateItem,
  exportItemsToCSV,
  getItemsStatistics
} from '../../api/itemApi';
import {
  Item,
  ItemType,
  ItemCategory,
  ItemStatus,
  ItemFilters,
  isProductItem,
  isServiceItem,
  isBundleItem,
  getUnitDisplayName
} from '../../types/item.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ItemsManager: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  
  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ItemFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Пагинация
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  
  // Выделенные элементы
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Диалоги
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [bulkActionMenuAnchor, setBulkActionMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Статистика
  const [stats, setStats] = useState({
    totalItems: 0,
    byType: {} as Record<ItemType, number>,
    stockableProducts: 0,
    schedulableServices: 0,
    bundles: 0
  });

  const itemTypes: ItemType[] = ['product', 'service', 'bundle'];
  const itemTypeNames = {
    product: 'Товары',
    service: 'Услуги', 
    bundle: 'Комплекты'
  };

  useEffect(() => {
    loadItems();
    loadStatistics();
  }, [page, rowsPerPage, filters, searchQuery]);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentFilters: ItemFilters = {
        ...filters,
        searchQuery: searchQuery || undefined
      };
      
      // Фильтр по типу в зависимости от активной вкладки
      if (selectedTab > 0) {
        currentFilters.type = [itemTypes[selectedTab - 1]];
      }
      
      const result = await getItems(
        currentFilters,
        { field: 'name', direction: 'asc' },
        rowsPerPage
      );
      
      setItems(result.items);
      setTotalItems(result.items.length);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const statistics = await getItemsStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
    setPage(0);
    setSelectedItems([]);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const handleDeleteClick = (itemId: string) => {
    setItemToDelete(itemId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    try {
      await deleteItem(itemToDelete);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      await loadItems();
      await loadStatistics();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка удаления');
    }
  };

  const handleDuplicate = async (itemId: string) => {
    try {
      await duplicateItem(itemId);
      await loadItems();
      await loadStatistics();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка дублирования');
    }
  };

  const handleBulkAction = async (action: 'archive' | 'unarchive' | 'delete') => {
    if (selectedItems.length === 0) return;
    
    try {
      switch (action) {
        case 'archive':
          await bulkUpdateItemStatus(selectedItems, 'archived');
          break;
        case 'unarchive':
          await bulkUpdateItemStatus(selectedItems, 'active');
          break;
        case 'delete':
          for (const itemId of selectedItems) {
            await deleteItem(itemId);
          }
          break;
      }
      
      setSelectedItems([]);
      setBulkActionMenuAnchor(null);
      await loadItems();
      await loadStatistics();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка выполнения операции');
    }
  };

  const handleExport = async () => {
    try {
      const csvData = await exportItemsToCSV(filters);
      
      // Создаем и скачиваем файл
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `nomenclature_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка экспорта');
    }
  };

  const getItemTypeIcon = (type: ItemType) => {
    switch (type) {
      case 'product': return <ProductIcon fontSize="small" />;
      case 'service': return <ServiceIcon fontSize="small" />;
      case 'bundle': return <BundleIcon fontSize="small" />;
    }
  };

  const getStatusColor = (status: ItemStatus): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'info';
      case 'discontinued': return 'warning';
      case 'obsolete': return 'error';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const renderItemActions = (item: Item) => (
    <Box display="flex" gap={0.5}>
      <IconButton 
        size="small" 
        onClick={() => navigate(`/warehouse/items/${item.id}`)}
        title="Просмотр"
      >
        <ViewIcon fontSize="small" />
      </IconButton>
      <IconButton 
        size="small" 
        onClick={() => navigate(`/warehouse/items/${item.id}/edit`)}
        title="Редактировать"
      >
        <EditIcon fontSize="small" />
      </IconButton>
      <IconButton 
        size="small" 
        onClick={() => handleDuplicate(item.id)}
        title="Дублировать"
      >
        <DuplicateIcon fontSize="small" />
      </IconButton>
      <IconButton 
        size="small" 
        onClick={() => handleDeleteClick(item.id)}
        title="Удалить"
        color="error"
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  const filteredItems = items.filter(item => {
    if (selectedTab === 0) return true;
    return item.type === itemTypes[selectedTab - 1];
  });

  return (
    <Box p={3}>
      {/* Заголовок и действия */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Номенклатура
        </Typography>
        
        <Box display="flex" gap={1}>
          <Button
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? "contained" : "outlined"}
          >
            Фильтры
          </Button>
          
          <Button
            startIcon={<ExportIcon />}
            onClick={handleExport}
            variant="outlined"
          >
            Экспорт
          </Button>
          
          <Button
            startIcon={<ImportIcon />}
            onClick={() => navigate('/warehouse/items/import')}
            variant="outlined"
          >
            Импорт
          </Button>
          
          {selectedItems.length > 0 && (
            <Button
              startIcon={<MoreIcon />}
              onClick={(e) => setBulkActionMenuAnchor(e.currentTarget)}
              variant="outlined"
            >
              Действия ({selectedItems.length})
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Фильтры */}
      {showFilters && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Категория</InputLabel>
                  <Select
                    value={filters.category?.[0] || ''}
                    onChange={(e) => setFilters({
                      ...filters,
                      category: e.target.value ? [e.target.value as ItemCategory] : undefined
                    })}
                  >
                    <MenuItem value="">Все категории</MenuItem>
                    <MenuItem value="building_materials">Строительные материалы</MenuItem>
                    <MenuItem value="electrical_supplies">Электрика</MenuItem>
                    <MenuItem value="plumbing_supplies">Сантехника</MenuItem>
                    <MenuItem value="tools">Инструменты</MenuItem>
                    <MenuItem value="labor_general">Общие работы</MenuItem>
                    <MenuItem value="consulting">Консультации</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Статус</InputLabel>
                  <Select
                    value={filters.status?.[0] || ''}
                    onChange={(e) => setFilters({
                      ...filters,
                      status: e.target.value ? [e.target.value as ItemStatus] : undefined
                    })}
                  >
                    <MenuItem value="">Все статусы</MenuItem>
                    <MenuItem value="active">Активные</MenuItem>
                    <MenuItem value="draft">Черновики</MenuItem>
                    <MenuItem value="archived">Архивные</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Поиск"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  placeholder="Код, название, описание..."
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setFilters({});
                    setSearchQuery('');
                  }}
                >
                  Сбросить
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Вкладки по типам */}
      <Tabs value={selectedTab} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab 
          label={
            <Badge badgeContent={stats.totalItems} color="primary">
              Все
            </Badge>
          }
        />
        <Tab 
          label={
            <Badge badgeContent={stats.byType['product'] || 0} color="primary">
              Товары
            </Badge>
          } 
        />
        <Tab 
          label={
            <Badge badgeContent={stats.byType['service'] || 0} color="primary">
              Услуги
            </Badge>
          }
        />
        <Tab 
          label={
            <Badge badgeContent={stats.byType['bundle'] || 0} color="primary">
              Комплекты
            </Badge>
          }
        />
      </Tabs>

      {/* Таблица */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Тип</TableCell>
              <TableCell>Код</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Категория</TableCell>
              <TableCell>Единица</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Нет данных
                </TableCell>
              </TableRow>
            ) : (
              filteredItems
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getItemTypeIcon(item.type)}
                        {itemTypeNames[item.type]}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {item.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {item.name}
                      </Typography>
                      {item.description && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {item.description.substring(0, 100)}
                          {item.description.length > 100 && '...'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.category.replace(/_/g, ' ')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getUnitDisplayName(item.baseUnit)}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.status}
                        color={getStatusColor(item.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {renderItemActions(item)}
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        
        <TablePagination
          component="div"
          count={filteredItems.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Строк на страницу:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
        />
      </TableContainer>

      {/* FAB для создания */}
      <Fab 
        color="primary" 
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => navigate('/warehouse/items/new')}
      >
        <AddIcon />
      </Fab>

      {/* Диалог удаления */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Подтвердите удаление</DialogTitle>
        <DialogContent>
          Вы действительно хотите удалить этот элемент номенклатуры? 
          Это действие необратимо.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Меню массовых действий */}
      <Menu
        anchorEl={bulkActionMenuAnchor}
        open={Boolean(bulkActionMenuAnchor)}
        onClose={() => setBulkActionMenuAnchor(null)}
      >
        <MenuList>
          <MenuItem onClick={() => handleBulkAction('archive')}>
            <ListItemIcon><ArchiveIcon /></ListItemIcon>
            <ListItemText>Архивировать</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleBulkAction('unarchive')}>
            <ListItemIcon><UnarchiveIcon /></ListItemIcon>
            <ListItemText>Восстановить</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleBulkAction('delete')}>
            <ListItemIcon><DeleteIcon /></ListItemIcon>
            <ListItemText>Удалить</ListItemText>
          </MenuItem>
        </MenuList>
      </Menu>
    </Box>
  );
};

export default ItemsManager;
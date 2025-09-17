/**
 * ItemList - Список элементов номенклатуры с поиском и фильтрами
 * Поддерживает пагинацию, сортировку и массовые операции
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  IconButton,
  Chip,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  InputAdornment,
  Menu,
  ListItemIcon,
  ListItemText,
  Checkbox,
  FormControlLabel,
  Alert,
  Tooltip,
  Paper,
  Stack,
  Fab,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  MoreVert as MoreIcon,
  Inventory as ProductIcon,
  Build as ServiceIcon,
  Category as BundleIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { 
  Item, 
  ItemType, 
  ItemCategory, 
  ItemStatus,
  ItemFilters,
  ItemSortOptions,
  isProductItem,
  isServiceItem,
  isBundleItem
} from '../../../types/item.types';
import { getItems, deleteItem, duplicateItem } from '../../../api/itemApi';
import { useAuth } from '../../../auth/AuthContext';
import LoadingSpinner from '../../common/LoadingSpinner';

interface ItemListProps {
  onEdit?: (item: Item) => void;
  onView?: (item: Item) => void;
  onSelect?: (item: Item) => void; // Для режима выбора
  selectionMode?: boolean;
  selectedItems?: string[];
  filters?: Partial<ItemFilters>;
  showActions?: boolean;
}

const ItemList: React.FC<ItemListProps> = ({
  onEdit,
  onView,
  onSelect,
  selectionMode = false,
  selectedItems = [],
  filters: externalFilters = {},
  showActions = true
}) => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Пагинация
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Фильтры и поиск
  const [filters, setFilters] = useState<ItemFilters>({
    searchQuery: '',
    type: [],
    category: [],
    status: ['active'],
    ...externalFilters
  });
  const [sortOptions, setSortOptions] = useState<ItemSortOptions>({
    field: 'name',
    direction: 'asc'
  });
  
  // UI состояние
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItemForMenu, setSelectedItemForMenu] = useState<Item | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Загрузка данных
  const loadItems = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await getItems(filters, sortOptions, rowsPerPage);
      
      setItems(result.items);
      setHasMore(result.hasMore);
      setTotalCount(result.items.length); // В реальности нужен отдельный запрос для подсчета
      
    } catch (err) {
      console.error('Error loading items:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [currentUser, filters, sortOptions, rowsPerPage]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Обработчики событий
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
    setPage(0);
  };

  const handleFilterChange = (newFilters: Partial<ItemFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(0);
  };

  const handleSort = (field: ItemSortOptions['field']) => {
    setSortOptions(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: Item) => {
    setAnchorEl(event.currentTarget);
    setSelectedItemForMenu(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItemForMenu(null);
  };

  const handleDelete = async (item: Item) => {
    if (!window.confirm(`Удалить "${item.name}"?`)) return;
    
    try {
      await deleteItem(item.id);
      await loadItems(); // Перезагрузить список
      handleMenuClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const handleDuplicate = async (item: Item) => {
    try {
      await duplicateItem(item.id);
      await loadItems(); // Перезагрузить список
      handleMenuClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка дублирования');
    }
  };

  const getItemTypeIcon = (item: Item) => {
    if (isProductItem(item)) return <ProductIcon color="primary" />;
    if (isServiceItem(item)) return <ServiceIcon color="secondary" />;
    if (isBundleItem(item)) return <BundleIcon color="success" />;
    return null;
  };

  const getItemTypeLabel = (item: Item) => {
    if (isProductItem(item)) return 'Товар';
    if (isServiceItem(item)) return 'Услуга';
    if (isBundleItem(item)) return 'Комплект';
    return 'Неизвестно';
  };

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case 'active': return 'success';
      case 'draft': return 'default';
      case 'discontinued': return 'warning';
      case 'obsolete': return 'error';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const renderFilters = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Поиск по коду, названию..."
              value={filters.searchQuery || ''}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: filters.searchQuery && (
                  <InputAdornment position="end">
                    <IconButton onClick={() => handleSearch('')} size="small">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Тип</InputLabel>
              <Select
                multiple
                value={filters.type || []}
                onChange={(e) => handleFilterChange({ type: e.target.value as ItemType[] })}
                input={<OutlinedInput label="Тип" />}
              >
                <MenuItem value="product">Товары</MenuItem>
                <MenuItem value="service">Услуги</MenuItem>
                <MenuItem value="bundle">Комплекты</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                multiple
                value={filters.status || []}
                onChange={(e) => handleFilterChange({ status: e.target.value as ItemStatus[] })}
                input={<OutlinedInput label="Статус" />}
              >
                <MenuItem value="active">Активные</MenuItem>
                <MenuItem value="draft">Черновики</MenuItem>
                <MenuItem value="discontinued">Сняты с производства</MenuItem>
                <MenuItem value="archived">В архиве</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => setFilters({
                  searchQuery: '',
                  type: [],
                  category: [],
                  status: ['active']
                })}
                startIcon={<ClearIcon />}
              >
                Очистить
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowFilters(!showFilters)}
                startIcon={<FilterIcon />}
              >
                Фильтры
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  if (loading && items.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {renderFilters()}
      
      <Card>
        <CardHeader 
          title={`Номенклатура (${items.length})`}
          action={
            showActions && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => onEdit?.(undefined as any)}
              >
                Добавить
              </Button>
            )
          }
        />
        
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {selectionMode && <TableCell padding="checkbox" />}
                  <TableCell>Тип</TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleSort('code')}
                  >
                    Код
                  </TableCell>
                  <TableCell 
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleSort('name')}
                  >
                    Название
                  </TableCell>
                  <TableCell>Категория</TableCell>
                  <TableCell>Единица</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Остаток</TableCell>
                  {showActions && <TableCell align="right">Действия</TableCell>}
                </TableRow>
              </TableHead>
              
              <TableBody>
                {items.map((item) => (
                  <TableRow 
                    key={item.id}
                    hover
                    onClick={() => selectionMode ? onSelect?.(item) : onView?.(item)}
                    sx={{ cursor: selectionMode || onView ? 'pointer' : 'default' }}
                  >
                    {selectionMode && (
                      <TableCell padding="checkbox">
                        <Checkbox 
                          checked={selectedItems.includes(item.id)}
                          onChange={() => onSelect?.(item)}
                        />
                      </TableCell>
                    )}
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getItemTypeIcon(item)}
                        <Typography variant="caption">
                          {getItemTypeLabel(item)}
                        </Typography>
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
                        <Typography variant="caption" color="textSecondary" display="block">
                          {item.description}
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="caption">
                        {item.category}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="caption">
                        {item.baseUnit}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip 
                        label={item.status} 
                        color={getStatusColor(item.status)}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {isProductItem(item) ? '-' : 'Н/Д'}
                      </Typography>
                    </TableCell>
                    
                    {showActions && (
                      <TableCell align="right">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuOpen(e, item);
                          }}
                          size="small"
                        >
                          <MoreIcon />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                
                {items.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={showActions ? 9 : 8} align="center" sx={{ py: 8 }}>
                      <Typography variant="body2" color="textSecondary">
                        {filters.searchQuery || filters.type?.length || filters.category?.length
                          ? 'Ничего не найдено по заданным фильтрам'
                          : 'Номенклатура пуста. Добавьте первый элемент.'
                        }
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {items.length > 0 && (
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Строк на странице:"
              labelDisplayedRows={({ from, to, count }) => 
                `${from}-${to} из ${count !== -1 ? count : `более ${to}`}`
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Меню действий */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          onView?.(selectedItemForMenu!);
          handleMenuClose();
        }}>
          <ListItemIcon><ViewIcon /></ListItemIcon>
          <ListItemText>Просмотр</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          onEdit?.(selectedItemForMenu!);
          handleMenuClose();
        }}>
          <ListItemIcon><EditIcon /></ListItemIcon>
          <ListItemText>Редактировать</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleDuplicate(selectedItemForMenu!)}>
          <ListItemIcon><DuplicateIcon /></ListItemIcon>
          <ListItemText>Дублировать</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleDelete(selectedItemForMenu!)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
          <ListItemText>Удалить</ListItemText>
        </MenuItem>
      </Menu>

      {/* FAB для добавления (мобильная версия) */}
      {showActions && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => onEdit?.(undefined as any)}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
};

export default ItemList;

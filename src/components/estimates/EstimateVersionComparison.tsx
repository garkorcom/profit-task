import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  SwapHoriz as SwapIcon,
  TrendingUp as IncreaseIcon,
  TrendingDown as DecreaseIcon,
  CompareArrows as CompareIcon
} from '@mui/icons-material';
import { EstimateItem } from '../../legacy/api/estimateApi';
import { EstimateVersion } from './EstimateVersionManager';

interface EstimateVersionComparisonProps {
  open: boolean;
  onClose: () => void;
  version1: EstimateVersion;
  version2: EstimateVersion;
  onApplyVersion?: (version: EstimateVersion) => void;
}

interface ItemComparison {
  id: string;
  name: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  oldValue?: EstimateItem;
  newValue?: EstimateItem;
  differences?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export const EstimateVersionComparison: React.FC<EstimateVersionComparisonProps> = ({
  open,
  onClose,
  version1,
  version2,
  onApplyVersion
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [swapped, setSwapped] = useState(false);

  // Определяем какая версия старше
  const [olderVersion, newerVersion] = swapped 
    ? [version2, version1]
    : version1.createdAt < version2.createdAt 
      ? [version1, version2]
      : [version2, version1];

  const compareItems = (): ItemComparison[] => {
    const comparisons: ItemComparison[] = [];
    const oldItemsMap = new Map(olderVersion.items.map(item => [item.id, item]));
    const newItemsMap = new Map(newerVersion.items.map(item => [item.id, item]));

    // Проверяем все элементы из новой версии
    newItemsMap.forEach((newItem, id) => {
      const oldItem = oldItemsMap.get(id);
      
      if (!oldItem) {
        // Элемент добавлен
        comparisons.push({
          id,
          name: newItem.name,
          status: 'added',
          newValue: newItem
        });
      } else {
        // Проверяем изменения
        const differences: { field: string; oldValue: any; newValue: any }[] = [];
        
        // Сравниваем основные поля
        const fieldsToCompare = [
          'name', 'description', 'quantity', 'unit', 'rate',
          'estimateOptimistic', 'estimateRealistic', 'estimatePessimistic'
        ];
        
        fieldsToCompare.forEach(field => {
          if ((oldItem as any)[field] !== (newItem as any)[field]) {
            differences.push({
              field,
              oldValue: (oldItem as any)[field],
              newValue: (newItem as any)[field]
            });
          }
        });
        
        if (differences.length > 0) {
          comparisons.push({
            id,
            name: newItem.name,
            status: 'modified',
            oldValue: oldItem,
            newValue: newItem,
            differences
          });
        } else {
          comparisons.push({
            id,
            name: newItem.name,
            status: 'unchanged',
            oldValue: oldItem,
            newValue: newItem
          });
        }
      }
    });

    // Проверяем удаленные элементы
    oldItemsMap.forEach((oldItem, id) => {
      if (!newItemsMap.has(id)) {
        comparisons.push({
          id,
          name: oldItem.name,
          status: 'removed',
          oldValue: oldItem
        });
      }
    });

    return comparisons;
  };

  const comparisons = compareItems();
  const added = comparisons.filter(c => c.status === 'added');
  const modified = comparisons.filter(c => c.status === 'modified');
  const removed = comparisons.filter(c => c.status === 'removed');

  const getChangeIcon = (status: string) => {
    switch (status) {
      case 'added':
        return <AddIcon color="success" />;
      case 'removed':
        return <RemoveIcon color="error" />;
      case 'modified':
        return <EditIcon color="warning" />;
      default:
        return null;
    }
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      name: 'Название',
      description: 'Описание',
      quantity: 'Количество',
      unit: 'Единица',
      rate: 'Ставка',
      estimateOptimistic: 'Оптимистичная оценка',
      estimateRealistic: 'Реалистичная оценка',
      estimatePessimistic: 'Пессимистичная оценка'
    };
    return labels[field] || field;
  };

  const formatValue = (value: any, field: string): string => {
    if (value === undefined || value === null) return '-';
    if (field === 'rate') return `${value} ₽`;
    if (field.includes('estimate')) return `${value} ч`;
    return String(value);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">Сравнение версий</Typography>
          <IconButton onClick={() => setSwapped(!swapped)} size="small">
            <Tooltip title="Поменять версии местами">
              <SwapIcon />
            </Tooltip>
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Заголовок сравнения */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={5}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {olderVersion.version}
                  <Chip label="Старая" size="small" sx={{ ml: 1 }} />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(olderVersion.createdAt).toLocaleString('ru-RU')}
                </Typography>
                <Typography variant="body2">
                  Автор: {olderVersion.createdBy}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6" color="primary">
                  {olderVersion.total.toFixed(2)} ₽
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={2}>
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CompareIcon fontSize="large" color="action" />
            </Box>
          </Grid>
          
          <Grid size={5}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {newerVersion.version}
                  <Chip label="Новая" size="small" color="primary" sx={{ ml: 1 }} />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(newerVersion.createdAt).toLocaleString('ru-RU')}
                </Typography>
                <Typography variant="body2">
                  Автор: {newerVersion.createdBy}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6" color="primary">
                  {newerVersion.total.toFixed(2)} ₽
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Сводка изменений */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={3}>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <AddIcon color="success" />
                  <Typography variant="h6">{added.length}</Typography>
                </Box>
                <Typography variant="body2">Добавлено</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={3}>
            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <EditIcon color="warning" />
                  <Typography variant="h6">{modified.length}</Typography>
                </Box>
                <Typography variant="body2">Изменено</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={3}>
            <Card sx={{ bgcolor: 'error.light' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <RemoveIcon color="error" />
                  <Typography variant="h6">{removed.length}</Typography>
                </Box>
                <Typography variant="body2">Удалено</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  {newerVersion.total > olderVersion.total ? (
                    <IncreaseIcon color="success" />
                  ) : (
                    <DecreaseIcon color="error" />
                  )}
                  <Typography variant="h6">
                    {Math.abs(newerVersion.total - olderVersion.total).toFixed(2)} ₽
                  </Typography>
                </Box>
                <Typography variant="body2">
                  {newerVersion.total > olderVersion.total ? 'Увеличение' : 'Уменьшение'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Табы с детальными изменениями */}
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label={`Все изменения (${comparisons.length})`} />
          <Tab label={`Добавлено (${added.length})`} />
          <Tab label={`Изменено (${modified.length})`} />
          <Tab label={`Удалено (${removed.length})`} />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          {activeTab === 0 && (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Статус</TableCell>
                    <TableCell>Элемент</TableCell>
                    <TableCell>Старое значение</TableCell>
                    <TableCell>Новое значение</TableCell>
                    <TableCell align="right">Изменение суммы</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {comparisons
                    .filter(c => c.status !== 'unchanged')
                    .map(comparison => (
                      <TableRow key={comparison.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getChangeIcon(comparison.status)}
                            <Chip 
                              label={
                                comparison.status === 'added' ? 'Добавлен' :
                                comparison.status === 'removed' ? 'Удален' :
                                comparison.status === 'modified' ? 'Изменен' : ''
                              }
                              size="small"
                              color={
                                comparison.status === 'added' ? 'success' :
                                comparison.status === 'removed' ? 'error' :
                                'warning'
                              }
                              variant="outlined"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>{comparison.name}</TableCell>
                        <TableCell>
                          {comparison.oldValue && (
                            <Typography variant="body2">
                              {comparison.oldValue.quantity || 0} {comparison.oldValue.unit || ''} × {comparison.oldValue.rate || 0} ₽
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {comparison.newValue && (
                            <Typography variant="body2">
                              {comparison.newValue.quantity || 0} {comparison.newValue.unit || ''} × {comparison.newValue.rate || 0} ₽
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {comparison.status === 'added' && comparison.newValue && (
                            <Typography color="success.main">
                              +{((comparison.newValue.quantity || 0) * (comparison.newValue.rate || 0)).toFixed(2)} ₽
                            </Typography>
                          )}
                          {comparison.status === 'removed' && comparison.oldValue && (
                            <Typography color="error.main">
                              -{((comparison.oldValue.quantity || 0) * (comparison.oldValue.rate || 0)).toFixed(2)} ₽
                            </Typography>
                          )}
                          {comparison.status === 'modified' && comparison.oldValue && comparison.newValue && (
                            <Typography color={
                              ((comparison.newValue.quantity || 0) * (comparison.newValue.rate || 0)) > 
                              ((comparison.oldValue.quantity || 0) * (comparison.oldValue.rate || 0)) 
                                ? 'success.main' : 'error.main'
                            }>
                              {(((comparison.newValue.quantity || 0) * (comparison.newValue.rate || 0)) - 
                                ((comparison.oldValue.quantity || 0) * (comparison.oldValue.rate || 0)) > 0 ? '+' : '')}
                              {(((comparison.newValue.quantity || 0) * (comparison.newValue.rate || 0)) - 
                                ((comparison.oldValue.quantity || 0) * (comparison.oldValue.rate || 0))).toFixed(2)} ₽
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {activeTab === 1 && (
            <List>
              {added.map(item => (
                <ListItem key={item.id}>
                  <ListItemIcon>
                    <AddIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.name}
                    secondary={item.newValue && `${item.newValue.quantity || 0} ${item.newValue.unit || ''} × ${item.newValue.rate || 0} ₽`}
                  />
                </ListItem>
              ))}
              {added.length === 0 && (
                <Alert severity="info">Нет добавленных элементов</Alert>
              )}
            </List>
          )}

          {activeTab === 2 && (
            <List>
              {modified.map(item => (
                <Box key={item.id}>
                  <ListItem>
                    <ListItemIcon>
                      <EditIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.name}
                      secondary={
                        <Box>
                          {item.differences?.map((diff, index) => (
                            <Typography key={index} variant="caption" display="block">
                              {getFieldLabel(diff.field)}: {formatValue(diff.oldValue, diff.field)} → {formatValue(diff.newValue, diff.field)}
                            </Typography>
                          ))}
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider />
                </Box>
              ))}
              {modified.length === 0 && (
                <Alert severity="info">Нет измененных элементов</Alert>
              )}
            </List>
          )}

          {activeTab === 3 && (
            <List>
              {removed.map(item => (
                <ListItem key={item.id}>
                  <ListItemIcon>
                    <RemoveIcon color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.name}
                    secondary={item.oldValue && `${item.oldValue.quantity || 0} ${item.oldValue.unit || ''} × ${item.oldValue.rate || 0} ₽`}
                  />
                </ListItem>
              ))}
              {removed.length === 0 && (
                <Alert severity="info">Нет удаленных элементов</Alert>
              )}
            </List>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        {onApplyVersion && (
          <>
            <Button
              variant="outlined"
              onClick={() => onApplyVersion(olderVersion)}
            >
              Применить {olderVersion.version}
            </Button>
            <Button
              variant="outlined"
              onClick={() => onApplyVersion(newerVersion)}
            >
              Применить {newerVersion.version}
            </Button>
          </>
        )}
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
};

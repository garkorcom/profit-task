/**
 * Главная страница управления складами
 * Содержит навигацию по всем разделам складской системы
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton
} from '@mui/material';
import {
  Add as AddIcon,
  Inventory as InventoryIcon,
  Business as WarehouseIcon,
  Assignment as TransactionIcon,
  BookmarkBorder as ReservationIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  LocalShipping as DeliveryIcon,
  Search as SearchIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getWarehouses } from '../../api/warehouseApi';
import { getStockBalances } from '../../api/warehouseApi';
import { Warehouse, StockBalance } from '../../types/warehouse.types';

interface WarehouseStats {
  totalWarehouses: number;
  activeWarehouses: number;
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  negativeStockItems: number;
  expiringSoonItems: number;
  reservedItems: number;
}

interface NavigationItem {
  title: string;
  description: string;
  icon: React.ReactElement;
  path: string;
  badge?: number;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

const WarehouseHub: React.FC = () => {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stats, setStats] = useState<WarehouseStats>({
    totalWarehouses: 0,
    activeWarehouses: 0,
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    negativeStockItems: 0,
    expiringSoonItems: 0,
    reservedItems: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWarehouseData();
  }, []);

  const loadWarehouseData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем склады
      const warehousesData = await getWarehouses();
      setWarehouses(warehousesData);

      // Загружаем остатки для статистики
      const stockBalances = await getStockBalances();
      
      const newStats: WarehouseStats = {
        totalWarehouses: warehousesData.length,
        activeWarehouses: warehousesData.filter(w => w.isActive).length,
        totalItems: stockBalances.length,
        totalValue: stockBalances.reduce((sum, balance) => sum + balance.totalValue, 0),
        lowStockItems: stockBalances.filter(balance => balance.totalQuantity <= 5).length,
        negativeStockItems: stockBalances.filter(balance => balance.totalQuantity < 0).length,
        expiringSoonItems: stockBalances.filter(balance => balance.nearExpiryCount && balance.nearExpiryCount > 0).length,
        reservedItems: stockBalances.filter(balance => balance.reservedQuantity > 0).length
      };

      setStats(newStats);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const quickActions = [
    {
      title: 'Поступление товара',
      description: 'Оформить приход материалов',
      icon: <TrendingUpIcon />,
      color: '#4caf50',
      path: '/warehouse/transactions/receipt'
    },
    {
      title: 'Отпуск материалов',
      description: 'Выдать материалы в работу',
      icon: <TrendingDownIcon />,
      color: '#ff9800',
      path: '/warehouse/transactions/issue'
    },
    {
      title: 'Поиск товаров',
      description: 'Найти товар по коду или названию',
      icon: <SearchIcon />,
      color: '#2196f3',
      path: '/warehouse/search'
    },
    {
      title: 'Инвентаризация',
      description: 'Провести инвентаризацию',
      icon: <AssessmentIcon />,
      color: '#9c27b0',
      path: '/warehouse/inventory'
    }
  ];

  const navigationSections = [
    {
      title: 'Управление складами',
      items: [
        {
          title: 'Склады',
          description: 'Управление складскими помещениями',
          icon: <WarehouseIcon />,
          path: '/warehouse/warehouses',
          badge: stats.totalWarehouses
        },
        {
          title: 'Остатки',
          description: 'Просмотр складских остатков',
          icon: <InventoryIcon />,
          path: '/warehouse/stock',
          badge: stats.totalItems
        },
        {
          title: 'Резервирования',
          description: 'Управление резервами',
          icon: <ReservationIcon />,
          path: '/warehouse/reservations',
          badge: stats.reservedItems
        }
      ]
    },
    {
      title: 'Операции',
      items: [
        {
          title: 'Транзакции',
          description: 'История движения товаров',
          icon: <TransactionIcon />,
          path: '/warehouse/transactions'
        },
        {
          title: 'Отчеты',
          description: 'Аналитика и отчетность',
          icon: <ReportsIcon />,
          path: '/warehouse/reports'
        },
        {
          title: 'Интеграция со сметами',
          description: 'Связь с проектами и сметами',
          icon: <DeliveryIcon />,
          path: '/warehouse/integration'
        }
      ]
    }
  ];

  const alertCards = [
    {
      title: 'Отрицательные остатки',
      count: stats.negativeStockItems,
      severity: 'error' as const,
      icon: <WarningIcon />,
      description: 'Товары с отрицательным балансом',
      actionText: 'Исправить',
      actionPath: '/warehouse/stock?filter=negative'
    },
    {
      title: 'Заканчиваются',
      count: stats.lowStockItems,
      severity: 'warning' as const,
      icon: <InfoIcon />,
      description: 'Товары с низким остатком',
      actionText: 'Заказать',
      actionPath: '/warehouse/stock?filter=low'
    },
    {
      title: 'Истекает срок',
      count: stats.expiringSoonItems,
      severity: 'info' as const,
      icon: <InfoIcon />,
      description: 'Товары близкие к истечению',
      actionText: 'Проверить',
      actionPath: '/warehouse/stock?filter=expiring'
    }
  ].filter(card => card.count > 0);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Загрузка...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Заголовок */}
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Управление складами
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<SettingsIcon />}
          onClick={() => handleNavigate('/warehouse/settings')}
        >
          Настройки
        </Button>
      </Box>

      {/* Ошибка */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Статистика */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Всего складов
              </Typography>
              <Typography variant="h4" component="div">
                {stats.totalWarehouses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stats.activeWarehouses} активных
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Позиций в наличии
              </Typography>
              <Typography variant="h4" component="div">
                {stats.totalItems}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                На сумму {stats.totalValue.toLocaleString()} ₽
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Зарезервировано
              </Typography>
              <Typography variant="h4" component="div">
                {stats.reservedItems}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                позиций
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Требуют внимания
              </Typography>
              <Typography variant="h4" component="div" color="warning.main">
                {stats.lowStockItems + stats.negativeStockItems + stats.expiringSoonItems}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                позиций
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Уведомления и предупреждения */}
      {alertCards.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {alertCards.map((alert, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Alert 
                severity={alert.severity}
                action={
                  <Button 
                    size="small" 
                    onClick={() => handleNavigate(alert.actionPath)}
                  >
                    {alert.actionText}
                  </Button>
                }
                icon={alert.icon}
              >
                <Typography variant="subtitle2" gutterBottom>
                  {alert.title}: {alert.count}
                </Typography>
                <Typography variant="body2">
                  {alert.description}
                </Typography>
              </Alert>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Быстрые действия */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Быстрые действия
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
              onClick={() => handleNavigate(action.path)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Box
                    sx={{
                      backgroundColor: action.color,
                      color: 'white',
                      borderRadius: 1,
                      p: 1,
                      mr: 2,
                      display: 'flex'
                    }}
                  >
                    {action.icon}
                  </Box>
                  <Typography variant="h6" component="div">
                    {action.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Навигация по разделам */}
      <Grid container spacing={3}>
        {navigationSections.map((section, sectionIndex) => (
          <Grid item xs={12} md={6} key={sectionIndex}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {section.title}
                </Typography>
                <List disablePadding>
                  {section.items.map((item, itemIndex) => (
                    <ListItem key={itemIndex} disablePadding>
                      <ListItemButton onClick={() => handleNavigate(item.path)}>
                        <ListItemIcon>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              {item.title}
                              {'badge' in item && item.badge !== undefined && (
                                <Chip 
                                  size="small" 
                                  label={item.badge} 
                                  color="primary"
                                />
                              )}
                            </Box>
                          }
                          secondary={item.description}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default WarehouseHub;
import React, { useMemo } from 'react';
import { Box, AppBar, Toolbar, Typography, Button, BottomNavigation, BottomNavigationAction, Paper, Chip, Avatar } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../../auth/AuthContext';
import HomeIcon from '@mui/icons-material/Home';
import TasksIcon from '@mui/icons-material/ListAlt';
import WarehouseIcon from '@mui/icons-material/Inventory';
import FolderIcon from '@mui/icons-material/Folder';
import LogoutIcon from '@mui/icons-material/Logout';
import EstimateIcon from '@mui/icons-material/RequestQuote';
import TimerIcon from '@mui/icons-material/Timer';
import ContactsIcon from '@mui/icons-material/Contacts';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import CriticalStockBell from '../dashboard/CriticalStockBell';
import { usePermissions } from '../../auth/usePermissions';
import { Permission } from '../../auth/permissions';
import { roleDescriptions } from '../../auth/permissions';

// Базовая конфигурация пунктов меню с требуемыми разрешениями
const allNavItems = [
  { 
    path: '/', 
    label: 'Главная', 
    value: 'home', 
    icon: <HomeIcon />,
    permission: null, // Доступно всем
  },
  { 
    path: '/tasks', 
    label: 'Задачи', 
    value: 'tasks', 
    icon: <TasksIcon />,
    permissions: [Permission.VIEW_ALL_TASKS, Permission.VIEW_OWN_TASKS], // Любое из разрешений
    mode: 'any' as const,
  },
  { 
    path: '/time-control', 
    label: 'Время', 
    value: 'time', 
    icon: <TimerIcon />,
    permission: Permission.TRACK_TIME,
  },
  { 
    path: '/estimates', 
    label: 'Сметы', 
    value: 'estimates', 
    icon: <EstimateIcon />,
    permission: Permission.VIEW_ESTIMATES,
  },
  { 
    path: '/products', 
    label: 'Склад', 
    value: 'warehouse', 
    icon: <WarehouseIcon />,
    permission: Permission.VIEW_WAREHOUSE,
  },
  { 
    path: '/references', 
    label: 'Справочники', 
    value: 'references', 
    icon: <FolderIcon />,
    permission: null, // Доступно всем, но внутри будут свои проверки
  },
  { 
    path: '/counterparties', 
    label: 'Контрагенты', 
    value: 'counterparties', 
    icon: <ContactsIcon />,
    permission: Permission.VIEW_ESTIMATES, // Временно используем это разрешение
  },
  { 
    path: '/projects-v2', 
    label: 'Проекты', 
    value: 'projects-v2', 
    icon: <ArchitectureIcon />,
    permission: Permission.VIEW_ALL_PROJECTS,
  },
];

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, hasPermission, hasAnyPermission, loading } = usePermissions();
  
  // Фильтруем пункты меню на основе разрешений
  const navItems = useMemo(() => {
    if (loading) return allNavItems;
    
    return allNavItems.filter(item => {
      // Если разрешение не указано, пункт доступен всем
      if (!item.permission && !item.permissions) return true;
      
      // Проверка одного разрешения
      if (item.permission) {
        return hasPermission(item.permission);
      }
      
      // Проверка нескольких разрешений
      if (item.permissions) {
        const mode = item.mode || 'any';
        return mode === 'any' 
          ? hasAnyPermission(item.permissions)
          : item.permissions.every(p => hasPermission(p));
      }
      
      return false;
    });
  }, [hasPermission, hasAnyPermission, loading]);
  

  
  // Определяем активный пункт меню, учитывая вложенные маршруты
  const getCurrentNav = () => {
    // Все маршруты справочников должны показывать "Справочники" как активный пункт
    const referenceRoutes = ['/counterparties', '/contractors', '/warehouses', '/shipments', '/units', '/delivery-methods', '/bank-accounts'];
    
    if (referenceRoutes.some(route => location.pathname.startsWith(route))) {
      return navItems.find(item => item.value === 'references') || navItems[0];
    }
    
    // Маршруты смет
    if (location.pathname.startsWith('/estimates') || location.pathname.startsWith('/mobile/estimate')) {
      return navItems.find(item => item.value === 'estimates') || navItems[0];
    }
    
    return navItems.find(item => item.path === location.pathname) || navItems[0];
  };
  
  const currentNav = getCurrentNav();
  
  // Определяем заголовок страницы
  const getPageTitle = () => {
    // Проверка на страницы смет
    if (location.pathname.startsWith('/estimates')) {
      if (location.pathname === '/estimates/quick-create') return 'Новая смета';
      return 'Сметы';
    }
    if (location.pathname.startsWith('/mobile/estimate')) return 'Смета';
    
    switch (location.pathname) {
      case '/contractors':
        return 'Контрагенты';
      case '/products':
        return 'Товары и услуги';
      case '/warehouses':
        return 'Склады';
      case '/shipments':
        return 'Отгрузки';
      case '/units':
        return 'Единицы измерения';
      case '/delivery-methods':
        return 'Способы доставки';
      case '/bank-accounts':
        return 'Банки и счета';
      default:
        return currentNav.label;
    }
  };

  return (
    <Box>
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{getPageTitle()}</Typography>
          
          {/* Отображение роли пользователя */}
          {role && (
            <Chip
              label={roleDescriptions[role]?.name || role}
              size="small"
              sx={{ 
                mr: 2, 
                backgroundColor: roleDescriptions[role]?.color || '#666',
                color: 'white'
              }}
              avatar={
                <Avatar sx={{ 
                  bgcolor: 'transparent',
                  color: 'white'
                }}>
                  {roleDescriptions[role]?.name?.[0] || role[0].toUpperCase()}
                </Avatar>
              }
            />
          )}
          
          <CriticalStockBell />
          <Button color="inherit" onClick={logout}><LogoutIcon /></Button>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ p: 2, mb: 8 }}>
        <Outlet />
      </Box>
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
        <BottomNavigation showLabels value={currentNav.value} onChange={(e, value) => {
          navigate(navItems.find(item => item.value === value)?.path || '/');
        }}>
          {navItems.map(item => (
            <BottomNavigationAction key={item.value} label={item.label} value={item.value} icon={item.icon} />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
};
export default MainLayout;

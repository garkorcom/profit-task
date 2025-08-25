import React from 'react';
import { Box, AppBar, Toolbar, Typography, Button, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../../auth/AuthContext';
import HomeIcon from '@mui/icons-material/Home';
import TasksIcon from '@mui/icons-material/ListAlt';
import WarehouseIcon from '@mui/icons-material/Inventory';
import InvoiceIcon from '@mui/icons-material/Receipt';
import FolderIcon from '@mui/icons-material/Folder';
import LogoutIcon from '@mui/icons-material/Logout';

const navItems = [
  { path: '/', label: 'Главная', value: 'home', icon: <HomeIcon /> },
  { path: '/tasks', label: 'Задачи', value: 'tasks', icon: <TasksIcon /> },
  { path: '/products', label: 'Склад', value: 'warehouse', icon: <WarehouseIcon /> },
  { path: '/invoices', label: 'Счета', value: 'invoices', icon: <InvoiceIcon /> },
  { path: '/references', label: 'Справочники', value: 'references', icon: <FolderIcon /> },
];

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  

  
  // Определяем активный пункт меню, учитывая вложенные маршруты
  const getCurrentNav = () => {
    // Все маршруты справочников должны показывать "Справочники" как активный пункт
    const referenceRoutes = ['/contractors', '/products', '/warehouses', '/units', '/delivery-methods', '/bank-accounts'];
    
    if (referenceRoutes.some(route => location.pathname.startsWith(route))) {
      return navItems.find(item => item.value === 'references') || navItems[0];
    }
    
    return navItems.find(item => item.path === location.pathname) || navItems[0];
  };
  
  const currentNav = getCurrentNav();
  
  // Определяем заголовок страницы
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/contractors':
        return 'Контрагенты';
      case '/products':
        return 'Товары и услуги';
      case '/warehouses':
        return 'Склады';
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

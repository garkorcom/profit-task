import React, { useMemo, useState, useEffect } from 'react';
import { 
  Box, AppBar, Toolbar, Typography, Button, BottomNavigation, 
  BottomNavigationAction, Paper, Chip, Avatar, Drawer, List,
  ListItem, ListItemIcon, ListItemText, IconButton, Divider,
  useMediaQuery, useTheme, Badge, Collapse, ListItemButton,
  Stack, Fade, alpha
} from '@mui/material';
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
import MenuIcon from '@mui/icons-material/Menu';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import InfoIcon from '@mui/icons-material/Info';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';
import CriticalStockBell from '../dashboard/CriticalStockBell';
import { usePermissions } from '../../auth/usePermissions';
import { Permission } from '../../auth/permissions';
import { roleDescriptions } from '../../auth/permissions';
import { useAuth } from '../../auth/AuthContext';
import GlobalTimeTrackingManager from '../time/GlobalTimeTrackingManager';
import { useGlobalKeyboard } from '../../hooks/useGlobalKeyboard';

// Базовая конфигурация пунктов меню с требуемыми разрешениями
const allNavItems = [
  { 
    path: '/', 
    label: 'Главная', 
    value: 'home', 
    icon: <HomeIcon />,
    permission: null, // Доступно всем
    color: '#4caf50'
  },
  { 
    path: '/tasks', 
    label: 'Задачи', 
    value: 'tasks', 
    icon: <TasksIcon />,
    permissions: [Permission.VIEW_ALL_TASKS, Permission.VIEW_OWN_TASKS],
    mode: 'any' as const,
    color: '#ff9800'
  },
  { 
    path: '/time-management', 
    label: 'Управление временем', 
    value: 'time', 
    icon: <TimerIcon />,
    permission: Permission.TRACK_TIME,
    color: '#2196f3'
  },
  { 
    path: '/estimates', 
    label: 'Сметы', 
    value: 'estimates', 
    icon: <EstimateIcon />,
    permission: Permission.VIEW_ESTIMATES,
    color: '#9c27b0'
  },
  { 
    path: '/products', 
    label: 'Склад', 
    value: 'warehouse', 
    icon: <WarehouseIcon />,
    permission: Permission.VIEW_WAREHOUSE,
    color: '#f44336'
  },
  { 
    path: '/references', 
    label: 'Справочники', 
    value: 'references', 
    icon: <FolderIcon />,
    permission: null,
    color: '#607d8b',
    subItems: [
      { path: '/projects', label: 'Проекты', icon: <ArchitectureIcon /> },
      { path: '/counterparties', label: 'Контрагенты', icon: <ContactsIcon /> },
      { path: '/warehouses', label: 'Склады', icon: <WarehouseIcon /> },
      { path: '/reports', label: 'Отчеты ERP', icon: <AssessmentIcon /> },
      { path: '/about', label: 'О проекте', icon: <InfoIcon /> },
      { path: '/units', label: 'Единицы измерения', icon: <FolderIcon /> },
      { path: '/delivery-methods', label: 'Способы доставки', icon: <FolderIcon /> },
      { path: '/bank-accounts', label: 'Банки и счета', icon: <FolderIcon /> }
    ]
  },
  { 
    path: '/counterparties', 
    label: 'Контрагенты', 
    value: 'counterparties', 
    icon: <ContactsIcon />,
    permission: Permission.VIEW_ESTIMATES,
    color: '#00bcd4'
  },
  { 
    path: '/trajectory', 
    label: 'Траектория', 
    value: 'trajectory', 
    icon: <TimelineIcon />,
    permission: null, // Доступно всем авторизованным пользователям
    color: '#8b5cf6'
  },
  // Проекты теперь доступны в подменю Справочники
];

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  // Правильные breakpoints для мобильных устройств
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // 768px - для телефонов
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg')); // 768-1024px - для планшетов
  const { currentUser } = useAuth();
  const { role, hasPermission, hasAnyPermission, loading } = usePermissions();
  
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  
  // Инициализация глобальных горячих клавиш
  useGlobalKeyboard();
  // Close drawer on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [location.pathname, isMobile]);
  
  // Фильтруем пункты меню на основе разрешений
  const navItems = useMemo(() => {
    if (loading) return allNavItems;
    
    return allNavItems.filter(item => {
      if (!item.permission && !item.permissions) return true;
      
      if (item.permission) {
        return hasPermission(item.permission);
      }
      
      if (item.permissions) {
        const mode = item.mode || 'any';
        return mode === 'any' 
          ? hasAnyPermission(item.permissions)
          : item.permissions.every(p => hasPermission(p));
      }
      
      return false;
    });
  }, [hasPermission, hasAnyPermission, loading]);
  
  const handleExpandClick = (value: string) => {
    setExpandedItems(prev => 
      prev.includes(value) 
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };
  
  // Определяем активный пункт меню
  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/') return location.pathname.startsWith(path);
    return false;
  };
  
  const getPageTitle = () => {
    if (location.pathname.startsWith('/estimates')) {
      if (location.pathname === '/estimates/quick-create') return 'Новая смета';
      return 'Сметы';
    }
    if (location.pathname.startsWith('/mobile/estimate')) return 'Смета';
    
    const currentItem = navItems.find(item => isActive(item.path));
    if (currentItem) return currentItem.label;
    
    const pathMap: Record<string, string> = {
      '/projects': 'Проекты',
      '/contractors': 'Контрагенты',
      '/products': 'Товары и услуги',
      '/warehouses': 'Склады',
      '/shipments': 'Отгрузки',
      '/units': 'Единицы измерения',
      '/delivery-methods': 'Способы доставки',
      '/bank-accounts': 'Банки и счета',
      '/profile': 'Профиль',
      '/trajectory': 'Траектория'
    };
    
    return pathMap[location.pathname] || 'Страница';
  };

  const drawerWidth = isMobile ? Math.min(280, window.innerWidth * 0.8) : 280; // Адаптивная ширина drawer

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #2e7d32 0%, #43a047 100%)',
          boxShadow: '0 2px 20px rgba(0,0,0,0.1)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ 
              mr: 2, 
              minWidth: 44, 
              minHeight: 44,
              ...(drawerOpen && !isMobile && { display: 'none' }) 
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            {getPageTitle()}
          </Typography>
          
          {/* User Info & Actions */}
          <Stack direction="row" spacing={2} alignItems="center">
            {role && !isMobile && (
              <Chip
                label={roleDescriptions[role]?.name || role}
                size="small"
                sx={{ 
                  backgroundColor: alpha(theme.palette.common.white, 0.2),
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
            )}
            
            <CriticalStockBell />
            
            <IconButton 
              color="inherit" 
              onClick={() => navigate('/notifications')}
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            
            <IconButton 
              color="inherit" 
              onClick={() => navigate('/profile')}
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              <PersonIcon />
            </IconButton>
            
            <IconButton 
              color="inherit" 
              onClick={logout}
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              <LogoutIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Side Drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{
          // Improve performance on mobile
          keepMounted: isMobile,
        }}
        sx={{
          width: drawerOpen ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: 'none',
            boxShadow: isMobile 
              ? '0 8px 30px rgba(0,0,0,0.12)' 
              : '2px 0 20px rgba(0,0,0,0.08)',
            background: 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)'
          },
          // Speed up animations on mobile
          '& .MuiDrawer-paperAnchorLeft': {
            transition: theme.transitions.create(['transform'], {
              easing: theme.transitions.easing.sharp,
              duration: isMobile ? 200 : theme.transitions.duration.enteringScreen,
            }),
          }
        }}
      >
        <Toolbar />
        
        {/* User Profile Section */}
        <Box sx={{ p: 2, mb: 1 }}>
          <Paper 
            sx={{ 
              p: 2, 
              background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
              borderRadius: 2
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar 
                sx={{ 
                  width: 50, 
                  height: 50,
                  background: 'linear-gradient(135deg, #2e7d32 0%, #43a047 100%)'
                }}
              >
                {currentUser?.displayName?.[0] || 'U'}
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  {currentUser?.displayName || 'Пользователь'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {currentUser?.email}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Box>
        
        <Divider />
        
        {/* Navigation Items */}
        <List sx={{ px: 1 }}>
          {navItems.map((item) => (
            <React.Fragment key={item.value}>
              <ListItem 
                disablePadding 
                sx={{ mb: 0.5 }}
              >
                <ListItemButton
                  onClick={() => {
                    if (item.subItems) {
                      handleExpandClick(item.value);
                    } else {
                      navigate(item.path);
                      if (isMobile) setDrawerOpen(false);
                    }
                  }}
                  selected={isActive(item.path)}
                  sx={{
                    borderRadius: 2,
                    mx: 0.5,
                    minHeight: isMobile ? 48 : 44,
                    py: isMobile ? 1.5 : 1,
                    transition: 'all 0.3s ease',
                    '&.Mui-selected': {
                      background: `linear-gradient(135deg, ${alpha(item.color || '#2196f3', 0.1)}, ${alpha(item.color || '#2196f3', 0.05)})`,
                      borderLeft: `4px solid ${item.color}`,
                      '& .MuiListItemIcon-root': {
                        color: item.color
                      }
                    },
                    '&:hover': {
                      background: alpha(item.color || '#2196f3', 0.05),
                      transform: isMobile ? 'none' : 'translateX(4px)'
                    },
                    '&:active': {
                      transform: isMobile ? 'scale(0.98)' : 'none'
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: isActive(item.path) ? item.color : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label}
                    primaryTypographyProps={{ fontWeight: isActive(item.path) ? 'bold' : 'normal' }}
                  />
                  {item.subItems && (expandedItems.includes(item.value) ? <ExpandLess /> : <ExpandMore />)}
                </ListItemButton>
              </ListItem>
              
              {/* Sub Items */}
              {item.subItems && (
                <Collapse in={expandedItems.includes(item.value)} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems.map((subItem) => (
                      <ListItem key={subItem.path} disablePadding sx={{ pl: 2 }}>
                        <ListItemButton
                          onClick={() => {
                            navigate(subItem.path);
                            if (isMobile) setDrawerOpen(false);
                          }}
                          selected={isActive(subItem.path)}
                          sx={{
                            borderRadius: 2,
                            mx: 0.5,
                            minHeight: isMobile ? 44 : 40,
                            py: isMobile ? 1 : 0.5,
                            '&.Mui-selected': {
                              background: alpha(item.color || '#2196f3', 0.1)
                            },
                            '&:active': {
                              transform: isMobile ? 'scale(0.98)' : 'none'
                            }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            {subItem.icon}
                          </ListItemIcon>
                          <ListItemText primary={subItem.label} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              )}
            </React.Fragment>
          ))}
        </List>
        
        {/* Bottom Actions */}
        <Box sx={{ flexGrow: 1 }} />
        <Divider />
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => navigate('/settings')}
            sx={{ 
              borderRadius: 2, 
              mb: 1,
              minHeight: isMobile ? 48 : 44,
              fontSize: isMobile ? '0.9rem' : '0.875rem'
            }}
          >
            Настройки
          </Button>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: isMobile ? 2 : 3, // Меньше отступы на мобильных
          pb: isMobile ? 10 : 3, // Больше нижний отступ для bottom navigation
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: !isMobile && drawerOpen ? 0 : 0, // Убираем отрицательный margin на мобильных
          width: !isMobile && drawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
          mt: 8
        }}
      >
        <Fade in timeout={500}>
          <Box>
            <Outlet />
          </Box>
        </Fade>
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            zIndex: 1000
          }} 
          elevation={8}
        >
          <BottomNavigation 
            showLabels 
            value={(() => {
              const activeIndex = navItems.findIndex(item => isActive(item.path));
              // If active item is not in first 4, show it in "More" tab
              return activeIndex >= 0 && activeIndex < 4 ? activeIndex : -1;
            })()}
            onChange={(event, newValue) => {
              if (newValue === 4) {
                // "More" tab clicked - open drawer
                setDrawerOpen(true);
              } else {
                const item = navItems[newValue];
                if (item) {
                  navigate(item.path);
                }
              }
            }}
            sx={{
              '& .Mui-selected': {
                color: 'primary.main'
              }
            }}
          >
            {navItems.slice(0, 4).map((item, index) => (
              <BottomNavigationAction 
                key={item.value} 
                label={item.label} 
                icon={item.icon}
                sx={{
                  minHeight: 64,
                  fontSize: '0.75rem',
                  '& .MuiBottomNavigationAction-label': {
                    fontSize: '0.75rem',
                    lineHeight: 1.2,
                    '&.Mui-selected': {
                      fontSize: '0.75rem'
                    }
                  },
                  '&.Mui-selected': {
                    color: item.color
                  }
                }}
              />
            ))}
            {navItems.length > 4 && (
              <BottomNavigationAction
                label="Ещё"
                icon={<MenuIcon />}
                sx={{
                  minHeight: 64,
                  fontSize: '0.75rem',
                  '& .MuiBottomNavigationAction-label': {
                    fontSize: '0.75rem',
                    lineHeight: 1.2,
                    '&.Mui-selected': {
                      fontSize: '0.75rem'
                    }
                  }
                }}
              />
            )}
          </BottomNavigation>
        </Paper>
      )}

      {/* Global Time Tracking Manager */}
      <GlobalTimeTrackingManager />
    </Box>
  );
};

export default MainLayout;
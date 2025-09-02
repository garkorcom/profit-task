import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
  Box, AppBar, Toolbar, Typography, Button, BottomNavigation, 
  BottomNavigationAction, Paper, Chip, Avatar, Drawer, List,
  ListItem, ListItemIcon, ListItemText, IconButton, Divider,
  useMediaQuery, useTheme, Badge, Collapse, ListItemButton,
  Stack, Fade, alpha, SwipeableDrawer
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
import CriticalStockBell from '../dashboard/CriticalStockBell';
import { usePermissions } from '../../auth/usePermissions';
import { Permission } from '../../auth/permissions';
import { roleDescriptions } from '../../auth/permissions';
import { useAuth } from '../../auth/AuthContext';

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
    path: '/time-control', 
    label: 'Учет времени', 
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
];

const MainLayoutMobileOptimized: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  // Используем более высокий breakpoint для современных телефонов
  const isMobile = useMediaQuery(theme.breakpoints.down('lg')); // 1024px
  const { currentUser } = useAuth();
  const { role, hasPermission, hasAnyPermission, loading } = usePermissions();
  
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [lastNavigationAction, setLastNavigationAction] = useState<string>('');
  
  // Close drawer on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [location.pathname, isMobile]);
  
  // Optimized drawer toggle with haptic feedback
  const toggleDrawer = useCallback((open: boolean) => {
    setDrawerOpen(open);
    // Add haptic feedback for better mobile UX
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [isMobile]);
  
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
      '/profile': 'Профиль'
    };
    
    return pathMap[location.pathname] || 'Страница';
  };

  const drawerWidth = 280;

  // Enhanced drawer content component
  const renderDrawerContent = () => (
    <>
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
      
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
                    if (isMobile) toggleDrawer(false);
                  }
                }}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: 2,
                  mx: 0.5,
                  minHeight: isMobile ? 52 : 44,
                  py: isMobile ? 1.5 : 1,
                  px: isMobile ? 2 : 1,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&.Mui-selected': {
                    background: `linear-gradient(135deg, ${alpha(item.color || '#2196f3', 0.15)}, ${alpha(item.color || '#2196f3', 0.08)})`,
                    borderLeft: `4px solid ${item.color}`,
                    transform: 'translateX(4px)',
                    '& .MuiListItemIcon-root': {
                      color: item.color,
                      transform: 'scale(1.1)'
                    },
                    '& .MuiListItemText-primary': {
                      fontWeight: 'bold'
                    }
                  },
                  '&:hover': {
                    background: alpha(item.color || '#2196f3', 0.08),
                    transform: 'translateX(2px)'
                  },
                  '&:active': {
                    transform: isMobile ? 'scale(0.96)' : 'translateX(2px)',
                    transition: 'transform 0.1s ease'
                  },
                  ...(isMobile && {
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  })
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
                          if (isMobile) toggleDrawer(false);
                        }}
                        selected={isActive(subItem.path)}
                        sx={{
                          borderRadius: 2,
                          mx: 0.5,
                          minHeight: isMobile ? 48 : 40,
                          py: isMobile ? 1.2 : 0.5,
                          pl: isMobile ? 4 : 3,
                          transition: 'all 0.2s ease',
                          '&.Mui-selected': {
                            background: alpha(item.color || '#2196f3', 0.1),
                            borderLeft: `3px solid ${alpha(item.color || '#2196f3', 0.5)}`
                          },
                          '&:hover': {
                            background: alpha(item.color || '#2196f3', 0.05)
                          },
                          '&:active': {
                            transform: isMobile ? 'scale(0.96)' : 'none',
                            transition: 'transform 0.1s ease'
                          },
                          ...(isMobile && {
                            WebkitTapHighlightColor: 'transparent',
                            touchAction: 'manipulation'
                          })
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
            minHeight: isMobile ? 52 : 44,
            fontSize: isMobile ? '0.9rem' : '0.875rem',
            ...(isMobile && {
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            })
          }}
        >
          Настройки
        </Button>
      </Box>
    </>
  );

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
            onClick={() => toggleDrawer(!drawerOpen)}
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

      {/* Enhanced Side Drawer */}
      {isMobile ? (
        <SwipeableDrawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => toggleDrawer(false)}
          onOpen={() => toggleDrawer(true)}
          disableBackdropTransition={false}
          disableDiscovery={false}
          ModalProps={{
            keepMounted: true,
          }}
          SwipeAreaProps={{
            style: {
              width: 20,
              position: 'fixed',
              top: 64,
              left: 0,
              bottom: 64,
              zIndex: 1199
            }
          }}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: 'none',
              boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
              background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch'
            },
            '& .MuiSwipeableDrawer-paper': {
              transition: theme.transitions.create(['transform'], {
                easing: theme.transitions.easing.easeOut,
                duration: 250
              }),
            }
          }}
        >
          {renderDrawerContent()}
        </SwipeableDrawer>
      ) : (
        <Drawer
          variant="persistent"
          open={drawerOpen}
          sx={{
            width: drawerOpen ? drawerWidth : 0,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: 'none',
              boxShadow: '2px 0 20px rgba(0,0,0,0.08)',
              background: 'linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)'
            }
          }}
        >
          {renderDrawerContent()}
        </Drawer>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: !isMobile && drawerOpen ? 0 : `-${drawerWidth}px`,
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

      {/* Enhanced Mobile Bottom Navigation */}
      {isMobile && (
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }} 
          elevation={8}
        >
          <BottomNavigation 
            showLabels 
            value={(() => {
              const activeIndex = navItems.findIndex(item => isActive(item.path));
              return activeIndex >= 0 && activeIndex < 4 ? activeIndex : -1;
            })()}
            onChange={(event, newValue) => {
              // Add haptic feedback
              if ('vibrate' in navigator) {
                navigator.vibrate(30);
              }
              
              if (newValue === 4) {
                toggleDrawer(true);
                setLastNavigationAction('drawer');
              } else {
                const item = navItems[newValue];
                if (item) {
                  navigate(item.path);
                  setLastNavigationAction(item.path);
                }
              }
            }}
            sx={{
              height: 64,
              borderTop: '1px solid',
              borderColor: 'divider',
              background: 'transparent',
              '& .Mui-selected': {
                color: 'primary.main'
              },
              '& .MuiBottomNavigationAction-root': {
                minHeight: 64,
                maxWidth: 'none',
                padding: '6px 12px 8px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                '&:active': {
                  transform: 'scale(0.95)',
                  transition: 'transform 0.1s ease'
                }
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
                    fontWeight: 500,
                    marginTop: '4px',
                    '&.Mui-selected': {
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }
                  },
                  '& .MuiSvgIcon-root': {
                    transition: 'all 0.2s ease'
                  },
                  '&.Mui-selected': {
                    color: item.color,
                    '& .MuiSvgIcon-root': {
                      transform: 'scale(1.1)'
                    }
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
                    fontWeight: 500,
                    marginTop: '4px',
                    '&.Mui-selected': {
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }
                  },
                  '& .MuiSvgIcon-root': {
                    transition: 'all 0.2s ease'
                  },
                  '&:hover': {
                    '& .MuiSvgIcon-root': {
                      transform: 'scale(1.05)'
                    }
                  }
                }}
              />
            )}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default MainLayoutMobileOptimized;
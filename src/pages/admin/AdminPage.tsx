/**
 * AdminPage - Главная страница администрирования системы
 * 
 * Централизованный доступ ко всем административным функциям
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  Tabs,
  Tab,
  useTheme
} from '@mui/material';
import {
  Security as SecurityIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
  Settings as SettingsIcon,
  Assessment as AuditIcon,
  Group as GroupIcon,
  Lock as LockIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import { hasAdminRights } from '../../auth/customClaims';
import { AdminRoleDashboard } from '../../components/admin/AdminRoleDashboard';
import PermissionDebugger from '../../components/admin/PermissionDebugger';
import AuditLogViewer from '../../components/admin/AuditLogViewer';
import UserOffboardingManager from '../../components/admin/UserOffboardingManager';
import MFASetup from '../../components/auth/MFASetup';
import SessionManager from '../../components/security/SessionManager';
import QuickAdminActions from '../../components/admin/QuickAdminActions';
import { useNavigate } from 'react-router-dom';

interface AdminPageProps {}

interface AdminSection {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  component: React.ReactNode | null;
  onClick?: () => void;
}

const AdminPage: React.FC<AdminPageProps> = () => {
  const { currentUser, customClaims, userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const theme = useTheme();

  // Проверяем права либо через Custom Claims, либо через профиль (для резервного доступа)
  const hasAccess = hasAdminRights(customClaims) || 
    (userProfile?.role === 'owner' || userProfile?.role === 'manager');

  if (!hasAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Доступ запрещен
          </Typography>
          <Typography>
            У вас нет прав администратора для доступа к этой странице.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Текущая роль: {customClaims?.role || userProfile?.role || 'Не определена'}
          </Typography>
        </Alert>
      </Box>
    );
  }

  const adminSections = [
    {
      title: 'Быстрые действия',
      description: 'Административные утилиты и быстрые действия',
      icon: <AdminIcon />,
      color: '#e91e63',
      component: <QuickAdminActions />
    },
    {
      title: 'Управление аккаунтами',
      description: 'Управление пользователями и их аккаунтами',
      icon: <PeopleIcon />,
      color: '#4caf50',
      component: null,
      onClick: () => navigate('/admin/users')
    },
    {
      title: 'Управление ролями',
      description: 'Создание и настройка ролей RBAC',
      icon: <SecurityIcon />,
      color: '#2196f3',
      component: <AdminRoleDashboard />
    },
    {
      title: 'Отладчик разрешений',
      description: 'Анализ и тестирование разрешений пользователей',
      icon: <SecurityIcon />,
      color: '#9c27b0',
      component: <PermissionDebugger />
    },
    {
      title: 'Деактивация пользователей',
      description: 'Управление процессом деактивации пользователей',
      icon: <PeopleIcon />,
      color: '#f44336',
      component: <UserOffboardingManager />
    },
    {
      title: 'Журнал аудита',
      description: 'Просмотр логов системы и compliance отчеты',
      icon: <AuditIcon />,
      color: '#ff9800',
      component: <AuditLogViewer />
    },
    {
      title: 'Многофакторная аутентификация',
      description: 'Настройка и управление MFA для пользователей',
      icon: <LockIcon />,
      color: '#4caf50',
      component: <MFASetup />
    },
    {
      title: 'Управление сессиями',
      description: 'Просмотр и завершение активных пользовательских сессий',
      icon: <SettingsIcon />,
      color: '#00bcd4',
      component: <SessionManager />
    },
    {
      title: 'Системные настройки',
      description: 'Конфигурация системы',
      icon: <SettingsIcon />,
      color: '#795548',
      component: <ComingSoonPlaceholder title="Системные настройки" />
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <AdminIcon sx={{ mr: 2, fontSize: 40 }} />
          Панель администрирования
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Управление системой и пользователями
        </Typography>
      </Box>

      {/* Информация о текущем пользователе */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2">
              Вы вошли как: <strong>{userProfile?.displayName || currentUser?.email}</strong>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">Роль:</Typography>
              <Chip size="small" label={customClaims?.role || userProfile?.role || 'Не определена'} color="primary" />
            </Box>
          </Box>
          <Box>
            <Typography variant="body2" color="textSecondary">
              Разрешений: {customClaims?.permissions?.length || 0}
            </Typography>
          </Box>
        </Box>
      </Alert>

      {/* Навигация */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {adminSections.map((section, index) => (
            <Tab
              key={index}
              label={section.title}
              icon={section.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>

      {/* Обзор функций (показывается на главной вкладке) */}
      {activeTab === 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Обзор административных функций
          </Typography>
          <Grid container spacing={3}>
            {adminSections.map((section, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card sx={{ height: '100%', position: 'relative' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          backgroundColor: section.color + '20',
                          color: section.color,
                          mr: 2
                        }}
                      >
                        {section.icon}
                      </Box>
                      <Typography variant="h6">{section.title}</Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      {section.description}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => section.onClick ? section.onClick() : setActiveTab(index)}
                      startIcon={section.icon}
                    >
                      Перейти
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Содержимое активной вкладки */}
      <Box>
        {adminSections[activeTab]?.component}
      </Box>
    </Box>
  );
};

// Компонент-заглушка для функций в разработке
interface ComingSoonPlaceholderProps {
  title: string;
}

const ComingSoonPlaceholder: React.FC<ComingSoonPlaceholderProps> = ({ title }) => {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <LockIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        Эта функция находится в разработке и скоро будет доступна.
      </Typography>
      <Alert severity="info" sx={{ maxWidth: 400, mx: 'auto' }}>
        <Typography variant="body2">
          Функция будет включать полный набор инструментов для управления этой областью системы.
        </Typography>
      </Alert>
    </Box>
  );
};

export default AdminPage;
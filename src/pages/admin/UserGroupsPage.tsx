/**
 * Страница управления группами пользователей
 * 
 * Интегрирует компонент управления группами в административную панель
 */

import React from 'react';
import {
  Container,
  Typography,
  Box,
  Breadcrumbs,
  Link,
  Paper
} from '@mui/material';
import {
  Home as HomeIcon,
  AdminPanelSettings as AdminIcon,
  Group as GroupIcon
} from '@mui/icons-material';

import UserGroupsManagement from '../../components/admin/UserGroupsManagement';

export default function UserGroupsPage() {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Хлебные крошки */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          color="inherit"
          href="/"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Главная
        </Link>
        <Link
          color="inherit"
          href="/admin"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <AdminIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Администрирование
        </Link>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <GroupIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Группы пользователей
        </Box>
      </Breadcrumbs>

      {/* Заголовок страницы */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Группы пользователей
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Управление группами пользователей, настройка автоназначения и контроль доступа
        </Typography>
      </Box>

      {/* Основное содержимое */}
      <Paper sx={{ p: 3 }}>
        <UserGroupsManagement />
      </Paper>
    </Container>
  );
}
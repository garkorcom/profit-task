/**
 * Главная страница модуля "Траектория"
 * Персональный рост и эмоциональный интеллект
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Alert,
  Fab,
  useTheme,
  alpha
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Analytics as AnalyticsIcon,
  CalendarMonth as CalendarIcon,
  Assignment as GoalsIcon,
  Inbox as InboxIcon,
  Add as AddIcon
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import { EmotionCheckIn } from './components/EmotionCheckIn';
import { Calendar as TrajectoryCalendar } from './components/Calendar';
import { PulseDashboard } from './components/PulseDashboard';
import { DailyInbox } from './components/DailyInbox';
import { GoalsManager } from './components/GoalsManager';
import './styles/emotionColors.css';

// Временные заглушки для компонентов (будут реализованы далее)
// PulseDashboard теперь импортируется из отдельного файла

// Calendar компонент теперь импортируется из отдельного файла


// DailyInbox теперь импортируется из отдельного файла

// Вкладки модуля
const TRAJECTORY_TABS = [
  {
    id: 'pulse',
    label: 'Пульс',
    icon: <AnalyticsIcon />,
    component: PulseDashboard,
    description: 'Аналитика и инсайты настроения'
  },
  {
    id: 'calendar',
    label: 'Календарь',
    icon: <CalendarIcon />,
    component: TrajectoryCalendar,
    description: 'Планирование с учетом эмоций'
  },
  {
    id: 'goals',
    label: 'Цели',
    icon: <GoalsIcon />,
    component: GoalsManager,
    description: 'Профессиональный рост'
  },
  {
    id: 'inbox',
    label: 'Обзор дня',
    icon: <InboxIcon />,
    component: DailyInbox,
    description: 'Ежедневная рефлексия'
  }
];

export const TrajectoryPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [showQuickCheckIn, setShowQuickCheckIn] = useState(false);

  // Проверка доступа
  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">
          Для доступа к модулю "Траектория" необходима авторизация
        </Alert>
      </Container>
    );
  }

  const ActiveComponent = TRAJECTORY_TABS[activeTab].component;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Заголовок модуля */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TimelineIcon 
            sx={{ 
              fontSize: 40, 
              mr: 2, 
              color: 'primary.main',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }} 
          />
          <Box>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 'bold',
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.5
              }}
            >
              Траектория
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Персональный рост и эмоциональный интеллект
            </Typography>
          </Box>
        </Box>

        {/* Краткая информация о пользователе */}
        {userProfile && (
          <Alert 
            severity="info" 
            sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}
          >
            <Typography variant="body2">
              Добро пожаловать, <strong>{userProfile.displayName || userProfile.email}</strong>! 
              Здесь вы можете отслеживать свое эмоциональное состояние и планировать развитие.
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Быстрая отметка эмоций (всегда доступна) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6} lg={4}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 2,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <AddIcon sx={{ mr: 1 }} />
              Быстрая отметка
            </Typography>
            <EmotionCheckIn 
              compact
              onSuccess={() => {
                // TODO: Обновить данные в store
                console.log('Эмоция сохранена');
              }}
              onError={(error) => {
                console.error('Ошибка:', error);
              }}
            />
          </Paper>
        </Grid>
        
        {/* Можно добавить краткую статистику */}
        <Grid item xs={12} md={6} lg={8}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Сегодняшний прогресс
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Статистика и тренды будут отображаться здесь после накопления данных
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Основные вкладки */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 72,
              textTransform: 'none',
              fontSize: '1rem'
            }
          }}
        >
          {TRAJECTORY_TABS.map((tab, index) => (
            <Tab
              key={tab.id}
              icon={tab.icon}
              label={
                <Box>
                  <Typography variant="body1">{tab.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {tab.description}
                  </Typography>
                </Box>
              }
              iconPosition="top"
            />
          ))}
        </Tabs>
      </Paper>

      {/* Контент активной вкладки */}
      <Paper 
        elevation={2} 
        sx={{ 
          minHeight: 500,
          overflow: 'hidden'
        }}
      >
        <ActiveComponent />
      </Paper>

      {/* Floating Action Button для быстрого доступа */}
      <Fab
        color="primary"
        aria-label="Быстрая отметка эмоции"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000
        }}
        onClick={() => setShowQuickCheckIn(true)}
      >
        <AddIcon />
      </Fab>

      {/* Модальное окно быстрой отметки */}
      {showQuickCheckIn && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            p: 2
          }}
          onClick={() => setShowQuickCheckIn(false)}
        >
          <Box
            sx={{
              maxWidth: 400,
              width: '100%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <EmotionCheckIn 
              onSuccess={() => {
                setShowQuickCheckIn(false);
              }}
              onError={(error) => {
                console.error('Ошибка:', error);
              }}
            />
          </Box>
        </Box>
      )}
    </Container>
  );
};
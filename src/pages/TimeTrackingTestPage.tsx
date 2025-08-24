import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Paper, 
  Stack, 
  Divider,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  BugReport as BugIcon,
  Build as BuildIcon,
  Timer as TimerIcon,
  PlayArrow as PlayArrowIcon,
  Construction as ConstructionIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import TimeTrackingButton from '../components/TimeTrackingButton';
import TimeIndicator from '../components/TimeIndicator';
import { useTimeTracking } from '../contexts/TimeTrackingContext';

const TimeTrackingTestPage: React.FC = () => {
  const navigate = useNavigate();
  const { isWorking, stopWork } = useTimeTracking();

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: { xs: 2, sm: 4 }, my: 3 }}>
        <Stack spacing={4}>
          {/* Заголовок */}
          <Box sx={{ textAlign: 'center' }}>
            <ConstructionIcon color="primary" sx={{ fontSize: 60, mb: 1 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Тестовая страница
            </Typography>
            <Typography color="text.secondary">
              Используйте эту страницу для проверки отдельных компонентов и функций.
            </Typography>
          </Box>
          
          <Divider />

          {/* Секция: Учет времени */}
          <Box>
            <Typography variant="h5" gutterBottom>
              <TimerIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Модуль учета времени
            </Typography>
            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} alignItems="center">
              <TimeTrackingButton 
                variant="contained" 
                buttonText="Начать работу (Тест)"
                startIcon={<PlayArrowIcon />}
              />
              {isWorking ? (
                <>
                  <Alert severity="success" sx={{ flex: 1 }}>
                    Учет времени активен. Индикатор должен быть виден в шапке.
                  </Alert>
                  <Button 
                    variant="contained" 
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={() => stopWork(
                      new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
                      'Test completion'
                    )}
                  >
                    Завершить работу
                  </Button>
                </>
              ) : (
                <Alert severity="info" sx={{ flex: 1 }}>
                  Учет времени не активен.
                </Alert>
              )}
            </Stack>
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>Индикатор (для проверки вне шапки):</Typography>
              <TimeIndicator variant="desktop" />
            </Box>
          </Box>

          <Divider />

          {/* Секция: Инструменты разработки */}
          <Box>
            <Typography variant="h5" gutterBottom>
              <BuildIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Инструменты и отладка
            </Typography>
            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <Button 
                variant="outlined"
                startIcon={<BugIcon />}
                onClick={() => navigate('/time-tracking-diagnostics')}
              >
                Диагностика времени
              </Button>
              <Button 
                variant="outlined" 
                color="secondary"
                startIcon={<BuildIcon />}
                onClick={() => navigate('/dev-tools')}
              >
                Инструменты разработчика
              </Button>
            </Stack>
          </Box>
          
          <Divider />

          {/* Секция: Навигация */}
          <Box>
            <Typography variant="h5" gutterBottom>
              Навигация по приложению
            </Typography>
            <Stack spacing={2} direction="row" flexWrap="wrap">
              <Button onClick={() => navigate('/')}>Главная</Button>
              <Button onClick={() => navigate('/tasks')}>Задачи</Button>
              <Button onClick={() => navigate('/projects')}>Проекты</Button>
              <Button onClick={() => navigate('/employees')}>Сотрудники</Button>
              <Button onClick={() => navigate('/products')}>Товары</Button>
            </Stack>
          </Box>

        </Stack>
      </Paper>
    </Container>
  );
};

export default TimeTrackingTestPage;

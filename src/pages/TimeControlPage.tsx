import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Card, CardContent, Button, Stack, Chip,
  Tab, Tabs, useTheme, useMediaQuery
} from '@mui/material';
import {
  PlayArrow as PlayIcon, Stop as StopIcon, Pause as PauseIcon,
  Work as WorkIcon, Assignment as TaskIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { getTimeEntriesStream, TimeEntry } from '../api/timeEntryUnified';
import TimeStatistics from '../components/TimeStatistics';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`time-control-tabpanel-${index}`}
      aria-labelledby={`time-control-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const TimeControlPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    isWorking, currentEntry, elapsedSeconds, stopWork, pauseWork, resumeWork, isPaused
  } = useTimeTracking();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isVerySmall = useMediaQuery(theme.breakpoints.down(375));

  const [, setTimeEntries] = useState<TimeEntry[]>([]);
  const [, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (currentUser) {
      const unsubscribe = getTimeEntriesStream(currentUser.uid, (entries) => {
        setTimeEntries(entries);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderCurrentSession = () => {
    if (isMobile) {
      return (
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent sx={{ p: isVerySmall ? 2 : 3 }}>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant={isVerySmall ? "subtitle1" : "h6"}>Идет учет времени</Typography>
              <Typography variant={isVerySmall ? "h4" : "h3"} fontWeight="bold" sx={{ my: 1 }}>
                {formatDuration(elapsedSeconds)}
              </Typography>
            </Box>
            <Stack direction={isVerySmall ? "column" : "row"} spacing={1} mb={2} justifyContent="center">
              <Chip 
                icon={<WorkIcon fontSize="small" />} 
                label={currentEntry?.projectName} 
                size={isVerySmall ? "small" : "medium"} 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: isVerySmall ? '0.7rem' : '0.8rem' }} 
              />
              <Chip 
                icon={<TaskIcon fontSize="small" />} 
                label={currentEntry?.taskName} 
                size={isVerySmall ? "small" : "medium"} 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: isVerySmall ? '0.7rem' : '0.8rem' }} 
              />
            </Stack>
            <Stack direction={isVerySmall ? "column" : "row"} spacing={1} justifyContent="center">
              {isPaused ? (
                <Button 
                  variant="contained" 
                  startIcon={<PlayIcon />} 
                  onClick={resumeWork} 
                  sx={{ bgcolor: 'white', color: 'primary.main', minHeight: 44, fontSize: isVerySmall ? '0.8rem' : '0.9rem' }}
                  fullWidth={isVerySmall}
                >
                  Продолжить
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  startIcon={<PauseIcon />} 
                  onClick={() => pauseWork()} 
                  sx={{ bgcolor: 'white', color: 'warning.main', minHeight: 44, fontSize: isVerySmall ? '0.8rem' : '0.9rem' }}
                  fullWidth={isVerySmall}
                >
                  Пауза
                </Button>
              )}
              <Button 
                variant="contained" 
                startIcon={<StopIcon />} 
                onClick={() => stopWork(undefined, undefined, undefined, true)} 
                sx={{ bgcolor: 'white', color: 'error.main', minHeight: 44, fontSize: isVerySmall ? '0.8rem' : '0.9rem' }}
                fullWidth={isVerySmall}
              >
                Завершить
              </Button>
            </Stack>
            {currentEntry && (
              <Box sx={{ mt: 2 }}>
                <TimeStatistics entryId={currentEntry.id} />
              </Box>
            )}
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6">Идет учет времени</Typography>
              <Typography variant="h3" fontWeight="bold">{formatDuration(elapsedSeconds)}</Typography>
              <Stack direction="row" spacing={1} mt={1}>
                <Chip icon={<WorkIcon />} label={currentEntry?.projectName} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                <Chip icon={<TaskIcon />} label={currentEntry?.taskName} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              </Stack>
            </Box>
            <Stack direction="row" spacing={1}>
              {isPaused ? (
                <Button variant="contained" startIcon={<PlayIcon />} onClick={resumeWork} sx={{ bgcolor: 'white', color: 'primary.main' }}>Продолжить</Button>
              ) : (
                <Button variant="contained" startIcon={<PauseIcon />} onClick={() => pauseWork()} sx={{ bgcolor: 'white', color: 'warning.main' }}>Пауза</Button>
              )}
              <Button variant="contained" startIcon={<StopIcon />} onClick={() => stopWork(undefined, undefined, undefined, true)} sx={{ bgcolor: 'white', color: 'error.main' }}>Завершить</Button>
            </Stack>
          </Stack>
          {currentEntry && <TimeStatistics entryId={currentEntry.id} />}
        </CardContent>
      </Card>
    );
  };

  return (
    <Container maxWidth={isMobile ? false : "xl"} disableGutters={isMobile}>
      <Box sx={{ py: isMobile ? 2 : 3, px: isMobile ? 2 : 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant={isMobile ? (isVerySmall ? "h5" : "h4") : "h4"} fontWeight="bold">
            Контроль времени
          </Typography>
        </Stack>

        {isWorking ? renderCurrentSession() : (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Нет активной сессии
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Нажмите кнопку ниже, чтобы выбрать проект и начать учет времени.
              </Typography>
              <Button
                component={RouterLink}
                to="/start-work"
                variant="contained"
                size="large"
                startIcon={<PlayIcon />}
              >
                Начать работу
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Табы */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', my: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, v) => setTabValue(v)}
            variant={isMobile ? "fullWidth" : "standard"}
          >
            <Tab 
              label="История" 
              sx={{ 
                minHeight: isMobile ? 44 : 48,
                fontSize: isMobile ? '0.9rem' : '1rem'
              }} 
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* Здесь будет история */}
          <Typography color="text.secondary" align="center">
            История временных записей будет здесь
          </Typography>
        </TabPanel>
      </Box>
    </Container>
  );
};

export default TimeControlPage;

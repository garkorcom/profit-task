/**
 * Календарь модуля "Траектория"
 * Интегрированный календарь с эмоциональными отметками и четырьмя слоями данных
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  alpha
} from '@mui/material';

import {
  ViewWeek as ViewWeekIcon,
  ViewDay as ViewDayIcon,
  ViewModule as ViewModuleIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Event as EventIcon,
  Work as WorkIcon,
  Psychology as PsychologyIcon,
  Google as GoogleIcon
} from '@mui/icons-material';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ruLocale from '@fullcalendar/core/locales/ru';

import { useAuth } from '../../../../auth/AuthContext';
import { CalendarEventExtended, EmotionLogEntry } from '../../types';
import { EMOTION_COLORS } from '../../types';

// Типы событий календаря  
type EventLayer = 'personal' | 'work' | 'emotions' | 'google';

// Конфигурация слоев календаря
const EVENT_LAYERS = {
  personal: {
    label: 'Личные события развития',
    color: 'var(--calendar-personal)',
    icon: <EventIcon />,
    description: 'Цели, обучение, личные мероприятия'
  },
  work: {
    label: 'Рабочие задачи',
    color: 'var(--calendar-work)',
    icon: <WorkIcon />,
    description: 'Проекты, задачи, time entries'
  },
  emotions: {
    label: 'Эмоциональные логи',
    color: 'var(--calendar-emotions)',
    icon: <PsychologyIcon />,
    description: 'Отметки настроения и эмоций'
  },
  google: {
    label: 'Google Calendar',
    color: 'var(--calendar-google)',
    icon: <GoogleIcon />,
    description: 'Синхронизированные события'
  }
} as const;

interface CalendarProps {
  onEventSelect?: (event: CalendarEventExtended) => void;
  onDateSelect?: (date: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  onEventSelect,
  onDateSelect
}) => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  
  // Состояние компонента
  const [events, setEvents] = useState<CalendarEventExtended[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
  const [visibleLayers, setVisibleLayers] = useState<Record<EventLayer, boolean>>({
    personal: true,
    work: true,
    emotions: true,
    google: false // По умолчанию выключен
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventLayer, setNewEventLayer] = useState<EventLayer>('personal');

  // Загрузка событий календаря
  const loadCalendarEvents = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Здесь будет загрузка реальных данных из Firebase
      // Пока используем mock данные
      const mockEvents: CalendarEventExtended[] = [
        // Личные события развития
        {
          id: '1',
          title: 'Изучение React',
          start: new Date(2024, 8, 15, 9, 0),
          end: new Date(2024, 8, 15, 11, 0),
          description: 'Углубленное изучение хуков React',
          layer: 'personal',
          type: 'development',
          userId: currentUser.uid,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: '2',
          title: 'Встреча с ментором',
          start: new Date(2024, 8, 18, 14, 0),
          end: new Date(2024, 8, 18, 15, 30),
          description: 'Обсуждение карьерных планов',
          layer: 'personal',
          type: 'meeting',
          userId: currentUser.uid,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        
        // Рабочие задачи
        {
          id: '3',
          title: 'Проект "Траектория"',
          start: new Date(2024, 8, 16, 10, 0),
          end: new Date(2024, 8, 16, 18, 0),
          description: 'Разработка модуля эмоционального интеллекта',
          layer: 'work',
          workType: 'project',
          type: 'work',
          userId: currentUser.uid,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        
        // Эмоциональные отметки (из EmotionLogEntry)
        {
          id: '4',
          title: 'Отличное настроение',
          start: new Date(2024, 8, 17, 12, 30),
          description: 'Уровень эмоций: 5 - Отлично',
          layer: 'emotions',
          emotionLevel: 5,
          type: 'emotion',
          userId: currentUser.uid,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: '5',
          title: 'Усталость после работы',
          start: new Date(2024, 8, 16, 19, 0),
          description: 'Уровень эмоций: 2 - Неудовлетворительно',
          layer: 'emotions',
          emotionLevel: 2,
          type: 'emotion',
          userId: currentUser.uid,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];
      
      setEvents(mockEvents);
    } catch (error) {
      console.error('Ошибка загрузки событий календаря:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarEvents();
  }, [currentUser]);

  // Фильтрация событий по видимым слоям
  const filteredEvents = useMemo(() => {
    return events.filter(event => visibleLayers[event.layer]);
  }, [events, visibleLayers]);

  // Преобразование событий для FullCalendar
  const calendarEvents = useMemo(() => {
    return filteredEvents.map(event => {
      let backgroundColor: string = EVENT_LAYERS[event.layer].color;
      let borderColor: string = backgroundColor;
      let textColor = '#ffffff';

      // Особая обработка для эмоциональных событий
      if (event.layer === 'emotions' && event.emotionLevel) {
        backgroundColor = EMOTION_COLORS[event.emotionLevel];
        borderColor = backgroundColor;
        textColor = event.emotionLevel === 3 ? '#000000' : '#ffffff';
      }

      return {
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        backgroundColor,
        borderColor,
        textColor,
        extendedProps: {
          ...event,
          layer: event.layer
        }
      };
    });
  }, [filteredEvents]);

  // Обработчики событий
  const handleLayerToggle = (layer: EventLayer) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  const handleDateClick = (dateInfo: any) => {
    const clickedDate = new Date(dateInfo.date);
    setSelectedDate(clickedDate);
    onDateSelect?.(clickedDate);
    setShowEventDialog(true);
  };

  const handleEventClick = (eventInfo: any) => {
    const event = eventInfo.event.extendedProps as CalendarEventExtended;
    onEventSelect?.(event);
  };

  const handleCreateEvent = async () => {
    if (!newEventTitle || !selectedDate || !currentUser) return;

    const newEvent: CalendarEventExtended = {
      id: Date.now().toString(),
      title: newEventTitle,
      start: selectedDate,
      end: new Date(selectedDate.getTime() + 60 * 60 * 1000), // +1 час
      description: '',
      layer: newEventLayer,
      type: 'custom',
      userId: currentUser.uid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setEvents(prev => [...prev, newEvent]);
    setShowEventDialog(false);
    setNewEventTitle('');
    setNewEventLayer('personal');
    setSelectedDate(null);
  };

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Для просмотра календаря необходима авторизация
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок и элементы управления */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
            <EventIcon sx={{ mr: 1 }} />
            Интегрированный календарь
          </Typography>
          
          <Stack direction="row" spacing={1}>
            <Tooltip title="Обновить календарь">
              <IconButton onClick={loadCalendarEvents} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={view}
                onChange={(e) => setView(e.target.value as any)}
              >
                <MenuItem value="dayGridMonth">
                  <ViewModuleIcon sx={{ mr: 1 }} fontSize="small" />
                  Месяц
                </MenuItem>
                <MenuItem value="timeGridWeek">
                  <ViewWeekIcon sx={{ mr: 1 }} fontSize="small" />
                  Неделя
                </MenuItem>
                <MenuItem value="timeGridDay">
                  <ViewDayIcon sx={{ mr: 1 }} fontSize="small" />
                  День
                </MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>

        {/* Фильтры слоев */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Слои календаря:
          </Typography>
          <FormGroup row>
            {Object.entries(EVENT_LAYERS).map(([key, config]) => (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox
                    checked={visibleLayers[key as EventLayer]}
                    onChange={() => handleLayerToggle(key as EventLayer)}
                    sx={{ 
                      color: config.color,
                      '&.Mui-checked': {
                        color: config.color
                      }
                    }}
                  />
                }
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    {config.icon}
                    <Box>
                      <Typography variant="body2">{config.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {config.description}
                      </Typography>
                    </Box>
                  </Stack>
                }
              />
            ))}
          </FormGroup>
        </Paper>
      </Box>

      {/* Календарь */}
      <Paper sx={{ p: 2, minHeight: 600 }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          initialView={view}
          locale={ruLocale}
          events={calendarEvents}
          editable={false}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="auto"
          eventDisplay="block"
          eventTextColor="#ffffff"
          eventClassNames="trajectory-calendar-event"
          themeSystem="standard"
        />
      </Paper>

      {/* Диалог создания события */}
      <Dialog open={showEventDialog} onClose={() => setShowEventDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Создать событие
          {selectedDate && (
            <Typography variant="body2" color="text.secondary">
              {selectedDate.toLocaleDateString('ru-RU')}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название события"
            fullWidth
            variant="outlined"
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth variant="outlined">
            <InputLabel>Тип события</InputLabel>
            <Select
              value={newEventLayer}
              label="Тип события"
              onChange={(e) => setNewEventLayer(e.target.value as EventLayer)}
            >
              {Object.entries(EVENT_LAYERS).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {config.icon}
                    <Typography>{config.label}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEventDialog(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleCreateEvent} 
            variant="contained"
            disabled={!newEventTitle}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
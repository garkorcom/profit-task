import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,

  Divider,
  Card,
  CardMedia,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Alert,
  TextField,
  CircularProgress,
  Tab,
  Tabs
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent
} from '@mui/lab';
import {
  Close as CloseIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  CameraAlt as PhotoIcon,
  LocationOn as LocationIcon,
  Comment as CommentIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { Task, TaskStatus } from '../../api/taskApi';
import { TimeEntry } from '../../api/timeEntryUnified';
import { useAuth } from '../../auth/AuthContext';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import TaskStatusChip from './TaskStatusChip';
import TaskPriorityChip from './TaskPriorityChip';

interface TaskDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  isManager?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
};

const TaskDetailsDialog: React.FC<TaskDetailsDialogProps> = ({
  open,
  onClose,
  task,
  onStatusChange,
  isManager = false
}) => {
  const { currentUser } = useAuth();
  const { 
    isWorking, 
    currentTask, 
    getTaskTimeEntries,
    getTotalTaskDuration,
    canStartWork,
    requiresPhoto
  } = useTimeTracking();
  
  const [tabValue, setTabValue] = useState(0);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [reworkReason, setReworkReason] = useState('');
  
  useEffect(() => {
    if (task) {
      loadTimeEntries();
    }
  }, [task]);
  
  const loadTimeEntries = async () => {
    if (!task) return;
    setLoading(true);
    try {
      const entries = await getTaskTimeEntries(task.id);
      setTimeEntries(entries);
    } catch (error) {
      console.error('Error loading time entries:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };
  
  const formatDate = (date: any): string => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('en-US');
  };
  
  if (!task) return null;
  
  const totalDuration = getTotalTaskDuration(task.id);
  const isCurrentTask = currentTask?.id === task.id;
  const needsPhoto = requiresPhoto(task);
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{task.task}</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Основная информация */}
        <Box mb={2}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box display="flex" gap={1} mb={1}>
                <TaskStatusChip status={task.status as TaskStatus} />
                {task.priority && <TaskPriorityChip priority={task.priority} />}
                {needsPhoto && (
                  <Chip
                    icon={<PhotoIcon />}
                    label="Требуется фото"
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box textAlign={{ sm: 'right' }}>
                <Typography variant="body2" color="textSecondary">
                  Проект: {task.projectName || 'Не указан'}
                </Typography>
                {task.deadline && (
                  <Typography variant="body2" color="textSecondary">
                    Срок: {formatDate(task.deadline)}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
        
        <Divider />
        
        {/* Табы */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="Описание" />
            <Tab label={`Сессии работы (${timeEntries.length})`} />
            {timeEntries.some(e => e.startPhotoUrl || e.endPhotoUrl) && (
              <Tab label="Фотофиксация" />
            )}
            <Tab label="История" />
          </Tabs>
        </Box>
        
        {/* Описание */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="body1" paragraph>
            {task.description || 'Описание не указано'}
          </Typography>
          
          {task.questions && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Вопросы и уточнения:
              </Typography>
              <Typography variant="body2">{task.questions}</Typography>
            </Alert>
          )}
          
          {task.whatToBuy && (
            <Alert severity="warning">
              <Typography variant="subtitle2" gutterBottom>
                Необходимо купить:
              </Typography>
              <Typography variant="body2">{task.whatToBuy}</Typography>
            </Alert>
          )}
          
          <Box mt={2}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Исполнитель:
                </Typography>
                <Typography variant="body1">
                  {task.assigneeName || 'Не назначен'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Автор:
                </Typography>
                <Typography variant="body1">
                  {task.authorName || currentUser?.displayName || currentUser?.email}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Плановые трудозатраты:
                </Typography>
                <Typography variant="body1">
                  {task.plannedDuration ? formatDuration(task.plannedDuration * 60) : 'Не указано'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Фактические трудозатраты:
                </Typography>
                <Typography variant="body1">
                  {formatDuration(totalDuration)}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
        
        {/* Сессии работы */}
        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : timeEntries.length === 0 ? (
            <Typography color="textSecondary" align="center" py={3}>
              Нет сессий работы
            </Typography>
          ) : (
            <List>
              {timeEntries.map((entry, index) => (
                <ListItem key={entry.id} divider={index < timeEntries.length - 1}>
                  <ListItemAvatar>
                    <Avatar>
                      <TimeIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1">
                          {formatDate(entry.startTime)}
                        </Typography>
                        <Chip
                          label={entry.status}
                          size="small"
                          color={
                            entry.status === 'active' ? 'primary' :
                            entry.status === 'completed' ? 'success' :
                            entry.status === 'paused' ? 'warning' :
                            'default'
                          }
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          Длительность: {entry.duration ? formatDuration(entry.duration) : 'В процессе'}
                        </Typography>
                        {entry.comment && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {entry.comment}
                          </Typography>
                        )}
                        <Box display="flex" gap={1} mt={1}>
                          {entry.startPhotoUrl && (
                            <Chip
                              icon={<PhotoIcon />}
                              label="Фото ДО"
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {entry.endPhotoUrl && (
                            <Chip
                              icon={<PhotoIcon />}
                              label="Фото ПОСЛЕ"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </TabPanel>
        
        {/* Фотофиксация */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={2}>
            {timeEntries.map((entry) => (
              <React.Fragment key={entry.id}>
                {entry.startPhotoUrl && (
                  <Grid item xs={12} sm={6}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="200"
                        image={entry.startPhotoUrl}
                        alt="Фото ДО"
                      />
                      <CardContent>
                        <Typography variant="subtitle2" color="primary">
                          Фото ДО
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {formatDate(entry.startTime)}
                        </Typography>
                        {entry.startLocation && (
                          <Box display="flex" alignItems="center" mt={1}>
                            <LocationIcon fontSize="small" />
                            <Typography variant="caption" ml={0.5}>
                              {entry.startLocation.latitude.toFixed(6)}, 
                              {entry.startLocation.longitude.toFixed(6)}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )}
                {entry.endPhotoUrl && (
                  <Grid item xs={12} sm={6}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="200"
                        image={entry.endPhotoUrl}
                        alt="Фото ПОСЛЕ"
                      />
                      <CardContent>
                        <Typography variant="subtitle2" color="success.main">
                          Фото ПОСЛЕ
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {formatDate(entry.endTime)}
                        </Typography>
                        {entry.endLocation && (
                          <Box display="flex" alignItems="center" mt={1}>
                            <LocationIcon fontSize="small" />
                            <Typography variant="caption" ml={0.5}>
                              {entry.endLocation.latitude.toFixed(6)}, 
                              {entry.endLocation.longitude.toFixed(6)}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </React.Fragment>
            ))}
          </Grid>
        </TabPanel>
        
        {/* История */}
        <TabPanel value={tabValue} index={3}>
          <Timeline>
            <TimelineItem>
              <TimelineOppositeContent color="textSecondary">
                {formatDate(task.createdAt)}
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineDot color="primary" />
                <TimelineConnector />
              </TimelineSeparator>
              <TimelineContent>
                <Typography variant="body2">
                  Задача создана
                </Typography>
              </TimelineContent>
            </TimelineItem>
            
            {task.startedAt && (
              <TimelineItem>
                <TimelineOppositeContent color="textSecondary">
                  {formatDate(task.startedAt)}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color="info" />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="body2">
                    Начата работа
                  </Typography>
                </TimelineContent>
              </TimelineItem>
            )}
            
            {task.finishedAt && (
              <TimelineItem>
                <TimelineOppositeContent color="textSecondary">
                  {formatDate(task.finishedAt)}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color="secondary" />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="body2">
                    Отправлена на проверку
                  </Typography>
                </TimelineContent>
              </TimelineItem>
            )}
            
            {task.reviewedAt && (
              <TimelineItem>
                <TimelineOppositeContent color="textSecondary">
                  {formatDate(task.reviewedAt)}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color="success" />
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="body2">
                    Завершена
                  </Typography>
                  {task.reviewComment && (
                    <Typography variant="caption" color="textSecondary">
                      {task.reviewComment}
                    </Typography>
                  )}
                </TimelineContent>
              </TimelineItem>
            )}
          </Timeline>
        </TabPanel>
        
        {/* Действия для руководителя */}
        {isManager && task.status === 'review' && (
          <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Проверка задачи
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Комментарий к проверке"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => onStatusChange?.(task.id, 'completed')}
              >
                Утвердить
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => {
                  if (reworkReason) {
                    onStatusChange?.(task.id, 'rework');
                  }
                }}
              >
                На доработку
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Закрыть
        </Button>
        {canStartWork(task) && !isCurrentTask && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<StartIcon />}
          >
            Начать работу
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TaskDetailsDialog;

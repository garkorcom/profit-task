import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  GridLegacy as Grid,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Alert,
  Tab,
  Tabs,
  Badge,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  AccessTime as TimeIcon,
  CameraAlt as PhotoIcon,
  Person as PersonIcon,
  Assignment as TaskIcon,
  Comment as CommentIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { 
  getTasksStream, 
  Task, 
  TaskStatus,
  approveTask,
  returnTaskForRework,
  changeTaskStatus
} from '../api/taskApi';
import { 
  getTimeEntriesByTaskStream,
  TimeEntry
} from '../api/timeEntryApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import TaskStatusChip from '../components/tasks/TaskStatusChip';
import TaskPriorityChip from '../components/tasks/TaskPriorityChip';
import TaskDetailsDialog from '../components/tasks/TaskDetailsDialog';

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

const TaskReviewPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    task: Task | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, task: null, action: null });
  const [reviewComment, setReviewComment] = useState('');
  const [taskTimeEntries, setTaskTimeEntries] = useState<Record<string, TimeEntry[]>>({});

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = getTasksStream(currentUser.uid, (allTasks) => {
      setTasks(allTasks);
      setLoading(false);
      
      // Загружаем TimeEntries для задач на проверке
      allTasks
        .filter(t => t.status === 'review')
        .forEach(task => {
          getTimeEntriesByTaskStream(currentUser.uid, task.id, (entries) => {
            setTaskTimeEntries(prev => ({
              ...prev,
              [task.id]: entries
            }));
          });
        });
    });

    return () => unsubscribe();
  }, [currentUser]);

  const tasksForReview = tasks.filter(t => t.status === 'review');
  const tasksInProgress = tasks.filter(t => t.status === 'in_progress');
  const tasksCompleted = tasks.filter(t => t.status === 'completed' && t.reviewedAt);

  const handleOpenReviewDialog = (task: Task, action: 'approve' | 'reject') => {
    setReviewDialog({ open: true, task, action });
    setReviewComment('');
  };

  const handleReview = async () => {
    if (!currentUser || !reviewDialog.task) return;

    try {
      if (reviewDialog.action === 'approve') {
        await approveTask(currentUser.uid, reviewDialog.task.id, reviewComment);
      } else if (reviewDialog.action === 'reject') {
        if (!reviewComment) {
          alert('Укажите причину возврата на доработку');
          return;
        }
        await returnTaskForRework(currentUser.uid, reviewDialog.task.id, reviewComment);
      }
      
      setReviewDialog({ open: false, task: null, action: null });
      setReviewComment('');
    } catch (error) {
      console.error('Error reviewing task:', error);
      alert('Ошибка при проверке задачи');
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  const getTotalDuration = (taskId: string): number => {
    const entries = taskTimeEntries[taskId] || [];
    return entries.reduce((total, entry) => total + (entry.duration || 0), 0);
  };

  const renderTaskCard = (task: Task, showActions: boolean = true) => {
    const timeEntries = taskTimeEntries[task.id] || [];
    const hasPhotos = timeEntries.some(e => e.startPhotoUrl || e.endPhotoUrl);
    const totalDuration = getTotalDuration(task.id);

    return (
      <Card key={task.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Typography variant="h6" component="div">
              {task.task}
            </Typography>
            <Box display="flex" gap={1}>
              {hasPhotos && (
                <Chip
                  icon={<PhotoIcon />}
                  label="Фото"
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              )}
              {task.requirePhoto && (
                <Badge badgeContent="!" color="error">
                  <Chip
                    label="Требуется фото"
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                </Badge>
              )}
            </Box>
          </Box>

          {task.description && (
            <Typography variant="body2" color="text.secondary" paragraph>
              {task.description}
            </Typography>
          )}

          <Box display="flex" flexDirection="column" gap={1} mb={2}>
            {task.projectName && (
              <Typography variant="body2" color="text.secondary">
                Проект: {task.projectName}
              </Typography>
            )}
            {task.assigneeName && (
              <Typography variant="body2" color="text.secondary">
                Исполнитель: {task.assigneeName}
              </Typography>
            )}
            {totalDuration > 0 && (
              <Typography variant="body2" color="text.secondary">
                Затрачено времени: {formatDuration(totalDuration)}
              </Typography>
            )}
            {task.plannedDuration && (
              <Typography variant="body2" color="text.secondary">
                Плановое время: {formatDuration(task.plannedDuration * 60)}
              </Typography>
            )}
          </Box>

          <Box display="flex" gap={1} flexWrap="wrap">
            <TaskStatusChip status={task.status as TaskStatus} />
            {task.priority && <TaskPriorityChip priority={task.priority} />}
          </Box>

          {/* Отображение фотографий для задач на проверке */}
          {showActions && hasPhotos && (
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Фотофиксация:
              </Typography>
              <Grid container spacing={1}>
                {timeEntries.map((entry, index) => (
                  <React.Fragment key={entry.id}>
                    {entry.startPhotoUrl && (
                      <Grid item xs={6}>
                        <Box
                          component="img"
                          src={entry.startPhotoUrl}
                          alt="Фото ДО"
                          sx={{
                            width: '100%',
                            height: 100,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider'
                          }}
                        />
                        <Typography variant="caption" display="block" align="center">
                          Фото ДО #{index + 1}
                        </Typography>
                      </Grid>
                    )}
                    {entry.endPhotoUrl && (
                      <Grid item xs={6}>
                        <Box
                          component="img"
                          src={entry.endPhotoUrl}
                          alt="Фото ПОСЛЕ"
                          sx={{
                            width: '100%',
                            height: 100,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'success.main'
                          }}
                        />
                        <Typography variant="caption" display="block" align="center">
                          Фото ПОСЛЕ #{index + 1}
                        </Typography>
                      </Grid>
                    )}
                  </React.Fragment>
                ))}
              </Grid>
            </Box>
          )}
        </CardContent>

        {showActions && (
          <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
            <Button
              size="small"
              startIcon={<ViewIcon />}
              onClick={() => {
                setSelectedTask(task);
                setDetailsOpen(true);
              }}
            >
              Подробнее
            </Button>
            <Box>
              <Button
                size="small"
                color="success"
                variant="contained"
                startIcon={<ApproveIcon />}
                onClick={() => handleOpenReviewDialog(task, 'approve')}
                sx={{ mr: 1 }}
              >
                Утвердить
              </Button>
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<RejectIcon />}
                onClick={() => handleOpenReviewDialog(task, 'reject')}
              >
                На доработку
              </Button>
            </Box>
          </CardActions>
        )}
      </Card>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Проверка задач
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab 
            label={
              <Badge badgeContent={tasksForReview.length} color="error">
                <span>На проверке</span>
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={tasksInProgress.length} color="primary">
                <span>В работе</span>
              </Badge>
            } 
          />
          <Tab label="Завершенные" />
        </Tabs>
      </Box>

      {/* Задачи на проверке */}
      <TabPanel value={tabValue} index={0}>
        {tasksForReview.length === 0 ? (
          <Alert severity="info">
            Нет задач, ожидающих проверки
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {tasksForReview.map(task => (
              <Grid item xs={12} md={6} key={task.id}>
                {renderTaskCard(task, true)}
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Задачи в работе */}
      <TabPanel value={tabValue} index={1}>
        {tasksInProgress.length === 0 ? (
          <Alert severity="info">
            Нет задач в работе
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {tasksInProgress.map(task => (
              <Grid item xs={12} md={6} lg={4} key={task.id}>
                {renderTaskCard(task, false)}
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Завершенные задачи */}
      <TabPanel value={tabValue} index={2}>
        {tasksCompleted.length === 0 ? (
          <Alert severity="info">
            Нет завершенных задач
          </Alert>
        ) : (
          <List>
            {tasksCompleted.map(task => (
              <ListItem key={task.id}>
                <ListItemAvatar>
                  <Avatar>
                    <TaskIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={task.task}
                  secondary={
                    <Box>
                      <Typography variant="body2" component="span">
                        {task.projectName} • {task.assigneeName}
                      </Typography>
                      {task.reviewComment && (
                        <Typography variant="body2" color="text.secondary">
                          Комментарий: {task.reviewComment}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <Box display="flex" gap={1}>
                  <TaskStatusChip status={task.status as TaskStatus} />
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedTask(task);
                      setDetailsOpen(true);
                    }}
                  >
                    <ViewIcon />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </TabPanel>

      {/* Диалог проверки */}
      <Dialog
        open={reviewDialog.open}
        onClose={() => setReviewDialog({ open: false, task: null, action: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {reviewDialog.action === 'approve' ? 'Утвердить задачу' : 'Вернуть на доработку'}
        </DialogTitle>
        <DialogContent>
          {reviewDialog.task && (
            <Box mb={2}>
              <Typography variant="subtitle1" gutterBottom>
                {reviewDialog.task.task}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Исполнитель: {reviewDialog.task.assigneeName}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label={reviewDialog.action === 'approve' ? 'Комментарий (опционально)' : 'Причина возврата'}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            required={reviewDialog.action === 'reject'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog({ open: false, task: null, action: null })}>
            Отмена
          </Button>
          <Button
            variant="contained"
            color={reviewDialog.action === 'approve' ? 'success' : 'error'}
            onClick={handleReview}
            disabled={reviewDialog.action === 'reject' && !reviewComment}
          >
            {reviewDialog.action === 'approve' ? 'Утвердить' : 'Вернуть'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог деталей задачи */}
      <TaskDetailsDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        task={selectedTask}
        onStatusChange={async (taskId, newStatus) => {
          if (!currentUser) return;
          try {
            await changeTaskStatus(currentUser.uid, taskId, newStatus);
          } catch (error) {
            console.error('Error changing status:', error);
          }
        }}
        isManager={true}
      />
    </Box>
  );
};

export default TaskReviewPage;

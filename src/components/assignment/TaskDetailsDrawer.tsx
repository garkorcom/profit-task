import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  Avatar,
  Button,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Camera as CameraIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  CheckCircle as CompleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { 
  AssignmentTask, 
  AssignmentTaskComment 
} from '../../types/taskAssignment';
import AssignmentTaskStatusChip from './AssignmentTaskStatusChip';
import AssignmentTaskPriorityChip from './AssignmentTaskPriorityChip';
import { useAuth } from '../../auth/AuthContext';
import { 
  getAssignmentTaskComments, 
  addAssignmentTaskComment, 
  markAssignmentTaskCommentsAsRead 
} from '../../api/taskAssignmentApi';
import { formatDistanceToNow, format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TaskDetailsDrawerProps {
  open: boolean;
  task: AssignmentTask | null;
  onClose: () => void;
  onStartWork?: (task: AssignmentTask) => void;
  onPauseWork?: (task: AssignmentTask) => void;
  onCompleteTask?: (task: AssignmentTask) => void;
  currentUserId?: string;
  isWorking?: boolean;
  canStartWork?: boolean;
}

const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({
  open,
  task,
  onClose,
  onStartWork,
  onPauseWork,
  onCompleteTask,
  currentUserId,
  isWorking = false,
  canStartWork = true
}) => {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<AssignmentTaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    if (open && task) {
      loadComments();
      // Mark comments as read when opening
      if (task.unreadCount && task.unreadCount > 0 && currentUser) {
        markAssignmentTaskCommentsAsRead(task.id, currentUser.uid);
      }
    }
  }, [open, task, currentUser]);

  const loadComments = async () => {
    if (!task) return;
    
    setCommentsLoading(true);
    try {
      const commentsData = await getAssignmentTaskComments(task.id);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!task || !currentUser || !newComment.trim()) return;
    
    setSendingComment(true);
    try {
      await addAssignmentTaskComment(task.id, newComment.trim());
      
      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Error sending comment:', error);
      alert('Ошибка отправки комментария');
    } finally {
      setSendingComment(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendComment();
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}ч ${minutes}мин`;
    }
    return `${minutes}мин`;
  };

  const getActionButton = () => {
    if (!task || !canStartWork) return null;
    
    const isAssignedToCurrentUser = task.assignedTo === currentUserId;
    if (!isAssignedToCurrentUser) return null;

    switch (task.status) {
      case 'assigned':
      case 'acknowledged':
        return (
          <Button
            startIcon={<StartIcon />}
            onClick={() => onStartWork?.(task)}
            variant="contained"
            fullWidth
            size="large"
          >
            Начать работу
          </Button>
        );
      
      case 'started':
      case 'in_progress':
        if (isWorking) {
          return (
            <Button
              startIcon={<PauseIcon />}
              onClick={() => onPauseWork?.(task)}
              variant="outlined"
              fullWidth
              size="large"
              color="warning"
            >
              Приостановить
            </Button>
          );
        } else {
          return (
            <Button
              startIcon={<StartIcon />}
              onClick={() => onStartWork?.(task)}
              variant="contained"
              fullWidth
              size="large"
            >
              Продолжить работу
            </Button>
          );
        }
      
      case 'paused':
        return (
          <Button
            startIcon={<StartIcon />}
            onClick={() => onStartWork?.(task)}
            variant="contained"
            fullWidth
            size="large"
          >
            Продолжить работу
          </Button>
        );
      
      case 'completed':
        return (
          <Button
            startIcon={<CompleteIcon />}
            variant="contained"
            fullWidth
            size="large"
            color="success"
            disabled
          >
            Задача завершена
          </Button>
        );
      
      default:
        return null;
    }
  };

  if (!task) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 480, md: 600 } }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1}>
              <Typography variant="h6" component="h2" gutterBottom>
                {task.title}
              </Typography>
              <Box display="flex" gap={1} mb={2}>
                <AssignmentTaskStatusChip status={task.status} />
                <AssignmentTaskPriorityChip priority={task.priority} />
              </Box>
            </Box>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          {/* Action Button */}
          <Box sx={{ mt: 2 }}>
            {getActionButton()}
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {/* Description */}
          {task.description && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Описание
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {task.description}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Task Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Информация о задаче
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      Исполнитель
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    {task.assignedToName || task.assignedTo}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      Назначил
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    {task.assignedByName || task.assignedBy}
                  </Typography>
                </Grid>

                {task.dueDate && (
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        Срок выполнения
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      {format(task.dueDate.toDate(), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </Typography>
                  </Grid>
                )}

                {task.timeSpent && task.timeSpent > 0 && (
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        Время работы
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      {formatTime(task.timeSpent)}
                    </Typography>
                  </Grid>
                )}

                {task.projectName && (
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="caption" color="text.secondary">
                        Проект
                      </Typography>
                    </Box>
                    <Chip label={task.projectName} size="small" variant="outlined" />
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Requirements */}
          {(task.requireLocation || task.requireStartPhoto || task.requireEndPhoto) && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Требования
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {task.requireLocation && (
                    <Chip 
                      icon={<LocationIcon />} 
                      label="GPS обязателен" 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  )}
                  {task.requireStartPhoto && (
                    <Chip 
                      icon={<CameraIcon />} 
                      label="Фото начала" 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  )}
                  {task.requireEndPhoto && (
                    <Chip 
                      icon={<CameraIcon />} 
                      label="Фото завершения" 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Комментарии ({comments.length})
              </Typography>
              
              {commentsLoading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : comments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" p={2}>
                  Пока нет комментариев
                </Typography>
              ) : (
                <List dense>
                  {comments.map((comment) => (
                    <ListItem key={comment.id} alignItems="flex-start" sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {comment.userName?.[0]?.toUpperCase() || 'U'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2">
                              {comment.userName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDistanceToNow(comment.timestamp.toDate(), { 
                                addSuffix: true, 
                                locale: ru 
                              })}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            {comment.text}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Comment Input */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box display="flex" gap={1}>
            <TextField
              fullWidth
              placeholder="Добавить комментарий..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={handleKeyPress}
              multiline
              maxRows={3}
              size="small"
              disabled={sendingComment}
            />
            <IconButton 
              color="primary" 
              onClick={handleSendComment}
              disabled={!newComment.trim() || sendingComment}
            >
              {sendingComment ? <CircularProgress size={20} /> : <SendIcon />}
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

export default TaskDetailsDrawer;
import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Button,
  Chip,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  CheckCircle as CompleteIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Comment as CommentIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { AssignmentTask } from '../../types/taskAssignment';
import AssignmentTaskStatusChip from './AssignmentTaskStatusChip';
import AssignmentTaskPriorityChip from './AssignmentTaskPriorityChip';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface AssignmentTaskCardProps {
  task: AssignmentTask;
  onStartWork?: (task: AssignmentTask) => void;
  onPauseWork?: (task: AssignmentTask) => void;
  onCompleteTask?: (task: AssignmentTask) => void;
  onViewDetails?: (task: AssignmentTask) => void;
  onOpenMenu?: (task: AssignmentTask, anchorEl: HTMLElement) => void;
  currentUserId?: string;
  isWorking?: boolean;
  canStartWork?: boolean;
}

const AssignmentTaskCard: React.FC<AssignmentTaskCardProps> = ({
  task,
  onStartWork,
  onPauseWork,
  onCompleteTask,
  onViewDetails,
  onOpenMenu,
  currentUserId,
  isWorking = false,
  canStartWork = true
}) => {
  const isAssignedToCurrentUser = task.assignedTo === currentUserId;
  const canWork = isAssignedToCurrentUser && canStartWork;
  
  const handleStartWork = () => {
    onStartWork?.(task);
  };

  const handlePauseWork = () => {
    onPauseWork?.(task);
  };

  const handleCompleteTask = () => {
    onCompleteTask?.(task);
  };

  const handleCardClick = () => {
    onViewDetails?.(task);
  };

  const handleMoreClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onOpenMenu?.(task, event.currentTarget);
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
    if (!canWork) return null;

    switch (task.status) {
      case 'assigned':
      case 'acknowledged':
        return (
          <Button
            startIcon={<StartIcon />}
            onClick={handleStartWork}
            variant="contained"
            size="small"
            color="primary"
          >
            Начать
          </Button>
        );
      
      case 'started':
      case 'in_progress':
        if (isWorking) {
          return (
            <Button
              startIcon={<PauseIcon />}
              onClick={handlePauseWork}
              variant="outlined"
              size="small"
              color="warning"
            >
              Пауза
            </Button>
          );
        } else {
          return (
            <Button
              startIcon={<StartIcon />}
              onClick={handleStartWork}
              variant="contained"
              size="small"
              color="primary"
            >
              Продолжить
            </Button>
          );
        }
      
      case 'paused':
        return (
          <Button
            startIcon={<StartIcon />}
            onClick={handleStartWork}
            variant="contained"
            size="small"
            color="primary"
          >
            Продолжить
          </Button>
        );
      
      case 'completed':
        return (
          <Button
            startIcon={<CompleteIcon />}
            onClick={handleCompleteTask}
            variant="contained"
            size="small"
            color="success"
            disabled
          >
            Завершено
          </Button>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card 
      sx={{ 
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3
        },
        border: isWorking ? '2px solid' : '1px solid',
        borderColor: isWorking ? 'primary.main' : 'divider'
      }}
      onClick={handleCardClick}
    >
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box flex={1}>
            <Typography variant="h6" component="h3" gutterBottom>
              {task.title}
            </Typography>
            <Box display="flex" gap={1} mb={1}>
              <AssignmentTaskStatusChip status={task.status} />
              <AssignmentTaskPriorityChip priority={task.priority} />
            </Box>
          </Box>
          <IconButton size="small" onClick={handleMoreClick}>
            <MoreIcon />
          </IconButton>
        </Box>

        {/* Description */}
        {task.description && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            {task.description.length > 120 
              ? `${task.description.slice(0, 120)}...` 
              : task.description
            }
          </Typography>
        )}

        {/* Metadata */}
        <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
          {/* Assignee */}
          <Box display="flex" alignItems="center" gap={0.5}>
            <PersonIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {task.assignedToName || task.assignedTo}
            </Typography>
          </Box>

          {/* Due Date */}
          {task.dueDate && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <ScheduleIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {formatDistanceToNow(task.dueDate.toDate(), { 
                  addSuffix: true, 
                  locale: ru 
                })}
              </Typography>
            </Box>
          )}

          {/* Time Tracking */}
          {task.timeSpent && task.timeSpent > 0 && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <ScheduleIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {formatTime(task.timeSpent)}
              </Typography>
            </Box>
          )}

          {/* Location */}
          {task.requireLocation && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <LocationIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                GPS требуется
              </Typography>
            </Box>
          )}

          {/* Unread Comments */}
          {task.unreadCount && task.unreadCount > 0 && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <CommentIcon fontSize="small" color="primary" />
              <Typography variant="caption" color="primary">
                {task.unreadCount} новых
              </Typography>
            </Box>
          )}
        </Box>

        {/* Project Info */}
        {task.projectName && (
          <Chip
            label={task.projectName}
            size="small"
            variant="outlined"
            color="default"
          />
        )}
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {formatDistanceToNow(task.createdAt.toDate(), { 
              addSuffix: true, 
              locale: ru 
            })}
          </Typography>
        </Box>
        <Box>
          {getActionButton()}
        </Box>
      </CardActions>
    </Card>
  );
};

export default AssignmentTaskCard;
/**
 * Унифицированная карточка задачи
 * Поддерживает отображение как EstimateTask, так и ProjectTask
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  IconButton,
  Box,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Assignment as TaskIcon,
  AttachMoney as MoneyIcon,
  Build as BuildIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { 
  UnifiedTask, 
  isEstimateTask, 
  isProjectTask,
  EstimateTaskUnified,
  ProjectTaskUnified 
} from '../../../types/unified-task.types';
import TaskStatusChip from '../TaskStatusChip';
import TaskPriorityChip from '../TaskPriorityChip';

interface UnifiedTaskCardProps {
  task: UnifiedTask;
  onEdit?: (task: UnifiedTask) => void;
  onDelete?: (taskId: string) => void;
  onDuplicate?: (taskId: string) => void;
  onStatusChange?: (taskId: string, newStatus: any) => void;
  compact?: boolean;
  showActions?: boolean;
  // Time tracking integration
  showTimeTracking?: boolean;
  isActiveTimeEntry?: boolean;
  onTimeTrackingAction?: (action: 'start' | 'stop') => void;
  // Style overrides
  sx?: any;
}

const UnifiedTaskCard: React.FC<UnifiedTaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange,
  compact = false,
  showActions = true,
  showTimeTracking = false,
  isActiveTimeEntry = false,
  onTimeTrackingAction,
  sx
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit?.(task);
    handleMenuClose();
  };

  const handleDelete = () => {
    onDelete?.(task.id);
    handleMenuClose();
  };

  const handleDuplicate = () => {
    onDuplicate?.(task.id);
    handleMenuClose();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const calculateProgress = (): number => {
    if (isProjectTask(task)) {
      return task.progressPct;
    }
    // Для EstimateTask рассчитываем прогресс на основе статуса
    const statusProgress: Record<string, number> = {
      'new': 0,
      'assigned': 10,
      'in_progress': 50,
      'on_hold': 50,
      'review': 80,
      'rework': 60,
      'completed': 100,
      'cancelled': 0
    };
    return statusProgress[task.status] || 0;
  };

  const renderTaskTypeIndicator = () => {
    if (isEstimateTask(task)) {
      return (
        <Tooltip title="Задача планирования (смета)">
          <Chip
            icon={<TaskIcon />}
            label="Планирование"
            size="small"
            variant="outlined"
            color="info"
          />
        </Tooltip>
      );
    } else {
      return (
        <Tooltip title="Задача выполнения (проект)">
          <Chip
            icon={<BuildIcon />}
            label="Выполнение"
            size="small"
            variant="outlined"
            color="primary"
          />
        </Tooltip>
      );
    }
  };

  const renderPhaseSpecificInfo = () => {
    if (isEstimateTask(task)) {
      const estimateTask = task as EstimateTaskUnified;
      return (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          <Chip
            label={`Режим: ${estimateTask.includeMode}`}
            size="small"
            variant="outlined"
            color={
              estimateTask.includeMode === 'COGS' ? 'success' :
              estimateTask.includeMode === 'OH' ? 'warning' : 'default'
            }
          />
        </Box>
      );
    } else {
      const projectTask = task as ProjectTaskUnified;
      return (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          {projectTask.wbsCode && (
            <Chip
              label={`WBS: ${projectTask.wbsCode}`}
              size="small"
              variant="outlined"
            />
          )}
          {projectTask.plannedCost > 0 && (
            <Chip
              icon={<MoneyIcon />}
              label={`${projectTask.plannedCost.toLocaleString('ru-RU')} ₽`}
              size="small"
              variant="outlined"
              color="success"
            />
          )}
        </Box>
      );
    }
  };

  const renderProgressBar = () => {
    const progress = calculateProgress();
    
    return (
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Прогресс
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {progress}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          color={
            progress === 100 ? 'success' :
            progress >= 80 ? 'info' :
            progress >= 50 ? 'primary' :
            progress >= 20 ? 'warning' : 'error'
          }
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>
    );
  };

  const renderTimeInfo = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <ScheduleIcon fontSize="small" color="action" />
        <Typography variant="caption" color="text.secondary">
          План: {task.plannedHours}ч
        </Typography>
      </Box>
      {task.actualHours && (
        <Typography variant="caption" color="text.secondary">
          Факт: {task.actualHours}ч
        </Typography>
      )}
    </Box>
  );

  const renderAssignee = () => {
    if (!task.assignedUserId && !task.assignedRole) return null;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <Avatar sx={{ width: 24, height: 24 }}>
          <PersonIcon fontSize="small" />
        </Avatar>
        <Typography variant="caption" color="text.secondary">
          {task.assignedRole || 'Назначен исполнитель'}
        </Typography>
      </Box>
    );
  };

  const renderDates = () => {
    if (!task.plannedStartDate && !task.plannedEndDate) return null;

    return (
      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {task.plannedStartDate && `С ${formatDate(task.plannedStartDate)}`}
          {task.plannedStartDate && task.plannedEndDate && ' '}
          {task.plannedEndDate && `до ${formatDate(task.plannedEndDate)}`}
        </Typography>
      </Box>
    );
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 2
        },
        ...(isActiveTimeEntry && {
          border: 2,
          borderColor: 'success.main',
          backgroundColor: 'success.50'
        }),
        ...sx
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: compact ? 1 : 2 }}>
        {/* Заголовок с типом задачи */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          {renderTaskTypeIndicator()}
          {showActions && (
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{ mt: -0.5 }}
            >
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>

        {/* Название задачи */}
        <Typography 
          variant={compact ? "body2" : "h6"}
          component="h3"
          sx={{ 
            mb: 1,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {task.name}
        </Typography>

        {/* Описание */}
        {task.description && !compact && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {task.description}
          </Typography>
        )}

        {/* Статус и приоритет */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <TaskStatusChip status={task.status} />
          <TaskPriorityChip priority={task.priority === 'urgent' ? 'critical' : task.priority as any} />
        </Box>

        {/* Специфичная информация по фазе */}
        {renderPhaseSpecificInfo()}

        {!compact && (
          <>
            {/* Прогресс */}
            {renderProgressBar()}

            {/* Временная информация */}
            {renderTimeInfo()}

            {/* Исполнитель */}
            {renderAssignee()}

            {/* Даты */}
            {renderDates()}

            {/* Теги */}
            {task.tags && task.tags.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {task.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </CardContent>

      {/* Time Tracking Actions */}
      {showTimeTracking && onTimeTrackingAction && (
        <CardActions sx={{ pt: 0, justifyContent: 'center' }}>
          <IconButton
            onClick={() => onTimeTrackingAction(isActiveTimeEntry ? 'stop' : 'start')}
            size="small"
            sx={{
              border: 1,
              borderColor: isActiveTimeEntry ? 'error.main' : 'success.main',
              color: isActiveTimeEntry ? 'error.main' : 'success.main'
            }}
          >
            {isActiveTimeEntry ? <StopIcon /> : <PlayArrowIcon />}
          </IconButton>
        </CardActions>
      )}

      {/* Меню действий */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {onEdit && (
          <MenuItem onClick={handleEdit}>
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            Редактировать
          </MenuItem>
        )}
        {onDuplicate && (
          <MenuItem onClick={handleDuplicate}>
            <DuplicateIcon sx={{ mr: 1 }} fontSize="small" />
            Дублировать
          </MenuItem>
        )}
        {onDelete && (
          <>
            <Divider />
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
              Удалить
            </MenuItem>
          </>
        )}
      </Menu>
    </Card>
  );
};

export default UnifiedTaskCard;
import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { TaskStatus } from '../../api/taskApi';

interface TaskStatusChipProps {
  status: TaskStatus;
  size?: ChipProps['size'];
  variant?: ChipProps['variant'];
}

const statusConfig: Record<TaskStatus, {
  label: string;
  color: ChipProps['color'];
}> = {
  'new': {
    label: 'Новая',
    color: 'default'
  },
  'assigned': {
    label: 'Назначена',
    color: 'info'
  },
  'in_progress': {
    label: 'В работе',
    color: 'primary'
  },
  'on_hold': {
    label: 'Приостановлена',
    color: 'warning'
  },
  'review': {
    label: 'На проверке',
    color: 'secondary'
  },
  'rework': {
    label: 'На доработку',
    color: 'error'
  },
  'completed': {
    label: 'Выполнена',
    color: 'success'
  },
  'cancelled': {
    label: 'Отменена',
    color: 'default'
  }
};

const TaskStatusChip: React.FC<TaskStatusChipProps> = ({ 
  status, 
  size = 'small',
  variant = 'filled'
}) => {
  const config = statusConfig[status] || statusConfig['new'];
  
  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant={variant}
    />
  );
};

export default TaskStatusChip;

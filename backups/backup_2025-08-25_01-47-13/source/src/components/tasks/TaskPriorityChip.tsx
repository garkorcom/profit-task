import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { 
  KeyboardArrowDown as LowIcon,
  Remove as MediumIcon,
  KeyboardArrowUp as HighIcon,
  PriorityHigh as CriticalIcon
} from '@mui/icons-material';
import { TaskPriority } from '../../api/taskApi';

interface TaskPriorityChipProps {
  priority: TaskPriority;
  size?: ChipProps['size'];
  showIcon?: boolean;
}

const priorityConfig: Record<TaskPriority, {
  label: string;
  color: ChipProps['color'];
  icon?: React.ReactElement;
}> = {
  'low': {
    label: 'Низкий',
    color: 'default',
    icon: <LowIcon />
  },
  'medium': {
    label: 'Средний',
    color: 'info',
    icon: <MediumIcon />
  },
  'high': {
    label: 'Высокий',
    color: 'warning',
    icon: <HighIcon />
  },
  'critical': {
    label: 'Критический',
    color: 'error',
    icon: <CriticalIcon />
  }
};

const TaskPriorityChip: React.FC<TaskPriorityChipProps> = ({ 
  priority, 
  size = 'small',
  showIcon = true
}) => {
  const config = priorityConfig[priority] || priorityConfig['medium'];
  
  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      icon={showIcon ? config.icon : undefined}
      variant="outlined"
    />
  );
};

export default TaskPriorityChip;

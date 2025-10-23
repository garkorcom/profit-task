import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { 
  AssignmentTaskStatus, 
  getStatusColor, 
  getStatusLabel 
} from '../../types/taskAssignment';

interface AssignmentTaskStatusChipProps extends Omit<ChipProps, 'color' | 'label'> {
  status: AssignmentTaskStatus;
  showIcon?: boolean;
}

const AssignmentTaskStatusChip: React.FC<AssignmentTaskStatusChipProps> = ({
  status,
  showIcon = true,
  ...chipProps
}) => {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <Chip
      label={label}
      color={color as ChipProps['color']}
      size="small"
      variant="filled"
      {...chipProps}
      sx={{
        fontWeight: 500,
        ...chipProps.sx
      }}
    />
  );
};

export default AssignmentTaskStatusChip;
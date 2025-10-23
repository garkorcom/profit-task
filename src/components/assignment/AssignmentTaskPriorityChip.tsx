import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { 
  AssignmentTaskPriority, 
  getPriorityColor, 
  getPriorityLabel 
} from '../../types/taskAssignment';

interface AssignmentTaskPriorityChipProps extends Omit<ChipProps, 'color' | 'label'> {
  priority: AssignmentTaskPriority;
}

const AssignmentTaskPriorityChip: React.FC<AssignmentTaskPriorityChipProps> = ({
  priority,
  ...chipProps
}) => {
  const color = getPriorityColor(priority);
  const label = getPriorityLabel(priority);

  return (
    <Chip
      label={label}
      color={color as ChipProps['color']}
      size="small"
      variant="outlined"
      {...chipProps}
      sx={{
        fontWeight: 500,
        ...chipProps.sx
      }}
    />
  );
};

export default AssignmentTaskPriorityChip;
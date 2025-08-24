export const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'high': return 'error';
    case 'medium': return 'warning';
    case 'low': return 'success';
    default: return 'default';
  }
};

export const getStatusColor = (status?: string) => {
  switch (status) {
    case 'completed': return 'success';
    case 'in_progress': return 'warning';
    case 'pending': return 'info';
    default: return 'default';
  }
};

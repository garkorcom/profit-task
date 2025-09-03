/**
 * TaskListItem - обертка над UnifiedTaskCard для операционного обзора
 * Обеспечивает единую точку управления задачами через SSOT архитектуру
 */

import React from 'react';
import { UnifiedTask } from '../../types/unified-task.types';
import UnifiedTaskCard from '../tasks/unified/UnifiedTaskCard';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';

interface TaskListItemProps {
  task: UnifiedTask;
}

const TaskListItem: React.FC<TaskListItemProps> = ({ task }) => {
  const { 
    currentEntry, 
    isWorking,
    startWork,
    stopWork
  } = useTimeTracking();
  const isCurrentTask = currentEntry?.taskId === task.id;

  // Интеграция с время-трекингом через унифицированную систему
  const handleTimeTrackingAction = async (action: 'start' | 'stop') => {
    try {
      if (action === 'start') {
        // Останавливаем текущий таймер если нужно
        if (isWorking && currentEntry && currentEntry.taskId !== task.id) {
          await stopWork();
        }
        
        // Запускаем новый таймер
        await startWork({
          project: { 
            id: task.phase === 'execution' ? (task as any).projectId : undefined,
            name: task.name
          },
          task: task.phase === 'execution' ? {
            id: task.id,
            task: task.name,
            projectId: (task as any).projectId,
            projectName: task.name
          } : undefined,
          estimate: task.phase === 'pre_construction' ? {
            id: (task as any).estimateId || '',
            number: task.name,
            items: [],
            subtotal: 0,
            total: 0
          } : undefined
        });
      } else {
        await stopWork();
      }
    } catch (error) {
      console.error('Time tracking error:', error);
    }
  };

  return (
    <UnifiedTaskCard
      task={task}
      onEdit={() => console.log('Edit task:', task.id)}
      onDelete={() => console.log('Delete task:', task.id)}
      showActions={true}
      compact={true}
      showTimeTracking={true}
      isActiveTimeEntry={isCurrentTask}
      onTimeTrackingAction={handleTimeTrackingAction}
      sx={{
        mb: 1,
        ml: 3
      }}
    />
  );
};

export default TaskListItem;
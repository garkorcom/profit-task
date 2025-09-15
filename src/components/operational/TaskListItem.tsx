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
          await stopWork(undefined, undefined, undefined, true);
        }
        
        // Запускаем новый таймер
        await startWork({
          project: task.phase === 'execution' ? {
            id: (task as any).projectId,
            name: task.name,
            type: 'residential_new' as any,
            status: 'active' as any,
            priority: 'medium' as any,
            location: { address: '', city: '', country: '' } as any,
            participants: [] as any,
            financials: { currency: 'RUB' } as any
          } as any : {
            id: 'temp',
            name: 'Временный проект',
            type: 'residential_new' as any,
            status: 'active' as any,
            priority: 'medium' as any,
            location: { address: '', city: '', country: '' } as any,
            participants: [] as any,
            financials: { currency: 'RUB' } as any
          } as any,
          task: task.phase === 'execution' ? {
            id: task.id,
            task: task.name,
            projectId: (task as any).projectId,
            projectName: task.name
          } : undefined,
          estimate: task.phase === 'pre_construction' ? {
            id: (task as any).estimateId || '',
            number: task.name,
            status: 'draft' as any,
            revision: 1,
            currency: 'RUB',
            totals: {
              materialsCost: 0,
              laborCost: 0,
              equipmentCost: 0,
              subcontractCost: 0,
              overheadPct: 0,
              overheadAmt: 0,
              discountAmt: 0,
              shippingAmt: 0,
              subtotalPrice: 0,
              taxAmt: 0,
              grandTotal: 0,
              grossMarginPct: 0
            },
            blocks: [],
            createdBy: '',
            createdAt: '',
            updatedAt: ''
          } as any : undefined
        });
      } else {
        await stopWork(undefined, undefined, undefined, true);
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
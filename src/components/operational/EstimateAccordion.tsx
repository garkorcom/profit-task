/**
 * EstimateAccordion - L4: Задачи сметы  
 * Управляет состоянием раскрытия и ленивой загрузкой задач сметы
 */

import React, { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  CircularProgress,
  Chip,
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Description as EstimateIcon
} from '@mui/icons-material';
import { Estimate } from '../../types/estimate.types';
import { Task } from '../../api/taskApi';
import { useAuth } from '../../auth/AuthContext';
import { getTasksStream } from '../../api/taskApi';
import TaskListItem from './TaskListItem';

interface EstimateAccordionProps {
  estimate: Estimate;
}

const EstimateAccordion: React.FC<EstimateAccordionProps> = ({ estimate }) => {
  const { currentUser } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ленивая загрузка задач при раскрытии аккордеона
  useEffect(() => {
    if (!isExpanded || !currentUser?.uid) {
      return;
    }

    console.log(`🔄 Loading tasks for estimate: ${estimate.number} v${estimate.revision}`);
    setIsLoading(true);
    setError(null);

    const unsubscribe = getTasksStream(
      currentUser.uid,
      (data: Task[]) => {
        // Фильтруем задачи только для данной сметы
        const filtered = data.filter(task => 
          task.estimateItemId === estimate.id && 
          task.status && ['in_progress', 'qa'].includes(task.status)  // Только статусы для работы
        );
        console.log(`📝 Estimate tasks loaded for ${estimate.number}: ${filtered.length}`);
        setTasks(filtered);
        setIsLoading(false);
      }
    );

    return () => {
      console.log(`🧹 Cleaning up tasks stream for estimate: ${estimate.number}`);
      unsubscribe();
    };
  }, [isExpanded, currentUser?.uid, estimate.id, estimate.number, estimate.revision]);

  const handleExpansion = (event: React.SyntheticEvent, expanded: boolean) => {
    setIsExpanded(expanded);
  };

  const getVersionLabel = () => {
    if (estimate.revision && estimate.revision > 1) {
      return `v${estimate.revision}`;
    }
    return null;
  };

  return (
    <Accordion 
      expanded={isExpanded} 
      onChange={handleExpansion}
      sx={{ mb: 1, ml: 2 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <EstimateIcon color="info" />
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" component="div">
              {estimate.number}
            </Typography>
            
            {estimate.terms && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {estimate.terms}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={estimate.status === 'accepted' ? 'Принята' : estimate.status} 
              color="success"
              size="small"
            />
            
            {getVersionLabel() && (
              <Chip 
                label={getVersionLabel()} 
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        </Box>
      </AccordionSummary>
      
      <AccordionDetails>
        {/* Loading State */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Empty State */}
        {!isLoading && !error && tasks.length === 0 && (
          <Alert severity="info">
            У данной сметы нет активных задач для работы
          </Alert>
        )}

        {/* Tasks List */}
        {!isLoading && !error && tasks.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Задачи ({tasks.length})
            </Typography>
            
            {tasks.map((task) => (
              <TaskListItem
                key={task.id}
                task={{
                  id: task.id,
                  name: task.task || 'Задача без названия',
                  phase: 'pre_construction' as const,
                  status: task.status as any || 'new',
                  priority: 'medium' as any,
                  plannedHours: 0,
                  description: task.description,
                  estimateId: estimate.id,
                  includeMode: 'COGS' as const,
                  createdBy: '',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                } as any}
              />
            ))}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default EstimateAccordion;
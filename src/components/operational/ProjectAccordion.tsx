/**
 * ProjectAccordion - L3: Сметы и задачи проекта
 * Управляет состоянием раскрытия и ленивой загрузкой смет и задач проекта
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
  Alert,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Folder as FolderIcon,
  Assignment as TaskIcon
} from '@mui/icons-material';
import { Project } from '../../types/project.types';
import { Estimate } from '../../types/estimate.types';
import { Task } from '../../api/taskApi';
import { useAuth } from '../../auth/AuthContext';
import { getEstimatesStream } from '../../api/estimateV2StreamApi';
import { getTasksStream } from '../../api/taskApi';
import EstimateAccordion from './EstimateAccordion';
import TaskListItem from './TaskListItem';

interface ProjectAccordionProps {
  project: Project;
}

const ProjectAccordion: React.FC<ProjectAccordionProps> = ({ project }) => {
  const { currentUser } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [isLoadingEstimates, setIsLoadingEstimates] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ленивая загрузка смет и задач при раскрытии аккордеона
  useEffect(() => {
    if (!isExpanded || !currentUser?.uid) {
      return;
    }

    console.log(`🔄 Loading estimates and tasks for project: ${project.name}`);
    setError(null);

    // Загрузка смет
    setIsLoadingEstimates(true);
    const unsubscribeEstimates = getEstimatesStream(
      currentUser.uid,
      '',  // For compatibility - ignored
      (data: Estimate[]) => {
        // Filter by project and status
        const filtered = data.filter(estimate => 
          estimate.projectId === project.id && 
          estimate.status === 'accepted'
        );
        console.log(`📋 Estimates loaded for project ${project.name}: ${filtered.length}`);
        setEstimates(filtered);
        setIsLoadingEstimates(false);
      },
      {
        projectId: project.id,
        status: ['accepted']
      }
    );

    // Загрузка задач проекта (не привязанных к смете)
    setIsLoadingTasks(true);
    const unsubscribeTasks = getTasksStream(
      currentUser.uid,
      (data: Task[]) => {
        // Фильтруем задачи только для данного проекта
        const filtered = data.filter(task => 
          task.projectId === project.id && 
          !task.estimateItemId &&  // Задачи НЕ привязанные к смете (используем estimateItemId)
          task.status && ['in_progress', 'qa'].includes(task.status)  // Только статусы для работы
        );
        console.log(`📝 Project tasks loaded for ${project.name}: ${filtered.length}`);
        setProjectTasks(filtered);
        setIsLoadingTasks(false);
      }
    );

    return () => {
      console.log(`🧹 Cleaning up streams for project: ${project.name}`);
      unsubscribeEstimates();
      unsubscribeTasks();
    };
  }, [isExpanded, currentUser?.uid, project.id, project.name]);

  const handleExpansion = (event: React.SyntheticEvent, expanded: boolean) => {
    setIsExpanded(expanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'planned': return 'info';
      case 'completed': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'planned': return 'Планируется';
      case 'completed': return 'Завершен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  };

  const isLoading = isLoadingEstimates || isLoadingTasks;

  return (
    <Accordion 
      expanded={isExpanded} 
      onChange={handleExpansion}
      sx={{ mb: 1, ml: 2 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <FolderIcon color="secondary" />
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" component="div">
              {project.name}
            </Typography>
            
            {project.description && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {project.description}
              </Typography>
            )}
          </Box>

          <Chip 
            label={getStatusLabel(project.status)} 
            color={getStatusColor(project.status) as any}
            size="small"
          />
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

        {/* Content */}
        {!isLoading && !error && (
          <Box>
            {/* Project Tasks Section */}
            {projectTasks.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TaskIcon color="action" fontSize="small" />
                  <Typography variant="subtitle2" color="text.secondary">
                    Задачи проекта ({projectTasks.length})
                  </Typography>
                </Box>
                
                {projectTasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={{
                      id: task.id,
                      name: task.task || 'Без названия',
                      phase: 'execution' as const,
                      status: task.status as any || 'new',
                      priority: 'medium' as any,
                      plannedHours: 0,
                      description: task.description,
                      projectId: project.id,
                      plannedCost: 0,
                      progressPct: 0,
                      createdBy: '',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    } as any}
                  />
                ))}
                
                {estimates.length > 0 && <Divider sx={{ my: 2 }} />}
              </Box>
            )}

            {/* Estimates Section */}
            {estimates.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  Принятые сметы ({estimates.length})
                </Typography>
                
                {estimates.map((estimate) => (
                  <EstimateAccordion
                    key={estimate.id}
                    estimate={estimate}
                  />
                ))}
              </Box>
            )}

            {/* Empty State */}
            {!isLoading && !error && estimates.length === 0 && projectTasks.length === 0 && (
              <Alert severity="info">
                У данного проекта нет принятых смет или активных задач
              </Alert>
            )}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default ProjectAccordion;
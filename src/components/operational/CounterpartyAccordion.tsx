/**
 * CounterpartyAccordion - L2: Проекты контрагента
 * Управляет состоянием раскрытия и ленивой загрузкой проектов
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
  Business as BusinessIcon
} from '@mui/icons-material';
import { Counterparty } from '../../types/counterparty.types';
import { Project } from '../../types/project.types';
import { useAuth } from '../../auth/AuthContext';
import { subscribeToProjects } from '../../api/projectV2Api';
import ProjectAccordion from './ProjectAccordion';

interface CounterpartyAccordionProps {
  counterparty: Counterparty;
}

const CounterpartyAccordion: React.FC<CounterpartyAccordionProps> = ({ counterparty }) => {
  const { currentUser } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ленивая загрузка проектов при раскрытии аккордеона
  useEffect(() => {
    if (!isExpanded || !currentUser?.uid) {
      return;
    }

    console.log(`🔄 Loading projects for counterparty: ${counterparty.displayName || counterparty.legalName}`);
    setIsLoading(true);
    setError(null);

    const unsubscribe = subscribeToProjects(
      currentUser.uid,
      (data: Project[]) => {
        // Filter by counterparty and status
        const filtered = data.filter(project => 
          project.clientId === counterparty.id && 
          ['active', 'planning'].includes(project.status)
        );
        console.log(`📁 Projects loaded for ${counterparty.displayName}: ${filtered.length}`);
        setProjects(filtered);
        setIsLoading(false);
      },
      {
        clientId: counterparty.id,
        status: ['active', 'planning']  // Активные и планируемые проекты
      }
    );

    return () => {
      console.log(`🧹 Cleaning up projects stream for counterparty: ${counterparty.displayName}`);
      unsubscribe();
    };
  }, [isExpanded, currentUser?.uid, counterparty.id, counterparty.displayName, counterparty.legalName]);

  const handleExpansion = (event: React.SyntheticEvent, expanded: boolean) => {
    setIsExpanded(expanded);
  };

  const getCounterpartyDisplayName = () => {
    return counterparty.displayName || counterparty.legalName || 'Без названия';
  };

  return (
    <Accordion 
      expanded={isExpanded} 
      onChange={handleExpansion}
      sx={{ mb: 1 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <BusinessIcon color="primary" />
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="div">
              {getCounterpartyDisplayName()}
            </Typography>
            
            {counterparty.internalCode && (
              <Typography variant="body2" color="text.secondary">
                Код: {counterparty.internalCode}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={counterparty.status === 'active' ? 'Активный' : 'Неактивный'} 
              color={counterparty.status === 'active' ? 'success' : 'default'}
              size="small"
            />
            
            {counterparty.roles && counterparty.roles.length > 0 && (
              <Chip 
                label={counterparty.roles.includes('customer') ? 'Клиент' : 'Подрядчик'} 
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
        {!isLoading && !error && projects.length === 0 && (
          <Alert severity="info">
            У данного контрагента нет активных проектов
          </Alert>
        )}

        {/* Projects List */}
        {!isLoading && !error && projects.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2, color: 'text.secondary' }}>
              Проекты ({projects.length})
            </Typography>
            
            {projects.map((project) => (
              <ProjectAccordion
                key={project.id}
                project={project}
              />
            ))}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default CounterpartyAccordion;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, CircularProgress, Paper, Breadcrumbs, Link, Chip,
  Tabs, Tab, Button, Stack, Avatar, LinearProgress,
  List, ListItem, ListItemText, ListItemAvatar
} from '@mui/material';
import {
  Edit as EditIcon,
  LocationOn as LocationIcon,
  Event as EventIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { useAuth } from '../../auth/AuthContext';
import { Project } from '../../types/project.types';
import { subscribeToProject } from '../../api/projectV2Api';

const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    if (!currentUser || !projectId) {
      setError('Ошибка: ID проекта не найден.');
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToProject(currentUser.uid, projectId, (data) => {
      if (data) {
        setProject(data);
        setError(null);
      } else {
        setError('Проект не найден.');
        setProject(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, projectId]);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!project) return null;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleCreateEstimate = () => {
    navigate(`/estimates/new?projectId=${projectId}`);
  };
  
  const budgetUtilization = project.financials?.budgetTotal && project.financials?.actualCost
    ? (project.financials.actualCost / project.financials.budgetTotal) * 100
    : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" href="#" onClick={(e) => { e.preventDefault(); navigate('/projects'); }}>
          Проекты
        </Link>
        <Typography color="text.primary">{project.name}</Typography>
      </Breadcrumbs>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">{project.name}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<AssessmentIcon />} onClick={handleCreateEstimate}>Создать смету</Button>
          <Button variant="contained" startIcon={<EditIcon />}>Редактировать</Button>
        </Stack>
      </Stack>
      <Box sx={{ mb: 3, display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="subtitle1" color="text.secondary">Статус</Typography>
          <Chip label={project.status} color="primary" />
        </Paper>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="subtitle1" color="text.secondary">Бюджет</Typography>
          <Typography variant="h6">{project.financials?.budgetTotal?.toLocaleString()} {project.financials?.currency}</Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" color="text.secondary">Освоение бюджета</Typography>
          <LinearProgress variant="determinate" value={budgetUtilization} sx={{ my: 1 }} />
          <Typography variant="body2" align="right">{budgetUtilization.toFixed(1)}%</Typography>
        </Paper>
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Обзор" />
          <Tab label="Команда" />
          <Tab label="Сметы" />
          <Tab label="Задачи" />
          <Tab label="Финансы" />
          <Tab label="Документы" />
        </Tabs>
      </Box>

      <Box sx={{ pt: 3 }}>
        {currentTab === 0 && (
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Описание</Typography>
              <Typography paragraph>{project.description || 'Описание отсутствует.'}</Typography>
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Детали</Typography>
              <List>
                <ListItem>
                  <ListItemAvatar><Avatar><LocationIcon /></Avatar></ListItemAvatar>
                  <ListItemText primary="Адрес" secondary={`${project.location?.city || 'Не указан'}, ${project.location?.address || 'Не указан'}`} />
                </ListItem>
                <ListItem>
                  <ListItemAvatar><Avatar><EventIcon /></Avatar></ListItemAvatar>
                  <ListItemText primary="Начало" secondary={project.estimatedStartDate || 'Не указано'} />
                </ListItem>
                <ListItem>
                  <ListItemAvatar><Avatar><EventIcon /></Avatar></ListItemAvatar>
                  <ListItemText primary="Завершение" secondary={project.estimatedEndDate || 'Не указано'} />
                </ListItem>
              </List>
            </Paper>
          </Box>
        )}
        {currentTab > 0 && (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">Раздел в разработке</Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default ProjectDetailsPage;

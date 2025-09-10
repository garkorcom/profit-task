import React, { useState, useEffect, useMemo } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid/Grid';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Collapse from '@mui/material/Collapse';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { subscribeToProjects } from '../api/projectV2Api';
import { Project } from '../types/project.types';
import { getTasksStream, Task } from '../api/taskApi';
import { getEstimatesStream, Estimate, EstimateItem } from '../legacy/api/estimateApi';
import { TimeTrackingButton } from '../components/TimeTrackingButton';
import { PageLayout } from '../components/PageLayout';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { Work as WorkIcon, Assignment as TaskIcon, Description as EstimateIcon, CheckCircle as CheckIcon, 
         FilterList as FilterIcon, ExpandMore as ExpandIcon, ExpandLess as CollapseIcon } from '@mui/icons-material';
import { evaluateProjectStartability, ProjectStartability } from '../utils/startability';
import StartabilityIndicator from '../components/startability/StartabilityIndicator';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const StartWorkPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { canStartWork } = useTimeTracking();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [selectedService, setSelectedService] = useState<EstimateItem | null>(null);

  const [tabValue, setTabValue] = useState(0);
  
  // Новые состояния для режима "Все проекты"
  const [viewMode, setViewMode] = useState<'available' | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      const unsubscribes = [
        subscribeToProjects(currentUser.uid, setProjects),
        getTasksStream(currentUser.uid, setTasks),
        getEstimatesStream(currentUser.uid, '', setEstimates),
      ];
      setLoading(false);
      return () => unsubscribes.forEach(unsub => unsub());
    }
  }, [currentUser]);

  // Оценка стартуемости для всех проектов
  const startabilityByProject = useMemo(() => {
    const map = new Map<string, ProjectStartability>();
    projects.forEach(project => {
      const startability = evaluateProjectStartability(project, tasks, estimates);
      map.set(project.id, startability);
    });
    return map;
  }, [projects, tasks, estimates]);

  // Фильтрованные проекты с учетом режима просмотра и фильтров
  const filteredProjects = useMemo(() => {
    let filtered = projects;

    // Фильтр по режиму просмотра
    if (viewMode === 'available') {
      filtered = filtered.filter(project => {
        const startability = startabilityByProject.get(project.id);
        return startability?.startable === true;
      });
    }

    // Поиск по названию
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(searchLower)
      );
    }

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => 
        (project.status || 'idea') === statusFilter
      );
    }

    // Сортировка: сначала стартуемые, потом по дате обновления
    return filtered.sort((a, b) => {
      const aStartability = startabilityByProject.get(a.id);
      const bStartability = startabilityByProject.get(b.id);
      
      // Сначала по стартуемости
      if (aStartability?.startable !== bStartability?.startable) {
        return aStartability?.startable ? -1 : 1;
      }
      
      // Потом по дате (если есть)
      const aDate = (a as any).updatedAt || (a as any).createdAt;
      const bDate = (b as any).updatedAt || (b as any).createdAt;
      if (aDate && bDate) {
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      }
      
      return a.name.localeCompare(b.name);
    });
  }, [projects, startabilityByProject, viewMode, searchText, statusFilter]);

  // Легаси: для совместимости с существующим кодом
  const activeProjects = useMemo(() => {
    return filteredProjects
      .filter(project => {
        const startability = startabilityByProject.get(project.id);
        return startability?.startable === true;
      })
      .map(project => {
        const startability = startabilityByProject.get(project.id)!;
        return {
          ...project,
          startableTaskCount: startability.startableTaskCount,
          estimateCount: startability.estimateCount,
        };
      });
  }, [filteredProjects, startabilityByProject]);


  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
  const startableTasksForSelectedProject = useMemo(() => tasks.filter(task => task.projectId === selectedProjectId && canStartWork(task as any)), [tasks, selectedProjectId, canStartWork]);
  const estimatesForSelectedProject = useMemo(() => estimates.filter(estimate => estimate.projectId === selectedProjectId), [estimates, selectedProjectId]);

  const handleSelectProject = (projectId: string) => {
    const startability = startabilityByProject.get(projectId);
    
    // Если проект не стартуем, показываем детали причин вместо выбора задач
    if (!startability?.startable) {
      setExpandedProjectId(expandedProjectId === projectId ? null : projectId);
      return;
    }
    
    setSelectedProjectId(projectId);
    setSelectedTask(null);
    setSelectedEstimate(null);
    setSelectedService(null);
    setTabValue(0);
    setExpandedProjectId(null);
  };

  const handleToggleDetails = (projectId: string) => {
    setExpandedProjectId(expandedProjectId === projectId ? null : projectId);
  };

  const handleStart = () => {
    navigate('/time-control');
  };
  
  const finalSelection = selectedTask || selectedEstimate;

  if (loading) {
    return (
      <PageLayout title="Запуск работы">
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Начать учет времени">
      <Container maxWidth="lg">
        {/* Фильтры и режимы просмотра */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={3}>
              {/* Переключатель режима */}
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="subtitle1">Режим просмотра:</Typography>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, newMode) => newMode && setViewMode(newMode)}
                  size="small"
                >
                  <ToggleButton value="all">Все проекты</ToggleButton>
                  <ToggleButton value="available">Только доступные</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              
              {/* Фильтры */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Поиск по названию"
                  variant="outlined"
                  size="small"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  sx={{ minWidth: 200 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Статус</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Статус"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">Все статусы</MenuItem>
                    <MenuItem value="idea">Идея</MenuItem>
                    <MenuItem value="planning">Планирование</MenuItem>
                    <MenuItem value="active">Активный</MenuItem>
                    <MenuItem value="on_hold">На паузе</MenuItem>
                    <MenuItem value="completed">Завершен</MenuItem>
                    <MenuItem value="cancelled">Отменен</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Найдено: {filteredProjects.length} проектов
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Typography variant="h6" gutterBottom>
              {viewMode === 'all' ? 'Проекты' : '1. Выберите проект'}
            </Typography>
            <List component="nav" sx={{ maxHeight: '70vh', overflow: 'auto' }}>
              {filteredProjects.map(project => {
                const startability = startabilityByProject.get(project.id)!;
                const isExpanded = expandedProjectId === project.id;
                const isStartable = startability.startable;
                const isSelected = selectedProjectId === project.id;
                
                return (
                  <Box key={project.id}>
                    <ListItemButton
                      selected={isSelected}
                      onClick={() => handleSelectProject(project.id)}
                      disabled={viewMode === 'all' && !isStartable}
                      sx={{ 
                        mb: 1, 
                        borderRadius: 2, 
                        border: 1, 
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        opacity: (!isStartable && viewMode === 'all') ? 0.6 : 1
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <WorkIcon color={isSelected ? 'primary' : 'action'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body1">{project.name}</Typography>
                            <StartabilityIndicator 
                              startability={startability} 
                              compact 
                            />
                          </Stack>
                        }
                        secondary={
                          <Stack spacing={0.5}>
                            <Stack direction="row" spacing={1}>
                              <Chip 
                                label={`Статус: ${project.status || 'idea'}`} 
                                size="small" 
                                variant="outlined" 
                              />
                              <Chip 
                                label={`Задач: ${startability.startableTaskCount}/${startability.totalTaskCount}`} 
                                size="small" 
                              />
                              <Chip 
                                label={`Смет: ${startability.estimateCount}`} 
                                size="small" 
                              />
                            </Stack>
                            {!isStartable && startability.reasons.length > 0 && (
                              <Typography variant="caption" color="error">
                                {startability.reasons.slice(0, 2).map(r => r.replace('_', ' ')).join(', ')}
                                {startability.reasons.length > 2 && ` (+${startability.reasons.length - 2})`}
                              </Typography>
                            )}
                          </Stack>
                        }
                      />
                      {!isStartable && (
                        <ListItemIcon onClick={(e) => {
                          e.stopPropagation();
                          handleToggleDetails(project.id);
                        }}>
                          {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                        </ListItemIcon>
                      )}
                    </ListItemButton>
                    
                    {/* Детали причин блокировки */}
                    {!isStartable && (
                      <Collapse in={isExpanded}>
                        <Box sx={{ ml: 4, mr: 2, mb: 2 }}>
                          <StartabilityIndicator 
                            startability={startability} 
                            showDetails 
                          />
                        </Box>
                      </Collapse>
                    )}
                  </Box>
                );
              })}
            </List>
          </Grid>
          
          <Grid item xs={12} md={7}>
            {selectedProjectId && startabilityByProject.get(selectedProjectId)?.startable && (
              <>
                <Typography variant="h6" gutterBottom>2. Выберите задачу или смету</Typography>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                    <Tab label={`Задачи (${startableTasksForSelectedProject.length})`} />
                    <Tab label={`Сметы (${estimatesForSelectedProject.length})`} />
                  </Tabs>
                </Box>
                <TabPanel value={tabValue} index={0}>
                  <List component="nav" sx={{ maxHeight: '60vh', overflow: 'auto' }}>
                    {startableTasksForSelectedProject.map(task => (
                      <ListItemButton key={task.id} selected={selectedTask?.id === task.id} onClick={() => { setSelectedTask(task); setSelectedEstimate(null); }}>
                         <ListItemIcon><TaskIcon /></ListItemIcon>
                         <ListItemText primary={task.task} />
                         {selectedTask?.id === task.id && <CheckIcon color="success" />}
                      </ListItemButton>
                    ))}
                  </List>
                </TabPanel>
                <TabPanel value={tabValue} index={1}>
                   <List component="nav" sx={{ maxHeight: '60vh', overflow: 'auto' }}>
                    {estimatesForSelectedProject.map(estimate => (
                      <ListItemButton key={estimate.id} selected={selectedEstimate?.id === estimate.id} onClick={() => { setSelectedEstimate(estimate); setSelectedTask(null); }}>
                        <ListItemIcon><EstimateIcon /></ListItemIcon>
                        <ListItemText primary={estimate.name} />
                        {selectedEstimate?.id === estimate.id && <CheckIcon color="success" />}
                      </ListItemButton>
                    ))}
                  </List>
                </TabPanel>
              </>
            )}
          </Grid>
        </Grid>

        {finalSelection && (
          <Card sx={{ mt: 4, position: 'sticky', bottom: 16, zIndex: 10 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6">Готовы к запуску:</Typography>
                  <Typography color="text.secondary">
                    {selectedProject?.name} / {selectedTask?.task || selectedEstimate?.name}
                  </Typography>
                </Box>
                <TimeTrackingButton
                    project={selectedProject as any || null}
                    task={selectedTask as any || null}
                    estimate={selectedEstimate as any || null}
                    service={selectedService as any || null}
                    onStart={handleStart}
                />
              </Stack>
            </CardContent>
          </Card>
        )}
      </Container>
    </PageLayout>
  );
};

export default StartWorkPage;

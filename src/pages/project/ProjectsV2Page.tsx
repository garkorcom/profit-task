/**
 * Страница управления проектами версия 2
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  CardActions,
  Chip,
  Avatar,
  IconButton,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  Badge,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Tooltip,
  Paper,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Fab,
  useTheme,
  useMediaQuery,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Business as ProjectIcon,
  Engineering as EngineeringIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Assessment as AssessmentIcon,
  Description as DocumentIcon,
  Group as TeamIcon,
  Security as PermitIcon,
  TrendingUp as TrendingUpIcon,
  Map as MapIcon,
  Print as PrintIcon,
  FilterList as FilterIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Done as DoneIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import {
  Project,
  ProjectStatus,
  ProjectType,
  ProjectPriority,
  ProjectFilters,
  CreateProjectDto,
} from '../../types/project.types';
import {
  getProjects,
  createProject,
  updateProject,
  changeProjectStatus,
  closeProject,
  subscribeToProjects,
  getProjectKPI,
  deleteProject,
} from '../../api/projectV2Api';
import { Counterparty } from '../../types/counterparty.types';
import { getCounterparties } from '../../api/counterpartyApi';

// Конфигурация статусов (using ProjectStatus from projectApi.ts)
const PROJECT_STATUSES = [
  { value: 'idea', label: 'Идея', color: 'default', icon: '💡' },
  { value: 'pre_sale', label: 'Pre-Sale', color: 'info', icon: '📋' },
  { value: 'planning', label: 'Планирование', color: 'info', icon: '📐' },
  { value: 'active', label: 'Активен', color: 'success', icon: '🚀' },
  { value: 'on_hold', label: 'На паузе', color: 'warning', icon: '⏸' },
  { value: 'completed', label: 'Завершен', color: 'default', icon: '✅' },
  { value: 'closed', label: 'Закрыт', color: 'default', icon: '🔒' },
] as const;

const ProjectsV2Page: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [kpi, setKpi] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'kanban'>('cards');
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  // New project form
  const [newProject, setNewProject] = useState<CreateProjectDto>({
    name: '',
    type: 'residential_new',
    description: '',
    location: {
      address: '',
      city: '',
      country: 'RU',
    },
  });
  
  // Load projects
  useEffect(() => {
    if (!currentUser) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Load projects
        const data = await getProjects(currentUser.uid, filters);
        setProjects(data);
        
        // Load KPI
        const kpiData = await getProjectKPI(currentUser.uid);
        setKpi(kpiData);

        // Load counterparties for the creation dialog
        const counterpartiesData = await getCounterparties(currentUser.uid, { roles: ['customer'] });
        setCounterparties(counterpartiesData);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentUser, filters]);
  
  // Subscribe to real-time updates
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = subscribeToProjects(
      currentUser.uid,
      (updatedProjects) => {
        setProjects(updatedProjects);
      },
      filters
    );
    
    return unsubscribe;
  }, [currentUser, filters]);
  
  // Filter projects
  const filteredProjects = projects.filter(project => {
    // Status filter
    if (selectedStatus !== 'all' && project.status !== selectedStatus) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        project.number?.toLowerCase().includes(query) ||
        project.location?.address?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });
  
  // Group projects by status for kanban view
  const projectsByStatus = PROJECT_STATUSES.reduce((acc, status) => {
    acc[status.value as ProjectStatus] = filteredProjects.filter(p => p.status === status.value);
    return acc;
  }, {} as Record<ProjectStatus, Project[]>);
  
  // Handlers
  const handleCreateProject = async () => {
    if (!currentUser || !newProject.name) {
      alert('Заполните название проекта');
      return;
    }
    
    try {
      const projectId = await createProject(currentUser.uid, newProject);
      setCreateDialogOpen(false);
      setNewProject({
        name: '',
        type: 'residential_new',
        description: '',
        location: {
          address: '',
          city: '',
          country: 'RU',
        },
      });
      
      // Navigate to the new project
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };
  
  const handleStatusChange = async (project: Project, newStatus: ProjectStatus) => {
    if (!currentUser) return;
    
    try {
      await changeProjectStatus(currentUser.uid, project.id, newStatus);
    } catch (error: any) {
      alert(`Ошибка изменения статуса: ${error.message}`);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!currentUser) return;
    if (window.confirm(`Вы уверены, что хотите удалить проект "${project.name}"? Это действие необратимо.`)) {
      try {
        await deleteProject(currentUser.uid, project.id);
      } catch (error: any) {
        alert(`Ошибка удаления проекта: ${error.message}`);
      }
    }
  };
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    setMenuAnchor(event.currentTarget);
    setSelectedProject(project);
  };
  
  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedProject(null);
  };
  
  // Helper functions
  const getStatusConfig = (status: ProjectStatus) => {
    return PROJECT_STATUSES.find(s => s.value === status) || PROJECT_STATUSES[0];
  };
  
  const getProjectProgress = (project: Project) => {
    const statusIndex = PROJECT_STATUSES.findIndex(s => s.value === project.status);
    const activeIndex = PROJECT_STATUSES.findIndex(s => s.value === 'active');
    const completedIndex = PROJECT_STATUSES.findIndex(s => s.value === 'completed');
    
    if (statusIndex <= activeIndex) {
      return (statusIndex / activeIndex) * 50;
    } else if (statusIndex <= completedIndex) {
      return 50 + ((statusIndex - activeIndex) / (completedIndex - activeIndex)) * 50;
    }
    return 100;
  };
  
  const getPriorityColor = (priority: ProjectPriority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };
  
  const getProjectTypeLabel = (type: ProjectType) => {
    switch (type) {
      case 'residential_new': return 'Жилой новострой';
      case 'residential_remodel': return 'Жилой ремонт';
      case 'commercial_new': return 'Коммерческий новострой';
      case 'commercial_remodel': return 'Коммерческий ремонт';
      case 'industrial': return 'Промышленный';
      case 'infrastructure': return 'Инфраструктура';
      default: return 'Другое';
    }
  };
  
  const hasPermitIssues = (project: Project) => {
    return project.permits?.some(
      p => p.status === 'expired' || p.status === 'rejected'
    );
  };
  
  const hasActiveRisks = (project: Project) => {
    return project.risks?.some(
      r => r.status === 'identified' && (r.impact === 'high' || r.impact === 'critical')
    );
  };
  
  return (
    <Box>
      {/* Header */}
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={3}
      >
        <Typography variant="h4">Проекты</Typography>
        
        <Stack direction="row" spacing={2}>
          {/* View mode toggle */}
          {!isMobile && (
            <Stack direction="row" spacing={1}>
              <IconButton
                size="small"
                color={viewMode === 'cards' ? 'primary' : 'default'}
                onClick={() => setViewMode('cards')}
              >
                <ProjectIcon />
              </IconButton>
              <IconButton
                size="small"
                color={viewMode === 'list' ? 'primary' : 'default'}
                onClick={() => setViewMode('list')}
              >
                <DocumentIcon />
              </IconButton>
              <IconButton
                size="small"
                color={viewMode === 'kanban' ? 'primary' : 'default'}
                onClick={() => setViewMode('kanban')}
              >
                <AssessmentIcon />
              </IconButton>
            </Stack>
          )}
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Новый проект
          </Button>
        </Stack>
      </Stack>
      
      {/* KPI Cards */}
      {kpi && (
        <Stack direction="row" spacing={2} mb={3} sx={{ overflowX: 'auto' }}>
          <Paper sx={{ p: 2, minWidth: 160 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <ProjectIcon color="primary" />
              <Box>
                <Typography variant="h5">{kpi.totalCount}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Всего проектов
                </Typography>
              </Box>
            </Stack>
          </Paper>
          
          <Paper sx={{ p: 2, minWidth: 160 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <TrendingUpIcon color="success" />
              <Box>
                <Typography variant="h5">{kpi.byStatus.active || 0}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Активных
                </Typography>
              </Box>
            </Stack>
          </Paper>
          
          <Paper sx={{ p: 2, minWidth: 160 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <ScheduleIcon color="warning" />
              <Box>
                <Typography variant="h5">{kpi.onSchedule}</Typography>
                <Typography variant="caption" color="text.secondary">
                  В графике
                </Typography>
              </Box>
            </Stack>
          </Paper>
          
          <Paper sx={{ p: 2, minWidth: 160 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <MoneyIcon color="info" />
              <Box>
                <Typography variant="h5">{kpi.averageMargin}%</Typography>
                <Typography variant="caption" color="text.secondary">
                  Средняя маржа
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      )}
      
      {/* Search and filters */}
      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          fullWidth
          size="small"
          placeholder="Поиск по названию, адресу..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Статус</InputLabel>
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ProjectStatus | 'all')}
            label="Статус"
          >
            <MenuItem value="all">Все</MenuItem>
            {PROJECT_STATUSES.map(status => (
              <MenuItem key={status.value} value={status.value}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{status.icon}</span>
                  <span>{status.label}</span>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button variant="outlined" startIcon={<FilterIcon />}>
          Фильтры
        </Button>
      </Stack>
      
      {/* Content */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : filteredProjects.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Проекты не найдены
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ mt: 2 }}
            onClick={() => setCreateDialogOpen(true)}
          >
            Создать первый проект
          </Button>
        </Paper>
      ) : (
        <>
          {/* Cards view */}
          {viewMode === 'cards' && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: 2,
              }}
            >
              {filteredProjects.map((project) => {
                const statusConfig = getStatusConfig(project.status);
                const progress = getProjectProgress(project);
                
                return (
                  <Card key={project.id}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" mb={2}>
                          <Chip
                            label={statusConfig.label}
                            color={statusConfig.color as any}
                            size="small"
                          />
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, project)}
                          >
                            <MoreIcon />
                          </IconButton>
                        </Stack>
                        
                        <Typography variant="h6" gutterBottom>
                          {project.name}
                        </Typography>
                        
                        {project.number && (
                          <Typography variant="caption" color="text.secondary">
                            {project.number}
                          </Typography>
                        )}
                        
                        <Stack spacing={1} mt={2}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LocationIcon fontSize="small" color="action" />
                            <Typography variant="body2" noWrap>
                              {project.location?.city || 'Не указан'}, {project.location?.address || 'Не указан'}
                            </Typography>
                          </Stack>
                          
                          <Stack direction="row" spacing={1}>
                            <Chip
                              label={getProjectTypeLabel(project.type)}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={project.priority}
                              color={getPriorityColor(project.priority) as any}
                              size="small"
                            />
                          </Stack>
                        </Stack>
                        
                        <Box mt={2}>
                          <Stack direction="row" justifyContent="space-between" mb={1}>
                            <Typography variant="caption">Прогресс</Typography>
                            <Typography variant="caption">{Math.round(progress)}%</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={progress} />
                        </Box>
                        
                        {/* Indicators */}
                        <Stack direction="row" spacing={1} mt={2}>
                          {hasPermitIssues(project) && (
                            <Tooltip title="Проблемы с разрешениями">
                              <PermitIcon color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                          {hasActiveRisks(project) && (
                            <Tooltip title="Есть активные риски">
                              <WarningIcon color="error" fontSize="small" />
                            </Tooltip>
                          )}
                          {project.team && project.team.length > 0 && (
                            <Tooltip title={`Команда: ${project.team.length} чел.`}>
                              <Badge badgeContent={project.team.length} color="primary">
                                <TeamIcon fontSize="small" />
                              </Badge>
                            </Tooltip>
                          )}
                        </Stack>
                      </CardContent>
                      
                      <CardActions>
                        <Button
                          size="small"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          Открыть
                        </Button>
                        <Button
                          size="small"
                          onClick={() => navigate(`/projects/${project.id}/estimates`)}
                        >
                          Сметы
                        </Button>
                      </CardActions>
                    </Card>
                );
              })}
            </Box>
          )}
          
          {/* List view */}
          {viewMode === 'list' && (
            <List>
              {filteredProjects.map((project, index) => {
                const statusConfig = getStatusConfig(project.status);
                
                return (
                  <React.Fragment key={project.id}>
                    <ListItem
                      secondaryAction={
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuOpen(e, project);
                          }}
                        >
                          <MoreIcon />
                        </IconButton>
                      }
                      disablePadding
                    >
                      <ListItemButton onClick={() => navigate(`/projects/${project.id}`)}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: statusConfig.color + '.light' }}>
                            {statusConfig.icon}
                          </Avatar>
                        </ListItemAvatar>
                        
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="subtitle1">
                                {project.name}
                              </Typography>
                              <Chip
                                label={statusConfig.label}
                                color={statusConfig.color as any}
                                size="small"
                              />
                            </Stack>
                          }
                          secondary={
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Typography variant="caption">
                                {project.location?.city || 'Не указан'}
                              </Typography>
                              <Typography variant="caption">
                                {getProjectTypeLabel(project.type)}
                              </Typography>
                              {project.clientName && (
                                <Typography variant="caption">
                                  Клиент: {project.clientName}
                                </Typography>
                              )}
                            </Stack>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                    
                    {index < filteredProjects.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
          
          {/* Kanban view */}
          {viewMode === 'kanban' && (
            <Box sx={{ overflowX: 'auto' }}>
              <Stack direction="row" spacing={2} sx={{ minWidth: 1200 }}>
                {PROJECT_STATUSES.map(status => (
                  <Paper
                    key={status.value}
                    sx={{
                      minWidth: 300,
                      maxWidth: 300,
                      p: 2,
                      bgcolor: 'background.default',
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <span>{status.icon}</span>
                      <Typography variant="subtitle1">
                        {status.label}
                      </Typography>
                      <Chip
                        label={projectsByStatus[status.value as ProjectStatus]?.length || 0}
                        size="small"
                      />
                    </Stack>
                    
                    <Stack spacing={1}>
                      {projectsByStatus[status.value as ProjectStatus]?.map(project => (
                        <Card
                          key={project.id}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="subtitle2" gutterBottom>
                              {project.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {project.location?.city || 'Не указан'}
                            </Typography>
                            <Stack direction="row" spacing={1} mt={1}>
                              <Chip
                                label={project.priority}
                                color={getPriorityColor(project.priority) as any}
                                size="small"
                              />
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </>
      )}
      
      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          navigate(`/projects/${selectedProject?.id}/edit`);
          handleMenuClose();
        }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        
        <MenuItem onClick={() => {
          navigate(`/estimates/new?projectId=${selectedProject?.id}`);
          handleMenuClose();
        }}>
          <AssessmentIcon fontSize="small" sx={{ mr: 1 }} />
          Создать смету
        </MenuItem>
        
        <MenuItem onClick={() => {
          // TODO: Print passport
          handleMenuClose();
        }}>
          <PrintIcon fontSize="small" sx={{ mr: 1 }} />
          Паспорт проекта
        </MenuItem>
        
        <Divider />
        
        <MenuItem
          onClick={() => {
            if (selectedProject) handleDeleteProject(selectedProject);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Удалить
        </MenuItem>

        {selectedProject?.status === 'active' && (
          <MenuItem onClick={() => {
            if (selectedProject) {
              handleStatusChange(selectedProject, 'on_hold');
            }
            handleMenuClose();
          }}>
            <PauseIcon fontSize="small" sx={{ mr: 1 }} />
            Приостановить
          </MenuItem>
        )}
        
        {selectedProject?.status === 'on_hold' && (
          <MenuItem onClick={() => {
            if (selectedProject) {
              handleStatusChange(selectedProject, 'active');
            }
            handleMenuClose();
          }}>
            <StartIcon fontSize="small" sx={{ mr: 1 }} />
            Возобновить
          </MenuItem>
        )}
        
        {selectedProject?.status === 'active' && (
          <MenuItem onClick={() => {
            if (selectedProject) {
              handleStatusChange(selectedProject, 'completed');
            }
            handleMenuClose();
          }}>
            <DoneIcon fontSize="small" sx={{ mr: 1 }} />
            Завершить
          </MenuItem>
        )}
        
        <MenuItem onClick={() => {
          if (selectedProject && currentUser) {
            closeProject(currentUser.uid, selectedProject.id);
          }
          handleMenuClose();
        }}>
          <ArchiveIcon fontSize="small" sx={{ mr: 1 }} />
          Закрыть проект
        </MenuItem>
      </Menu>
      
      {/* Create dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Создать проект</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Autocomplete
              options={counterparties}
              getOptionLabel={(option) => option.displayName || option.legalName}
              onChange={(e, value) => {
                setNewProject({ ...newProject, clientId: value?.id });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Клиент (контрагент)"
                  placeholder="Выберите клиента"
                />
              )}
            />
            <TextField
              label="Название проекта"
              value={newProject.name}
              onChange={(e) => setNewProject({
                ...newProject,
                name: e.target.value,
              })}
              required
              fullWidth
            />
            
            <TextField
              label="Описание"
              value={newProject.description}
              onChange={(e) => setNewProject({
                ...newProject,
                description: e.target.value,
              })}
              multiline
              rows={3}
              fullWidth
            />
            
            <FormControl fullWidth required>
              <InputLabel>Тип проекта</InputLabel>
              <Select
                value={newProject.type}
                onChange={(e) => setNewProject({
                  ...newProject,
                  type: e.target.value as ProjectType,
                })}
                label="Тип проекта"
              >
                <MenuItem value="residential_new">Жилой новострой</MenuItem>
                <MenuItem value="residential_remodel">Жилой ремонт</MenuItem>
                <MenuItem value="commercial_new">Коммерческий новострой</MenuItem>
                <MenuItem value="commercial_remodel">Коммерческий ремонт</MenuItem>
                <MenuItem value="industrial">Промышленный</MenuItem>
                <MenuItem value="infrastructure">Инфраструктура</MenuItem>
                <MenuItem value="other">Другое</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Адрес объекта"
              value={newProject.location.address}
              onChange={(e) => setNewProject({
                ...newProject,
                location: {
                  ...newProject.location,
                  address: e.target.value,
                },
              })}
              fullWidth
            />
            
            <TextField
              label="Город"
              value={newProject.location.city}
              onChange={(e) => setNewProject({
                ...newProject,
                location: {
                  ...newProject.location,
                  city: e.target.value,
                },
              })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleCreateProject}
            variant="contained"
            disabled={!newProject.name}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Mobile FAB */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 70, right: 16 }}
          onClick={() => setCreateDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
};

export default ProjectsV2Page;

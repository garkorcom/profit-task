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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Project, getProjectsStream } from '../api/projectApi';
import { getTasksStream, Task } from '../api/taskApi';
import { getEstimatesStream, Estimate, EstimateItem } from '../legacy/api/estimateApi';
import { TimeTrackingButton } from '../components/TimeTrackingButton';
import { PageLayout } from '../components/PageLayout';
import { useTimeTracking } from '../contexts/TimeTrackingContext';
import { Work as WorkIcon, Assignment as TaskIcon, Description as EstimateIcon, CheckCircle as CheckIcon } from '@mui/icons-material';

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

  useEffect(() => {
    if (currentUser) {
      const unsubscribes = [
        getProjectsStream(currentUser.uid, setProjects),
        getTasksStream(currentUser.uid, setTasks),
        getEstimatesStream(currentUser.uid, '', setEstimates),
      ];
      setLoading(false);
      return () => unsubscribes.forEach(unsub => unsub());
    }
  }, [currentUser]);

  const activeProjects = useMemo(() => {
    return projects
      .filter(p => p.status === 'active')
      .map(project => {
        const startableTasks = tasks.filter(task => task.projectId === project.id && canStartWork(task as any));
        const projectEstimates = estimates.filter(estimate => estimate.projectId === project.id);
        return {
          ...project,
          startableTaskCount: startableTasks.length,
          estimateCount: projectEstimates.length,
        };
      })
      .filter(project => project.startableTaskCount > 0 || project.estimateCount > 0);
  }, [projects, tasks, estimates, canStartWork]);


  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
  const startableTasksForSelectedProject = useMemo(() => tasks.filter(task => task.projectId === selectedProjectId && canStartWork(task as any)), [tasks, selectedProjectId, canStartWork]);
  const estimatesForSelectedProject = useMemo(() => estimates.filter(estimate => estimate.projectId === selectedProjectId), [estimates, selectedProjectId]);

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedTask(null);
    setSelectedEstimate(null);
    setSelectedService(null);
    setTabValue(0);
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
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Typography variant="h6" gutterBottom>1. Выберите проект</Typography>
            <List component="nav" sx={{ maxHeight: '70vh', overflow: 'auto' }}>
              {activeProjects.map(project => (
                <ListItemButton
                  key={project.id}
                  selected={selectedProjectId === project.id}
                  onClick={() => handleSelectProject(project.id)}
                  sx={{ mb: 1.5, borderRadius: 2, border: 1, borderColor: selectedProjectId === project.id ? 'primary.main' : 'divider' }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}><WorkIcon color={selectedProjectId === project.id ? 'primary' : 'action'} /></ListItemIcon>
                  <ListItemText
                    primary={project.name}
                    secondary={
                      <Stack direction="row" spacing={1} mt={0.5}>
                        <Chip label={`Задач: ${project.startableTaskCount}`} size="small" />
                        <Chip label={`Смет: ${project.estimateCount}`} size="small" />
                      </Stack>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </Grid>
          
          <Grid item xs={12} md={7}>
            {selectedProjectId && (
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

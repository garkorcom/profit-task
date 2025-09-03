import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  ButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,

  LinearProgress,
  Tooltip,
  IconButton,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import {
  FileDownload as ExportIcon,
  Print as PrintIcon,
  FilterList as FilterIcon,
  Info as InfoIcon,
  TrendingUp as OverIcon,
  TrendingDown as UnderIcon,
  CheckCircle as OnTrackIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { getProjectsStream, Project } from '../api/projectApi';
import { getTasksStream, Task } from '../api/taskApi';
import { getTimeEntriesStream, TimeEntry } from '../api/timeEntryUnified';
import { getEstimatesStream, Estimate } from '../legacy/api/estimateApi';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface PlanFactData {
  id: string;
  name: string;
  type: 'project' | 'task' | 'estimate';
  plannedHours: number;
  actualHours: number;
  plannedCost: number;
  actualCost: number;
  deviation: number;
  deviationPercent: number;
  status: 'on_track' | 'over_budget' | 'under_budget' | 'at_risk';
  completionPercent: number;
  children?: PlanFactData[];
}

const PlanFactReportPage: React.FC = () => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [reportData, setReportData] = useState<PlanFactData[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      setLoading(true);

      // Загрузка данных
      const unsubProjects = getProjectsStream(currentUser.uid, setProjects);
      const unsubTasks = getTasksStream(currentUser.uid, setTasks);
      const unsubTimeEntries = getTimeEntriesStream(currentUser.uid, setTimeEntries);
      const unsubEstimates = getEstimatesStream(currentUser.uid, '', setEstimates);

      setLoading(false);

      return () => {
        unsubProjects();
        unsubTasks();
        unsubTimeEntries();
        unsubEstimates();
      };
    };

    loadData();
  }, [currentUser]);

  useEffect(() => {
    // Генерация данных отчета
    generateReportData();
  }, [projects, tasks, timeEntries, estimates, selectedProject]);

  const generateReportData = () => {
    const data: PlanFactData[] = [];

    const filteredProjects = selectedProject === 'all' 
      ? projects 
      : projects.filter(p => p.id === selectedProject);

    filteredProjects.forEach(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const projectEstimates = estimates.filter(e => e.projectId === project.id);
      
      // Расчет плановых показателей
      const plannedHours = projectTasks.reduce((sum, task) => 
        sum + (task.plannedDuration || 0), 0
      );
      
      // Расчет фактических показателей
      const projectTimeEntries = timeEntries.filter(entry => 
        projectTasks.some(task => task.id === entry.taskId)
      );
      const actualHours = projectTimeEntries.reduce((sum, entry) => 
        sum + ((entry.duration || 0) / 60), 0
      );
      
      // Расчет стоимости (упрощенно - часы * ставка)
      const hourlyRate = 1000; // Примерная ставка
      const plannedCost = plannedHours * hourlyRate;
      const actualCost = actualHours * hourlyRate;
      
      // Расчет отклонений
      const deviation = actualCost - plannedCost;
      const deviationPercent = plannedCost > 0 
        ? ((deviation / plannedCost) * 100) 
        : 0;
      
      // Определение статуса
      let status: PlanFactData['status'] = 'on_track';
      if (deviationPercent > 10) status = 'over_budget';
      else if (deviationPercent < -10) status = 'under_budget';
      else if (deviationPercent > 5) status = 'at_risk';
      
      // Процент выполнения
      const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
      const completionPercent = projectTasks.length > 0 
        ? (completedTasks / projectTasks.length) * 100 
        : 0;
      
      // Детализация по задачам
      const taskDetails: PlanFactData[] = projectTasks.map(task => {
        const taskEntries = timeEntries.filter(e => e.taskId === task.id);
        const taskActualHours = taskEntries.reduce((sum, e) => sum + ((e.duration || 0) / 60), 0);
        const taskPlannedHours = task.plannedDuration || 0;
        const taskDeviation = taskActualHours - taskPlannedHours;
        const taskDeviationPercent = taskPlannedHours > 0 
          ? ((taskDeviation / taskPlannedHours) * 100) 
          : 0;
        
        return {
          id: task.id,
          name: task.task,
          type: 'task' as const,
          plannedHours: taskPlannedHours,
          actualHours: taskActualHours,
          plannedCost: taskPlannedHours * hourlyRate,
          actualCost: taskActualHours * hourlyRate,
          deviation: taskDeviation * hourlyRate,
          deviationPercent: taskDeviationPercent,
          status: taskDeviationPercent > 10 ? 'over_budget' : 
                  taskDeviationPercent < -10 ? 'under_budget' : 
                  'on_track',
          completionPercent: task.status === 'completed' ? 100 : 
                            task.status === 'in_progress' ? 50 : 0
        };
      });
      
      data.push({
        id: project.id,
        name: project.name,
        type: 'project',
        plannedHours,
        actualHours,
        plannedCost,
        actualCost,
        deviation,
        deviationPercent,
        status,
        completionPercent,
        children: reportType === 'detailed' ? taskDetails : undefined
      });
    });

    setReportData(data);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatHours = (hours: number): string => {
    return `${hours.toFixed(1)}ч`;
  };

  const getStatusColor = (status: PlanFactData['status']) => {
    switch (status) {
      case 'on_track': return 'success';
      case 'over_budget': return 'error';
      case 'under_budget': return 'warning';
      case 'at_risk': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: PlanFactData['status']): React.ReactElement | undefined => {
    switch (status) {
      case 'on_track': return <OnTrackIcon fontSize="small" />;
      case 'over_budget': return <OverIcon fontSize="small" />;
      case 'under_budget': return <UnderIcon fontSize="small" />;
      case 'at_risk': return <WarningIcon fontSize="small" />;
      default: return undefined;
    }
  };

  const getStatusLabel = (status: PlanFactData['status']) => {
    switch (status) {
      case 'on_track': return 'В рамках плана';
      case 'over_budget': return 'Превышение';
      case 'under_budget': return 'Экономия';
      case 'at_risk': return 'Риск превышения';
      default: return status;
    }
  };

  const handleExport = () => {
    // Экспорт в Excel
    console.log('Exporting to Excel...');
  };

  const handlePrint = () => {
    window.print();
  };

  // Расчет итоговых показателей
  const totals = reportData.reduce((acc, item) => ({
    plannedHours: acc.plannedHours + item.plannedHours,
    actualHours: acc.actualHours + item.actualHours,
    plannedCost: acc.plannedCost + item.plannedCost,
    actualCost: acc.actualCost + item.actualCost,
    deviation: acc.deviation + item.deviation
  }), {
    plannedHours: 0,
    actualHours: 0,
    plannedCost: 0,
    actualCost: 0,
    deviation: 0
  });

  const totalDeviationPercent = totals.plannedCost > 0 
    ? ((totals.deviation / totals.plannedCost) * 100) 
    : 0;

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      {/* Заголовок и фильтры */}
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Отчет План/Факт
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Проект</InputLabel>
              <Select
                value={selectedProject}
                label="Проект"
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <MenuItem value="all">Все проекты</MenuItem>
                {projects.map(project => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <ButtonGroup size="small" fullWidth>
              <Button
                variant={reportType === 'summary' ? 'contained' : 'outlined'}
                onClick={() => setReportType('summary')}
              >
                Сводный
              </Button>
              <Button
                variant={reportType === 'detailed' ? 'contained' : 'outlined'}
                onClick={() => setReportType('detailed')}
              >
                Детальный
              </Button>
            </ButtonGroup>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <ButtonGroup size="small" fullWidth>
              <Button
                variant={timeRange === 'week' ? 'contained' : 'outlined'}
                onClick={() => setTimeRange('week')}
              >
                Неделя
              </Button>
              <Button
                variant={timeRange === 'month' ? 'contained' : 'outlined'}
                onClick={() => setTimeRange('month')}
              >
                Месяц
              </Button>
              <Button
                variant={timeRange === 'quarter' ? 'contained' : 'outlined'}
                onClick={() => setTimeRange('quarter')}
              >
                Квартал
              </Button>
            </ButtonGroup>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Box display="flex" gap={1}>
              <Button
                startIcon={<ExportIcon />}
                variant="outlined"
                onClick={handleExport}
              >
                Excel
              </Button>
              <Button
                startIcon={<PrintIcon />}
                variant="outlined"
                onClick={handlePrint}
              >
                Печать
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Сводные показатели */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Плановые трудозатраты
              </Typography>
              <Typography variant="h5">
                {formatHours(totals.plannedHours)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {formatCurrency(totals.plannedCost)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Фактические трудозатраты
              </Typography>
              <Typography variant="h5">
                {formatHours(totals.actualHours)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {formatCurrency(totals.actualCost)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Отклонение
              </Typography>
              <Typography 
                variant="h5"
                color={totals.deviation > 0 ? 'error' : 'success'}
              >
                {formatCurrency(Math.abs(totals.deviation))}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {totalDeviationPercent > 0 ? '+' : ''}{totalDeviationPercent.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Эффективность
              </Typography>
              <Box display="flex" alignItems="center">
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, Math.max(0, 100 - Math.abs(totalDeviationPercent)))}
                  sx={{ flex: 1, mr: 2, height: 8, borderRadius: 1 }}
                  color={totalDeviationPercent > 10 ? 'error' : totalDeviationPercent < -10 ? 'warning' : 'success'}
                />
                <Typography variant="h6">
                  {Math.min(100, Math.max(0, 100 - Math.abs(totalDeviationPercent))).toFixed(0)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Таблица отчета */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Наименование</TableCell>
              <TableCell align="center">Статус</TableCell>
              <TableCell align="right">План (часы)</TableCell>
              <TableCell align="right">Факт (часы)</TableCell>
              <TableCell align="right">План ($)</TableCell>
              <TableCell align="right">Факт ($)</TableCell>
              <TableCell align="right">Отклонение</TableCell>
              <TableCell align="center">Выполнение</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reportData.map((row) => (
              <React.Fragment key={row.id}>
                <TableRow
                  sx={{
                    bgcolor: row.type === 'project' 
                      ? alpha(theme.palette.primary.main, 0.05) 
                      : 'transparent',
                    fontWeight: row.type === 'project' ? 'bold' : 'normal'
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {row.type === 'task' && <Box width={24} />}
                      <Typography variant={row.type === 'project' ? 'subtitle1' : 'body2'}>
                        {row.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={getStatusIcon(row.status)}
                      label={getStatusLabel(row.status)}
                      size="small"
                      color={getStatusColor(row.status)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">{formatHours(row.plannedHours)}</TableCell>
                  <TableCell align="right">{formatHours(row.actualHours)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.plannedCost)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.actualCost)}</TableCell>
                  <TableCell align="right">
                    <Box display="flex" alignItems="center" justifyContent="flex-end">
                      <Typography
                        color={row.deviation > 0 ? 'error' : 'success.main'}
                        variant="body2"
                      >
                        {row.deviation > 0 ? '+' : ''}{formatCurrency(row.deviation)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ ml: 1 }}
                      >
                        ({row.deviationPercent > 0 ? '+' : ''}{row.deviationPercent.toFixed(1)}%)
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" alignItems="center">
                      <LinearProgress
                        variant="determinate"
                        value={row.completionPercent}
                        sx={{ flex: 1, mr: 1, height: 6, borderRadius: 1 }}
                      />
                      <Typography variant="caption">
                        {row.completionPercent.toFixed(0)}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
                {row.children && row.children.map(child => (
                  <TableRow key={child.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" pl={3}>
                        <Typography variant="body2" color="textSecondary">
                          {child.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={getStatusLabel(child.status)}
                        size="small"
                        color={getStatusColor(child.status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">{formatHours(child.plannedHours)}</TableCell>
                    <TableCell align="right">{formatHours(child.actualHours)}</TableCell>
                    <TableCell align="right">{formatCurrency(child.plannedCost)}</TableCell>
                    <TableCell align="right">{formatCurrency(child.actualCost)}</TableCell>
                    <TableCell align="right">
                      <Typography
                        color={child.deviation > 0 ? 'error' : 'success.main'}
                        variant="body2"
                      >
                        {child.deviation > 0 ? '+' : ''}{formatCurrency(child.deviation)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <LinearProgress
                        variant="determinate"
                        value={child.completionPercent}
                        sx={{ height: 4, borderRadius: 1 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
            
            {/* Итоговая строка */}
            <TableRow sx={{ bgcolor: alpha(theme.palette.grey[500], 0.1) }}>
              <TableCell>
                <Typography variant="subtitle1" fontWeight="bold">
                  ИТОГО
                </Typography>
              </TableCell>
              <TableCell />
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {formatHours(totals.plannedHours)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {formatHours(totals.actualHours)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {formatCurrency(totals.plannedCost)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {formatCurrency(totals.actualCost)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography
                  fontWeight="bold"
                  color={totals.deviation > 0 ? 'error' : 'success.main'}
                >
                  {totals.deviation > 0 ? '+' : ''}{formatCurrency(totals.deviation)}
                </Typography>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Примечания */}
      <Box mt={3}>
        <Alert severity="info" icon={<InfoIcon />}>
          <Typography variant="body2">
            <strong>Примечания:</strong>
          </Typography>
          <Typography variant="body2" component="ul" sx={{ mt: 1, mb: 0 }}>
            <li>Плановые показатели рассчитываются на основе оценок трудозатрат в задачах</li>
            <li>Фактические показатели формируются из данных учета рабочего времени</li>
            <li>Стоимость рассчитывается по средней ставке 1000 $/час</li>
            <li>Отклонения более 10% требуют внимания руководителя</li>
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default PlanFactReportPage;

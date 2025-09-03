/**
 * Демонстрационная страница для унифицированной системы задач
 * Показывает работу SSOT для EstimateTask и ProjectTask
 */

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  Alert,
  Button,
  Stack,
  Chip
} from '@mui/material';
import {
  Construction as EstimateIcon,
  Build as ProjectIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';

// Унифицированные компоненты
import { useTaskManagement } from '../hooks/useTaskManagement';
import UnifiedTaskList from '../components/tasks/unified/UnifiedTaskList';
import TaskConfigProvider from '../components/tasks/unified/TaskConfigProvider';
import EstimateTasksBlockUnified from '../components/estimates/blocks/EstimateTasksBlockUnified';

const UnifiedTasksDemo: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  
  const {
    tasks,
    loading,
    error,
    statistics,
    createTask,
    clearFilters
  } = useTaskManagement();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const createSampleEstimateTask = async () => {
    try {
      await createTask({
        phase: 'pre_construction',
        name: 'Анализ требований к проекту',
        description: 'Детальный анализ технических требований и ограничений проекта',
        plannedHours: 16,
        priority: 'high',
        estimateId: 'est_demo_001',
        includeMode: 'COGS',
        tags: ['анализ', 'требования', 'планирование']
      });
    } catch (error) {
      console.error('Ошибка создания задачи планирования:', error);
    }
  };

  const createSampleProjectTask = async () => {
    try {
      await createTask({
        phase: 'execution',
        name: 'Установка оборудования',
        description: 'Монтаж и настройка основного технологического оборудования',
        plannedHours: 24,
        plannedCost: 50000,
        priority: 'urgent',
        projectId: 'proj_demo_001',
        wbsCode: '1.2.3',
        milestone: 'Завершение монтажных работ',
        tags: ['монтаж', 'оборудование', 'выполнение']
      });
    } catch (error) {
      console.error('Ошибка создания задачи выполнения:', error);
    }
  };

  const renderDashboard = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Dashboard - Унифицированная система задач
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Статистика */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Общая статистика
        </Typography>
        
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
          <Chip 
            label={`Всего задач: ${statistics.total}`}
            color="primary"
            variant="outlined"
          />
          <Chip 
            label={`Планирование: ${statistics.byPhase.pre_construction}`}
            color="info"
            variant="outlined"
          />
          <Chip 
            label={`Выполнение: ${statistics.byPhase.execution}`}
            color="success" 
            variant="outlined"
          />
          <Chip 
            label={`Завершено: ${Math.round(statistics.completionRate)}%`}
            color="secondary"
            variant="outlined"
          />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          <Button 
            variant="outlined" 
            startIcon={<EstimateIcon />}
            onClick={createSampleEstimateTask}
            size="small"
          >
            + Задача планирования
          </Button>
          <Button 
            variant="outlined"
            startIcon={<ProjectIcon />} 
            onClick={createSampleProjectTask}
            size="small"
          >
            + Задача выполнения
          </Button>
          <Button 
            variant="text"
            onClick={clearFilters}
            size="small"
          >
            Сбросить фильтры
          </Button>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          Демонстрация Single Source of Truth (SSOT) для управления задачами.
          Система объединяет EstimateTask (планирование) и ProjectTask (выполнение) 
          в единую архитектуру с типизацией Discriminated Unions.
        </Typography>
      </Paper>

      {/* Унифицированный список всех задач */}
      <UnifiedTaskList
        tasks={tasks}
        loading={loading}
        error={error}
        statistics={statistics}
        showFilters={true}
        showStats={true}
        allowCreate={true}
      />
    </Box>
  );

  const renderEstimateTasks = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Задачи планирования (EstimateTask)
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Демонстрация блока EstimateTasksBlock, переработанного под унифицированную систему.
        Задачи планирования имеют специальное поле <code>includeMode</code> для финансовых расчетов.
      </Alert>

      <EstimateTasksBlockUnified 
        estimate={{ id: "est_demo_001", name: "Demo Estimate" }}
        block={{ key: "tasks", status: "empty", dataVersion: 1, data: {} }}
        onSave={async (data) => console.log('Save data:', data)}
        saving={false}
        estimateId="est_demo_001"
        readOnly={false}
      />
    </Box>
  );

  const renderProjectTasks = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Задачи выполнения (ProjectTask)
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Задачи выполнения проекта с WBS кодами, бюджетированием и отслеживанием прогресса.
      </Alert>

      <UnifiedTaskList
        tasks={tasks.filter(task => task.phase === 'execution')}
        loading={loading}
        error={error}
        showFilters={true}
        showStats={false}
        allowCreate={true}
        defaultViewMode="card"
      />
    </Box>
  );

  return (
    <TaskConfigProvider>
      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <Typography variant="h4" gutterBottom>
            🚀 Демо: Унифицированная система задач (SSOT)
          </Typography>
          
          <Typography variant="body1" paragraph color="text.secondary">
            Система Single Source of Truth объединяет управление задачами планирования (EstimateTask) 
            и выполнения (ProjectTask) в единую архитектуру с централизованной бизнес-логикой.
          </Typography>

          <Paper sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={currentTab} onChange={handleTabChange}>
              <Tab 
                icon={<DashboardIcon />} 
                label="Dashboard" 
                iconPosition="start"
              />
              <Tab 
                icon={<EstimateIcon />} 
                label="Планирование" 
                iconPosition="start"
              />
              <Tab 
                icon={<ProjectIcon />} 
                label="Выполнение" 
                iconPosition="start"
              />
            </Tabs>
          </Paper>

          {currentTab === 0 && renderDashboard()}
          {currentTab === 1 && renderEstimateTasks()}
          {currentTab === 2 && renderProjectTasks()}
        </Box>
      </Container>
    </TaskConfigProvider>
  );
};

export default UnifiedTasksDemo;
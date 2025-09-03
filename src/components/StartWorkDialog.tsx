import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Stepper, Step, StepLabel,
  StepContent, List, ListItemButton, ListItemText, Button, Box,
  Stack, Typography, Checkbox, FormControlLabel, IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { Project, getProjectsStream } from '../api/projectApi';
import { Task, getTasksStream } from '../api/taskApi';
import { Estimate, EstimateItem, getEstimatesStream } from '../legacy/api/estimateApi';
import { TimeTrackingButton } from './TimeTrackingButton';

interface StartWorkDialogProps {
  open: boolean;
  onClose: () => void;
}

export const StartWorkDialog: React.FC<StartWorkDialogProps> = ({ open, onClose }) => {
  const { currentUser } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [allEstimates, setAllEstimates] = useState<Estimate[]>([]); // Все сметы для привязки

  const [activeStep, setActiveStep] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [accountingType, setAccountingType] = useState<'task' | 'estimate' | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [selectedService, setSelectedService] = useState<EstimateItem | null>(null);

  useEffect(() => {
    console.log('🎬 StartWorkDialog useEffect triggered:', { open, hasCurrentUser: !!currentUser, userId: currentUser?.uid });
    
    if (!open || !currentUser) {
      console.log('❌ StartWorkDialog: Skipping load - open:', open, 'currentUser:', !!currentUser);
      return;
    }
    
    // Сбрасываем состояние при открытии
    setActiveStep(0);
    setSelectedProject(null);
    setAccountingType(null);
    setSelectedTask(null);
    setSelectedEstimate(null);
    setSelectedService(null);

    console.log('🔄 StartWorkDialog: Loading projects for user:', currentUser.uid);
    
    const unsubProjects = getProjectsStream(currentUser.uid, (loadedProjects) => {
      console.log('📁 StartWorkDialog: Projects loaded:', loadedProjects.length);
      console.log('📁 StartWorkDialog: Projects data:', loadedProjects);
      setProjects(loadedProjects);
    });
    
    // Загружаем ВСЕ сметы для возможности привязки
    const unsubAllEstimates = getEstimatesStream(currentUser.uid, '', (loadedAllEstimates) => {
      console.log('📊 StartWorkDialog: All estimates loaded:', loadedAllEstimates.length);
      setAllEstimates(loadedAllEstimates);
    });
    
    // Отписываемся от предыдущих стримов задач и смет
    const cleanup = () => {
      unsubProjects();
      unsubAllEstimates();
    };

    return cleanup;
  }, [open, currentUser]);

  // Загружаем задачи и сметы ТОЛЬКО при выборе проекта
  useEffect(() => {
    if (selectedProject && currentUser) {
      console.log('🔄 Loading data for project:', selectedProject.name, selectedProject.id);
      
      const unsubTasks = getTasksStream(currentUser.uid, (loadedTasks) => {
        console.log('📋 Loaded tasks:', loadedTasks.length, 'for project:', selectedProject.id);
        console.log('📋 Tasks data:', loadedTasks);
        setTasks(loadedTasks);
      }, selectedProject.id);
      
      const unsubEstimates = getEstimatesStream(currentUser.uid, selectedProject.id, (loadedEstimates) => {
        console.log('📊 Loaded estimates:', loadedEstimates.length, 'for project:', selectedProject.id);
        console.log('📊 Estimates data:', loadedEstimates);
        setEstimates(loadedEstimates);
      });
      
      return () => {
        unsubTasks();
        unsubEstimates();
      };
    } else {
      // Если проект не выбран, очищаем списки
      console.log('🧹 Clearing tasks and estimates - no project selected');
      setTasks([]);
      setEstimates([]);
    }
  }, [selectedProject, currentUser]);

  // Функции навигации
  const handleNext = () => setActiveStep(prev => prev + 1);
  const handleBack = () => setActiveStep(prev => prev - 1);

  // Эффект для автоматического пропуска шага выбора услуги
  useEffect(() => {
    if (activeStep === 3 && (accountingType !== 'estimate' || !selectedEstimate?.items || selectedEstimate.items.length === 0)) {
      handleNext();
    }
  }, [activeStep, accountingType, selectedEstimate]);

  const projectTasks = useMemo(() => tasks.filter(t => t.projectId === selectedProject?.id), [tasks, selectedProject]);
  const projectEstimates = useMemo(() => estimates.filter(e => e.projectId === selectedProject?.id), [estimates, selectedProject]);

  // Быстрое создание задачи для проекта
  const handleCreateTask = async () => {
    if (!selectedProject || !currentUser) return;
    
    try {
      // Импортируем функцию создания задачи
      const { addTask } = await import('../api/taskApi');
      
      const newTask = {
        task: `Задача для ${selectedProject.name}`,
        description: 'Автоматически созданная задача для учета времени',
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        status: 'new' as const,
        priority: 'medium' as const
      };
      
      await addTask(currentUser.uid, newTask);
      console.log('✅ Задача создана для проекта:', selectedProject.name);
      
    } catch (error) {
      console.error('❌ Ошибка создания задачи:', error);
    }
  };

  // Привязка существующей сметы к проекту
  const handleLinkEstimate = async () => {
    if (!selectedProject || !currentUser) return;
    
    // Находим непривязанные сметы (без projectId)
    const unlinkedEstimates = allEstimates.filter(e => !e.projectId);
    
    if (unlinkedEstimates.length === 0) {
      console.log('ℹ️ Нет непривязанных смет для связывания');
      return;
    }

    try {
      // Привязываем первую доступную смету к проекту
      const estimateToLink = unlinkedEstimates[0];
      
      // Импортируем API для обновления сметы
      const { updateEstimate } = await import('../legacy/api/estimateApi');
      
      await updateEstimate(currentUser.uid, estimateToLink.id, {
        projectId: selectedProject.id
      });
      
      console.log('✅ Смета привязана к проекту:', selectedProject.name, estimateToLink.name);
      
    } catch (error) {
      console.error('❌ Ошибка привязки сметы:', error);
    }
  };

  const isNextDisabled = () => {
    switch(activeStep) {
      case 0: return !selectedProject;
      case 1: return !accountingType;
      case 2: return accountingType === 'task' ? !selectedTask : !selectedEstimate;
      default: return false;
    }
  };

  const renderStepContent = (step: number) => {
    switch(step) {
      case 0: // Выбор проекта
        console.log('🎨 StartWorkDialog: Rendering projects step. Available projects:', projects.length);
        return (
          <List>
            {projects.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                📁 Проекты не найдены. Загрузка...
              </Typography>
            ) : (
              projects.map(p => (
                <ListItemButton key={p.id} onClick={() => setSelectedProject(p)} selected={selectedProject?.id === p.id}>
                  <ListItemText primary={p.name} />
                </ListItemButton>
              ))
            )}
          </List>
        );
      case 1: // Тип учета
        return (
          <Stack spacing={2}>
            <Button 
              onClick={() => { setAccountingType('task'); handleNext(); }} 
              disabled={projectTasks.length === 0}
              variant={projectTasks.length > 0 ? "contained" : "outlined"}
            >
              По задаче ({projectTasks.length})
            </Button>
            {projectTasks.length === 0 && (
              <Button 
                onClick={() => handleCreateTask()} 
                color="primary" 
                variant="outlined"
                size="small"
              >
                + Создать задачу для проекта
              </Button>
            )}
            
            <Button 
              onClick={() => { setAccountingType('estimate'); handleNext(); }} 
              disabled={projectEstimates.length === 0}
              variant={projectEstimates.length > 0 ? "contained" : "outlined"}
            >
              По смете ({projectEstimates.length})
            </Button>
            {projectEstimates.length === 0 && (
              <Button 
                onClick={() => handleLinkEstimate()} 
                color="secondary" 
                variant="outlined"
                size="small"
              >
                + Привязать смету к проекту
              </Button>
            )}
          </Stack>
        );
      case 2: // Выбор задачи/сметы
        if (accountingType === 'task') {
          return (
            <List>
              {projectTasks.map(t => (
                <ListItemButton key={t.id} onClick={() => setSelectedTask(t)} selected={selectedTask?.id === t.id}>
                  <ListItemText primary={t.task} />
                </ListItemButton>
              ))}
            </List>
          );
        }
        if (accountingType === 'estimate') {
          return (
            <List>
              {projectEstimates.map(e => (
                <ListItemButton key={e.id} onClick={() => setSelectedEstimate(e)} selected={selectedEstimate?.id === e.id}>
                  <ListItemText primary={e.name} />
                </ListItemButton>
              ))}
            </List>
          );
        }
        return null;
        case 3: // Выбор услуги (опционально)
            if (accountingType === 'estimate' && selectedEstimate && selectedEstimate.items && selectedEstimate.items.length > 0) {
              return (
                <>
                  <FormControlLabel
                    control={<Checkbox checked={!selectedService} onChange={() => setSelectedService(null)} />}
                    label={`Работа по смете в целом: ${selectedEstimate.name}`}
                  />
                  <List>
                    {selectedEstimate.items?.map(item => (
                      <ListItemButton key={item.id} onClick={() => setSelectedService(item)} selected={selectedService?.id === item.id}>
                        <ListItemText primary={item.name} />
                      </ListItemButton>
                    ))}
                  </List>
                </>
              );
            }
            // Если услуг нет, показываем сообщение о пропуске
            return <Typography>Услуги не найдены, шаг пропускается...</Typography>;
      case 4: // Подтверждение и старт
        return (
          <Box textAlign="center">
            <Typography>Проект: {selectedProject?.name}</Typography>
            {selectedTask && <Typography>Задача: {selectedTask?.task}</Typography>}
            {selectedEstimate && <Typography>Смета: {selectedEstimate?.name}</Typography>}
            {selectedService && <Typography>Услуга: {selectedService?.name}</Typography>}
            <TimeTrackingButton
              project={selectedProject}
              task={selectedTask}
              estimate={selectedEstimate}
              service={selectedService}
              onStart={onClose}
            />
          </Box>
        );
      default: return null;
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Начать работу
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        {!currentUser ? (
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary">
              ⏳ Загружается информация о пользователе...
            </Typography>
          </Box>
        ) : (
          <Stepper activeStep={activeStep} orientation="vertical">
            <Step>
              <StepLabel>Выберите проект</StepLabel>
              <StepContent>{renderStepContent(0)}</StepContent>
            </Step>
            <Step>
              <StepLabel>Тип учета</StepLabel>
              <StepContent>{renderStepContent(1)}</StepContent>
            </Step>
            <Step>
              <StepLabel>Выберите {accountingType === 'task' ? 'задачу' : 'смету'}</StepLabel>
              <StepContent>{renderStepContent(2)}</StepContent>
            </Step>
            {accountingType === 'estimate' && (
              <Step>
                <StepLabel optional>Выберите услугу</StepLabel>
                <StepContent>{renderStepContent(3)}</StepContent>
              </Step>
            )}
            <Step>
              <StepLabel>Старт</StepLabel>
              <StepContent>{renderStepContent(4)}</StepContent>
            </Step>
          </Stepper>
        )}
      </DialogContent>
      {currentUser && (
        <Stack direction="row" justifyContent="space-between" sx={{ p: 2 }}>
          <Button onClick={handleBack} disabled={activeStep === 0}>Назад</Button>
          <Button onClick={handleNext} variant="contained" disabled={isNextDisabled()}>Далее</Button>
        </Stack>
      )}
    </Dialog>
  );
};

export default StartWorkDialog;

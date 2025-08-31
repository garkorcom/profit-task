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
import { Contractor } from '../api/contractorApi';

interface StartWorkDialogProps {
  open: boolean;
  onClose: () => void;
  contractor: Contractor | null;
}

export const StartWorkFromContractorDialog: React.FC<StartWorkDialogProps> = ({ open, onClose, contractor }) => {
  const { currentUser } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);

  const [activeStep, setActiveStep] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [accountingType, setAccountingType] = useState<'task' | 'estimate' | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [selectedService, setSelectedService] = useState<EstimateItem | null>(null);

  useEffect(() => {
    if (!open || !currentUser) return;
    
    // Сбрасываем состояние при открытии
    setActiveStep(0);
    setSelectedProject(null);
    setAccountingType(null);
    setSelectedTask(null);
    setSelectedEstimate(null);
    setSelectedService(null);

    const unsubProjects = getProjectsStream(currentUser.uid, allProjects => {
      // Фильтруем проекты по контрагенту
      setProjects(allProjects.filter(p => p.contractorId === contractor?.id));
    });
    return () => {
      unsubProjects();
    };
  }, [open, currentUser, contractor]);

  // Загружаем задачи и сметы ТОЛЬКО при выборе проекта
  useEffect(() => {
    if (selectedProject && currentUser) {
      const unsubTasks = getTasksStream(currentUser.uid, setTasks, selectedProject.id);
      const unsubEstimates = getEstimatesStream(currentUser.uid, selectedProject.id, setEstimates);
      
      return () => {
        unsubTasks();
        unsubEstimates();
      };
    } else {
      // Если проект не выбран, очищаем списки
      setTasks([]);
      setEstimates([]);
    }
  }, [selectedProject, currentUser]);

  // Эффект для автоматического пропуска шага выбора услуги
  useEffect(() => {
    if (activeStep === 3 && (accountingType !== 'estimate' || !selectedEstimate?.items || selectedEstimate.items.length === 0)) {
      handleNext();
    }
  }, [activeStep, accountingType, selectedEstimate]);

  const projectTasks = useMemo(() => tasks.filter(t => t.projectId === selectedProject?.id), [tasks, selectedProject]);
  const projectEstimates = useMemo(() => estimates.filter(e => e.projectId === selectedProject?.id), [estimates, selectedProject]);
  
  const handleNext = () => setActiveStep(prev => prev + 1);
  const handleBack = () => setActiveStep(prev => prev - 1);

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
        return (
          <List>
            {projects.map(p => (
              <ListItemButton key={p.id} onClick={() => setSelectedProject(p)} selected={selectedProject?.id === p.id}>
                <ListItemText primary={p.name} />
              </ListItemButton>
            ))}
          </List>
        );
      case 1: // Тип учета
        return (
          <Stack spacing={2}>
            <Button onClick={() => { setAccountingType('task'); handleNext(); }} disabled={projectTasks.length === 0}>
              По задаче ({projectTasks.length})
            </Button>
            <Button onClick={() => { setAccountingType('estimate'); handleNext(); }} disabled={projectEstimates.length === 0}>
              По смете ({projectEstimates.length})
            </Button>
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
        Начать работу по контрагенту: {contractor?.name}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
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
      </DialogContent>
      <Stack direction="row" justifyContent="space-between" sx={{ p: 2 }}>
        <Button onClick={handleBack} disabled={activeStep === 0}>Назад</Button>
        <Button onClick={handleNext} variant="contained" disabled={isNextDisabled()}>Далее</Button>
      </Stack>
    </Dialog>
  );
};

export default StartWorkFromContractorDialog;

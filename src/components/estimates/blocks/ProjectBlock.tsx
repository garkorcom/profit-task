/**
 * Блок "Проект" для конструктора смет
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Button,
  Stack,
  Typography,
  Alert,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Add as AddIcon,
  Folder as FolderIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';

import { useAuth } from '../../../auth/AuthContext';
import { 
  Estimate, 
  BlockState, 
  ProjectBlockData 
} from '../../../types/estimate.types';
import { 
  getProjectsStream, 
  Project,
  addProject,
} from '../../../api/projectApi';

interface ProjectBlockProps {
  estimate: Estimate;
  block: BlockState;
  onSave: (data: ProjectBlockData) => void;
  saving: boolean;
}

const ProjectBlock: React.FC<ProjectBlockProps> = ({
  estimate,
  block,
  onSave,
  saving,
}) => {
  const { currentUser } = useAuth();
  const blockData = (block.data || {}) as ProjectBlockData;
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [siteAddress, setSiteAddress] = useState(blockData?.siteAddressId || '');
  const [createDialog, setCreateDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    address: '',
    contractorId: estimate.counterpartyId || '',
  });
  
  // Load projects
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = getProjectsStream(currentUser.uid, (data) => {
      setProjects(data);
      
      // Set selected if exists
      if (blockData?.projectId) {
        const existing = data.find(p => p.id === blockData.projectId);
        if (existing) {
          setSelectedProject(existing);
          // For now, we don't have address in the old Project interface
          setSiteAddress('');
        }
      }
    });
    
    return unsubscribe;
  }, [currentUser, blockData?.projectId]);
  
  // Auto-fill from counterparty
  useEffect(() => {
    const counterpartyBlock = estimate.blocks.find(b => b.key === 'counterparty');
    if (counterpartyBlock?.status === 'complete') {
      const data = counterpartyBlock.data as any;
      if (data.counterpartyId && !selectedProject) {
        // Filter projects by contractor
        const contractorProjects = projects.filter(
          p => p.contractorId === data.counterpartyId
        );
        if (contractorProjects.length === 1) {
          setSelectedProject(contractorProjects[0]);
        }
      }
    }
  }, [estimate.blocks, projects, selectedProject]);
  
  // Handlers
  const handleProjectSelect = (project: Project | null) => {
    setSelectedProject(project);
    // For now, we don't have address in the old Project interface
    if (project) {
      setSiteAddress('');
    }
  };
  
  const handleCreateProject = async () => {
    if (!currentUser || !newProject.name) return;
    
    try {
      await addProject(currentUser.uid, {
        name: newProject.name,
        description: newProject.description,
        status: 'planned',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        budget: 0,
        contractorId: newProject.contractorId,
      });
      
      setCreateDialog(false);
      setNewProject({
        name: '',
        description: '',
        address: '',
        contractorId: estimate.counterpartyId || '',
      });
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };
  
  const handleSave = () => {
    if (!selectedProject && !window.confirm('Продолжить без проекта?')) {
      return;
    }
    
    const data: ProjectBlockData = {
      projectId: selectedProject?.id || '',
      siteAddressId: siteAddress,
      // TODO: Add jurisdiction and tax settings
    };
    
    onSave(data);
  };
  
  return (
    <Box>
      <Stack spacing={3}>
        {/* Quick actions */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
          >
            Создать проект
          </Button>
        </Stack>
        
        {/* Project selection */}
        <Autocomplete
          value={selectedProject}
          onChange={(e, value) => handleProjectSelect(value)}
          options={projects}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Проект"
              placeholder="Выберите или начните вводить..."
              InputProps={{
                ...params.InputProps,
                startAdornment: <FolderIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          )}
          renderOption={(props, option) => {
            const { key, ...optionProps } = props as any;
            return (
            <Box component="li" key={key} {...optionProps}>
              <Stack>
                <Typography variant="body1">{option.name}</Typography>
                {option.description && (
                  <Typography variant="caption" color="text.secondary">
                    {option.description}
                  </Typography>
                )}
              </Stack>
            </Box>
            );
          }}
        />
        
        {/* Selected project details */}
        {selectedProject && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Информация о проекте
              </Typography>
              
              <Stack spacing={2} mt={2}>
                {selectedProject.description && (
                  <Typography variant="body2">
                    {selectedProject.description}
                  </Typography>
                )}
                
                <Stack direction="row" spacing={1}>
                  <Chip 
                    label={selectedProject.status} 
                    size="small"
                    color={selectedProject.status === 'active' ? 'success' : 'default'}
                  />
                </Stack>
                
                {selectedProject.budget && selectedProject.budget > 0 && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <MoneyIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      Бюджет: {selectedProject.budget.toLocaleString('en-US')} $
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
        
        {/* Site address */}
        <TextField
          label="Адрес объекта"
          value={siteAddress}
          onChange={(e) => setSiteAddress(e.target.value)}
          multiline
          rows={2}
          fullWidth
          InputProps={{
            startAdornment: <LocationIcon sx={{ mr: 1, color: 'action.active' }} />,
          }}
          helperText="Укажите точный адрес для корректного расчета налогов и логистики"
        />
        
        {/* Tax jurisdiction */}
        <FormControl fullWidth>
          <InputLabel>Налоговая юрисдикция</InputLabel>
          <Select
            value="moscow"
            label="Налоговая юрисдикция"
          >
            <MenuItem value="moscow">Москва (НДС 20%)</MenuItem>
            <MenuItem value="spb">Санкт-Петербург (НДС 20%)</MenuItem>
            <MenuItem value="kz">Казахстан (НДС 12%)</MenuItem>
            <MenuItem value="simplified">УСН 6%</MenuItem>
          </Select>
        </FormControl>
        
        {/* Info alert */}
        {block.status === 'empty' && (
          <Alert severity="info">
            Привязка к проекту опциональна, но рекомендуется для корректного учета 
            затрат и отслеживания выполнения работ.
          </Alert>
        )}
        
        {/* Warning if no contractor in project */}
        {selectedProject && !selectedProject.contractorId && (
          <Alert severity="warning">
            У выбранного проекта не указан контрагент. Рекомендуется заполнить 
            блок "Контрагент" отдельно.
          </Alert>
        )}
        
        {/* Save button */}
        <Box>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить блок'}
          </Button>
        </Box>
      </Stack>
      
      {/* Create project dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать проект</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Название проекта"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              required
              fullWidth
            />
            
            <TextField
              label="Описание"
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            
            <TextField
              label="Адрес объекта"
              value={newProject.address}
              onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>
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
    </Box>
  );
};

export default ProjectBlock;

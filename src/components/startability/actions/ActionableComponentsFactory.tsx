/**
 * ============================================================================
 * ACTIONABLE COMPONENTS FACTORY - Master-Detail UI Implementation
 * ============================================================================
 * 
 * Factory component for rendering resolution actions according to TZ specifications.
 * Implements the actionable UI pattern with type-based component selection.
 * 
 * @author Senior Full-Stack Engineer + UX Architect  
 * @version 2.0.0 - Technical Requirements
 * @feature estimates.startability_v1
 */

import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  Approval as ApprovalIcon,
  Visibility as ViewIcon,
  Upload as UploadIcon,
  Navigation as NavigationIcon,
  Build as BuildIcon,
  CheckCircle as ApproveIcon,
  Inventory as MaterialsIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { t } from '../../../utils/mockTranslations';

import { ResolutionAction, StartabilityCTA } from '../../../types/startability.types';
import { executeResolutionAction } from '../../../api/startabilityV2Api';

// =====================================================
// COMPONENT PROPS
// =====================================================

interface ActionableComponentProps {
  resolutionAction: ResolutionAction;
  onExecuted: (success: boolean, message: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

interface ActionDialogProps {
  open: boolean;
  onClose: () => void;
  onExecute: (additionalData?: Record<string, any>) => void;
  resolutionAction: ResolutionAction;
  loading?: boolean;
}

// =====================================================
// MOCK DATA PROVIDERS (for testing)
// =====================================================

const mockUsers = [
  { id: 'user-1', name: 'Иван Петров', role: 'Слесарь' },
  { id: 'user-2', name: 'Мария Иванова', role: 'Мастер' },
  { id: 'user-3', name: 'Алексей Сидоров', role: 'Подрядчик' }
];

const mockApprovalTypes = [
  { value: 'budget', label: 'Бюджет' },
  { value: 'estimate', label: 'Смета' },
  { value: 'design', label: 'Дизайн' },
  { value: 'materials', label: 'Материалы' }
];

// =====================================================
// ACTION DIALOGS - TZ REQUIREMENT: SPECIFIC UI COMPONENTS
// =====================================================

/**
 * ASSIGN_USER Dialog Component
 */
const AssignUserDialog: React.FC<ActionDialogProps> = ({ 
  open, onClose, onExecute, resolutionAction, loading 
}) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [comments, setComments] = useState('');

  const handleExecute = () => {
    if (!selectedUserId) return;
    
    onExecute({
      assigneeId: selectedUserId,
      comments,
      taskName: resolutionAction.contextData?.taskName
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Назначить исполнителя</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Задача: {resolutionAction.contextData?.taskName || 'Без названия'}
          </Typography>
          
          <FormControl fullWidth>
            <InputLabel>Исполнитель</InputLabel>
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              label="Исполнитель"
            >
              {mockUsers.map(user => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label="Комментарии (опционально)"
            multiline
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            variant="outlined"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button 
          onClick={handleExecute} 
          variant="contained"
          disabled={!selectedUserId || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <PersonIcon />}
        >
          Назначить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * REQUEST_APPROVAL Dialog Component
 */
const RequestApprovalDialog: React.FC<ActionDialogProps> = ({ 
  open, onClose, onExecute, resolutionAction, loading 
}) => {
  const [approvalType, setApprovalType] = useState(resolutionAction.contextData?.approvalType || '');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');

  const handleExecute = () => {
    onExecute({
      approvalType,
      message: message || 'Запрос на утверждение',
      priority
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Запросить утверждение</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Тип утверждения</InputLabel>
            <Select
              value={approvalType}
              onChange={(e) => setApprovalType(e.target.value)}
              label="Тип утверждения"
            >
              {mockApprovalTypes.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>Приоритет</InputLabel>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              label="Приоритет"
            >
              <MenuItem value="low">Низкий</MenuItem>
              <MenuItem value="normal">Обычный</MenuItem>
              <MenuItem value="high">Высокий</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Сообщение"
            multiline
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            variant="outlined"
            placeholder="Опишите что требует утверждения..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button 
          onClick={handleExecute} 
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <ApprovalIcon />}
        >
          Отправить запрос
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * UPLOAD_DOCUMENT Dialog Component
 */
const UploadDocumentDialog: React.FC<ActionDialogProps> = ({ 
  open, onClose, onExecute, resolutionAction, loading 
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [comments, setComments] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const handleExecute = () => {
    onExecute({
      files: selectedFiles,
      comments,
      requiredDocuments: resolutionAction.contextData?.requiredDocuments
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Загрузить документы</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {resolutionAction.contextData?.requiredDocuments && (
            <Alert severity="info">
              Требуемые документы: {resolutionAction.contextData.requiredDocuments.join(', ')}
            </Alert>
          )}
          
          <Box>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ marginBottom: 16 }}
              accept=".pdf,.jpg,.png,.doc,.docx"
            />
            {selectedFiles.length > 0 && (
              <Typography variant="body2">
                Выбрано файлов: {selectedFiles.length}
              </Typography>
            )}
          </Box>
          
          <TextField
            label="Комментарии"
            multiline
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            variant="outlined"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button 
          onClick={handleExecute} 
          variant="contained"
          disabled={selectedFiles.length === 0 || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
        >
          Загрузить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =====================================================
// FACTORY COMPONENT - TZ REQUIREMENT: ACTIONABLE COMPONENTS
// =====================================================

/**
 * Main Factory Component implementing TZ specifications
 * Maps ResolutionAction.type to specific UI components
 */
export const ActionableComponentsFactory: React.FC<ActionableComponentProps> = ({
  resolutionAction,
  onExecuted,
  disabled = false,
  compact = false
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  /**
   * Core execution handler - calls API and reports results
   */
  const handleExecute = async (additionalData?: Record<string, any>) => {
    setLoading(true);
    
    try {
      const result = await executeResolutionAction(resolutionAction, additionalData);
      
      onExecuted(result.success, result.message);
      
      if (result.success) {
        setDialogOpen(false);
      }
      
    } catch (error) {
      onExecuted(false, `Ошибка выполнения: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigation handler for NAVIGATE actions
   */
  const handleNavigation = () => {
    const route = resolutionAction.contextData?.route;
    if (route) {
      navigate(route);
      onExecuted(true, 'Переход выполнен');
    }
  };

  /**
   * Get appropriate icon for CTA type
   */
  const getActionIcon = (type: StartabilityCTA) => {
    switch (type) {
      case 'ASSIGN_USER': return <PersonIcon />;
      case 'REQUEST_APPROVAL': return <ApprovalIcon />;
      case 'VIEW_DEPENDENCY': return <ViewIcon />;
      case 'UPLOAD_DOCUMENT': return <UploadIcon />;
      case 'NAVIGATE': return <NavigationIcon />;
      case 'COMPLETE_ESTIMATE_BLOCK': return <BuildIcon />;
      case 'APPROVE_ESTIMATE': return <ApproveIcon />;
      case 'RESOLVE_MATERIALS': return <MaterialsIcon />;
      case 'CHANGE_PROJECT_STATUS': return <SettingsIcon />;
      default: return <BuildIcon />;
    }
  };

  /**
   * Render action button with appropriate handling
   */
  const renderActionButton = () => {
    const icon = getActionIcon(resolutionAction.type);
    const label = resolutionAction.label;

    // Navigation actions don't need dialogs
    if (resolutionAction.type === 'NAVIGATE' || resolutionAction.type === 'VIEW_DEPENDENCY') {
      return (
        <Button
          variant={compact ? "text" : "contained"}
          size={compact ? "small" : "medium"}
          disabled={disabled}
          onClick={handleNavigation}
          startIcon={icon}
          sx={{ minWidth: compact ? 'auto' : 120 }}
        >
          {compact ? '' : label}
        </Button>
      );
    }

    // Actions that need API calls but no additional input
    if (resolutionAction.type === 'APPROVE_ESTIMATE' || resolutionAction.type === 'CHANGE_PROJECT_STATUS') {
      return (
        <Button
          variant={compact ? "text" : "contained"}
          size={compact ? "small" : "medium"}
          disabled={disabled || loading}
          onClick={() => handleExecute()}
          startIcon={loading ? <CircularProgress size={20} /> : icon}
          sx={{ minWidth: compact ? 'auto' : 120 }}
        >
          {compact ? '' : label}
        </Button>
      );
    }

    // Actions that need dialog input
    return (
      <Button
        variant={compact ? "text" : "contained"}
        size={compact ? "small" : "medium"}
        disabled={disabled}
        onClick={() => setDialogOpen(true)}
        startIcon={icon}
        sx={{ minWidth: compact ? 'auto' : 120 }}
      >
        {compact ? '' : label}
      </Button>
    );
  };

  /**
   * Render appropriate dialog based on action type
   */
  const renderDialog = () => {
    const dialogProps = {
      open: dialogOpen,
      onClose: () => setDialogOpen(false),
      onExecute: handleExecute,
      resolutionAction,
      loading
    };

    switch (resolutionAction.type) {
      case 'ASSIGN_USER':
        return <AssignUserDialog {...dialogProps} />;
      case 'REQUEST_APPROVAL':
        return <RequestApprovalDialog {...dialogProps} />;
      case 'UPLOAD_DOCUMENT':
        return <UploadDocumentDialog {...dialogProps} />;
      default:
        return null;
    }
  };

  return (
    <>
      {renderActionButton()}
      {renderDialog()}
    </>
  );
};

export default ActionableComponentsFactory;
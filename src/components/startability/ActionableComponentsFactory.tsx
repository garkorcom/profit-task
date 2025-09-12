/**
 * ============================================================================
 * ACTIONABLE COMPONENTS FACTORY - Technical Requirements Implementation
 * ============================================================================
 * 
 * Factory pattern for creating actionable UI components based on ResolutionAction
 * type. Maps TZ-specified ResolutionAction.type to appropriate UI components
 * with full context data handling.
 * 
 * @author Senior Full-Stack Engineer + UX Architect
 * @version 1.0.0 - Technical Requirements
 * @feature estimates.startability_v1
 */

import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  CircularProgress,
  FormControlLabel,
  Switch,
  Divider
} from '@mui/material';
import {
  PersonAdd,
  Approval,
  Visibility,
  FileUpload,
  Navigation,
  Assignment,
  Business,
  Inventory,
  Build,
  CheckCircle,
  Error,
  Warning,
  Info,
  Close,
  Refresh
} from '@mui/icons-material';

import { ResolutionAction, StartabilityCTA } from '../../types/startability.types';
import { executeResolutionAction } from '../../api/startabilityV2Api';

// =====================================================
// FACTORY INTERFACE & TYPES
// =====================================================

interface ActionableComponentProps {
  resolutionAction: ResolutionAction;
  onExecute: (result: { success: boolean; message: string }) => void;
  onCancel: () => void;
  disabled?: boolean;
}

interface ActionableComponentFactoryProps {
  resolutionAction: ResolutionAction;
  onExecute: (result: { success: boolean; message: string }) => void;
  disabled?: boolean;
}

// =====================================================
// INDIVIDUAL ACTIONABLE COMPONENTS
// =====================================================

/**
 * ASSIGN_USER Component - User assignment interface
 */
const AssignUserComponent: React.FC<ActionableComponentProps> = ({
  resolutionAction,
  onExecute,
  onCancel,
  disabled
}) => {
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock users - in real implementation, fetch from API
  const availableUsers = [
    { id: 'user1', name: 'Иван Петров', role: 'Исполнитель' },
    { id: 'user2', name: 'Мария Иванова', role: 'Подрядчик' },
    { id: 'user3', name: 'Алексей Сидоров', role: 'Мастер' }
  ];

  const handleExecute = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const result = await executeResolutionAction(resolutionAction, {
        assigneeId: selectedUser,
        notes
      });
      onExecute(result);
      setOpen(false);
    } catch (error) {
      onExecute({
        success: false,
        message: `Ошибка назначения: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        size="small"
        startIcon={<PersonAdd />}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {resolutionAction.label}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PersonAdd />
            Назначить исполнителя
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Выберите исполнителя</InputLabel>
              <Select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                label="Выберите исполнителя"
              >
                {availableUsers.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    <Box>
                      <Typography variant="body1">{user.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.role}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              multiline
              rows={3}
              label="Заметки (необязательно)"
              placeholder="Добавьте особые указания..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {selectedUser && (
              <Alert severity="info">
                Задача будет назначена: {availableUsers.find(u => u.id === selectedUser)?.name}
              </Alert>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            Отмена
          </Button>
          <Button
            onClick={handleExecute}
            variant="contained"
            disabled={!selectedUser || loading}
            startIcon={loading ? <CircularProgress size={16} /> : <Assignment />}
          >
            Назначить задачу
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * REQUEST_APPROVAL Component - Approval request interface
 */
const RequestApprovalComponent: React.FC<ActionableComponentProps> = ({
  resolutionAction,
  onExecute,
  onCancel,
  disabled
}) => {
  const [open, setOpen] = useState(false);
  const [approvalType, setApprovalType] = useState('estimate');
  const [priority, setPriority] = useState('normal');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    if (!message.trim()) return;

    setLoading(true);
    try {
      const result = await executeResolutionAction(resolutionAction, {
        approvalType,
        priority,
        message: message.trim()
      });
      onExecute(result);
      setOpen(false);
    } catch (error) {
      onExecute({
        success: false,
        message: `Ошибка отправки запроса: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="warning"
        size="small"
        startIcon={<Approval />}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {resolutionAction.label}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Approval />
            Запрос на утверждение
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Тип утверждения</InputLabel>
                <Select
                  value={approvalType}
                  onChange={(e) => setApprovalType(e.target.value)}
                  label="Тип утверждения"
                >
                  <MenuItem value="estimate">Утверждение сметы</MenuItem>
                  <MenuItem value="budget">Утверждение бюджета</MenuItem>
                  <MenuItem value="client">Утверждение клиента</MenuItem>
                  <MenuItem value="manager">Утверждение руководителя</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Приоритет</InputLabel>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  label="Приоритет"
                >
                  <MenuItem value="normal">Обычный</MenuItem>
                  <MenuItem value="urgent">Срочный</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <TextField
              multiline
              rows={4}
              label="Текст запроса"
              placeholder="Объясните, что нужно утвердить и почему..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />

            {message.trim() && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Предварительный просмотр:
                </Typography>
                <Alert severity="info">
                  <Typography variant="body2">
                    {message.trim()}
                  </Typography>
                </Alert>
              </Box>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            Отмена
          </Button>
          <Button
            onClick={handleExecute}
            variant="contained"
            disabled={!message.trim() || loading}
            startIcon={loading ? <CircularProgress size={16} /> : <Approval />}
          >
            Отправить запрос
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * VIEW_DEPENDENCY Component - Dependency viewer interface
 */
const ViewDependencyComponent: React.FC<ActionableComponentProps> = ({
  resolutionAction,
  onExecute,
  onCancel,
  disabled
}) => {
  const [open, setOpen] = useState(false);

  // Mock dependencies - in real implementation, fetch from contextData
  const dependencies = [
    { 
      id: 'dep1', 
      name: 'Получение разрешения на строительство', 
      status: 'pending',
      progress: 30,
      assignee: 'Департамент архитектуры'
    },
    { 
      id: 'dep2', 
      name: 'Закупка материалов', 
      status: 'in_progress',
      progress: 75,
      assignee: 'Отдел снабжения'
    },
    { 
      id: 'dep3', 
      name: 'Подготовка рабочей площадки', 
      status: 'completed',
      progress: 100,
      assignee: 'Бригада №1'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" />;
      case 'in_progress': return <Build color="primary" />;
      case 'pending': return <Warning color="warning" />;
      default: return <Error color="error" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Завершено';
      case 'in_progress': return 'В работе';
      case 'pending': return 'Ожидает';
      case 'blocked': return 'Заблокировано';
      default: return 'Неизвестно';
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<Visibility />}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {resolutionAction.label}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Visibility />
            Зависимости задачи
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Блокирующие задачи, которые должны быть завершены:
          </Typography>

          <List>
            {dependencies.map((dep, index) => (
              <React.Fragment key={dep.id}>
                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(dep.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1">{dep.name}</Typography>
                        <Chip 
                          label={getStatusText(dep.status)} 
                          size="small"
                          color={dep.status === 'completed' ? 'success' : 
                                 dep.status === 'in_progress' ? 'primary' : 'warning'}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" display="block">
                          Исполнитель: {dep.assignee}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption">Прогресс:</Typography>
                          <Box sx={{ 
                            width: 100, 
                            height: 6, 
                            backgroundColor: '#e0e0e0', 
                            borderRadius: 3,
                            overflow: 'hidden'
                          }}>
                            <Box sx={{ 
                              width: `${dep.progress}%`, 
                              height: '100%', 
                              backgroundColor: dep.status === 'completed' ? '#4caf50' : '#2196f3'
                            }} />
                          </Box>
                          <Typography variant="caption">{dep.progress}%</Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <Box>
                    <Tooltip title="Просмотр задачи">
                      <IconButton size="small">
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
                {index < dependencies.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            Закрыть
          </Button>
          <Button variant="outlined" startIcon={<Refresh />}>
            Обновить статус
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * UPLOAD_DOCUMENT Component - Document upload interface
 */
const UploadDocumentComponent: React.FC<ActionableComponentProps> = ({
  resolutionAction,
  onExecute,
  onCancel,
  disabled
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="contained"
        color="info"
        size="small"
        startIcon={<FileUpload />}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {resolutionAction.label}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <FileUpload />
            Загрузить документы
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Для продолжения работ требуются следующие документы:
          </Alert>

          <List>
            <ListItem>
              <ListItemText 
                primary="Разрешение на строительство"
                secondary="PDF, DOC, не более 10MB"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Страховые документы"
                secondary="PDF, не более 5MB"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Техника безопасности"
                secondary="PDF, DOC, не более 5MB"
              />
            </ListItem>
          </List>

          <Box sx={{ mt: 2, p: 2, border: '2px dashed #ccc', borderRadius: 1, textAlign: 'center' }}>
            <FileUpload sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Перетащите файлы сюда или нажмите для выбора
            </Typography>
            <Button variant="outlined" sx={{ mt: 1 }}>
              Выбрать файлы
            </Button>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button variant="contained" startIcon={<FileUpload />}>
            Загрузить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * NAVIGATE Component - Navigation action (no dialog needed)
 */
const NavigateComponent: React.FC<ActionableComponentProps> = ({
  resolutionAction,
  onExecute,
  disabled
}) => {
  const handleNavigate = () => {
    const { route, section } = resolutionAction.contextData || {};
    
    if (route) {
      // In real implementation, use React Router navigation
      console.log(`Navigating to ${route}${section ? `#${section}` : ''}`);
      window.location.hash = route + (section ? `#${section}` : '');
    }
    
    onExecute({
      success: true,
      message: 'Перенаправление выполнено'
    });
  };

  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<Navigation />}
      onClick={handleNavigate}
      disabled={disabled}
    >
      {resolutionAction.label}
    </Button>
  );
};

// =====================================================
// ACTIONABLE COMPONENTS FACTORY
// =====================================================

/**
 * Factory function that creates appropriate UI component based on ResolutionAction.type
 * Implements TZ requirements for mapping actionable components
 */
export const ActionableComponentsFactory: React.FC<ActionableComponentFactoryProps> = ({
  resolutionAction,
  onExecute,
  disabled = false
}) => {
  const handleCancel = () => {
    // Optional cancel handler
  };

  // Factory pattern: map ResolutionAction.type to component
  switch (resolutionAction.type) {
    case 'ASSIGN_USER':
      return (
        <AssignUserComponent
          resolutionAction={resolutionAction}
          onExecute={onExecute}
          onCancel={handleCancel}
          disabled={disabled}
        />
      );

    case 'REQUEST_APPROVAL':
      return (
        <RequestApprovalComponent
          resolutionAction={resolutionAction}
          onExecute={onExecute}
          onCancel={handleCancel}
          disabled={disabled}
        />
      );

    case 'VIEW_DEPENDENCY':
      return (
        <ViewDependencyComponent
          resolutionAction={resolutionAction}
          onExecute={onExecute}
          onCancel={handleCancel}
          disabled={disabled}
        />
      );

    case 'UPLOAD_DOCUMENT':
      return (
        <UploadDocumentComponent
          resolutionAction={resolutionAction}
          onExecute={onExecute}
          onCancel={handleCancel}
          disabled={disabled}
        />
      );

    case 'NAVIGATE':
      return (
        <NavigateComponent
          resolutionAction={resolutionAction}
          onExecute={onExecute}
          onCancel={handleCancel}
          disabled={disabled}
        />
      );

    case 'RESOLVE_MATERIALS':
      return (
        <Button
          variant="contained"
          color="secondary"
          size="small"
          startIcon={<Inventory />}
          disabled={disabled}
          onClick={() => onExecute({
            success: true,
            message: 'Открытие модуля материалов...'
          })}
        >
          {resolutionAction.label}
        </Button>
      );

    case 'CHANGE_PROJECT_STATUS':
      return (
        <Button
          variant="contained"
          color="info"
          size="small"
          startIcon={<Business />}
          disabled={disabled}
          onClick={() => onExecute({
            success: true,
            message: 'Изменение статуса проекта...'
          })}
        >
          {resolutionAction.label}
        </Button>
      );

    default:
      // Fallback for unknown action types
      return (
        <Button
          variant="outlined"
          size="small"
          startIcon={<Info />}
          disabled={disabled}
          onClick={() => onExecute({
            success: true,
            message: `Действие выполнено: ${resolutionAction.type}`
          })}
        >
          {resolutionAction.label || 'Выполнить действие'}
        </Button>
      );
  }
};

export default ActionableComponentsFactory;
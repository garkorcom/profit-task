/**
 * ============================================================================
 * CTA ACTIONS - Call-to-Action Components
 * ============================================================================
 * 
 * Actionable components for resolving startability issues.
 * Each CTA provides specific UI for users to resolve blocking reasons.
 * 
 * @author Senior Full-Stack Engineer + UX Architect
 * @version 1.0.0
 * @feature estimates.startability_v1
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Box,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Autocomplete,
  Card,
  CardContent
} from '@mui/material';

import {
  Person as PersonIcon,
  Send as SendIcon,
  AccountTree as TreeIcon,
  Security as SecurityIcon,
  Assignment as TaskIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

import {
  StartabilityReason,
  StartabilityCTA
} from '../../../types/startability.types';

import { useTranslation } from 'react-i18next';

// =====================================================
// COMMON INTERFACES
// =====================================================

interface CTAActionProps {
  reason: StartabilityReason;
  open: boolean;
  onClose: () => void;
  onExecute: (data: any) => Promise<boolean>;
  isLoading?: boolean;
}

// Mock data - would come from actual APIs
const MOCK_ASSIGNEES = [
  { id: 'user-1', name: 'John Smith', role: 'Senior Developer', avatar: '/avatars/john.jpg' },
  { id: 'user-2', name: 'Sarah Johnson', role: 'Project Manager', avatar: '/avatars/sarah.jpg' },
  { id: 'user-3', name: 'Mike Wilson', role: 'Designer', avatar: '/avatars/mike.jpg' },
  { id: 'user-4', name: 'Lisa Brown', role: 'QA Engineer', avatar: '/avatars/lisa.jpg' }
];

const MOCK_DEPENDENCIES = [
  { id: 'task-1', name: 'Complete Foundation', status: 'in_progress', progress: 75 },
  { id: 'task-2', name: 'Approve Materials', status: 'pending', progress: 0 },
  { id: 'task-3', name: 'Site Preparation', status: 'completed', progress: 100 }
];

// =====================================================
// ASSIGN CTA COMPONENT
// =====================================================

export const AssignCTAAction: React.FC<CTAActionProps> = ({
  reason,
  open,
  onClose,
  onExecute,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const [selectedAssignee, setSelectedAssignee] = useState<typeof MOCK_ASSIGNEES[0] | null>(null);
  const [notes, setNotes] = useState('');

  const handleAssign = async () => {
    if (!selectedAssignee) return;

    const success = await onExecute({
      assigneeId: selectedAssignee.id,
      assigneeName: selectedAssignee.name,
      taskId: reason.meta?.taskId,
      serviceId: reason.meta?.serviceId,
      notes
    });

    if (success) {
      setSelectedAssignee(null);
      setNotes('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" />
          {t('startability.cta.assign_title')}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {/* Reason Context */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              {t(reason.message)}
            </Typography>
            {reason.meta?.entityName && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {t('startability.entity')}: <strong>{reason.meta.entityName}</strong>
              </Typography>
            )}
          </Alert>

          {/* Assignee Selection */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <Autocomplete
              options={MOCK_ASSIGNEES}
              getOptionLabel={(option) => `${option.name} (${option.role})`}
              value={selectedAssignee}
              onChange={(_, newValue) => setSelectedAssignee(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('startability.assign.select_assignee')}
                  variant="outlined"
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" />
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {option.role}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            />
          </FormControl>

          {/* Optional Notes */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('startability.assign.notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('startability.assign.notes_placeholder')}
            variant="outlined"
          />

          {/* Selected Assignee Preview */}
          {selectedAssignee && (
            <Card sx={{ mt: 2, backgroundColor: 'success.light' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckIcon color="success" fontSize="small" />
                  <Typography variant="subtitle2">
                    {t('startability.assign.will_assign_to', { name: selectedAssignee.name })}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleAssign}
          disabled={!selectedAssignee || isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : <PersonIcon />}
        >
          {t('startability.assign.assign_button')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =====================================================
// REQUEST APPROVAL CTA COMPONENT
// =====================================================

export const RequestApprovalCTAAction: React.FC<CTAActionProps> = ({
  reason,
  open,
  onClose,
  onExecute,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const [approvalType, setApprovalType] = useState<'client' | 'manager' | 'budget'>('client');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');

  const handleRequestApproval = async () => {
    const success = await onExecute({
      approvalType,
      message,
      priority,
      estimateId: reason.meta?.estimateId,
      projectId: reason.meta?.projectId
    });

    if (success) {
      setMessage('');
      setPriority('normal');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SendIcon color="primary" />
          {t('startability.cta.request_approval_title')}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {/* Reason Context */}
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              {t(reason.message)}
            </Typography>
          </Alert>

          {/* Approval Type */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('startability.approval.type')}</InputLabel>
            <Select
              value={approvalType}
              onChange={(e) => setApprovalType(e.target.value as any)}
              label={t('startability.approval.type')}
            >
              <MenuItem value="client">{t('startability.approval.client')}</MenuItem>
              <MenuItem value="manager">{t('startability.approval.manager')}</MenuItem>
              <MenuItem value="budget">{t('startability.approval.budget')}</MenuItem>
            </Select>
          </FormControl>

          {/* Priority */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('startability.approval.priority')}</InputLabel>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              label={t('startability.approval.priority')}
            >
              <MenuItem value="normal">{t('startability.approval.normal')}</MenuItem>
              <MenuItem value="urgent">{t('startability.approval.urgent')}</MenuItem>
            </Select>
          </FormControl>

          {/* Message */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label={t('startability.approval.message')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('startability.approval.message_placeholder')}
            variant="outlined"
            required
          />

          {/* Approval Preview */}
          {message && (
            <Card sx={{ mt: 2, backgroundColor: 'info.light' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('startability.approval.preview')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Chip size="small" label={t(`startability.approval.${approvalType}`)} />
                  <Chip size="small" label={t(`startability.approval.${priority}`)} color={priority === 'urgent' ? 'warning' : 'default'} />
                </Box>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  "{message}"
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleRequestApproval}
          disabled={!message || isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : <SendIcon />}
        >
          {t('startability.approval.send_request')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =====================================================
// VIEW DEPENDENCIES CTA COMPONENT
// =====================================================

export const ViewDependenciesCTAAction: React.FC<CTAActionProps> = ({
  reason,
  open,
  onClose,
  onExecute,
  isLoading = false
}) => {
  const { t } = useTranslation();

  const handleMarkResolved = async (dependencyId: string) => {
    await onExecute({
      action: 'mark_resolved',
      dependencyId,
      taskId: reason.meta?.taskId
    });
  };

  const handleViewTask = (dependencyId: string) => {
    // Navigate to dependency task
    window.open(`/tasks/${dependencyId}`, '_blank');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TreeIcon color="primary" />
          {t('startability.cta.view_dependencies_title')}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {/* Reason Context */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              {t(reason.message)}
            </Typography>
          </Alert>

          {/* Dependencies List */}
          <Typography variant="h6" gutterBottom>
            {t('startability.dependencies.blocking_tasks')}
          </Typography>
          
          <List>
            {MOCK_DEPENDENCIES.map((dep) => (
              <ListItem
                key={dep.id}
                sx={{
                  border: '1px solid',
                  borderColor: dep.status === 'completed' ? 'success.light' : 'warning.light',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <ListItemIcon>
                  <TaskIcon color={dep.status === 'completed' ? 'success' : 'warning'} />
                </ListItemIcon>
                <ListItemText
                  primary={dep.name}
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        {t(`startability.dependencies.status.${dep.status}`)} - {dep.progress}%
                      </Typography>
                      <Box sx={{ width: '100%', height: 4, backgroundColor: 'grey.300', borderRadius: 1, mt: 0.5 }}>
                        <Box
                          sx={{
                            width: `${dep.progress}%`,
                            height: '100%',
                            backgroundColor: dep.status === 'completed' ? 'success.main' : 'warning.main',
                            borderRadius: 1
                          }}
                        />
                      </Box>
                    </Box>
                  }
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" onClick={() => handleViewTask(dep.id)}>
                    {t('startability.dependencies.view')}
                  </Button>
                  {dep.status !== 'completed' && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      onClick={() => handleMarkResolved(dep.id)}
                      disabled={isLoading}
                    >
                      {t('startability.dependencies.mark_complete')}
                    </Button>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =====================================================
// COMPLIANCE CTA COMPONENT
// =====================================================

export const ComplianceCTAAction: React.FC<CTAActionProps> = ({
  reason,
  open,
  onClose,
  onExecute,
  isLoading = false
}) => {
  const { t } = useTranslation();

  const handleOpenCompliance = () => {
    // Navigate to compliance module
    window.open('/compliance', '_blank');
    onClose();
  };

  const handleMarkResolved = async () => {
    const success = await onExecute({
      action: 'mark_compliance_resolved',
      projectId: reason.meta?.projectId,
      estimateId: reason.meta?.estimateId
    });

    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          {t('startability.cta.compliance_title')}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body2">
              {t(reason.message)}
            </Typography>
          </Alert>

          <Typography variant="body2" gutterBottom>
            {t('startability.compliance.description')}
          </Typography>

          <List>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon color="warning" />
              </ListItemIcon>
              <ListItemText primary={t('startability.compliance.permits')} />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon color="warning" />
              </ListItemIcon>
              <ListItemText primary={t('startability.compliance.insurance')} />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SecurityIcon color="warning" />
              </ListItemIcon>
              <ListItemText primary={t('startability.compliance.safety')} />
            </ListItem>
          </List>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="outlined"
          onClick={handleOpenCompliance}
          startIcon={<SecurityIcon />}
        >
          {t('startability.compliance.open_module')}
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleMarkResolved}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : <CheckIcon />}
        >
          {t('startability.compliance.mark_resolved')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =====================================================
// CTA ACTION FACTORY
// =====================================================

export const CTAActionFactory: React.FC<{
  cta: StartabilityCTA;
  reason: StartabilityReason;
  open: boolean;
  onClose: () => void;
  onExecute: (data: any) => Promise<boolean>;
  isLoading?: boolean;
}> = ({ cta, reason, open, onClose, onExecute, isLoading }) => {
  switch (cta) {
    case 'ASSIGN':
      return (
        <AssignCTAAction
          reason={reason}
          open={open}
          onClose={onClose}
          onExecute={onExecute}
          isLoading={isLoading}
        />
      );
    
    case 'REQUEST_APPROVAL':
      return (
        <RequestApprovalCTAAction
          reason={reason}
          open={open}
          onClose={onClose}
          onExecute={onExecute}
          isLoading={isLoading}
        />
      );
    
    case 'VIEW_DEPENDENCIES':
      return (
        <ViewDependenciesCTAAction
          reason={reason}
          open={open}
          onClose={onClose}
          onExecute={onExecute}
          isLoading={isLoading}
        />
      );
    
    case 'OPEN_COMPLIANCE':
      return (
        <ComplianceCTAAction
          reason={reason}
          open={open}
          onClose={onClose}
          onExecute={onExecute}
          isLoading={isLoading}
        />
      );
    
    default:
      return null;
  }
};

export default CTAActionFactory;
/**
 * ============================================================================
 * STARTABILITY GLOBAL ACTIONS - CTA Blocking Implementation
 * ============================================================================
 * 
 * Component implementing TZ requirements for global action blocking when
 * critical startability issues exist. Handles estimate sending and contract
 * conversion with intelligent blocking logic.
 * 
 * @author Senior Full-Stack Engineer + UX Architect  
 * @version 2.0.0 - Technical Requirements
 * @feature estimates.startability_v1
 */

import React, { useMemo } from 'react';
import {
  Button,
  ButtonGroup,
  Tooltip,
  Alert,
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Send as SendIcon,
  Assignment as ContractIcon,
  Block as BlockedIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';

import { 
  StartabilityReport,
  ItemStartabilityV2,
  BlockerReason
} from '../../types/startability.types';

// =====================================================
// COMPONENT PROPS AND TYPES
// =====================================================

interface StartabilityGlobalActionsProps {
  /** Startability analysis data */
  startabilityReport: StartabilityReport | null;
  
  /** Action handlers */
  onSendEstimate: () => void;
  onConvertToContract: () => void;
  
  /** Loading states */
  sendingEstimate?: boolean;
  convertingContract?: boolean;
  
  /** Configuration */
  showBlockingDetails?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
}

interface BlockingDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  blockers: BlockerReason[];
  actionName: string;
}

// =====================================================
// BLOCKING ANALYSIS LOGIC
// =====================================================

interface BlockingAnalysis {
  canSendEstimate: boolean;
  canConvertContract: boolean;
  criticalBlockers: BlockerReason[];
  warningBlockers: BlockerReason[];
  blockedItems: string[];
  summary: {
    totalItems: number;
    blockedItems: number;
    readyItems: number;
    warningItems: number;
  };
}

/**
 * Core logic: Analyze startability report for global action blocking
 * Implements TZ requirements for CTA blocking based on critical issues
 */
function analyzeBlockingStatus(report: StartabilityReport | null): BlockingAnalysis {
  const defaultAnalysis: BlockingAnalysis = {
    canSendEstimate: true,
    canConvertContract: true,
    criticalBlockers: [],
    warningBlockers: [],
    blockedItems: [],
    summary: {
      totalItems: 0,
      blockedItems: 0,
      readyItems: 0,
      warningItems: 0
    }
  };

  if (!report) {
    return defaultAnalysis;
  }

  const analysis: BlockingAnalysis = {
    canSendEstimate: true,
    canConvertContract: true,
    criticalBlockers: [],
    warningBlockers: [],
    blockedItems: [],
    summary: {
      totalItems: 0,
      blockedItems: 0,
      readyItems: 0,
      warningItems: 0
    }
  };

  // Process each item's startability
  Object.entries(report.itemsStartability).forEach(([itemId, item]) => {
    analysis.summary.totalItems++;

    // Count by status
    switch (item.summaryStatus) {
      case 'READY':
      case 'DONE':
        analysis.summary.readyItems++;
        break;
      case 'WARNING':
        analysis.summary.warningItems++;
        break;
      case 'BLOCKED':
        analysis.summary.blockedItems++;
        analysis.blockedItems.push(itemId);
        break;
    }

    // Collect blockers by severity
    item.blockers.forEach(blocker => {
      if (blocker.severity === 'CRITICAL') {
        analysis.criticalBlockers.push(blocker);
      } else {
        analysis.warningBlockers.push(blocker);
      }
    });
  });

  // TZ REQUIREMENT: Block actions when critical issues exist
  const hasCriticalBlockers = analysis.criticalBlockers.length > 0;
  const hasBlockedItems = analysis.summary.blockedItems > 0;

  // Estimate sending: block if critical blockers OR project not startable
  analysis.canSendEstimate = !hasCriticalBlockers && report.isProjectStartable;

  // Contract conversion: stricter - block if ANY critical issues
  analysis.canConvertContract = !hasCriticalBlockers && !hasBlockedItems && report.isProjectStartable;

  return analysis;
}

// =====================================================
// BLOCKING DETAILS DIALOG
// =====================================================

const BlockingDetailsDialog: React.FC<BlockingDialogProps> = ({
  open,
  onClose,
  title,
  blockers,
  actionName
}) => {

  const blockersByCategory = useMemo(() => {
    const groups: Record<string, BlockerReason[]> = {};
    blockers.forEach(blocker => {
      if (!groups[blocker.category]) {
        groups[blocker.category] = [];
      }
      groups[blocker.category].push(blocker);
    });
    return groups;
  }, [blockers]);

  const getSeverityIcon = (severity: string) => {
    return severity === 'CRITICAL' ? <BlockedIcon color="error" /> : <WarningIcon color="warning" />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BlockedIcon color="error" />
          {title}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="error" sx={{ mb: 3 }}>
          Действие "{actionName}" заблокировано из-за критических проблем в смете.
        </Alert>

        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Проблемы, которые необходимо решить:
        </Typography>

        {Object.entries(blockersByCategory).map(([category, categoryBlockers]) => (
          <Box key={category} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              {category} ({categoryBlockers.length})
            </Typography>
            
            <List dense>
              {categoryBlockers.map((blocker, index) => (
                <ListItem key={`${blocker.code}-${index}`}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getSeverityIcon(blocker.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={blocker.description}
                    secondary={
                      <Chip
                        label={blocker.severity}
                        color={blocker.severity === 'CRITICAL' ? 'error' : 'warning'}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        ))}

        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            💡 Решите указанные проблемы через детальное представление стартуемости, 
            затем повторите попытку выполнения действия.
          </Typography>
        </Alert>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Понятно
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export const StartabilityGlobalActions: React.FC<StartabilityGlobalActionsProps> = ({
  startabilityReport,
  onSendEstimate,
  onConvertToContract,
  sendingEstimate = false,
  convertingContract = false,
  showBlockingDetails = true,
  variant = 'contained',
  size = 'medium'
}) => {
  
  // State for blocking details dialog
  const [blockingDialog, setBlockingDialog] = React.useState<{
    open: boolean;
    title: string;
    actionName: string;
    blockers: BlockerReason[];
  }>({
    open: false,
    title: '',
    actionName: '',
    blockers: []
  });

  // =====================================================
  // BLOCKING ANALYSIS
  // =====================================================

  const blockingAnalysis = useMemo(() => {
    return analyzeBlockingStatus(startabilityReport);
  }, [startabilityReport]);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleSendEstimate = () => {
    if (!blockingAnalysis.canSendEstimate) {
      setBlockingDialog({
        open: true,
        title: 'Отправка сметы заблокирована',
        actionName: 'Отправить клиенту',
        blockers: blockingAnalysis.criticalBlockers
      });
      return;
    }
    onSendEstimate();
  };

  const handleConvertToContract = () => {
    if (!blockingAnalysis.canConvertContract) {
      setBlockingDialog({
        open: true,
        title: 'Преобразование в договор заблокировано',
        actionName: 'Преобразовать в договор',
        blockers: blockingAnalysis.criticalBlockers
      });
      return;
    }
    onConvertToContract();
  };

  const handleCloseDialog = () => {
    setBlockingDialog(prev => ({ ...prev, open: false }));
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  const getSendTooltip = () => {
    if (!startabilityReport) {
      return 'Загрузка анализа стартуемости...';
    }
    
    if (!blockingAnalysis.canSendEstimate) {
      return 'Нельзя отправить смету пока есть критические проблемы';
    }
    
    if (blockingAnalysis.warningBlockers.length > 0) {
      return `Есть ${blockingAnalysis.warningBlockers.length} предупреждений, но отправка возможна`;
    }
    
    return 'Отправить клиенту';
  };

  const getContractTooltip = () => {
    if (!startabilityReport) {
      return 'Загрузка анализа стартуемости...';
    }
    
    if (!blockingAnalysis.canConvertContract) {
      return 'Нельзя преобразовать в договор пока есть критические проблемы';
    }
    
    return 'Преобразовать в договор';
  };

  const renderStatusSummary = () => {
    if (!showBlockingDetails || !startabilityReport) return null;

    const { summary } = blockingAnalysis;
    
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Статус элементов сметы:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`✅ Готово: ${summary.readyItems}`} 
            color="success" 
            size="small" 
          />
          <Chip 
            label={`⚠️ Предупреждения: ${summary.warningItems}`} 
            color="warning" 
            size="small" 
          />
          <Chip 
            label={`🚫 Заблокировано: ${summary.blockedItems}`} 
            color="error" 
            size="small" 
          />
        </Box>
      </Box>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <Box>
      {renderStatusSummary()}
      
      {/* Global Action Buttons */}
      <ButtonGroup variant={variant} size={size}>
        {/* Send Estimate Button */}
        <Tooltip title={getSendTooltip()}>
          <span>
            <Button
              onClick={handleSendEstimate}
              disabled={!blockingAnalysis.canSendEstimate || sendingEstimate || !startabilityReport}
              startIcon={
                blockingAnalysis.canSendEstimate ? <SendIcon /> : <BlockedIcon />
              }
              sx={{
                ...(blockingAnalysis.canSendEstimate 
                  ? {} 
                  : { color: 'error.main', borderColor: 'error.main' }
                )
              }}
            >
              {sendingEstimate ? 'Отправка...' : 'Отправить клиенту'}
            </Button>
          </span>
        </Tooltip>

        {/* Convert to Contract Button */}
        <Tooltip title={getContractTooltip()}>
          <span>
            <Button
              onClick={handleConvertToContract}
              disabled={!blockingAnalysis.canConvertContract || convertingContract || !startabilityReport}
              startIcon={
                blockingAnalysis.canConvertContract ? <ContractIcon /> : <BlockedIcon />
              }
              sx={{
                ...(blockingAnalysis.canConvertContract 
                  ? {} 
                  : { color: 'error.main', borderColor: 'error.main' }
                )
              }}
            >
              {convertingContract ? 'Преобразование...' : 'Преобразовать в договор'}
            </Button>
          </span>
        </Tooltip>
      </ButtonGroup>

      {/* Critical Issues Alert */}
      {blockingAnalysis.criticalBlockers.length > 0 && showBlockingDetails && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">
            🚫 Обнаружено {blockingAnalysis.criticalBlockers.length} критических проблем, 
            блокирующих основные действия. Решите их для продолжения работы.
          </Typography>
        </Alert>
      )}

      {/* Warning Issues Alert */}
      {blockingAnalysis.warningBlockers.length > 0 && blockingAnalysis.criticalBlockers.length === 0 && showBlockingDetails && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            ⚠️ Обнаружено {blockingAnalysis.warningBlockers.length} предупреждений. 
            Основные действия доступны, но рекомендуется решить проблемы.
          </Typography>
        </Alert>
      )}

      {/* Blocking Details Dialog */}
      <BlockingDetailsDialog
        open={blockingDialog.open}
        onClose={handleCloseDialog}
        title={blockingDialog.title}
        actionName={blockingDialog.actionName}
        blockers={blockingDialog.blockers}
      />
    </Box>
  );
};

export default StartabilityGlobalActions;
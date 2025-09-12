/**
 * ============================================================================
 * STARTABILITY DETAIL SIDEBAR - Master-Detail UI Implementation
 * ============================================================================
 * 
 * Detail sidebar component implementing TZ specifications for actionable
 * startability analysis with resolution components integration.
 * 
 * @author Senior Full-Stack Engineer + UX Architect  
 * @version 2.0.0 - Technical Requirements
 * @feature estimates.startability_v1
 */

import React, { useState, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Button,
  Collapse,
  Paper,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as ReadyIcon,
  Warning as WarningIcon,
  Block as BlockedIcon,
  Flag as DoneIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { t } from '../../utils/mockTranslations';

import { 
  StartabilityReport,
  ItemStartabilityV2,
  BlockerReason,
  ResolutionAction
} from '../../types/startability.types';
import { ActionableComponentsFactory } from './actions/ActionableComponentsFactory';

// =====================================================
// COMPONENT PROPS AND TYPES
// =====================================================

interface StartabilityDetailSidebarProps {
  /** Control sidebar visibility */
  open: boolean;
  onClose: () => void;
  
  /** Selected item and startability data */
  selectedItemId: string | null;
  startabilityReport: StartabilityReport | null;
  
  /** Item details for display */
  itemDetails?: {
    name: string;
    description?: string;
    type: string;
    assignedTo?: string;
  };
  
  /** Callbacks */
  onRefresh: () => void;
  onResolutionExecuted: (success: boolean, message: string) => void;
  
  /** Loading states */
  loading?: boolean;
  
  /** Configuration */
  drawerWidth?: number;
  disableActions?: boolean;
}

// =====================================================
// BLOCKER CATEGORY COMPONENTS
// =====================================================

interface BlockerCategoryProps {
  category: string;
  blockers: BlockerReason[];
  onResolutionExecuted: (success: boolean, message: string) => void;
  disableActions?: boolean;
}

const BlockerCategory: React.FC<BlockerCategoryProps> = ({
  category,
  blockers,
  onResolutionExecuted,
  disableActions = false
}) => {
  const [expanded, setExpanded] = useState(true);

  const getCategoryIcon = () => {
    switch (category) {
      case 'Project': return '📁';
      case 'Task': return '📋';
      case 'Permissions': return '👤';
      case 'Business': return '💼';
      default: return '⚠️';
    }
  };

  const getCategoryColor = () => {
    const criticalCount = blockers.filter(b => b.severity === 'CRITICAL').length;
    return criticalCount > 0 ? 'error' : 'warning';
  };

  return (
    <Paper elevation={1} sx={{ mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'action.hover' }
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography variant="subtitle2" sx={{ mr: 1 }}>
          {getCategoryIcon()}
        </Typography>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {category}
        </Typography>
        <Chip
          label={blockers.length}
          color={getCategoryColor()}
          size="small"
          sx={{ mr: 1 }}
        />
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      
      <Collapse in={expanded}>
        <Divider />
        <List dense>
          {blockers.map((blocker, index) => (
            <BlockerItem
              key={`${blocker.code}-${index}`}
              blocker={blocker}
              onResolutionExecuted={onResolutionExecuted}
              disableActions={disableActions}
            />
          ))}
        </List>
      </Collapse>
    </Paper>
  );
};

// =====================================================
// BLOCKER ITEM COMPONENT
// =====================================================

interface BlockerItemProps {
  blocker: BlockerReason;
  onResolutionExecuted: (success: boolean, message: string) => void;
  disableActions?: boolean;
}

const BlockerItem: React.FC<BlockerItemProps> = ({
  blocker,
  onResolutionExecuted,
  disableActions = false
}) => {
  const getSeverityIcon = () => {
    switch (blocker.severity) {
      case 'CRITICAL':
        return <BlockedIcon color="error" />;
      case 'WARNING':
        return <WarningIcon color="warning" />;
      default:
        return <WarningIcon color="warning" />;
    }
  };

  const getSeverityColor = () => {
    return blocker.severity === 'CRITICAL' ? 'error' : 'warning';
  };

  return (
    <ListItem
      sx={{
        flexDirection: 'column',
        alignItems: 'stretch',
        py: 2
      }}
    >
      {/* Blocker Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', mb: 1 }}>
        <ListItemIcon sx={{ minWidth: 40 }}>
          {getSeverityIcon()}
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {blocker.description}
            </Typography>
          }
          secondary={
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={blocker.severity}
                color={getSeverityColor()}
                size="small"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            </Box>
          }
        />
      </Box>

      {/* Resolution Action */}
      {blocker.resolutionAction && (
        <Box sx={{ ml: 5, mt: 1 }}>
          <ActionableComponentsFactory
            resolutionAction={blocker.resolutionAction}
            onExecuted={onResolutionExecuted}
            disabled={disableActions}
            compact={false}
          />
        </Box>
      )}

      {!blocker.resolutionAction && (
        <Box sx={{ ml: 5, mt: 1 }}>
          <Alert severity="info" sx={{ py: 0.5 }}>
            Автоматическое решение недоступно
          </Alert>
        </Box>
      )}
    </ListItem>
  );
};

// =====================================================
// STATUS SUMMARY COMPONENT
// =====================================================

interface StatusSummaryProps {
  itemStartability: ItemStartabilityV2;
  itemDetails?: {
    name: string;
    description?: string;
    type: string;
    assignedTo?: string;
  };
}

const StatusSummary: React.FC<StatusSummaryProps> = ({ itemStartability, itemDetails }) => {
  const getStatusDisplay = () => {
    switch (itemStartability.summaryStatus) {
      case 'READY':
        return {
          icon: <ReadyIcon color="success" />,
          color: 'success' as const,
          text: 'Готов к выполнению',
          description: 'Все проверки пройдены, можно начинать работу'
        };
      case 'WARNING':
        return {
          icon: <WarningIcon color="warning" />,
          color: 'warning' as const,
          text: 'Есть предупреждения',
          description: 'Есть проблемы, которые стоит решить'
        };
      case 'BLOCKED':
        return {
          icon: <BlockedIcon color="error" />,
          color: 'error' as const,
          text: 'Заблокировано',
          description: 'Критические проблемы блокируют выполнение'
        };
      case 'DONE':
        return {
          icon: <DoneIcon color="info" />,
          color: 'info' as const,
          text: 'Выполнено',
          description: 'Работа завершена'
        };
      default:
        return {
          icon: <WarningIcon color="disabled" />,
          color: 'default' as const,
          text: 'Неизвестно',
          description: 'Статус не определен'
        };
    }
  };

  const { icon, color, text, description } = getStatusDisplay();

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {icon}
        <Typography variant="h6" sx={{ ml: 1 }}>
          {itemDetails?.name || 'Элемент сметы'}
        </Typography>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Chip
          label={text}
          color={color}
          size="medium"
          sx={{ fontSize: '0.875rem' }}
        />
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
      
      {itemDetails?.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {itemDetails.description}
        </Typography>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Проблем: {itemStartability.blockers.length}
        </Typography>
        {itemDetails?.assignedTo && (
          <Chip
            label={`Исполнитель: ${itemDetails.assignedTo}`}
            size="small"
            variant="outlined"
          />
        )}
      </Box>
    </Paper>
  );
};

// =====================================================
// MAIN SIDEBAR COMPONENT
// =====================================================

export const StartabilityDetailSidebar: React.FC<StartabilityDetailSidebarProps> = ({
  open,
  onClose,
  selectedItemId,
  startabilityReport,
  itemDetails,
  onRefresh,
  onResolutionExecuted,
  loading = false,
  drawerWidth = 480,
  disableActions = false
}) => {

  // =====================================================
  // DATA PROCESSING
  // =====================================================

  const itemStartability = useMemo(() => {
    if (!selectedItemId || !startabilityReport) return null;
    return startabilityReport.itemsStartability[selectedItemId] || null;
  }, [selectedItemId, startabilityReport]);

  const blockersByCategory = useMemo(() => {
    if (!itemStartability) return {};

    const groups: Record<string, BlockerReason[]> = {};
    itemStartability.blockers.forEach(blocker => {
      if (!groups[blocker.category]) {
        groups[blocker.category] = [];
      }
      groups[blocker.category].push(blocker);
    });

    return groups;
  }, [itemStartability]);

  const hasCriticalBlockers = useMemo(() => {
    return itemStartability?.blockers.some(b => b.severity === 'CRITICAL') || false;
  }, [itemStartability]);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleResolutionExecuted = (success: boolean, message: string) => {
    onResolutionExecuted(success, message);
    
    // Auto-refresh on successful resolution
    if (success) {
      setTimeout(onRefresh, 1000);
    }
  };

  // =====================================================
  // RENDER COMPONENTS
  // =====================================================

  const renderHeader = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        Детали стартуемости
      </Typography>
      <Tooltip title="Обновить">
        <IconButton onClick={onRefresh} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Tooltip>
      <IconButton onClick={onClose}>
        <CloseIcon />
      </IconButton>
    </Box>
  );

  const renderContent = () => {
    if (!selectedItemId) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Выберите элемент сметы для просмотра детальной информации о стартуемости
          </Typography>
        </Box>
      );
    }

    if (!itemStartability) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="warning">
            Нет данных о стартуемости для выбранного элемента
          </Alert>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 3 }}>
        {/* Status Summary */}
        <StatusSummary
          itemStartability={itemStartability}
          itemDetails={itemDetails}
        />

        {/* Global Actions Alert */}
        {hasCriticalBlockers && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body2">
              ⚠️ Критические проблемы блокируют глобальные действия (отправка сметы, преобразование в договор)
            </Typography>
          </Alert>
        )}

        {/* Blockers by Category */}
        {itemStartability.blockers.length > 0 ? (
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Проблемы и их решения
            </Typography>
            
            {Object.entries(blockersByCategory).map(([category, blockers]) => (
              <BlockerCategory
                key={category}
                category={category}
                blockers={blockers}
                onResolutionExecuted={handleResolutionExecuted}
                disableActions={disableActions}
              />
            ))}
          </Box>
        ) : (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ✅ Нет проблем! Элемент готов к выполнению.
            </Typography>
          </Alert>
        )}
      </Box>
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="temporary"
      PaperProps={{
        sx: {
          width: drawerWidth,
          maxWidth: '90vw'
        }
      }}
    >
      {renderHeader()}
      {renderContent()}
    </Drawer>
  );
};

export default StartabilityDetailSidebar;
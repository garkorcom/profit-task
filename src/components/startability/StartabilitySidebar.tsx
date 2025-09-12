/**
 * ============================================================================
 * COMPONENT - StartabilitySidebar Detail Panel
 * ============================================================================
 * 
 * Detailed sidebar panel for the Estimate Constructor showing complete
 * startability analysis with actionable CTAs for resolving issues.
 * 
 * @author Senior Full-Stack Engineer + UX Architect
 * @version 1.0.0
 * @feature estimates.startability_v1
 */

import React, { useState, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tab,
  Tabs,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  AlertTitle,
  Collapse,
  LinearProgress,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';

import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as StartIcon,
  Assignment as AssignIcon,
  Approval as ApprovalIcon,
  OpenInNew as OpenIcon,
  AccountTree as DependencyIcon,
  Security as ComplianceIcon,
  CheckCircle as CompletedIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';

import {
  StartabilitySnapshot,
  StartabilityReason,
  StartabilityCTA,
  StartabilityCategory,
  STARTABILITY_REASON_CONFIG
} from '../../types/startability.types';

import { useTranslation } from 'react-i18next';

// =====================================================
// COMPONENT INTERFACES
// =====================================================

export interface StartabilitySidebarProps {
  /** Startability evaluation snapshot */
  snapshot: StartabilitySnapshot | null;
  
  /** Currently selected item ID (optional focus) */
  selectedItemId?: string;
  
  /** CTA execution handler */
  onCTAExecute: (cta: StartabilityCTA, reason: StartabilityReason) => Promise<void>;
  
  /** Refresh evaluation handler */
  onRefresh: () => void;
  
  /** Close sidebar handler */
  onClose: () => void;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Sidebar open state */
  open?: boolean;
  
  /** Sidebar width */
  width?: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// =====================================================
// HELPER COMPONENTS
// =====================================================

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`startability-tabpanel-${index}`}
    aria-labelledby={`startability-tab-${index}`}
  >
    {value === index && <Box>{children}</Box>}
  </div>
);

// =====================================================
// MAIN COMPONENT
// =====================================================

export const StartabilitySidebar: React.FC<StartabilitySidebarProps> = ({
  snapshot,
  selectedItemId,
  onCTAExecute,
  onRefresh,
  onClose,
  isLoading = false,
  open = true,
  width = 420
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [ctaLoading, setCTALoading] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<StartabilityCategory>>(
    new Set(['PROJECT', 'TASKS', 'PERMISSIONS', 'BUSINESS'] as StartabilityCategory[])
  );

  // Group reasons by category
  const groupedReasons = useMemo(() => {
    if (!snapshot?.reasons) {
      return {
        PROJECT: [],
        TASKS: [],
        PERMISSIONS: [],
        BUSINESS: [],
        ESTIMATE: []
      } as Record<StartabilityCategory, StartabilityReason[]>;
    }
    
    return snapshot.reasons.reduce((groups, reason) => {
      const category = (reason.category as StartabilityCategory) || 'BUSINESS';
      if (!groups[category]) groups[category] = [];
      groups[category].push(reason);
      return groups;
    }, {
      PROJECT: [],
      TASKS: [],
      PERMISSIONS: [],
      BUSINESS: [],
      ESTIMATE: []
    } as Record<StartabilityCategory, StartabilityReason[]>);
  }, [snapshot?.reasons]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCTAExecute = async (cta: StartabilityCTA, reason: StartabilityReason) => {
    const loadingKey = `${reason.code}-${cta}`;
    setCTALoading(loadingKey);
    
    try {
      await onCTAExecute(cta, reason);
    } finally {
      setCTALoading(null);
    }
  };

  const toggleCategory = (category: StartabilityCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  if (!snapshot) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{ '& .MuiDrawer-paper': { width, boxSizing: 'border-box' } }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            {t('startability.sidebar.loading')}
          </Typography>
        </Box>
      </Drawer>
    );
  }

  const { overall, reasons, stats, projectId, estimateId } = snapshot;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          borderLeft: '1px solid #e0e0e0'
        }
      }}
      data-testid="startability-sidebar"
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid #e0e0e0'
        }}
      >
        <Box>
          <Typography variant="h6">
            🚀 {t('startability.sidebar.title')}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {t('startability.sidebar.subtitle', { projectId: projectId.slice(0, 8) })}
          </Typography>
        </Box>
        <Box>
          <Tooltip title={t('startability.sidebar.refresh')}>
            <IconButton
              onClick={onRefresh}
              disabled={isLoading}
              data-testid="startability-refresh"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} data-testid="startability-close">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Loading Indicator */}
      {isLoading && <LinearProgress />}

      {/* Overall Status Card */}
      <Box sx={{ p: 2 }}>
        <StartabilityOverviewCard
          overall={overall}
          stats={stats}
          onStartWork={() => console.log('Start work clicked')}
        />
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab
            label={t('startability.tabs.issues')}
            icon={<WarningIcon fontSize="small" />}
            iconPosition="start"
            data-testid="tab-issues"
          />
          <Tab
            label={t('startability.tabs.actions')}
            icon={<StartIcon fontSize="small" />}
            iconPosition="start"
            data-testid="tab-actions"
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <TabPanel value={activeTab} index={0}>
          <IssuesTabContent
            groupedReasons={groupedReasons}
            expandedCategories={expandedCategories}
            onToggleCategory={toggleCategory}
            onCTAExecute={handleCTAExecute}
            ctaLoading={ctaLoading}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <ActionsTabContent
            snapshot={snapshot}
            onCTAExecute={handleCTAExecute}
            ctaLoading={ctaLoading}
          />
        </TabPanel>
      </Box>
    </Drawer>
  );
};

// =====================================================
// SUB-COMPONENTS
// =====================================================

/**
 * Overview card showing overall status and quick stats
 */
interface StartabilityOverviewCardProps {
  overall: 'ready' | 'blocked' | 'attention';
  stats: StartabilitySnapshot['stats'];
  onStartWork?: () => void;
}

const StartabilityOverviewCard: React.FC<StartabilityOverviewCardProps> = ({
  overall,
  stats,
  onStartWork
}) => {
  const { t } = useTranslation();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ready':
        return { color: 'success', icon: <CompletedIcon />, bgColor: '#e8f5e8' };
      case 'blocked':
        return { color: 'error', icon: <ErrorIcon />, bgColor: '#ffeaea' };
      case 'attention':
        return { color: 'warning', icon: <WarningIcon />, bgColor: '#fff8e1' };
      default:
        return { color: 'info', icon: <InfoIcon />, bgColor: '#e3f2fd' };
    }
  };

  const statusConfig = getStatusConfig(overall);

  return (
    <Card 
      sx={{ 
        backgroundColor: statusConfig.bgColor,
        border: '1px solid',
        borderColor: `${statusConfig.color}.light`
      }}
      data-testid="overview-card"
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {statusConfig.icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {t(`startability.overall.${overall}`)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {stats.criticalCount > 0 && (
            <Chip
              size="small"
              label={`${stats.criticalCount} ${t('startability.severity.critical')}`}
              color="error"
              variant="outlined"
            />
          )}
          {stats.warningCount > 0 && (
            <Chip
              size="small"
              label={`${stats.warningCount} ${t('startability.severity.warning')}`}
              color="warning"
              variant="outlined"
            />
          )}
          {stats.infoCount > 0 && (
            <Chip
              size="small"
              label={`${stats.infoCount} ${t('startability.severity.info')}`}
              color="info"
              variant="outlined"
            />
          )}
        </Box>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            {t('startability.overview.startable_items', {
              startable: stats.startableItemCount,
              total: stats.totalItemCount
            })}
          </Typography>
          
          {overall === 'ready' && onStartWork && (
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<StartIcon />}
              onClick={onStartWork}
              data-testid="start-work-button"
            >
              {t('startability.actions.start_work')}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * Issues tab content showing categorized reasons
 */
interface IssuesTabContentProps {
  groupedReasons: Record<StartabilityCategory, StartabilityReason[]>;
  expandedCategories: Set<StartabilityCategory>;
  onToggleCategory: (category: StartabilityCategory) => void;
  onCTAExecute: (cta: StartabilityCTA, reason: StartabilityReason) => Promise<void>;
  ctaLoading: string | null;
}

const IssuesTabContent: React.FC<IssuesTabContentProps> = ({
  groupedReasons,
  expandedCategories,
  onToggleCategory,
  onCTAExecute,
  ctaLoading
}) => {
  const { t } = useTranslation();

  if (Object.keys(groupedReasons).length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CompletedIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
        <Typography variant="h6" color="success.main">
          {t('startability.no_issues.title')}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {t('startability.no_issues.description')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1 }}>
      {Object.entries(groupedReasons).map(([category, reasons]) => (
        <CategoryAccordion
          key={category}
          category={category as StartabilityCategory}
          reasons={reasons}
          expanded={expandedCategories.has(category as StartabilityCategory)}
          onToggle={() => onToggleCategory(category as StartabilityCategory)}
          onCTAExecute={onCTAExecute}
          ctaLoading={ctaLoading}
        />
      ))}
    </Box>
  );
};

/**
 * Category accordion for grouping reasons
 */
interface CategoryAccordionProps {
  category: StartabilityCategory;
  reasons: StartabilityReason[];
  expanded: boolean;
  onToggle: () => void;
  onCTAExecute: (cta: StartabilityCTA, reason: StartabilityReason) => Promise<void>;
  ctaLoading: string | null;
}

const CategoryAccordion: React.FC<CategoryAccordionProps> = ({
  category,
  reasons,
  expanded,
  onToggle,
  onCTAExecute,
  ctaLoading
}) => {
  const { t } = useTranslation();

  const criticalCount = reasons.filter(r => r.severity === 'critical').length;
  const warningCount = reasons.filter(r => r.severity === 'warning').length;

  return (
    <Accordion expanded={expanded} onChange={onToggle}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mr: 1 }}>
          <Typography variant="subtitle1">
            {t(`startability.categories.${category.toLowerCase()}`)}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {criticalCount > 0 && (
              <Chip size="small" label={criticalCount} color="error" />
            )}
            {warningCount > 0 && (
              <Chip size="small" label={warningCount} color="warning" />
            )}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <List dense>
          {reasons.map((reason, index) => (
            <ReasonListItem
              key={`${reason.code}-${index}`}
              reason={reason}
              onCTAExecute={onCTAExecute}
              isLoading={ctaLoading === `${reason.code}-${reason.cta}`}
            />
          ))}
        </List>
      </AccordionDetails>
    </Accordion>
  );
};

/**
 * Individual reason list item with CTA
 */
interface ReasonListItemProps {
  reason: StartabilityReason;
  onCTAExecute: (cta: StartabilityCTA, reason: StartabilityReason) => Promise<void>;
  isLoading: boolean;
}

const ReasonListItem: React.FC<ReasonListItemProps> = ({
  reason,
  onCTAExecute,
  isLoading
}) => {
  const { t } = useTranslation();
  const config = STARTABILITY_REASON_CONFIG[reason.code];

  const handleCTAClick = () => {
    if (reason.cta) {
      onCTAExecute(reason.cta, reason);
    }
  };

  return (
    <ListItem
      sx={{
        border: '1px solid',
        borderColor: reason.severity === 'critical' ? 'error.light' : 
                    reason.severity === 'warning' ? 'warning.light' : 'info.light',
        borderRadius: 1,
        mb: 1
      }}
    >
      <ListItemIcon>
        <Typography component="span" sx={{ fontSize: '20px' }}>
          {config.icon}
        </Typography>
      </ListItemIcon>
      <ListItemText
        primary={t(reason.message)}
        secondary={reason.meta?.entityName && `${t('startability.entity')}: ${reason.meta.entityName}`}
        primaryTypographyProps={{
          sx: {
            color: reason.severity === 'critical' ? 'error.main' : 
                   reason.severity === 'warning' ? 'warning.main' : 'inherit'
          }
        }}
      />
      {reason.cta && (
        <ListItemSecondaryAction>
          <Button
            size="small"
            variant="outlined"
            onClick={handleCTAClick}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : <CTAIcon cta={reason.cta} />}
            data-testid={`cta-${reason.cta}-${reason.code}`}
          >
            {t(`startability.cta.${reason.cta.toLowerCase()}`)}
          </Button>
        </ListItemSecondaryAction>
      )}
    </ListItem>
  );
};

/**
 * Actions tab content - prioritized action items
 */
interface ActionsTabContentProps {
  snapshot: StartabilitySnapshot;
  onCTAExecute: (cta: StartabilityCTA, reason: StartabilityReason) => Promise<void>;
  ctaLoading: string | null;
}

const ActionsTabContent: React.FC<ActionsTabContentProps> = ({
  snapshot,
  onCTAExecute,
  ctaLoading
}) => {
  const { t } = useTranslation();

  // Get prioritized action items (critical first, then by category)
  const actionableReasons = snapshot.reasons
    .filter(r => r.cta && !r.autoResolvable)
    .sort((a, b) => {
      // Sort by severity first
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Then by category priority
      const categoryOrder = { PROJECT: 0, TASKS: 1, PERMISSIONS: 2, BUSINESS: 3, ESTIMATE: 4 };
      return categoryOrder[a.category] - categoryOrder[b.category];
    });

  if (actionableReasons.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CompletedIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
        <Typography variant="h6" color="success.main">
          {t('startability.actions.no_actions_needed')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {t('startability.actions.priority_actions')}
      </Typography>
      
      {actionableReasons.map((reason, index) => (
        <ActionCard
          key={`${reason.code}-action`}
          reason={reason}
          priority={index + 1}
          onExecute={(cta) => onCTAExecute(cta, reason)}
          isLoading={ctaLoading === `${reason.code}-${reason.cta}`}
        />
      ))}
    </Box>
  );
};

/**
 * Action card for prioritized actions
 */
interface ActionCardProps {
  reason: StartabilityReason;
  priority: number;
  onExecute: (cta: StartabilityCTA) => void;
  isLoading: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({
  reason,
  priority,
  onExecute,
  isLoading
}) => {
  const { t } = useTranslation();

  if (!reason.cta) return null;

  return (
    <Card sx={{ mb: 2, border: '1px solid', borderColor: 'grey.300' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Chip
            label={priority}
            color={reason.severity === 'critical' ? 'error' : 'warning'}
            size="small"
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t(reason.message)}
            </Typography>
            {reason.meta?.entityName && (
              <Typography variant="caption" color="textSecondary" display="block">
                {t('startability.entity')}: {reason.meta.entityName}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
      <CardActions>
        <Button
          variant="contained"
          color={reason.severity === 'critical' ? 'error' : 'warning'}
          startIcon={isLoading ? <CircularProgress size={16} /> : <CTAIcon cta={reason.cta} />}
          onClick={() => onExecute(reason.cta!)}
          disabled={isLoading}
          data-testid={`action-${reason.cta}-${reason.code}`}
        >
          {t(`startability.cta.${reason.cta.toLowerCase()}`)}
        </Button>
      </CardActions>
    </Card>
  );
};

// =====================================================
// UTILITY COMPONENTS
// =====================================================

/**
 * CTA icon mapping
 */
const CTAIcon: React.FC<{ cta: StartabilityCTA }> = ({ cta }) => {
  switch (cta) {
    case 'ASSIGN': return <AssignIcon />;
    case 'REQUEST_APPROVAL': return <ApprovalIcon />;
    case 'VIEW_DEPENDENCIES': return <DependencyIcon />;
    case 'OPEN_COMPLIANCE': return <ComplianceIcon />;
    case 'OPEN_PERMITS': return <OpenIcon />;
    default: return <StartIcon />;
  }
};

// =====================================================
// EXPORTS
// =====================================================

export default StartabilitySidebar;
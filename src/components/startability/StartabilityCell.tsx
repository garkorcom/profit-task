/**
 * ============================================================================
 * COMPONENT - StartabilityCell for Grid Integration
 * ============================================================================
 * 
 * Grid cell component that displays startability status with tooltip
 * and click handlers for opening detail sidebar.
 * 
 * @author Senior Full-Stack Engineer + UX Architect
 * @version 1.0.0
 * @feature estimates.startability_v1
 */

import React, { useState } from 'react';
import {
  IconButton,
  Tooltip,
  Popover,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button
} from '@mui/material';
import {
  CheckCircle as ReadyIcon,
  Warning as WarningIcon,
  Block as BlockedIcon,
  Flag as AttentionIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';

import {
  ItemStartability,
  StartabilityReason,
  STARTABILITY_REASON_CONFIG
} from '../../types/startability.types';

import { useTranslation } from 'react-i18next';

// =====================================================
// COMPONENT INTERFACES
// =====================================================

export interface StartabilityCellProps {
  /** Startability data for this item */
  itemStartability: ItemStartability | null;
  
  /** Callback when cell is clicked for detail view */
  onCellClick?: (itemId: string) => void;
  
  /** Show detailed tooltip on hover */
  showTooltip?: boolean;
  
  /** Compact mode for smaller grids */
  compact?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Test ID for automation */
  'data-testid'?: string;
}

// =====================================================
// ICON MAPPING
// =====================================================

const STARTABILITY_ICONS = {
  ready: { icon: ReadyIcon, color: '#4caf50' },
  attention: { icon: WarningIcon, color: '#ff9800' },
  blocked: { icon: BlockedIcon, color: '#f44336' },
  default: { icon: AttentionIcon, color: '#757575' }
} as const;

// =====================================================
// MAIN COMPONENT
// =====================================================

/**
 * StartabilityCell - Grid cell component for startability status
 */
export const StartabilityCell: React.FC<StartabilityCellProps> = ({
  itemStartability,
  onCellClick,
  showTooltip = true,
  compact = false,
  className,
  'data-testid': testId = 'startability-cell'
}) => {
  const { t } = useTranslation();
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);

  // Handle missing or null startability data
  if (!itemStartability) {
    return (
      <Box 
        className={`startability-cell ${className || ''}`}
        data-testid={`${testId}-loading`}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          opacity: 0.5 
        }}
      >
        <Typography variant="caption" color="textSecondary">
          {t('startability.cell.loading')}
        </Typography>
      </Box>
    );
  }

  const { status, reasons, icon, tooltip, itemId } = itemStartability;
  const iconConfig = STARTABILITY_ICONS[status] || STARTABILITY_ICONS.default;
  const IconComponent = iconConfig.icon;

  // Handlers
  const handleCellClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onCellClick) {
      onCellClick(itemId);
    }
  };

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setPopoverAnchor(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setPopoverAnchor(null);
  };

  const popoverOpen = Boolean(popoverAnchor);

  // Render compact version
  if (compact) {
    return (
      <Tooltip title={showTooltip ? tooltip : ''} arrow placement="top">
        <IconButton
          size="small"
          onClick={handleCellClick}
          data-testid={testId}
          className={className}
          sx={{ 
            color: iconConfig.color,
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
          }}
        >
          <span style={{ fontSize: '16px' }}>{icon}</span>
        </IconButton>
      </Tooltip>
    );
  }

  // Render full version with status chip
  return (
    <>
      <Box
        className={`startability-cell ${className || ''}`}
        data-testid={testId}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: onCellClick ? 'pointer' : 'default',
          '&:hover': {
            backgroundColor: onCellClick ? 'rgba(0,0,0,0.02)' : 'transparent'
          }
        }}
        onClick={handleCellClick}
      >
        {/* Status Chip */}
        <Chip
          size="small"
          icon={<IconComponent sx={{ fontSize: '14px !important' }} />}
          label={t(`startability.status.${status}`)}
          variant="outlined"
          sx={{
            color: iconConfig.color,
            borderColor: iconConfig.color,
            '& .MuiChip-icon': { color: iconConfig.color }
          }}
        />

        {/* Reasons Count & More Button */}
        {reasons.length > 0 && (
          <IconButton
            size="small"
            onClick={handlePopoverOpen}
            data-testid={`${testId}-more`}
            sx={{ 
              ml: 0.5,
              opacity: 0.7,
              '&:hover': { opacity: 1 }
            }}
          >
            <MoreIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Detailed Popover */}
      <Popover
        open={popoverOpen}
        anchorEl={popoverAnchor}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: { maxWidth: 350, p: 1 }
        }}
      >
        <Box data-testid={`${testId}-popover`}>
          {/* Header */}
          <Typography variant="subtitle2" gutterBottom>
            {t('startability.cell.details_title')}
          </Typography>

          {/* Reasons List */}
          {reasons.length > 0 ? (
            <List dense sx={{ py: 0 }}>
              {reasons.map((reason, index) => (
                <ReasonListItem 
                  key={index} 
                  reason={reason} 
                  compact 
                />
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="textSecondary">
              {t('startability.cell.no_issues')}
            </Typography>
          )}

          {/* Actions */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              onClick={() => {
                handlePopoverClose();
                if (onCellClick) onCellClick(itemId);
              }}
              data-testid={`${testId}-view-details`}
            >
              {t('startability.cell.view_details')}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

// =====================================================
// HELPER COMPONENTS
// =====================================================

/**
 * Individual reason item for popover list
 */
interface ReasonListItemProps {
  reason: StartabilityReason;
  compact?: boolean;
}

const ReasonListItem: React.FC<ReasonListItemProps> = ({ reason, compact = false }) => {
  const { t } = useTranslation();
  const config = STARTABILITY_REASON_CONFIG[reason.code];

  return (
    <ListItem 
      sx={{ 
        py: compact ? 0.5 : 1,
        px: compact ? 0 : 2
      }}
    >
      <ListItemIcon sx={{ minWidth: 32 }}>
        <Typography component="span" sx={{ fontSize: '14px' }}>
          {config.icon}
        </Typography>
      </ListItemIcon>
      <ListItemText
        primary={t(reason.message)}
        secondary={compact ? undefined : t(`startability.categories.${reason.category.toLowerCase()}`)}
        primaryTypographyProps={{
          variant: compact ? 'caption' : 'body2',
          sx: { 
            color: reason.severity === 'critical' ? 'error.main' : 
                   reason.severity === 'warning' ? 'warning.main' : 'inherit'
          }
        }}
        secondaryTypographyProps={{
          variant: 'caption'
        }}
      />
    </ListItem>
  );
};

// =====================================================
// UTILITY COMPONENTS
// =====================================================

/**
 * Simple startability indicator for minimal space
 */
export interface StartabilityIndicatorProps {
  status: 'ready' | 'blocked' | 'attention';
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

export const StartabilityIndicator: React.FC<StartabilityIndicatorProps> = ({
  status,
  size = 'medium',
  showLabel = false
}) => {
  const { t } = useTranslation();
  const iconConfig = STARTABILITY_ICONS[status] || STARTABILITY_ICONS.default;
  const IconComponent = iconConfig.icon;

  const iconSize = size === 'small' ? 16 : 20;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        color: iconConfig.color
      }}
    >
      <IconComponent sx={{ fontSize: iconSize }} />
      {showLabel && (
        <Typography variant="caption">
          {t(`startability.status.${status}`)}
        </Typography>
      )}
    </Box>
  );
};

// =====================================================
// EXPORTS
// =====================================================

export default StartabilityCell;

// StartabilityCellProps already exported via interface export
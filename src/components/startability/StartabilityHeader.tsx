/**
 * ============================================================================
 * COMPONENT - StartabilityHeader Global Status
 * ============================================================================
 * 
 * Global header component showing overall startability status with
 * critical action blocking and quick access to details.
 * 
 * @author Senior Full-Stack Engineer + UX Architect
 * @version 1.0.0
 * @feature estimates.startability_v1
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Alert,
  AlertTitle,
  IconButton,
  Tooltip,
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';

import {
  CheckCircle as ReadyIcon,
  Block as BlockedIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  OpenInNew as DetailsIcon,
  Send as SendIcon,
  Description as ContractIcon,
  ExpandMore as ExpandIcon
} from '@mui/icons-material';

import {
  StartabilitySnapshot,
  STARTABILITY_REASON_CONFIG
} from '../../types/startability.types';

import { useTranslation } from 'react-i18next';

// =====================================================
// COMPONENT INTERFACES
// =====================================================

export interface StartabilityHeaderProps {
  /** Current startability snapshot */
  snapshot: StartabilitySnapshot | null;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Click handler for opening details */
  onOpenDetails?: () => void;
  
  /** Refresh handler */
  onRefresh?: () => void;
  
  /** Send estimate handler */
  onSendEstimate?: () => void;
  
  /** Convert to contract handler */
  onConvertToContract?: () => void;
  
  /** Whether to show action buttons */
  showActions?: boolean;
  
  /** Compact mode for smaller headers */
  compact?: boolean;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export const StartabilityHeader: React.FC<StartabilityHeaderProps> = ({
  snapshot,
  isLoading = false,
  onOpenDetails,
  onRefresh,
  onSendEstimate,
  onConvertToContract,
  showActions = true,
  compact = false
}) => {
  const { t } = useTranslation();
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);

  // Handle missing snapshot
  if (!snapshot) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: compact ? 1 : 2,
          backgroundColor: 'grey.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'grey.300'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="disabled" />
          <Typography variant="body2" color="textSecondary">
            {t('startability.header.evaluating')}
          </Typography>
        </Box>
        {isLoading && <LinearProgress sx={{ width: 100, height: 2 }} />}
      </Box>
    );
  }

  const { overall, stats, reasons } = snapshot;
  const criticalReasons = reasons.filter(r => r.severity === 'critical');
  const isBlocked = overall === 'blocked';
  const hasWarnings = overall === 'attention';

  // Status configuration
  const statusConfig = {
    ready: {
      icon: <ReadyIcon color="success" />,
      color: 'success' as const,
      bgColor: '#e8f5e8',
      borderColor: '#4caf50'
    },
    blocked: {
      icon: <BlockedIcon color="error" />,
      color: 'error' as const,
      bgColor: '#ffeaea',
      borderColor: '#f44336'
    },
    attention: {
      icon: <WarningIcon color="warning" />,
      color: 'warning' as const,
      bgColor: '#fff8e1',
      borderColor: '#ff9800'
    }
  };

  const config = statusConfig[overall];

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setPopoverAnchor(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setPopoverAnchor(null);
  };

  const popoverOpen = Boolean(popoverAnchor);

  return (
    <>
      <Card
        sx={{
          backgroundColor: config.bgColor,
          border: '2px solid',
          borderColor: config.borderColor,
          mb: 2
        }}
        data-testid="startability-header"
      >
        <CardContent sx={{ p: compact ? 1.5 : 2, '&:last-child': { pb: compact ? 1.5 : 2 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2
            }}
          >
            {/* Status Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {config.icon}
                <Typography
                  variant={compact ? 'subtitle2' : 'h6'}
                  sx={{ fontWeight: 'bold' }}
                >
                  {t(`startability.overall.${overall}`)}
                </Typography>
              </Box>

              {/* Stats Chips */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {stats.criticalCount > 0 && (
                  <Chip
                    size="small"
                    label={`${stats.criticalCount} ${t('startability.severity.critical')}`}
                    color="error"
                    variant="outlined"
                    onClick={handlePopoverOpen}
                    sx={{ cursor: 'pointer' }}
                  />
                )}
                {stats.warningCount > 0 && (
                  <Chip
                    size="small"
                    label={`${stats.warningCount} ${t('startability.severity.warning')}`}
                    color="warning"
                    variant="outlined"
                    onClick={handlePopoverOpen}
                    sx={{ cursor: 'pointer' }}
                  />
                )}
                {stats.infoCount > 0 && (
                  <Chip
                    size="small"
                    label={`${stats.infoCount} ${t('startability.severity.info')}`}
                    color="info"
                    variant="outlined"
                    onClick={handlePopoverOpen}
                    sx={{ cursor: 'pointer' }}
                  />
                )}
              </Box>

              {/* Quick Details Button */}
              {reasons.length > 0 && (
                <Tooltip title={t('startability.header.view_details')}>
                  <IconButton
                    size="small"
                    onClick={handlePopoverOpen}
                    data-testid="quick-details-button"
                  >
                    <ExpandIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Actions Section */}
            {showActions && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Refresh Button */}
                <Tooltip title={t('startability.header.refresh')}>
                  <IconButton
                    size="small"
                    onClick={onRefresh}
                    disabled={isLoading}
                    data-testid="refresh-button"
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>

                {/* Details Button */}
                {onOpenDetails && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DetailsIcon />}
                    onClick={onOpenDetails}
                    data-testid="details-button"
                  >
                    {t('startability.header.details')}
                  </Button>
                )}

                {/* Critical Actions */}
                {onSendEstimate && (
                  <Tooltip
                    title={isBlocked ? t('startability.header.blocked_send_tooltip') : ''}
                  >
                    <span>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<SendIcon />}
                        onClick={onSendEstimate}
                        disabled={isBlocked || isLoading}
                        data-testid="send-estimate-button"
                      >
                        {t('startability.header.send_estimate')}
                      </Button>
                    </span>
                  </Tooltip>
                )}

                {onConvertToContract && (
                  <Tooltip
                    title={isBlocked ? t('startability.header.blocked_convert_tooltip') : ''}
                  >
                    <span>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<ContractIcon />}
                        onClick={onConvertToContract}
                        disabled={isBlocked || isLoading}
                        data-testid="convert-contract-button"
                      >
                        {t('startability.header.convert_contract')}
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>

          {/* Critical Alert */}
          {isBlocked && criticalReasons.length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <AlertTitle>{t('startability.header.critical_alert_title')}</AlertTitle>
              <Typography variant="body2">
                {t('startability.header.critical_alert_description', { 
                  count: criticalReasons.length 
                })}
              </Typography>
            </Alert>
          )}

          {/* Warning Alert */}
          {hasWarnings && !isBlocked && stats.warningCount > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {t('startability.header.warning_alert_description', { 
                  count: stats.warningCount 
                })}
              </Typography>
            </Alert>
          )}

          {/* Success State */}
          {overall === 'ready' && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReadyIcon color="success" fontSize="small" />
              <Typography variant="body2" color="success.main">
                {t('startability.header.ready_description', {
                  count: stats.startableItemCount
                })}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Quick Details Popover */}
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
          sx: { maxWidth: 400, maxHeight: 300 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t('startability.header.quick_overview')}
          </Typography>
          
          {reasons.length > 0 ? (
            <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
              {reasons.slice(0, 5).map((reason, index) => {
                const config = STARTABILITY_REASON_CONFIG[reason.code];
                return (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Typography component="span" sx={{ fontSize: '16px' }}>
                        {config.icon}
                      </Typography>
                    </ListItemIcon>
                    <ListItemText
                      primary={t(reason.message)}
                      primaryTypographyProps={{
                        variant: 'body2',
                        sx: {
                          color: reason.severity === 'critical' ? 'error.main' : 
                                 reason.severity === 'warning' ? 'warning.main' : 'inherit'
                        }
                      }}
                    />
                  </ListItem>
                );
              })}
              {reasons.length > 5 && (
                <ListItem sx={{ px: 0 }}>
                  <ListItemText
                    primary={t('startability.header.more_issues', { 
                      count: reasons.length - 5 
                    })}
                    primaryTypographyProps={{
                      variant: 'caption',
                      sx: { fontStyle: 'italic', color: 'textSecondary' }
                    }}
                  />
                </ListItem>
              )}
            </List>
          ) : (
            <Typography variant="body2" color="success.main">
              {t('startability.header.no_issues')}
            </Typography>
          )}

          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DetailsIcon />}
              onClick={() => {
                handlePopoverClose();
                onOpenDetails?.();
              }}
            >
              {t('startability.header.view_all_details')}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

// =====================================================
// COMPACT HEADER VARIANT
// =====================================================

export const StartabilityHeaderCompact: React.FC<StartabilityHeaderProps> = (props) => {
  return <StartabilityHeader {...props} compact showActions={false} />;
};

// =====================================================
// EXPORTS
// =====================================================

export default StartabilityHeader;
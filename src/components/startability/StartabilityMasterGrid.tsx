/**
 * ============================================================================
 * STARTABILITY MASTER GRID - Master-Detail UI Implementation
 * ============================================================================
 * 
 * Enhanced grid component implementing TZ Master-Detail pattern requirements.
 * Displays startability status column with traffic light indicators (🚦).
 * Integrates with Estimate Constructor to show item-level startability.
 * 
 * @author Senior Full-Stack Engineer + UX Architect  
 * @version 2.0.0 - Technical Requirements
 * @feature estimates.startability_v1
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  CheckCircle as ReadyIcon,
  Warning as WarningIcon,
  Block as BlockedIcon,
  Flag as DoneIcon,
  Info as InfoIcon
} from '@mui/icons-material';

import { 
  StartabilityReport,
  ItemStartabilityV2,
  SummaryStatus
} from '../../types/startability.types';
import { getStartabilityAnalysis } from '../../api/startabilityV2Api';

// =====================================================
// COMPONENT PROPS AND TYPES
// =====================================================

interface EstimateItem {
  id: string;
  name: string;
  description?: string;
  type: 'service' | 'material' | 'equipment';
  assignedTo?: string;
  status?: string;
  unit?: string;
  quantity?: number;
  rate?: number;
  total?: number;
}

interface StartabilityMasterGridProps {
  /** Project and estimate identifiers */
  projectId: string;
  estimateId: string;
  
  /** Estimate items to display */
  items: EstimateItem[];
  
  /** Item selection handler for detail sidebar */
  onItemSelect?: (itemId: string) => void;
  
  /** Selected item ID for highlighting */
  selectedItemId?: string;
  
  /** Enable/disable startability analysis */
  enableStartability?: boolean;
  
  /** Callback when startability data changes */
  onStartabilityChange?: (report: StartabilityReport | null) => void;
  
  /** Additional table columns */
  showAssignee?: boolean;
  showStatus?: boolean;
  showTotals?: boolean;
  
  /** Loading state control */
  loading?: boolean;
}

// =====================================================
// STARTABILITY STATUS COMPONENTS
// =====================================================

/**
 * Traffic Light Status Cell (🚦) - TZ Requirement
 */
interface StatusCellProps {
  status: SummaryStatus;
  blockers: number;
  onClick?: () => void;
  compact?: boolean;
}

const StartabilityStatusCell: React.FC<StatusCellProps> = ({ 
  status, blockers, onClick, compact = false 
}) => {
  const getStatusDisplay = () => {
    switch (status) {
      case 'READY':
        return {
          icon: <ReadyIcon sx={{ color: 'success.main' }} />,
          color: 'success' as const,
          tooltip: 'Готов к выполнению'
        };
      case 'WARNING':
        return {
          icon: <WarningIcon sx={{ color: 'warning.main' }} />,
          color: 'warning' as const,
          tooltip: `Предупреждения (${blockers})`
        };
      case 'BLOCKED':
        return {
          icon: <BlockedIcon sx={{ color: 'error.main' }} />,
          color: 'error' as const,
          tooltip: `Заблокировано (${blockers})`
        };
      case 'DONE':
        return {
          icon: <DoneIcon sx={{ color: 'info.main' }} />,
          color: 'info' as const,
          tooltip: 'Выполнено'
        };
      default:
        return {
          icon: <InfoIcon sx={{ color: 'grey.500' }} />,
          color: 'default' as const,
          tooltip: 'Статус неизвестен'
        };
    }
  };

  const { icon, color, tooltip } = getStatusDisplay();

  return (
    <Tooltip title={tooltip}>
      <IconButton 
        size={compact ? "small" : "medium"}
        onClick={onClick}
        sx={{ 
          '&:hover': onClick ? { backgroundColor: 'action.hover' } : {},
          cursor: onClick ? 'pointer' : 'default'
        }}
      >
        {icon}
        {!compact && blockers > 0 && (
          <Chip
            label={blockers}
            size="small"
            color={color}
            sx={{ ml: 0.5, minWidth: 24, height: 20 }}
          />
        )}
      </IconButton>
    </Tooltip>
  );
};

/**
 * Loading State Cell
 */
const LoadingStatusCell: React.FC = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1 }}>
    <CircularProgress size={20} />
  </Box>
);

/**
 * Error State Cell
 */
const ErrorStatusCell: React.FC<{ error: string }> = ({ error }) => (
  <Tooltip title={error}>
    <IconButton size="small">
      <InfoIcon color="error" />
    </IconButton>
  </Tooltip>
);

// =====================================================
// MAIN MASTER GRID COMPONENT
// =====================================================

export const StartabilityMasterGrid: React.FC<StartabilityMasterGridProps> = ({
  projectId,
  estimateId,
  items,
  onItemSelect,
  selectedItemId,
  enableStartability = true,
  onStartabilityChange,
  showAssignee = true,
  showStatus = true,
  showTotals = true,
  loading: externalLoading = false
}) => {
  // =====================================================
  // STATE MANAGEMENT
  // =====================================================
  
  const [startabilityReport, setStartabilityReport] = useState<StartabilityReport | null>(null);
  const [startabilityLoading, setStartabilityLoading] = useState(false);
  const [startabilityError, setStartabilityError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);


  // =====================================================
  // STARTABILITY DATA FETCHING
  // =====================================================

  const fetchStartabilityData = async () => {
    if (!enableStartability || !projectId || !estimateId) return;

    setStartabilityLoading(true);
    setStartabilityError(null);

    try {
      const report = await getStartabilityAnalysis(projectId, estimateId, {
        includeResolutions: true,
        forceRefresh: false
      });

      setStartabilityReport(report);
      onStartabilityChange?.(report);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStartabilityError(errorMessage);
      console.error('Startability analysis failed:', error);
      
    } finally {
      setStartabilityLoading(false);
    }
  };

  // Initial load and auto-refresh
  useEffect(() => {
    fetchStartabilityData();
  }, [projectId, estimateId, enableStartability]);

  useEffect(() => {
    if (!autoRefresh || !enableStartability) return;

    const interval = setInterval(fetchStartabilityData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, enableStartability, projectId, estimateId]);

  // =====================================================
  // DATA PROCESSING
  // =====================================================

  /**
   * Get startability status for specific item
   */
  const getItemStartability = (itemId: string): ItemStartabilityV2 | null => {
    return startabilityReport?.itemsStartability[itemId] || null;
  };

  /**
   * Enhanced items with startability data
   */
  const enhancedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      startability: getItemStartability(item.id)
    }));
  }, [items, startabilityReport]);

  /**
   * Statistics for header display
   */
  const startabilityStats = useMemo(() => {
    if (!startabilityReport) return null;

    const stats = {
      total: items.length,
      ready: 0,
      warning: 0,
      blocked: 0,
      done: 0
    };

    Object.values(startabilityReport.itemsStartability).forEach(item => {
      switch (item.summaryStatus) {
        case 'READY': stats.ready++; break;
        case 'WARNING': stats.warning++; break;
        case 'BLOCKED': stats.blocked++; break;
        case 'DONE': stats.done++; break;
      }
    });

    return stats;
  }, [startabilityReport, items]);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleItemClick = (itemId: string) => {
    onItemSelect?.(itemId);
  };

  const handleRefresh = () => {
    fetchStartabilityData();
  };

  // =====================================================
  // RENDER HELPERS
  // =====================================================

  const renderStartabilityHeader = () => {
    if (!enableStartability) return null;

    return (
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h6">Стартуемость элементов сметы</Typography>
        
        {startabilityStats && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`✅ ${startabilityStats.ready}`} color="success" size="small" />
            <Chip label={`⚠️ ${startabilityStats.warning}`} color="warning" size="small" />
            <Chip label={`🚫 ${startabilityStats.blocked}`} color="error" size="small" />
            <Chip label={`🏁 ${startabilityStats.done}`} color="info" size="small" />
          </Box>
        )}
        
        <FormControlLabel
          control={
            <Switch
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              size="small"
            />
          }
          label="Автообновление"
          sx={{ ml: 'auto' }}
        />
      </Box>
    );
  };

  const renderStartabilityCell = (item: EstimateItem & { startability?: ItemStartabilityV2 | null }) => {
    if (!enableStartability) return null;

    if (startabilityLoading) {
      return <LoadingStatusCell />;
    }

    if (startabilityError) {
      return <ErrorStatusCell error={startabilityError} />;
    }

    if (!item.startability) {
      return (
        <Tooltip title="Нет данных о стартуемости">
          <IconButton size="small">
            <InfoIcon color="disabled" />
          </IconButton>
        </Tooltip>
      );
    }

    return (
      <StartabilityStatusCell
        status={item.startability.summaryStatus}
        blockers={item.startability.blockers.length}
        onClick={() => handleItemClick(item.id)}
      />
    );
  };

  // =====================================================
  // MAIN RENDER
  // =====================================================

  if (externalLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Alert severity="info">
        Нет элементов для отображения в смете
      </Alert>
    );
  }

  return (
    <Box>
      {renderStartabilityHeader()}
      
      {startabilityError && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <IconButton color="inherit" size="small" onClick={handleRefresh}>
            <InfoIcon />
          </IconButton>
        }>
          Ошибка загрузки данных стартуемости: {startabilityError}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {enableStartability && (
                <TableCell width={80}>
                  <Tooltip title="Стартуемость">
                    <Typography variant="subtitle2">🚦</Typography>
                  </Tooltip>
                </TableCell>
              )}
              <TableCell>Наименование</TableCell>
              <TableCell>Описание</TableCell>
              {showAssignee && <TableCell>Исполнитель</TableCell>}
              {showStatus && <TableCell>Статус</TableCell>}
              {showTotals && (
                <>
                  <TableCell align="right">Количество</TableCell>
                  <TableCell align="right">Цена</TableCell>
                  <TableCell align="right">Сумма</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {enhancedItems.map((item) => (
              <TableRow
                key={item.id}
                selected={selectedItemId === item.id}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' },
                  ...(selectedItemId === item.id && {
                    backgroundColor: 'action.selected'
                  })
                }}
                onClick={() => handleItemClick(item.id)}
              >
                {enableStartability && (
                  <TableCell>{renderStartabilityCell(item)}</TableCell>
                )}
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {item.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {item.description || '—'}
                  </Typography>
                </TableCell>
                {showAssignee && (
                  <TableCell>
                    {item.assignedTo ? (
                      <Chip label={item.assignedTo} size="small" variant="outlined" />
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        Не назначен
                      </Typography>
                    )}
                  </TableCell>
                )}
                {showStatus && (
                  <TableCell>
                    {item.status ? (
                      <Chip label={item.status} size="small" />
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                )}
                {showTotals && (
                  <>
                    <TableCell align="right">
                      {item.quantity ? `${item.quantity} ${item.unit || ''}` : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {item.rate ? `${(item.rate || 0).toLocaleString()} ₽` : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {item.total ? (
                        <Typography variant="body2" fontWeight="medium">
                          {(item.total || 0).toLocaleString()} ₽
                        </Typography>
                      ) : '—'}
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default StartabilityMasterGrid;
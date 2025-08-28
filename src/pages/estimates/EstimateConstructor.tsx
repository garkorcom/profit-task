/**
 * Страница конструктора смет с независимыми блоками
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Stepper,
  Step,
  StepButton,
  StepLabel,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Divider,
  Stack,
  Paper,
  Tooltip,
  Badge,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Check as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Preview as PreviewIcon,
  Share as ShareIcon,
  Print as PrintIcon,
  AccountBox as CounterpartyIcon,
  Business as ProjectIcon,
  Build as ServicesIcon,
  Inventory as ProductsIcon,
  Calculate as CostingIcon,
  Chat as CommunicationIcon,
  Timeline as StatusesIcon,
  Add as AddIcon,
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import {
  Estimate,
  BlockKey,
  BlockState,
  EstimateStatus,
  EstimateTotals,
} from '../../types/estimate.types';
import {
  getEstimate,
  createEstimate,
  updateEstimate,
  updateEstimateBlock,
  validateBlock,
  subscribeToEstimate,
  changeEstimateStatus,
  recalculateEstimateTotals,
} from '../../api/estimateV2Api';

// Импортируем компоненты блоков
import CounterpartyBlock from '../../components/estimates/blocks/CounterpartyBlock';
import ProjectBlock from '../../components/estimates/blocks/ProjectBlock';
import ServicesBlock from '../../components/estimates/blocks/ServicesBlock';
import ProductsBlock from '../../components/estimates/blocks/ProductsBlock';
import CostingBlock from '../../components/estimates/blocks/CostingBlock';
import CommunicationBlock from '../../components/estimates/blocks/CommunicationBlock';
import StatusesBlock from '../../components/estimates/blocks/StatusesBlock';

// Конфигурация блоков
const BLOCK_CONFIG = [
  {
    key: 'counterparty' as BlockKey,
    label: 'Контрагент',
    icon: <CounterpartyIcon />,
    description: 'Выберите клиента и контактное лицо',
    component: CounterpartyBlock,
  },
  {
    key: 'project' as BlockKey,
    label: 'Проект',
    icon: <ProjectIcon />,
    description: 'Привяжите к проекту и локации',
    component: ProjectBlock,
  },
  {
    key: 'services' as BlockKey,
    label: 'Услуги',
    icon: <ServicesIcon />,
    description: 'Добавьте работы и услуги',
    component: ServicesBlock,
  },
  {
    key: 'products' as BlockKey,
    label: 'Товары',
    icon: <ProductsIcon />,
    description: 'Добавьте материалы и оборудование',
    component: ProductsBlock,
  },
  {
    key: 'costing' as BlockKey,
    label: 'Себестоимость',
    icon: <CostingIcon />,
    description: 'Настройте расчет итогов и маржи',
    component: CostingBlock,
  },
  {
    key: 'communication' as BlockKey,
    label: 'Коммуникация',
    icon: <CommunicationIcon />,
    description: 'Настройте взаимодействие с клиентом',
    component: CommunicationBlock,
  },
  {
    key: 'statuses' as BlockKey,
    label: 'Статусы',
    icon: <StatusesIcon />,
    description: 'Управление статусами и переходами',
    component: StatusesBlock,
  },
];

const EstimateConstructor: React.FC = () => {
  const { estimateId } = useParams<{ estimateId?: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [activeBlock, setActiveBlock] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  
  // Load or create estimate
  useEffect(() => {
    if (!currentUser) return;
    
    const loadOrCreateEstimate = async () => {
      setLoading(true);
      try {
        let est: Estimate | null = null;
        
        if (estimateId) {
          // Load existing estimate
          est = await getEstimate(currentUser.uid, estimateId);
        }
        
        if (!est) {
          // Create new estimate
          const newId = await createEstimate(currentUser.uid);
          est = await getEstimate(currentUser.uid, newId);
          
          // Navigate to the new estimate URL
          if (!estimateId && est) {
            navigate(`/estimates/${newId}/constructor`, { replace: true });
          }
        }
        
        setEstimate(est);
      } catch (error) {
        console.error('Error loading estimate:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrCreateEstimate();
  }, [currentUser, estimateId, navigate]);
  
  // Subscribe to estimate changes
  useEffect(() => {
    if (!currentUser || !estimate) return;
    
    const unsubscribe = subscribeToEstimate(
      currentUser.uid,
      estimate.id,
      (updatedEstimate) => {
        if (updatedEstimate) {
          setEstimate(updatedEstimate);
        }
      }
    );
    
    return unsubscribe;
  }, [currentUser, estimate?.id]);
  
  // Handlers
  const handleBlockChange = (blockIndex: number) => {
    setActiveBlock(blockIndex);
  };
  
  const handleBlockSave = async (blockKey: BlockKey, data: any) => {
    if (!currentUser || !estimate) return;
    
    setSaving(true);
    try {
      // Validate block data
      const validation = await validateBlock(blockKey, data);
      
      if (validation.errors && validation.errors.length > 0) {
        setErrors({ ...errors, [blockKey]: validation.errors });
        setSaving(false);
        return;
      }
      
      // Clear errors for this block
      const newErrors = { ...errors };
      delete newErrors[blockKey];
      setErrors(newErrors);
      
      // Update block
      await updateEstimateBlock(
        currentUser.uid,
        estimate.id,
        blockKey,
        {
          status: 'complete',
          data,
        }
      );
      
      // Move to next incomplete block
      const nextIncomplete = estimate.blocks.findIndex(
        (b, i) => i > activeBlock && b.status !== 'complete'
      );
      
      if (nextIncomplete !== -1) {
        setActiveBlock(nextIncomplete);
      }
    } catch (error) {
      console.error('Error saving block:', error);
    } finally {
      setSaving(false);
    }
  };
  
  const handleStatusChange = async (newStatus: EstimateStatus) => {
    if (!currentUser || !estimate) return;
    
    try {
      await changeEstimateStatus(currentUser.uid, estimate.id, newStatus);
    } catch (error: any) {
      alert(error.message);
    }
  };
  
  const handlePreview = () => {
    if (!estimate) return;
    window.open(`/estimates/${estimate.id}/preview`, '_blank');
  };
  
  const handleShare = () => {
    if (!estimate?.publicShareId) return;
    
    const shareUrl = `${window.location.origin}/public/estimate/${estimate.publicShareId}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Смета ${estimate.number}`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Ссылка скопирована в буфер обмена');
    }
  };
  
  // Calculate completion
  const calculateCompletion = (): number => {
    if (!estimate) return 0;
    
    const completedBlocks = estimate.blocks.filter(b => b.status === 'complete').length;
    return (completedBlocks / estimate.blocks.length) * 100;
  };
  
  // Get block status icon
  const getBlockStatusIcon = (block: BlockState) => {
    const hasErrors = errors[block.key]?.length > 0;
    
    if (hasErrors) {
      return <ErrorIcon color="error" fontSize="small" />;
    }
    
    switch (block.status) {
      case 'complete':
        return <CheckIcon color="success" fontSize="small" />;
      case 'in_progress':
        return <EditIcon color="primary" fontSize="small" />;
      default:
        return null;
    }
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (!estimate) {
    return (
      <Box p={3}>
        <Alert severity="error">Смета не найдена</Alert>
      </Box>
    );
  }
  
  const completion = calculateCompletion();
  const activeBlockConfig = BLOCK_CONFIG[activeBlock];
  const ActiveBlockComponent = activeBlockConfig?.component;
  const activeBlockData = estimate.blocks.find(b => b.key === activeBlockConfig?.key);
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h5">
            {estimate.number}
          </Typography>
          
          <Chip
            label={estimate.status}
            color={estimate.status === 'accepted' ? 'success' : 'default'}
            size="small"
          />
          
          <Box flex={1} />
          
          <Typography variant="body2" color="text.secondary">
            {completion.toFixed(0)}% завершено
          </Typography>
          
          <LinearProgress
            variant="determinate"
            value={completion}
            sx={{ width: 100 }}
          />
        </Stack>
      </Paper>
      
      {/* Stepper */}
      <Paper elevation={0} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stepper
          nonLinear
          activeStep={activeBlock}
          orientation={isMobile ? 'vertical' : 'horizontal'}
        >
          {BLOCK_CONFIG.map((config, index) => {
            const block = estimate.blocks.find(b => b.key === config.key);
            
            return (
              <Step key={config.key} completed={block?.status === 'complete'}>
                <StepButton onClick={() => handleBlockChange(index)}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Badge
                        badgeContent={getBlockStatusIcon(block!)}
                        overlap="circular"
                      >
                        {config.icon}
                      </Badge>
                    )}
                  >
                    {config.label}
                  </StepLabel>
                </StepButton>
              </Step>
            );
          })}
        </Stepper>
      </Paper>
      
      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Block content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                {activeBlockConfig.icon}
                <Box>
                  <Typography variant="h6">
                    {activeBlockConfig.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {activeBlockConfig.description}
                  </Typography>
                </Box>
              </Stack>
              
              <Divider sx={{ mb: 3 }} />
              
              {/* Block errors */}
              {errors[activeBlockConfig.key]?.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {errors[activeBlockConfig.key].map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              
              {/* Block component */}
              {ActiveBlockComponent && activeBlockData && (
                <ActiveBlockComponent
                  estimate={estimate}
                  block={activeBlockData}
                  onSave={(data) => handleBlockSave(activeBlockConfig.key, data)}
                  saving={saving}
                />
              )}
            </CardContent>
            
            <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
              <Button
                startIcon={<BackIcon />}
                onClick={() => setActiveBlock(Math.max(0, activeBlock - 1))}
                disabled={activeBlock === 0}
              >
                Назад
              </Button>
              
              <Button
                endIcon={<NextIcon />}
                onClick={() => setActiveBlock(Math.min(BLOCK_CONFIG.length - 1, activeBlock + 1))}
                disabled={activeBlock === BLOCK_CONFIG.length - 1}
              >
                Далее
              </Button>
            </CardActions>
          </Card>
        </Box>
        
        {/* Sidebar with totals */}
        {!isMobile && (
          <Paper sx={{ width: 350, p: 3, borderLeft: 1, borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>
              Итоги
            </Typography>
            
            <Stack spacing={2}>
              <TotalLine
                label="Материалы"
                value={estimate.totals.materialsCost}
              />
              <TotalLine
                label="Работы"
                value={estimate.totals.laborCost}
              />
              <TotalLine
                label="Оборудование"
                value={estimate.totals.equipmentCost}
              />
              
              <Divider />
              
              <TotalLine
                label="Себестоимость"
                value={
                  estimate.totals.materialsCost +
                  estimate.totals.laborCost +
                  estimate.totals.equipmentCost +
                  estimate.totals.subcontractCost
                }
              />
              
              <TotalLine
                label={`Накладные (${estimate.totals.overheadPct}%)`}
                value={estimate.totals.overheadAmt}
              />
              
              {estimate.totals.discountAmt > 0 && (
                <TotalLine
                  label="Скидка"
                  value={-estimate.totals.discountAmt}
                  color="error"
                />
              )}
              
              {estimate.totals.shippingAmt > 0 && (
                <TotalLine
                  label="Доставка"
                  value={estimate.totals.shippingAmt}
                />
              )}
              
              <Divider />
              
              <TotalLine
                label="Подитог"
                value={estimate.totals.subtotalPrice}
              />
              
              <TotalLine
                label="НДС 20%"
                value={estimate.totals.taxAmt}
              />
              
              <Divider />
              
              <TotalLine
                label="ИТОГО"
                value={estimate.totals.grandTotal}
                variant="h6"
                color="primary"
              />
              
              <Chip
                label={`Маржа: ${estimate.totals.grossMarginPct.toFixed(1)}%`}
                color={estimate.totals.grossMarginPct > 30 ? 'success' : 'warning'}
              />
            </Stack>
            
            <Box mt={3}>
              <Stack spacing={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreview}
                >
                  Предпросмотр
                </Button>
                
                {estimate.publicShareId && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ShareIcon />}
                    onClick={handleShare}
                  >
                    Поделиться
                  </Button>
                )}
                
                {estimate.status === 'draft' && completion === 100 && (
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    startIcon={<SendIcon />}
                    onClick={() => handleStatusChange('sent')}
                  >
                    Отправить клиенту
                  </Button>
                )}
              </Stack>
            </Box>
          </Paper>
        )}
      </Box>
      
      {/* Mobile FAB */}
      {isMobile && (
        <SpeedDial
          ariaLabel="Действия"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<PreviewIcon />}
            tooltipTitle="Предпросмотр"
            onClick={handlePreview}
          />
          
          {estimate.publicShareId && (
            <SpeedDialAction
              icon={<ShareIcon />}
              tooltipTitle="Поделиться"
              onClick={handleShare}
            />
          )}
          
          {estimate.status === 'draft' && completion === 100 && (
            <SpeedDialAction
              icon={<SendIcon />}
              tooltipTitle="Отправить"
              onClick={() => handleStatusChange('sent')}
            />
          )}
        </SpeedDial>
      )}
    </Box>
  );
};

// Helper component for displaying totals
const TotalLine: React.FC<{
  label: string;
  value: number;
  variant?: any;
  color?: any;
}> = ({ label, value, variant = 'body2', color = 'textPrimary' }) => (
  <Stack direction="row" justifyContent="space-between">
    <Typography variant={variant} color={color}>
      {label}
    </Typography>
    <Typography variant={variant} color={color} fontWeight="bold">
      {value.toLocaleString('ru-RU', { 
        style: 'currency', 
        currency: 'RUB',
        maximumFractionDigits: 0,
      })}
    </Typography>
  </Stack>
);

export default EstimateConstructor;

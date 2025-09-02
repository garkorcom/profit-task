/**
 * Страница конструктора смет с независимыми блоками
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { cleanForFirestore } from '../../utils/firebaseUtils';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isVerySmall = useMediaQuery(theme.breakpoints.down(375));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  const projectId = searchParams.get('projectId');
  
  // State
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [activeBlock, setActiveBlock] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [skipSubscription, setSkipSubscription] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  
  // Load or create estimate
  useEffect(() => {
    let createdInThisMount = false;
    if (!currentUser) return;
    
    const loadOrCreateEstimate = async () => {
      setLoading(true);
      try {
        let est: Estimate | null = null;
        
        if (estimateId) {
          // Load existing estimate
          est = await getEstimate(currentUser.uid, estimateId);
        }
        
        if (!est && !createdInThisMount) {
          // Create new estimate
          const newId = await createEstimate(currentUser.uid);
          if (newId) {
            est = await getEstimate(currentUser.uid, newId);
            
            // Pre-populate project block if projectId is provided
            if (projectId && est) {
              try {
                await updateEstimateBlock(
                  currentUser.uid,
                  est.id,
                  'project',
                  {
                    status: 'complete',
                    data: { projectId },
                  }
                );
                // Reload estimate to get updated data
                est = await getEstimate(currentUser.uid, est.id);
              } catch (error) {
                console.error('Error pre-populating project:', error);
              }
            }
            
            // Navigate to the new estimate URL only if we don't have an estimateId
            if (!estimateId) {
              const newUrl = projectId 
                ? `/estimates/${newId}/constructor?projectId=${projectId}`
                : `/estimates/${newId}/constructor`;
              navigate(newUrl, { replace: true });
              return; // Exit early to prevent further execution
            }
          }
          createdInThisMount = true;
        }
        
        setEstimate(est);
      } catch (error) {
        console.error('Error loading estimate:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadOrCreateEstimate();
  }, [currentUser, estimateId, navigate, projectId]);
  
  // Subscribe to estimate changes
  useEffect(() => {
    if (!currentUser || !estimate || skipSubscription) return;
    
    const unsubscribe = subscribeToEstimate(
      currentUser.uid,
      estimate.id,
      (updatedEstimate) => {
        if (updatedEstimate && !skipSubscription) {
          setEstimate(updatedEstimate);
        }
      }
    );
    
    return unsubscribe;
  }, [currentUser, estimate?.id, skipSubscription]);
  
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
      
      // Clean data before saving to prevent Firestore errors
      console.log('📊 Original data before cleaning:', JSON.stringify(data, null, 2));
      const cleanedData = cleanForFirestore(data);
      console.log('✨ Cleaned data after processing:', JSON.stringify(cleanedData, null, 2));
      
      const blockUpdateData = {
        status: 'complete' as const,
        data: cleanedData,
      };
      console.log('🚀 Final block update data:', JSON.stringify(blockUpdateData, null, 2));
      
      // Update block
      await updateEstimateBlock(
        currentUser.uid,
        estimate.id,
        blockKey,
        blockUpdateData
      );
      
      // Recalculate totals if block affects costs
      if (['services', 'products', 'costing'].includes(blockKey)) {
        await recalculateEstimateTotals(currentUser.uid, estimate.id);
      }
      
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
    
    // Показываем индикатор загрузки
    setSaving(true);
    
    try {
      console.log(`Changing status from ${estimate.status} to ${newStatus}`);
      await changeEstimateStatus(currentUser.uid, estimate.id, newStatus);
      console.log('Status changed successfully');
    } catch (error: any) {
      console.error('Status change failed:', error);
      
      // Более детальные сообщения об ошибках
      let errorMessage = error.message || 'Неизвестная ошибка при смене статуса';
      
      // Специальные сообщения для частых ошибок
      if (errorMessage.includes('counterparty')) {
        errorMessage = `❌ ${errorMessage}\n\n💡 Перейдите к блоку "Контрагент" и выберите клиента.`;
      } else if (errorMessage.includes('services') || errorMessage.includes('товары')) {
        errorMessage = `❌ ${errorMessage}\n\n💡 Добавьте услуги в блок "Услуги" или товары в блок "Товары".`;
      } else if (errorMessage.includes('Invalid status transition')) {
        errorMessage = `❌ Невозможно изменить статус с "${estimate.status}" на "${newStatus}"\n\n💡 Проверьте последовательность статусов.`;
      }
      
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };
  
  const handlePreview = () => {
    if (!estimate) return;
    // TODO: Implement preview functionality
    alert(`Предпросмотр сметы ${estimate.number} - функция в разработке`);
  };

  const handleRecalculate = async () => {
    if (!currentUser || !estimate?.id) return;
    
    setIsRecalculating(true);
    setSkipSubscription(true); // Временно отключаем подписку
    
    try {
      console.log('🔄 Запуск пересчета смет пользователем из боковой панели');
      await recalculateEstimateTotals(currentUser.uid, estimate.id);
      console.log('✅ Пересчет завершен успешно');
      
      // Обновляем состояние сметы принудительно
      const updatedEstimate = await getEstimate(currentUser.uid, estimate.id);
      if (updatedEstimate) {
        setEstimate(updatedEstimate);
        console.log('🔄 Состояние сметы обновлено в интерфейсе');
      }
    } catch (error) {
      console.error('❌ Ошибка пересчета:', error);
    } finally {
      setIsRecalculating(false);
      // Включаем подписку обратно через небольшую задержку
      setTimeout(() => {
        setSkipSubscription(false);
        console.log('🔄 Подписка на изменения включена обратно');
      }, 1000);
    }
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

  // Get available status transitions
  const getAvailableStatusTransitions = (): EstimateStatus[] => {
    if (!estimate) return [];
    
    const validTransitions: Record<EstimateStatus, EstimateStatus[]> = {
      'draft': ['internal_review', 'sent', 'canceled'],
      'internal_review': ['draft', 'sent', 'canceled'],
      'sent': ['viewed', 'accepted', 'rejected', 'canceled'],
      'viewed': ['negotiation', 'accepted', 'rejected', 'expired'],
      'negotiation': ['accepted', 'rejected', 'canceled'],
      'accepted': ['converted'],
      'rejected': ['draft', 'canceled'],
      'expired': ['draft', 'canceled'],
      'converted': [],
      'canceled': ['draft'],
    };
    
    return validTransitions[estimate.status] || [];
  };

  const availableTransitions = getAvailableStatusTransitions();
  
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
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      pb: (isMobile || isTablet) ? 8 : 0 
    }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: isMobile ? 1.5 : 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant={isMobile ? "h6" : "h5"} noWrap>
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
            sx={{ width: isVerySmall ? 80 : 100 }}
          />
        </Stack>
      </Paper>
      
      {/* Stepper */}
      <Paper elevation={0} sx={{ p: isMobile ? 1 : 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stepper
          nonLinear
          activeStep={activeBlock}
          orientation={isMobile ? 'vertical' : 'horizontal'}
          sx={{
            ...(isMobile && {
              '& .MuiStepLabel-root': {
                py: isVerySmall ? 1 : 1.5,
              },
              '& .MuiStepButton-root': {
                px: isVerySmall ? 1 : 2,
                py: isVerySmall ? 1 : 1.5,
              },
              '& .MuiStepLabel-label': {
                fontSize: isVerySmall ? '0.75rem' : '0.875rem',
              },
            }),
          }}
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
        <Box sx={{ flex: 1, overflow: 'auto', p: isMobile ? 2 : 3 }}>
          <Card>
            <CardContent>
              <Stack 
                direction={isVerySmall ? "column" : "row"} 
                alignItems={isVerySmall ? "flex-start" : "center"} 
                spacing={isVerySmall ? 1 : 2} 
                mb={2}
                sx={{ textAlign: isVerySmall ? 'left' : 'initial' }}
              >
                {activeBlockConfig.icon}
                <Box>
                  <Typography variant={isMobile ? "subtitle1" : "h6"}>
                    {activeBlockConfig.label}
                  </Typography>
                  <Typography 
                    variant={isVerySmall ? "caption" : "body2"} 
                    color="text.secondary"
                  >
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
            
            <CardActions sx={{ 
              justifyContent: 'space-between', 
              px: isMobile ? 2 : 3, 
              pb: 2,
              flexDirection: isVerySmall ? 'column' : 'row',
              gap: isVerySmall ? 1 : 0
            }}>
              <Button
                startIcon={<BackIcon />}
                onClick={() => setActiveBlock(Math.max(0, activeBlock - 1))}
                disabled={activeBlock === 0}
                size={isMobile ? "medium" : "large"}
                fullWidth={isVerySmall}
                sx={{ minHeight: 44 }}
              >
                Назад
              </Button>
              
              <Button
                endIcon={<NextIcon />}
                onClick={() => setActiveBlock(Math.min(BLOCK_CONFIG.length - 1, activeBlock + 1))}
                disabled={activeBlock === BLOCK_CONFIG.length - 1}
                size={isMobile ? "medium" : "large"}
                fullWidth={isVerySmall}
                sx={{ minHeight: 44 }}
              >
                Далее
              </Button>
            </CardActions>
          </Card>
        </Box>
        
        {/* Sidebar with totals */}
        {!isMobile && !isTablet && (
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
                  startIcon={isRecalculating ? <CircularProgress size={16} /> : <CostingIcon />}
                  onClick={handleRecalculate}
                  disabled={loading || saving || isRecalculating || !estimate?.id}
                  color="primary"
                >
                  {isRecalculating ? 'Пересчитываю...' : 'Пересчитать итоги'}
                </Button>
                
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreview}
                  disabled={isRecalculating}
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
                
                {/* Доступные переходы статусов */}
                {availableTransitions.length > 0 && (
                  <>
                    <Divider sx={{ my: 1 }}>Изменить статус</Divider>
                    {availableTransitions.map((status) => {
                      const statusConfig = {
                        'sent': { label: 'Отправить клиенту', color: 'success' as const, icon: <SendIcon /> },
                        'accepted': { label: 'Принять', color: 'success' as const, icon: <CheckIcon /> },
                        'rejected': { label: 'Отклонить', color: 'error' as const, icon: <ErrorIcon /> },
                        'canceled': { label: 'Отменить', color: 'warning' as const, icon: <ErrorIcon /> },
                        'draft': { label: 'В работу', color: 'primary' as const, icon: <EditIcon /> },
                        'internal_review': { label: 'На проверку', color: 'info' as const, icon: <CheckIcon /> },
                        'viewed': { label: 'Просмотрено', color: 'info' as const, icon: <CheckIcon /> },
                        'negotiation': { label: 'Переговоры', color: 'warning' as const, icon: <EditIcon /> },
                        'expired': { label: 'Истекло', color: 'error' as const, icon: <ErrorIcon /> },
                        'converted': { label: 'В проект', color: 'success' as const, icon: <CheckIcon /> },
                      }[status] || { label: status, color: 'primary' as const, icon: <CheckIcon /> };
                      
                      return (
                        <Button
                          key={status}
                          fullWidth
                          variant="outlined"
                          color={statusConfig.color}
                          startIcon={statusConfig.icon}
                          onClick={() => handleStatusChange(status)}
                          disabled={saving}
                        >
                          {statusConfig.label}
                        </Button>
                      );
                    })}
                  </>
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
          sx={{ 
            position: 'fixed', 
            bottom: isVerySmall ? 12 : 16, 
            right: isVerySmall ? 12 : 16,
            '& .MuiSpeedDial-fab': {
              width: isVerySmall ? 48 : 56,
              height: isVerySmall ? 48 : 56
            }
          }}
          icon={<SpeedDialIcon />}
        >
          {!loading && !saving && estimate?.id && (
            <SpeedDialAction
              icon={isRecalculating ? <CircularProgress size={20} color="inherit" /> : <CostingIcon />}
              tooltipTitle={isRecalculating ? "Пересчитываю..." : "Пересчитать итоги"}
              onClick={isRecalculating ? undefined : handleRecalculate}
              sx={{
                '& .MuiSpeedDialAction-fab': {
                  width: isVerySmall ? 40 : 48,
                  height: isVerySmall ? 40 : 48,
                  minHeight: isVerySmall ? 40 : 48,
                  backgroundColor: isRecalculating ? 'action.disabled' : undefined,
                  pointerEvents: isRecalculating ? 'none' : 'auto'
                }
              }}
            />
          )}
          
          {!isRecalculating && (
            <SpeedDialAction
              icon={<PreviewIcon />}
              tooltipTitle="Предпросмотр"
              onClick={handlePreview}
              sx={{
                '& .MuiSpeedDialAction-fab': {
                  width: isVerySmall ? 40 : 48,
                  height: isVerySmall ? 40 : 48,
                  minHeight: isVerySmall ? 40 : 48
                }
              }}
            />
          )}
          
          {estimate.publicShareId && (
            <SpeedDialAction
              icon={<ShareIcon />}
              tooltipTitle="Поделиться"
              onClick={handleShare}
              sx={{
                '& .MuiSpeedDialAction-fab': {
                  width: isVerySmall ? 40 : 48,
                  height: isVerySmall ? 40 : 48,
                  minHeight: isVerySmall ? 40 : 48
                }
              }}
            />
          )}
          
          {estimate.status === 'draft' && completion === 100 && (
            <SpeedDialAction
              icon={<SendIcon />}
              tooltipTitle="Отправить"
              onClick={() => handleStatusChange('sent')}
              sx={{
                '& .MuiSpeedDialAction-fab': {
                  width: isVerySmall ? 40 : 48,
                  height: isVerySmall ? 40 : 48,
                  minHeight: isVerySmall ? 40 : 48
                }
              }}
            />
          )}
        </SpeedDial>
      )}
      
      {/* Mobile bottom totals */}
      {(isMobile || isTablet) && (
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            p: isVerySmall ? 1 : 2, 
            zIndex: 1200,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Typography variant={isVerySmall ? "body2" : "subtitle1"} color="text.secondary">
            Итого:
          </Typography>
          <Typography 
            variant={isVerySmall ? "subtitle1" : "h6"} 
            fontWeight="bold"
            color="primary"
          >
            {estimate.totals.grandTotal.toLocaleString('ru-RU', { 
              style: 'currency', 
              currency: 'RUB',
              maximumFractionDigits: 0,
            })}
          </Typography>
        </Paper>
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

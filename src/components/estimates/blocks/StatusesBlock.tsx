/**
 * Блок "Статусы" для конструктора смет
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button,
  Stack,
  Stepper,
  Step,
  StepLabel,
  StepContent,

  Checkbox,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {

  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { 
  Estimate, 
  BlockState,
  StatusesBlockData,
  EstimateStatus,
} from '../../../types/estimate.types';
import { changeEstimateStatus } from '../../../api/estimateV2Api';
import { useAuth } from '../../../auth/AuthContext';

interface StatusesBlockProps {
  estimate: Estimate;
  block: BlockState;
  onSave: (data: StatusesBlockData) => void;
  saving: boolean;
}

const StatusesBlock: React.FC<StatusesBlockProps> = ({
  estimate,
  block,
  onSave,
  saving,
}) => {
  // const blockData = (block.data || {}) as StatusesBlockData; // TODO: использовать для сохранения состояния чеклиста
  
  const { currentUser } = useAuth();
  const [isChanging, setIsChanging] = useState(false);
  const [checklist, setChecklist] = useState([
    { key: 'has_items', label: 'Есть хотя бы одна позиция', done: false, required: true },
    { key: 'has_counterparty', label: 'Указан контрагент', done: false, required: true },
    { key: 'has_address', label: 'Указан адрес объекта', done: false, required: false },
    { key: 'has_payment_terms', label: 'Указаны условия оплаты', done: false, required: true },
    { key: 'has_valid_date', label: 'Установлен срок действия', done: false, required: false },
  ]);

  // Update checklist based on actual block completion status
  useEffect(() => {
    setChecklist(currentChecklist => 
      currentChecklist.map(item => {
        let done = false;
        
        switch (item.key) {
          case 'has_counterparty':
            const counterpartyBlock = estimate.blocks.find(b => b.key === 'counterparty');
            done = counterpartyBlock?.status === 'complete';
            break;
          case 'has_items':
            const servicesBlock = estimate.blocks.find(b => b.key === 'services');
            const productsBlock = estimate.blocks.find(b => b.key === 'products');
            done = servicesBlock?.status === 'complete' || productsBlock?.status === 'complete';
            break;
          case 'has_address':
            const projectBlock = estimate.blocks.find(b => b.key === 'project');
            done = projectBlock?.status === 'complete';
            break;
          case 'has_payment_terms':
            const counterpartyBlockForPayment = estimate.blocks.find(b => b.key === 'counterparty');
            done = counterpartyBlockForPayment?.status === 'complete' && !!(counterpartyBlockForPayment?.data as any)?.paymentTerms;
            break;
          case 'has_valid_date':
            // Check if estimate has validUntil date
            done = !!estimate.validUntil;
            break;
          default:
            done = item.done;
        }
        
        return { ...item, done };
      })
    );
  }, [estimate.blocks, estimate.validUntil]);

  const handleChecklistToggle = (key: string) => {
    setChecklist(checklist.map(item => 
      item.key === key ? { ...item, done: !item.done } : item
    ));
  };

  const handleSave = () => {
    const data: StatusesBlockData = {
      current: estimate.status,
      checklist,
      transitions: getDefaultTransitions(),
    };
    
    onSave(data);
  };

  const handleChangeStatus = async (next: EstimateStatus) => {
    if (!currentUser) return;
    try {
      setIsChanging(true);
      await changeEstimateStatus(currentUser.uid, estimate.id, next);
    } catch (e) {
      console.error('Failed to change status', e);
      alert('Не удалось изменить статус');
    } finally {
      setIsChanging(false);
    }
  };

  const getDefaultTransitions = () => [
    { from: 'draft' as EstimateStatus, to: 'internal_review' as EstimateStatus },
    { from: 'internal_review' as EstimateStatus, to: 'sent' as EstimateStatus },
    { from: 'sent' as EstimateStatus, to: 'viewed' as EstimateStatus },
    { from: 'viewed' as EstimateStatus, to: 'negotiation' as EstimateStatus },
    { from: 'negotiation' as EstimateStatus, to: 'accepted' as EstimateStatus },
    { from: 'accepted' as EstimateStatus, to: 'converted' as EstimateStatus },
  ];

  const getStatusColor = (status: EstimateStatus) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'info';
      case 'viewed': return 'primary';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const statusFlow = [
    { status: 'draft', label: 'Черновик' },
    { status: 'internal_review', label: 'Проверка' },
    { status: 'sent', label: 'Отправлена' },
    { status: 'viewed', label: 'Просмотрена' },
    { status: 'negotiation', label: 'Согласование' },
    { status: 'accepted', label: 'Принята' },
  ];

  const currentIndex = statusFlow.findIndex(s => s.status === estimate.status);

  return (
    <Box>
      <Stack spacing={3}>
        {/* Current status */}
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Текущий статус:
          </Typography>
          <Chip 
            label={estimate.status}
            color={getStatusColor(estimate.status) as any}
            size="medium"
          />
        </Box>
        
        {/* Status flow */}
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Жизненный цикл сметы:
          </Typography>
          <Stepper activeStep={currentIndex} orientation="vertical">
            {statusFlow.map((item, index) => (
              <Step key={item.status} completed={index < currentIndex}>
                <StepLabel>{item.label}</StepLabel>
                <StepContent>
                  <Typography variant="caption">
                    {getStatusDescription(item.status as EstimateStatus)}
                  </Typography>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>
        
        {/* Pre-send checklist */}
        {estimate.status === 'draft' && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Проверка перед отправкой:
            </Typography>
            <List>
              {checklist.map((item) => (
                <ListItem key={item.key} dense>
                  <ListItemIcon>
                    <Checkbox
                      checked={item.done}
                      onChange={() => handleChecklistToggle(item.key)}
                      size="small"
                    />
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label}
                    secondary={item.required ? 'Обязательно' : 'Рекомендуется'}
                  />
                </ListItem>
              ))}
            </List>
            
            {checklist.filter(i => i.required && !i.done).length > 0 && (
              <Alert severity="warning">
                Не все обязательные пункты выполнены. Смета не может быть отправлена.
              </Alert>
            )}
          </Box>
        )}
        
        {/* Available transitions */}
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Доступные действия:
          </Typography>
          <Stack direction="row" spacing={1}>
            {estimate.status === 'draft' && (
              <Button 
                variant="outlined" 
                startIcon={<ArrowIcon />}
                disabled={checklist.filter(i => i.required && !i.done).length > 0 || isChanging}
                onClick={() => handleChangeStatus('internal_review')}
              >
                На проверку
              </Button>
            )}
            {estimate.status === 'internal_review' && (
              <Button 
                variant="outlined" 
                startIcon={<ArrowIcon />}
                color="success"
                disabled={isChanging}
                onClick={() => handleChangeStatus('sent')}
              >
                Отправить клиенту
              </Button>
            )}
            {estimate.status === 'viewed' && (
              <>
                <Button variant="outlined" color="success" disabled={isChanging} onClick={() => handleChangeStatus('accepted')}>
                  Принять
                </Button>
                <Button variant="outlined" color="error" disabled={isChanging} onClick={() => handleChangeStatus('rejected')}>
                  Отклонить
                </Button>
              </>
            )}
          </Stack>
        </Box>
        
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </Stack>
    </Box>
  );
};

const getStatusDescription = (status: EstimateStatus): string => {
  switch (status) {
    case 'draft':
      return 'Смета в работе, можно редактировать все блоки';
    case 'internal_review':
      return 'Внутренняя проверка менеджером или руководителем';
    case 'sent':
      return 'Смета отправлена клиенту, ожидается просмотр';
    case 'viewed':
      return 'Клиент просмотрел смету';
    case 'negotiation':
      return 'Идет обсуждение условий и корректировок';
    case 'accepted':
      return 'Смета принята клиентом';
    case 'rejected':
      return 'Смета отклонена клиентом';
    case 'expired':
      return 'Истек срок действия сметы';
    case 'converted':
      return 'Смета конвертирована в договор';
    case 'canceled':
      return 'Смета отменена';
    default:
      return '';
  }
};

export default StatusesBlock;

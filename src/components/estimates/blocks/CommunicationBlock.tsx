/**
 * Блок "Коммуникация" для конструктора смет
 * Расширенная версия с улучшенным UI/UX
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button,
  Stack,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  TextField,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Email as EmailIcon,
  Link as LinkIcon,
  WhatsApp as WhatsAppIcon,
  Sms as SmsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  NotificationImportant as NotificationIcon,
  Security as SecurityIcon,
  Comment as CommentIcon,
  Handshake as HandshakeIcon,
  Visibility as VisibilityIcon,
  Payment as PaymentIcon,
  Send as SendIcon,
  Save as SaveIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { 
  Estimate, 
  BlockState, 
  CommunicationBlockData,
  SignMethod,
  CommunicationChannel,
  EstimateStatus 
} from '../../../types/estimate.types';
import { 
  DEFAULT_MESSAGE_TEMPLATES,
  generateStatusMessage,
  generateChannelLink,
  validatePaymentLink,
  getCommunicationRecommendations,
} from '../../../utils/communicationHelpers';

interface CommunicationBlockProps {
  estimate: Estimate;
  block: BlockState;
  onSave: (data: CommunicationBlockData) => void;
  saving: boolean;
}

const CommunicationBlock: React.FC<CommunicationBlockProps> = ({
  estimate,
  block,
  onSave,
  saving,
}) => {
  const blockData = (block.data || {}) as CommunicationBlockData;
  
  // Основные настройки
  const [clientPortalEnabled, setClientPortalEnabled] = useState<boolean>(blockData?.clientPortalEnabled || false);
  const [allowLineItemComments, setAllowLineItemComments] = useState<boolean>(blockData?.allowLineItemComments || false);
  const [allowNegotiation, setAllowNegotiation] = useState<boolean>(blockData?.allowNegotiation || false);
  const [readReceipts, setReadReceipts] = useState<boolean>(blockData?.readReceipts !== undefined ? blockData.readReceipts : true);
  const [signMethod, setSignMethod] = useState<SignMethod>(blockData?.signMethod || 'e-sign');
  const [primaryChannel, setPrimaryChannel] = useState<CommunicationChannel>(blockData?.primaryChannel || 'email');
  
  // Расширенные настройки
  const [paymentLink, setPaymentLink] = useState<string>(blockData?.paymentLink || '');
  const [messageTemplates, setMessageTemplates] = useState<string[]>(blockData?.messageTemplates || []);
  
  // UI состояние
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState('');
  const [previewGenerated, setPreviewGenerated] = useState(false);
  const [paymentLinkError, setPaymentLinkError] = useState<string>('');
  const [showRecommendations, setShowRecommendations] = useState(true);
  
  // Генерация публичной ссылки при включении портала
  useEffect(() => {
    if (clientPortalEnabled && !previewGenerated) {
      setPreviewGenerated(true);
      // Здесь можно вызвать API для генерации публичной ссылки
      console.log('Generating public share link for estimate:', estimate.id);
    }
  }, [clientPortalEnabled, estimate.id, previewGenerated]);

  // Вспомогательные функции
  const getChannelIcon = (channel: CommunicationChannel) => {
    const icons = {
      email: <EmailIcon />,
      link: <LinkIcon />,
      whatsapp: <WhatsAppIcon />,
      sms: <SmsIcon />,
    };
    return icons[channel];
  };

  const handleAddTemplate = () => {
    if (newTemplate.trim()) {
      setMessageTemplates([...messageTemplates, newTemplate.trim()]);
      setNewTemplate('');
      setTemplateDialogOpen(false);
    }
  };

  const handleRemoveTemplate = (index: number) => {
    setMessageTemplates(messageTemplates.filter((_, i) => i !== index));
  };

  const addDefaultTemplates = () => {
    const newTemplates = DEFAULT_MESSAGE_TEMPLATES.filter(
      template => !messageTemplates.includes(template)
    );
    setMessageTemplates([...messageTemplates, ...newTemplates]);
  };

  const handlePaymentLinkChange = (value: string) => {
    setPaymentLink(value);
    if (value.trim()) {
      const isValid = validatePaymentLink(value);
      setPaymentLinkError(isValid ? '' : 'Введите корректную ссылку на платежную систему');
    } else {
      setPaymentLinkError('');
    }
  };

  const generateMessageForStatus = (status: EstimateStatus = 'sent') => {
    const counterpartyBlock = estimate.blocks.find(b => b.key === 'counterparty');
    const counterpartyData = counterpartyBlock?.data as any;
    const clientName = counterpartyData?.displayName;
    
    return generateStatusMessage(status, estimate.number, clientName);
  };

  const sendToChannel = () => {
    const estimateUrl = generatePreviewLink();
    const message = generateMessageForStatus();
    
    // Получаем контакты клиента
    const counterpartyBlock = estimate.blocks.find(b => b.key === 'counterparty');
    const counterpartyData = counterpartyBlock?.data as any;
    
    const channelUrl = generateChannelLink(
      primaryChannel,
      estimateUrl,
      message,
      counterpartyData?.phone,
      counterpartyData?.email
    );
    
    window.open(channelUrl, '_blank');
  };

  const handleSave = () => {
    const data: CommunicationBlockData = {
      clientPortalEnabled,
      allowLineItemComments,
      allowNegotiation,
      readReceipts,
      signMethod,
      primaryChannel,
      messageTemplates,
      paymentLink: paymentLink.trim() || undefined,
      threadId: blockData?.threadId,
    };
    
    onSave(data);
  };

  const generatePreviewLink = () => {
    return `${window.location.origin}/public/estimate/${estimate.id}`;
  };

  const recommendations = getCommunicationRecommendations(
    clientPortalEnabled,
    allowNegotiation,
    primaryChannel
  );

  return (
    <Box>
      <Stack spacing={3}>
        <Alert severity="info" icon={<PersonIcon />}>
          Настройте параметры взаимодействия с клиентом. Портал позволяет клиенту просматривать, 
          комментировать и согласовывать смету онлайн.
        </Alert>

        {/* Портал клиента */}
        <Card variant="outlined">
          <CardHeader
            avatar={<NotificationIcon color="primary" />}
            title="Портал клиента"
            subheader="Онлайн доступ для клиента к смете"
            action={
              <Switch
                checked={clientPortalEnabled}
                onChange={(e) => setClientPortalEnabled(e.target.checked)}
                color="primary"
              />
            }
          />
          
          {clientPortalEnabled && (
            <CardContent>
              <Stack spacing={2}>
                <Alert severity="success" variant="outlined">
                  🔗 Публичная ссылка: {generatePreviewLink()}
                  <Button 
                    size="small" 
                    onClick={() => navigator.clipboard.writeText(generatePreviewLink())}
                    sx={{ ml: 1 }}
                  >
                    Копировать
                  </Button>
                </Alert>
                
                <Stack spacing={2} pl={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={allowLineItemComments}
                        onChange={(e) => setAllowLineItemComments(e.target.checked)}
                        size="small"
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <CommentIcon fontSize="small" />
                        Комментарии к позициям
                      </Box>
                    }
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={allowNegotiation}
                        onChange={(e) => setAllowNegotiation(e.target.checked)}
                        size="small"
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <HandshakeIcon fontSize="small" />
                        Согласование изменений
                      </Box>
                    }
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={readReceipts}
                        onChange={(e) => setReadReceipts(e.target.checked)}
                        size="small"
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <VisibilityIcon fontSize="small" />
                        Отслеживание просмотров
                      </Box>
                    }
                  />
                </Stack>
              </Stack>
            </CardContent>
          )}
        </Card>

        {/* Каналы связи */}
        <Card variant="outlined">
          <CardHeader
            avatar={<SendIcon color="primary" />}
            title="Каналы связи"
            subheader="Как отправить смету клиенту"
          />
          <CardContent>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Основной канал связи</InputLabel>
              <Select
                value={primaryChannel}
                onChange={(e) => setPrimaryChannel(e.target.value as CommunicationChannel)}
                label="Основной канал связи"
                renderValue={(value) => (
                  <Box display="flex" alignItems="center" gap={1}>
                    {getChannelIcon(value)}
                    {value === 'email' ? 'Email' : 
                     value === 'link' ? 'Прямая ссылка' :
                     value === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                  </Box>
                )}
              >
                <MenuItem value="email">
                  <Box display="flex" alignItems="center" gap={1}>
                    <EmailIcon fontSize="small" />
                    Email
                  </Box>
                </MenuItem>
                <MenuItem value="link">
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinkIcon fontSize="small" />
                    Прямая ссылка
                  </Box>
                </MenuItem>
                <MenuItem value="whatsapp">
                  <Box display="flex" alignItems="center" gap={1}>
                    <WhatsAppIcon fontSize="small" />
                    WhatsApp
                  </Box>
                </MenuItem>
                <MenuItem value="sms">
                  <Box display="flex" alignItems="center" gap={1}>
                    <SmsIcon fontSize="small" />
                    SMS
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            
            {/* Быстрая отправка */}
            <Button
              variant="outlined"
              fullWidth
              startIcon={<SendIcon />}
              onClick={sendToChannel}
              disabled={!clientPortalEnabled}
            >
              Отправить через {primaryChannel === 'email' ? 'Email' : 
                               primaryChannel === 'link' ? 'ссылку' :
                               primaryChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
            </Button>
          </CardContent>
        </Card>

        {/* Подписание */}
        <Card variant="outlined">
          <CardHeader
            avatar={<SecurityIcon color="primary" />}
            title="Подписание"
            subheader="Как клиент подтвердит согласие"
          />
          <CardContent>
            <FormControl fullWidth>
              <InputLabel>Метод подписания</InputLabel>
              <Select
                value={signMethod}
                onChange={(e) => setSignMethod(e.target.value as SignMethod)}
                label="Метод подписания"
              >
                <MenuItem value="e-sign">
                  <Box display="flex" alignItems="center" gap={1}>
                    <SecurityIcon fontSize="small" />
                    Электронная подпись
                  </Box>
                </MenuItem>
                <MenuItem value="wet-sign">
                  <Box display="flex" alignItems="center" gap={1}>
                    <EditIcon fontSize="small" />
                    Физическая подпись
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* Оплата */}
        <Card variant="outlined">
          <CardHeader
            avatar={<PaymentIcon color="primary" />}
            title="Оплата"
            subheader="Ссылка для онлайн оплаты (опционально)"
          />
          <CardContent>
            <TextField
              fullWidth
              label="Ссылка для оплаты"
              placeholder="https://payments.example.com/..."
              value={paymentLink}
              onChange={(e) => handlePaymentLinkChange(e.target.value)}
              helperText={paymentLinkError || "Stripe, PayPal, или другая платежная система"}
              error={!!paymentLinkError}
            />
          </CardContent>
        </Card>

        {/* Шаблоны сообщений */}
        <Card variant="outlined">
          <CardHeader
            avatar={<CommentIcon color="primary" />}
            title="Шаблоны сообщений"
            subheader="Готовые тексты для отправки клиенту"
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setTemplateDialogOpen(true)}
                  size="small"
                >
                  Создать
                </Button>
                {messageTemplates.length === 0 && (
                  <Button
                    variant="outlined"
                    onClick={addDefaultTemplates}
                    size="small"
                  >
                    Добавить готовые
                  </Button>
                )}
              </Stack>
            }
          />
          <CardContent>
            {messageTemplates.length === 0 ? (
              <Box textAlign="center" py={2}>
                <Typography color="text.secondary" variant="body2" gutterBottom>
                  Нет сохраненных шаблонов
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addDefaultTemplates}
                  size="small"
                >
                  Добавить стандартные шаблоны
                </Button>
              </Box>
            ) : (
              <List dense>
                {messageTemplates.map((template, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <Stack direction="row" spacing={1}>
                        <IconButton 
                          edge="end" 
                          aria-label="copy"
                          onClick={() => navigator.clipboard.writeText(template)}
                          size="small"
                          title="Скопировать"
                        >
                          <ContentCopyIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleRemoveTemplate(index)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    }
                  >
                    <ListItemIcon>
                      <CommentIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={template.substring(0, 50) + (template.length > 50 ? '...' : '')}
                      secondary={`${template.length} символов`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        {/* Рекомендации */}
        {showRecommendations && recommendations.length > 0 && (
          <Card variant="outlined" sx={{ bgcolor: 'info.50', borderColor: 'info.main' }}>
            <CardHeader
              avatar={<NotificationIcon color="info" />}
              title="Рекомендации"
              subheader="Советы по улучшению коммуникации"
              action={
                <IconButton onClick={() => setShowRecommendations(false)} size="small">
                  <DeleteIcon />
                </IconButton>
              }
            />
            <CardContent>
              <List dense>
                {recommendations.map((recommendation, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={recommendation}
                      sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem' } }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Итого активных функций */}
        <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Активные функции коммуникации:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {clientPortalEnabled && (
                <Chip label="Портал клиента" size="small" color="primary" />
              )}
              {allowLineItemComments && (
                <Chip label="Комментарии" size="small" color="info" />
              )}
              {allowNegotiation && (
                <Chip label="Согласование" size="small" color="warning" />
              )}
              {readReceipts && (
                <Chip label="Отслеживание" size="small" color="secondary" />
              )}
              {paymentLink && (
                <Chip label="Онлайн оплата" size="small" color="success" />
              )}
              <Chip label={getChannelIcon(primaryChannel)} size="small" variant="outlined" />
              <Chip label={signMethod === 'e-sign' ? 'E-подпись' : 'Подпись'} size="small" variant="outlined" />
            </Stack>
          </CardContent>
        </Card>

        {/* Кнопка сохранения */}
        <Button 
          variant="contained" 
          size="large"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {saving ? 'Сохранение...' : 'Сохранить настройки коммуникации'}
        </Button>
      </Stack>

      {/* Диалог добавления шаблона */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить шаблон сообщения</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Текст сообщения"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={newTemplate}
            onChange={(e) => setNewTemplate(e.target.value)}
            placeholder="Добрый день! Высылаю смету на рассмотрение..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleAddTemplate} variant="contained" disabled={!newTemplate.trim()}>
            Добавить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommunicationBlock;

/**
 * Блок "Коммуникация" для конструктора смет
 */

import React, { useState } from 'react';
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
} from '@mui/material';
import { 
  Estimate, 
  BlockState, 
  CommunicationBlockData,
  SignMethod,
  CommunicationChannel 
} from '../../../types/estimate.types';

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
  
  const [clientPortalEnabled, setClientPortalEnabled] = useState<boolean>(blockData?.clientPortalEnabled || false);
  const [allowLineItemComments, setAllowLineItemComments] = useState<boolean>(blockData?.allowLineItemComments || false);
  const [allowNegotiation, setAllowNegotiation] = useState<boolean>(blockData?.allowNegotiation || false);
  const [readReceipts, setReadReceipts] = useState<boolean>(blockData?.readReceipts !== undefined ? blockData.readReceipts : true);
  const [signMethod, setSignMethod] = useState<SignMethod>(blockData?.signMethod || 'e-sign');
  const [primaryChannel, setPrimaryChannel] = useState<CommunicationChannel>(blockData?.primaryChannel || 'email');

  const handleSave = () => {
    const data: CommunicationBlockData = {
      clientPortalEnabled,
      allowLineItemComments,
      allowNegotiation,
      readReceipts,
      signMethod,
      primaryChannel,
      messageTemplates: [],
    };
    
    onSave(data);
  };

  return (
    <Box>
      <Stack spacing={3}>
        <Alert severity="info">
          Настройте параметры взаимодействия с клиентом и доступ к порталу для просмотра и согласования сметы.
        </Alert>
        
        {/* Client portal */}
        <FormControlLabel
          control={
            <Switch
              checked={clientPortalEnabled}
              onChange={(e) => setClientPortalEnabled(e.target.checked)}
            />
          }
          label="Включить портал клиента"
        />
        
        {clientPortalEnabled && (
          <Box pl={4}>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={allowLineItemComments}
                    onChange={(e) => setAllowLineItemComments(e.target.checked)}
                    size="small"
                  />
                }
                label="Разрешить комментарии к позициям"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={allowNegotiation}
                    onChange={(e) => setAllowNegotiation(e.target.checked)}
                    size="small"
                  />
                }
                label="Разрешить предложение изменений"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={readReceipts}
                    onChange={(e) => setReadReceipts(e.target.checked)}
                    size="small"
                  />
                }
                label="Отслеживать просмотры"
              />
            </Stack>
          </Box>
        )}
        
        {/* Primary channel */}
        <FormControl fullWidth>
          <InputLabel>Основной канал связи</InputLabel>
          <Select
            value={primaryChannel}
            onChange={(e) => setPrimaryChannel(e.target.value as CommunicationChannel)}
            label="Основной канал связи"
          >
            <MenuItem value="email">Email</MenuItem>
            <MenuItem value="link">Ссылка</MenuItem>
            <MenuItem value="whatsapp">WhatsApp</MenuItem>
            <MenuItem value="sms">SMS</MenuItem>
          </Select>
        </FormControl>
        
        {/* Sign method */}
        <FormControl fullWidth>
          <InputLabel>Метод подписания</InputLabel>
          <Select
            value={signMethod}
            onChange={(e) => setSignMethod(e.target.value as SignMethod)}
            label="Метод подписания"
          >
            <MenuItem value="e-sign">Электронная подпись</MenuItem>
            <MenuItem value="wet-sign">Физическая подпись</MenuItem>
          </Select>
        </FormControl>
        
        {/* Features summary */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Активные функции:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {clientPortalEnabled && (
              <Chip label="Портал клиента" size="small" color="primary" />
            )}
            {allowLineItemComments && (
              <Chip label="Комментарии" size="small" />
            )}
            {allowNegotiation && (
              <Chip label="Согласование" size="small" />
            )}
            {readReceipts && (
              <Chip label="Отслеживание" size="small" />
            )}
            <Chip label={primaryChannel} size="small" variant="outlined" />
            <Chip label={signMethod === 'e-sign' ? 'E-подпись' : 'Подпись'} size="small" variant="outlined" />
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

export default CommunicationBlock;

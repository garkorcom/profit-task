/**
 * Блок "Контрагент" для конструктора смет
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  Button,
  Stack,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,

  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Add as AddIcon,

} from '@mui/icons-material';

import { useAuth } from '../../../auth/AuthContext';
import { 
  Estimate, 
  BlockState, 
  CounterpartyBlockData,
  PaymentTerms 
} from '../../../types/estimate.types';
import { 
  subscribeToCounterparties,
  createCounterparty,

} from '../../../api/counterpartyApi';
import { preventDuplicateCreation } from '../../../utils/cleanDuplicateCounterparties';
import { 
  Counterparty,

} from '../../../types/counterparty.types';

interface CounterpartyBlockProps {
  estimate: Estimate;
  block: BlockState;
  onSave: (data: CounterpartyBlockData) => void;
  saving: boolean;
}

const CounterpartyBlock: React.FC<CounterpartyBlockProps> = ({
  estimate,
  block,
  onSave,
  saving,
}) => {
  const { currentUser } = useAuth();
  const blockData = (block.data || {}) as CounterpartyBlockData;
  
  // State
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [selectedCounterparty, setSelectedCounterparty] = useState<Counterparty | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>(
    blockData?.paymentTerms || 'Net30'
  );
  const [createDialog, setCreateDialog] = useState(false);
  const [newCounterparty, setNewCounterparty] = useState({
    fullName: '',
    shortName: '',
    taxId: '',
    email: '',
    phone: '',
    address: '',
  });
  
  // Load counterparties
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = subscribeToCounterparties(
      currentUser.uid,
      (data) => {
        // Filter only customer counterparties
        const customers = data.filter(c => c.roles?.includes('customer'));
        setCounterparties(customers);
        
        // Set selected if exists
        if (blockData?.counterpartyId) {
          const existing = customers.find(c => c.id === blockData.counterpartyId);
          if (existing) {
            setSelectedCounterparty(existing);
          }
        }
      },
      { roles: ['customer'] }
    );
    
    return unsubscribe;
  }, [currentUser, blockData?.counterpartyId]);
  
  // Handlers
  const handleCounterpartySelect = (counterparty: Counterparty | null) => {
    setSelectedCounterparty(counterparty);
  };
  
  const handleCreateCounterparty = async () => {
    if (!currentUser || !newCounterparty.fullName) return;
    
    try {
      // Проверяем на дубликаты
      const duplicateCheck = await preventDuplicateCreation(
        currentUser.uid,
        newCounterparty.fullName,
        newCounterparty.taxId
      );
      
      if (duplicateCheck.isDuplicate) {
        const existing = duplicateCheck.existing;
        const confirmCreate = window.confirm(
          `⚠️ Найден похожий контрагент:\n` +
          `${existing.legalName}\n` +
          `${existing.taxId ? `ИНН: ${existing.taxId}\n` : ''}` +
          `\nВсё равно создать новый?`
        );
        
        if (!confirmCreate) {
          // Можно сразу выбрать существующего
          setSelectedCounterparty(existing);
          setCreateDialog(false);
          return;
        }
      }
      
      await createCounterparty(currentUser.uid, {
        legalName: newCounterparty.fullName,
        displayName: newCounterparty.shortName || newCounterparty.fullName,
        roles: ['customer'],
        taxId: newCounterparty.taxId,
        primaryContact: {
          firstName: 'Основной',
          lastName: 'контакт',
          role: 'primary',
          phone: newCounterparty.phone || undefined,
          email: newCounterparty.email || undefined,
          isPrimary: true,
          isActive: true,
        },
        primaryAddress: {
          type: 'billing',
          line1: newCounterparty.address || '',
          city: '',
          country: 'RU',
          isPrimary: true,
        },
      });
      
      setCreateDialog(false);
      setNewCounterparty({
        fullName: '',
        shortName: '',
        taxId: '',
        email: '',
        phone: '',
        address: '',
      });
    } catch (error) {
      console.error('Error creating counterparty:', error);
    }
  };
  
  const handleSave = () => {
    if (!selectedCounterparty) {
      alert('Выберите контрагента');
      return;
    }
    
    const data: CounterpartyBlockData = {
      counterpartyId: selectedCounterparty.id,
      primaryContactId: selectedCounterparty.contacts?.[0]?.id,
      billingAddressId: selectedCounterparty.addresses?.find(a => a.type === 'billing')?.id,
      taxProfileId: selectedCounterparty.financial?.taxProfile,
      paymentTerms: selectedCounterparty.financial?.paymentTerms || paymentTerms,
    };
    
    onSave(data);
  };
  
  const handleLoadFromProject = () => {
    // If project block is filled, load contractor from project
    const projectBlock = estimate.blocks.find(b => b.key === 'project');
    if (projectBlock?.status === 'complete') {
      // TODO: Load contractor from project
      alert('Функция в разработке');
    } else {
      alert('Сначала заполните блок "Проект"');
    }
  };
  
  return (
    <Box>
      <Stack spacing={3}>
        {/* Quick actions */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<BusinessIcon />}
            onClick={handleLoadFromProject}
          >
            Подтянуть из проекта
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
          >
            Создать контрагента
          </Button>
        </Stack>
        
        {/* Counterparty selection */}
        <Autocomplete
          value={selectedCounterparty}
          onChange={(e, value) => handleCounterpartySelect(value)}
          options={counterparties}
          getOptionLabel={(option) => option.displayName || option.legalName || ''}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Контрагент (клиент)"
              placeholder="Начните вводить название..."
              required
              InputProps={{
                ...params.InputProps,
                startAdornment: <PersonIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          )}
          renderOption={(props, option) => {
            const { key, ...optionProps } = props as any;
            return (
            <Box component="li" key={key} {...optionProps}>
              <Stack>
                <Typography variant="body1">{option.displayName || option.legalName}</Typography>
                {option.contacts?.[0]?.email && (
                  <Typography variant="caption" color="text.secondary">
                    {option.contacts[0].email}
                  </Typography>
                )}
              </Stack>
            </Box>
            );
          }}
        />
        
        {/* Selected counterparty details */}
        {selectedCounterparty && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Информация о контрагенте
              </Typography>
              
              <Stack spacing={1} mt={2}>
                {selectedCounterparty.contacts?.[0]?.email && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <EmailIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {selectedCounterparty.contacts[0].email}
                    </Typography>
                  </Stack>
                )}
                
                {selectedCounterparty.contacts?.[0]?.phone && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {selectedCounterparty.contacts[0].phone}
                    </Typography>
                  </Stack>
                )}
                
                {selectedCounterparty.addresses?.[0] && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LocationIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {[
                        selectedCounterparty.addresses[0].line1,
                        selectedCounterparty.addresses[0].line2,
                        selectedCounterparty.addresses[0].city,
                        selectedCounterparty.addresses[0].state,
                        selectedCounterparty.addresses[0].postalCode,
                        selectedCounterparty.addresses[0].country
                      ].filter(Boolean).join(', ')}
                    </Typography>
                  </Stack>
                )}
                
                {selectedCounterparty.taxId && (
                  <Typography variant="body2">
                    ИНН: {selectedCounterparty.taxId}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
        
        {/* Payment terms */}
        <FormControl fullWidth>
          <InputLabel>Условия оплаты</InputLabel>
          <Select
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
            label="Условия оплаты"
          >
            <MenuItem value="DueOnReceipt">По получении</MenuItem>
            <MenuItem value="Net7">7 дней</MenuItem>
            <MenuItem value="Net15">15 дней</MenuItem>
            <MenuItem value="Net30">30 дней</MenuItem>
            <MenuItem value="Custom">Другие условия</MenuItem>
          </Select>
        </FormControl>
        
        {/* Info alert */}
        {block.status === 'empty' && (
          <Alert severity="info">
            Выберите клиента для сметы. От выбранного контрагента будут подтянуты 
            налоговые настройки и условия оплаты.
          </Alert>
        )}
        
        {/* Save button */}
        <Box>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!selectedCounterparty || saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить блок'}
          </Button>
        </Box>
      </Stack>
      
      {/* Create counterparty dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать контрагента</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Полное наименование"
              value={newCounterparty.fullName}
              onChange={(e) => setNewCounterparty({ ...newCounterparty, fullName: e.target.value })}
              required
              fullWidth
            />
            
            <TextField
              label="Краткое наименование"
              value={newCounterparty.shortName}
              onChange={(e) => setNewCounterparty({ ...newCounterparty, shortName: e.target.value })}
              fullWidth
            />
            
            <TextField
              label="ИНН / Tax ID"
              value={newCounterparty.taxId}
              onChange={(e) => setNewCounterparty({ ...newCounterparty, taxId: e.target.value })}
              fullWidth
            />
            
            <TextField
              label="Email"
              type="email"
              value={newCounterparty.email}
              onChange={(e) => setNewCounterparty({ ...newCounterparty, email: e.target.value })}
              fullWidth
            />
            
            <TextField
              label="Телефон"
              value={newCounterparty.phone}
              onChange={(e) => setNewCounterparty({ ...newCounterparty, phone: e.target.value })}
              fullWidth
            />
            
            <TextField
              label="Адрес"
              value={newCounterparty.address}
              onChange={(e) => setNewCounterparty({ ...newCounterparty, address: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleCreateCounterparty}
            variant="contained"
            disabled={!newCounterparty.fullName}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CounterpartyBlock;

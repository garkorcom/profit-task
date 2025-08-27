import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Notification from '../components/common/Notification';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  getContractorsStream,
  addContractor,
  updateContractor,
  Contractor
} from '../api/contractorApi';
import { getTasksStream, Task } from '../api/taskApi';
import StartWorkFromContractorDialog from '../components/StartWorkFromContractorDialog'; // Импортируем новый компонент
import { Estimate, getEstimatesStream } from '../api/estimateApi';

const ContractorsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorIdToTaskCount, setContractorIdToTaskCount] = useState<Record<string, number>>({});
  const [whatToBuyByContractor, setWhatToBuyByContractor] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'both' as 'supplier' | 'customer' | 'both',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    inn: '',
    kpp: '',
    bankDetails: {
      bankName: '',
      accountNumber: '',
      bik: '',
      correspondentAccount: ''
    },
    notes: ''
  });
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'supplier' | 'customer' | 'both'>('all');
  const [confirm, setConfirm] = useState<{ open: boolean; contractorId?: string }>({ open: false });
  const [startWorkContractor, setStartWorkContractor] = useState<Contractor | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (!currentUser) return;

    // Загружаем все необходимые данные
    const unsubContractors = getContractorsStream(currentUser.uid, setContractors);
    const unsubTasks = getTasksStream(currentUser.uid, setTasks);
    const unsubEstimates = getEstimatesStream(currentUser.uid, '', setEstimates);
    
    setLoading(false);
    return () => {
      unsubContractors();
      unsubTasks();
      unsubEstimates();
    };
  }, [currentUser]);

  const handleOpenDialog = (contractor?: Contractor) => {
    if (contractor) {
      setEditingContractor(contractor);
      setFormData({
        name: contractor.name,
        type: contractor.type,
        contactPerson: contractor.contactPerson || '',
        phone: contractor.phone || '',
        email: contractor.email || '',
        address: contractor.address || '',
        inn: contractor.inn || '',
        kpp: contractor.kpp || '',
        bankDetails: {
          bankName: contractor.bankDetails?.bankName || '',
          accountNumber: contractor.bankDetails?.accountNumber || '',
          bik: contractor.bankDetails?.bik || '',
          correspondentAccount: contractor.bankDetails?.correspondentAccount || ''
        },
        notes: contractor.notes || ''
      });
    } else {
      setEditingContractor(null);
      setFormData({
        name: '',
        type: 'both',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        inn: '',
        kpp: '',
        bankDetails: {
          bankName: '',
          accountNumber: '',
          bik: '',
          correspondentAccount: ''
        },
        notes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingContractor(null);
    setFormData({
      name: '',
      type: 'both',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      inn: '',
      kpp: '',
      bankDetails: {
        bankName: '',
        accountNumber: '',
        bik: '',
        correspondentAccount: ''
      },
      notes: ''
    });
  };

  const handleSubmit = async () => {
    if (!currentUser || !formData.name.trim()) return;

    setSubmitting(true);
    try {
      if (editingContractor) {
        await updateContractor(currentUser.uid, editingContractor.id, formData);
        setNotification({ open: true, message: 'Контрагент успешно обновлен!', severity: 'success' });
      } else {
        await addContractor(currentUser.uid, formData);
        setNotification({ open: true, message: 'Контрагент успешно создан!', severity: 'success' });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Ошибка при сохранении контрагента:', error);
      setNotification({ open: true, message: 'Произошла ошибка при сохранении контрагента', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const requestDelete = (contractorId: string) => {
    setConfirm({ open: true, contractorId });
  };

  const contractorHasLinks = (contractorId: string) => {
    const hasTasks = tasks.some(t => t.contractorId === contractorId);
    const hasEstimates = estimates.some(e => e.contractorId === contractorId);
    return hasTasks || hasEstimates;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'supplier': return 'primary';
      case 'customer': return 'secondary';
      case 'both': return 'success';
      default: return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'supplier': return 'Поставщик';
      case 'customer': return 'Клиент';
      case 'both': return 'Поставщик и клиент';
      default: return type;
    }
  };

  const filteredContractors = contractors.filter(contractor => {
    const s = debouncedSearch.toLowerCase();
    const matchesSearch = contractor.name.toLowerCase().includes(s) ||
                         contractor.contactPerson?.toLowerCase().includes(s) ||
                         contractor.phone?.includes(debouncedSearch) ||
                         contractor.email?.toLowerCase().includes(s);
    const matchesType = filterType === 'all' || contractor.type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) return <LoadingSpinner />;
  
  return (
    <Box>
      <Box mb={2}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/references')} sx={{ mb: 2 }}>
          К справочникам
        </Button>
      </Box>
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Контрагенты</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Добавить контрагента
        </Button>
      </Box>

      <Box mb={3}>
        <Box display="flex" flexWrap="wrap" gap={2}>
          <Box flex="1" minWidth="300px">
            <TextField
              fullWidth
              placeholder="Поиск по названию, контактному лицу, телефону или email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon /></InputAdornment>
                ),
              }}
            />
          </Box>
          <Box minWidth="200px">
            <FormControl fullWidth>
              <InputLabel>Фильтр по типу</InputLabel>
              <Select value={filterType} label="Фильтр по типу" onChange={(e) => setFilterType(e.target.value as any)}>
                <MenuItem value="all">Все типы</MenuItem>
                <MenuItem value="supplier">Поставщики</MenuItem>
                <MenuItem value="customer">Клиенты</MenuItem>
                <MenuItem value="both">Поставщики и клиенты</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Box>
      
      {filteredContractors.length > 0 ? (
        <Box display="flex" flexWrap="wrap" gap={2}>
          {filteredContractors.map(contractor => {
            const taskCount = contractorIdToTaskCount[contractor.id] || 0;
            const wtbItems = (whatToBuyByContractor[contractor.id] || []).slice(0, 3);
            const extra = Math.max(0, (whatToBuyByContractor[contractor.id]?.length || 0) - wtbItems.length);
            return (
            <Box key={contractor.id} flex="1" minWidth="300px" maxWidth="400px">
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom>
                        <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        {contractor.name}
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        <Chip label={getTypeLabel(contractor.type)} color={getTypeColor(contractor.type)} size="small" sx={{ mb: 1 }} />
                        {taskCount > 0 ? (
                          <Chip label={`Задач: ${taskCount}`} color="info" size="small" sx={{ mb: 1, cursor: 'pointer' }} onClick={() => navigate(`/contractors/${contractor.id}/tasks`)} />
                        ) : (
                          <Button 
                            size="small" 
                            variant="outlined" 
                            onClick={() => navigate('/tasks', { state: { newForContractorId: contractor.id } })}
                          >
                            Добавить задачу
                          </Button>
                        )}
                        <Button 
                          size="small" 
                          variant="contained" 
                          onClick={() => setStartWorkContractor(contractor)}
                          sx={{ ml: 1 }}
                        >
                          Начать работу
                        </Button>
                      </Box>
                    </Box>
                    <Box>
                      <IconButton aria-label="edit-contractor" onClick={() => handleOpenDialog(contractor)} size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        aria-label="delete-contractor" 
                        onClick={() => requestDelete(contractor.id)} 
                        size="small" 
                        color="error"
                        disabled={contractorHasLinks(contractor.id)} // Блокируем кнопку
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      {contractorHasLinks(contractor.id) && (
                        <Typography variant="caption" color="error">
                          Есть связанные задачи/сметы
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {wtbItems.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>Что купить</Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {wtbItems.map((it, idx) => (
                          <Chip key={idx} label={it} size="small" />
                        ))}
                        {extra > 0 && (
                          <Chip label={`+${extra}`} size="small" onClick={() => navigate(`/contractors/${contractor.id}/tasks`)} sx={{ cursor: 'pointer' }} />
                        )}
                      </Box>
                    </Box>
                  )}

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Контактная информация</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {contractor.contactPerson && (
                        <Box display="flex" alignItems="center" mb={1}>
                          <PersonIcon sx={{ mr: 1, fontSize: 'small' }} />
                          <Typography variant="body2">{contractor.contactPerson}</Typography>
                        </Box>
                      )}
                      {contractor.phone && (
                        <Box display="flex" alignItems="center" mb={1}>
                          <PhoneIcon sx={{ mr: 1, fontSize: 'small' }} />
                          <Typography variant="body2">{contractor.phone}</Typography>
                        </Box>
                      )}
                      {contractor.email && (
                        <Box display="flex" alignItems="center" mb={1}>
                          <EmailIcon sx={{ mr: 1, fontSize: 'small' }} />
                          <Typography variant="body2">{contractor.email}</Typography>
                        </Box>
                      )}
                      {contractor.address && (
                        <Box display="flex" alignItems="center" mb={1}>
                          <LocationIcon sx={{ mr: 1, fontSize: 'small' }} />
                          <Typography variant="body2">{contractor.address}</Typography>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>

                  {(contractor.inn || contractor.kpp) && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2">Реквизиты</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {contractor.inn && (<Typography variant="body2" mb={1}><strong>ИНН:</strong> {contractor.inn}</Typography>)}
                        {contractor.kpp && (<Typography variant="body2" mb={1}><strong>КПП:</strong> {contractor.kpp}</Typography>)}
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {contractor.bankDetails && Object.values(contractor.bankDetails).some(val => val) && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2">Банковские реквизиты</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {contractor.bankDetails.bankName && (<Typography variant="body2" mb={1}><strong>Банк:</strong> {contractor.bankDetails.bankName}</Typography>)}
                        {contractor.bankDetails.accountNumber && (<Typography variant="body2" mb={1}><strong>Счет:</strong> {contractor.bankDetails.accountNumber}</Typography>)}
                        {contractor.bankDetails.bik && (<Typography variant="body2" mb={1}><strong>БИК:</strong> {contractor.bankDetails.bik}</Typography>)}
                        {contractor.bankDetails.correspondentAccount && (<Typography variant="body2" mb={1}><strong>Корр. счет:</strong> {contractor.bankDetails.correspondentAccount}</Typography>)}
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {contractor.notes && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle2">Примечания</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2">{contractor.notes}</Typography>
                      </AccordionDetails>
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </Box>
            );
          })}
        </Box>
      ) : (
        <Card>
          <CardContent>
            <Typography align="center" color="text.secondary">
              {contractors.length === 0 
                ? 'Контрагентов пока нет. Добавьте первого контрагента!' 
                : 'По вашему запросу ничего не найдено. Попробуйте изменить параметры поиска.'
              }
            </Typography>
          </CardContent>
        </Card>
      )}

      <StartWorkFromContractorDialog
        open={!!startWorkContractor}
        onClose={() => setStartWorkContractor(null)}
        contractor={startWorkContractor}
      />

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingContractor ? 'Редактировать' : 'Новый'} контрагент</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
              <Box flex="1" minWidth="250px">
                <TextField autoFocus label="Название организации" fullWidth variant="outlined" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </Box>
              <Box flex="1" minWidth="250px">
                <FormControl fullWidth>
                  <InputLabel>Тип контрагента</InputLabel>
                  <Select value={formData.type} label="Тип контрагента" onChange={(e) => setFormData({...formData, type: e.target.value as any})}>
                    <MenuItem value="supplier">Поставщик</MenuItem>
                    <MenuItem value="customer">Клиент</MenuItem>
                    <MenuItem value="both">Поставщик и клиент</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Контактная информация</Typography>
            
            <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
              <Box flex="1" minWidth="250px"><TextField label="Контактное лицо" fullWidth variant="outlined" value={formData.contactPerson} onChange={(e) => setFormData({...formData, contactPerson: e.target.value})} /></Box>
              <Box flex="1" minWidth="250px"><TextField label="Телефон" fullWidth variant="outlined" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></Box>
            </Box>
            
            <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
              <Box flex="1" minWidth="250px"><TextField label="Email" fullWidth variant="outlined" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></Box>
              <Box flex="1" minWidth="250px"><TextField label="Адрес" fullWidth variant="outlined" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} /></Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Реквизиты</Typography>
            
            <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
              <Box flex="1" minWidth="250px"><TextField label="ИНН" fullWidth variant="outlined" value={formData.inn} onChange={(e) => setFormData({...formData, inn: e.target.value})} /></Box>
              <Box flex="1" minWidth="250px"><TextField label="КПП" fullWidth variant="outlined" value={formData.kpp} onChange={(e) => setFormData({...formData, kpp: e.target.value})} /></Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Банковские реквизиты</Typography>
            
            <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
              <Box flex="1" minWidth="250px"><TextField label="Название банка" fullWidth variant="outlined" value={formData.bankDetails.bankName} onChange={(e) => setFormData({ ...formData, bankDetails: {...formData.bankDetails, bankName: e.target.value} })} /></Box>
              <Box flex="1" minWidth="250px"><TextField label="Номер счета" fullWidth variant="outlined" value={formData.bankDetails.accountNumber} onChange={(e) => setFormData({ ...formData, bankDetails: {...formData.bankDetails, accountNumber: e.target.value} })} /></Box>
            </Box>
            
            <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
              <Box flex="1" minWidth="250px"><TextField label="БИК" fullWidth variant="outlined" value={formData.bankDetails.bik} onChange={(e) => setFormData({ ...formData, bankDetails: {...formData.bankDetails, bik: e.target.value} })} /></Box>
              <Box flex="1" minWidth="250px"><TextField label="Корр. счет" fullWidth variant="outlined" value={formData.bankDetails.correspondentAccount} onChange={(e) => setFormData({ ...formData, bankDetails: {...formData.bankDetails, correspondentAccount: e.target.value} })} /></Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>Примечания</Typography>
            
            <Box><TextField label="Примечания" fullWidth variant="outlined" multiline rows={3} value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} /></Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>Отмена</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.name.trim() || submitting}>{submitting ? 'Сохранение...' : (editingContractor ? 'Сохранить' : 'Создать')}</Button>
        </DialogActions>
      </Dialog>
      
      <ConfirmDialog
        open={confirm.open}
        message="Удалить этого контрагента?"
        confirmText="Удалить"
        onConfirm={() => {/* handled in parent */}}
        onClose={() => setConfirm({ open: false })}
      />

      <Notification open={notification.open} message={notification.message} severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })} />
    </Box>
  );
};

export default ContractorsPage;

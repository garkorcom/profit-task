/**
 * Страница управления контрагентами
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  CardActions,
  Chip,
  Avatar,
  IconButton,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  Badge,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Fab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Engineering as EngineeringIcon,
  Handshake as PartnerIcon,
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Description as DocumentIcon,
  Assessment as AssessmentIcon,
  Print as PrintIcon,
  Merge as MergeIcon,
  Upload as ImportIcon,
  Download as ExportIcon,
  Star,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  AttachMoney as MoneyIcon,
  Assignment as TaskIcon,
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import {
  Counterparty,
  CounterpartyStatus,
  CounterpartyRole,
  CounterpartyFilters,
  CounterpartyPriority,
  CreateCounterpartyDto,
} from '../../types/counterparty.types';
import {
  getCounterparties,
  createCounterparty,
  updateCounterparty,
  archiveCounterparty,
  changeCounterpartyStatus,
  checkExpiringDocuments,
  subscribeToCounterparties,
  getCounterpartyKPI,
} from '../../api/counterpartyApi';
import { 
  findDuplicateCounterparties, 
  deleteOldDuplicateCounterparties,
  preventDuplicateCreation
} from '../../utils/cleanDuplicateCounterparties';
import {
  migrateContractorsToCounterparties,
  checkContractorsForMigration
} from '../../utils/migrateContractorsToCounterparties';

// Конфигурация табов
const TABS = [
  { value: 'all', label: 'Все', icon: <BusinessIcon /> },
  { value: 'customer', label: 'Клиенты', icon: <PersonIcon />, role: 'customer' as CounterpartyRole },
  { value: 'vendor', label: 'Поставщики', icon: <BusinessIcon />, role: 'vendor' as CounterpartyRole },
  { value: 'subcontractor', label: 'Субподрядчики', icon: <EngineeringIcon />, role: 'subcontractor' as CounterpartyRole },
  { value: 'partner', label: 'Партнеры', icon: <PartnerIcon />, role: 'partner' as CounterpartyRole },
];

const CounterpartiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CounterpartyFilters>({});
  const [selectedCounterparty, setSelectedCounterparty] = useState<Counterparty | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [expiringDocsCount, setExpiringDocsCount] = useState(0);
  const [kpi, setKpi] = useState<any>(null);
  
  // New counterparty form
  const [newCounterparty, setNewCounterparty] = useState<CreateCounterpartyDto>({
    legalName: '',
    displayName: '',
    roles: [],
    taxId: '',
  });
  
  // Load counterparties
  useEffect(() => {
    if (!currentUser) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Load counterparties
        const data = await getCounterparties(currentUser.uid, filters);
        setCounterparties(data);
        
        // Check expiring documents
        const expiring = await checkExpiringDocuments(currentUser.uid);
        setExpiringDocsCount(expiring.length);
        
        // Load KPI
        const kpiData = await getCounterpartyKPI(currentUser.uid);
        setKpi(kpiData);
      } catch (error) {
        console.error('Error loading counterparties:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentUser, filters]);
  
  // Subscribe to real-time updates
  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribe = subscribeToCounterparties(
      currentUser.uid,
      (updatedCounterparties) => {
        setCounterparties(updatedCounterparties);
      },
      filters
    );
    
    return unsubscribe;
  }, [currentUser, filters]);
  
  // Filter by tab
  const filteredCounterparties = counterparties.filter(cp => {
    // Tab filter
    if (selectedTab !== 'all') {
      const tab = TABS.find(t => t.value === selectedTab);
      if (tab?.role && !cp.roles.includes(tab.role)) {
        return false;
      }
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        cp.legalName.toLowerCase().includes(query) ||
        cp.displayName.toLowerCase().includes(query) ||
        cp.taxId?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });
  
  // Handlers
  const handleCreateCounterparty = async () => {
    if (!currentUser || !newCounterparty.legalName || newCounterparty.roles.length === 0) {
      alert('Заполните название и выберите хотя бы одну роль');
      return;
    }
    
    try {
      // Проверяем на дубликаты перед созданием
      const duplicateCheck = await preventDuplicateCreation(
        currentUser.uid,
        newCounterparty.legalName,
        newCounterparty.taxId
      );
      
      if (duplicateCheck.isDuplicate) {
        const existing = duplicateCheck.existing;
        const confirmCreate = window.confirm(
          `⚠️ Найден похожий контрагент:\n` +
          `${existing.legalName}\n` +
          `${existing.taxId ? `ИНН: ${existing.taxId}\n` : ''}` +
          `Статус: ${existing.status}\n\n` +
          `Всё равно создать новый?`
        );
        
        if (!confirmCreate) {
          return;
        }
      }
      
      const counterpartyId = await createCounterparty(currentUser.uid, newCounterparty);
      setCreateDialogOpen(false);
      setNewCounterparty({
        legalName: '',
        displayName: '',
        roles: [],
        taxId: '',
      });
      
      // Navigate to the new counterparty
      navigate(`/counterparties/${counterpartyId}`);
    } catch (error) {
      console.error('Error creating counterparty:', error);
    }
  };
  
  const handleStatusChange = async (counterparty: Counterparty, newStatus: CounterpartyStatus) => {
    if (!currentUser) return;
    
    try {
      await changeCounterpartyStatus(currentUser.uid, counterparty.id, newStatus);
    } catch (error: any) {
      alert(`Ошибка изменения статуса: ${error.message}`);
    }
  };
  
  // Функции для работы с дубликатами
  const handleFindDuplicates = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const duplicateGroups = await findDuplicateCounterparties(currentUser.uid);
      
      if (duplicateGroups.length === 0) {
        alert('✅ Дубликаты не найдены');
      } else {
        let message = `⚠️ Найдено ${duplicateGroups.length} групп дубликатов:\n\n`;
        duplicateGroups.forEach((group, index) => {
          message += `${index + 1}. ${group.key} (${group.counterparties.length} записей)\n`;
          group.counterparties.slice(0, 3).forEach(c => {
            message += `   - ${c.legalName} (${c.status || 'без статуса'})\n`;
          });
          if (group.counterparties.length > 3) {
            message += `   ... и еще ${group.counterparties.length - 3}\n`;
          }
        });
        message += '\nИспользуйте "Удалить дубликаты" для очистки';
        alert(message);
      }
    } catch (error) {
      console.error('Ошибка при поиске дубликатов:', error);
      alert('Ошибка при поиске дубликатов');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteDuplicates = async () => {
    if (!currentUser) return;
    
    const confirmed = window.confirm(
      '⚠️ ВНИМАНИЕ!\n\n' +
      'Это действие удалит старые дубликаты контрагентов.\n' +
      'В каждой группе дубликатов будет оставлен только самый новый.\n\n' +
      'Это действие НЕОБРАТИМО!\n\n' +
      'Продолжить?'
    );
    
    if (!confirmed) return;
    
    try {
      setLoading(true);
      const result = await deleteOldDuplicateCounterparties(currentUser.uid, true);
      
      if (result.deleted > 0) {
        alert(`✅ Удалено ${result.deleted} дубликатов из ${result.found} найденных`);
        // Обновляем список после удаления - данные обновятся через подписку
      } else if (result.found === 0) {
        alert('✅ Дубликаты не найдены');
      } else {
        alert('❌ Не удалось удалить дубликаты');
      }
      
      if (result.errors.length > 0) {
        console.error('Ошибки при удалении:', result.errors);
      }
    } catch (error) {
      console.error('Ошибка при удалении дубликатов:', error);
      alert('Ошибка при удалении дубликатов');
    } finally {
      setLoading(false);
    }
  };
  
  // Функция миграции старых contractors
  const handleMigrateContractors = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Проверяем наличие contractors
      const check = await checkContractorsForMigration(currentUser.uid);
      
      if (check.count === 0) {
        alert('✅ Нет старых contractors для миграции');
        return;
      }
      
      const confirmed = window.confirm(
        `🔄 МИГРАЦИЯ ДАННЫХ\n\n` +
        `Найдено ${check.count} старых contractors:\n` +
        `${check.names.slice(0, 5).join('\n')}\n` +
        `${check.count > 5 ? `... и еще ${check.count - 5}\n` : ''}\n` +
        `Перенести их в новую систему counterparties?\n\n` +
        `Дубликаты будут пропущены.`
      );
      
      if (!confirmed) return;
      
      const result = await migrateContractorsToCounterparties(currentUser.uid, true);
      
      if (result.migrated > 0) {
        alert(
          `✅ МИГРАЦИЯ ЗАВЕРШЕНА\n\n` +
          `Мигрировано: ${result.migrated}\n` +
          `Пропущено (дубликаты): ${result.skipped}\n` +
          `${result.errors.length > 0 ? `Ошибки: ${result.errors.length}` : ''}`
        );
      } else if (result.skipped > 0) {
        alert(`ℹ️ Все ${result.skipped} contractors уже существуют в новой системе`);
      }
      
      if (result.errors.length > 0) {
        console.error('Ошибки миграции:', result.errors);
      }
      
    } catch (error) {
      console.error('Ошибка при миграции:', error);
      alert('❌ Ошибка при миграции contractors');
    } finally {
      setLoading(false);
    }
  };
  
  const handleArchive = async (counterparty: Counterparty) => {
    if (!currentUser) return;
    
    if (window.confirm(`Архивировать контрагента "${counterparty.displayName}"?`)) {
      await archiveCounterparty(currentUser.uid, counterparty.id);
    }
  };
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, counterparty: Counterparty) => {
    setMenuAnchor(event.currentTarget);
    setSelectedCounterparty(counterparty);
  };
  
  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedCounterparty(null);
  };
  
  const handleQuickCreate = () => {
    setCreateDialogOpen(true);
  };
  
  // Helper functions
  const getStatusColor = (status: CounterpartyStatus) => {
    switch (status) {
      case 'active': return 'success';
      case 'potential': return 'info';
      case 'new': return 'default';
      case 'on_hold': return 'warning';
      case 'archived': return 'default';
      case 'blacklisted': return 'error';
      default: return 'default';
    }
  };
  
  const getStatusLabel = (status: CounterpartyStatus) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'potential': return 'Потенциальный';
      case 'new': return 'Новый';
      case 'on_hold': return 'На паузе';
      case 'archived': return 'Архив';
      case 'blacklisted': return 'Черный список';
      default: return status;
    }
  };
  
  const getRoleIcon = (role: CounterpartyRole) => {
    switch (role) {
      case 'customer': return <PersonIcon fontSize="small" />;
      case 'vendor': return <BusinessIcon fontSize="small" />;
      case 'subcontractor': return <EngineeringIcon fontSize="small" />;
      case 'partner': return <PartnerIcon fontSize="small" />;
      default: return null;
    }
  };
  
  const getPriorityIcon = (priority: CounterpartyPriority) => {
    switch (priority) {
      case 'vip': return <Star sx={{ color: 'gold' }} />;
      case 'high': return <StarIcon color="primary" />;
      case 'medium': return <StarBorderIcon />;
      default: return null;
    }
  };
  
  const hasDocumentIssues = (counterparty: Counterparty) => {
    return counterparty.complianceDocuments?.some(
      d => d.status === 'expired' || d.status === 'expiring_soon'
    );
  };
  
  return (
    <Box>
      {/* Header */}
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={3}
      >
        <Typography variant="h4">Контрагенты</Typography>
        
        <Stack direction="row" spacing={2}>
          {/* Expiring documents indicator */}
          {expiringDocsCount > 0 && (
            <Badge badgeContent={expiringDocsCount} color="warning">
              <Chip
                icon={<WarningIcon />}
                label="Истекают документы"
                color="warning"
                variant="outlined"
                onClick={() => navigate('/counterparties/expiring-docs')}
              />
            </Badge>
          )}
          
          {!isMobile && (
            <>
              <Button
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={handleFindDuplicates}
              >
                Найти дубликаты
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<MergeIcon />}
                onClick={handleDeleteDuplicates}
                color="warning"
              >
                Удалить дубликаты
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<ImportIcon />}
                onClick={handleMigrateContractors}
                color="info"
              >
                Миграция Contractors
              </Button>
              
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleQuickCreate}
              >
                Новый контрагент
              </Button>
            </>
          )}
        </Stack>
      </Stack>
      
      {/* KPI Cards */}
      {kpi && (
        <Stack direction="row" spacing={2} mb={3} sx={{ overflowX: 'auto' }}>
          <Paper sx={{ p: 2, minWidth: 140 }}>
            <Typography variant="h4">{kpi.totalCount}</Typography>
            <Typography variant="caption" color="text.secondary">
              Всего контрагентов
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 2, minWidth: 140 }}>
            <Typography variant="h4">{(kpi.byStatus?.active || 0) + (kpi.byStatus?.new || 0)}</Typography>
            <Typography variant="caption" color="text.secondary">
              Активных
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 2, minWidth: 140 }}>
            <Typography variant="h4">{kpi.withExpiringDocuments}</Typography>
            <Typography variant="caption" color="text.secondary">
              С истекающими док.
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 2, minWidth: 140 }}>
            <Typography variant="h4">{kpi.byRole?.customer || 0}</Typography>
            <Typography variant="caption" color="text.secondary">
              Клиентов
            </Typography>
          </Paper>
        </Stack>
      )}
      
      {/* Search and filters */}
      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          fullWidth
          size="small"
          placeholder="Поиск по названию, ИНН..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        
        <Button variant="outlined" startIcon={<FilterIcon />}>
          Фильтры
        </Button>
      </Stack>
      
      {/* Tabs */}
      <Tabs 
        value={selectedTab} 
        onChange={(e, value) => setSelectedTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        {TABS.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label}
            icon={tab.icon}
            iconPosition="start"
          />
        ))}
      </Tabs>
      
      {/* List */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : filteredCounterparties.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Контрагенты не найдены
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ mt: 2 }}
            onClick={handleQuickCreate}
          >
            Создать первого контрагента
          </Button>
        </Paper>
      ) : (
        <Box sx={{ pb: isMobile ? '80px' : 0 }}> {/* Добавляем отступ снизу на мобильных */}
          <List>
            {filteredCounterparties.map((counterparty, index) => (
              <React.Fragment key={counterparty.id}>
                <ListItem
                  secondaryAction={
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuOpen(e, counterparty);
                      }}
                    >
                      <MoreIcon />
                    </IconButton>
                  }
                  disablePadding
                >
                  <ListItemButton onClick={() => navigate(`/counterparties/${counterparty.id}`)}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.light' }}>
                        {getRoleIcon(counterparty.roles[0])}
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="subtitle1">
                            {counterparty.displayName}
                          </Typography>
                          {getPriorityIcon(counterparty.priority)}
                          {hasDocumentIssues(counterparty) && (
                            <Tooltip title="Есть проблемы с документами">
                              <WarningIcon color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                        </Stack>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip
                            label={getStatusLabel(counterparty.status)}
                            color={getStatusColor(counterparty.status) as any}
                            size="small"
                          />
                          {counterparty.roles.map((role) => (
                            <Chip
                              key={role}
                              label={role}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {counterparty.taxId && (
                            <Typography variant="caption" color="text.secondary">
                              ИНН: {counterparty.taxId}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                
                {index < filteredCounterparties.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}
      
      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          navigate(`/counterparties/${selectedCounterparty?.id}/edit`);
          handleMenuClose();
        }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        
        <MenuItem onClick={() => {
          navigate(`/estimates/new?counterpartyId=${selectedCounterparty?.id}`);
          handleMenuClose();
        }}>
          <AssessmentIcon fontSize="small" sx={{ mr: 1 }} />
          Создать смету
        </MenuItem>
        
        <MenuItem onClick={() => {
          // TODO: Print passport
          handleMenuClose();
        }}>
          <PrintIcon fontSize="small" sx={{ mr: 1 }} />
          Паспорт контрагента
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => {
          if (selectedCounterparty) {
            handleArchive(selectedCounterparty);
          }
          handleMenuClose();
        }}>
          <ArchiveIcon fontSize="small" sx={{ mr: 1 }} />
          Архивировать
        </MenuItem>
      </Menu>
      
      {/* Create dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Создать контрагента</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Полное наименование"
              value={newCounterparty.legalName}
              onChange={(e) => setNewCounterparty({
                ...newCounterparty,
                legalName: e.target.value,
              })}
              required
              fullWidth
            />
            
            <TextField
              label="Краткое название"
              value={newCounterparty.displayName}
              onChange={(e) => setNewCounterparty({
                ...newCounterparty,
                displayName: e.target.value,
              })}
              helperText="Будет использоваться в интерфейсе"
              fullWidth
            />
            
            <TextField
              label="ИНН"
              value={newCounterparty.taxId}
              onChange={(e) => setNewCounterparty({
                ...newCounterparty,
                taxId: e.target.value,
              })}
              fullWidth
            />
            
            <FormControl fullWidth required>
              <InputLabel>Роли</InputLabel>
              <Select
                multiple
                value={newCounterparty.roles}
                onChange={(e) => setNewCounterparty({
                  ...newCounterparty,
                  roles: e.target.value as CounterpartyRole[],
                })}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={1}>
                    {(selected as CounterpartyRole[]).map((role) => (
                      <Chip key={role} label={role} size="small" />
                    ))}
                  </Stack>
                )}
              >
                <MenuItem value="customer">Клиент</MenuItem>
                <MenuItem value="vendor">Поставщик</MenuItem>
                <MenuItem value="subcontractor">Субподрядчик</MenuItem>
                <MenuItem value="partner">Партнер</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleCreateCounterparty}
            variant="contained"
            disabled={!newCounterparty.legalName || newCounterparty.roles.length === 0}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Mobile FAB */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 70, right: 16 }}
          onClick={handleQuickCreate}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
};

export default CounterpartiesPage;

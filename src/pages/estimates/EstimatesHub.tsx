/**
 * Главная страница для работы со сметами
 * Оптимизирована для мобильных устройств
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Paper,
  Tabs,
  Tab,
  Badge,
  Chip,
  Card,
  CardContent,
  CardActionArea,

  IconButton,
  TextField,
  InputAdornment,

  Alert,

  Stack,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Description as EstimateIcon,
  CheckCircle as ApprovedIcon,
  Warning as DraftIcon,
  Schedule as PendingIcon,
  Search as SearchIcon,

  NoteAdd as QuickAddIcon,
  FolderCopy as TemplateIcon,
  CloudDownload as ImportIcon,

  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  PictureAsPdf as PdfIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { 
  getEstimatesStream, 
  Estimate,
  deleteEstimate,
  generateEstimatePDF 
} from '../../api/estimateApi';
import { deleteEstimate as deleteEstimateV2 } from '../../api/estimateV2Api';
import { format } from '../../utils/dateUtils';
import { deleteAllEstimates, deleteOldDraftEstimates, deleteEstimatesWithoutProject } from '../../utils/cleanOldEstimates';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      {...other}
      sx={{ pt: 2 }}
    >
      {value === index && children}
    </Box>
  );
}

const EstimatesHub: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // States
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  
  // Load estimates
  useEffect(() => {
    if (!currentUser) return;
    
    setLoading(true);
    const unsubscribe = getEstimatesStream(currentUser.uid, '', (data) => {
      setEstimates(data);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [currentUser]);
  
  // Filter estimates by status and search
  const filterEstimates = (status?: string) => {
    let filtered = estimates;
    
    if (status) {
      filtered = filtered.filter(e => e.status === status);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.name?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.number?.toLowerCase().includes(query)
      );
    }
    
    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return dateB - dateA;
    });
  };
  
  const draftEstimates = filterEstimates('draft');
  const sentEstimates = filterEstimates('sent');
  const approvedEstimates = filterEstimates('approved');
  const allEstimates = filterEstimates();
  
  // Handlers
  const handleCreateNew = () => {
    navigate('/estimates/new'); // Constructor mode
  };
  
  const handleQuickCreate = () => {
    navigate('/estimates/quick-create'); // Quick mode
  };
  
  const handleCreateFromTemplate = () => {
    navigate('/estimates/templates');
  };
  
  const handleImport = () => {
    navigate('/estimates/import');
  };
  
  const handleOpenEstimate = (id: string) => {
    if (isMobile) {
      navigate(`/mobile/estimate/${id}`);
    } else {
      navigate(`/estimates/${id}`);
    }
  };
  
  const handleEdit = (id: string) => {
    navigate(`/estimates/${id}/edit`);
  };
  
  const handleDelete = async (estimate: Estimate) => {
    if (!currentUser || !window.confirm('Удалить смету?')) return;
    
    console.log('Удаляем смету:', estimate.id, 'projectId:', estimate.projectId);
    
    try {
      // Используем новый API для смет без проекта или новых смет
      // и старый API для смет с проектом
      if (estimate.projectId && estimate.projectId !== '') {
        console.log('Используем старый API с projectId:', estimate.projectId);
        await deleteEstimate(currentUser.uid, estimate.id, estimate.projectId);
      } else {
        // Для новых смет или смет без проекта используем новый API
        console.log('Используем новый API V2');
        await deleteEstimateV2(currentUser.uid, estimate.id);
      }
      console.log('Смета удалена успешно');
      
      // Обновляем список смет после удаления
      // (список обновится автоматически через подписку)
    } catch (error: any) {
      console.error('Error deleting estimate:', error);
      console.error('Error details:', error?.message || error);
      alert(`Ошибка при удалении сметы: ${error?.message || 'Неизвестная ошибка'}`);
    }
  };
  
  const handleShare = (estimate: Estimate) => {
    // Implement share functionality
    const shareUrl = `${window.location.origin}/public/estimate/${estimate.id}`;
    if (navigator.share) {
      navigator.share({
        title: `Смета ${estimate.number}`,
        text: estimate.description,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Ссылка скопирована в буфер обмена');
    }
  };
  
  // Функции очистки старых смет
  const handleDeleteAllEstimates = async () => {
    if (!currentUser) return;
    
    const confirmMsg = `ВНИМАНИЕ! Это действие удалит ВСЕ сметы (${estimates.length} шт.).\n\nЭто действие НЕОБРАТИМО!\n\nВы уверены?`;
    if (!window.confirm(confirmMsg)) return;
    
    // Двойное подтверждение для безопасности
    if (!window.confirm('Последнее предупреждение! Все сметы будут удалены безвозвратно. Продолжить?')) return;
    
    try {
      setLoading(true);
      const result = await deleteAllEstimates(currentUser.uid);
      
      if (result.errors.length > 0) {
        console.error('Ошибки при удалении:', result.errors);
        alert(`Удалено ${result.deleted} смет. Ошибок: ${result.errors.length}`);
      } else {
        alert(`Успешно удалено ${result.deleted} смет`);
      }
      
      // Список обновится автоматически через подписку
    } catch (error) {
      console.error('Ошибка при удалении всех смет:', error);
      alert('Ошибка при удалении смет');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteOldDrafts = async () => {
    if (!currentUser) return;
    
    if (!window.confirm('Удалить все черновики старше 30 дней?')) return;
    
    try {
      setLoading(true);
      const result = await deleteOldDraftEstimates(currentUser.uid, 30);
      alert(`Удалено ${result.deleted} старых черновиков`);
    } catch (error) {
      console.error('Ошибка при удалении черновиков:', error);
      alert('Ошибка при удалении черновиков');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteEstimatesWithoutProject = async () => {
    if (!currentUser) return;
    
    if (!window.confirm('Удалить все сметы без привязки к проекту?')) return;
    
    try {
      setLoading(true);
      const result = await deleteEstimatesWithoutProject(currentUser.uid);
      alert(`Удалено ${result.deleted} смет без проекта`);
    } catch (error) {
      console.error('Ошибка при удалении смет без проекта:', error);
      alert('Ошибка при удалении смет без проекта');
    } finally {
      setLoading(false);
    }
  };
  
  const handleExportPDF = async (estimate: Estimate) => {
    if (!currentUser) return;
    
    try {
      await generateEstimatePDF(currentUser.uid, estimate.id);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Ошибка при генерации PDF');
    }
  };
  
  // Render estimate card
  const EstimateCard = ({ estimate }: { estimate: Estimate }) => {
    const getStatusIcon = () => {
      switch (estimate.status) {
        case 'approved':
          return <ApprovedIcon color="success" />;
        case 'sent':
          return <PendingIcon color="info" />;
        case 'rejected':
        case 'cancelled':
          return <DraftIcon color="error" />;
        default:
          return <DraftIcon color="warning" />;
      }
    };
    
    const statusIcon = getStatusIcon();
    
    return (
      <Card sx={{ mb: 2 }}>
        <CardActionArea onClick={() => handleOpenEstimate(estimate.id)}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box flex={1}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  {statusIcon}
                  <Typography variant="h6" component="div">
                    Смета №{estimate.number || estimate.id.slice(-6)}
                  </Typography>
                </Stack>
                
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                  {estimate.description || 'Без описания'}
                </Typography>
                
                <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {estimate.createdAt && (() => {
                      // Обрабатываем разные типы createdAt
                      if (typeof estimate.createdAt === 'string') {
                        // ISO string
                        return format(new Date(estimate.createdAt), 'dd.MM.yyyy');
                      } else if (typeof estimate.createdAt.toDate === 'function') {
                        // Firestore Timestamp
                        return format(estimate.createdAt.toDate(), 'dd.MM.yyyy');
                      } else if (estimate.createdAt instanceof Date) {
                        // JavaScript Date
                        return format(estimate.createdAt, 'dd.MM.yyyy');
                      }
                      return '';
                    })()}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {(estimate.total || 0).toLocaleString('ru-RU')} ₽
                  </Typography>
                </Stack>
              </Box>
              
              {!isMobile && (
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(estimate.id);
                  }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleShare(estimate);
                  }}>
                    <ShareIcon />
                  </IconButton>
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleExportPDF(estimate);
                  }}>
                    <PdfIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(estimate);
                  }}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              )}
            </Box>
          </CardContent>
        </CardActionArea>
        
        {isMobile && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <IconButton size="small" onClick={() => handleEdit(estimate.id)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleShare(estimate)}>
                <ShareIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleExportPDF(estimate)}>
                <PdfIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => handleDelete(estimate)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        )}
      </Card>
    );
  };
  
  // Speed dial actions
  const speedDialActions = [
    { icon: <AddIcon />, name: 'Новая смета', action: handleCreateNew },
    { icon: <QuickAddIcon />, name: 'Быстрое создание', action: handleQuickCreate },
    { icon: <TemplateIcon />, name: 'Из шаблона', action: handleCreateFromTemplate },
    { icon: <ImportIcon />, name: 'Импорт', action: handleImport },
    { icon: <DeleteIcon color="error" />, name: '🗑️ Удалить все сметы', action: handleDeleteAllEstimates },
    { icon: <DeleteIcon />, name: 'Удалить старые черновики', action: handleDeleteOldDrafts },
    { icon: <DeleteIcon />, name: 'Удалить сметы без проекта', action: handleDeleteEstimatesWithoutProject },
  ];
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ pb: 8 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          <EstimateIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Сметы
        </Typography>
        
        <TextField
          fullWidth
          placeholder="Поиск смет..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        
        <Stack direction="row" spacing={2}>
          <Chip 
            icon={<MoneyIcon />}
            label={`Всего: ${allEstimates.length}`}
            color="primary"
          />
          <Chip 
            label={`На сумму: ${allEstimates.reduce((sum, e) => sum + (e.total || 0), 0).toLocaleString('ru-RU')} ₽`}
            color="success"
          />
        </Stack>
      </Paper>
      
      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            label={
              <Badge badgeContent={allEstimates.length} color="primary">
                Все
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={draftEstimates.length} color="warning">
                Черновики
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={sentEstimates.length} color="info">
                Отправленные
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={approvedEstimates.length} color="success">
                Утвержденные
              </Badge>
            } 
          />
        </Tabs>
      </Paper>
      
      {/* Content */}
      <TabPanel value={tabValue} index={0}>
        {allEstimates.length === 0 ? (
          <Alert severity="info">
            Сметы не найдены. Создайте первую смету!
          </Alert>
        ) : (
          allEstimates.map(estimate => (
            <EstimateCard key={estimate.id} estimate={estimate} />
          ))
        )}
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        {draftEstimates.length === 0 ? (
          <Alert severity="info">
            Нет черновиков смет
          </Alert>
        ) : (
          draftEstimates.map(estimate => (
            <EstimateCard key={estimate.id} estimate={estimate} />
          ))
        )}
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        {sentEstimates.length === 0 ? (
          <Alert severity="info">
            Нет отправленных смет
          </Alert>
        ) : (
          sentEstimates.map(estimate => (
            <EstimateCard key={estimate.id} estimate={estimate} />
          ))
        )}
      </TabPanel>
      
      <TabPanel value={tabValue} index={3}>
        {approvedEstimates.length === 0 ? (
          <Alert severity="info">
            Нет утвержденных смет
          </Alert>
        ) : (
          approvedEstimates.map(estimate => (
            <EstimateCard key={estimate.id} estimate={estimate} />
          ))
        )}
      </TabPanel>
      
      {/* Floating Action Button */}
      {isMobile ? (
        <SpeedDial
          ariaLabel="Создать смету"
          sx={{ position: 'fixed', bottom: 70, right: 16 }}
          icon={<SpeedDialIcon />}
          open={speedDialOpen}
          onOpen={() => setSpeedDialOpen(true)}
          onClose={() => setSpeedDialOpen(false)}
        >
          {speedDialActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={() => {
                setSpeedDialOpen(false);
                action.action();
              }}
            />
          ))}
        </SpeedDial>
      ) : (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 70, right: 16 }}
          onClick={handleCreateNew}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
};

export default EstimatesHub;

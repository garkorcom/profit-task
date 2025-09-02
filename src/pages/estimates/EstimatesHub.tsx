/**
 * Главная страница для работы со сметами
 * Оптимизирована для мобильных устройств
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  generateEstimatePDF 
} from '../../api/estimateV2StreamApi';
import { Estimate } from '../../types/estimate.types';
import { deleteEstimate as deleteEstimateV2 } from '../../api/estimateV2Api';
import { format } from '../../utils/dateUtils';
import { deleteAllEstimates, deleteOldDraftEstimates, deleteEstimatesWithoutProject } from '../../utils/cleanOldEstimates';
import SwipeableEstimateCard from '../../components/estimates/SwipeableEstimateCard';

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
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // 1024px для мобильной версии
  const isVerySmall = useMediaQuery(theme.breakpoints.down(375));
  
  // States
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  
  // Debounced search to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Load estimates
  useEffect(() => {
    if (!currentUser) return;
    
    console.log('🔄 Loading estimates for user:', currentUser.uid);
    setLoading(true);
    
    const unsubscribe = getEstimatesStream(currentUser.uid, '', (data) => {
      console.log('📊 Received estimates data:', data.length, 'estimates');
      console.log('📊 Estimates:', data);
      setEstimates(data);
      setLoading(false);
    });
    
    return () => {
      console.log('🔌 Unsubscribing from estimates stream');
      unsubscribe();
    };
  }, [currentUser]);
  
  // Optimized filtering with memoization
  const filteredEstimates = useMemo(() => {
    console.log('🔄 Filtering estimates, total:', estimates.length);
    
    // First, sort all estimates by date (newest first)
    const sortedEstimates = [...estimates].sort((a, b) => {
      const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0;
      const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    // Apply search filter if needed
    let searchFiltered = sortedEstimates;
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      searchFiltered = sortedEstimates.filter(e => 
        e.number?.toLowerCase().includes(query) ||
        e.terms?.toLowerCase().includes(query)
      );
    }
    
    // Group by status in one pass
    const result = {
      all: searchFiltered,
      draft: searchFiltered.filter(e => e.status === 'draft'),
      sent: searchFiltered.filter(e => e.status === 'sent'), 
      approved: searchFiltered.filter(e => e.status === 'accepted' || e.status === 'converted')
    };
    
    console.log('📊 Filtered results:', {
      all: result.all.length,
      draft: result.draft.length,
      sent: result.sent.length,
      approved: result.approved.length
    });
    
    return result;
  }, [estimates, debouncedSearchQuery]);
  
  const { all: allEstimates, draft: draftEstimates, sent: sentEstimates, approved: approvedEstimates } = filteredEstimates;
  
  // Handlers
  const handleCreateNew = () => {
    navigate('/estimates/new'); // Constructor mode
  };
  
  const handleQuickCreate = () => {
    navigate('/estimates/quick-create'); // Quick mode
  };
  
  const handleCreateFromTemplate = () => {
    // TODO: Implement templates functionality
    alert('Функция в разработке - создание из шаблонов');
  };
  
  const handleImport = () => {
    // TODO: Implement import functionality
    alert('Функция в разработке - импорт смет');
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
  
  
  // Memoized handlers to prevent unnecessary re-renders
  const handleEditMemo = useCallback((id: string) => {
    navigate(`/estimates/${id}/constructor`);
  }, [navigate]);
  
  const handleDeleteMemo = useCallback(async (estimate: Estimate) => {
    if (!currentUser || !window.confirm('Удалить смету?')) return;
    
    console.log('Удаляем смету:', estimate.id, 'projectId:', estimate.projectId);
    
    try {
      console.log('Удаляем смету через V2 API:', estimate.id);
      await deleteEstimateV2(currentUser.uid, estimate.id);
      console.log('Смета удалена успешно');
    } catch (error: any) {
      console.error('Error deleting estimate:', error);
      console.error('Error details:', error?.message || error);
      alert(`Ошибка при удалении сметы: ${error?.message || 'Неизвестная ошибка'}`);
    }
  }, [currentUser]);
  
  const handleShareMemo = useCallback((estimate: Estimate) => {
    const shareUrl = `${window.location.origin}/public/estimate/${estimate.id}`;
    if (navigator.share) {
      navigator.share({
        title: `Смета ${estimate.number}`,
        text: estimate.terms || `Смета ${estimate.number}`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Ссылка скопирована в буфер обмена');
    }
  }, []);
  
  const handleExportPDFMemo = useCallback(async (estimate: Estimate) => {
    if (!currentUser) return;
    
    try {
      await generateEstimatePDF(currentUser.uid, estimate.id);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Ошибка при генерации PDF');
    }
  }, [currentUser]);
  
  const handleOpenEstimateMemo = useCallback((id: string) => {
    if (isMobile) {
      navigate(`/mobile/estimate/${id}`);
    } else {
      navigate(`/estimates/${id}/constructor`);
    }
  }, [isMobile, navigate]);

  // Optimized estimate card component with React.memo
  const EstimateCard = React.memo<{ estimate: Estimate }>(({ estimate }) => {
    return (
      <SwipeableEstimateCard
        estimate={estimate}
        onEdit={handleEditMemo}
        onDelete={handleDeleteMemo}
        onShare={handleShareMemo}
        onExportPDF={handleExportPDFMemo}
        onClick={handleOpenEstimateMemo}
      />
    );
  });
  
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
  
  if (loading && estimates.length === 0) {
    return (
      <Box sx={{ pb: 8 }}>
        {/* Header skeleton */}
        <Paper sx={{ p: isMobile ? 1.5 : 2, mb: 2 }}>
          <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
            <EstimateIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Сметы
          </Typography>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <Box textAlign="center">
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
                Загрузка смет...
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, color: 'text.disabled' }}>
                Подключение к базе данных
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  }
  
  return (
    <Box sx={{ pb: 8 }}>
      {/* Header */}
      <Paper sx={{ p: isMobile ? 1.5 : 2, mb: 2 }}>
        <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
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
        
        <Stack direction={isVerySmall ? "column" : "row"} spacing={1} sx={{ gap: 1 }}>
          <Chip 
            icon={<MoneyIcon />}
            label={`Всего: ${allEstimates.length}`}
            color="primary"
          />
          <Chip 
            label={`На сумму: ${allEstimates.reduce((sum, e) => sum + (e.totals?.grandTotal || 0), 0).toLocaleString('en-US')} $`}
            color="success"
          />
        </Stack>
      </Paper>
      
      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              minHeight: isMobile ? 48 : 64,
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              minWidth: isMobile ? 80 : 160,
              px: isVerySmall ? 1 : 2
            }
          }}
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
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Загрузка смет...
            </Typography>
          </Box>
        ) : allEstimates.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <EstimateIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Сметы не найдены
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Создайте первую смету для начала работы
            </Typography>
            <Stack 
              direction={isMobile ? "column" : "row"} 
              spacing={2} 
              justifyContent="center"
              alignItems="center"
            >
              <Fab
                variant="extended"
                color="primary"
                onClick={handleCreateNew}
                sx={{ 
                  minWidth: isMobile ? 200 : 150,
                  minHeight: 48,
                  fontSize: isMobile ? '0.9rem' : '0.875rem'
                }}
              >
                <AddIcon sx={{ mr: 1 }} />
                Новая смета
              </Fab>
              <Fab
                variant="extended"
                color="secondary"
                onClick={handleQuickCreate}
                sx={{ 
                  minWidth: isMobile ? 200 : 150,
                  minHeight: 48,
                  fontSize: isMobile ? '0.9rem' : '0.875rem'
                }}
              >
                <QuickAddIcon sx={{ mr: 1 }} />
                Быстрое создание
              </Fab>
            </Stack>
          </Paper>
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
          sx={{ 
            position: 'fixed', 
            bottom: isVerySmall ? 60 : 70, 
            right: isVerySmall ? 12 : 16,
            '& .MuiSpeedDial-fab': {
              width: isVerySmall ? 48 : 56,
              height: isVerySmall ? 48 : 56
            }
          }}
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
              sx={{
                '& .MuiSpeedDialAction-fab': {
                  width: isVerySmall ? 40 : 48,
                  height: isVerySmall ? 40 : 48,
                  minHeight: isVerySmall ? 40 : 48
                }
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

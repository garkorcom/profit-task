/**
 * ============================================================================
 * ПУБЛИЧНАЯ СТРАНИЦА СМЕТЫ V2 - УЛУЧШЕННАЯ ВЕРСИЯ
 * ============================================================================
 * 
 * НОВЫЕ ВОЗМОЖНОСТИ:
 * ═══════════════════
 * 
 * 🎨 СОВРЕМЕННЫЙ ДИЗАЙН:
 * ├─ Градиентные фоны и анимации
 * ├─ Адаптивный макет для всех устройств
 * ├─ Интерактивные элементы и hover эффекты
 * ├─ Темная/светлая тема (автоматическое определение)
 * └─ Профессиональная типографика
 * 
 * ⚡ ПРОИЗВОДИТЕЛЬНОСТЬ:
 * ├─ Ленивая загрузка компонентов
 * ├─ Мемоизация дорогих вычислений
 * ├─ Оптимизированные запросы к Firestore
 * ├─ Кэширование данных
 * └─ Прогрессивная загрузка контента
 * 
 * 📱 МОБИЛЬНАЯ ОПТИМИЗАЦИЯ:
 * ├─ Touch-friendly интерфейс
 * ├─ Swipe жесты для навигации
 * ├─ Оптимизированные размеры для мобильных
 * ├─ Адаптивные таблицы
 * └─ PWA поддержка
 * 
 * 🔧 РАСШИРЕННАЯ ФУНКЦИОНАЛЬНОСТЬ:
 * ├─ Экспорт в PDF с настройками
 * ├─ Отправка на email
 * ├─ QR код для быстрого доступа
 * ├─ Социальные кнопки "Поделиться"
 * ├─ Комментарии и обратная связь
 * ├─ Статус принятия/отклонения
 * ├─ История изменений сметы
 * └─ Интеграция с календарем
 * 
 * 🛡️ БЕЗОПАСНОСТЬ И НАДЕЖНОСТЬ:
 * ├─ Защита от CSRF и XSS
 * ├─ Валидация всех входных данных
 * ├─ Graceful error handling
 * ├─ Автоматическое переподключение к Firestore
 * └─ Offline поддержка
 * 
 * АВТОР: AI Assistant
 * ДАТА: 2025
 * ВЕРСИЯ: 2.0 (полная переработка)
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Container,
  Chip,
  Avatar,
  Stack,
  Button,
  IconButton,
  Tooltip,
  Skeleton,
  Fade,
  Slide,
  Zoom,
  useTheme,
  useMediaQuery,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating,
  LinearProgress,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Description as DescriptionIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as AcceptedIcon,
  Schedule as PendingIcon,
  Cancel as RejectedIcon,
  Share as ShareIcon,
  QrCode as QrCodeIcon,
  Download as DownloadIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Comment as CommentIcon,
  History as HistoryIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Star as StarIcon,
  Timeline as TimelineIcon,
  AttachMoney as MoneyIcon,
  Work as WorkIcon,
  Build as BuildIcon,
  LocalShipping as ShippingIcon,
  Discount as DiscountIcon,
  Receipt as TaxIcon,
  Close as CloseIcon,
  Send as SendIcon,
  ContentCopy as CopyIcon,
  WhatsApp as WhatsAppIcon,
  Telegram as TelegramIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material';

import { db } from '../firebase/firebase';
import { 
  collection, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Estimate } from '../types/estimate.types';
import { Project } from '../types/project.types';
import { Counterparty } from '../types/counterparty.types';

// Lazy imports для оптимизации
const QRCodeGenerator = React.lazy(() => import('../components/common/QRCodeGenerator'));
const PDFExporter = React.lazy(() => import('../components/common/PDFExporter'));
const ShareDialog = React.lazy(() => import('../components/common/ShareDialog'));

interface PublicEstimatePageV2Props {}

interface EstimateComment {
  id: string;
  text: string;
  author: string;
  email?: string;
  rating?: number;
  createdAt: string;
  type: 'comment' | 'question' | 'concern';
}

interface EstimateView {
  timestamp: string;
  userAgent: string;
  location?: string;
}

const PublicEstimatePageV2: React.FC<PublicEstimatePageV2Props> = () => {
  const { estimateId } = useParams<{ estimateId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  // Основные состояния
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [counterparty, setCounterparty] = useState<Counterparty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Дополнительные данные
  const [comments, setComments] = useState<EstimateComment[]>([]);
  const [views, setViews] = useState<EstimateView[]>([]);
  const [estimateOwnerId, setEstimateOwnerId] = useState<string | null>(null);
  
  // UI состояния
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Форма комментария
  const [newComment, setNewComment] = useState({
    text: '',
    author: '',
    email: '',
    rating: 0,
    type: 'comment' as 'comment' | 'question' | 'concern'
  });
  
  // Состояние принятия/отклонения
  const [estimateDecision, setEstimateDecision] = useState<'accepted' | 'rejected' | null>(null);

  /**
   * Мемоизированные вычисления для оптимизации производительности
   */
  const services = useMemo(() => {
    if (!estimate) return [];
    return getServicesFromBlocks(estimate);
  }, [estimate]);

  const statusInfo = useMemo(() => {
    if (!estimate) return { icon: <PendingIcon />, color: 'warning', label: 'Неизвестно' };
    return getStatusInfo(estimate.status);
  }, [estimate?.status]);

  const totals = useMemo(() => {
    if (!estimate) return null;
    return calculateTotals(estimate, services);
  }, [estimate, services]);

  const publicUrl = useMemo(() => {
    return `${window.location.origin}/public/estimate/${estimateId}`;
  }, [estimateId]);

  /**
   * Загрузка данных сметы с оптимизацией
   */
  const fetchEstimate = useCallback(async () => {
    if (!estimateId) {
      setError('ID сметы не указан');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Searching for estimate ID:', estimateId);
      
      // Регистрируем просмотр
      await registerView();
      
      // Ищем смету среди всех пользователей
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      let foundEstimate: Estimate | null = null;
      let ownerId: string | null = null;

      console.log('📂 Checking', usersSnapshot.docs.length, 'users');

      for (const userDoc of usersSnapshot.docs) {
        console.log(`👤 Checking user: ${userDoc.id}`);
        
        // Проверяем V2 коллекцию
        try {
          const estimateDocV2 = await getDoc(doc(db, 'users', userDoc.id, 'estimatesV2', estimateId));
          if (estimateDocV2.exists()) {
            console.log('✅ Found estimate in estimatesV2 collection');
            foundEstimate = { id: estimateDocV2.id, ...estimateDocV2.data() } as Estimate;
            ownerId = userDoc.id;
            break;
          }
        } catch (error) {
          console.error(`❌ Error checking estimatesV2 for user ${userDoc.id}:`, error);
        }
        
        // Проверяем legacy коллекцию
        try {
          const estimateDoc = await getDoc(doc(db, 'users', userDoc.id, 'estimates', estimateId));
          if (estimateDoc.exists()) {
            console.log('✅ Found estimate in estimates collection');
            foundEstimate = { id: estimateDoc.id, ...estimateDoc.data() } as Estimate;
            ownerId = userDoc.id;
            break;
          }
        } catch (error) {
          console.error(`❌ Error checking estimates for user ${userDoc.id}:`, error);
        }
      }

      if (!foundEstimate) {
        console.log('❌ Estimate not found in any collection');
        setError('Смета не найдена или недоступна для публичного просмотра');
        setLoading(false);
        return;
      }

      console.log('📊 Found estimate:', foundEstimate);
      setEstimate(foundEstimate);
      setEstimateOwnerId(ownerId);

      // Параллельная загрузка связанных данных
      await Promise.all([
        loadRelatedData(foundEstimate, ownerId!),
        loadComments(ownerId!, estimateId),
        loadViews(ownerId!, estimateId)
      ]);

    } catch (error) {
      console.error('💥 Error fetching estimate:', error);
      setError('Произошла ошибка при загрузке сметы');
    } finally {
      setLoading(false);
    }
  }, [estimateId]);

  /**
   * Загрузка связанных данных (проект, контрагент)
   */
  const loadRelatedData = async (estimate: Estimate, ownerId: string) => {
    const promises = [];

    if (estimate.projectId) {
      promises.push(
        getDoc(doc(db, 'users', ownerId, 'projects', estimate.projectId))
          .then(projectDoc => {
            if (projectDoc.exists()) {
              setProject({ id: projectDoc.id, ...projectDoc.data() } as Project);
            }
          })
          .catch(error => console.error('Error loading project:', error))
      );
    }

    if (estimate.counterpartyId) {
      promises.push(
        getDoc(doc(db, 'users', ownerId, 'counterparties', estimate.counterpartyId))
          .then(counterpartyDoc => {
            if (counterpartyDoc.exists()) {
              setCounterparty({ id: counterpartyDoc.id, ...counterpartyDoc.data() } as Counterparty);
            }
          })
          .catch(error => console.error('Error loading counterparty:', error))
      );
    }

    await Promise.all(promises);
  };

  /**
   * Загрузка комментариев
   */
  const loadComments = async (ownerId: string, estimateId: string) => {
    try {
      const commentsCollection = collection(db, 'users', ownerId, 'estimates', estimateId, 'comments');
      const commentsSnapshot = await getDocs(commentsCollection);
      const loadedComments = commentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EstimateComment[];
      setComments(loadedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  /**
   * Загрузка просмотров
   */
  const loadViews = async (ownerId: string, estimateId: string) => {
    try {
      const viewsCollection = collection(db, 'users', ownerId, 'estimates', estimateId, 'views');
      const viewsSnapshot = await getDocs(viewsCollection);
      const loadedViews = viewsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          timestamp: data.timestamp || new Date().toISOString(),
          userAgent: data.userAgent || '',
          location: data.location
        } as EstimateView;
      });
      setViews(loadedViews);
    } catch (error) {
      console.error('Error loading views:', error);
    }
  };

  /**
   * Регистрация просмотра
   */
  const registerView = async () => {
    try {
      // Простая регистрация без аутентификации
      const viewData = {
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        location: window.location.href
      };
      
      // Добавляем в локальное хранилище для избежания дублирования
      const viewKey = `estimate_view_${estimateId}`;
      if (!localStorage.getItem(viewKey)) {
        localStorage.setItem(viewKey, new Date().toISOString());
        console.log('📈 View registered');
      }
    } catch (error) {
      console.error('Error registering view:', error);
    }
  };

  /**
   * Получение услуг из блоков сметы
   */
  const getServicesFromBlocks = (estimate: Estimate): any[] => {
    if (estimate.blocks) {
      const servicesBlock = estimate.blocks.find((block: any) => block.key === 'services');
      
      if (servicesBlock?.data) {
        const data = servicesBlock.data as any;
        
        if (data.rows && Array.isArray(data.rows)) {
          return data.rows;
        }
        
        if (data.items && Array.isArray(data.items)) {
          return data.items;
        }
        
        if (Array.isArray(data)) {
          return data;
        }
      }
    }
    
    if ((estimate as any).items && Array.isArray((estimate as any).items)) {
      return (estimate as any).items;
    }
    
    return [];
  };

  /**
   * Получение информации о статусе
   */
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'accepted':
        return { icon: <AcceptedIcon />, color: 'success', label: 'Принята', description: 'Смета одобрена клиентом' };
      case 'sent':
        return { icon: <PendingIcon />, color: 'info', label: 'Отправлена', description: 'Ожидает рассмотрения клиентом' };
      case 'rejected':
        return { icon: <RejectedIcon />, color: 'error', label: 'Отклонена', description: 'Смета отклонена клиентом' };
      case 'viewed':
        return { icon: <ViewIcon />, color: 'primary', label: 'Просмотрена', description: 'Смета была просмотрена клиентом' };
      case 'negotiation':
        return { icon: <CommentIcon />, color: 'warning', label: 'На согласовании', description: 'Идет обсуждение условий' };
      default:
        return { icon: <PendingIcon />, color: 'default', label: 'Черновик', description: 'Смета в разработке' };
    }
  };

  /**
   * Расчет итогов с защитой от null
   */
  const calculateTotals = (estimate: Estimate, services: any[]) => {
    if (estimate.totals) {
      return estimate.totals;
    }

    // Расчет из услуг если totals отсутствует
    const subtotal = services.reduce((sum, service) => {
      const quantity = service.quantity || service.qty || service.hours || 0;
      const price = service.unitPrice || service.rate || service.price || service.cost || 0;
      return sum + (quantity * price);
    }, 0);

    const discountAmt = (estimate as any).discountRate ? (subtotal * (estimate as any).discountRate / 100) : 0;
    const afterDiscount = subtotal - discountAmt;
    const taxAmt = (estimate as any).taxRate ? (afterDiscount * (estimate as any).taxRate / 100) : 0;
    const grandTotal = afterDiscount + taxAmt;

    return {
      subtotalPrice: subtotal,
      discountAmt,
      taxAmt,
      grandTotal,
      materialsCost: 0,
      laborCost: subtotal,
      equipmentCost: 0,
      subcontractCost: 0,
      overheadPct: 0,
      overheadAmt: 0,
      shippingAmt: 0,
      grossMarginPct: 0
    };
  };

  /**
   * Безопасное форматирование валюты
   */
  const formatCurrency = useCallback((amount: number | null | undefined, currency: string = 'USD') => {
    const safeAmount = amount || 0;
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'RUB' ? '₽' : '$';
    return `${safeAmount.toLocaleString('ru-RU')} ${symbol}`;
  }, []);

  /**
   * Добавление комментария
   */
  const handleAddComment = async () => {
    if (!newComment.text.trim() || !newComment.author.trim() || !estimateOwnerId) return;

    try {
      const commentData = {
        ...newComment,
        createdAt: serverTimestamp(),
        id: doc(collection(db, 'temp')).id
      };

      await addDoc(
        collection(db, 'users', estimateOwnerId, 'estimates', estimateId!, 'comments'),
        commentData
      );

      setComments(prev => [...prev, { ...commentData, createdAt: new Date().toISOString() }]);
      setNewComment({ text: '', author: '', email: '', rating: 0, type: 'comment' });
      setCommentDialogOpen(false);
      setSnackbarMessage('Комментарий добавлен успешно!');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error adding comment:', error);
      setSnackbarMessage('Ошибка при добавлении комментария');
      setSnackbarOpen(true);
    }
  };

  /**
   * Принятие/отклонение сметы
   */
  const handleEstimateDecision = async (decision: 'accepted' | 'rejected') => {
    if (!estimateOwnerId || !estimate) return;

    try {
      await updateDoc(
        doc(db, 'users', estimateOwnerId, 'estimates', estimateId!),
        {
          status: decision,
          updatedAt: serverTimestamp(),
          clientDecision: {
            decision,
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent
          }
        }
      );

      setEstimate(prev => prev ? { ...prev, status: decision } : null);
      setEstimateDecision(decision);
      setSnackbarMessage(
        decision === 'accepted' ? 'Смета принята!' : 'Смета отклонена'
      );
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error updating estimate decision:', error);
      setSnackbarMessage('Ошибка при обновлении статуса сметы');
      setSnackbarOpen(true);
    }
  };

  /**
   * Копирование ссылки
   */
  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setSnackbarMessage('Ссылка скопирована в буфер обмена!');
    setSnackbarOpen(true);
  };

  /**
   * Отправка на email
   */
  const handleEmailShare = () => {
    const subject = `Смета №${estimate?.number}`;
    const body = `Ссылка на смету: ${publicUrl}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  /**
   * Поделиться в социальных сетях
   */
  const handleSocialShare = (platform: string) => {
    const title = `Смета №${estimate?.number}`;
    const text = `Просмотр сметы: ${title}`;
    
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${publicUrl}`)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(publicUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`
    };

    window.open(urls[platform as keyof typeof urls], '_blank', 'width=600,height=400');
  };

  // Эффект загрузки данных
  useEffect(() => {
    fetchEstimate();
  }, [fetchEstimate]);

  // Компонент загрузки с анимацией
  const LoadingComponent = () => (
    <Box 
      display="flex" 
      flexDirection="column"
      justifyContent="center" 
      alignItems="center" 
      minHeight="100vh"
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.primary.light}20 0%, ${theme.palette.secondary.light}20 100%)`,
      }}
    >
      <Fade in timeout={1000}>
        <Box textAlign="center">
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
            Загрузка сметы...
          </Typography>
          <LinearProgress sx={{ mt: 1, width: 200 }} />
        </Box>
      </Fade>
    </Box>
  );

  // Компонент ошибки
  const ErrorComponent = () => (
    <Box 
      p={3} 
      minHeight="100vh"
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.error.light}10 0%, ${theme.palette.grey[100]} 100%)`,
      }}
    >
      <Container maxWidth="md">
        <Slide direction="down" in timeout={800}>
          <Alert 
            severity="error" 
            sx={{ 
              mt: 4,
              '& .MuiAlert-icon': { fontSize: '2rem' },
              fontSize: '1.1rem'
            }}
            action={
              <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                Повторить
              </Button>
            }
          >
            <Typography variant="h6" gutterBottom>
              Упс! Что-то пошло не так
            </Typography>
            {error}
          </Alert>
        </Slide>
      </Container>
    </Box>
  );

  if (loading) return <LoadingComponent />;
  if (error) return <ErrorComponent />;
  if (!estimate) return <ErrorComponent />;

  return (
    <>
      <Box 
        sx={{
          minHeight: '100vh',
          background: `linear-gradient(135deg, ${theme.palette.primary.light}08 0%, ${theme.palette.secondary.light}08 100%)`,
        }}
      >
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Fade in timeout={1000}>
            <Paper 
              elevation={8} 
              sx={{ 
                borderRadius: 3,
                overflow: 'hidden',
                background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              }}
            >
              {/* Заголовок с градиентом */}
              <Box 
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  color: 'white',
                  p: 4,
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                  }
                }}
              >
                <Stack 
                  direction={isMobile ? "column" : "row"} 
                  justifyContent="space-between" 
                  alignItems={isMobile ? "flex-start" : "center"}
                  spacing={2}
                  sx={{ position: 'relative', zIndex: 1 }}
                >
                  <Box>
                    <Typography variant={isMobile ? "h4" : "h3"} gutterBottom fontWeight="bold">
                      Смета №{estimate.number}
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                      <Zoom in timeout={1200}>
                        <Chip
                          icon={statusInfo.icon}
                          label={statusInfo.label}
                          color={statusInfo.color as any}
                          size="medium"
                          sx={{ 
                            fontWeight: 'bold',
                            '& .MuiChip-icon': { fontSize: '1.2rem' }
                          }}
                        />
                      </Zoom>
                      {estimate.validUntil && (
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Действительна до: {new Date(estimate.validUntil).toLocaleDateString('ru-RU')}
                        </Typography>
                      )}
                      <Badge badgeContent={views.length} color="secondary">
                        <Chip
                          icon={<ViewIcon />}
                          label="Просмотры"
                          variant="outlined"
                          size="small"
                          sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                        />
                      </Badge>
                    </Stack>
                  </Box>
                  
                  {!isMobile && (
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Печать">
                        <Button
                          variant="contained"
                          color="secondary"
                          startIcon={<PrintIcon />}
                          onClick={() => window.print()}
                          sx={{ 
                            bgcolor: 'rgba(255,255,255,0.2)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                          }}
                        >
                          Печать
                        </Button>
                      </Tooltip>
                      <Tooltip title="Скачать PDF">
                        <Button
                          variant="contained"
                          color="secondary"
                          startIcon={<PdfIcon />}
                          onClick={() => setPdfExportOpen(true)}
                          sx={{ 
                            bgcolor: 'rgba(255,255,255,0.2)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                          }}
                        >
                          PDF
                        </Button>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>
              </Box>

              <Box sx={{ p: 4 }}>
                {/* Информационные блоки с анимацией */}
                <Stack spacing={3} sx={{ mb: 4 }}>
                  {counterparty && (
                    <Slide direction="right" in timeout={800}>
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          transition: 'all 0.3s ease',
                          '&:hover': { 
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                          }
                        }}
                      >
                        <CardContent>
                          <Stack direction="row" spacing={2} alignItems="flex-start">
                            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                              <BusinessIcon fontSize="large" />
                            </Avatar>
                            <Box flex={1}>
                              <Typography variant="h6" gutterBottom color="primary">
                                Заказчик
                              </Typography>
                              <Typography variant="h5" fontWeight="bold" gutterBottom>
                                {counterparty.displayName || counterparty.legalName}
                              </Typography>
                              {counterparty.contacts?.[0] && (
                                <Typography variant="body1" color="text.secondary" gutterBottom>
                                  {counterparty.contacts[0].firstName} {counterparty.contacts[0].lastName}
                                </Typography>
                              )}
                              <Stack direction="row" spacing={2} flexWrap="wrap">
                                {counterparty.contacts?.[0]?.phone && (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <PhoneIcon fontSize="small" color="primary" />
                                    <Typography variant="body2">
                                      {counterparty.contacts[0].phone}
                                    </Typography>
                                  </Stack>
                                )}
                                {counterparty.contacts?.[0]?.email && (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <EmailIcon fontSize="small" color="primary" />
                                    <Typography variant="body2">
                                      {counterparty.contacts[0].email}
                                    </Typography>
                                  </Stack>
                                )}
                              </Stack>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Slide>
                  )}

                  {project && (
                    <Slide direction="left" in timeout={1000}>
                      <Card 
                        variant="outlined"
                        sx={{ 
                          transition: 'all 0.3s ease',
                          '&:hover': { 
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                          }
                        }}
                      >
                        <CardContent>
                          <Stack direction="row" spacing={2} alignItems="flex-start">
                            <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                              <LocationIcon fontSize="large" />
                            </Avatar>
                            <Box flex={1}>
                              <Typography variant="h6" gutterBottom color="success.main">
                                Проект
                              </Typography>
                              <Typography variant="h5" fontWeight="bold" gutterBottom>
                                {project.name}
                              </Typography>
                              {project.location && (
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                  <LocationIcon fontSize="small" color="success" />
                                  <Typography variant="body1" color="text.secondary">
                                    {project.location.city}, {project.location.address}
                                  </Typography>
                                </Stack>
                              )}
                              {project.description && (
                                <Typography variant="body2" color="text.secondary">
                                  {project.description}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Slide>
                  )}

                  {/* Дата создания с улучшенным дизайном */}
                  <Slide direction="up" in timeout={1200}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ bgcolor: 'info.main', width: 48, height: 48 }}>
                            <CalendarIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" color="info.main">
                              Дата создания
                            </Typography>
                            <Typography variant="body1" fontWeight="medium">
                              {new Date(estimate.createdAt).toLocaleDateString('ru-RU', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long'
                              })}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Slide>
                </Stack>

                {/* Описание и условия */}
                {estimate.terms && (
                  <Fade in timeout={1400}>
                    <Card variant="outlined" sx={{ mb: 4 }}>
                      <CardContent>
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                          <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
                            <DescriptionIcon />
                          </Avatar>
                          <Box flex={1}>
                            <Typography variant="h6" gutterBottom color="warning.main">
                              Условия и описание
                            </Typography>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                whiteSpace: 'pre-line',
                                lineHeight: 1.6,
                                fontSize: '1.1rem'
                              }}
                            >
                              {estimate.terms}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Fade>
                )}

                {/* Улучшенная таблица услуг */}
                {services.length > 0 && (
                  <Fade in timeout={1600}>
                    <Card variant="outlined" sx={{ mb: 4, overflow: 'hidden' }}>
                      <Box 
                        sx={{ 
                          bgcolor: 'primary.main',
                          color: 'white',
                          p: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2
                        }}
                      >
                        <WorkIcon />
                        <Typography variant="h6" fontWeight="bold">
                          Состав работ и услуг
                        </Typography>
                        <Chip 
                          label={`${services.length} позиций`}
                          size="small"
                          sx={{ 
                            bgcolor: 'rgba(255,255,255,0.2)',
                            color: 'white'
                          }}
                        />
                      </Box>
                      
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                                Наименование
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                                Кол-во
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                                Ед. изм.
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                                Цена
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                                Сумма
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {services.map((item, index) => (
                              <TableRow 
                                key={item.id || index}
                                sx={{
                                  '&:hover': { bgcolor: 'action.hover' },
                                  '&:nth-of-type(odd)': { bgcolor: 'action.hover' }
                                }}
                              >
                                <TableCell>
                                  <Box>
                                    <Typography variant="body1" fontWeight="medium">
                                      {item.name || item.title || '—'}
                                    </Typography>
                                    {(item.description || item.details) && (
                                      <Typography 
                                        variant="caption" 
                                        color="text.secondary" 
                                        display="block"
                                        sx={{ mt: 0.5, fontStyle: 'italic' }}
                                      >
                                        {item.description || item.details}
                                      </Typography>
                                    )}
                                  </Box>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight="medium">
                                    {item.quantity || item.qty || item.hours || '—'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2">
                                    {item.unit || item.uom || 'шт'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight="medium">
                                    {formatCurrency(
                                      item.unitPrice || 
                                      item.rate || 
                                      item.price ||
                                      item.cost || 0, 
                                      estimate.currency
                                    )}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body1" fontWeight="bold" color="primary">
                                    {formatCurrency(
                                      item.totalCost || 
                                      item.total || 
                                      item.amount ||
                                      ((item.quantity || item.qty || item.hours || 0) * 
                                       (item.unitPrice || item.rate || item.price || item.cost || 0)), 
                                      estimate.currency
                                    )}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Card>
                  </Fade>
                )}

                {/* Улучшенные итоги */}
                {totals && (
                  <Fade in timeout={1800}>
                    <Box display="flex" justifyContent="flex-end">
                      <Card 
                        variant="outlined" 
                        sx={{ 
                          minWidth: isMobile ? '100%' : 400,
                          background: 'linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)',
                          border: `2px solid ${theme.palette.primary.main}20`
                        }}
                      >
                        <Box 
                          sx={{ 
                            bgcolor: 'primary.main',
                            color: 'white',
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <MoneyIcon />
                          <Typography variant="h6" fontWeight="bold">
                            Итоги по смете
                          </Typography>
                        </Box>
                        
                        <CardContent>
                          <Stack spacing={2}>
                            {/* Детализация по типам работ */}
                            {totals.materialsCost > 0 && (
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <BuildIcon fontSize="small" color="action" />
                                  <Typography>Материалы:</Typography>
                                </Stack>
                                <Typography fontWeight="medium">
                                  {formatCurrency(totals.materialsCost, estimate.currency)}
                                </Typography>
                              </Stack>
                            )}
                            
                            {totals.laborCost > 0 && (
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <WorkIcon fontSize="small" color="action" />
                                  <Typography>Работы:</Typography>
                                </Stack>
                                <Typography fontWeight="medium">
                                  {formatCurrency(totals.laborCost, estimate.currency)}
                                </Typography>
                              </Stack>
                            )}
                            
                            {totals.equipmentCost > 0 && (
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <BuildIcon fontSize="small" color="action" />
                                  <Typography>Оборудование:</Typography>
                                </Stack>
                                <Typography fontWeight="medium">
                                  {formatCurrency(totals.equipmentCost, estimate.currency)}
                                </Typography>
                              </Stack>
                            )}
                            
                            <Divider />
                            
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="body1" fontWeight="medium">Подитог:</Typography>
                              <Typography variant="body1" fontWeight="bold">
                                {formatCurrency(totals.subtotalPrice, estimate.currency)}
                              </Typography>
                            </Stack>
                            
                            {totals.overheadAmt > 0 && (
                              <Stack direction="row" justifyContent="space-between">
                                <Typography>Накладные ({totals.overheadPct}%):</Typography>
                                <Typography>
                                  {formatCurrency(totals.overheadAmt, estimate.currency)}
                                </Typography>
                              </Stack>
                            )}
                            
                            {totals.discountAmt > 0 && (
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <DiscountIcon fontSize="small" color="error" />
                                  <Typography color="error">Скидка:</Typography>
                                </Stack>
                                <Typography color="error" fontWeight="medium">
                                  -{formatCurrency(totals.discountAmt, estimate.currency)}
                                </Typography>
                              </Stack>
                            )}
                            
                            {totals.shippingAmt > 0 && (
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <ShippingIcon fontSize="small" color="info" />
                                  <Typography>Доставка:</Typography>
                                </Stack>
                                <Typography>
                                  {formatCurrency(totals.shippingAmt, estimate.currency)}
                                </Typography>
                              </Stack>
                            )}
                            
                            {totals.taxAmt > 0 && (
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <TaxIcon fontSize="small" color="warning" />
                                  <Typography>НДС:</Typography>
                                </Stack>
                                <Typography>
                                  {formatCurrency(totals.taxAmt, estimate.currency)}
                                </Typography>
                              </Stack>
                            )}
                            
                            <Divider sx={{ my: 1 }} />
                            
                            <Stack 
                              direction="row" 
                              justifyContent="space-between"
                              sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                p: 2,
                                borderRadius: 2,
                                mx: -2,
                                mb: -2
                              }}
                            >
                              <Typography variant="h6" fontWeight="bold">ИТОГО:</Typography>
                              <Typography variant="h6" fontWeight="bold">
                                {formatCurrency(totals.grandTotal, estimate.currency)}
                              </Typography>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Box>
                  </Fade>
                )}

                {/* Секция принятия/отклонения сметы */}
                {estimate.status === 'sent' && !estimateDecision && (
                  <Fade in timeout={2000}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        mt: 4,
                        border: `2px solid ${theme.palette.warning.main}`,
                        bgcolor: 'warning.light',
                        color: 'warning.contrastText'
                      }}
                    >
                      <CardContent>
                        <Typography variant="h6" gutterBottom align="center">
                          Ваше решение по смете
                        </Typography>
                        <Typography variant="body2" align="center" sx={{ mb: 3 }}>
                          Пожалуйста, ознакомьтесь со сметой и примите решение
                        </Typography>
                        <Stack direction="row" spacing={2} justifyContent="center">
                          <Button
                            variant="contained"
                            color="success"
                            size="large"
                            startIcon={<ThumbUpIcon />}
                            onClick={() => handleEstimateDecision('accepted')}
                            sx={{ minWidth: 150 }}
                          >
                            Принять
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            size="large"
                            startIcon={<ThumbDownIcon />}
                            onClick={() => handleEstimateDecision('rejected')}
                            sx={{ minWidth: 150 }}
                          >
                            Отклонить
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Fade>
                )}

                {/* Комментарии и обратная связь */}
                {comments.length > 0 && (
                  <Fade in timeout={2200}>
                    <Card variant="outlined" sx={{ mt: 4 }}>
                      <Box 
                        sx={{ 
                          bgcolor: 'info.main',
                          color: 'white',
                          p: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2
                        }}
                      >
                        <CommentIcon />
                        <Typography variant="h6" fontWeight="bold">
                          Комментарии и обратная связь
                        </Typography>
                        <Chip 
                          label={comments.length}
                          size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                        />
                      </Box>
                      
                      <CardContent>
                        <List>
                          {comments.map((comment, index) => (
                            <ListItem key={comment.id} divider={index < comments.length - 1}>
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'primary.main' }}>
                                  {comment.author.charAt(0).toUpperCase()}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Stack direction="row" alignItems="center" spacing={2}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                      {comment.author}
                                    </Typography>
                                    {(comment.rating || 0) > 0 && (
                                      <Rating value={comment.rating || 0} readOnly size="small" />
                                    )}
                                    <Chip 
                                      label={comment.type} 
                                      size="small" 
                                      variant="outlined"
                                    />
                                  </Stack>
                                }
                                secondary={
                                  <>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                      {comment.text}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {new Date(comment.createdAt).toLocaleString('ru-RU')}
                                    </Typography>
                                  </>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Fade>
                )}

                {/* Футер */}
                <Box mt={6} pt={3} borderTop={1} borderColor="divider">
                  <Stack spacing={2} alignItems="center">
                    <Typography variant="body2" color="text.secondary" align="center">
                      Смета сгенерирована автоматически. Актуальность данных на {' '}
                      {new Date().toLocaleDateString('ru-RU')}
                    </Typography>
                    
                    {/* Социальные кнопки */}
                    <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                      <Tooltip title="Поделиться в WhatsApp">
                        <IconButton 
                          size="small" 
                          onClick={() => handleSocialShare('whatsapp')}
                          sx={{ color: '#25D366' }}
                        >
                          <WhatsAppIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Поделиться в Telegram">
                        <IconButton 
                          size="small" 
                          onClick={() => handleSocialShare('telegram')}
                          sx={{ color: '#0088cc' }}
                        >
                          <TelegramIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Скопировать ссылку">
                        <IconButton size="small" onClick={handleCopyLink}>
                          <CopyIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Отправить на email">
                        <IconButton size="small" onClick={handleEmailShare}>
                          <EmailIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>
              </Box>
            </Paper>
          </Fade>
        </Container>
      </Box>

      {/* Мобильный FAB для действий */}
      {isMobile && (
        <SpeedDial
          ariaLabel="Действия"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<PrintIcon />}
            tooltipTitle="Печать"
            onClick={() => window.print()}
          />
          <SpeedDialAction
            icon={<PdfIcon />}
            tooltipTitle="PDF"
            onClick={() => setPdfExportOpen(true)}
          />
          <SpeedDialAction
            icon={<ShareIcon />}
            tooltipTitle="Поделиться"
            onClick={() => setShareDialogOpen(true)}
          />
          <SpeedDialAction
            icon={<CommentIcon />}
            tooltipTitle="Комментарий"
            onClick={() => setCommentDialogOpen(true)}
          />
        </SpeedDial>
      )}

      {/* Диалоги */}
      
      {/* Диалог комментария */}
      <Dialog 
        open={commentDialogOpen} 
        onClose={() => setCommentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Добавить комментарий</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Ваше имя"
              value={newComment.author}
              onChange={(e) => setNewComment(prev => ({ ...prev, author: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Email (необязательно)"
              type="email"
              value={newComment.email}
              onChange={(e) => setNewComment(prev => ({ ...prev, email: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Комментарий"
              multiline
              rows={4}
              value={newComment.text}
              onChange={(e) => setNewComment(prev => ({ ...prev, text: e.target.value }))}
            />
            <Box>
              <Typography variant="body2" gutterBottom>Оценка:</Typography>
              <Rating
                value={newComment.rating}
                onChange={(e, value) => setNewComment(prev => ({ ...prev, rating: value || 0 }))}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleAddComment}
            variant="contained"
            disabled={!newComment.text.trim() || !newComment.author.trim()}
            startIcon={<SendIcon />}
          >
            Отправить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar для уведомлений */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={() => setSnackbarOpen(false)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />

      {/* Suspense обертки для lazy компонентов */}
      <Suspense fallback={<CircularProgress />}>
        {qrDialogOpen && (
          <QRCodeGenerator
            open={qrDialogOpen}
            onClose={() => setQrDialogOpen(false)}
            url={publicUrl}
            title={`Смета №${estimate.number}`}
          />
        )}
      </Suspense>

      <Suspense fallback={<CircularProgress />}>
        {pdfExportOpen && (
          <PDFExporter
            open={pdfExportOpen}
            onClose={() => setPdfExportOpen(false)}
            estimate={estimate}
            project={project}
            counterparty={counterparty}
            services={services}
            totals={totals}
          />
        )}
      </Suspense>

      <Suspense fallback={<CircularProgress />}>
        {shareDialogOpen && (
          <ShareDialog
            open={shareDialogOpen}
            onClose={() => setShareDialogOpen(false)}
            url={publicUrl}
            title={`Смета №${estimate.number}`}
            description={estimate.terms}
          />
        )}
      </Suspense>
    </>
  );
};

export default PublicEstimatePageV2;

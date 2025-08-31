/**
 * Публичная страница сметы для клиентов
 * Обновлена для работы с новой системой смет V2
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
} from '@mui/icons-material';

import { db } from '../firebase/firebase';
import { 
  collection, 
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { Estimate } from '../types/estimate.types';
import { Project } from '../types/project.types';
import { Counterparty } from '../types/counterparty.types';

const PublicEstimatePage: React.FC = () => {
  const { estimateId } = useParams<{ estimateId: string }>();
  
  const [estimate, setEstimate] = useState<any>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [counterparty, setCounterparty] = useState<Counterparty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchEstimate = async () => {
      if (!estimateId) {
        setError('ID сметы не указан');
        setLoading(false);
        return;
      }

      try {
        console.log('Searching for estimate ID:', estimateId);
        
        // Ищем смету среди всех пользователей в обеих коллекциях
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        
        let foundEstimate: Estimate | null = null;
        let estimateOwnerId: string | null = null;

        console.log('Checking', usersSnapshot.docs.length, 'users');

        for (const userDoc of usersSnapshot.docs) {
          console.log(`Checking user: ${userDoc.id}`);
          
          // Проверяем сначала новую коллекцию estimatesV2
          try {
            const estimateDocV2 = await getDoc(doc(db, 'users', userDoc.id, 'estimatesV2', estimateId));
            if (estimateDocV2.exists()) {
              console.log('Found estimate in estimatesV2 collection');
              foundEstimate = { id: estimateDocV2.id, ...estimateDocV2.data() } as Estimate;
              estimateOwnerId = userDoc.id;
              break;
            }
          } catch (error) {
            console.error(`Error checking estimatesV2 for user ${userDoc.id}:`, error);
          }
          
          // Если не найдено в V2, проверяем старую коллекцию estimates  
          try {
            const estimateDoc = await getDoc(doc(db, 'users', userDoc.id, 'estimates', estimateId));
            if (estimateDoc.exists()) {
              console.log('Found estimate in estimates collection');
              foundEstimate = { id: estimateDoc.id, ...estimateDoc.data() } as Estimate;
              estimateOwnerId = userDoc.id;
              break;
            }
          } catch (error) {
            console.error(`Error checking estimates for user ${userDoc.id}:`, error);
          }
        }

        if (!foundEstimate) {
          console.log('Estimate not found in any collection');
          setError('Смета не найдена или недоступна для публичного просмотра');
          setLoading(false);
          return;
        }

        console.log('Found estimate:', foundEstimate);

        setEstimate(foundEstimate);

        // Загружаем связанные данные
        if (foundEstimate.projectId && estimateOwnerId) {
          try {
            const projectDoc = await getDoc(doc(db, 'users', estimateOwnerId, 'projects', foundEstimate.projectId));
            if (projectDoc.exists()) {
              setProject({ id: projectDoc.id, ...projectDoc.data() } as Project);
            }
          } catch (error) {
            console.error('Error loading project:', error);
          }
        }

        if (foundEstimate.counterpartyId && estimateOwnerId) {
          try {
            const counterpartyDoc = await getDoc(doc(db, 'users', estimateOwnerId, 'counterparties', foundEstimate.counterpartyId));
            if (counterpartyDoc.exists()) {
              setCounterparty({ id: counterpartyDoc.id, ...counterpartyDoc.data() } as Counterparty);
            }
          } catch (error) {
            console.error('Error loading counterparty:', error);
          }
        }

      } catch (error) {
        console.error('Error fetching estimate:', error);
        setError('Произошла ошибка при загрузке сметы');
      } finally {
        setLoading(false);
      }
    };

    fetchEstimate();
  }, [estimateId]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'accepted':
        return { icon: <AcceptedIcon />, color: 'success', label: 'Принята' };
      case 'sent':
        return { icon: <PendingIcon />, color: 'info', label: 'Отправлена' };
      case 'rejected':
        return { icon: <RejectedIcon />, color: 'error', label: 'Отклонена' };
      default:
        return { icon: <PendingIcon />, color: 'warning', label: 'Черновик' };
    }
  };

  const getServicesFromBlocks = (estimate: any): any[] => {
    // Для новой структуры V2
    if (estimate.blocks) {
      const servicesBlock = estimate.blocks.find((block: any) => block.key === 'services');
      return (servicesBlock?.data as any)?.items || [];
    }
    
    // Для старой структуры - прямо в estimate.items
    if (estimate.items && Array.isArray(estimate.items)) {
      return estimate.items;
    }
    
    return [];
  };

  const formatCurrency = (amount: number, currency: string = 'RUB') => {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽';
    return `${amount.toLocaleString('ru-RU')} ${symbol}`;
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="#f5f5f5"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3} bgcolor="#f5f5f5" minHeight="100vh">
        <Container maxWidth="md">
          <Alert severity="error" sx={{ mt: 4 }}>
            {error}
          </Alert>
        </Container>
      </Box>
    );
  }

  if (!estimate) {
    return (
      <Box p={3} bgcolor="#f5f5f5" minHeight="100vh">
        <Container maxWidth="md">
          <Alert severity="warning" sx={{ mt: 4 }}>
            Смета не найдена
          </Alert>
        </Container>
      </Box>
    );
  }

  const statusInfo = getStatusInfo(estimate.status);
  const services = getServicesFromBlocks(estimate);

  return (
    <Box bgcolor="#f5f5f5" minHeight="100vh" py={4}>
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Заголовок */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
            <Box>
              <Typography variant="h3" gutterBottom>
                Смета №{estimate.number}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip
                  icon={statusInfo.icon}
                  label={statusInfo.label}
                  color={statusInfo.color as any}
                  size="medium"
                />
                {estimate.validUntil && (
                  <Typography variant="body2" color="text.secondary">
                    Действительна до: {new Date(estimate.validUntil).toLocaleDateString('ru-RU')}
                  </Typography>
                )}
              </Stack>
            </Box>
            
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={() => window.print()}
              >
                Печать
              </Button>
              <Button
                variant="contained"
                startIcon={<PdfIcon />}
                color="primary"
              >
                PDF
              </Button>
            </Stack>
          </Box>

          {/* Информационные блоки */}
          <Stack spacing={3} sx={{ mb: 4 }}>
            {/* Клиент */}
            {counterparty && (
              <Box>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <BusinessIcon />
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="h6" gutterBottom>
                          Заказчик
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {counterparty.displayName || counterparty.legalName}
                        </Typography>
                        {counterparty.contacts?.[0] && (
                          <Typography variant="body2" color="text.secondary">
                            {counterparty.contacts[0].firstName} {counterparty.contacts[0].lastName}
                          </Typography>
                        )}
                        {counterparty.contacts?.[0]?.phone && (
                          <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                            <PhoneIcon fontSize="small" />
                            <Typography variant="body2">
                              {counterparty.contacts[0].phone}
                            </Typography>
                          </Stack>
                        )}
                        {counterparty.contacts?.[0]?.email && (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <EmailIcon fontSize="small" />
                            <Typography variant="body2">
                              {counterparty.contacts[0].email}
                            </Typography>
                          </Stack>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Проект */}
            {project && (
              <Box>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <LocationIcon />
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="h6" gutterBottom>
                          Проект
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {project.name}
                        </Typography>
                        {project.location && (
                          <Typography variant="body2" color="text.secondary">
                            {project.location.city}, {project.location.address}
                          </Typography>
                        )}
                        {project.description && (
                          <Typography variant="body2" color="text.secondary" mt={1}>
                            {project.description}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Дата создания */}
            <Box>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <CalendarIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        Дата создания
                      </Typography>
                      <Typography variant="body1">
                        {new Date(estimate.createdAt).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Stack>

          {/* Описание */}
          {estimate.terms && (
            <Card variant="outlined" sx={{ mb: 4 }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <DescriptionIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Условия и описание
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                      {estimate.terms}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Таблица услуг */}
          {services.length > 0 && (
            <Card variant="outlined" sx={{ mb: 4 }}>
              <CardContent sx={{ p: 0 }}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight="bold">
                            Наименование
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight="bold">
                            Количество
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight="bold">
                            Ед. изм.
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight="bold">
                            Цена
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight="bold">
                            Сумма
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {services.map((item, index) => (
                        <TableRow key={item.id || index}>
                          <TableCell>
                            <Typography variant="body2">
                              {item.name}
                            </Typography>
                            {item.description && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {item.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {(item as any).quantity || ''}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {item.unit || ''}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {formatCurrency(
                                (item as any).unitPrice || 
                                (item as any).rate || 0, 
                                estimate.currency
                              )}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(
                                (item as any).totalCost || 
                                (item as any).total || 0, 
                                estimate.currency
                              )}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Итоги */}
          <Box display="flex" justifyContent="flex-end">
            <Card variant="outlined" sx={{ minWidth: 350 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Подитог:</Typography>
                    <Typography>
                      {formatCurrency(
                        estimate.totals?.subtotalPrice || 
                        estimate.subtotal || 0, 
                        estimate.currency
                      )}
                    </Typography>
                  </Box>
                  
                  {((estimate.totals?.discountAmt && estimate.totals.discountAmt > 0) ||
                    (estimate.discountRate && estimate.discountRate > 0)) && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography color="error">Скидка:</Typography>
                      <Typography color="error">
                        -{formatCurrency(
                          estimate.totals?.discountAmt || 
                          ((estimate.subtotal * (estimate.discountRate || 0)) / 100) || 0, 
                          estimate.currency
                        )}
                      </Typography>
                    </Box>
                  )}
                  
                  {((estimate.totals?.taxAmt && estimate.totals.taxAmt > 0) ||
                    (estimate.taxRate && estimate.taxRate > 0)) && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography>Налог:</Typography>
                      <Typography>
                        {formatCurrency(
                          estimate.totals?.taxAmt || 
                          (((estimate.subtotal * (1 - (estimate.discountRate || 0) / 100)) * (estimate.taxRate || 0)) / 100) || 0, 
                          estimate.currency
                        )}
                      </Typography>
                    </Box>
                  )}
                  
                  <Divider />
                  
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="h6">Итого:</Typography>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      {formatCurrency(
                        estimate.totals?.grandTotal || 
                        estimate.total || 0, 
                        estimate.currency
                      )}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          {/* Футер */}
          <Box mt={4} pt={3} borderTop={1} borderColor="divider">
            <Typography variant="body2" color="text.secondary" align="center">
              Смета сгенерирована автоматически. Актуальность данных на {new Date().toLocaleDateString('ru-RU')}
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default PublicEstimatePage;
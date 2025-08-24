import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Estimate, EstimateItem } from '../api/estimateApi';
import { Box, Typography, Card, CardContent, Divider, CircularProgress, Alert, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import { Business as BusinessIcon, Description as DescriptionIcon, CalendarToday as CalendarIcon, Percent as PercentIcon } from '@mui/icons-material';

const PublicEstimatePage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchEstimate = async () => {
      if (!shareToken) {
        setError('Неверная ссылка для шаринга.');
        setLoading(false);
        return;
      }
      
      try {
        // Сначала пробуем быстрый путь: коллекция publicEstimates
        const publicRef = doc(db, 'publicEstimates', shareToken);
        const pubSnap = await getDoc(publicRef);
        if (pubSnap.exists()) {
          const data = pubSnap.data() as any;
          if (data.shareExpiresAt && data.shareExpiresAt.toDate && data.shareExpiresAt.toDate() < new Date()) {
            setError('Срок действия этой ссылки истек.');
            setEstimate(null);
          } else {
            setEstimate(data as Estimate);
          }
          setLoading(false);
          return;
        }

        // Fallback: прежний обход пользователей
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        let foundEstimate: Estimate | null = null;
        for (const userDoc of usersSnapshot.docs) {
          const estimatesCollection = collection(db, 'users', userDoc.id, 'estimates');
          const q = query(estimatesCollection, where('shareToken', '==', shareToken));
          const estimateSnapshot = await getDocs(q);
          if (!estimateSnapshot.empty) {
            const d = estimateSnapshot.docs[0];
            const data = d.data() as any;
            if (data.shareExpiresAt && data.shareExpiresAt.toDate && data.shareExpiresAt.toDate() < new Date()) {
              setError('Срок действия этой ссылки истек.');
              setEstimate(null);
            } else {
              foundEstimate = { ...data, id: d.id } as Estimate;
            }
            break;
          }
        }
        if (foundEstimate) setEstimate(foundEstimate);
        else if (!error) setError('Эстимейт не найден или ссылка недействительна.');
      } catch (e) {
        console.error("Ошибка при загрузке эстимейта:", e);
        setError('Произошла ошибка при загрузке данных.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEstimate();
  }, [shareToken, error]);
  
  const renderItems = (items: EstimateItem[]) => {
    return items.map(item => (
      <React.Fragment key={item.id}>
        <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
          <TableCell>{item.name}</TableCell>
          <TableCell align="right">{item.quantity}</TableCell>
          <TableCell align="right">{item.unit}</TableCell>
          <TableCell align="right">{(item as any).rate?.toFixed(2)} {estimate ? (estimate.currency === 'USD' ? '$' : estimate.currency === 'EUR' ? '€' : '₽') : '₽'}</TableCell>
          <TableCell align="right">{item.total.toFixed(2)} {estimate ? (estimate.currency === 'USD' ? '$' : estimate.currency === 'EUR' ? '€' : '₽') : '₽'}</TableCell>
        </TableRow>
      </React.Fragment>
    ));
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="100vh"><CircularProgress /></Box>;
  if (error) return <Box p={3}><Alert severity="error">{error}</Alert></Box>;
  if (!estimate) return <Box p={3}><Alert severity="warning">Эстимейт не найден.</Alert></Box>;

  return (
    <Box p={3} bgcolor="#f5f5f5" minHeight="100vh">
      <Paper sx={{ p: 4, maxWidth: '900px', margin: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Эстимейт #{estimate.number}
        </Typography>
        <Typography variant="h6" color="textSecondary" mb={3}>
          {estimate.name}
        </Typography>
        
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom><BusinessIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Заказчик</Typography>
                <Typography>{(estimate as any).contractorName || 'Не указан'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom><CalendarIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Дата</Typography>
                <Typography>{(estimate as any).createdAt ? (estimate as any).createdAt.toDate().toLocaleDateString('ru-RU') : 'Не указана'}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {estimate.description && (
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom><DescriptionIcon sx={{ verticalAlign: 'middle', mr: 1 }} />Описание</Typography>
            <Typography variant="body1">{estimate.description}</Typography>
          </Box>
        )}
        
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Наименование</TableCell>
                <TableCell align="right">Кол-во</TableCell>
                <TableCell align="right">Ед. изм.</TableCell>
                <TableCell align="right">Ставка</TableCell>
                <TableCell align="right">Сумма</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {renderItems(estimate.items.filter(item => !(item as any).parentId))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Box mt={3} display="flex" justifyContent="flex-end">
          <Box width="300px">
            <Grid container spacing={1}>
              <Grid item xs={6}><Typography>Подитог:</Typography></Grid>
              <Grid item xs={6}><Typography align="right">{estimate.subtotal.toFixed(2)} ₽</Typography></Grid>
              
              {estimate.discountRate && (
                <>
                  <Grid item xs={6}><Typography><PercentIcon sx={{ fontSize: 'small' }} /> Скидка ({estimate.discountRate}%):</Typography></Grid>
                  <Grid item xs={6}><Typography align="right">- {((estimate.subtotal * estimate.discountRate) / 100).toFixed(2)} ₽</Typography></Grid>
                </>
              )}
              
              {estimate.taxRate && (
                <>
                  <Grid item xs={6}><Typography><PercentIcon sx={{ fontSize: 'small' }} /> Налог ({estimate.taxRate}%):</Typography></Grid>
                  <Grid item xs={6}><Typography align="right">+ {(((estimate.subtotal * (1 - (estimate.discountRate || 0) / 100)) * estimate.taxRate) / 100).toFixed(2)} ₽</Typography></Grid>
                </>
              )}
              
              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
              
              <Grid item xs={6}><Typography variant="h6">Итого:</Typography></Grid>
              <Grid item xs={6}><Typography variant="h6" align="right">{estimate.total.toFixed(2)} {estimate.currency === 'USD' ? '$' : estimate.currency === 'EUR' ? '€' : '₽'}</Typography></Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default PublicEstimatePage;

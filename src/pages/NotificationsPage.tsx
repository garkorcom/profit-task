import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Card, CardContent, Chip, Table, TableHead, TableRow, TableCell, TableBody, FormControl, InputLabel, Select, MenuItem, Button, TextField, Alert } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { Notification, NotificationChannel, NotificationStatus, NotificationType, getNotificationsStream, sendNotification, getMessengerIntegration } from '../api/notificationApi';
import { Product, getCriticalStockProducts } from '../api/productApi';

const NotificationsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [list, setList] = useState<Notification[]>();
  const [type, setType] = useState<NotificationType | ''>('');
  const [channel, setChannel] = useState<NotificationChannel | ''>('');
  const [status, setStatus] = useState<NotificationStatus | ''>('');
  const [critical, setCritical] = useState<Product[]>([]);
  const [notify, setNotify] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const [telegramReady, setTelegramReady] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = getNotificationsStream(currentUser.uid, { type: type || undefined, channel: channel || undefined, status: status || undefined }, (data) => setList(data));
    const unsubCrit = getCriticalStockProducts(currentUser.uid, setCritical);
    (async () => {
      const integration = await getMessengerIntegration(currentUser.uid, 'telegram');
      setTelegramReady(!!integration && !!integration.isActive && !!integration.telegramBotToken);
    })();
    return () => { unsub(); unsubCrit(); };
  }, [currentUser, type, channel, status]);

  const sendCriticalAlerts = async (to: 'system' | 'telegram' = 'system') => {
    if (!currentUser) return;
    try {
      if (!critical.length) { setNotify({ open: true, message: 'Критических остатков нет', severity: 'info' }); return; }
      for (const p of critical) {
        await sendNotification(currentUser.uid, {
          type: 'system',
          channel: to,
          recipientId: currentUser.uid,
          recipientType: 'employee',
          recipientName: currentUser.email || 'Вы',
          subject: 'Критический остаток',
          message: `Критический остаток: ${p.name}. Доступно: ${(p.availableStock ?? (p.currentStock - (p.reservedStock || 0))) || 0} ${p.unit}. Минимум: ${p.minStock || 0}`,
          status: 'pending'
        });
      }
      setNotify({ open: true, message: `Разослано уведомлений: ${critical.length}${to === 'telegram' ? ' (Telegram)' : ''}`, severity: 'success' });
    } catch (e: any) {
      setNotify({ open: true, message: e.message || 'Ошибка рассылки', severity: 'error' });
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Уведомления</Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={() => sendCriticalAlerts('system')}>Разослать (системно)</Button>
          <Button variant="outlined" disabled={!telegramReady} onClick={() => sendCriticalAlerts('telegram')}>Разослать в Telegram</Button>
        </Box>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Тип</InputLabel>
              <Select value={type} label="Тип" onChange={(e) => setType(e.target.value as any)}>
                <MenuItem value=""><em>Любой</em></MenuItem>
                <MenuItem value="task">Задача</MenuItem>
                <MenuItem value="document">Документ</MenuItem>
                <MenuItem value="reminder">Напоминание</MenuItem>
                <MenuItem value="system">Система</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Канал</InputLabel>
              <Select value={channel} label="Канал" onChange={(e) => setChannel(e.target.value as any)}>
                <MenuItem value=""><em>Любой</em></MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="telegram">Telegram</MenuItem>
                <MenuItem value="whatsapp">WhatsApp</MenuItem>
                <MenuItem value="system">Системный</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Статус</InputLabel>
              <Select value={status} label="Статус" onChange={(e) => setStatus(e.target.value as any)}>
                <MenuItem value=""><em>Любой</em></MenuItem>
                <MenuItem value="pending">В очереди</MenuItem>
                <MenuItem value="sent">Отправлено</MenuItem>
                <MenuItem value="delivered">Доставлено</MenuItem>
                <MenuItem value="read">Прочитано</MenuItem>
                <MenuItem value="failed">Ошибка</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {!list || list.length === 0 ? (
            <Typography color="text.secondary">Нет уведомлений</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Дата</TableCell>
                  <TableCell>Получатель</TableCell>
                  <TableCell>Канал</TableCell>
                  <TableCell>Тип</TableCell>
                  <TableCell>Тема</TableCell>
                  <TableCell>Статус</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map(n => (
                  <TableRow key={n.id}>
                    <TableCell>{(n.createdAt as any)?.toDate?.()?.toLocaleString?.('en-US') || ''}</TableCell>
                    <TableCell>{n.recipientName || n.recipientId}</TableCell>
                    <TableCell>{n.channel}</TableCell>
                    <TableCell>{n.type}</TableCell>
                    <TableCell>{n.subject || n.message?.slice(0,80)}</TableCell>
                    <TableCell>{n.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {notify.open && (
        <Box mt={2}><Alert severity={notify.severity} onClose={()=>setNotify({...notify, open:false})}>{notify.message}</Alert></Box>
      )}
    </Box>
  );
};

export default NotificationsPage;



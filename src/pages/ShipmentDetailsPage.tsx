import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, TextField, Button, Chip, Alert } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ShipmentOrder, getShipmentStream, shipLinesPartial } from '../api/shipmentApi';

const ShipmentDetailsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<ShipmentOrder | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notify, setNotify] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!currentUser || !shipmentId) return;
    const unsub = getShipmentStream(currentUser.uid, shipmentId, setShipment);
    return () => unsub();
  }, [currentUser, shipmentId]);

  const pendingMap = useMemo(() => {
    const map: Record<string, number> = {};
    (shipment?.lines || []).forEach(l => {
      const shipped = l.shippedQuantity || 0;
      map[l.productId] = Math.max(0, l.quantity - shipped);
    });
    return map;
  }, [shipment]);

  const submitPartial = async () => {
    if (!currentUser || !shipment) return;
    try {
      const toShip = Object.entries(quantities)
        .map(([productId, qty]) => ({ productId, quantity: Number(qty) || 0 }))
        .filter(i => i.quantity > 0);
      if (toShip.length === 0) { setNotify({ open: true, message: 'Укажите количество для отгрузки', severity: 'warning' }); return; }
      await shipLinesPartial(currentUser.uid, shipment, toShip);
      setQuantities({});
      setNotify({ open: true, message: 'Отгрузка выполнена', severity: 'success' });
    } catch (e: any) {
      setNotify({ open: true, message: e.message || 'Ошибка отгрузки', severity: 'error' });
    }
  };

  if (!shipment) return <Typography>Загрузка...</Typography>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Реализация {shipment.number}</Typography>
        <Chip label={shipment.status} color={shipment.status === 'completed' ? 'success' : shipment.status === 'shipped' ? 'primary' : shipment.status === 'pending' ? 'default' : 'error'} />
      </Box>

      <Card>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Товар</TableCell>
                <TableCell align="right">Заказано</TableCell>
                <TableCell align="right">Уже отгружено</TableCell>
                <TableCell align="right">Осталось</TableCell>
                <TableCell align="right">Отгрузить</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(shipment.lines || []).map(l => {
                const shipped = l.shippedQuantity || 0;
                const remain = Math.max(0, l.quantity - shipped);
                return (
                  <TableRow key={l.productId}>
                    <TableCell>{l.productName}</TableCell>
                    <TableCell align="right">{l.quantity}</TableCell>
                    <TableCell align="right">{shipped}</TableCell>
                    <TableCell align="right">{remain}</TableCell>
                    <TableCell align="right" style={{ width: 140 }}>
                      <TextField
                        type="number"
                        size="small"
                        inputProps={{ min: 0, max: remain }}
                        value={quantities[l.productId] ?? ''}
                        onChange={(e) => setQuantities(prev => ({ ...prev, [l.productId]: Number(e.target.value) }))}
                        placeholder="0"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Box mt={2} display="flex" gap={1}>
            <Button variant="contained" onClick={submitPartial} disabled={shipment.status === 'completed' || shipment.status === 'cancelled'}>
              Отгрузить выбранное
            </Button>
            <Button onClick={() => navigate('/shipments')}>Назад к списку</Button>
          </Box>
        </CardContent>
      </Card>

      {notify.open && (
        <Box mt={2}><Alert severity={notify.severity} onClose={()=>setNotify({...notify, open:false})}>{notify.message}</Alert></Box>
      )}
    </Box>
  );
};

export default ShipmentDetailsPage;



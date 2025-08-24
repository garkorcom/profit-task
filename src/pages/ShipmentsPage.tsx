import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Button, Chip, Alert } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { ShipmentOrder, getShipmentOrdersStream, performShipmentWriteOff, updateShipmentStatus } from '../api/shipmentApi';
import { getWarehousesStream, Warehouse } from '../api/inventoryApi';
// import { useNavigate } from 'react-router-dom';

const ShipmentsPage: React.FC = () => {
  const { currentUser } = useAuth();
  // const navigate = useNavigate();
  const [shipments, setShipments] = useState<ShipmentOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [notify, setNotify] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!currentUser) return;
    const unsub = getShipmentOrdersStream(currentUser.uid, setShipments);
    const unsubW = getWarehousesStream(currentUser.uid, setWarehouses);
    return () => { unsub(); unsubW(); };
  }, [currentUser]);

  const doWriteOff = async (s: ShipmentOrder) => {
    if (!currentUser) return;
    try {
      await performShipmentWriteOff(currentUser.uid, s, s.estimateId);
      await updateShipmentStatus(currentUser.uid, s.id, 'completed', { estimateId: s.estimateId });
      setNotify({ open: true, message: 'Отгрузка проведена', severity: 'success' });
    } catch (e: any) {
      setNotify({ open: true, message: e.message || 'Ошибка проведения', severity: 'error' });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Реализации / Отгрузки</Typography>
      </Box>

      <Card>
        <CardContent>
          {shipments.length === 0 ? (
            <Typography color="text.secondary">Документов отгрузки пока нет</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Номер</TableCell>
                  <TableCell>Склад</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell align="right">Позиций</TableCell>
                  <TableCell>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shipments.map(s => (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.number || s.id.slice(-6)}</TableCell>
                    <TableCell>{warehouses.find(w => w.id === s.warehouseId)?.name || s.warehouseId}</TableCell>
                    <TableCell>{s.status === 'completed' ? <Chip size="small" color="success" label="Завершен" /> : s.status === 'shipped' ? <Chip size="small" color="primary" label="Отгружен" /> : s.status === 'pending' ? <Chip size="small" label="Ожидает" /> : <Chip size="small" color="error" label="Отменен" />}</TableCell>
                    <TableCell align="right">{s.lines?.length || 0}</TableCell>
                    <TableCell>
                      {s.status === 'pending' && (
                        <Button size="small" variant="contained" onClick={() => doWriteOff(s)}>Провести отгрузку</Button>
                      )}
                    </TableCell>
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

export default ShipmentsPage;



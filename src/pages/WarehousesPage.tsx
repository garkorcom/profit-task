import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Button, Card, CardContent, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Chip, Alert, IconButton } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { Warehouse, getWarehousesStream, addWarehouse, updateWarehouse, getStockLevelsStream, getInventoryTransactionsStream, StockLevel, InventoryTransaction } from '../api/inventoryApi';
import { Product, getProductsStream } from '../api/productApi';

const WarehousesPage: React.FC = () => {
  const { currentUser } = useAuth();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [levels, setLevels] = useState<StockLevel[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<Partial<Warehouse>>({ name: '', address: '', isActive: true });
  const [notify, setNotify] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });
  const [productFilter, setProductFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Maps for quick lookup
  const productById = useMemo(() => {
    const map: Record<string, Product> = {};
    products.forEach(p => { map[p.id] = p; });
    return map;
  }, [products]);

  useEffect(() => {
    if (!currentUser) return;
    const unsubW = getWarehousesStream(currentUser.uid, setWarehouses);
    const unsubP = getProductsStream(currentUser.uid, setProducts);
    return () => { unsubW(); unsubP(); };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    // Stock levels filtered by selected warehouse (or all)
    const unsubL = getStockLevelsStream(currentUser.uid, setLevels, selectedWarehouseId ? { warehouseId: selectedWarehouseId } : undefined);
    const unsubT = getInventoryTransactionsStream(currentUser.uid, setTransactions, selectedWarehouseId ? { warehouseId: selectedWarehouseId } : undefined);
    return () => { unsubL(); unsubT(); };
  }, [currentUser, selectedWarehouseId]);

  const filteredTransactions = transactions.filter(t => {
    if (productFilter && t.productId !== productFilter) return false;
    const ts = (t.createdAt as any)?.toDate?.()?.getTime?.() || 0;
    const fromOk = !dateFrom || ts >= new Date(dateFrom).getTime();
    const toOk = !dateTo || ts <= new Date(dateTo).getTime() + 86399999;
    return fromOk && toOk;
  });

  const exportCsv = () => {
    const rows = [
      ['Дата', 'Товар', 'Тип', 'Склад', 'Кол-во', 'Комментарий'] as string[],
      ...filteredTransactions.map(t => [
        (t.createdAt as any)?.toDate?.()?.toLocaleString?.('en-US') || '',
        productById[t.productId]?.name || t.productId,
        t.type,
        warehouses.find(w => w.id === t.warehouseId)?.name || t.warehouseId,
        String(t.quantity),
        t.comment || ''
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movements_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', address: '', isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (w: Warehouse) => {
    setEditing(w);
    setForm(w);
    setDialogOpen(true);
  };

  const saveWarehouse = async () => {
    if (!currentUser) return;
    if (!form.name) { setNotify({ open: true, message: 'Укажите название склада', severity: 'warning' }); return; }
    try {
      if (editing) {
        await updateWarehouse(currentUser.uid, editing.id, { name: form.name!, address: form.address, isActive: form.isActive });
        setNotify({ open: true, message: 'Склад обновлён', severity: 'success' });
      } else {
        await addWarehouse(currentUser.uid, { name: form.name!, address: form.address, isActive: form.isActive });
        setNotify({ open: true, message: 'Склад создан', severity: 'success' });
      }
      setDialogOpen(false);
    } catch (e: any) {
      setNotify({ open: true, message: e.message || 'Ошибка сохранения', severity: 'error' });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Склады</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>Новый склад</Button>
      </Box>

      {/* Warehouses list */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {warehouses.length === 0 ? (
            <Typography color="text.secondary">Складов пока нет</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Адрес</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {warehouses.map(w => (
                  <TableRow key={w.id} hover>
                    <TableCell>{w.name}</TableCell>
                    <TableCell>{w.address || '-'}</TableCell>
                    <TableCell>{w.isActive ? <Chip size="small" color="success" label="Активен" /> : <Chip size="small" label="Выключен" />}</TableCell>
                    <TableCell align="right">
                      <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(w)}>Редактировать</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stock levels */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h5">Остатки</Typography>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Склад</InputLabel>
          <Select value={selectedWarehouseId} label="Склад" onChange={(e) => setSelectedWarehouseId(e.target.value)}>
            <MenuItem value=""><em>Все склады</em></MenuItem>
            {warehouses.map(w => (<MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>))}
          </Select>
        </FormControl>
      </Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {levels.length === 0 ? (
            <Typography color="text.secondary">Данных по остаткам нет</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Товар</TableCell>
                  <TableCell>Склад</TableCell>
                  <TableCell align="right">Количество</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {levels.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>{productById[l.productId]?.name || l.productId}</TableCell>
                    <TableCell>{warehouses.find(w => w.id === l.warehouseId)?.name || l.warehouseId}</TableCell>
                    <TableCell align="right">{l.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Transactions */}
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" gutterBottom>Движение товаров</Typography>
        <Box display="flex" gap={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Товар</InputLabel>
            <Select value={productFilter} label="Товар" onChange={(e) => setProductFilter(e.target.value)}>
              <MenuItem value=""><em>Все</em></MenuItem>
              {products.map(p => (<MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>))}
            </Select>
          </FormControl>
          <TextField type="date" size="small" label="С" InputLabelProps={{ shrink: true }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <TextField type="date" size="small" label="По" InputLabelProps={{ shrink: true }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <IconButton onClick={exportCsv} title="Экспорт CSV"><DownloadIcon /></IconButton>
        </Box>
      </Box>
      <Card>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <Typography color="text.secondary">Нет движений</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Дата</TableCell>
                  <TableCell>Товар</TableCell>
                  <TableCell>Тип</TableCell>
                  <TableCell>Склад</TableCell>
                  <TableCell align="right">Кол-во</TableCell>
                  <TableCell>Комментарий</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{(t.createdAt as any)?.toDate?.()?.toLocaleString?.('en-US') || ''}</TableCell>
                    <TableCell>{productById[t.productId]?.name || t.productId}</TableCell>
                    <TableCell>{t.type}</TableCell>
                    <TableCell>{warehouses.find(w => w.id === t.warehouseId)?.name || t.warehouseId}</TableCell>
                    <TableCell align="right">{t.quantity}</TableCell>
                    <TableCell>{t.comment || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Редактировать склад' : 'Новый склад'}</DialogTitle>
        <DialogContent>
          <TextField label="Название" value={form.name || ''} onChange={(e)=>setForm({...form, name: e.target.value})} fullWidth sx={{ mt: 1 }} />
          <TextField label="Адрес" value={form.address || ''} onChange={(e)=>setForm({...form, address: e.target.value})} fullWidth sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={saveWarehouse}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      {notify.open && (
        <Box mt={2}><Alert severity={notify.severity} onClose={()=>setNotify({...notify, open:false})}>{notify.message}</Alert></Box>
      )}
    </Box>
  );
};

export default WarehousesPage;



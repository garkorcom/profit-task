import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Chip, Alert } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, PostAdd as PostIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { Product, getProductsStream } from '../api/productApi';
import { getWarehousesStream, Warehouse, goodsReceipt, writeOff } from '../api/inventoryApi';
import { db } from '../firebase/firebase';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';

// Local types for stock documents (UI layer)
export interface StockDocumentLine {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  amount: number;
}

export interface StockDocument {
  id: string;
  number?: string;
  date?: string;
  type: 'income' | 'expense';
  status: 'draft' | 'posted';
  warehouseId?: string;
  lines: StockDocumentLine[];
  createdAt?: any;
  comment?: string;
}

// Firestore stream and CRUD
const docsPath = (userId: string) => `users/${userId}/stockDocs`;
const getStockDocumentsStream = (userId: string, cb: (docs: StockDocument[]) => void) => {
  const c = collection(db, docsPath(userId));
  return onSnapshot(c, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as StockDocument[];
    // клиентская сортировка
    data.sort((a: any, b: any) => {
      const toMs = (v: any) => (typeof v?.toMillis === 'function' ? v.toMillis() : (new Date(v || 0)).getTime());
      return toMs(b.createdAt) - toMs(a.createdAt);
    });
    cb(data);
  });
};
const addStockDocument = async (userId: string, docData: Partial<StockDocument>) => {
  const ref = await addDoc(collection(db, docsPath(userId)), {
    ...docData,
    createdAt: serverTimestamp(),
  } as any);
  return ref.id;
};
const updateStockDocument = async (userId: string, id: string, updates: Partial<StockDocument>) => {
  await updateDoc(doc(db, docsPath(userId), id), { ...updates } as any);
};
const deleteStockDocument = async (userId: string, id: string) => {
  await deleteDoc(doc(db, docsPath(userId), id));
};

const StockDocumentsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [docs, setDocs] = useState<StockDocument[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StockDocument | null>(null);
  const [form, setForm] = useState<Partial<StockDocument>>({ type: 'income', status: 'draft', date: new Date().toISOString().slice(0,10), warehouseId: '', lines: [] });
  const [notify, setNotify] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!currentUser) return;
    const unsubDocs = getStockDocumentsStream(currentUser.uid, setDocs);
    const unsubProducts = getProductsStream(currentUser.uid, setProducts);
    const unsubWh = getWarehousesStream(currentUser.uid, setWarehouses);
    return () => { unsubDocs(); unsubProducts(); unsubWh(); };
  }, [currentUser]);

  const openNew = () => {
    setEditing(null);
    setForm({ type: 'income', status: 'draft', date: new Date().toISOString().slice(0,10), warehouseId: warehouses[0]?.id || '', lines: [] });
    setOpen(true);
  };

  const addLine = () => {
    setForm(prev => ({ ...prev, lines: [ ...(prev.lines || []), { productId: '', productName: '', quantity: 1, unit: 'шт', price: 0, amount: 0 } ] }));
  };

  const removeLine = (idx: number) => {
    const lines = [...(form.lines || [])];
    lines.splice(idx, 1);
    setForm(prev => ({ ...prev, lines }));
  };

  const updateLine = (idx: number, patch: Partial<StockDocumentLine>) => {
    const lines = [...(form.lines || [])];
    const merged = { ...lines[idx], ...patch } as StockDocumentLine;
    const price = merged.price || 0; const qty = merged.quantity || 0;
    merged.amount = +(price * qty).toFixed(2);
    lines[idx] = merged;
    setForm(prev => ({ ...prev, lines }));
  };

  const save = async () => {
    if (!currentUser) return;
    try {
      if (!form.lines || form.lines.length === 0) { setNotify({ open: true, message: 'Добавьте строки документа', severity: 'warning' }); return; }
      if (!form.warehouseId) { setNotify({ open: true, message: 'Выберите склад', severity: 'warning' }); return; }
      if (editing) {
        await updateStockDocument(currentUser.uid, editing.id, form as StockDocument);
        setNotify({ open: true, message: 'Документ обновлён', severity: 'success' });
      } else {
        const id = await addStockDocument(currentUser.uid, form as any);
        setNotify({ open: true, message: `Документ создан (${id})`, severity: 'success' });
      }
      setOpen(false);
    } catch (e: any) {
      setNotify({ open: true, message: e.message || 'Ошибка сохранения', severity: 'error' });
    }
  };

  const post = async (doc: StockDocument) => {
    if (!currentUser) return;
    try {
      if (!doc.warehouseId) throw new Error('Не выбран склад');
      if (doc.type === 'income') {
        await goodsReceipt(currentUser.uid, doc.warehouseId, (doc.lines || []).map(l => ({ productId: l.productId, quantity: l.quantity, comment: doc.comment })), doc.id);
      } else {
        await writeOff(currentUser.uid, doc.warehouseId, (doc.lines || []).map(l => ({ productId: l.productId, quantity: l.quantity, comment: doc.comment })), doc.id);
      }
      await updateStockDocument(currentUser.uid, doc.id, { status: 'posted' });
      setNotify({ open: true, message: 'Документ проведён', severity: 'success' });
    } catch (e: any) {
      setNotify({ open: true, message: e.message || 'Ошибка проведения', severity: 'error' });
    }
  };

  const remove = async (doc: StockDocument) => {
    if (!currentUser) return;
    if (doc.status !== 'draft') { setNotify({ open: true, message: 'Удаление запрещено для проведённых', severity: 'warning' }); return; }
    try { await deleteStockDocument(currentUser.uid, doc.id); setNotify({ open: true, message: 'Документ удалён', severity: 'success' }); } catch(e:any){ setNotify({ open: true, message: e.message || 'Ошибка удаления', severity: 'error' }); }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Складские документы</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>Новый документ</Button>
      </Box>

      {docs.length === 0 ? (
        <Card><CardContent><Typography color="text.secondary">Документов пока нет</Typography></CardContent></Card>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Номер</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="right">Строк</TableCell>
              <TableCell align="right">Сумма</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {docs.map(d => (
              <TableRow key={d.id}>
                <TableCell>{d.number || d.id.slice(-6)}</TableCell>
                <TableCell>{d.date || d.createdAt?.toDate?.()?.toLocaleDateString('ru-RU') || ''}</TableCell>
                <TableCell>{d.type === 'income' ? 'Приход' : 'Расход'}</TableCell>
                <TableCell>{d.status === 'posted' ? <Chip size="small" color="success" label="Проведён" /> : <Chip size="small" label="Черновик" />}</TableCell>
                <TableCell align="right">{d.lines?.length || 0}</TableCell>
                <TableCell align="right">{(d.lines || []).reduce((s,l)=>s+(l.amount||0),0).toFixed(2)}</TableCell>
                <TableCell>
                  {d.status === 'draft' && (
                    <>
                      <Button size="small" onClick={() => { setEditing(d); setForm(d); setOpen(true); }}>Открыть</Button>
                      <IconButton size="small" onClick={() => post(d)} title="Провести"><PostIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => remove(d)} title="Удалить"><DeleteIcon fontSize="small" /></IconButton>
                    </>
                  )}
                  {d.status === 'posted' && (
                    <Alert severity="info">Проведён</Alert>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Редактировать документ' : 'Новый документ'}</DialogTitle>
        <DialogContent>
          <Box display="flex" gap={2} mt={1} mb={2}>
            <FormControl fullWidth>
              <InputLabel>Тип</InputLabel>
              <Select value={form.type || 'income'} label="Тип" onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
                <MenuItem value="income">Начисление</MenuItem>
                <MenuItem value="expense">Списание</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Дата" type="date" value={form.date || new Date().toISOString().slice(0,10)} onChange={(e)=>setForm({...form, date: e.target.value})} InputLabelProps={{ shrink: true }} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Склад</InputLabel>
              <Select value={form.warehouseId || ''} label="Склад" onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
                {warehouses.map(w => (<MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>))}
              </Select>
            </FormControl>
          </Box>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Номенклатура</TableCell>
                <TableCell align="right">Кол-во</TableCell>
                <TableCell align="right">Ед.</TableCell>
                <TableCell align="right">Цена</TableCell>
                <TableCell align="right">Сумма</TableCell>
                <TableCell width={48}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(form.lines || []).map((line, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Select
                      value={line.productId}
                      onChange={(e) => {
                        const p = products.find(pr => pr.id === e.target.value);
                        if (!p) return;
                        updateLine(idx, { productId: p.id, productName: p.name, unit: p.unit, price: p.costPrice || p.salePrice || 0 });
                      }}
                      displayEmpty
                      fullWidth
                    >
                      <MenuItem value=""><em>Не выбрано</em></MenuItem>
                      {products.map(p => (<MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>))}
                    </Select>
                  </TableCell>
                  <TableCell align="right"><TextField type="number" value={line.quantity || 0} onChange={(e)=>updateLine(idx, { quantity: Number(e.target.value) })} size="small" /></TableCell>
                  <TableCell align="right">{line.unit || ''}</TableCell>
                  <TableCell align="right"><TextField type="number" value={line.price || 0} onChange={(e)=>updateLine(idx, { price: Number(e.target.value) })} size="small" /></TableCell>
                  <TableCell align="right">{(line.amount || 0).toFixed(2)}</TableCell>
                  <TableCell><IconButton size="small" onClick={()=>removeLine(idx)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box mt={1}><Button size="small" startIcon={<AddIcon />} onClick={addLine}>Добавить строку</Button></Box>

          <TextField label="Примечание" value={(form as any).comment || ''} onChange={(e)=>setForm({...form, comment: e.target.value as any})} fullWidth multiline rows={2} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={save}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      {notify.open && (
        <Box mt={2}><Alert severity={notify.severity} onClose={()=>setNotify({...notify, open:false})}>{notify.message}</Alert></Box>
      )}
    </Box>
  );
};

export default StockDocumentsPage;

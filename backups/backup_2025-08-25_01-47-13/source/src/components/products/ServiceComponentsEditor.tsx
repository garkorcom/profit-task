import React, { useMemo, useState } from 'react';
import { Box, Button, IconButton, TextField, Typography, FormControl, InputLabel, Select, MenuItem, InputAdornment, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Product, ServiceComponent } from '../../api/productApi';
import { useAuth } from '../../auth/AuthContext';
import { getServiceTemplatesStream, saveServiceTemplate, deleteServiceTemplate, ServiceTemplate } from '../../api/serviceTemplateApi';

interface Props {
  components: ServiceComponent[];
  onChange: (next: ServiceComponent[]) => void;
  products: Product[];
}

const ServiceComponentsEditor: React.FC<Props> = ({ components, onChange, products }) => {
  const { currentUser } = useAuth();
  const [selectedRefId, setSelectedRefId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState<string>('');
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [tplDialog, setTplDialog] = useState<{ open: boolean; name: string }>(() => ({ open: false, name: '' }));
  const [copyDialog, setCopyDialog] = useState<{ open: boolean; serviceId: string }>(() => ({ open: false, serviceId: '' }));

  const productMap = useMemo(() => {
    const map: Record<string, Product> = {};
    products.forEach(p => { map[p.id] = p; });
    return map;
  }, [products]);

  React.useEffect(() => {
    if (!currentUser) return;
    const unsub = getServiceTemplatesStream(currentUser.uid, setTemplates);
    return () => unsub();
  }, [currentUser]);

  const addComponent = () => {
    setError('');
    if (!selectedRefId || quantity <= 0) { setError('Выберите позицию и укажите количество > 0'); return; }
    const refProduct = productMap[selectedRefId];
    if (!refProduct) { setError('Позиция не найдена'); return; }
    const newComp: ServiceComponent = {
      id: `cmp-${Date.now()}`,
      refType: refProduct.type,
      refId: refProduct.id,
      name: refProduct.name,
      unit: refProduct.unit,
      quantity,
      costPerUnitSnapshot: refProduct.salePrice || refProduct.costPrice
    };
    onChange([...(components || []), newComp]);
    setSelectedRefId('');
    setQuantity(1);
  };

  const removeComponent = (id: string) => {
    onChange((components || []).filter(c => c.id !== id));
  };

  const totalCost = useMemo(() => {
    return (components || []).reduce((sum, c) => {
      const p = productMap[c.refId];
      const price = (p?.costPrice ?? c.costPerUnitSnapshot ?? 0);
      return sum + price * (c.quantity || 0);
    }, 0);
  }, [components, productMap]);

  return (
    <Box>
      <Box display="flex" gap={1} mb={1} flexWrap="wrap">
        <Button size="small" onClick={() => setTplDialog({ open: true, name: '' })}>Сохранить как шаблон</Button>
        <Button size="small" onClick={() => setCopyDialog({ open: true, serviceId: '' })}>Скопировать из услуги</Button>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Вставить шаблон</InputLabel>
          <Select
            label="Вставить шаблон"
            value={''}
            onChange={(e) => {
              const tpl = templates.find(t => t.id === e.target.value);
              if (tpl) onChange(tpl.components);
            }}
            renderValue={() => 'Выберите шаблон'}
          >
            {templates.map(t => (
              <MenuItem key={t.id} value={t.id}>
                <Box display="flex" justifyContent="space-between" width="100%">
                  <span>{t.name}</span>
                  <IconButton size="small" onClick={(ev) => { ev.stopPropagation(); if (currentUser) deleteServiceTemplate(currentUser.uid, t.id); }}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      <Box display="flex" gap={2} alignItems="center" mb={1}>
        <FormControl fullWidth>
          <InputLabel>Позиция</InputLabel>
          <Select
            label="Позиция"
            value={selectedRefId}
            onChange={(e) => setSelectedRefId(e.target.value)}
          >
            {products.map(p => (
              <MenuItem key={p.id} value={p.id}>
                <Box display="flex" justifyContent="space-between" width="100%">
                  <span>{p.name}</span>
                  <Typography variant="caption" color="text.secondary">{p.type === 'service' ? 'Услуга' : `Доступно: ${(p.availableStock ?? (p.currentStock - (p.reservedStock || 0) || 0))} ${p.unit}`}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Кол-во"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          InputProps={{ endAdornment: <InputAdornment position="end">шт</InputAdornment> }}
          sx={{ width: 140 }}
        />
        <Button startIcon={<AddIcon />} variant="contained" onClick={addComponent}>Добавить</Button>
      </Box>

      {(components || []).length === 0 ? (
        <Typography color="text.secondary">Состав пуст</Typography>
      ) : (
        <Box>
          {(components || []).map(c => (
            <Box key={c.id} display="flex" alignItems="center" justifyContent="space-between" py={0.5}>
              <Typography>{c.name} — {c.quantity} {c.unit}</Typography>
              <IconButton size="small" onClick={() => removeComponent(c.id)}><DeleteIcon fontSize="small" /></IconButton>
            </Box>
          ))}
          <Box mt={1}>
            <Typography variant="body2" color="text.secondary">Ориентировочная себестоимость: {totalCost.toFixed(2)}</Typography>
          </Box>
        </Box>
      )}

      <Dialog open={tplDialog.open} onClose={() => setTplDialog({ open: false, name: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>Сохранить как шаблон</DialogTitle>
        <DialogContent>
          <TextField label="Название шаблона" value={tplDialog.name} onChange={(e)=>setTplDialog({ open: true, name: e.target.value })} fullWidth autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTplDialog({ open: false, name: '' })}>Отмена</Button>
          <Button variant="contained" onClick={async () => {
            if (!currentUser) return; if (!tplDialog.name) return;
            await saveServiceTemplate(currentUser.uid, tplDialog.name, components || []);
            setTplDialog({ open: false, name: '' });
          }}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={copyDialog.open} onClose={() => setCopyDialog({ open: false, serviceId: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>Скопировать состав из услуги</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Услуга</InputLabel>
            <Select
              label="Услуга"
              value={copyDialog.serviceId}
              onChange={(e) => setCopyDialog({ open: true, serviceId: e.target.value })}
            >
              {products.filter(p => p.type === 'service').map(s => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyDialog({ open: false, serviceId: '' })}>Отмена</Button>
          <Button variant="contained" onClick={() => {
            const svc = products.find(p => p.id === copyDialog.serviceId);
            if (svc && Array.isArray(svc.components)) {
              // Копируем, чтобы не тащить ссылки
              const cloned = svc.components.map(c => ({ ...c, id: `cmp-${Date.now()}-${Math.random().toString(36).slice(2,7)}` }));
              onChange(cloned);
            }
            setCopyDialog({ open: false, serviceId: '' });
          }} disabled={!copyDialog.serviceId}>Вставить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServiceComponentsEditor;



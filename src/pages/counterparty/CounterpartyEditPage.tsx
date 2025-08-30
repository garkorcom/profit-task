import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Button, Paper, TextField, Stack, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Chip
} from '@mui/material';
import { useAuth } from '../../auth/AuthContext';
import { Counterparty, CounterpartyRole, CounterpartyStatus, CounterpartyPriority } from '../../types/counterparty.types';
import { getCounterparty, updateCounterparty } from '../../api/counterpartyApi';

const CounterpartyEditPage: React.FC = () => {
  const { counterpartyId } = useParams<{ counterpartyId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [counterparty, setCounterparty] = useState<Partial<Counterparty>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || !counterpartyId) {
      setError('Ошибка: ID контрагента не найден.');
      setLoading(false);
      return;
    }

    getCounterparty(currentUser.uid, counterpartyId).then(data => {
      if (data) {
        setCounterparty(data);
      } else {
        setError('Контрагент не найден.');
      }
      setLoading(false);
    });
  }, [currentUser, counterpartyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setCounterparty(prev => ({ ...prev, [name as string]: value }));
  };
  
  const handleSelectChange = (e: { target: { name: string; value: unknown } }) => {
    const { name, value } = e.target;
    setCounterparty(prev => ({ ...prev, [name as string]: value }));
  };

  const handleSave = async () => {
    if (!currentUser || !counterpartyId || !counterparty) return;

    setSaving(true);
    try {
      // Убираем неизменяемые поля перед отправкой
      const { id, createdBy, createdAt, ...updates } = counterparty;
      await updateCounterparty(currentUser.uid, counterpartyId, updates);
      navigate(`/counterparties/${counterpartyId}`);
    } catch (err) {
      setError('Не удалось сохранить изменения.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Редактирование: {counterparty.displayName || counterparty.legalName}
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={3}>
          <TextField
            name="legalName"
            label="Полное наименование"
            value={counterparty.legalName || ''}
            onChange={handleChange}
            fullWidth
            required
          />
          <TextField
            name="displayName"
            label="Краткое название"
            value={counterparty.displayName || ''}
            onChange={handleChange}
            fullWidth
          />
          <TextField
            name="taxId"
            label="ИНН"
            value={counterparty.taxId || ''}
            onChange={handleChange}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Роли</InputLabel>
            <Select
              multiple
              name="roles"
              value={counterparty.roles || []}
              onChange={handleSelectChange as any}
              renderValue={(selected) => (
                <Stack direction="row" spacing={1}>
                  {selected.map((role) => <Chip key={role} label={role} />)}
                </Stack>
              )}
            >
              <MenuItem value="customer">Клиент</MenuItem>
              <MenuItem value="vendor">Поставщик</MenuItem>
              <MenuItem value="subcontractor">Субподрядчик</MenuItem>
              <MenuItem value="partner">Партнер</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Статус</InputLabel>
            <Select name="status" value={counterparty.status || ''} onChange={handleSelectChange as any}>
              <MenuItem value="new">Новый</MenuItem>
              <MenuItem value="potential">Потенциальный</MenuItem>
              <MenuItem value="active">Активный</MenuItem>
              <MenuItem value="on_hold">На паузе</MenuItem>
              <MenuItem value="blacklisted">Черный список</MenuItem>
              <MenuItem value="archived">Архив</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Приоритет</InputLabel>
            <Select name="priority" value={counterparty.priority || ''} onChange={handleSelectChange as any}>
              <MenuItem value="low">Низкий</MenuItem>
              <MenuItem value="medium">Средний</MenuItem>
              <MenuItem value="high">Высокий</MenuItem>
              <MenuItem value="vip">VIP</MenuItem>
            </Select>
          </FormControl>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={() => navigate(`/counterparties/${counterpartyId}`)}>
              Отмена
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? <CircularProgress size={24} /> : 'Сохранить'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};

export default CounterpartyEditPage;

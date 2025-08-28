/**
 * Блок "Услуги" для конструктора смет
 */

import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { Estimate, BlockState } from '../../../types/estimate.types';

interface ServicesBlockProps {
  estimate: Estimate;
  block: BlockState;
  onSave: (data: any) => void;
  saving: boolean;
}

const ServicesBlock: React.FC<ServicesBlockProps> = ({
  estimate,
  block,
  onSave,
  saving,
}) => {
  const handleSave = () => {
    onSave({ items: [] });
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Блок "Услуги" в разработке. Здесь будет таблица услуг с секциями, 
        drag-and-drop сортировкой и привязкой к задачам.
      </Alert>
      
      <Typography variant="body1" paragraph>
        Функции блока:
      </Typography>
      <ul>
        <li>Добавление услуг и работ</li>
        <li>Группировка по секциям</li>
        <li>PERT-оценки времени</li>
        <li>Привязка к задачам проекта</li>
        <li>Расчет стоимости по часовым ставкам</li>
        <li>Импорт из шаблонов</li>
      </ul>
      
      <Button 
        variant="contained" 
        onClick={handleSave}
        disabled={saving}
        sx={{ mt: 2 }}
      >
        {saving ? 'Сохранение...' : 'Пропустить блок'}
      </Button>
    </Box>
  );
};

export default ServicesBlock;

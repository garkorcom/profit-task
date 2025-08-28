/**
 * Блок "Товары" для конструктора смет
 */

import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { Estimate, BlockState } from '../../../types/estimate.types';

interface ProductsBlockProps {
  estimate: Estimate;
  block: BlockState;
  onSave: (data: any) => void;
  saving: boolean;
}

const ProductsBlock: React.FC<ProductsBlockProps> = ({
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
        Блок "Товары" в разработке. Здесь будет каталог материалов и оборудования
        с автоматическим расчетом закупочных цен и наценок.
      </Alert>
      
      <Typography variant="body1" paragraph>
        Функции блока:
      </Typography>
      <ul>
        <li>Выбор из каталога товаров</li>
        <li>Расчет закупочной и продажной цены</li>
        <li>Учет процента отходов</li>
        <li>Резервирование со склада</li>
        <li>Указание поставщика и сроков поставки</li>
        <li>Автоматическое обновление цен из прайс-листа</li>
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

export default ProductsBlock;

/**
 * Блок "Себестоимость" для конструктора смет
 */

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField,
  Stack,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Card,
  CardContent,
} from '@mui/material';
import { Estimate, BlockState, CostingBlockData, RoundingRule, Scenario } from '../../../types/estimate.types';

interface CostingBlockProps {
  estimate: Estimate;
  block: BlockState;
  onSave: (data: CostingBlockData) => void;
  saving: boolean;
}

const CostingBlock: React.FC<CostingBlockProps> = ({
  estimate,
  block,
  onSave,
  saving,
}) => {
  const blockData = (block.data || {}) as CostingBlockData;
  
  const [overheadPct, setOverheadPct] = useState(blockData?.overheadPct || 15);
  const [profitTargetPct, setProfitTargetPct] = useState(blockData?.profitTargetPct || 30);
  const [discountAmt, setDiscountAmt] = useState(blockData?.discountAmt || 0);
  const [shippingAmt, setShippingAmt] = useState(blockData?.shippingAmt || 0);
  const [depositPct, setDepositPct] = useState(blockData?.depositPct || 30);
  const [roundingRule, setRoundingRule] = useState<RoundingRule>(blockData?.roundingRule || 'none');
  const [scenario, setScenario] = useState<Scenario>(blockData?.scenario || 'base');

  const handleSave = () => {
    const data: CostingBlockData = {
      laborRates: blockData?.laborRates || [],
      overheadPct,
      profitTargetPct,
      discountAmt,
      shippingAmt,
      depositPct,
      roundingRule,
      scenario,
    };
    
    onSave(data);
  };

  return (
    <Box>
      <Stack spacing={3}>
        {/* Overhead */}
        <Box>
          <Typography gutterBottom>
            Накладные расходы: {overheadPct}%
          </Typography>
          <Slider
            value={overheadPct}
            onChange={(e, value) => setOverheadPct(value as number)}
            min={0}
            max={50}
            marks
            step={5}
          />
        </Box>
        
        {/* Profit target */}
        <Box>
          <Typography gutterBottom>
            Целевая прибыль: {profitTargetPct}%
          </Typography>
          <Slider
            value={profitTargetPct}
            onChange={(e, value) => setProfitTargetPct(value as number)}
            min={0}
            max={100}
            marks
            step={5}
            color="success"
          />
        </Box>
        
        {/* Discount */}
        <TextField
          label="Скидка"
          type="number"
          value={discountAmt}
          onChange={(e) => setDiscountAmt(Number(e.target.value))}
          fullWidth
          InputProps={{
            startAdornment: <InputAdornment position="start">₽</InputAdornment>,
          }}
        />
        
        {/* Shipping */}
        <TextField
          label="Доставка"
          type="number"
          value={shippingAmt}
          onChange={(e) => setShippingAmt(Number(e.target.value))}
          fullWidth
          InputProps={{
            startAdornment: <InputAdornment position="start">₽</InputAdornment>,
          }}
        />
        
        {/* Deposit */}
        <Box>
          <Typography gutterBottom>
            Предоплата: {depositPct}%
          </Typography>
          <Slider
            value={depositPct}
            onChange={(e, value) => setDepositPct(value as number)}
            min={0}
            max={100}
            marks={[
              { value: 0, label: '0%' },
              { value: 30, label: '30%' },
              { value: 50, label: '50%' },
              { value: 100, label: '100%' },
            ]}
            step={10}
          />
        </Box>
        
        {/* Rounding */}
        <FormControl fullWidth>
          <InputLabel>Округление</InputLabel>
          <Select
            value={roundingRule}
            onChange={(e) => setRoundingRule(e.target.value as RoundingRule)}
            label="Округление"
          >
            <MenuItem value="none">Без округления</MenuItem>
            <MenuItem value="ceil_1">До рубля вверх</MenuItem>
            <MenuItem value="ceil_10">До 10 рублей вверх</MenuItem>
            <MenuItem value="bankers">Банковское округление</MenuItem>
          </Select>
        </FormControl>
        
        {/* Scenario */}
        <FormControl fullWidth>
          <InputLabel>Сценарий</InputLabel>
          <Select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as Scenario)}
            label="Сценарий"
          >
            <MenuItem value="base">Базовый</MenuItem>
            <MenuItem value="optimistic">Оптимистичный (-10% к срокам)</MenuItem>
            <MenuItem value="pessimistic">Пессимистичный (+20% к срокам)</MenuItem>
          </Select>
        </FormControl>
        
        {/* Summary card */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Текущие настройки повлияют на итоги:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Накладные расходы: +{overheadPct}% к себестоимости
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Целевая маржа: {profitTargetPct}%
            </Typography>
            {discountAmt > 0 && (
              <Typography variant="body2" color="error">
                • Скидка: -{discountAmt.toLocaleString('ru-RU')} ₽
              </Typography>
            )}
            {shippingAmt > 0 && (
              <Typography variant="body2" color="text.secondary">
                • Доставка: +{shippingAmt.toLocaleString('ru-RU')} ₽
              </Typography>
            )}
          </CardContent>
        </Card>
        
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </Stack>
    </Box>
  );
};

export default CostingBlock;

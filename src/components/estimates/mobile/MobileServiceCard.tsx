/**
 * Мобильная карточка услуги для конструктора смет
 * Оптимизирована для touch-интерфейса
 */

import React, { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  Stack,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Box,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Alert,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Mic as MicIcon,
  Smart as AIIcon,
  ContentCopy as CopyIcon,
  DragIndicator as DragIcon,
  Calculate as CalcIcon,
} from '@mui/icons-material';

interface ServiceRow {
  id: string;
  name: string;
  description?: string;
  unit: string;
  rate: number;
  pert: {
    optimistic: number;
    mostLikely: number;
    pessimistic: number;
  };
  sectionId: string;
}

interface MobileServiceCardProps {
  service: ServiceRow;
  onUpdate: (id: string, updates: Partial<ServiceRow>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

const MobileServiceCard: React.FC<MobileServiceCardProps> = ({
  service,
  onUpdate,
  onDelete,
  onDuplicate,
  expanded = false,
  onToggleExpand,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPertDialog, setShowPertDialog] = useState(false);
  const [voiceInput, setVoiceInput] = useState(false);
  
  const expectedHours = (pert: typeof service.pert) => {
    return (pert.optimistic + 4 * pert.mostLikely + pert.pessimistic) / 6;
  };
  
  const hours = expectedHours(service.pert);
  const lineTotal = hours * service.rate;
  
  const handleVoiceInput = async (field: 'name' | 'description') => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Голосовой ввод не поддерживается в этом браузере');
      return;
    }
    
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setVoiceInput(true);
    recognition.onend = () => setVoiceInput(false);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onUpdate(service.id, { [field]: transcript });
    };
    
    recognition.start();
  };

  const quickUnits = [
    { value: 'ч', label: '⏱️ Часы', color: '#2196f3' },
    { value: 'шт', label: '🔢 Штуки', color: '#4caf50' },
    { value: 'м2', label: '📐 Кв.м', color: '#ff9800' },
    { value: 'м', label: '📏 Метры', color: '#9c27b0' },
    { value: 'кг', label: '⚖️ Кг', color: '#f44336' },
  ];

  return (
    <>
      <Card 
        elevation={expanded ? 4 : 1} 
        sx={{ 
          mb: 2, 
          transition: 'all 0.3s ease',
          background: expanded ? 'linear-gradient(135deg, #f8f9fa, #e9ecef)' : 'white',
          '&:hover': {
            elevation: 2,
            transform: 'translateY(-1px)'
          }
        }}
      >
        {/* Drag Handle */}
        <Box 
          sx={{ 
            height: 6, 
            background: `linear-gradient(90deg, ${quickUnits.find(u => u.value === service.unit)?.color || '#ccc'}, transparent)`,
            borderRadius: '4px 4px 0 0'
          }} 
        />
        
        <CardContent sx={{ pb: expanded ? 2 : 1 }}>
          {/* Header Row */}
          <Stack direction="row" alignItems="center" spacing={1} mb={expanded ? 2 : 1}>
            <IconButton size="small" sx={{ color: '#666', cursor: 'grab' }}>
              <DragIcon />
            </IconButton>
            
            <Box flexGrow={1}>
              <Typography variant="subtitle1" fontWeight="bold" noWrap>
                {service.name || 'Новая услуга'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {hours.toFixed(1)} {service.unit} × ${service.rate} = ${lineTotal.toFixed(2)}
              </Typography>
            </Box>
            
            <IconButton 
              onClick={onToggleExpand}
              size="large"
              sx={{ minWidth: 48, minHeight: 48 }}
            >
              {expanded ? <CollapseIcon /> : <ExpandIcon />}
            </IconButton>
          </Stack>

          {/* Expanded Content */}
          <Collapse in={expanded} timeout={300}>
            <Stack spacing={3}>
              {/* Service Name */}
              <Stack direction="row" spacing={1}>
                <TextField
                  label="🛠️ Название услуги"
                  value={service.name}
                  onChange={(e) => onUpdate(service.id, { name: e.target.value })}
                  fullWidth
                  variant="outlined"
                  inputProps={{ style: { fontSize: '1.1rem' } }}
                />
                <IconButton 
                  onClick={() => handleVoiceInput('name')}
                  size="large"
                  sx={{ 
                    minWidth: 56, 
                    minHeight: 56, 
                    color: voiceInput ? '#f44336' : '#666',
                    border: '2px solid',
                    borderColor: voiceInput ? '#f44336' : 'divider'
                  }}
                >
                  <MicIcon />
                </IconButton>
              </Stack>

              {/* Description */}
              <Stack direction="row" spacing={1}>
                <TextField
                  label="📝 Описание работ"
                  value={service.description || ''}
                  onChange={(e) => onUpdate(service.id, { description: e.target.value })}
                  multiline
                  rows={2}
                  fullWidth
                  placeholder="Детальное описание выполняемых работ..."
                />
                <IconButton 
                  onClick={() => handleVoiceInput('description')}
                  size="large"
                  sx={{ 
                    minWidth: 56, 
                    minHeight: 56,
                    alignSelf: 'flex-start',
                    mt: 1,
                    color: voiceInput ? '#f44336' : '#666',
                    border: '2px solid',
                    borderColor: voiceInput ? '#f44336' : 'divider'
                  }}
                >
                  <MicIcon />
                </IconButton>
              </Stack>

              {/* Units - Touch-friendly chips */}
              <Box>
                <Typography variant="subtitle2" gutterBottom color="text.secondary">
                  📊 Единица измерения
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {quickUnits.map((unit) => (
                    <Chip
                      key={unit.value}
                      label={unit.label}
                      onClick={() => onUpdate(service.id, { unit: unit.value })}
                      variant={service.unit === unit.value ? 'filled' : 'outlined'}
                      size="medium"
                      sx={{
                        minHeight: 44,
                        fontSize: '0.9rem',
                        fontWeight: service.unit === unit.value ? 'bold' : 'normal',
                        bgcolor: service.unit === unit.value ? unit.color : 'transparent',
                        color: service.unit === unit.value ? 'white' : unit.color,
                        borderColor: unit.color,
                        '&:hover': {
                          bgcolor: unit.color,
                          color: 'white'
                        }
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              {/* Rate */}
              <TextField
                label="💰 Ставка за единицу ($)"
                type="number"
                value={service.rate}
                onChange={(e) => onUpdate(service.id, { rate: Number(e.target.value || 0) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  style: { fontSize: '1.2rem' }
                }}
                inputProps={{ 
                  min: 0, 
                  step: 0.01,
                  style: { textAlign: 'center' }
                }}
              />

              {/* PERT Estimation - Simplified for mobile */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    ⏰ Оценка времени
                  </Typography>
                  <Button 
                    variant="outlined" 
                    size="small"
                    startIcon={<CalcIcon />}
                    onClick={() => setShowPertDialog(true)}
                  >
                    Детально
                  </Button>
                </Stack>
                
                <Alert severity="info" sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>Ожидаемое время:</strong> {hours.toFixed(1)} {service.unit}<br/>
                    <strong>Итоговая стоимость:</strong> ${lineTotal.toFixed(2)}
                  </Typography>
                </Alert>

                <Stack direction="row" spacing={1}>
                  <TextField
                    label="Мин"
                    type="number"
                    value={service.pert.optimistic}
                    onChange={(e) => onUpdate(service.id, { 
                      pert: { ...service.pert, optimistic: Number(e.target.value || 0) }
                    })}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Норм"
                    type="number"
                    value={service.pert.mostLikely}
                    onChange={(e) => onUpdate(service.id, { 
                      pert: { ...service.pert, mostLikely: Number(e.target.value || 0) }
                    })}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Макс"
                    type="number"
                    value={service.pert.pessimistic}
                    onChange={(e) => onUpdate(service.id, { 
                      pert: { ...service.pert, pessimistic: Number(e.target.value || 0) }
                    })}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                </Stack>
              </Box>

              {/* Action Buttons */}
              <Stack direction="row" spacing={1} pt={1}>
                <Button
                  variant="outlined"
                  startIcon={<CopyIcon />}
                  onClick={() => onDuplicate(service.id)}
                  sx={{ flex: 1, minHeight: 48 }}
                >
                  Копировать
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => onDelete(service.id)}
                  sx={{ flex: 1, minHeight: 48 }}
                >
                  Удалить
                </Button>
              </Stack>
            </Stack>
          </Collapse>
        </CardContent>
      </Card>

      {/* PERT Detail Dialog */}
      <Dialog open={showPertDialog} onClose={() => setShowPertDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>⏰ Детальная оценка времени</DialogTitle>
        <DialogContent>
          <Stack spacing={3} pt={1}>
            <Typography variant="body2" color="text.secondary">
              PERT-анализ: оптимистичная + 4×реалистичная + пессимистичная / 6
            </Typography>
            
            <Box>
              <Typography gutterBottom>Оптимистичная оценка: {service.pert.optimistic}</Typography>
              <Slider
                value={service.pert.optimistic}
                onChange={(e, v) => onUpdate(service.id, { 
                  pert: { ...service.pert, optimistic: v as number }
                })}
                min={0}
                max={100}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Box>
              <Typography gutterBottom>Реалистичная оценка: {service.pert.mostLikely}</Typography>
              <Slider
                value={service.pert.mostLikely}
                onChange={(e, v) => onUpdate(service.id, { 
                  pert: { ...service.pert, mostLikely: v as number }
                })}
                min={0}
                max={100}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Box>
              <Typography gutterBottom>Пессимистичная оценка: {service.pert.pessimistic}</Typography>
              <Slider
                value={service.pert.pessimistic}
                onChange={(e, v) => onUpdate(service.id, { 
                  pert: { ...service.pert, pessimistic: v as number }
                })}
                min={0}
                max={100}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Alert severity="success">
              <Typography variant="h6">
                Ожидаемое время: {expectedHours(service.pert).toFixed(2)} {service.unit}
              </Typography>
              <Typography variant="body2">
                Стоимость: ${(expectedHours(service.pert) * service.rate).toFixed(2)}
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPertDialog(false)}>Готово</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MobileServiceCard;
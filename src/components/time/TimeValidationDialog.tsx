/**
 * Диалог для отображения результатов валидации времени
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Alert,
  Chip,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestedHours?: number;
}

interface TimeValidationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  validation: ValidationResult | null;
  originalHours?: number;
  title?: string;
}

export const TimeValidationDialog: React.FC<TimeValidationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  onCancel,
  validation,
  originalHours,
  title = 'Валидация записи времени'
}) => {
  if (!validation) return null;

  const hasAdjustment = validation.suggestedHours && validation.suggestedHours !== originalHours;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          {validation.isValid ? (
            <CheckIcon color="success" />
          ) : (
            <ErrorIcon color="error" />
          )}
          {title}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Общий статус */}
        <Alert 
          severity={validation.isValid ? 'success' : 'error'} 
          sx={{ mb: 2 }}
        >
          {validation.isValid 
            ? 'Запись времени прошла валидацию' 
            : 'Обнаружены ошибки валидации'
          }
        </Alert>

        {/* Предложение по корректировке часов */}
        {hasAdjustment && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <TimeIcon fontSize="small" />
              <Typography variant="body2">
                Время будет скорректировано с <strong>{originalHours} ч</strong> на{' '}
                <strong>{validation.suggestedHours} ч</strong> согласно политике округления
              </Typography>
            </Box>
          </Alert>
        )}

        {/* Ошибки */}
        {validation.errors.length > 0 && (
          <Box mb={2}>
            <Typography variant="h6" color="error" gutterBottom>
              Ошибки ({validation.errors.length})
            </Typography>
            <List dense>
              {validation.errors.map((error, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <ErrorIcon color="error" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={error}
                    primaryTypographyProps={{
                      variant: 'body2',
                      color: 'error'
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Предупреждения */}
        {validation.warnings.length > 0 && (
          <Box mb={2}>
            <Typography variant="h6" color="warning.main" gutterBottom>
              Предупреждения ({validation.warnings.length})
            </Typography>
            <List dense>
              {validation.warnings.map((warning, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <WarningIcon color="warning" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={warning}
                    primaryTypographyProps={{
                      variant: 'body2',
                      color: 'warning.main'
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Информация об изменениях */}
        {(hasAdjustment || validation.warnings.length > 0) && (
          <Box 
            sx={{ 
              bgcolor: 'grey.100', 
              p: 2, 
              borderRadius: 1,
              mt: 2 
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Что будет изменено:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {hasAdjustment && (
                <Chip 
                  label={`Время: ${originalHours}ч → ${validation.suggestedHours}ч`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {validation.warnings.length > 0 && (
                <Chip 
                  label={`${validation.warnings.length} предупреждение(й)`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          Отмена
        </Button>
        
        {validation.isValid && (
          <Button 
            onClick={onConfirm} 
            variant="contained" 
            color="primary"
          >
            {hasAdjustment || validation.warnings.length > 0 
              ? 'Продолжить с изменениями' 
              : 'Сохранить'
            }
          </Button>
        )}
        
        {!validation.isValid && (
          <Button 
            onClick={onClose} 
            variant="contained" 
            color="primary"
          >
            Исправить
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TimeValidationDialog;
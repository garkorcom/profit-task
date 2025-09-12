/**
 * Компонент быстрой отметки эмоций
 * Минималистичный UI с возможностью Undo
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  ButtonGroup,
  Button,
  Chip,
  TextField,
  Snackbar,
  Alert,
  Fade,
  useTheme,
  alpha
} from '@mui/material';
import {
  SentimentVeryDissatisfied,
  SentimentDissatisfied,
  SentimentNeutral,
  SentimentSatisfied,
  SentimentVerySatisfied,
  Undo as UndoIcon
} from '@mui/icons-material';

import { 
  EmotionLevel, 
  EmotionCheckInData, 
  EMOTION_TAGS, 
  EMOTION_COLORS 
} from '../../types';
import { optimisticEmotionService } from '../../services/emotionService';
import { useAuth } from '../../../../auth/AuthContext';

// Иконки для уровней эмоций
const EMOTION_ICONS = {
  1: SentimentVeryDissatisfied,
  2: SentimentDissatisfied,  
  3: SentimentNeutral,
  4: SentimentSatisfied,
  5: SentimentVerySatisfied
};

// Описания уровней
const EMOTION_DESCRIPTIONS = {
  1: 'Плохо',
  2: 'Неудовлетворительно',
  3: 'Нейтрально', 
  4: 'Хорошо',
  5: 'Отлично'
};

interface EmotionCheckInProps {
  context?: EmotionCheckInData['context'];
  onSuccess?: (logId: string) => void;
  onError?: (error: string) => void;
  compact?: boolean;
  className?: string;
}

export const EmotionCheckIn: React.FC<EmotionCheckInProps> = ({
  context = { type: 'manual' },
  onSuccess,
  onError,
  compact = false,
  className
}) => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  
  const [selectedLevel, setSelectedLevel] = useState<EmotionLevel | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [undoFunction, setUndoFunction] = useState<(() => void) | null>(null);

  // Обработчик выбора уровня
  const handleLevelSelect = useCallback((level: EmotionLevel) => {
    setSelectedLevel(level);
    setSelectedTags([]); // Сбрасываем теги при смене уровня
  }, []);

  // Обработчик выбора тега
  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else if (prev.length >= 5) {
        // Максимум 5 тегов - показываем предупреждение
        return prev;
      } else {
        return [...prev, tag];
      }
    });
  }, []);

  // Отправка данных
  const handleSubmit = useCallback(async () => {
    if (!currentUser || !selectedLevel) return;

    setIsSubmitting(true);
    
    try {
      const data: EmotionCheckInData = {
        level: selectedLevel,
        tags: selectedTags,
        notes: notes.trim() || undefined,
        context
      };

      // Используем сервис с возможностью отмены
      const { logId, undo } = await optimisticEmotionService.createWithUndo(
        currentUser.uid,
        data,
        5000 // 5 секунд на отмену
      );

      // Показываем уведомление с возможностью отмены
      setUndoFunction(() => undo);
      setShowUndo(true);
      
      // Сбрасываем форму
      setSelectedLevel(null);
      setSelectedTags([]);
      setNotes('');
      
      onSuccess?.(logId);

    } catch (error) {
      console.error('Error creating emotion log:', error);
      onError?.(error instanceof Error ? error.message : 'Ошибка сохранения');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentUser, selectedLevel, selectedTags, notes, context, onSuccess, onError]);

  // Обработчик отмены
  const handleUndo = () => {
    if (undoFunction) {
      undoFunction();
      setShowUndo(false);
      setUndoFunction(null);
    }
  };

  const availableTags = selectedLevel ? EMOTION_TAGS[selectedLevel] : [];

  return (
    <Box className={className}>
      <Card 
        elevation={compact ? 1 : 2}
        sx={{ 
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(10px)'
        }}
      >
        <CardContent sx={{ p: compact ? 2 : 3 }}>
          {!compact && (
            <Typography variant="h6" gutterBottom>
              Как ваше настроение?
            </Typography>
          )}

          {/* Уровни эмоций */}
          <ButtonGroup 
            variant="outlined" 
            fullWidth 
            sx={{ mb: 2 }}
          >
            {[1, 2, 3, 4, 5].map((level) => {
              const IconComponent = EMOTION_ICONS[level as EmotionLevel];
              const isSelected = selectedLevel === level;
              
              return (
                <Button
                  key={level}
                  onClick={() => handleLevelSelect(level as EmotionLevel)}
                  sx={{
                    minWidth: compact ? 40 : 60,
                    height: compact ? 40 : 60,
                    bgcolor: isSelected ? EMOTION_COLORS[level as EmotionLevel] : 'transparent',
                    color: isSelected ? 'white' : EMOTION_COLORS[level as EmotionLevel],
                    borderColor: EMOTION_COLORS[level as EmotionLevel],
                    '&:hover': {
                      bgcolor: alpha(EMOTION_COLORS[level as EmotionLevel], 0.1),
                      borderColor: EMOTION_COLORS[level as EmotionLevel]
                    },
                    transition: 'all 0.2s ease-in-out',
                    fontSize: compact ? '0.75rem' : '0.875rem'
                  }}
                  title={`${level} - ${EMOTION_DESCRIPTIONS[level as EmotionLevel]}`}
                >
                  {compact ? level : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <IconComponent fontSize="small" />
                      <Typography variant="caption">
                        {level}
                      </Typography>
                    </Box>
                  )}
                </Button>
              );
            })}
          </ButtonGroup>

          {/* Показываем описание выбранного уровня */}
          {selectedLevel && (
            <Fade in>
              <Typography 
                variant="body2" 
                color="textSecondary" 
                align="center" 
                sx={{ mb: 2 }}
              >
                {EMOTION_DESCRIPTIONS[selectedLevel]}
              </Typography>
            </Fade>
          )}

          {/* Теги */}
          {selectedLevel && availableTags.length > 0 && (
            <Fade in>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Уточните ({selectedTags.length}/5):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    const isLimitReached = selectedTags.length >= 5 && !isSelected;
                    
                    return (
                      <Chip
                        key={tag}
                        label={tag}
                        onClick={() => handleTagToggle(tag)}
                        variant={isSelected ? "filled" : "outlined"}
                        size="small"
                        disabled={isLimitReached}
                        sx={{
                          bgcolor: isSelected 
                            ? EMOTION_COLORS[selectedLevel]
                            : 'transparent',
                          borderColor: EMOTION_COLORS[selectedLevel],
                          color: isSelected 
                            ? 'white' 
                            : EMOTION_COLORS[selectedLevel],
                          '&:hover': {
                            bgcolor: alpha(EMOTION_COLORS[selectedLevel], 0.1)
                          },
                          '&.Mui-disabled': {
                            opacity: 0.5,
                            borderColor: alpha(EMOTION_COLORS[selectedLevel], 0.3),
                            color: alpha(EMOTION_COLORS[selectedLevel], 0.3)
                          }
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
            </Fade>
          )}

          {/* Заметки */}
          {selectedLevel && !compact && (
            <Fade in>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Дополнительные заметки (опционально)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                variant="outlined"
                size="small"
                sx={{ mb: 2 }}
                inputProps={{
                  maxLength: 1000
                }}
                helperText={`${notes.length}/1000 символов`}
                error={notes.length > 1000}
              />
            </Fade>
          )}

          {/* Кнопка сохранения */}
          {selectedLevel && (
            <Fade in>
              <Button
                fullWidth
                variant="contained"
                onClick={handleSubmit}
                disabled={isSubmitting}
                sx={{
                  bgcolor: EMOTION_COLORS[selectedLevel],
                  '&:hover': {
                    bgcolor: alpha(EMOTION_COLORS[selectedLevel], 0.8)
                  }
                }}
              >
                {isSubmitting ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </Fade>
          )}

          {/* Подсказка клавиатуры */}
          {!compact && (
            <Typography 
              variant="caption" 
              color="textSecondary" 
              sx={{ mt: 1, display: 'block', textAlign: 'center' }}
            >
              Выберите уровень настроения от 1 до 5
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Уведомление с возможностью отмены */}
      <Snackbar
        open={showUndo}
        autoHideDuration={5000}
        onClose={() => setShowUndo(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          action={
            <Button 
              color="inherit" 
              size="small" 
              startIcon={<UndoIcon />}
              onClick={handleUndo}
            >
              Отменить
            </Button>
          }
          onClose={() => setShowUndo(false)}
        >
          Эмоция сохранена!
        </Alert>
      </Snackbar>
    </Box>
  );
};
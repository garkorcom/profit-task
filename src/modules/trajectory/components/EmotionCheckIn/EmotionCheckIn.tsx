/**
 * Компонент быстрой отметки эмоций
 * Минималистичный UI с возможностью Undo
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { createEmotionLog, optimisticEmotionService } from '../../services/emotionService';
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // Не перехватываем клавиши в полях ввода
      }
      
      const level = parseInt(event.key) as EmotionLevel;
      if (level >= 1 && level <= 5) {
        setSelectedLevel(level);
        setSelectedTags([]); // Сбрасываем теги при смене уровня
      }
      
      if (event.key === 'Enter' && selectedLevel) {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedLevel]);

  // Обработчик выбора уровня
  const handleLevelSelect = useCallback((level: EmotionLevel) => {
    setSelectedLevel(level);
    setSelectedTags([]); // Сбрасываем теги при смене уровня
  }, []);

  // Обработчик выбора тега
  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  // Отправка данных
  const handleSubmit = async () => {
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
  };

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
                  Уточните:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {availableTags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onClick={() => handleTagToggle(tag)}
                      variant={selectedTags.includes(tag) ? "filled" : "outlined"}
                      size="small"
                      sx={{
                        bgcolor: selectedTags.includes(tag) 
                          ? EMOTION_COLORS[selectedLevel]
                          : 'transparent',
                        borderColor: EMOTION_COLORS[selectedLevel],
                        color: selectedTags.includes(tag) 
                          ? 'white' 
                          : EMOTION_COLORS[selectedLevel],
                        '&:hover': {
                          bgcolor: alpha(EMOTION_COLORS[selectedLevel], 0.1)
                        }
                      }}
                    />
                  ))}
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
              Используйте клавиши 1-5 для быстрого выбора, Enter для сохранения
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
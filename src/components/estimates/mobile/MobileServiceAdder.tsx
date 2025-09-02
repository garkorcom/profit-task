/**
 * Мобильный компонент для добавления услуг в смету
 * С AI-помощью, шаблонами и голосовым вводом
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Chip,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Fab,
  CircularProgress,
  InputAdornment,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Mic as MicIcon,
  Smart as AIIcon,
  Template as TemplateIcon,
  Construction as ConstructionIcon,
  Plumbing as PlumbingIcon,
  Electrical as ElectricalIcon,
  Paint as PaintIcon,
  Roofing as RoofingIcon,
  Kitchen as KitchenIcon,
  Bathroom as BathroomIcon,
  Window as WindowIcon,
  Build as BuildIcon,
  ArrowForward as NextIcon,
} from '@mui/icons-material';

interface ServiceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  unit: string;
  estimatedHours: number;
  estimatedRate: number;
  color: string;
}

interface MobileServiceAdderProps {
  onAddService: (service: Partial<any>) => void;
  onAIGenerate?: (description: string) => Promise<any[]>;
}

const MobileServiceAdder: React.FC<MobileServiceAdderProps> = ({
  onAddService,
  onAIGenerate
}) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0); // 0: input, 1: templates, 2: ai, 3: details
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ServiceTemplate | null>(null);
  const [aiSuggestions, setAISuggestions] = useState<any[]>([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const [voiceInput, setVoiceInput] = useState(false);

  // Шаблоны услуг по категориям
  const serviceTemplates: ServiceTemplate[] = [
    // Сантехника
    {
      id: 'plumbing-install',
      name: 'Установка сантехники',
      description: 'Установка унитаза, раковины, смесителей',
      category: 'Сантехника',
      icon: <PlumbingIcon />,
      unit: 'ч',
      estimatedHours: 4,
      estimatedRate: 45,
      color: '#2196f3'
    },
    {
      id: 'pipe-repair',
      name: 'Ремонт труб',
      description: 'Замена участков труб, устранение протечек',
      category: 'Сантехника',
      icon: <PlumbingIcon />,
      unit: 'м',
      estimatedHours: 2,
      estimatedRate: 35,
      color: '#2196f3'
    },
    
    // Электрика
    {
      id: 'electrical-wiring',
      name: 'Электропроводка',
      description: 'Прокладка проводов, установка розеток и выключателей',
      category: 'Электрика',
      icon: <ElectricalIcon />,
      unit: 'м',
      estimatedHours: 1,
      estimatedRate: 25,
      color: '#ff9800'
    },
    {
      id: 'lighting-install',
      name: 'Освещение',
      description: 'Установка светильников, люстр, бра',
      category: 'Электрика',
      icon: <ElectricalIcon />,
      unit: 'шт',
      estimatedHours: 1.5,
      estimatedRate: 30,
      color: '#ff9800'
    },
    
    // Отделка
    {
      id: 'painting',
      name: 'Покраска стен',
      description: 'Покраска стен и потолков, включая грунтовку',
      category: 'Отделка',
      icon: <PaintIcon />,
      unit: 'м2',
      estimatedHours: 0.5,
      estimatedRate: 8,
      color: '#4caf50'
    },
    {
      id: 'flooring',
      name: 'Напольные покрытия',
      description: 'Укладка ламината, паркета, плитки',
      category: 'Отделка',
      icon: <BuildIcon />,
      unit: 'м2',
      estimatedHours: 1,
      estimatedRate: 15,
      color: '#4caf50'
    },
    
    // Кровля
    {
      id: 'roof-repair',
      name: 'Ремонт кровли',
      description: 'Замена черепицы, ремонт стропил',
      category: 'Кровля',
      icon: <RoofingIcon />,
      unit: 'м2',
      estimatedHours: 2,
      estimatedRate: 40,
      color: '#9c27b0'
    }
  ];

  const categories = [...new Set(serviceTemplates.map(t => t.category))];

  const handleVoiceInput = async () => {
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
      setSearchQuery(transcript);
      
      // Автоматически ищем шаблоны по голосовому запросу
      const matchedTemplates = serviceTemplates.filter(t => 
        t.name.toLowerCase().includes(transcript.toLowerCase()) ||
        t.description.toLowerCase().includes(transcript.toLowerCase())
      );
      
      if (matchedTemplates.length > 0) {
        setStep(1); // Переходим к шаблонам
      } else if (onAIGenerate) {
        handleAIGenerate(transcript);
      }
    };
    
    recognition.start();
  };

  const handleAIGenerate = async (query: string) => {
    if (!onAIGenerate) return;
    
    setIsAILoading(true);
    setStep(2);
    
    try {
      const suggestions = await onAIGenerate(query);
      setAISuggestions(suggestions);
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsAILoading(false);
    }
  };

  const handleTemplateSelect = (template: ServiceTemplate) => {
    const service = {
      name: template.name,
      description: template.description,
      unit: template.unit,
      rate: template.estimatedRate,
      pert: {
        optimistic: Math.max(1, template.estimatedHours * 0.7),
        mostLikely: template.estimatedHours,
        pessimistic: template.estimatedHours * 1.5
      }
    };
    
    onAddService(service);
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setStep(0);
    setSearchQuery('');
    setSelectedTemplate(null);
    setAISuggestions([]);
  };

  const filteredTemplates = serviceTemplates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Floating Action Button */}
      <Fab
        color="primary"
        size="large"
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: 1000,
          width: 64,
          height: 64,
        }}
      >
        <AddIcon sx={{ fontSize: 28 }} />
      </Fab>

      {/* Main Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        fullScreen
        sx={{
          '& .MuiDialog-paper': {
            margin: 0,
            maxHeight: '100vh',
            borderRadius: 0
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AddIcon />
            <Typography variant="h6">
              {step === 0 ? 'Добавить услугу' :
               step === 1 ? 'Выберите шаблон' :
               step === 2 ? 'AI предложения' : 'Детали услуги'}
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          {/* Step 0: Input */}
          {step === 0 && (
            <Stack spacing={3}>
              {/* Voice/Text Input */}
              <Stack direction="row" spacing={1}>
                <TextField
                  label="🔍 Что нужно сделать?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Например: установить унитаз, покрасить стены, поменять проводку..."
                  InputProps={{
                    style: { fontSize: '1.1rem' },
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <Button 
                          variant="contained" 
                          size="small"
                          startIcon={<AIIcon />}
                          onClick={() => handleAIGenerate(searchQuery)}
                        >
                          AI
                        </Button>
                      </InputAdornment>
                    )
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={handleVoiceInput}
                  sx={{ 
                    minWidth: 64,
                    minHeight: 64,
                    color: voiceInput ? '#f44336' : 'primary.main',
                    borderColor: voiceInput ? '#f44336' : 'primary.main',
                    borderWidth: voiceInput ? 3 : 1
                  }}
                >
                  <MicIcon sx={{ fontSize: 28 }} />
                </Button>
              </Stack>

              <Stack direction="row" spacing={1} justifyContent="center">
                <Button
                  variant="contained"
                  startIcon={<TemplateIcon />}
                  onClick={() => setStep(1)}
                  size="large"
                  sx={{ flex: 1, py: 1.5 }}
                >
                  Шаблоны
                </Button>
                {onAIGenerate && (
                  <Button
                    variant="outlined"
                    startIcon={<AIIcon />}
                    onClick={() => searchQuery ? handleAIGenerate(searchQuery) : null}
                    disabled={!searchQuery.trim()}
                    size="large"
                    sx={{ flex: 1, py: 1.5 }}
                  >
                    AI Помощь
                  </Button>
                )}
              </Stack>

              {/* Quick suggestions based on input */}
              {searchQuery.trim() && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    💡 Похожие шаблоны:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {filteredTemplates.slice(0, 3).map((template) => (
                      <Chip
                        key={template.id}
                        label={template.name}
                        icon={template.icon}
                        onClick={() => handleTemplateSelect(template)}
                        variant="outlined"
                        sx={{ 
                          minHeight: 40,
                          '& .MuiChip-icon': { color: template.color }
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}

          {/* Step 1: Templates */}
          {step === 1 && (
            <Stack spacing={2}>
              {categories.map((category) => (
                <Box key={category}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    {category}
                  </Typography>
                  <Grid container spacing={1}>
                    {serviceTemplates
                      .filter(t => t.category === category)
                      .filter(t => !searchQuery || 
                        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.description.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((template) => (
                        <Grid item xs={12} sm={6} key={template.id}>
                          <Card
                            variant="outlined"
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': {
                                elevation: 4,
                                transform: 'translateY(-2px)',
                                borderColor: template.color
                              }
                            }}
                            onClick={() => handleTemplateSelect(template)}
                          >
                            <CardContent sx={{ p: 2 }}>
                              <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                                <Box sx={{ color: template.color, fontSize: 28 }}>
                                  {template.icon}
                                </Box>
                                <Box flexGrow={1}>
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {template.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ~{template.estimatedHours}ч × ${template.estimatedRate}
                                  </Typography>
                                </Box>
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                {template.description}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                  </Grid>
                </Box>
              ))}
            </Stack>
          )}

          {/* Step 2: AI Suggestions */}
          {step === 2 && (
            <Stack spacing={2}>
              {isAILoading ? (
                <Box textAlign="center" py={4}>
                  <CircularProgress size={48} />
                  <Typography variant="h6" mt={2}>
                    🤖 AI анализирует запрос...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Генерируем оптимальные услуги для "{searchQuery}"
                  </Typography>
                </Box>
              ) : (
                <>
                  <Alert severity="info" icon={<AIIcon />}>
                    AI предложения для: "{searchQuery}"
                  </Alert>
                  {aiSuggestions.map((suggestion, index) => (
                    <Card key={index} variant="outlined">
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box flexGrow={1}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {suggestion.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={1}>
                              {suggestion.description}
                            </Typography>
                            <Typography variant="caption">
                              {suggestion.estimatedHours}ч × ${suggestion.rate} = ${(suggestion.estimatedHours * suggestion.rate).toFixed(2)}
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => {
                              onAddService(suggestion);
                              handleClose();
                            }}
                          >
                            Добавить
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 0 }}>
          {step > 0 && (
            <Button onClick={() => setStep(step - 1)} size="large">
              Назад
            </Button>
          )}
          <Button onClick={handleClose} size="large">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MobileServiceAdder;
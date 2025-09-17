/**
 * Мобильная версия конструктора смет
 * Полностью переработанный UX для touch-устройств
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Stack,
  Card,
  CardContent,
  Button,
  Divider,
  Alert,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slide,
  useTheme,
  useMediaQuery,
  SpeedDial,
  SpeedDialAction,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Share as ShareIcon,
  Psychology as AIIcon,
  Dashboard as TemplateIcon,
  Calculate as CalcIcon,
  Summarize as SummaryIcon,
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';

import MobileServiceCard from './MobileServiceCard';
import MobileServiceAdder from './MobileServiceAdder';
import { generateEstimateWithClaude } from '../../../api/anthropicApi';
import { useAuth } from '../../../auth/AuthContext';
import { Estimate } from '../../../types/estimate.types';

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

interface MobileEstimateConstructorProps {
  estimate: Estimate | null;
  onSave: (data: any) => void;
  onBack: () => void;
  saving?: boolean;
}

const Transition = React.forwardRef<unknown, TransitionProps & { children: React.ReactElement }>(
  function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
  },
);

const MobileEstimateConstructor: React.FC<MobileEstimateConstructorProps> = ({
  estimate,
  onSave,
  onBack,
  saving = false
}) => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load services from estimate
  useEffect(() => {
    if (estimate?.blocks) {
      const servicesBlock = estimate.blocks.find(b => b.key === 'services');
      if (servicesBlock?.data && typeof servicesBlock.data === 'object' && servicesBlock.data !== null) {
        const data = servicesBlock.data as any;
        if (Array.isArray(data.rows)) {
          setServices(data.rows as ServiceRow[]);
        }
      }
    }
  }, [estimate]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (services.length === 0) return;
    
    const autoSaveTimer = setInterval(() => {
      handleAutoSave();
    }, 30000);

    return () => clearInterval(autoSaveTimer);
  }, [services]);

  const handlePreview = () => {
    if (!estimate) return;
    
    // Открываем предпросмотр в новом окне, используя публичную страницу
    const previewUrl = `${window.location.origin}/public/estimate/${estimate.id}`;
    window.open(previewUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  };

  const handleAutoSave = useCallback(async () => {
    if (services.length === 0) return;
    
    setAutoSaving(true);
    try {
      const data = {
        sections: [{ id: 'main', title: 'Основные работы' }],
        rows: services,
        hourlyRate: 50
      };
      
      // Don't await to avoid blocking UI
      onSave(data);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  }, [services, onSave]);

  const handleAddService = (serviceData: Partial<ServiceRow>) => {
    const newService: ServiceRow = {
      id: `service-${Date.now()}`,
      name: serviceData.name || 'Новая услуга',
      description: serviceData.description || '',
      unit: serviceData.unit || 'ч',
      rate: serviceData.rate || 50,
      pert: serviceData.pert || {
        optimistic: 1,
        mostLikely: 2,
        pessimistic: 4
      },
      sectionId: 'main'
    };
    
    setServices(prev => [...prev, newService]);
    setExpandedService(newService.id);
  };

  const handleUpdateService = (id: string, updates: Partial<ServiceRow>) => {
    setServices(prev => prev.map(service => 
      service.id === id ? { ...service, ...updates } : service
    ));
  };

  const handleDeleteService = (id: string) => {
    setServices(prev => prev.filter(service => service.id !== id));
    if (expandedService === id) {
      setExpandedService(null);
    }
  };

  const handleDuplicateService = (id: string) => {
    const serviceToClone = services.find(s => s.id === id);
    if (serviceToClone) {
      const clonedService: ServiceRow = {
        ...serviceToClone,
        id: `service-${Date.now()}`,
        name: `${serviceToClone.name} (копия)`
      };
      setServices(prev => [...prev, clonedService]);
      setExpandedService(clonedService.id);
    }
  };

  const handleAIGenerate = async (description: string): Promise<any[]> => {
    try {
      const aiResponse = await generateEstimateWithClaude(description, 'claude-3-haiku-20240307');
      
      // Transform AI response to our service format
      const services: any[] = [];
      
      aiResponse.sections.forEach(section => {
        section.items.forEach(item => {
          services.push({
            name: item.name,
            description: item.description,
            unit: item.unit,
            rate: item.rate,
            estimatedHours: item.quantity,
            pert: {
              optimistic: Math.max(1, item.quantity * 0.7),
              mostLikely: item.quantity,
              pessimistic: item.quantity * 1.5
            }
          });
        });
      });
      
      return services;
    } catch (error) {
      console.error('AI generation failed:', error);
      throw error;
    }
  };

  const calculateTotals = () => {
    let totalHours = 0;
    let totalCost = 0;
    
    services.forEach(service => {
      const hours = service.pert ? ((service.pert.optimistic || 0) + 4 * (service.pert.mostLikely || 0) + (service.pert.pessimistic || 0)) / 6 : 0;
      totalHours += hours;
      totalCost += hours * service.rate;
    });
    
    return { totalHours, totalCost };
  };

  const { totalHours, totalCost } = calculateTotals();
  const progress = services.length > 0 ? Math.min((services.length / 10) * 100, 100) : 0;

  const speedDialActions = [
    { icon: <AIIcon />, name: 'AI Помощь', onClick: () => {} },
    { icon: <TemplateIcon />, name: 'Шаблоны', onClick: () => {} },
    { icon: <CalcIcon />, name: 'Калькулятор', onClick: () => setShowSummary(true) },
    { icon: <SaveIcon />, name: 'Сохранить', onClick: () => onSave({ sections: [{ id: 'main', title: 'Основные работы' }], rows: services, hourlyRate: 50 }) },
  ];

  if (!isMobile) {
    return (
      <Alert severity="info">
        Мобильный конструктор оптимизирован для использования на планшетах и телефонах.
        На больших экранах используйте обычную версию конструктора.
      </Alert>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)',
      pb: 10 // Space for FAB
    }}>
      {/* Mobile AppBar */}
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={onBack}
            sx={{ mr: 2 }}
          >
            <BackIcon />
          </IconButton>
          
          <Box flexGrow={1}>
            <Typography variant="h6" noWrap>
              📋 Конструктор сметы
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption">
                {services.length} услуг
              </Typography>
              {lastSaved && (
                <>
                  <Typography variant="caption" color="text.secondary">•</Typography>
                  <Typography variant="caption" color="text.secondary">
                    сохранено {lastSaved.toLocaleTimeString()}
                  </Typography>
                </>
              )}
              {autoSaving && (
                <>
                  <Typography variant="caption" color="text.secondary">•</Typography>
                  <Typography variant="caption" color="warning.main">
                    сохраняется...
                  </Typography>
                </>
              )}
            </Stack>
          </Box>
          
          <IconButton color="inherit" onClick={handlePreview} title="Предпросмотр">
            <PreviewIcon />
          </IconButton>
        </Toolbar>
        
        {/* Progress bar */}
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ 
            height: 3,
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #4caf50, #81c784)'
            }
          }} 
        />
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 2 }}>
        {/* Summary Card */}
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)' }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  ${totalCost.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {totalHours.toFixed(1)} часов работы
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<SummaryIcon />}
                onClick={() => setShowSummary(true)}
                size="large"
              >
                Детали
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Services List */}
        {services.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 6 }}>
            <CardContent>
              <Typography variant="h5" color="text.secondary" mb={2}>
                🛠️ Начните добавлять услуги
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={3}>
                Используйте кнопку "+" для добавления работ и услуг в смету
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center">
                <Chip label="📋 Шаблоны" variant="outlined" />
                <Chip label="🤖 AI-помощь" variant="outlined" />
                <Chip label="🎤 Голосовой ввод" variant="outlined" />
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={1}>
            {services.map((service, index) => (
              <MobileServiceCard
                key={service.id}
                service={service}
                onUpdate={handleUpdateService}
                onDelete={handleDeleteService}
                onDuplicate={handleDuplicateService}
                expanded={expandedService === service.id}
                onToggleExpand={() => 
                  setExpandedService(current => current === service.id ? null : service.id)
                }
              />
            ))}
          </Stack>
        )}
      </Container>

      {/* Service Adder */}
      <MobileServiceAdder
        onAddService={handleAddService}
        onAIGenerate={handleAIGenerate}
      />

      {/* Speed Dial for quick actions */}
      <SpeedDial
        ariaLabel="Быстрые действия"
        sx={{ 
          position: 'fixed', 
          bottom: 150, 
          left: 16,
          '& .MuiSpeedDial-fab': {
            width: 48,
            height: 48
          }
        }}
        icon={<CalcIcon />}
        direction="up"
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.onClick}
            sx={{
              '& .MuiSpeedDialAction-fab': {
                width: 44,
                height: 44,
                minHeight: 44
              }
            }}
          />
        ))}
      </SpeedDial>

      {/* Summary Dialog */}
      <Dialog
        open={showSummary}
        onClose={() => setShowSummary(false)}
        TransitionComponent={Transition}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>📊 Итоговая смета</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Общая стоимость:</Typography>
                  <Typography variant="h6" color="primary" fontWeight="bold">
                    ${totalCost.toFixed(2)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Общее время:
                  </Typography>
                  <Typography variant="body2">
                    {totalHours.toFixed(1)} часов
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Divider />

            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Разбивка по услугам:
              </Typography>
              {services.map((service) => {
                const hours = service.pert ? ((service.pert.optimistic || 0) + 4 * (service.pert.mostLikely || 0) + (service.pert.pessimistic || 0)) / 6 : 0;
                const cost = hours * service.rate;
                return (
                  <Stack key={service.id} direction="row" justifyContent="space-between" alignItems="center">
                    <Box flexGrow={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {service.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {hours.toFixed(1)} {service.unit} × ${service.rate}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold">
                      ${cost.toFixed(2)}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSummary(false)}>Закрыть</Button>
          <Button 
            variant="contained" 
            startIcon={<ShareIcon />}
            onClick={() => {
              // Share functionality
              setShowSummary(false);
            }}
          >
            Поделиться
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileEstimateConstructor;
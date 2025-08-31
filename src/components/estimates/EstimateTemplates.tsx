import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  TextField,
  Box,
  Typography,
  Chip,
  Stack,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Save as SaveIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { EstimateItem } from '../../legacy/api/estimateApi';

interface EstimateTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  items: EstimateItem[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

interface EstimateTemplatesProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (template: EstimateTemplate) => void;
  currentEstimate?: {
    name: string;
    items: EstimateItem[];
  };
  onSaveAsTemplate?: (template: Omit<EstimateTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
}

const defaultTemplates: EstimateTemplate[] = [
  {
    id: 'web-app-basic',
    name: 'Базовое веб-приложение',
    description: 'Шаблон для простого веб-приложения с авторизацией и базовым функционалом',
    category: 'Веб-разработка',
    items: [
      {
        id: '1',
        name: 'Frontend разработка',
        description: 'Разработка пользовательского интерфейса',
        pertEstimate: {
          optimistic: 40,
          mostLikely: 60,
          pessimistic: 80
        },
        unit: 'часов',
        quantity: 1,
        rate: 5000,
        total: 5000,
        type: 'work',
        level: 0,
        order: 1
      },
      {
        id: '1.1',
        name: 'Дизайн и верстка',
        description: 'UI/UX дизайн и HTML/CSS верстка',
        pertEstimate: {
          optimistic: 16,
          mostLikely: 24,
          pessimistic: 32
        },
        unit: 'часов',
        quantity: 1,
        rate: 5000,
        total: 5000,
        type: 'work',
        level: 1,
        order: 1,
        parentId: '1'
      },
      {
        id: '1.2',
        name: 'React компоненты',
        description: 'Разработка React компонентов',
        pertEstimate: {
          optimistic: 24,
          mostLikely: 36,
          pessimistic: 48
        },
        unit: 'часов',
        quantity: 1,
        rate: 5000,
        total: 5000,
        type: 'work',
        level: 1,
        order: 2,
        parentId: '1'
      },
      {
        id: '2',
        name: 'Backend разработка',
        description: 'Серверная часть приложения',
        pertEstimate: {
          optimistic: 32,
          mostLikely: 48,
          pessimistic: 64
        },
        unit: 'часов',
        quantity: 1,
        rate: 5500,
        total: 5500,
        type: 'work',
        level: 0,
        order: 2
      },
      {
        id: '2.1',
        name: 'API разработка',
        description: 'REST API endpoints',
        pertEstimate: {
          optimistic: 20,
          mostLikely: 30,
          pessimistic: 40
        },
        unit: 'часов',
        quantity: 1,
        rate: 5500,
        total: 5500,
        type: 'work',
        level: 1,
        order: 1,
        parentId: '2'
      },
      {
        id: '2.2',
        name: 'База данных',
        description: 'Проектирование и настройка БД',
        pertEstimate: {
          optimistic: 12,
          mostLikely: 18,
          pessimistic: 24
        },
        unit: 'часов',
        quantity: 1,
        rate: 5500,
        total: 5500,
        type: 'work',
        level: 1,
        order: 2,
        parentId: '2'
      }
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    usageCount: 15
  },
  {
    id: 'mobile-app',
    name: 'Мобильное приложение',
    description: 'Шаблон для кросс-платформенного мобильного приложения',
    category: 'Мобильная разработка',
    items: [
      {
        id: '1',
        name: 'React Native разработка',
        description: 'Кросс-платформенная разработка',
        pertEstimate: {
          optimistic: 80,
          mostLikely: 120,
          pessimistic: 160
        },
        unit: 'часов',
        quantity: 1,
        rate: 6000,
        total: 6000,
        type: 'work',
        level: 0,
        order: 1
      },
      {
        id: '2',
        name: 'Тестирование',
        description: 'QA и тестирование на устройствах',
        pertEstimate: {
          optimistic: 20,
          mostLikely: 30,
          pessimistic: 40
        },
        unit: 'часов',
        quantity: 1,
        rate: 3500,
        total: 3500,
        type: 'work',
        level: 0,
        order: 2
      }
    ],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    usageCount: 8
  },
  {
    id: 'ecommerce',
    name: 'Интернет-магазин',
    description: 'Полноценный e-commerce проект с каталогом, корзиной и оплатой',
    category: 'E-commerce',
    items: [
      {
        id: '1',
        name: 'Каталог товаров',
        description: 'Разработка каталога с фильтрами и поиском',
        pertEstimate: {
          optimistic: 40,
          mostLikely: 60,
          pessimistic: 80
        },
        unit: 'часов',
        quantity: 1,
        rate: 5000,
        total: 5000,
        type: 'work',
        level: 0,
        order: 1
      },
      {
        id: '2',
        name: 'Корзина и оформление заказа',
        description: 'Функционал корзины и процесс checkout',
        pertEstimate: {
          optimistic: 24,
          mostLikely: 36,
          pessimistic: 48
        },
        unit: 'часов',
        quantity: 1,
        rate: 5000,
        total: 5000,
        type: 'work',
        level: 0,
        order: 1
      },
      {
        id: '3',
        name: 'Интеграция платежей',
        description: 'Подключение платежных систем',
        pertEstimate: {
          optimistic: 16,
          mostLikely: 24,
          pessimistic: 32
        },
        unit: 'часов',
        quantity: 1,
        rate: 6000,
        total: 6000,
        type: 'work',
        level: 0,
        order: 1
      },
      {
        id: '4',
        name: 'Админ-панель',
        description: 'Управление товарами и заказами',
        pertEstimate: {
          optimistic: 32,
          mostLikely: 48,
          pessimistic: 64
        },
        unit: 'часов',
        quantity: 1,
        rate: 4500,
        total: 4500,
        type: 'work',
        level: 0,
        order: 4
      }
    ],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    usageCount: 12
  }
];

export const EstimateTemplates: React.FC<EstimateTemplatesProps> = ({
  open,
  onClose,
  onSelectTemplate,
  currentEstimate,
  onSaveAsTemplate
}) => {
  const [templates, setTemplates] = useState<EstimateTemplate[]>(defaultTemplates);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: ''
  });

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const handleUseTemplate = (template: EstimateTemplate) => {
    // Увеличиваем счетчик использования
    setTemplates(prev => prev.map(t => 
      t.id === template.id 
        ? { ...t, usageCount: t.usageCount + 1 }
        : t
    ));
    onSelectTemplate(template);
    onClose();
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
  };

  const handleSaveAsTemplate = () => {
    if (currentEstimate && newTemplate.name && newTemplate.category) {
      const template: EstimateTemplate = {
        id: `custom-${Date.now()}`,
        name: newTemplate.name,
        description: newTemplate.description,
        category: newTemplate.category,
        items: currentEstimate.items,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0
      };
      
      setTemplates(prev => [...prev, template]);
      
      if (onSaveAsTemplate) {
        onSaveAsTemplate({
          name: template.name,
          description: template.description,
          category: template.category,
          items: template.items
        });
      }
      
      setSaveDialogOpen(false);
      setNewTemplate({ name: '', description: '', category: '' });
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">Шаблоны эстимейтов</Typography>
            {currentEstimate && (
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={() => setSaveDialogOpen(true)}
                size="small"
              >
                Сохранить текущий как шаблон
              </Button>
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3}>
            {/* Фильтр по категориям */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Категории:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {categories.map(category => (
                  <Chip
                    key={category}
                    label={category === 'all' ? 'Все' : category}
                    onClick={() => setSelectedCategory(category)}
                    color={selectedCategory === category ? 'primary' : 'default'}
                    variant={selectedCategory === category ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
            </Box>

            {/* Список шаблонов */}
            <Grid container spacing={2}>
              {filteredTemplates.map(template => (
                <Grid size={{ xs: 12, md: 6 }} key={template.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Box flex={1}>
                          <Typography variant="h6" gutterBottom>
                            {template.name}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                            <Chip 
                              label={template.category} 
                              size="small" 
                              icon={<CategoryIcon />}
                              color="primary"
                              variant="outlined"
                            />
                            <Chip 
                              label={`${template.usageCount} использований`} 
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {template.description}
                          </Typography>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="caption" color="text.secondary">
                            Содержит {template.items.length} основных разделов
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        startIcon={<CopyIcon />}
                        onClick={() => handleUseTemplate(template)}
                      >
                        Использовать
                      </Button>
                      {template.id.startsWith('custom-') && (
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteTemplate(template.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {filteredTemplates.length === 0 && (
              <Alert severity="info">
                Нет шаблонов в выбранной категории
              </Alert>
            )}
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      {/* Диалог сохранения нового шаблона */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Сохранить как шаблон</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Название шаблона"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Категория"
              value={newTemplate.category}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
              fullWidth
              required
              placeholder="Например: Веб-разработка"
            />
            <TextField
              label="Описание"
              value={newTemplate.description}
              onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleSaveAsTemplate} 
            variant="contained"
            disabled={!newTemplate.name || !newTemplate.category}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

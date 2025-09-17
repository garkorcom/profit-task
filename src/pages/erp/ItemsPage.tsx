/**
 * ItemsPage - Главная страница управления номенклатурой
 * Объединяет ItemList и ItemForm для полного управления элементами
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Dialog,
  DialogContent,
  useMediaQuery,
  useTheme,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Home as HomeIcon,
  Category as ItemsIcon
} from '@mui/icons-material';
import { Item, CreateItemDto, UpdateItemDto } from '../../types/item.types';
import { createItem, updateItem } from '../../api/itemApi';
import ItemFormSimple from '../../components/erp/items/ItemFormSimple';
import ItemList from '../../components/erp/items/ItemList';
import { useAuth } from '../../auth/AuthContext';

const ItemsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentUser } = useAuth();
  
  // Состояние UI
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Обработчики событий
  const handleCreate = () => {
    setSelectedItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: Item) => {
    setSelectedItem(item);
    setFormOpen(true);
  };

  const handleView = (item: Item) => {
    // В будущем: открыть детальный просмотр
    console.log('View item:', item);
  };

  const handleSave = async (itemData: CreateItemDto | UpdateItemDto) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      if (selectedItem) {
        // Обновление существующего элемента
        await updateItem(selectedItem.id, itemData as UpdateItemDto);
        setMessage({ text: 'Элемент успешно обновлен', type: 'success' });
      } else {
        // Создание нового элемента
        await createItem(itemData as CreateItemDto);
        setMessage({ text: 'Элемент успешно создан', type: 'success' });
      }
      
      setFormOpen(false);
      setSelectedItem(null);
      
    } catch (error) {
      console.error('Error saving item:', error);
      setMessage({ 
        text: error instanceof Error ? error.message : 'Ошибка сохранения', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormOpen(false);
    setSelectedItem(null);
  };

  const handleCloseMessage = () => {
    setMessage(null);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Хлебные крошки */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link 
          color="inherit" 
          href="/" 
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <HomeIcon fontSize="small" />
          Главная
        </Link>
        <Typography 
          color="textPrimary" 
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <ItemsIcon fontSize="small" />
          Номенклатура
        </Typography>
      </Breadcrumbs>

      {/* Заголовок */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Управление номенклатурой
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Единый справочник товаров, услуг и комплектов для проектов
        </Typography>
      </Box>

      {/* Список номенклатуры */}
      <ItemList
        onEdit={handleEdit}
        onView={handleView}
        showActions={true}
      />

      {/* Форма создания/редактирования */}
      <Dialog
        open={formOpen}
        onClose={handleCancel}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogContent sx={{ p: 0 }}>
          <ItemFormSimple
            item={selectedItem || undefined}
            onSave={handleSave}
            onCancel={handleCancel}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Уведомления */}
      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={handleCloseMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseMessage} 
          severity={message?.type}
          sx={{ width: '100%' }}
        >
          {message?.text}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ItemsPage;

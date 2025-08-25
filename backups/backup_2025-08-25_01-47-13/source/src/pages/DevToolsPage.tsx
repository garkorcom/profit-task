import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Alert,
  AlertTitle,
  Container,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Avatar,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  BugReport as BugIcon,
  Build as BuildIcon,
  CleaningServices as CleanIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Terminal as TerminalIcon,
  RestartAlt as RestartIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { db } from '../firebase/firebase';
import { collection, getDocs, doc, writeBatch, serverTimestamp, query, where, limit, getDoc, deleteField } from 'firebase/firestore';

const DevToolsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: () => void } | null>(null);

  const workspaceUid = currentUser?.uid || null;

  const findProjectIdByName = async (name: string): Promise<string | null> => {
    if (!workspaceUid || !name) return null;
    const q = query(collection(db, `users/${workspaceUid}/projects`), where('name', '==', name), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].id;
  };

  const migrateTasksToNewFormat = async () => {
    if (!workspaceUid) {
      setMessage({ type: 'error', text: 'Нет UID рабочей области. Войдите как админ.' });
      return;
    }
    setLoading('migrate-tasks');
    setMessage(null);
    try {
      const tasksCol = collection(db, `users/${workspaceUid}/tasks`);
      const snap = await getDocs(tasksCol);
      if (snap.empty) {
        setMessage({ type: 'info', text: 'Задач не найдено. Миграция не требуется.' });
        setLoading(null);
        return;
      }

      const statusMap: Record<string, string> = { pending: 'new', completed: 'done' };
      let batch = writeBatch(db);
      let ops = 0;
      let updated = 0;

      for (const d of snap.docs) {
        const data: any = d.data();
        const updates: any = {};

        // Title normalization: prefer title, then name, then task
        const title: string | undefined = data.title || data.name || data.task;
        if (!data.title && title) updates.title = String(title);

        // Status normalization
        const oldStatus: string | undefined = data.status;
        if (oldStatus && statusMap[oldStatus]) updates.status = statusMap[oldStatus];

        // Default type
        if (!data.type) updates.type = 'task';

        // Project link by name
        if (!data.projectId && data.projectName) {
          const pid = await findProjectIdByName(String(data.projectName));
          if (pid) updates.projectId = pid;
        }

        // createdBy
        if (!data.createdBy) updates.createdBy = workspaceUid;

        // Cleanup old fields
        if (data.name) updates.name = deleteField();
        if (data.task) updates.task = deleteField();
        // Keep contractor fields for now; projectName can be removed if projectId set
        if (data.projectName && updates.projectId) updates.projectName = deleteField();

        // Code fallback
        if (!data.code) updates.code = `T-${d.id.slice(0, 6).toUpperCase()}`;

        updates.updatedAt = serverTimestamp();

        if (Object.keys(updates).length > 0) {
          batch.update(doc(db, `users/${workspaceUid}/tasks/${d.id}`), updates);
          ops += 1;
          updated += 1;
          if (ops >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            ops = 0;
          }
        }
      }

      if (ops > 0) {
        await batch.commit();
      }

      setMessage({ type: 'success', text: `Миграция завершена. Обновлено задач: ${updated}.` });
    } catch (e: any) {
      setMessage({ type: 'error', text: `Ошибка миграции: ${e?.message || e}` });
    } finally {
      setLoading(null);
    }
  };

  // Функция очистки кеша браузера
  const clearBrowserCache = async () => {
    setLoading('browser-cache');
    try {
      // Очистка Service Worker кеша
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }
      
      // Очистка localStorage
      localStorage.clear();
      
      // Очистка sessionStorage
      sessionStorage.clear();
      
      setMessage({ type: 'success', text: 'Кеш браузера очищен! Страница будет перезагружена...' });
      
      // Перезагрузка через 2 секунды
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка при очистке кеша браузера' });
    } finally {
      setLoading(null);
    }
  };

  // Функция очистки localStorage
  const clearLocalStorage = () => {
    setLoading('local-storage');
    try {
      const keysToKeep = ['firebaseAuth']; // Сохраняем авторизацию
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!keysToKeep.some(keepKey => key.includes(keepKey))) {
          localStorage.removeItem(key);
        }
      });
      
      setMessage({ type: 'success', text: 'LocalStorage очищен (кроме авторизации)' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка при очистке localStorage' });
    } finally {
      setLoading(null);
    }
  };

  // Функция для показа информации о кеше
  const showCacheInfo = () => {
    const info = {
      localStorage: `${Object.keys(localStorage).length} ключей`,
      sessionStorage: `${Object.keys(sessionStorage).length} ключей`,
      localStorageSize: new Blob(Object.values(localStorage)).size,
      sessionStorageSize: new Blob(Object.values(sessionStorage)).size,
    };
    
    setMessage({ 
      type: 'info', 
      text: `LocalStorage: ${info.localStorage} (${(info.localStorageSize / 1024).toFixed(2)} KB)\nSessionStorage: ${info.sessionStorage} (${(info.sessionStorageSize / 1024).toFixed(2)} KB)` 
    });
  };

  // Функция для перезапуска приложения
  const restartApp = () => {
    setLoading('restart');
    setMessage({ type: 'info', text: 'Перезапуск приложения...' });
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  // Инструменты разработчика
  const devTools = [
    {
      title: 'Очистка кеша браузера',
      description: 'Полная очистка всех кешей браузера, localStorage и sessionStorage',
      icon: <DeleteIcon />,
      color: 'error' as const,
      action: () => setConfirmDialog({
        open: true,
        action: clearBrowserCache
      }),
      dangerous: true,
    },
    {
      title: 'Очистка localStorage',
      description: 'Очистка localStorage кроме данных авторизации',
      icon: <StorageIcon />,
      color: 'warning' as const,
      action: clearLocalStorage,
      dangerous: false,
    },
    {
      title: 'Информация о кеше',
      description: 'Показать размер и количество данных в хранилищах',
      icon: <InfoIcon />,
      color: 'info' as const,
      action: showCacheInfo,
      dangerous: false,
    },
    {
      title: 'Перезапустить приложение',
      description: 'Мягкий перезапуск без очистки данных',
      icon: <RestartIcon />,
      color: 'primary' as const,
      action: restartApp,
      dangerous: false,
    },
    {
      title: 'Миграция задач в новый формат',
      description: 'Преобразует старые поля (name/task, pending/completed) в новый формат',
      icon: <BuildIcon />,
      color: 'secondary' as const,
      action: migrateTasksToNewFormat,
      dangerous: false,
    },
    {
      title: 'Диагностика времени',
      description: 'Проверка и исправление модуля учета времени',
      icon: <BugIcon />,
      color: 'secondary' as const,
      action: () => navigate('/time-tracking-diagnostics'),
      dangerous: false,
    },
  ];

  // Команды терминала
  const terminalCommands = [
    {
      title: 'Очистить кеш и запустить',
      command: 'npm run clean-start',
      description: 'Очищает node_modules/.cache и запускает сервер',
    },
    {
      title: 'Полный перезапуск',
      command: 'npm run fresh-start',
      description: 'Убивает все процессы, очищает кеш и запускает заново',
    },
    {
      title: 'Только очистка кеша',
      command: 'npm run clean-cache',
      description: 'Очищает кеш без запуска сервера',
    },
    {
      title: 'Сборка для продакшена',
      command: 'npm run build',
      description: 'Создает оптимизированную сборку',
    },
    {
      title: 'Деплой на Firebase',
      command: 'npm run build && firebase deploy --only hosting',
      description: 'Собирает и деплоит на Firebase',
    },
  ];

  // Копирование команды в буфер
  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setMessage({ type: 'success', text: `Команда скопирована: ${command}` });
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Заголовок */}
        <Typography variant="h4" gutterBottom>
          <CodeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Инструменты разработчика
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Управление кешем и отладка приложения
        </Typography>

        {/* Сообщения */}
        {message && (
          <Alert 
            severity={message.type} 
            onClose={() => setMessage(null)}
            sx={{ mb: 3 }}
          >
            <AlertTitle>
              {message.type === 'success' ? 'Успешно' : 
               message.type === 'error' ? 'Ошибка' : 'Информация'}
            </AlertTitle>
            <Typography style={{ whiteSpace: 'pre-line' }}>
              {message.text}
            </Typography>
          </Alert>
        )}

        {/* Инструменты браузера */}
        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          <CleanIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Инструменты браузера
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
          {devTools.map((tool, index) => (
            <Box key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: 3,
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ bgcolor: `${tool.color}.main`, mr: 2 }}>
                      {tool.icon}
                    </Avatar>
                    <Typography variant="h6">
                      {tool.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {tool.description}
                  </Typography>
                  {tool.dangerous && (
                    <Chip 
                      label="Опасно" 
                      color="error" 
                      size="small" 
                      sx={{ mt: 1 }}
                      icon={<WarningIcon />}
                    />
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    color={tool.color}
                    onClick={tool.action}
                    disabled={loading === tool.title}
                    startIcon={loading === tool.title ? <CircularProgress size={20} /> : tool.icon}
                    fullWidth
                  >
                    {loading === tool.title ? 'Выполняется...' : 'Выполнить'}
                  </Button>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>

        {/* Команды терминала */}
        <Typography variant="h5" gutterBottom>
          <TerminalIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Команды терминала
        </Typography>
        
        <Paper sx={{ p: 2 }}>
          <List>
            {terminalCommands.map((cmd, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    <Tooltip title="Копировать команду">
                      <IconButton edge="end" onClick={() => copyCommand(cmd.command)}>
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">{cmd.title}</Typography>
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography 
                          component="span" 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            bgcolor: 'grey.100',
                            p: 0.5,
                            borderRadius: 1,
                            display: 'inline-block',
                            mt: 0.5,
                            mb: 0.5,
                          }}
                        >
                          {cmd.command}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {cmd.description}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>

        {/* Советы */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <AlertTitle>Советы по разработке</AlertTitle>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="Всегда разрабатывайте с открытым DevTools (F12)" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText primary='Включите "Disable cache" во вкладке Network' />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="Используйте режим инкогнито для тестирования" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText primary="Регулярно очищайте кеш при проблемах" />
            </ListItem>
          </List>
        </Alert>

        {/* Диалог подтверждения */}
        <Dialog
          open={confirmDialog?.open || false}
          onClose={() => setConfirmDialog(null)}
        >
          <DialogTitle>
            <WarningIcon color="error" sx={{ mr: 1, verticalAlign: 'middle' }} />
            Подтверждение действия
          </DialogTitle>
          <DialogContent>
            <Typography>
              Это действие очистит весь кеш браузера и перезагрузит страницу.
              Все несохраненные данные будут потеряны.
            </Typography>
            <Typography sx={{ mt: 2 }} color="error">
              Вы уверены, что хотите продолжить?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog(null)}>
              Отмена
            </Button>
            <Button 
              variant="contained" 
              color="error"
              onClick={() => {
                confirmDialog?.action();
                setConfirmDialog(null);
              }}
            >
              Да, очистить
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default DevToolsPage;

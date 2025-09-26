import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Grid,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
  PlayArrow as PlayArrowIcon,
  Send as SendIcon,
  Stop as StopIcon,
  Upload as UploadIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import Autocomplete from '@mui/material/Autocomplete';

import {
  addTaskComment,
  deleteTaskComment,
  subscribeToTask,
  subscribeToTaskComments,
  subscribeToTaskPhotos,
  Task,
  TaskComment,
  TaskPhotoMeta,
  updateTaskFields,
} from '../../api/taskApi';
import { uploadTaskPhoto, deleteTaskPhoto } from '../../api/storageApi';
import Notification from '../../components/common/Notification';
import { useAuth } from '../../auth/AuthContext';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { Project } from '../../types/project.types';
import { useDebouncedCallback } from '../../utils/useDebounced';

interface TaskDetailsDrawerProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  projects: Project[];
}

type SavingState = 'idle' | 'saving' | 'saved' | 'error';

const STATUS_OPTIONS = [
  { value: 'new', label: 'Новая' },
  { value: 'assigned', label: 'Назначена' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'on_hold', label: 'Приостановлена' },
  { value: 'review', label: 'На проверке' },
  { value: 'rework', label: 'На доработке' },
  { value: 'completed', label: 'Завершена' },
  { value: 'cancelled', label: 'Отменена' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Низкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'high', label: 'Высокий' },
  { value: 'critical', label: 'Критический' },
];

const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  new: { label: 'Новая', color: 'default' },
  assigned: { label: 'Назначена', color: 'info' },
  in_progress: { label: 'В работе', color: 'primary' },
  on_hold: { label: 'На паузе', color: 'warning' },
  review: { label: 'На проверке', color: 'secondary' },
  rework: { label: 'Доработка', color: 'warning' },
  completed: { label: 'Завершена', color: 'success' },
  cancelled: { label: 'Отменена', color: 'default' },
};

const PRIORITY_COLORS: Record<string, any> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'error',
};

const MAX_PLANNED_MINUTES = 1440;

const AUTOSAVE_LABEL_TIMEOUT = 1600;

const INITIAL_NOTIFICATION_STATE = {
  open: false,
  message: '',
  severity: 'info' as 'success' | 'error' | 'info' | 'warning',
};

const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({ taskId, open, onClose, projects }) => {
  const { currentUser } = useAuth();
  const {
    isWorking,
    currentTask,
    startWork,
    stopWork,
    isStartingWork,
  } = useTimeTracking();

  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [photos, setPhotos] = useState<TaskPhotoMeta[]>([]);
  const [tab, setTab] = useState(0);

  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [plannedMinutesDraft, setPlannedMinutesDraft] = useState<number | null>(null);
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [projectDraft, setProjectDraft] = useState('');
  const [photoRequiredDraft, setPhotoRequiredDraft] = useState(false);

  const [savingState, setSavingState] = useState<SavingState>('idle');
  const savingTimerRef = useRef<number>();

  const [commentDraft, setCommentDraft] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [notification, setNotification] = useState(INITIAL_NOTIFICATION_STATE);

  useEffect(() => {
    if (!open) {
      setTask(null);
      setComments([]);
      setPhotos([]);
      setTab(0);
      clearSavingTimer();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !currentUser || !taskId) return;

    const unsubscribes: Array<() => void> = [];

    const unsubscribeTask = subscribeToTask(currentUser.uid, taskId, (nextTask) => {
      setTask(nextTask);
    });
    unsubscribes.push(unsubscribeTask);

    const unsubscribeComments = subscribeToTaskComments(currentUser.uid, taskId, setComments);
    unsubscribes.push(unsubscribeComments);

    const unsubscribePhotos = subscribeToTaskPhotos(currentUser.uid, taskId, setPhotos);
    unsubscribes.push(unsubscribePhotos);

    return () => {
      unsubscribes.forEach((fn) => fn());
    };
  }, [open, currentUser, taskId]);

  useEffect(() => {
    if (!task) return;
    setTitleDraft(task.task || '');
    setDescriptionDraft(task.description || '');
    setPlannedMinutesDraft(typeof task.plannedDuration === 'number' ? Math.round(Number(task.plannedDuration) * 60) : null);
    setTagsDraft(task.tags || []);
    setProjectDraft(task.projectId || '');
    setPhotoRequiredDraft(Boolean(task.requirePhoto));
  }, [task]);

  const clearSavingTimer = () => {
    if (savingTimerRef.current) {
      window.clearTimeout(savingTimerRef.current);
      savingTimerRef.current = undefined;
    }
  };

  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotification({ open: true, message, severity });
  }, []);

  const handlePatch = useCallback(
    async (patch: Partial<Task>) => {
      if (!currentUser || !taskId) return;
      try {
        setSavingState('saving');
        clearSavingTimer();
        await updateTaskFields(currentUser.uid, taskId, patch);
        setSavingState('saved');
        savingTimerRef.current = window.setTimeout(() => {
          setSavingState('idle');
        }, AUTOSAVE_LABEL_TIMEOUT);
      } catch (error) {
        console.error('Failed to update task', error);
        setSavingState('error');
        showNotification('Не удалось сохранить изменения', 'error');
      }
    },
    [currentUser, taskId, showNotification]
  );

  const debouncedPatch = useDebouncedCallback((patch: Partial<Task>) => {
    handlePatch(patch);
  }, 650);

  const handleTitleChange = (value: string) => {
    setTitleDraft(value);
    debouncedPatch({ task: value });
  };

  const handleDescriptionChange = (value: string) => {
    setDescriptionDraft(value);
    debouncedPatch({ description: value });
  };

  const handleTagsChange = (_: unknown, value: string[]) => {
    setTagsDraft(value);
    debouncedPatch({ tags: value });
  };

  const handlePlannedMinutesChange = (value: string) => {
    const minutes = value === '' ? null : Math.max(0, Math.min(MAX_PLANNED_MINUTES, Number(value)));
    setPlannedMinutesDraft(minutes);
    if (minutes === null) {
      debouncedPatch({ plannedDuration: null as unknown as number });
    } else {
      debouncedPatch({ plannedDuration: minutes / 60 });
    }
  };

  const handleProjectChange = (projectId: string) => {
    setProjectDraft(projectId);
    const project = projects.find((p) => p.id === projectId);
    handlePatch({ projectId, projectName: project?.name ?? '' });
  };

  const handleStatusChange = (status: string) => {
    handlePatch({ status: status as Task['status'] });
  };

  const handlePriorityChange = (priority: string) => {
    handlePatch({ priority: priority as Task['priority'] });
  };

  const handlePhotoRequiredToggle = (value: boolean) => {
    setPhotoRequiredDraft(value);
    handlePatch({ requirePhoto: value });
  };

  const isActiveTask = isWorking && task && currentTask?.id === task.id;

  const projectForTask = useMemo(() => {
    if (!task) return undefined;
    return projects.find((p) => p.id === task.projectId);
  }, [task, projects]);

  const handleStart = async () => {
    if (!task || !projectForTask) {
      showNotification('У задачи нет привязанного проекта', 'warning');
      return;
    }
    try {
      await startWork({
        task,
        project: projectForTask,
      });
    } catch (error) {
      console.error(error);
      showNotification('Не удалось запустить учет времени', 'error');
    }
  };

  const handleStop = async () => {
    try {
      await stopWork(undefined, undefined, undefined, true);
    } catch (error) {
      console.error(error);
      showNotification('Не удалось остановить учет времени', 'error');
    }
  };

  const handleCommentSubmit = async () => {
    if (!currentUser || !taskId || !commentDraft.trim()) return;
    try {
      const text = commentDraft.trim();
      setCommentDraft('');
      await addTaskComment(currentUser.uid, taskId, text);
    } catch (error) {
      console.error(error);
      showNotification('Не удалось добавить комментарий', 'error');
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    if (!currentUser || !taskId) return;
    try {
      await deleteTaskComment(currentUser.uid, taskId, commentId);
    } catch (error) {
      console.error(error);
      showNotification('Не удалось удалить комментарий', 'error');
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!currentUser || !taskId) return;
    try {
      setUploadProgress(0);
      await uploadTaskPhoto(currentUser.uid, taskId, file, (pct) => setUploadProgress(pct));
      setUploadProgress(null);
    } catch (error) {
      console.error(error);
      setUploadProgress(null);
      showNotification('Не удалось загрузить фото', 'error');
    }
  };

  const handlePhotoDelete = async (photo: TaskPhotoMeta) => {
    if (!currentUser || !taskId) return;
    try {
      await deleteTaskPhoto(currentUser.uid, taskId, photo);
    } catch (error) {
      console.error(error);
      showNotification('Не удалось удалить фото', 'error');
    }
  };

  const handleTabChange = (_: unknown, nextValue: number) => {
    setTab(nextValue);
  };

  const onKeyDownComment = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      handleCommentSubmit();
    }
  };

  const renderHeader = () => (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
      <TextField
        variant="standard"
        fullWidth
        value={titleDraft}
        onChange={(event) => handleTitleChange(event.target.value)}
        placeholder="Название задачи"
        InputProps={{
          sx: {
            fontSize: 20,
            fontWeight: 600,
          },
        }}
      />
      <Stack direction="row" spacing={1} alignItems="center">
        {savingState === 'saving' && (
          <Typography variant="caption" color="text.secondary">
            Сохранение…
          </Typography>
        )}
        {savingState === 'saved' && (
          <Typography variant="caption" color="success.main">
            Сохранено
          </Typography>
        )}
        {savingState === 'error' && (
          <Typography variant="caption" color="error.main">
            Ошибка
          </Typography>
        )}
        <Tooltip title="Закрыть">
          <span>
            <IconButton aria-label="Закрыть" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );

  const renderStatusPriorityControls = () => (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
      <Chip
        label={STATUS_COLORS[task?.status || 'new']?.label || 'Статус'}
        color={(STATUS_COLORS[task?.status || 'new']?.color || 'default') as any}
        variant="outlined"
      />
      <Select
        size="small"
        value={task?.status || 'new'}
        onChange={(event) => handleStatusChange(event.target.value)}
      >
        {STATUS_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>

      <Chip
        label={task?.priority || 'medium'}
        color={PRIORITY_COLORS[task?.priority || 'medium']}
        variant="outlined"
      />
      <Select
        size="small"
        value={task?.priority || 'medium'}
        onChange={(event) => handlePriorityChange(event.target.value)}
      >
        {PRIORITY_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>

      <Button
        size="small"
        variant={isActiveTask ? 'outlined' : 'contained'}
        color={isActiveTask ? 'error' : 'primary'}
        startIcon={isStartingWork ? <CircularProgress size={16} /> : isActiveTask ? <StopIcon /> : <PlayArrowIcon />}
        onClick={isActiveTask ? handleStop : handleStart}
        disabled={!task || isStartingWork}
        sx={{ ml: { md: 'auto' } }}
      >
        {isActiveTask ? 'Стоп' : 'Старт'}
      </Button>
    </Stack>
  );

  const renderDetailsSection = () => (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
          Проект
        </Typography>
        <Select
          fullWidth
          size="small"
          value={projectDraft}
          onChange={(event) => handleProjectChange(event.target.value)}
          displayEmpty
        >
          <MenuItem value="">
            <em>Не выбрано</em>
          </MenuItem>
          {projects.map((project) => (
            <MenuItem key={project.id} value={project.id}>
              {project.name}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <TextField
        label="Описание"
        multiline
        minRows={4}
        fullWidth
        value={descriptionDraft}
        onChange={(event) => handleDescriptionChange(event.target.value)}
      />

      <TextField
        label="Плановое время (минуты)"
        type="number"
        inputProps={{ min: 0, max: MAX_PLANNED_MINUTES }}
        value={plannedMinutesDraft ?? ''}
        onChange={(event) => handlePlannedMinutesChange(event.target.value)}
      />

      <Autocomplete
        multiple
        freeSolo
        options={[]}
        value={tagsDraft}
        onChange={handleTagsChange}
        renderInput={(params) => <TextField {...params} label="Теги" placeholder="Добавьте тег" />}
      />

      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="body2">Требуется фото</Typography>
        <Switch
          checked={photoRequiredDraft}
          onChange={(event) => handlePhotoRequiredToggle(event.target.checked)}
        />
      </Stack>
    </Stack>
  );

  const renderCommentsSection = () => (
    <Stack spacing={2} sx={{ height: '100%' }}>
      <Stack spacing={1} sx={{ flex: 1, overflow: 'auto' }}>
        {comments.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Нет комментариев
          </Typography>
        )}
        {comments.map((comment) => {
          const initials = comment.userName?.[0]?.toUpperCase() || 'U';
          const createdAt = comment.createdAt?.toDate?.().toLocaleString?.() || '';
          const canDelete = comment.userId && comment.userId === currentUser?.uid;
          return (
            <Box
              key={comment.id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                  }}
                >
                  {initials}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2">{comment.userName || 'Пользователь'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {createdAt}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {comment.text}
                  </Typography>
                </Box>
                {canDelete && (
                  <Tooltip title="Удалить">
                    <IconButton size="small" onClick={() => handleCommentDelete(comment.id)} aria-label="Удалить комментарий">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>

      <Stack spacing={1}>
        <TextField
          value={commentDraft}
          onChange={(event) => setCommentDraft(event.target.value)}
          onKeyDown={onKeyDownComment}
          placeholder="Напишите комментарий…"
          multiline
          minRows={2}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleCommentSubmit}
            disabled={!commentDraft.trim()}
          >
            Отправить
          </Button>
        </Box>
      </Stack>
    </Stack>
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderPhotosSection = () => (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={onFileChange}
      />
      <Box
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file) {
            handlePhotoUpload(file);
          }
        }}
        sx={{
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          p: 2,
          textAlign: 'center',
          mb: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Перетащите изображение сюда или загрузите вручную
        </Typography>
        <Button startIcon={<UploadIcon />} sx={{ mt: 1 }} onClick={triggerFileInput}>
          Загрузить фото
        </Button>
      </Box>

      {typeof uploadProgress === 'number' && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="caption" color="text.secondary">
            {Math.round(uploadProgress)}%
          </Typography>
        </Box>
      )}

      {photos.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Фото еще не добавлены
        </Typography>
      ) : (
        <ImageList cols={isMdUp ? 3 : 2} gap={8} rowHeight={160}>
          {photos.map((photo) => (
            <ImageListItem key={photo.id} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img src={photo.url} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <ImageListItemBar
                position="bottom"
                actionIcon={
                  <Stack direction="row" spacing={1} sx={{ mr: 1 }}>
                    <Tooltip title="Открыть в новой вкладке">
                      <IconButton onClick={() => window.open(photo.url, '_blank', 'noopener')} aria-label="Открыть">
                        <OpenInNewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Удалить">
                      <IconButton onClick={() => handlePhotoDelete(photo)} aria-label="Удалить">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
              />
            </ImageListItem>
          ))}
        </ImageList>
      )}
    </Box>
  );

  const body = (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {renderHeader()}
      <Divider sx={{ my: 2 }} />
      {renderStatusPriorityControls()}
      <Divider sx={{ my: 2 }} />

      {isMdUp ? (
        <Grid container spacing={2} sx={{ flex: 1, overflow: 'hidden' }}>
          <Grid item xs={12} md={8} sx={{ height: '100%', overflow: 'auto', pr: 1 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Описание
                </Typography>
                {renderDetailsSection()}
              </Box>
              <Divider />
              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Комментарии
                </Typography>
                {renderCommentsSection()}
              </Box>
              <Divider />
              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Фото
                </Typography>
                {renderPhotosSection()}
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4} sx={{ height: '100%', overflow: 'auto', pl: 1 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Проект
                </Typography>
                <Typography variant="body1">{projectForTask?.name || 'Не выбран'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Плановое время
                </Typography>
                <Typography variant="body1">{plannedMinutesDraft ?? 0} мин</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Требуется фото
                </Typography>
                <Typography variant="body1">{photoRequiredDraft ? 'Да' : 'Нет'}</Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      ) : (
        <Box sx={{ flex: 1, overflow: 'auto', pt: 2 }}>
          <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="Детали" />
            <Tab label={`Комментарии (${comments.length})`} />
            <Tab label={`Фото (${photos.length})`} />
          </Tabs>
          {tab === 0 && renderDetailsSection()}
          {tab === 1 && renderCommentsSection()}
          {tab === 2 && renderPhotosSection()}
        </Box>
      )}

      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );

  if (!open || !taskId) {
    return null;
  }

  if (isMdUp) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { width: 760, maxWidth: '100vw' } }}
      >
        {body}
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogTitle sx={{ pr: 7 }}>{renderHeader()}</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>{body}</DialogContent>
    </Dialog>
  );
};

export default TaskDetailsDrawer;


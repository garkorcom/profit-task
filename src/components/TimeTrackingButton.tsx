import React, { useState } from 'react';
import {
  Button,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import { PlayArrow as PlayIcon, PhotoCamera as CameraIcon, Stop as StopIcon, Pause as PauseIcon } from '@mui/icons-material';
import {
  StartWorkPayload,
  useTimeTracking
} from '../contexts/TimeTrackingContext';
import { Project } from '../api/projectApi';
import { Task } from '../api/taskApi';
import { Estimate, EstimateItem } from '../legacy/api/estimateApi';

interface TimeTrackingButtonProps {
  project: Project | null;
  task: Task | null;
  estimate: Estimate | null;
  service: EstimateItem | null;
  onStart?: () => void;
  onStop?: () => void;
}

export const TimeTrackingButton: React.FC<TimeTrackingButtonProps> = ({
  project,
  task,
  estimate,
  service,
  onStart,
  onStop,
}) => {
  const { 
    startWork, 
    stopWork, 
    isWorking, 
    isPaused, 
    pauseWork, 
    resumeWork, 
    isStartingWork, // Получаем новое состояние
    timeTrackingError 
  } = useTimeTracking();
  const [startPhoto, setStartPhoto] = useState<File | null>(null);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (timeTrackingError) {
      setError(timeTrackingError);
    }
  }, [timeTrackingError]);

  const handleStart = async () => {
    setError(null);
    if (!project) {
      setError("Необходимо выбрать проект");
      return;
    }

    if (!task && !estimate) {
      setError("Необходимо выбрать задачу или смету");
      return;
    }

    try {
      const payload: StartWorkPayload = {
        project,
        task: task || undefined,
        estimate: estimate || undefined,
        service: service || undefined,
        startPhoto: startPhoto || undefined,
        location: location || undefined,
      };

      await startWork(payload);
      
      setStartPhoto(null);
      setLocation(null);
      if (onStart) onStart();
    } catch (err: any) {
      console.error("Failed to start work:", err);
      setError(err.message || 'Произошла ошибка');
    }
  };

  const handleStop = async () => {
    try {
      await stopWork();
      if (onStop) onStop();
    } catch (err: any) {
      console.error("Failed to stop work:", err);
      setError(err.message || 'Произошла ошибка');
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setStartPhoto(event.target.files[0]);
    }
  };
  
  const handleLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation(position),
      (err) => console.warn(`ERROR(${err.code}): ${err.message}`)
    );
  };

  if (isWorking) {
    return (
      <Stack direction="row" spacing={2}>
        {isPaused ? (
          <Button variant="contained" onClick={resumeWork} startIcon={<PlayIcon />}>Продолжить</Button>
        ) : (
          <Button variant="contained" color="warning" onClick={() => pauseWork()} startIcon={<PauseIcon />}>Пауза</Button>
        )}
        <Button variant="contained" color="error" onClick={handleStop} startIcon={<StopIcon />}>
          Стоп
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} direction="column" alignItems="center">
      {error && <Alert severity="error">{error}</Alert>}
      <Stack spacing={2} direction="row">
        <Button component="label" variant="outlined" startIcon={<CameraIcon />} disabled={isStartingWork}>
          Фото
          <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
        </Button>
        <Button variant="outlined" startIcon={<CameraIcon />} onClick={handleLocation} disabled={isStartingWork}>
          Локация
        </Button>
      </Stack>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleStart} 
        disabled={isStartingWork}
        startIcon={isStartingWork ? <CircularProgress size={20} color="inherit" /> : <PlayIcon />}
      >
        {isStartingWork ? 'Запуск...' : 'Начать работу'}
      </Button>
    </Stack>
  );
};

export default TimeTrackingButton;

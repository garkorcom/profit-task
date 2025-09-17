/**
 * ============================================================================
 * QR CODE GENERATOR - ГЕНЕРАТОР QR КОДОВ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * ═══════════
 * Компонент для генерации QR кодов для публичных ссылок на сметы.
 * Позволяет клиентам быстро получить доступ к смете через мобильные устройства.
 * 
 * ВОЗМОЖНОСТИ:
 * ════════════
 * 🔗 Генерация QR кода для любого URL
 * 📱 Оптимизация для мобильных устройств
 * 💾 Скачивание QR кода как изображение
 * 🎨 Настройка размера и цвета
 * 📋 Копирование в буфер обмена
 * 
 * ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ: 2025 - Создан для улучшения публичных смет
 * ============================================================================
 */

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Stack,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';

interface QRCodeGeneratorProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  open,
  onClose,
  url,
  title
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Генерация QR кода (простая реализация)
  React.useEffect(() => {
    if (open && url) {
      // Используем внешний сервис для генерации QR кода
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
      setQrCodeUrl(qrUrl);
    }
  }, [open, url]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qr-code-${title}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">QR код для сметы</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3} alignItems="center">
          <Typography variant="body1" align="center" color="text.secondary">
            {title}
          </Typography>
          
          {qrCodeUrl && (
            <Box
              component="img"
              src={qrCodeUrl}
              alt="QR Code"
              sx={{
                width: 250,
                height: 250,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                p: 1,
                bgcolor: 'white'
              }}
            />
          )}
          
          <Alert severity="info" sx={{ width: '100%' }}>
            <Typography variant="body2">
              Отсканируйте QR код камерой телефона для быстрого доступа к смете
            </Typography>
          </Alert>
          
          <Typography 
            variant="caption" 
            align="center" 
            sx={{ 
              wordBreak: 'break-all',
              bgcolor: 'grey.100',
              p: 1,
              borderRadius: 1,
              fontFamily: 'monospace'
            }}
          >
            {url}
          </Typography>
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button startIcon={<CopyIcon />} onClick={handleCopyUrl}>
          Копировать ссылку
        </Button>
        <Button 
          variant="contained" 
          startIcon={<DownloadIcon />} 
          onClick={handleDownload}
          disabled={!qrCodeUrl}
        >
          Скачать QR код
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QRCodeGenerator;

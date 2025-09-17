/**
 * ============================================================================
 * SHARE DIALOG - ДИАЛОГ ПОДЕЛИТЬСЯ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * ═══════════
 * Универсальный компонент для обмена ссылками на сметы через различные каналы.
 * Поддерживает социальные сети, мессенджеры, email и прямое копирование.
 * 
 * ВОЗМОЖНОСТИ:
 * ════════════
 * 🌐 Социальные сети (Facebook, Twitter, LinkedIn)
 * 💬 Мессенджеры (WhatsApp, Telegram)
 * 📧 Email с готовым шаблоном
 * 📋 Копирование в буфер обмена
 * 📱 Нативный Web Share API (мобильные)
 * 
 * ПОСЛЕДНЕЕ ОБНОВЛЕНИЕ: 2025 - Создан для улучшения публичных смет
 * ============================================================================
 */

import React, { useState } from 'react';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  TextField,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  Telegram as TelegramIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  Share as ShareIcon,
  QrCode as QrCodeIcon,
} from '@mui/icons-material';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  description?: string;
}

const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  onClose,
  url,
  title,
  description
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleSocialShare = (platform: string) => {
    const text = description ? `${title}: ${description}` : title;
    
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    };

    window.open(urls[platform as keyof typeof urls], '_blank', 'width=600,height=400');
  };

  const handleEmailShare = () => {
    const subject = title;
    const body = `${description ? description + '\n\n' : ''}Ссылка: ${url}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1}>
            <ShareIcon color="primary" />
            <Typography variant="h6">Поделиться сметой</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            )}
          </Box>

          {/* Ссылка для копирования */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Ссылка на смету:
            </Typography>
            <TextField
              fullWidth
              value={url}
              variant="outlined"
              size="small"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <IconButton onClick={handleCopyLink} edge="end">
                    <CopyIcon />
                  </IconButton>
                )
              }}
            />
            {copied && (
              <Alert severity="success" sx={{ mt: 1 }}>
                Ссылка скопирована в буфер обмена!
              </Alert>
            )}
          </Box>

          <Divider />

          {/* Нативное поделиться (мобильные) */}
          {navigator.share && (
            <>
              <List>
                <ListItemButton onClick={handleNativeShare}>
                  <ListItemIcon>
                    <ShareIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Поделиться"
                    secondary="Использовать встроенные возможности устройства"
                  />
                </ListItemButton>
              </List>
              <Divider />
            </>
          )}

          {/* Социальные сети и мессенджеры */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Поделиться в социальных сетях:
            </Typography>
            <List dense>
              <ListItemButton onClick={() => handleSocialShare('whatsapp')}>
                <ListItemIcon>
                  <WhatsAppIcon sx={{ color: '#25D366' }} />
                </ListItemIcon>
                <ListItemText primary="WhatsApp" />
              </ListItemButton>
              
              <ListItemButton onClick={() => handleSocialShare('telegram')}>
                <ListItemIcon>
                  <TelegramIcon sx={{ color: '#0088cc' }} />
                </ListItemIcon>
                <ListItemText primary="Telegram" />
              </ListItemButton>
              
              <ListItemButton onClick={handleEmailShare}>
                <ListItemIcon>
                  <EmailIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Email" />
              </ListItemButton>
              
              <ListItemButton onClick={() => handleSocialShare('facebook')}>
                <ListItemIcon>
                  <FacebookIcon sx={{ color: '#1877f2' }} />
                </ListItemIcon>
                <ListItemText primary="Facebook" />
              </ListItemButton>
              
              <ListItemButton onClick={() => handleSocialShare('twitter')}>
                <ListItemIcon>
                  <TwitterIcon sx={{ color: '#1da1f2' }} />
                </ListItemIcon>
                <ListItemText primary="Twitter" />
              </ListItemButton>
              
              <ListItemButton onClick={() => handleSocialShare('linkedin')}>
                <ListItemIcon>
                  <LinkedInIcon sx={{ color: '#0077b5' }} />
                </ListItemIcon>
                <ListItemText primary="LinkedIn" />
              </ListItemButton>
            </List>
          </Box>
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareDialog;

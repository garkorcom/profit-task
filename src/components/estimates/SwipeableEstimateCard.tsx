/**
 * Swipeable карточка сметы с touch-оптимизированными жестами
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Stack,
  IconButton,
  Chip,
  useTheme,
  useMediaQuery,
  Fade,
  Paper,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as ApprovedIcon,
  Warning as DraftIcon,
  Schedule as PendingIcon,
} from '@mui/icons-material';
import { Estimate } from '../../types/estimate.types';
import { format } from '../../utils/dateUtils';

interface SwipeableEstimateCardProps {
  estimate: Estimate;
  onEdit: (id: string) => void;
  onDelete: (estimate: Estimate) => void;
  onShare: (estimate: Estimate) => void;
  onExportPDF: (estimate: Estimate) => void;
  onClick: (id: string) => void;
}

const SwipeableEstimateCard: React.FC<SwipeableEstimateCardProps> = ({
  estimate,
  onEdit,
  onDelete,
  onShare,
  onExportPDF,
  onClick,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isVerySmall = useMediaQuery(theme.breakpoints.down(375));

  // Swipe state
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    setStartX(touch.clientX);
    setCurrentX(touch.clientX);
    isDragging.current = false;
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    const diffX = touch.clientX - startX;
    
    // Only allow left swipe (reveal actions on right)
    if (diffX < 0 && diffX > -120) {
      setTranslateX(diffX);
      isDragging.current = true;
    } else if (diffX > 0 && isSwipeOpen) {
      // Allow closing swipe
      setTranslateX(diffX - 120);
      isDragging.current = true;
    }
    
    setCurrentX(touch.clientX);
  }, [isMobile, startX, isSwipeOpen]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile) return;
    
    const diffX = currentX - startX;
    
    // Threshold for opening/closing
    const threshold = -60;
    
    if (diffX < threshold && !isSwipeOpen) {
      // Open swipe
      setIsSwipeOpen(true);
      setTranslateX(-120);
    } else if (diffX > -threshold && isSwipeOpen) {
      // Close swipe
      setIsSwipeOpen(false);
      setTranslateX(0);
    } else {
      // Snap back
      setTranslateX(isSwipeOpen ? -120 : 0);
    }
    
    // Prevent click if we were dragging
    setTimeout(() => {
      isDragging.current = false;
    }, 100);
  }, [isMobile, currentX, startX, isSwipeOpen]);

  const handleCardClick = useCallback(() => {
    if (isDragging.current) return;
    
    if (isSwipeOpen) {
      setIsSwipeOpen(false);
      setTranslateX(0);
    } else {
      onClick(estimate.id);
    }
  }, [isSwipeOpen, onClick, estimate.id]);

  // Status icon
  const getStatusIcon = () => {
    switch (estimate.status) {
      case 'accepted':
        return <ApprovedIcon color="success" fontSize={isVerySmall ? "small" : "medium"} />;
      case 'sent':
        return <PendingIcon color="info" fontSize={isVerySmall ? "small" : "medium"} />;
      case 'rejected':
      case 'canceled':
        return <DraftIcon color="error" fontSize={isVerySmall ? "small" : "medium"} />;
      default:
        return <DraftIcon color="warning" fontSize={isVerySmall ? "small" : "medium"} />;
    }
  };

  // Action handlers
  const handleAction = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    action();
    setIsSwipeOpen(false);
    setTranslateX(0);
  };

  return (
    <Box sx={{ position: 'relative', mb: 2, overflow: 'hidden' }}>
      {/* Actions background (visible when swiped) */}
      {isMobile && (
        <Paper
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            bgcolor: 'background.paper',
            borderLeft: 1,
            borderColor: 'divider',
            zIndex: 1,
          }}
        >
          <IconButton 
            size="small" 
            onClick={handleAction(() => onEdit(estimate.id))}
            sx={{ minWidth: 32, minHeight: 32 }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={handleAction(() => onShare(estimate))}
            sx={{ minWidth: 32, minHeight: 32 }}
          >
            <ShareIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            color="error" 
            onClick={handleAction(() => onDelete(estimate))}
            sx={{ minWidth: 32, minHeight: 32 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}

      {/* Main card */}
      <Card
        ref={cardRef}
        sx={{
          position: 'relative',
          zIndex: 2,
          transform: `translateX(${translateX}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.2s ease-out',
          bgcolor: 'background.paper',
          cursor: isMobile ? 'default' : 'pointer',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CardActionArea
          onClick={handleCardClick}
          sx={{
            minHeight: isVerySmall ? 100 : 120,
            '&:hover': isMobile ? {} : {
              bgcolor: 'action.hover',
            }
          }}
        >
          <CardContent sx={{ p: isVerySmall ? 1.5 : 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box flex={1}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  {getStatusIcon()}
                  <Typography 
                    variant={isVerySmall ? "subtitle2" : "h6"} 
                    component="div"
                    noWrap
                  >
                    Смета №{estimate.number || estimate.id.slice(-6)}
                  </Typography>
                </Stack>
                
                <Typography 
                  color="text.secondary" 
                  sx={{ 
                    mb: 1,
                    fontSize: isVerySmall ? '0.8rem' : '0.875rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {estimate.terms || 'Без описания'}
                </Typography>
                
                <Stack 
                  direction={isVerySmall ? "column" : "row"} 
                  spacing={isVerySmall ? 0.5 : 2} 
                  sx={{ 
                    mt: 1, 
                    alignItems: isVerySmall ? 'flex-start' : 'center' 
                  }}
                >
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: isVerySmall ? '0.7rem' : '0.75rem' }}
                  >
                    {estimate.createdAt && typeof estimate.createdAt === 'string' && 
                      format(new Date(estimate.createdAt), 'dd.MM.yyyy')
                    }
                  </Typography>
                  <Typography 
                    variant={isVerySmall ? "body2" : "subtitle2"} 
                    fontWeight="bold"
                    color="primary.main"
                  >
                    {(estimate.totals?.grandTotal || 0).toLocaleString('ru-RU')} ₽
                  </Typography>
                </Stack>
              </Box>

              {/* Desktop actions */}
              {!isMobile && (
                <Stack direction="row" spacing={0.5} sx={{ ml: 1 }}>
                  <IconButton size="small" onClick={handleAction(() => onEdit(estimate.id))}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={handleAction(() => onShare(estimate))}>
                    <ShareIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={handleAction(() => onExportPDF(estimate))}>
                    <PdfIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={handleAction(() => onDelete(estimate))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              )}
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>

      {/* Swipe hint */}
      {isMobile && !isSwipeOpen && (
        <Fade in={true} timeout={1000}>
          <Box
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 3,
              pointerEvents: 'none',
            }}
          >
            <Chip
              label="◀ Свайп"
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.6rem',
                height: 20,
                opacity: 0.6,
                animation: 'fadeInOut 3s ease-in-out infinite',
                '@keyframes fadeInOut': {
                  '0%, 50%, 100%': { opacity: 0.6 },
                  '25%': { opacity: 0.3 },
                },
              }}
            />
          </Box>
        </Fade>
      )}
    </Box>
  );
};

export default SwipeableEstimateCard;
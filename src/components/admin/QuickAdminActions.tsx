/**
 * Quick Admin Actions - Utility component for admin tasks
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { AdminPanelSettings as AdminIcon } from '@mui/icons-material';
// import { makeGarkorAdmin } from '../../utils/makeAdmin'; // Временно не используется из-за CORS

const QuickAdminActions: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleMakeGarkorAdmin = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Используем прямое обновление Firestore как fallback
      await (window as any).directFirestoreAdmin('garkor.com@gmail.com');
      setResult({
        type: 'success',
        message: `Successfully updated garkor.com@gmail.com profile to owner role in Firestore.`
      });
    } catch (error: any) {
      setResult({
        type: 'error',
        message: `Failed to make user admin: ${error.message || error}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <AdminIcon sx={{ mr: 1 }} />
        Быстрые административные действия
      </Typography>
      
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Утилиты для выполнения административных задач
      </Typography>

      {/* Make Garkor Admin Action */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Назначить владельца
        </Typography>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="textSecondary">
            Сделать пользователя
          </Typography>
          <Chip label="garkor.com@gmail.com" size="small" />
          <Typography variant="body2" color="textSecondary">
            владельцем системы
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleMakeGarkorAdmin}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <AdminIcon />}
        >
          {loading ? 'Обновление роли...' : 'Сделать владельцем'}
        </Button>
      </Box>

      {/* Result Display */}
      {result && (
        <Alert severity={result.type} sx={{ mt: 2 }}>
          {result.message}
        </Alert>
      )}
    </Paper>
  );
};

export default QuickAdminActions;
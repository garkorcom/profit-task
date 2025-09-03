/**
 * Операционный обзор - страница с полной иерархией бизнес-данных
 * L1: Counterparty → L2: Project → L3: Estimate → L4: Task
 * Позволяет запускать таймер учета времени на уровне задач
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { Counterparty } from '../types/counterparty.types';
import { subscribeToCounterparties } from '../api/counterpartyApi';
import CounterpartyAccordion from '../components/operational/CounterpartyAccordion';

const OperationalOverviewPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setIsLoading(false);
      return;
    }

    console.log('🚀 Loading counterparties for operational overview');
    
    const unsubscribe = subscribeToCounterparties(
      currentUser.uid,
      (data: Counterparty[]) => {
        console.log('📊 Counterparties loaded:', data.length);
        setCounterparties(data);
        setIsLoading(false);
        setError(null);
      },
      {
        status: ['active']  // Только активные контрагенты
      }
    );

    return () => {
      console.log('🧹 Cleaning up counterparties stream');
      unsubscribe();
    };
  }, [currentUser?.uid]);

  if (!currentUser) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error">
          Необходима авторизация для доступа к операционному обзору
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Операционный обзор
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Полная иерархия проектов и задач с возможностью запуска учета времени
          </Typography>
        </Paper>

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Empty State */}
        {!isLoading && !error && counterparties.length === 0 && (
          <Alert severity="info">
            Активные контрагенты не найдены. Создайте проекты и контрагентов для начала работы.
          </Alert>
        )}

        {/* Counterparties List */}
        {!isLoading && !error && counterparties.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Контрагенты ({counterparties.length})
            </Typography>
            
            {counterparties.map((counterparty) => (
              <CounterpartyAccordion
                key={counterparty.id}
                counterparty={counterparty}
              />
            ))}
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default OperationalOverviewPage;
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Card, 
  CardContent,
  CardActions,
  Alert,
  Chip,
  Stack,
  Grid
} from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { 
  getEstimatesStream, 
  addEstimate, 
  updateEstimateStatus,
  Estimate 
} from '../api/estimateApi';
import { getProjectsStream, Project } from '../api/projectApi';

const EstimatesDebugPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Загружаем ВСЕ сметы
    const unsubEstimates = getEstimatesStream(currentUser.uid, '', (estimatesList) => {
      setEstimates(estimatesList);
      console.log('Loaded estimates:', estimatesList);
    });

    // Загружаем проекты
    const unsubProjects = getProjectsStream(currentUser.uid, (projectsList) => {
      setProjects(projectsList);
      console.log('Loaded projects:', projectsList);
    });

    return () => {
      unsubEstimates();
      unsubProjects();
    };
  }, [currentUser]);

  const createTestEstimate = async (projectId?: string) => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const testEstimate = {
        number: `TEST-${Date.now()}`,
        name: `Тестовая смета ${new Date().toLocaleDateString()}`,
        description: 'Смета для тестирования выбора в учете времени',
        projectId: projectId || projects[0]?.id || '',
        contractorId: '',
        status: 'draft' as const,
        items: [
          {
            id: 'item-1',
            name: 'Установка розетки',
            quantity: 5,
            unit: 'шт',
            unitPrice: 500,
            total: 2500,
            type: 'work' as const,
            level: 0,
            order: 0
          },
          {
            id: 'item-2', 
            name: 'Прокладка кабеля',
            quantity: 20,
            unit: 'м',
            unitPrice: 100,
            total: 2000,
            type: 'work' as const,
            level: 0,
            order: 1
          },
          {
            id: 'item-3',
            name: 'Розетка двойная',
            quantity: 5,
            unit: 'шт',
            unitPrice: 300,
            total: 1500,
            type: 'material' as const,
            level: 0,
            order: 2
          }
        ],
        total: 6000,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const estimateId = await addEstimate(currentUser.uid, testEstimate);
      setMessage({ text: `✅ Тестовая смета создана: ${estimateId}`, type: 'success' });
    } catch (error) {
      console.error('Error creating test estimate:', error);
      setMessage({ text: '❌ Ошибка создания сметы', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const approveEstimate = async (estimateId: string) => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      await updateEstimateStatus(currentUser.uid, estimateId, 'approved');
      setMessage({ text: '✅ Смета утверждена', type: 'success' });
    } catch (error) {
      console.error('Error approving estimate:', error);
      setMessage({ text: '❌ Ошибка утверждения сметы', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'info';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Без проекта';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          🔧 Отладка смет
        </Typography>

        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Быстрые действия
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button 
                variant="contained" 
                onClick={() => createTestEstimate()}
                disabled={loading}
              >
                Создать тестовую смету
              </Button>
              {projects.map(project => (
                <Button 
                  key={project.id}
                  variant="outlined" 
                  onClick={() => createTestEstimate(project.id)}
                  disabled={loading}
                  size="small"
                >
                  + Смета для {project.name}
                </Button>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Typography variant="h6" gutterBottom>
          Все сметы ({estimates.length})
        </Typography>

        <Grid container spacing={2}>
          {estimates.map(estimate => (
            <Grid item xs={12} md={6} key={estimate.id}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6">
                      {estimate.name || `Смета №${estimate.number}`}
                    </Typography>
                    <Chip 
                      label={estimate.status} 
                      color={getStatusColor(estimate.status)}
                      size="small"
                    />
                  </Stack>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {estimate.description}
                  </Typography>
                  
                  <Stack spacing={0.5}>
                    <Typography variant="body2">
                      <strong>Проект:</strong> {getProjectName(estimate.projectId || '')}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Сумма:</strong> {(estimate.total || 0).toFixed(2)} ₽
                    </Typography>
                    <Typography variant="body2">
                      <strong>Позиций:</strong> {estimate.items?.length || 0}
                    </Typography>
                    <Typography variant="body2">
                      <strong>ID:</strong> {estimate.id}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Project ID:</strong> {estimate.projectId || 'НЕТ'}
                    </Typography>
                  </Stack>
                </CardContent>
                
                <CardActions>
                  {estimate.status !== 'approved' && (
                    <Button 
                      size="small" 
                      color="success"
                      onClick={() => approveEstimate(estimate.id)}
                      disabled={loading}
                    >
                      Утвердить
                    </Button>
                  )}
                  <Button 
                    size="small" 
                    href={`/mobile/estimate/${estimate.id}`}
                  >
                    Открыть
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {estimates.length === 0 && (
          <Alert severity="info">
            Нет смет. Создайте тестовую смету для проверки функциональности.
          </Alert>
        )}
      </Box>
    </Container>
  );
};

export default EstimatesDebugPage;

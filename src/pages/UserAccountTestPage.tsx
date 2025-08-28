import React, { useState } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Alert, CircularProgress,
  List, ListItem, Chip, Stack, Paper, Divider, Accordion,
  AccordionSummary, AccordionDetails, Avatar
} from '@mui/material';
import {
  PlayArrow, CheckCircle, Error, ExpandMore,
  Person, Security, Notifications, AttachMoney,
  Link as LinkIcon, Update
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { runAllAccountTests, analyzeAccountTestResults, UserTestResult } from '../tests/testUserAccounts';

const UserAccountTestPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<UserTestResult[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);

  const runTests = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setTestResults([]);
    setAnalysis(null);
    
    try {
      const results = await runAllAccountTests(currentUser.uid);
      setTestResults(results);
      
      const analysisResult = analyzeAccountTestResults(results);
      setAnalysis(analysisResult);
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTestIcon = (testName: string) => {
    const iconMap: { [key: string]: React.ReactElement } = {
      'User Profile Structure': <Person />,
      'User Roles': <Security />,
      'Profile Update': <Update />,
      'Financial Fields': <AttachMoney />,
      'Notification Channels': <Notifications />,
      'Activity Status': <Person />,
      'User Relations': <LinkIcon />
    };
    return iconMap[testName] || <Person />;
  };

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle color="success" /> : <Error color="error" />;
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'success' : 'error';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Тестирование аккаунтов пользователей
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Эта страница проверяет структуру профилей пользователей, роли, права доступа и связи с другими сущностями.
        </Typography>
      </Alert>

      <Button
        variant="contained"
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
        onClick={runTests}
        disabled={loading || !currentUser}
        sx={{ mb: 3 }}
      >
        {loading ? 'Выполнение тестов...' : 'Запустить тесты аккаунтов'}
      </Button>

      {testResults.length > 0 && (
        <>
          <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
            Результаты тестов
          </Typography>
          
          {testResults.map((result, index) => (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{ 
                  bgcolor: result.success ? 'success.50' : 'error.50'
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%' }}>
                  <Avatar sx={{ bgcolor: result.success ? 'success.main' : 'error.main' }}>
                    {getTestIcon(result.test)}
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="h6">
                      {result.test}
                    </Typography>
                  </Box>
                  <Chip 
                    icon={getStatusIcon(result.success)}
                    label={result.success ? 'Успешно' : 'Ошибка'}
                    color={getStatusColor(result.success)}
                  />
                </Stack>
              </AccordionSummary>
              
              <AccordionDetails>
                {result.error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {result.error}
                  </Alert>
                )}
                
                {result.properties && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Проверенные свойства:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {result.properties.map((prop, i) => (
                        <Chip 
                          key={i} 
                          label={prop} 
                          size="small" 
                          variant="outlined"
                          color="primary"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
                
                {result.data && (
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Данные теста:
                    </Typography>
                    <pre style={{ margin: 0, fontSize: '0.85rem', overflow: 'auto' }}>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </Paper>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}

      {analysis && (
        <>
          <Divider sx={{ my: 4 }} />
          
          <Typography variant="h5" gutterBottom>
            Анализ результатов
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            {analysis.summary}
          </Alert>
          
          {analysis.allProperties && analysis.allProperties.length > 0 && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📋 Все свойства профиля пользователя
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {analysis.allProperties.map((prop: string, index: number) => (
                    <Chip 
                      key={index}
                      label={prop}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
          
          {analysis.issues && analysis.issues.length > 0 && (
            <Card sx={{ mb: 2, bgcolor: 'error.50' }}>
              <CardContent>
                <Typography variant="h6" color="error" gutterBottom>
                  ⚠️ Обнаруженные проблемы
                </Typography>
                <List dense>
                  {analysis.issues.map((issue: string, index: number) => (
                    <ListItem key={index}>
                      <Typography variant="body2">{issue}</Typography>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
          
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <Card sx={{ bgcolor: 'success.50' }}>
              <CardContent>
                <Typography variant="h6" color="success.dark" gutterBottom>
                  💡 Рекомендации по улучшению
                </Typography>
                <List dense>
                  {analysis.recommendations.map((rec: string, index: number) => (
                    <ListItem key={index}>
                      <Typography variant="body2">• {rec}</Typography>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default UserAccountTestPage;

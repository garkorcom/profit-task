import React, { useState } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Alert, CircularProgress,
  List, ListItem, ListItemText, Chip, Stack, Paper, Divider
} from '@mui/material';
import { PlayArrow, CheckCircle, Error, Warning } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { runAllTests, analyzeTestResults, TestResult } from '../tests/testDataOperations';

const DataTestPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);

  const runTests = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setTestResults([]);
    setAnalysis(null);
    
    try {
      const results = await runAllTests(currentUser.uid);
      setTestResults(results);
      
      const analysisResult = analyzeTestResults(results);
      setAnalysis(analysisResult);
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
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
        Тестирование операций с данными
      </Typography>
      
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Эта страница создает тестовые данные в базе. Используйте с осторожностью!
        </Typography>
      </Alert>

      <Button
        variant="contained"
        startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
        onClick={runTests}
        disabled={loading || !currentUser}
        sx={{ mb: 3 }}
      >
        {loading ? 'Выполнение тестов...' : 'Запустить тесты'}
      </Button>

      {testResults.length > 0 && (
        <>
          <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
            Результаты тестов
          </Typography>
          
          <List>
            {testResults.map((result, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                    {getStatusIcon(result.success)}
                    <Typography variant="h6">
                      {result.operation}
                    </Typography>
                    <Chip 
                      label={result.success ? 'Успешно' : 'Ошибка'}
                      color={getStatusColor(result.success)}
                      size="small"
                    />
                  </Stack>
                  
                  {result.error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {result.error}
                    </Alert>
                  )}
                  
                  {result.dependencies && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Зависимости:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {result.dependencies.map((dep, i) => (
                          <Chip key={i} label={dep} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  
                  {result.data && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Данные:
                      </Typography>
                      <Paper sx={{ p: 1, mt: 0.5, bgcolor: 'grey.50' }}>
                        <pre style={{ margin: 0, fontSize: '0.85rem' }}>
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </Paper>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </List>
        </>
      )}

      {analysis && (
        <>
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            Анализ результатов
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            {analysis.summary}
          </Alert>
          
          {analysis.issues.length > 0 && (
            <Card sx={{ mb: 2, bgcolor: 'error.50' }}>
              <CardContent>
                <Typography variant="h6" color="error" gutterBottom>
                  <Warning /> Обнаруженные проблемы
                </Typography>
                <List dense>
                  {analysis.issues.map((issue: string, index: number) => (
                    <ListItem key={index}>
                      <ListItemText primary={issue} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
          
          {analysis.recommendations.length > 0 && (
            <Card sx={{ bgcolor: 'success.50' }}>
              <CardContent>
                <Typography variant="h6" color="success.dark" gutterBottom>
                  💡 Рекомендации по улучшению
                </Typography>
                <List dense>
                  {analysis.recommendations.map((rec: string, index: number) => (
                    <ListItem key={index}>
                      <ListItemText primary={rec} />
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

export default DataTestPage;

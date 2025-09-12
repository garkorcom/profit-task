/**
 * ============================================================================ 
 * STARTABILITY V2 VERIFICATION TEST
 * ============================================================================
 * 
 * Простой компонент для быстрой проверки всех V2 компонентов.
 * Демонстрирует интеграцию всех реализованных функций.
 * 
 * @author Senior Full-Stack Engineer + UX Architect
 * @version 2.0.0 - Verification Test
 * @feature estimates.startability_v1
 */

import React from 'react';
import { 
  Box, 
  Typography, 
  Alert, 
  Paper,
  Grid,
  Chip
} from '@mui/material';
import {
  CheckCircle as ReadyIcon,
  Warning as WarningIcon,
  Block as BlockedIcon,
  Build as BuildIcon
} from '@mui/icons-material';

import { mockV2StartabilityResponse } from '../../tests/fixtures/startability-fixtures';
import { ActionableComponentsFactory } from './actions/ActionableComponentsFactory';

export const StartabilityV2Test: React.FC = () => {
  const testReport = mockV2StartabilityResponse;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        🧪 Startability V2 System Test
      </Typography>

      <Alert severity="success" sx={{ mb: 3 }}>
        ✅ Система стартуемости V2 успешно загружена и готова к тестированию!
      </Alert>

      {/* Test Report Structure */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          📊 Test Report Data Structure
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2">
              <strong>Project ID:</strong> {testReport.projectId}
            </Typography>
            <Typography variant="body2">
              <strong>Is Startable:</strong> {testReport.isProjectStartable ? '✅' : '❌'}
            </Typography>
            <Typography variant="body2">
              <strong>Items Count:</strong> {Object.keys(testReport.itemsStartability).length}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            {Object.entries(testReport.itemsStartability).map(([itemId, item]) => (
              <Chip 
                key={itemId}
                label={`${itemId}: ${item.summaryStatus}`}
                color={
                  item.summaryStatus === 'READY' ? 'success' :
                  item.summaryStatus === 'WARNING' ? 'warning' :
                  item.summaryStatus === 'BLOCKED' ? 'error' : 'default'
                }
                size="small"
                sx={{ mr: 1, mb: 1 }}
              />
            ))}
          </Grid>
        </Grid>
      </Paper>

      {/* Test Actionable Components */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          ⚡ Test Actionable Components Factory
        </Typography>
        
        {Object.entries(testReport.itemsStartability).map(([itemId, item]) => (
          <Box key={itemId} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Item: {itemId} - Status: {item.summaryStatus}
            </Typography>
            
            {item.blockers.map((blocker, index) => (
              <Box key={index} sx={{ ml: 2, mb: 1 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  🚫 {blocker.description} ({blocker.severity})
                </Typography>
                
                {blocker.resolutionAction && (
                  <ActionableComponentsFactory
                    resolutionAction={blocker.resolutionAction}
                    onExecuted={(success, message) => {
                      console.log('Resolution executed:', { success, message });
                      alert(`Action result: ${success ? '✅' : '❌'} ${message}`);
                    }}
                    disabled={false}
                    compact={true}
                  />
                )}
              </Box>
            ))}
          </Box>
        ))}
      </Paper>

      {/* Status Icons Test */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          🚦 Traffic Light Status Icons
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReadyIcon color="success" />
            <Typography>READY</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            <Typography>WARNING</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BlockedIcon color="error" />
            <Typography>BLOCKED</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BuildIcon color="info" />
            <Typography>DONE</Typography>
          </Box>
        </Box>
      </Paper>

      <Alert severity="info" sx={{ mt: 3 }}>
        💡 Для полного тестирования перейдите на страницу: <strong>/startability-v2-test</strong>
      </Alert>
    </Box>
  );
};

export default StartabilityV2Test;
/**
 * Страница отчетов ERP модуля
 * Включает отчеты: COGS, Timesheet, Variance Analysis
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Container,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';

// import { COGSReport } from './COGSReport';
// import { TimesheetReport } from './TimesheetReport';
// import { VarianceReport } from './VarianceReport';

// Временные заглушки пока отчеты в разработке
const COGSReport = () => <div>COGS Report в разработке</div>;
const TimesheetReport = () => <div>Timesheet Report в разработке</div>;
const VarianceReport = () => <div>Variance Report в разработке</div>;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `report-tab-${index}`,
    'aria-controls': `report-tabpanel-${index}`,
  };
}

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Отчеты ERP модуля
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          Комплексная отчетность по проектам: себестоимость, время, отклонения плана от факта
        </Typography>

        <Paper sx={{ width: '100%', mt: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="reports tabs"
            >
              <Tab
                icon={<AssessmentIcon />}
                label="COGS Report"
                {...a11yProps(0)}
              />
              <Tab
                icon={<ScheduleIcon />}
                label="Timesheet Report"
                {...a11yProps(1)}
              />
              <Tab
                icon={<TrendingIcon />}
                label="Variance Analysis"
                {...a11yProps(2)}
              />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <COGSReport />
          </TabPanel>
          
          <TabPanel value={activeTab} index={1}>
            <TimesheetReport />
          </TabPanel>
          
          <TabPanel value={activeTab} index={2}>
            <VarianceReport />
          </TabPanel>
        </Paper>

        {/* Краткая справка */}
        <Grid container spacing={2} sx={{ mt: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  COGS Report
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Отчет по себестоимости проданных товаров (Cost of Goods Sold) с детализацией по материалам, труду и накладным расходам.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Timesheet Report
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Отчет по отработанному времени с группировкой по сотрудникам, проектам и периодам.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Variance Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Анализ отклонений плана от факта по времени, затратам и результатам проектов.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default ReportsPage;
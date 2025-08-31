import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Alert, Stack, Tabs, Tab, Card, CardContent, CardActionArea, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  Business as BusinessIcon,
  Work as WorkIcon,
  Category as CategoryIcon,
  Inventory as InventoryIcon,
  LocalShipping as LocalShippingIcon,
  AccountBalance as AccountBalanceIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile } from '../api/userApi';
import { addProject, Project, getProjectsStream } from '../api/projectApi';
import { addTask, Task, getTasksStream } from '../api/taskApi';
import { getEstimatesStream, Estimate } from '../legacy/api/estimateApi';
import DataTestPage from './DataTestPage';
import UserAccountTestPage from './UserAccountTestPage';
import RBACTestPage from './RBACTestPage';
import TestCPIntegration from '../tests/TestCPIntegration';

interface ReferenceItem {
  title: string;
  description: string;
  icon: React.ReactElement;
  path: string;
  color: string;
}

const TabPanel: React.FC<{
  children?: React.ReactNode;
  index: number;
  value: number;
}> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const TestStand: React.FC = () => {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      getUserProfile(currentUser.uid).then(profile => setUserProfile(profile));
      const unsubTasks = getTasksStream(currentUser.uid, setTasks);
      const unsubEstimates = getEstimatesStream(currentUser.uid, '', setEstimates);
      const unsubProjects = getProjectsStream(currentUser.uid, (projectList) => {
        setProjects(projectList);
        setLoading(false);
      });
      return () => {
        unsubTasks();
        unsubEstimates();
        unsubProjects();
      };
    }
  }, [currentUser]);

  const handleCreateTestTask = async () => {
    // ... (логика создания тестовой задачи с привязкой к первому проекту)
  };
  
  return (
    <Box>
      <Alert severity="warning" sx={{ mb: 2 }}>
        Этот раздел предназначен для тестирования. Здесь можно безопасно создавать и проверять данные.
      </Alert>
      {/* ... (JSX для кнопок, профиля, списков задач и смет) */}
    </Box>
  );
};

const ReferencesPage: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const navigate = useNavigate();

  const references: ReferenceItem[] = [
    {
      title: 'Проекты',
      description: 'Каталог проектов и их параметры',
      icon: <WorkIcon />,
      path: '/projects',
      color: '#026aa7'
    },
    {
      title: 'Список покупок',
      description: 'Агрегированный список из задач по полю "Что купить"',
      icon: <InventoryIcon />,
      path: '/shopping',
      color: '#6d4c41'
    },
    {
      title: 'Контрагенты',
      description: 'Поставщики, клиенты и их контактная информация',
      icon: <BusinessIcon />,
      path: '/contractors',
      color: '#1976d2'
    },
    {
      title: 'Товары и услуги',
      description: 'Каталог товаров, услуг и их характеристики',
      icon: <CategoryIcon />,
      path: '/products',
      color: '#388e3c'
    },
    {
      title: 'Склады',
      description: 'Справочник складов, остатки и движение',
      icon: <InventoryIcon />,
      path: '/warehouses',
      color: '#455a64'
    },
    {
      title: 'Отгрузки',
      description: 'Реализации и списание товаров со склада',
      icon: <LocalShippingIcon />,
      path: '/shipments',
      color: '#2e7d32'
    },
    {
      title: 'Единицы измерения',
      description: 'Справочник единиц измерения товаров',
      icon: <SettingsIcon />,
      path: '/units',
      color: '#7b1fa2'
    },
    {
      title: 'Способы доставки',
      description: 'Варианты доставки товаров клиентам',
      icon: <LocalShippingIcon />,
      path: '/delivery-methods',
      color: '#d32f2f'
    },
    {
      title: 'Складские документы',
      description: 'Приход, списание и инвентаризация',
      icon: <InventoryIcon />,
      path: '/stock-docs',
      color: '#4e342e'
    },
    {
      title: 'Банки и счета',
      description: 'Банковские реквизиты и расчетные счета',
      icon: <AccountBalanceIcon />,
      path: '/bank-accounts',
      color: '#303f9f'
    }
  ];

  const handleReferenceClick = (path: string) => {
    navigate(path);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Справочники</Typography>
      <Tabs value={tabIndex} onChange={(e, index) => setTabIndex(index)}>
        <Tab label="Справочники" />
        <Tab label="Разработка" />
        <Tab label="Тесты данных" />
        <Tab label="Тесты аккаунтов" />
        <Tab label="RBAC (Права)" />
        <Tab label="Тесты К&П" />
      </Tabs>
      <TabPanel value={tabIndex} index={0}>
        <Box display="flex" flexWrap="wrap" gap={3}>
          {references.map((reference, index) => (
            <Box key={index} flex="1" minWidth="300px" maxWidth="400px">
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardActionArea 
                  onClick={() => handleReferenceClick(reference.path)}
                  sx={{ height: '100%', p: 2 }}
                >
                  <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
                    <Avatar 
                      sx={{ 
                        bgcolor: reference.color, 
                        width: 64, 
                        height: 64, 
                        mb: 2 
                      }}
                    >
                      {reference.icon}
                    </Avatar>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {reference.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {reference.description}
                    </Typography>
                  </Box>
                </CardActionArea>
              </Card>
            </Box>
          ))}
        </Box>
      </TabPanel>
      <TabPanel value={tabIndex} index={1}>
        <TestStand />
      </TabPanel>
      <TabPanel value={tabIndex} index={2}>
        <DataTestPage />
      </TabPanel>
      <TabPanel value={tabIndex} index={3}>
        <UserAccountTestPage />
      </TabPanel>
      <TabPanel value={tabIndex} index={4}>
        <RBACTestPage />
      </TabPanel>
      <TabPanel value={tabIndex} index={5}>
        <TestCPIntegration />
      </TabPanel>
    </Box>
  );
};

export default ReferencesPage;

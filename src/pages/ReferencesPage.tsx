import React from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CardActionArea,
  Avatar
} from '@mui/material';
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

interface ReferenceItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const ReferencesPage: React.FC = () => {
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
    <Box>
      <Typography variant="h4" gutterBottom>
        Справочники
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Управление справочной информацией системы
      </Typography>

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

      <Box mt={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Информация о справочниках
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Справочники содержат основную информацию, необходимую для работы системы. 
              Регулярно обновляйте справочные данные для корректной работы всех модулей.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default ReferencesPage;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, CircularProgress, Paper, Breadcrumbs, Link, Chip,
  Tabs, Tab, Card, CardContent, CardHeader, Button, Stack, Avatar,
  List, ListItem, ListItemText, ListItemAvatar, Divider, ListItemButton
} from '@mui/material';
import {
  Business as BusinessIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import { useAuth } from '../../auth/AuthContext';
import { Counterparty, CounterpartyStatus, CounterpartyPriority, CounterpartyRole } from '../../types/counterparty.types';
import { subscribeToCounterparty } from '../../api/counterpartyApi';
import { Project } from '../../types/project.types';
import { getProjects } from '../../api/projectV2Api';

const CounterpartyDetailsPage: React.FC = () => {
  const { counterpartyId } = useParams<{ counterpartyId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [counterparty, setCounterparty] = useState<Counterparty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!currentUser || !counterpartyId) {
      setLoading(false);
      setError('Не удалось загрузить данные: отсутствует ID пользователя или контрагента.');
      return;
    }

    const unsubscribe = subscribeToCounterparty(currentUser.uid, counterpartyId, (data) => {
      if (data) {
        setCounterparty(data);
        setError(null);
        // Загружаем проекты, связанные с этим контрагентом
        getProjects(currentUser.uid, { clientId: data.id }).then(setProjects);
      } else {
        setError('Контрагент не найден.');
        setCounterparty(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, counterpartyId]);
  
  const getStatusColor = (status: CounterpartyStatus) => {
    switch (status) {
      case 'active': return 'success';
      case 'potential': return 'info';
      case 'new': return 'default';
      case 'on_hold': return 'warning';
      case 'archived': return 'default';
      case 'blacklisted': return 'error';
      default: return 'default';
    }
  };
  
  const getStatusLabel = (status: CounterpartyStatus) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'potential': return 'Потенциальный';
      case 'new': return 'Новый';
      case 'on_hold': return 'На паузе';
      case 'archived': return 'Архив';
      case 'blacklisted': return 'Черный список';
      default: return status;
    }
  };
  
  const getPriorityIcon = (priority: CounterpartyPriority) => {
    switch (priority) {
      case 'vip': return <StarIcon sx={{ color: 'gold' }} />;
      case 'high': return <StarIcon color="primary" />;
      case 'medium': return <StarBorderIcon />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!counterparty) {
    return null;
  }
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Хлебные крошки и заголовок */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          href="#"
          onClick={(e) => { e.preventDefault(); navigate('/counterparties'); }}
        >
          Контрагенты
        </Link>
        <Typography color="text.primary">{counterparty.displayName}</Typography>
      </Breadcrumbs>
      
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.light' }}>
            <BusinessIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1">
              {counterparty.displayName}
              {getPriorityIcon(counterparty.priority)}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {counterparty.legalName}
            </Typography>
          </Box>
        </Stack>
        <Button 
          variant="contained" 
          startIcon={<EditIcon />}
          onClick={() => navigate(`/counterparties/${counterparty.id}/edit`)}
        >
          Редактировать
        </Button>
      </Stack>
      
      {/* Статус и роли */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Chip 
          label={getStatusLabel(counterparty.status)} 
          color={getStatusColor(counterparty.status)}
          size="small"
        />
        {counterparty.roles.map(role => (
          <Chip key={role} label={role} size="small" variant="outlined" />
        ))}
      </Stack>

      {/* Табы */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="Детали контрагента">
          <Tab label="Обзор" />
          <Tab label={`Контакты (${counterparty.contacts?.length || 0})`} />
          <Tab label={`Адреса (${counterparty.addresses?.length || 0})`} />
          <Tab label="Проекты" />
          <Tab label="Документы" />
        </Tabs>
      </Box>
      
      {/* Содержимое табов */}
      {currentTab === 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Основная информация</Typography>
          <List>
            <ListItem>
              <ListItemText primary="Полное наименование" secondary={counterparty.legalName} />
            </ListItem>
            <ListItem>
              <ListItemText primary="ИНН" secondary={counterparty.taxId || 'Не указан'} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Ответственный" secondary={counterparty.assignedToName || 'Не назначен'} />
            </ListItem>
          </List>
        </Paper>
      )}
      
      {currentTab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Контакты</Typography>
          <List>
            {counterparty.contacts?.map(contact => (
              <ListItem key={contact.id}>
                <ListItemAvatar>
                  <Avatar><PersonIcon /></Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${contact.firstName} ${contact.lastName} ${contact.isPrimary ? '(Основной)' : ''}`}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {contact.title}
                      </Typography>
                      {contact.email && ` — ${contact.email}`}
                      {contact.phone && ` | ${contact.phone}`}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
      
      {currentTab === 2 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Адреса</Typography>
          {/* Здесь будет список адресов */}
          <Typography color="text.secondary">(в разработке)</Typography>
        </Paper>
      )}
      
      {currentTab === 3 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Проекты ({projects.length})</Typography>
          {projects.length > 0 ? (
            <List>
              {projects.map(project => (
                <ListItem 
                  key={project.id}
                  disablePadding
                >
                  <ListItemButton onClick={() => navigate(`/projects/${project.id}`)}>
                    <ListItemAvatar>
                      <Avatar><BusinessIcon /></Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={project.name}
                      secondary={`Статус: ${project.status} | c ${project.estimatedStartDate || ''}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">Проекты не найдены.</Typography>
          )}
        </Paper>
      )}
      
      {currentTab === 4 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Документы</Typography>
          {/* Здесь будет список документов */}
          <Typography color="text.secondary">(в разработке)</Typography>
        </Paper>
      )}
    </Box>
  );
};

export default CounterpartyDetailsPage;

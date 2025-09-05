import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,

  Divider,
  Alert,
  Chip,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  InputAdornment,
  SelectChangeEvent
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Telegram as TelegramIcon,
  WhatsApp as WhatsAppIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { updateUserProfile, linkUserToEmployee, linkUserToContractor, UserProfile } from '../api/userApi';
import { getEmployeesStream, Employee } from '../api/employeeApi';
import { getContractorsStream, Contractor } from '../api/contractorApi';
import LoadingSpinner from '../components/common/LoadingSpinner';

const UserProfilePage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    displayName: '',
    phoneNumber: '',
    department: '',
    position: '',
    whatsappPhone: '',
    telegramUsername: '',
    preferredNotificationChannel: 'email'
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        phoneNumber: userProfile.phoneNumber || '',
        department: userProfile.department || '',
        position: userProfile.position || '',
        whatsappPhone: userProfile.whatsappPhone || '',
        telegramUsername: userProfile.telegramUsername || '',
        preferredNotificationChannel: userProfile.preferredNotificationChannel || 'email',
        hourlyRate: userProfile.hourlyRate || 0, // Добавляем hourlyRate
      });
    }
  }, [userProfile]);

  useEffect(() => {
    if (!currentUser) return;
    
    const unsubscribeEmployees = getEmployeesStream(currentUser.uid, (data) => {
      setEmployees(data);
    });
    
    const unsubscribeContractors = getContractorsStream(currentUser.uid, (data) => {
      setContractors(data);
    });
    
    return () => {
      unsubscribeEmployees();
      unsubscribeContractors();
    };
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = e.target.name as keyof typeof formData;
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: SelectChangeEvent<any>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Позволяем вводить только числа
    if (/^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    const rate = formData.hourlyRate;

    if (rate !== undefined && rate !== null && rate.toString().trim() !== '') {
      if (isNaN(Number(rate)) || Number(rate) < 0) {
        errors.hourlyRate = 'Ставка должна быть положительным числом';
      }
    } else {
        // Можно сделать поле обязательным, если нужно
        // errors.hourlyRate = 'Часовая ставка обязательна';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!currentUser || !userProfile || !validateForm()) return;
    
    setLoading(true);
    try {
      const dataToSave = { 
        ...formData,
        hourlyRate: Number(formData.hourlyRate || 0) // Гарантируем число
      };

      await updateUserProfile(userProfile.id, dataToSave);
      setMessage({ type: 'success', text: 'Профиль успешно обновлен!' });
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Ошибка при обновлении профиля' });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkEmployee = async (employeeId: string) => {
    if (!currentUser || !userProfile) return;
    
    setLoading(true);
    try {
      await linkUserToEmployee(userProfile.id, employeeId);
      setMessage({ type: 'success', text: 'Профиль связан с сотрудником!' });
    } catch (error) {
      console.error('Error linking employee:', error);
      setMessage({ type: 'error', text: 'Ошибка при связывании с сотрудником' });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkContractor = async (contractorId: string) => {
    if (!currentUser || !userProfile) return;
    
    setLoading(true);
    try {
      await linkUserToContractor(userProfile.id, contractorId);
      setMessage({ type: 'success', text: 'Профиль связан с подрядчиком!' });
    } catch (error) {
      console.error('Error linking contractor:', error);
      setMessage({ type: 'error', text: 'Ошибка при связывании с подрядчиком' });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || !userProfile) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Профиль пользователя
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Основная информация */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Основная информация</Typography>
              {!editing ? (
                <IconButton onClick={() => setEditing(true)}>
                  <EditIcon />
                </IconButton>
              ) : (
                <Box>
                  <IconButton onClick={handleSave} disabled={loading}>
                    <SaveIcon />
                  </IconButton>
                  <IconButton onClick={() => setEditing(false)} disabled={loading}>
                    <CancelIcon />
                  </IconButton>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar 
                src={userProfile.photoURL} 
                sx={{ width: 80, height: 80, mr: 2 }}
              >
                {userProfile.displayName?.[0] || userProfile.email[0]}
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {userProfile.displayName || userProfile.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {userProfile.email}
                </Typography>
                <Chip 
                  label={userProfile.role} 
                  size="small" 
                  color="primary" 
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Имя"
                  value={formData.displayName}
                  onChange={handleChange}
                  disabled={!editing}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Телефон"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  disabled={!editing}
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Отдел"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={!editing}
                  InputProps={{
                    startAdornment: <WorkIcon sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Должность"
                  value={formData.position}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Часовая ставка (себестоимость), $"
                  type="number"
                  value={formData.hourlyRate || ''}
                  onChange={handleRateChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  disabled={!editing}
                  error={!!formErrors.hourlyRate}
                  helperText={formErrors.hourlyRate}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Каналы уведомлений
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="WhatsApp"
                  value={formData.whatsappPhone}
                  onChange={handleChange}
                  disabled={!editing}
                  InputProps={{
                    startAdornment: <WhatsAppIcon sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telegram Username"
                  value={formData.telegramUsername}
                  onChange={handleChange}
                  disabled={!editing}
                  InputProps={{
                    startAdornment: <TelegramIcon sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth disabled={!editing}>
                  <InputLabel>Предпочитаемый канал</InputLabel>
                  <Select
                    value={formData.preferredNotificationChannel || ''}
                    name="preferredNotificationChannel"
                    onChange={handleSelectChange}
                    label="Предпочитаемый канал"
                    disabled={!editing}
                  >
                    <MenuItem value="email">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <EmailIcon sx={{ mr: 1 }} /> Email
                      </Box>
                    </MenuItem>
                    <MenuItem value="telegram">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TelegramIcon sx={{ mr: 1 }} /> Telegram
                      </Box>
                    </MenuItem>
                    <MenuItem value="whatsapp">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <WhatsAppIcon sx={{ mr: 1 }} /> WhatsApp
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Связи с сущностями */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <LinkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Связи
              </Typography>
              
              {userProfile.employeeId ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Связан с сотрудником ID: {userProfile.employeeId}
                </Alert>
              ) : (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Связать с сотрудником:
                  </Typography>
                  <List dense>
                    {employees.map((emp) => (
                      <ListItem key={emp.id}>
                        <ListItemText primary={emp.fullName} secondary={emp.position} />
                        <ListItemSecondaryAction>
                          <Button 
                            size="small" 
                            onClick={() => handleLinkEmployee(emp.id)}
                            disabled={loading}
                          >
                            Связать
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {userProfile.contractorId ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Связан с подрядчиком ID: {userProfile.contractorId}
                </Alert>
              ) : (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Связать с подрядчиком:
                  </Typography>
                  <List dense>
                    {contractors.map((contractor) => (
                      <ListItem key={contractor.id}>
                        <ListItemText primary={contractor.name} secondary={contractor.type} />
                        <ListItemSecondaryAction>
                          <Button 
                            size="small" 
                            onClick={() => handleLinkContractor(contractor.id)}
                            disabled={loading}
                          >
                            Связать
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Системная информация
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="User ID" 
                    secondary={userProfile.id}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Статус" 
                    secondary={userProfile.isActive ? 'Активен' : 'Неактивен'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Последний вход" 
                    secondary={userProfile.lastLogin?.toDate?.()?.toLocaleString() || 'Нет данных'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Создан" 
                    secondary={userProfile.createdAt?.toDate?.()?.toLocaleString() || 'Нет данных'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserProfilePage;

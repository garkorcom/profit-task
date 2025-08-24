import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Chip,
} from '@mui/material';
import { Link as LinkIcon, LinkOff as LinkOffIcon } from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { Employee, getEmployeesStream, updateEmployee, setEmployeeAuthLink, removeEmployeeAuthLink } from '../api/employeeApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';

const EmployeeAuthPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState<Employee | null>(null);
  const [emailToLink, setEmailToLink] = useState('');
  const [authUidToLink, setAuthUidToLink] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const unsub = getEmployeesStream(currentUser.uid, (data) => {
      setEmployees(data);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  const openLinkDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEmailToLink(employee.email || (currentUser ? currentUser.email : '') || '');
    setAuthUidToLink(employee.authUid || '');
    setDialogOpen(true);
  };

  const handleLink = async () => {
    if (!currentUser || !selectedEmployee || !emailToLink || !authUidToLink) {
      alert('Необходимо заполнить Email и Auth UID');
      return;
    }

    try {
      // 1. Обновляем профиль сотрудника в его "домашней" директории
      await updateEmployee(currentUser.uid, selectedEmployee.id, {
        email: emailToLink,
        authUid: authUidToLink,
      });

      // 2. Создаем глобальную связь для быстрого входа
      await setEmployeeAuthLink(authUidToLink, {
        ownerUid: currentUser.uid,
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.fullName,
        email: emailToLink,
      });

      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to link employee:", error);
      alert('Ошибка привязки аккаунта.');
    }
  };
  
  const handleUnlink = async () => {
    if (!currentUser || !confirmUnlink || !confirmUnlink.authUid) return;

    try {
        // 1. Удаляем глобальную связь
        await removeEmployeeAuthLink(confirmUnlink.authUid);

        // 2. Очищаем поля в профиле сотрудника
        await updateEmployee(currentUser.uid, confirmUnlink.id, {
            email: '',
            authUid: '',
        });
        
        setConfirmUnlink(null);
    } catch (error) {
        console.error("Failed to unlink employee:", error);
        alert('Ошибка отвязки аккаунта.');
    }
  };


  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Привязка Google-аккаунтов</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Здесь администратор может привязать Google-аккаунт (почту и уникальный Auth UID) к профилю сотрудника. 
        Это необходимо, чтобы сотрудник мог входить в систему и начинать учет рабочего времени.
      </Alert>
      <List>
        {employees.map((employee) => (
          <ListItem key={employee.id} divider>
            <ListItemText
              primary={employee.fullName}
              secondary={
                employee.email ? (
                  <Chip icon={<LinkIcon />} label={employee.email} color="success" size="small" />
                ) : (
                  'Аккаунт не привязан'
                )
              }
            />
            {employee.authUid ? (
                 <IconButton color="error" onClick={() => setConfirmUnlink(employee)}>
                    <LinkOffIcon />
                </IconButton>
            ) : (
                <Button variant="outlined" startIcon={<LinkIcon />} onClick={() => openLinkDialog(employee)}>
                    Привязать
                </Button>
            )}
          </ListItem>
        ))}
      </List>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Привязка аккаунта для {selectedEmployee?.fullName}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email сотрудника (из Google)"
            fullWidth
            value={emailToLink}
            onChange={(e) => setEmailToLink(e.target.value)}
            sx={{ mt: 1}}
          />
          <TextField
            margin="dense"
            label="Auth UID сотрудника (из Firebase)"
            fullWidth
            value={authUidToLink}
            onChange={(e) => setAuthUidToLink(e.target.value)}
            helperText="Этот UID можно найти в Firebase Authentication после первого входа сотрудника."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleLink} variant="contained">Сохранить</Button>
        </DialogActions>
      </Dialog>
      
      <ConfirmDialog
        open={!!confirmUnlink}
        title="Отвязать аккаунт?"
        message={`Вы уверены, что хотите отвязать аккаунт ${confirmUnlink?.email} от сотрудника ${confirmUnlink?.fullName}?`}
        onConfirm={handleUnlink}
        onClose={() => setConfirmUnlink(null)}
      />
    </Box>
  );
};

export default EmployeeAuthPage;

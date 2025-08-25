import React from 'react';
import { IconButton, Badge, Menu, MenuItem, ListItemText, Chip, Box, Tooltip } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import { useAuth } from '../../auth/AuthContext';
import { Product, getCriticalStockProducts } from '../../api/productApi';
import { useNavigate } from 'react-router-dom';

const CriticalStockBell: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [critical, setCritical] = React.useState<Product[]>([]);

  React.useEffect(() => {
    if (!currentUser) return;
    const unsub = getCriticalStockProducts(currentUser.uid, setCritical);
    return () => unsub();
  }, [currentUser]);

  const open = Boolean(anchorEl);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const goToProducts = () => {
    handleClose();
    navigate('/products');
  };

  return (
    <>
      <Tooltip title={critical.length ? 'Критические остатки' : 'Уведомления'}>
        <span>
          <IconButton color="inherit" onClick={handleOpen} disabled={!critical.length} size="large">
            <Badge color="warning" badgeContent={critical.length} max={99} overlap="circular">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </span>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {critical.length === 0 ? (
          <MenuItem><ListItemText primary="Нет уведомлений" /></MenuItem>
        ) : (
          <Box px={1} py={0.5}>
            {critical.slice(0, 8).map((p) => (
              <MenuItem key={p.id} onClick={goToProducts} sx={{ alignItems: 'flex-start' }}>
                <ListItemText
                  primary={p.name}
                  secondary={
                    <Box display="flex" gap={1} mt={0.5}>
                      <Chip size="small" color="warning" label={`Доступно: ${Math.max(0, (p.availableStock ?? (p.currentStock - (p.reservedStock || 0))))} ${p.unit}`} />
                      {typeof p.minStock === 'number' && <Chip size="small" variant="outlined" label={`Минимум: ${p.minStock}`} />}
                    </Box>
                  }
                />
              </MenuItem>
            ))}
            {critical.length > 8 && (
              <MenuItem onClick={goToProducts}><ListItemText primary={`Показать ещё (${critical.length - 8})`} /></MenuItem>
            )}
          </Box>
        )}
      </Menu>
    </>
  );
};

export default CriticalStockBell;



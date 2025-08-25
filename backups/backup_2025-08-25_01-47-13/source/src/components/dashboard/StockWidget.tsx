import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, List, ListItem, ListItemText, Chip, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Product, getCriticalStockProducts } from '../../api/productApi';
import { Warning as WarningIcon } from '@mui/icons-material';

const StockWidget: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = getCriticalStockProducts(currentUser.uid, (data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom component="div">
          <WarningIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'warning.main' }} />
          Критические остатки
        </Typography>
        {loading ? (
          <Typography>Загрузка...</Typography>
        ) : products.length === 0 ? (
          <Typography color="text.secondary">Все в порядке, запасы пополнены.</Typography>
        ) : (
          <List dense>
            {products.map((product) => (
              <ListItem key={product.id}>
                <ListItemText
                  primary={product.name}
                  secondary={`Осталось: ${product.availableStock} ${product.unit} (мин: ${product.minStock})`}
                />
              </ListItem>
            ))}
          </List>
        )}
        <Button size="small" onClick={() => navigate('/products')} sx={{ mt: 1 }}>
          Все товары
        </Button>
      </CardContent>
    </Card>
  );
};

export default StockWidget;

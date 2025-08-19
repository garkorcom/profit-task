import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getProductsStream } from '../api/productApi';

const WarehousePage: React.FC = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = getProductsStream(currentUser.uid, (data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  if (loading) return <LoadingSpinner />;
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Склад</Typography>
      {products.length > 0 ? products.map(p => (
        <Card key={p.id} sx={{ mb: 2 }}>
          <CardContent><Typography variant="h6">{p.name} ({p.quantity} {p.unit})</Typography></CardContent>
        </Card>
      )) : <Typography>Товаров на складе нет.</Typography>}
    </Box>
  );
};
export default WarehousePage;
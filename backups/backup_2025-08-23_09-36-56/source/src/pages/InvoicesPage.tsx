import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getInvoicesStream } from '../api/invoiceApi';

const InvoicesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = getInvoicesStream(currentUser.uid, (data) => {
      setInvoices(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  if (loading) return <LoadingSpinner />;
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Счета</Typography>
      {invoices.length > 0 ? invoices.map(inv => (
        <Card key={inv.id} sx={{ mb: 2 }}>
          <CardContent><Typography variant="h6">Счет №{inv.number} на сумму {inv.totalAmount}</Typography></CardContent>
        </Card>
      )) : <Typography>Счетов пока нет.</Typography>}
    </Box>
  );
};
export default InvoicesPage;
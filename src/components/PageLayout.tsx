import React, { ReactNode } from 'react';
import { Box, Typography, Container } from '@mui/material';

interface PageLayoutProps {
  title: string;
  children: ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ title, children }) => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" fontWeight="bold" mb={3}>
          {title}
        </Typography>
        {children}
      </Box>
    </Container>
  );
};

export default PageLayout;

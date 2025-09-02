/**
 * Wrapper для автоматического переключения между мобильной и десктопной версиями конструктора
 */

import React from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import MobileEstimateConstructor from './MobileEstimateConstructor';
import { Estimate } from '../../../types/estimate.types';

interface MobileEstimateWrapperProps {
  estimate: Estimate | null;
  onSave: (data: any) => void;
  onBack: () => void;
  saving?: boolean;
  children: React.ReactNode; // Desktop constructor
}

const MobileEstimateWrapper: React.FC<MobileEstimateWrapperProps> = ({
  estimate,
  onSave,
  onBack,
  saving,
  children
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // On mobile, use mobile constructor
  if (isMobile) {
    return (
      <MobileEstimateConstructor
        estimate={estimate}
        onSave={onSave}
        onBack={onBack}
        saving={saving}
      />
    );
  }

  // On desktop, use original constructor
  return <>{children}</>;
};

export default MobileEstimateWrapper;
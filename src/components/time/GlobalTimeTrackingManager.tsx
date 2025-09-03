/**
 * GlobalTimeTrackingManager - централизованный менеджер UI для учета времени
 * Управляет глобальными модальными окнами и индикаторами активной работы
 * Должен быть интегрирован в корневой Layout (MainLayout.tsx)
 */

import React from 'react';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { GlobalTimerIndicator } from './GlobalTimerIndicator';
import { CentralizedTimeEntryModal } from './CentralizedTimeEntryModal';

/**
 * Глобальный менеджер времени - координирует все UI элементы учета времени
 * Рендерит:
 * 1. Глобальный индикатор активного таймера (для хедера)
 * 2. Централизованное модальное окно для управления временем
 * 3. Систему уведомлений о времени
 */
const GlobalTimeTrackingManager: React.FC = () => {
  const { 
    isWorking, 
    isModalOpen,
    modalPrefillData
  } = useTimeTracking();

  return (
    <>
      {/* Глобальный индикатор активного таймера */}
      {isWorking && <GlobalTimerIndicator />}
      
      {/* Централизованное модальное окно для управления временем */}
      <CentralizedTimeEntryModal 
        open={isModalOpen}
        prefillData={modalPrefillData}
      />
      
      {/* Здесь можно добавить систему уведомлений */}
      {/* <TimeNotificationSystem /> */}
    </>
  );
};

export default GlobalTimeTrackingManager;
/**
 * ============================================================================
 * COMMAND PALETTE CONTEXT - КОНТЕКСТ КОМАНДНОЙ ПАЛИТРЫ (T3 Optimization)
 * ============================================================================
 * 
 * Глобальный контекст для управления состоянием командной палитры.
 * Обеспечивает доступ к палитре из любого места приложения и
 * координирует взаимодействие с горячими клавишами.
 * 
 * @version 1.0.0
 * @since 2024-09-09
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CommandPalette } from '../components/CommandPalette';

interface CommandPaletteContextType {
  isOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextType | undefined>(undefined);

export const useCommandPalette = (): CommandPaletteContextType => {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return context;
};

interface CommandPaletteProviderProps {
  children: ReactNode;
}

export const CommandPaletteProvider: React.FC<CommandPaletteProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openPalette = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setIsOpen(false);
  }, []);

  const togglePalette = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const value = {
    isOpen,
    openPalette,
    closePalette,
    togglePalette
  };

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette open={isOpen} onClose={closePalette} />
    </CommandPaletteContext.Provider>
  );
};

export default CommandPaletteProvider;
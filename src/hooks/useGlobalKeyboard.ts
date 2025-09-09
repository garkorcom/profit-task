/**
 * ============================================================================
 * USE GLOBAL KEYBOARD HOOK - ГЛОБАЛЬНЫЕ ГОРЯЧИЕ КЛАВИШИ (T3 Optimization)
 * ============================================================================
 * 
 * Хук для обработки глобальных клавиатурных сокращений в приложении.
 * Обеспечивает активацию командной палитры и других системных функций.
 * 
 * @version 1.0.0
 * @since 2024-09-09
 */

import { useEffect } from 'react';
import { useCommandPalette } from '../contexts/CommandPaletteContext';

export const useGlobalKeyboard = () => {
  const { togglePalette } = useCommandPalette();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K или Cmd+K - открыть/закрыть командную палитру
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        event.stopPropagation();
        togglePalette();
        return;
      }

      // Дополнительные глобальные сокращения можно добавить здесь
      // Например:
      // - Ctrl+N - новая задача
      // - Ctrl+Space - пауза/продолжить
      // - Ctrl+Q - остановить работу
    };

    // Добавляем обработчик в фазе capture для перехвата перед другими компонентами
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [togglePalette]);
};

export default useGlobalKeyboard;
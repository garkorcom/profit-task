import { useCallback, useRef } from 'react';

/**
 * Provides debounced callback helpers for state updates or network calls.
 */
export const useDebouncedCallback = <Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay = 600
) => {
  const timeoutRef = useRef<number>();

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
};

/**
 * Returns a helper to debounce arbitrary inline functions without recreating them.
 */
export const useDebouncedRunner = (delay = 600) => {
  const timeoutRef = useRef<number>();

  return useCallback(
    (fn: () => void) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        fn();
      }, delay);
    },
    [delay]
  );
};


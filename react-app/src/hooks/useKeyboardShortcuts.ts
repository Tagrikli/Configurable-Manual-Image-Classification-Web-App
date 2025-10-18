import { useEffect } from 'react';

export interface KeyboardShortcutOptions {
  shortcuts?: Record<string, () => void>;
  onSpace?: () => void;
}

export const useKeyboardShortcuts = ({ shortcuts = {}, onSpace }: KeyboardShortcutOptions) => {
  useEffect(() => {
    const normalizedShortcuts = Object.entries(shortcuts).reduce<Record<string, () => void>>((acc, [key, handler]) => {
      if (typeof handler === 'function' && key) {
        acc[key.toUpperCase()] = handler;
      }
      return acc;
    }, {});

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      const handler = normalizedShortcuts[key];

      if (handler) {
        event.preventDefault();
        handler();
        return;
      }

      if (onSpace && (event.code === 'Space' || key === ' ' || key === 'SPACE')) {
        event.preventDefault();
        onSpace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, onSpace]);
};

import { useEffect, useRef } from 'react';

interface UseFocusTrapOptions {
  isOpen: boolean;
  onClose: () => void;
  autoFocus?: boolean;
}

/**
 * Accessible Focus Trap Hook for Modals and Dialogs (WCAG 2.2 AA).
 * - Traps keyboard Tab navigation inside the modal boundary.
 * - Listens for the Escape key to close the dialog.
 * - Restores focus to the triggering element upon dialog closure.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  autoFocus = true,
}: UseFocusTrapOptions) {
  const containerRef = useRef<T | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save previously focused element to restore on modal dismiss
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    const getFocusableElements = (): HTMLElement[] => {
      const selectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ];
      return Array.from(container.querySelectorAll<HTMLElement>(selectors.join(',')))
        .filter(el => {
          if (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0) {
            return true;
          }
          // In JSDOM / headless test environments layout metrics are 0
          if (typeof window !== 'undefined' && window.getComputedStyle) {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
          }
          return true;
        });
    };

    if (autoFocus) {
      const focusables = getFocusableElements();
      if (focusables.length > 0) {
        focusables[0]?.focus();
      } else {
        container.focus();
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'Tab') {
        const focusables = getFocusableElements();
        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to original active element
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose, autoFocus]);

  return containerRef;
}

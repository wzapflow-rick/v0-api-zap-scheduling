'use client';

import { useEffect, useCallback } from 'react';

/**
 * Hook to detect keyboard vs mouse navigation
 * Adds 'using-keyboard' class to body when user is navigating with keyboard
 */
export function useKeyboardDetection() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        document.body.classList.add('using-keyboard');
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove('using-keyboard');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
}

/**
 * Hook for global keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to work even in inputs
        if (e.key !== 'Escape') {
          return;
        }
      }

      // Build the shortcut key string
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('ctrl');
      if (e.altKey) parts.push('alt');
      if (e.shiftKey) parts.push('shift');
      parts.push(e.key.toLowerCase());
      const shortcutKey = parts.join('+');

      // Check for matching shortcut
      if (shortcuts[shortcutKey]) {
        e.preventDefault();
        shortcuts[shortcutKey]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Hook for form keyboard navigation
 * Allows Tab to move between fields and Enter to submit
 */
export function useFormKeyboardNavigation(
  formRef: React.RefObject<HTMLFormElement | null>,
  onSubmit?: () => void
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!formRef.current) return;

      const form = formRef.current;
      const focusableElements = form.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const elements = Array.from(focusableElements);
      const currentIndex = elements.indexOf(document.activeElement as HTMLElement);

      // Enter to submit (if not in textarea and not on a button)
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'TEXTAREA' && target.tagName !== 'BUTTON') {
          e.preventDefault();
          // Find and click submit button, or call onSubmit
          const submitButton = form.querySelector<HTMLButtonElement>(
            'button[type="submit"]'
          );
          if (submitButton) {
            submitButton.click();
          } else if (onSubmit) {
            onSubmit();
          }
        }
      }

      // Shift+Tab to go to previous field
      if (e.key === 'Tab' && e.shiftKey) {
        if (currentIndex === 0) {
          e.preventDefault();
          elements[elements.length - 1]?.focus();
        }
      }

      // Tab to go to next field (default behavior, but trap at end)
      if (e.key === 'Tab' && !e.shiftKey) {
        if (currentIndex === elements.length - 1) {
          e.preventDefault();
          elements[0]?.focus();
        }
      }

      // Arrow keys for radio groups and selects
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const target = e.target as HTMLElement;
        if (target.getAttribute('role') === 'radiogroup') {
          e.preventDefault();
          const direction = e.key === 'ArrowDown' ? 1 : -1;
          const nextIndex = Math.max(
            0,
            Math.min(elements.length - 1, currentIndex + direction)
          );
          elements[nextIndex]?.focus();
        }
      }
    },
    [formRef, onSubmit]
  );

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    form.addEventListener('keydown', handleKeyDown as EventListener);
    return () => form.removeEventListener('keydown', handleKeyDown as EventListener);
  }, [formRef, handleKeyDown]);
}

/**
 * Hook to trap focus inside a modal/dialog
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean
) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element when trap activates
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
}

/**
 * Hook to close something on Escape key
 */
export function useEscapeKey(onEscape: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, isActive]);
}

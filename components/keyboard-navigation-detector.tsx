'use client';

import { useKeyboardDetection } from '@/hooks/use-keyboard-navigation';

export function KeyboardNavigationDetector() {
  useKeyboardDetection();
  return null;
}

'use client';

import { useEffect, useState } from 'react';

/** Reads the user's OS-level reduced-motion preference. */
export function usePrefersReducedMotion(enabled = true): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setPrefersReducedMotion(false);
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (): void => setPrefersReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [enabled]);

  return enabled && prefersReducedMotion;
}

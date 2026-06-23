import { useEffect, useState } from 'react';

export function useDeferredSurface3dMount(enabled: boolean): boolean {
  const [isMounted, setIsMounted] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setIsMounted(true);
      return;
    }

    setIsMounted(false);

    let firstFrame: number | null = null;
    let secondFrame: number | null = null;

    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setIsMounted(true);
      });
    });

    return () => {
      if (firstFrame !== null) cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) cancelAnimationFrame(secondFrame);
    };
  }, [enabled]);

  return isMounted;
}

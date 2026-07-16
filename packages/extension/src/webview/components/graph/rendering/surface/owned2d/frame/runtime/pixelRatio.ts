function currentDevicePixelRatio(): number {
  const ratio = window.devicePixelRatio;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
}

export function observeDevicePixelRatio(invalidate: () => void): () => void {
  let active = true;
  let ratio = currentDevicePixelRatio();
  let mediaQuery: MediaQueryList | undefined;

  const detachMediaQuery = (): void => {
    mediaQuery?.removeEventListener('change', handleScaleChange);
    mediaQuery = undefined;
  };
  const attachMediaQuery = (): void => {
    if (typeof window.matchMedia !== 'function') return;
    mediaQuery = window.matchMedia(`(resolution: ${ratio}dppx)`);
    mediaQuery.addEventListener('change', handleScaleChange);
  };
  function handleScaleChange(): void {
    if (!active) return;
    const nextRatio = currentDevicePixelRatio();
    if (nextRatio === ratio) return;
    detachMediaQuery();
    ratio = nextRatio;
    attachMediaQuery();
    invalidate();
  }

  attachMediaQuery();
  window.addEventListener('resize', handleScaleChange);

  return () => {
    if (!active) return;
    active = false;
    window.removeEventListener('resize', handleScaleChange);
    detachMediaQuery();
  };
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function graphMotionDuration(durationMs: number | undefined): number {
  const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs ?? 0) : 0;
  if (duration === 0) return 0;
  return typeof window.matchMedia === 'function'
    && window.matchMedia(REDUCED_MOTION_QUERY).matches
    ? 0
    : duration;
}

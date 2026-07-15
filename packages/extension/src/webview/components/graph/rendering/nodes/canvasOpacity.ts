export function normalizedNodeFillOpacity(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : 1;
}

export function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function clampAlpha(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function formatHexChannel(value: number): string {
  return clampChannel(value).toString(16).padStart(2, '0').toUpperCase();
}

export function graphNodeDrawnArea(width: number, height: number): number {
  const safeWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const safeHeight = Number.isFinite(height) ? Math.max(0, height) : 0;
  return safeWidth * safeHeight;
}

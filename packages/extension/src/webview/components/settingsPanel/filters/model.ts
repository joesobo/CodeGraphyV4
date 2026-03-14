export function canAddFilterPattern(value: string): boolean {
  return value.trim().length > 0;
}

export function clampMaxFiles(value: number): number {
  return Math.max(1, value);
}

export function parseMaxFilesInput(value: string): number | null {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function decreaseMaxFiles(value: number): number {
  return clampMaxFiles(value - 100);
}

export function increaseMaxFiles(value: number): number {
  return value + 100;
}

export function shouldShowPluginFilterPatterns(patterns: string[]): boolean {
  return patterns.length > 0;
}

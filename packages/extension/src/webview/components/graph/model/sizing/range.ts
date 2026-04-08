export function getMetricRange(
  values: number[],
  fallbackMin: number,
  fallbackMax: number,
): { min: number; max: number; range: number } {
  const min = Math.min(...values, fallbackMin);
  const max = Math.max(...values, fallbackMax);
  const range = max - min || 1;

  return { min, max, range };
}

export function scaleMetricValue(
  value: number,
  min: number,
  range: number,
  outputMin: number,
  outputMax: number,
): number {
  return outputMin + ((value - min) / range) * (outputMax - outputMin);
}

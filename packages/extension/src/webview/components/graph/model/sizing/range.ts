export function scaleMetricValue(
  value: number,
  min: number,
  range: number,
  outputMin: number,
  outputMax: number,
): number {
  return outputMin + ((value - min) / range) * (outputMax - outputMin);
}

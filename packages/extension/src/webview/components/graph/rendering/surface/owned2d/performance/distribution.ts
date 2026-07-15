export interface OwnedGraphPerformanceDistribution {
  average: number;
  maximum: number;
  onePercentHigh: number;
}

export function summarizePerformanceDistribution(
  values: readonly number[],
): OwnedGraphPerformanceDistribution {
  let sum = 0;
  let maximum = 0;
  for (const value of values) {
    sum += value;
    maximum = Math.max(maximum, value);
  }
  const sortedDescending = [...values].sort((first, second) => second - first);
  const highCount = Math.max(1, Math.ceil(sortedDescending.length / 100));
  let highSum = 0;
  for (let index = 0; index < highCount; index += 1) {
    highSum += sortedDescending[index];
  }
  return {
    average: sum / values.length,
    maximum,
    onePercentHigh: highSum / highCount,
  };
}

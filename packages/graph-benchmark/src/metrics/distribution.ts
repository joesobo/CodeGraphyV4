function nearestRank(sortedValues: readonly number[], percentile: number): number {
  const rank = Math.max(0, Math.ceil(percentile * sortedValues.length) - 1);
  return sortedValues[rank];
}

export function summarizeDistribution(values: readonly number[]) {
  if (values.length === 0) {
    throw new Error('Cannot summarize an empty metric distribution');
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  return {
    p50: nearestRank(sortedValues, 0.5),
    p95: nearestRank(sortedValues, 0.95),
    p99: nearestRank(sortedValues, 0.99),
    max: sortedValues[sortedValues.length - 1],
    sampleCount: sortedValues.length,
  };
}

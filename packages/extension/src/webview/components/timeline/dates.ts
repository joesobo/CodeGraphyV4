const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

const AXIS_LABEL_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
};

const DEFAULT_MAX_TICKS = 7;

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, DATE_FORMAT_OPTIONS);
}

export function formatAxisLabel(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, AXIS_LABEL_FORMAT_OPTIONS);
}

export function generateDateTicks(
  minTimestamp: number,
  maxTimestamp: number,
  maxTicks: number = DEFAULT_MAX_TICKS,
): number[] {
  const range = maxTimestamp - minTimestamp;
  if (range <= 0) {
    return [minTimestamp];
  }

  const step = range / (maxTicks + 1);
  const ticks: number[] = [];
  for (let index = 1; index <= maxTicks; index += 1) {
    ticks.push(minTimestamp + step * index);
  }

  return ticks;
}

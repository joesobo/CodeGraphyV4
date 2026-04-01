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
const NOW_LABEL_RESERVED_WIDTH = 112;
const MIN_TICK_LABEL_SPACING = 96;

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, DATE_FORMAT_OPTIONS);
}

export function formatAxisLabel(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, AXIS_LABEL_FORMAT_OPTIONS);
}

export function getResponsiveAxisTickCount(
  trackWidth: number,
  maxTicks: number = DEFAULT_MAX_TICKS,
): number {
  if (maxTicks <= 0) {
    return 0;
  }

  if (trackWidth <= 0) {
    return maxTicks;
  }

  const availableWidth = Math.max(trackWidth - NOW_LABEL_RESERVED_WIDTH, MIN_TICK_LABEL_SPACING);
  const responsiveTickCount = Math.floor(availableWidth / MIN_TICK_LABEL_SPACING);

  return Math.max(1, Math.min(maxTicks, responsiveTickCount));
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

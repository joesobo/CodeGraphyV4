const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

const AXIS_LABEL_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
};

const DEFAULT_MESSAGE_MAX_LENGTH = 50;
const DEFAULT_MAX_TICKS = 7;
const ELLIPSIS_LENGTH = 3;

export interface TimelineTimestampedCommit {
  timestamp: number;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, DATE_FORMAT_OPTIONS);
}

export function formatAxisLabel(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, AXIS_LABEL_FORMAT_OPTIONS);
}

export function truncateMessage(message: string, maxLen: number = DEFAULT_MESSAGE_MAX_LENGTH): string {
  if (message.length <= maxLen) {
    return message;
  }

  return `${message.slice(0, maxLen - ELLIPSIS_LENGTH)}...`;
}

export function generateDateTicks(
  minTs: number,
  maxTs: number,
  maxTicks: number = DEFAULT_MAX_TICKS,
): number[] {
  const range = maxTs - minTs;
  if (range <= 0) {
    return [minTs];
  }

  const step = range / (maxTicks + 1);
  const ticks: number[] = [];
  for (let index = 1; index <= maxTicks; index += 1) {
    ticks.push(minTs + step * index);
  }

  return ticks;
}

export function findCommitIndexAtTime(
  commits: TimelineTimestampedCommit[],
  time: number,
): number {
  let low = 0;
  let high = commits.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (commits[mid].timestamp <= time) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}

import { describe, expect, it } from 'vitest';
import {
  findCommitIndexAtTime,
  formatAxisLabel,
  formatDate,
  generateDateTicks,
  truncateMessage,
} from '../../../src/webview/components/timeline/model';

function formatExpectedDate(
  timestamp: number,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(timestamp * 1000));
}

describe('timeline/model', () => {
  describe('formatDate', () => {
    it('formats unix timestamps using month day and year', () => {
      const timestamp = 1709294400;

      expect(formatDate(timestamp)).toBe(
        formatExpectedDate(timestamp, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      );
    });
  });

  describe('formatAxisLabel', () => {
    it('formats unix timestamps using abbreviated month and day', () => {
      const timestamp = 1709294400;

      expect(formatAxisLabel(timestamp)).toBe(
        formatExpectedDate(timestamp, {
          month: 'short',
          day: 'numeric',
        }),
      );
    });
  });

  describe('truncateMessage', () => {
    it('returns the full message when it already fits', () => {
      expect(truncateMessage('short message', 20)).toBe('short message');
    });

    it('keeps the original message when it matches the max length exactly', () => {
      expect(truncateMessage('12345', 5)).toBe('12345');
    });

    it('truncates long messages and preserves the requested length', () => {
      expect(truncateMessage('abcdefghij', 8)).toBe('abcde...');
    });
  });

  describe('generateDateTicks', () => {
    it('returns the minimum timestamp when the range is zero', () => {
      expect(generateDateTicks(42, 42)).toEqual([42]);
      expect(generateDateTicks(42, 40)).toEqual([42]);
    });

    it('returns evenly spaced interior ticks using the default count', () => {
      expect(generateDateTicks(0, 80)).toEqual([10, 20, 30, 40, 50, 60, 70]);
    });

    it('returns no ticks when maxTicks is zero', () => {
      expect(generateDateTicks(10, 20, 0)).toEqual([]);
    });

    it('supports fractional spacing when the range does not divide evenly', () => {
      expect(generateDateTicks(0, 10, 3)).toEqual([2.5, 5, 7.5]);
    });
  });

  describe('findCommitIndexAtTime', () => {
    const commits = [
      { timestamp: 10 },
      { timestamp: 20 },
      { timestamp: 20 },
      { timestamp: 35 },
    ];

    it('returns -1 when there are no commits', () => {
      expect(findCommitIndexAtTime([], 10)).toBe(-1);
    });

    it('returns -1 when the time is before the first commit', () => {
      expect(findCommitIndexAtTime(commits, 9)).toBe(-1);
    });

    it('returns the last commit index at or before the requested time', () => {
      expect(findCommitIndexAtTime(commits, 20)).toBe(2);
      expect(findCommitIndexAtTime(commits, 34)).toBe(2);
      expect(findCommitIndexAtTime(commits, 35)).toBe(3);
    });

    it('returns the final commit index when the time is after the range', () => {
      expect(findCommitIndexAtTime(commits, 100)).toBe(3);
    });
  });
});

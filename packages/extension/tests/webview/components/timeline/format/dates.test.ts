import { describe, expect, it } from 'vitest';
import {
  formatAxisLabel,
  formatDate,
  generateDateTicks,
} from '../../../../../src/webview/components/timeline/format/dates';

function formatExpectedDate(
  timestamp: number,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(timestamp * 1000));
}

describe('timeline/dates', () => {
  describe('formatDate', () => {
    it('formats unix timestamps with month day and year', () => {
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
    it('formats unix timestamps with abbreviated month and day', () => {
      const timestamp = 1709294400;

      expect(formatAxisLabel(timestamp)).toBe(
        formatExpectedDate(timestamp, {
          month: 'short',
          day: 'numeric',
        }),
      );
    });
  });

  describe('generateDateTicks', () => {
    it('returns the minimum timestamp when the range is zero', () => {
      expect(generateDateTicks(42, 42)).toEqual([42]);
    });

    it('returns the minimum timestamp when the range is negative', () => {
      expect(generateDateTicks(42, 40)).toEqual([42]);
    });

    it('returns evenly spaced interior ticks with the default count', () => {
      expect(generateDateTicks(0, 80)).toEqual([10, 20, 30, 40, 50, 60, 70]);
    });

    it('returns no ticks when maxTicks is zero', () => {
      expect(generateDateTicks(10, 20, 0)).toEqual([]);
    });

    it('supports fractional spacing when the range does not divide evenly', () => {
      expect(generateDateTicks(0, 10, 3)).toEqual([2.5, 5, 7.5]);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { fileFanOutVerdict } from '../../../src/organize/metric/fileFanOut';

describe('fileFanOutVerdict', () => {
  it('returns STABLE when file count is below warning threshold', () => {
    expect(fileFanOutVerdict(5, 8, 10)).toBe('STABLE');
    expect(fileFanOutVerdict(0, 8, 10)).toBe('STABLE');
    expect(fileFanOutVerdict(7, 8, 10)).toBe('STABLE');
  });

  it('returns WARNING when file count is at or above warning threshold and below split threshold', () => {
    expect(fileFanOutVerdict(8, 8, 10)).toBe('WARNING');
    expect(fileFanOutVerdict(9, 8, 10)).toBe('WARNING');
  });

  it('returns SPLIT when file count is at or above split threshold', () => {
    expect(fileFanOutVerdict(10, 8, 10)).toBe('SPLIT');
    expect(fileFanOutVerdict(11, 8, 10)).toBe('SPLIT');
    expect(fileFanOutVerdict(100, 8, 10)).toBe('SPLIT');
  });

  it('respects boundary values exactly at warning threshold', () => {
    expect(fileFanOutVerdict(8, 8, 10)).toBe('WARNING');
    expect(fileFanOutVerdict(7, 8, 10)).toBe('STABLE');
  });

  it('respects boundary values exactly at split threshold', () => {
    expect(fileFanOutVerdict(10, 8, 10)).toBe('SPLIT');
    expect(fileFanOutVerdict(9, 8, 10)).toBe('WARNING');
  });

  it('handles different threshold values', () => {
    const warningThreshold = 20;
    const splitThreshold = 30;

    expect(fileFanOutVerdict(19, warningThreshold, splitThreshold)).toBe('STABLE');
    expect(fileFanOutVerdict(20, warningThreshold, splitThreshold)).toBe('WARNING');
    expect(fileFanOutVerdict(29, warningThreshold, splitThreshold)).toBe('WARNING');
    expect(fileFanOutVerdict(30, warningThreshold, splitThreshold)).toBe('SPLIT');
  });

  it('handles edge case when warning and split thresholds are close', () => {
    expect(fileFanOutVerdict(4, 5, 6)).toBe('STABLE');
    expect(fileFanOutVerdict(5, 5, 6)).toBe('WARNING');
    expect(fileFanOutVerdict(6, 5, 6)).toBe('SPLIT');
  });

  it('handles large file counts', () => {
    expect(fileFanOutVerdict(1000, 8, 10)).toBe('SPLIT');
  });
});

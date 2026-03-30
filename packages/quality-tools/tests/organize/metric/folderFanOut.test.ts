import { describe, expect, it } from 'vitest';
import { folderFanOutVerdict } from '../../../src/organize/metric/folderFanOut';

describe('folderFanOutVerdict', () => {
  it('returns STABLE when folder count is below warning threshold', () => {
    expect(folderFanOutVerdict(5, 10, 13)).toBe('STABLE');
    expect(folderFanOutVerdict(0, 10, 13)).toBe('STABLE');
    expect(folderFanOutVerdict(9, 10, 13)).toBe('STABLE');
  });

  it('returns WARNING when folder count is at or above warning threshold and below split threshold', () => {
    expect(folderFanOutVerdict(10, 10, 13)).toBe('WARNING');
    expect(folderFanOutVerdict(11, 10, 13)).toBe('WARNING');
    expect(folderFanOutVerdict(12, 10, 13)).toBe('WARNING');
  });

  it('returns SPLIT when folder count is at or above split threshold', () => {
    expect(folderFanOutVerdict(13, 10, 13)).toBe('SPLIT');
    expect(folderFanOutVerdict(14, 10, 13)).toBe('SPLIT');
    expect(folderFanOutVerdict(100, 10, 13)).toBe('SPLIT');
  });

  it('respects boundary values exactly at warning threshold', () => {
    expect(folderFanOutVerdict(10, 10, 13)).toBe('WARNING');
    expect(folderFanOutVerdict(9, 10, 13)).toBe('STABLE');
  });

  it('respects boundary values exactly at split threshold', () => {
    expect(folderFanOutVerdict(13, 10, 13)).toBe('SPLIT');
    expect(folderFanOutVerdict(12, 10, 13)).toBe('WARNING');
  });

  it('handles different threshold values', () => {
    const warningThreshold = 15;
    const splitThreshold = 25;

    expect(folderFanOutVerdict(14, warningThreshold, splitThreshold)).toBe('STABLE');
    expect(folderFanOutVerdict(15, warningThreshold, splitThreshold)).toBe('WARNING');
    expect(folderFanOutVerdict(24, warningThreshold, splitThreshold)).toBe('WARNING');
    expect(folderFanOutVerdict(25, warningThreshold, splitThreshold)).toBe('SPLIT');
  });

  it('handles edge case when warning and split thresholds are close', () => {
    expect(folderFanOutVerdict(6, 7, 8)).toBe('STABLE');
    expect(folderFanOutVerdict(7, 7, 8)).toBe('WARNING');
    expect(folderFanOutVerdict(8, 7, 8)).toBe('SPLIT');
  });

  it('handles large folder counts', () => {
    expect(folderFanOutVerdict(1000, 10, 13)).toBe('SPLIT');
  });
});

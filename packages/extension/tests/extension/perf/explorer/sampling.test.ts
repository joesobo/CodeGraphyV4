import { describe, expect, it, vi } from 'vitest';
import {
  sampleExplorerComparisonMedian,
  sampleExplorerRevealComparisonMedians,
} from '../../../../src/extension/perf/explorer/sampling';

describe('extension/perf/explorer/sampling', () => {
  it('returns the median from 51 independent mutation measurements', async () => {
    const samples = Array.from({ length: 51 }, (_value, index) => 51 - index);
    const measure = vi.fn(async () => samples[measure.mock.calls.length - 1]);

    await expect(sampleExplorerComparisonMedian(measure)).resolves.toBe(26);
    expect(measure).toHaveBeenCalledTimes(51);
  });

  it('alternates 101 paired reveal measurements and returns both medians', async () => {
    const order: string[] = [];
    const codeGraphySamples = Array.from(
      { length: 101 },
      (_value, index) => 101 - index,
    );
    const explorerSamples = Array.from(
      { length: 101 },
      (_value, index) => index + 1,
    );
    const measureCodeGraphy = vi.fn(async () => {
      order.push('codegraphy');
      return codeGraphySamples[measureCodeGraphy.mock.calls.length - 1];
    });
    const measureExplorer = vi.fn(async () => {
      order.push('explorer');
      return explorerSamples[measureExplorer.mock.calls.length - 1];
    });

    await expect(sampleExplorerRevealComparisonMedians(
      measureCodeGraphy,
      measureExplorer,
    )).resolves.toEqual({ codeGraphyRevealMs: 51, explorerRevealMs: 51 });
    expect(measureCodeGraphy).toHaveBeenCalledTimes(101);
    expect(measureExplorer).toHaveBeenCalledTimes(101);
    expect(order.slice(0, 6)).toEqual([
      'codegraphy',
      'explorer',
      'explorer',
      'codegraphy',
      'codegraphy',
      'explorer',
    ]);
  });
});

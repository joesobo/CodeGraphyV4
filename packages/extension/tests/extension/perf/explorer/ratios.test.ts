import { describe, expect, it } from 'vitest';
import { calculateExplorerRatios } from '../../../../src/extension/perf/explorer/ratios';

describe('extension/perf/explorer/ratios', () => {
  it('divides each CodeGraphy span by its matching Explorer span', () => {
    expect(calculateExplorerRatios(
      { rename: 30, create: 20, delete: 40, reveal: 10 },
      {
        explorerRenameMs: 20,
        explorerCreateMs: 10,
        explorerDeleteMs: 20,
        explorerRevealMs: 5,
      },
    )).toEqual({
      renameRatio: 1.5,
      createRatio: 2,
      deleteRatio: 2,
      revealRatio: 2,
    });
  });

  it.each([
    ['explorerRenameMs', 0],
    ['explorerCreateMs', Number.NaN],
    ['explorerDeleteMs', Number.POSITIVE_INFINITY],
    ['explorerRevealMs', -1],
  ] as const)('rejects an invalid %s denominator', (metric, value) => {
    expect(() => calculateExplorerRatios(
      { rename: 1, create: 1, delete: 1, reveal: 1 },
      {
        explorerRenameMs: metric === 'explorerRenameMs' ? value : 1,
        explorerCreateMs: metric === 'explorerCreateMs' ? value : 1,
        explorerDeleteMs: metric === 'explorerDeleteMs' ? value : 1,
        explorerRevealMs: metric === 'explorerRevealMs' ? value : 1,
      },
    )).toThrow(`${metric} must be finite and greater than zero`);
  });
});

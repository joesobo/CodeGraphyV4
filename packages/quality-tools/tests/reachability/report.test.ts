import { describe, expect, it, vi } from 'vitest';
import { reportReachability } from '../../src/reachability/report';
import type { ReachabilityReport } from '../../src/reachability/types';

function createReport(): ReachabilityReport {
  return {
    deadEnds: [
      {
        absolutePath: '/repo/packages/extension/src/shared/isolated.ts',
        entrypoint: false,
        incoming: 0,
        layer: 'shared',
        outgoing: 0,
        relativePath: 'packages/extension/src/shared/isolated.ts'
      }
    ],
    deadSurfaces: [
      {
        absolutePath: '/repo/packages/extension/src/shared/orphan.ts',
        entrypoint: false,
        incoming: 0,
        layer: 'shared',
        outgoing: 1,
        relativePath: 'packages/extension/src/shared/orphan.ts'
      }
    ],
    files: [
      {
        absolutePath: '/repo/packages/extension/src/shared/orphan.ts',
        entrypoint: false,
        incoming: 0,
        layer: 'shared',
        outgoing: 1,
        relativePath: 'packages/extension/src/shared/orphan.ts'
      },
      {
        absolutePath: '/repo/packages/extension/src/shared/isolated.ts',
        entrypoint: false,
        incoming: 0,
        layer: 'shared',
        outgoing: 0,
        relativePath: 'packages/extension/src/shared/isolated.ts'
      }
    ],
    target: 'packages/extension'
  };
}

describe('reportReachability', () => {
  it('prints a focused summary of dead surfaces and dead ends', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    reportReachability(createReport());

    expect(log.mock.calls.flat()).toEqual(
      expect.arrayContaining([
        'Reachability for packages/extension',
        'Dead surfaces:',
        '- packages/extension/src/shared/orphan.ts [shared] (in: 0, out: 1)',
        'Dead ends:',
        '- packages/extension/src/shared/isolated.ts [shared] (in: 0, out: 0)'
      ]),
    );

    log.mockRestore();
  });
});

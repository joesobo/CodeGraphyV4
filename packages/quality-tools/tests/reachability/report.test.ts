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
  it('prints the empty-scope message when no files are present', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    reportReachability({
      deadEnds: [],
      deadSurfaces: [],
      files: [],
      target: 'packages/extension',
    });

    expect(log.mock.calls.map(call => call[0])).toEqual(['\nNo reachability-scope files found.\n']);

    log.mockRestore();
  });

  it('prints the full summary, sections, and verbose file list in order', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    reportReachability(createReport(), { verbose: true });

    expect(log.mock.calls.map(call => call[0])).toEqual([
      '',
      'Reachability for packages/extension',
      '━'.repeat(72),
      'Files: 2',
      'Dead surfaces: 1',
      'Dead ends: 1',
      '',
      'Dead surfaces:',
      '- packages/extension/src/shared/orphan.ts [shared] (in: 0, out: 1)',
      '',
      'Dead ends:',
      '- packages/extension/src/shared/isolated.ts [shared] (in: 0, out: 0)',
      '',
      'All analyzed files:',
      '- packages/extension/src/shared/orphan.ts [shared] (in: 0, out: 1)',
      '- packages/extension/src/shared/isolated.ts [shared] (in: 0, out: 0)',
    ]);

    log.mockRestore();
  });

  it('omits optional sections when dead surfaces and dead ends are absent', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    reportReachability({
      deadEnds: [],
      deadSurfaces: [],
      files: [
        {
          absolutePath: '/repo/packages/extension/src/shared/used.ts',
          entrypoint: false,
          incoming: 2,
          layer: 'shared',
          outgoing: 1,
          relativePath: 'packages/extension/src/shared/used.ts',
        },
      ],
      target: 'packages/extension',
    });

    expect(log.mock.calls.map(call => call[0])).toEqual([
      '',
      'Reachability for packages/extension',
      '━'.repeat(72),
      'Files: 1',
      'Dead surfaces: 0',
      'Dead ends: 0',
      '',
    ]);

    log.mockRestore();
  });
});

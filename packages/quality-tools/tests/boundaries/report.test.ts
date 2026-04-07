import { describe, expect, it, vi } from 'vitest';
import { reportBoundaries } from '../../src/boundaries/report';
import type { BoundaryReport } from '../../src/boundaries/types';

function createReport(): BoundaryReport {
  return {
    deadEnds: [
      {
        absolutePath: '/repo/packages/extension/src/shared/isolated.ts',
        entrypoint: false,
        incoming: 0,
        layer: 'shared',
        outgoing: 0,
        relativePath: 'packages/extension/src/shared/isolated.ts',
      },
    ],
    deadSurfaces: [
      {
        absolutePath: '/repo/packages/extension/src/shared/orphan.ts',
        entrypoint: false,
        incoming: 0,
        layer: 'shared',
        outgoing: 1,
        relativePath: 'packages/extension/src/shared/orphan.ts',
      },
    ],
    files: [
      {
        absolutePath: '/repo/packages/extension/src/core/index.ts',
        entrypoint: true,
        incoming: 4,
        layer: 'core',
        outgoing: 2,
        relativePath: 'packages/extension/src/core/index.ts',
      },
      {
        absolutePath: '/repo/packages/extension/src/shared/orphan.ts',
        entrypoint: false,
        incoming: 0,
        layer: 'shared',
        outgoing: 1,
        relativePath: 'packages/extension/src/shared/orphan.ts',
      },
      {
        absolutePath: '/repo/packages/extension/src/shared/isolated.ts',
        entrypoint: false,
        incoming: 0,
        layer: 'shared',
        outgoing: 0,
        relativePath: 'packages/extension/src/shared/isolated.ts',
      },
    ],
    layerViolations: [
      {
        from: 'packages/extension/src/core/bad.ts',
        fromLayer: 'core',
        reason: 'core cannot depend on webview',
        to: 'packages/extension/src/webview/view.ts',
        toLayer: 'webview',
      },
    ],
    target: 'packages/extension',
  };
}

describe('reportBoundaries', () => {
  it('prints the empty-scope message when no files are present', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    reportBoundaries({
      deadEnds: [],
      deadSurfaces: [],
      files: [],
      layerViolations: [],
      target: 'packages/extension',
    });

    expect(log.mock.calls.map(call => call[0])).toEqual(['\nNo boundary-scope files found.\n']);
    log.mockRestore();
  });

  it('prints summary, all populated sections, and verbose file details in order', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    reportBoundaries(createReport(), { verbose: true });

    expect(log.mock.calls.map(call => call[0])).toEqual([
      '',
      'Boundaries for packages/extension',
      '━'.repeat(72),
      'Files: 3',
      'Layer violations: 1',
      'Dead surfaces: 1',
      'Dead ends: 1',
      '',
      'Layer violations:',
      '- packages/extension/src/core/bad.ts [core] -> packages/extension/src/webview/view.ts [webview]: core cannot depend on webview',
      '',
      'Dead surfaces:',
      '- packages/extension/src/shared/orphan.ts [shared] (in: 0, out: 1)',
      '',
      'Dead ends:',
      '- packages/extension/src/shared/isolated.ts [shared] (in: 0, out: 0)',
      '',
      'All analyzed files:',
      '- packages/extension/src/core/index.ts [core] (in: 4, out: 2)',
      '- packages/extension/src/shared/orphan.ts [shared] (in: 0, out: 1)',
      '- packages/extension/src/shared/isolated.ts [shared] (in: 0, out: 0)',
    ]);

    log.mockRestore();
  });

  it('omits optional sections when there are no violations and verbose is off', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    reportBoundaries({
      deadEnds: [],
      deadSurfaces: [],
      files: [
        {
          absolutePath: '/repo/packages/extension/src/core/index.ts',
          entrypoint: true,
          incoming: 4,
          layer: 'core',
          outgoing: 2,
          relativePath: 'packages/extension/src/core/index.ts',
        },
      ],
      layerViolations: [],
      target: 'packages/extension',
    });

    expect(log.mock.calls.map(call => call[0])).toEqual([
      '',
      'Boundaries for packages/extension',
      '━'.repeat(72),
      'Files: 1',
      'Layer violations: 0',
      'Dead surfaces: 0',
      'Dead ends: 0',
      '',
    ]);

    log.mockRestore();
  });
});

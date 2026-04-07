import { describe, expect, it } from 'vitest';
import {
  formatBoundaryFile,
  formatBoundaryViolation,
  summaryLines
} from '../../src/boundaries/format';
import type { BoundaryReport } from '../../src/boundaries/types';

function createReport(): BoundaryReport {
  return {
    deadEnds: [],
    deadSurfaces: [],
    files: [
      {
        absolutePath: '/repo/packages/extension/src/shared/file.ts',
        entrypoint: false,
        incoming: 1,
        layer: 'shared',
        outgoing: 2,
        packageName: 'extension',
        packageRelativePath: 'src/shared/file.ts',
        relativePath: 'packages/extension/src/shared/file.ts'
      }
    ],
    layerViolations: [],
    target: 'packages/extension'
  };
}

describe('summaryLines', () => {
  it('renders the boundaries summary header', () => {
    expect(summaryLines(createReport())).toEqual([
      '',
      'Boundaries for packages/extension',
      '━'.repeat(72),
      'Files: 1',
      'Layer violations: 0',
      'Dead surfaces: 0',
      'Dead ends: 0',
      ''
    ]);
  });
});

describe('formatBoundaryFile', () => {
  it('includes the layer label when present', () => {
    expect(
      formatBoundaryFile({
        incoming: 1,
        layer: 'shared',
        outgoing: 2,
        relativePath: 'packages/extension/src/shared/file.ts'
      })
    ).toBe('- packages/extension/src/shared/file.ts [shared] (in: 1, out: 2)');
  });

  it('omits the layer label when absent', () => {
    expect(
      formatBoundaryFile({
        incoming: 0,
        outgoing: 0,
        relativePath: 'packages/extension/src/file.ts'
      })
    ).toBe('- packages/extension/src/file.ts (in: 0, out: 0)');
  });
});

describe('formatBoundaryViolation', () => {
  it('uses unclassified labels when a layer is missing', () => {
    expect(
      formatBoundaryViolation({
        from: 'packages/extension/src/a.ts',
        reason: 'rule',
        to: 'packages/extension/src/b.ts'
      })
    ).toBe('- packages/extension/src/a.ts [unclassified] -> packages/extension/src/b.ts [unclassified]: rule');
  });
});

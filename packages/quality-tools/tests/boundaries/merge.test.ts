import { describe, expect, it } from 'vitest';
import { mergeReports } from '../../src/boundaries/merge';
import type { BoundaryReport } from '../../src/boundaries/types';

describe('mergeReports', () => {
  it('concatenates files, dead ends, dead surfaces, and violations under the provided target', () => {
    const report = mergeReports('packages', [
      {
        deadEnds: [{ relativePath: 'packages/a/src/a.ts' } as never],
        deadSurfaces: [],
        files: [{ relativePath: 'packages/a/src/a.ts' } as never],
        layerViolations: [{ from: 'a', reason: 'rule', to: 'b' }],
        target: 'packages/a'
      },
      {
        deadEnds: [],
        deadSurfaces: [{ relativePath: 'packages/b/src/b.ts' } as never],
        files: [{ relativePath: 'packages/b/src/b.ts' } as never],
        layerViolations: [],
        target: 'packages/b'
      }
    ] satisfies BoundaryReport[]);

    expect(report).toMatchObject({
      deadEnds: [{ relativePath: 'packages/a/src/a.ts' }],
      deadSurfaces: [{ relativePath: 'packages/b/src/b.ts' }],
      files: [
        { relativePath: 'packages/a/src/a.ts' },
        { relativePath: 'packages/b/src/b.ts' }
      ],
      layerViolations: [{ from: 'a', reason: 'rule', to: 'b' }],
      target: 'packages'
    });
  });
});

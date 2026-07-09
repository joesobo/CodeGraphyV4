import { describe, expect, it } from 'vitest';
import { createExplorerComparisonTargets } from '../../../../src/extension/perf/explorer/targets';

describe('extension/perf/explorer/targets', () => {
  it('uses the same deterministic fixture mutations as CodeGraphy', () => {
    expect(createExplorerComparisonTargets()).toEqual({
      rename: {
        scenario: 'rename',
        mutation: {
          kind: 'rename',
          oldPath: 'src/group-00000/file-000004.ts',
          newPath: 'src/group-00000/file-000004.perf-renamed.ts',
        },
        observedPaths: [
          'src/group-00000/file-000004.ts',
          'src/group-00000/file-000004.perf-renamed.ts',
        ],
      },
      create: {
        scenario: 'create',
        mutation: {
          kind: 'create',
          filePath: 'src/group-00000/perf-created.ts',
        },
        observedPaths: ['src/group-00000/perf-created.ts'],
      },
      delete: {
        scenario: 'delete',
        mutation: {
          kind: 'delete',
          paths: ['src/group-00000/file-000003.ts'],
        },
        observedPaths: ['src/group-00000/file-000003.ts'],
      },
      revealPath: 'src/group-00000/file-000000.ts',
      neutralPath: 'src/group-00000/file-000001.ts',
    });
  });

  it('returns fresh mutation descriptors', () => {
    const first = createExplorerComparisonTargets();
    const second = createExplorerComparisonTargets();

    expect(first.rename).not.toBe(second.rename);
    expect(first.create).not.toBe(second.create);
    expect(first.delete).not.toBe(second.delete);
  });

  it('uses self workspace paths for mutations and reveal controls', () => {
    expect(createExplorerComparisonTargets('self')).toEqual({
      rename: {
        scenario: 'rename',
        mutation: {
          kind: 'rename',
          oldPath: 'perf/fixtures/paths.ts',
          newPath: 'perf/fixtures/paths.perf-renamed.ts',
        },
        observedPaths: [
          'perf/fixtures/paths.ts',
          'perf/fixtures/paths.perf-renamed.ts',
        ],
      },
      create: {
        scenario: 'create',
        mutation: {
          kind: 'create',
          filePath: 'perf/fixtures/perf-created.ts',
        },
        observedPaths: ['perf/fixtures/perf-created.ts'],
      },
      delete: {
        scenario: 'delete',
        mutation: {
          kind: 'delete',
          paths: ['perf/fixtures/generate.ts'],
        },
        observedPaths: ['perf/fixtures/generate.ts'],
      },
      neutralPath: 'perf/fixtures/generate.ts',
      revealPath: 'perf/fixtures/paths.ts',
    });
  });
});

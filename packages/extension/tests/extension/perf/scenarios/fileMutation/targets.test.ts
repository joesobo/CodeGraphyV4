import { describe, expect, it } from 'vitest';
import { createFileMutationTarget } from '../../../../../src/extension/perf/scenarios/fileMutation/targets';

describe('extension/perf/scenarios/fileMutation/targets', () => {
  it.each([
    ['rename', {
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
    }],
    ['create', {
      scenario: 'create',
      mutation: {
        kind: 'create',
        filePath: 'src/group-00000/perf-created.ts',
      },
      observedPaths: ['src/group-00000/perf-created.ts'],
    }],
    ['delete', {
      scenario: 'delete',
      mutation: {
        kind: 'delete',
        paths: ['src/group-00000/file-000003.ts'],
      },
      observedPaths: ['src/group-00000/file-000003.ts'],
    }],
  ] as const)('selects deterministic %s fixture paths', (scenario, expected) => {
    expect(createFileMutationTarget(scenario)).toEqual(expected);
  });

  it('returns fresh target collections', () => {
    const first = createFileMutationTarget('delete');
    const second = createFileMutationTarget('delete');

    expect(first).not.toBe(second);
    expect(first.observedPaths).not.toBe(second.observedPaths);
    expect(first.mutation).not.toBe(second.mutation);
  });
});

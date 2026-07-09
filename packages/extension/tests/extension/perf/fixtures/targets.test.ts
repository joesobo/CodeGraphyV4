import { describe, expect, it } from 'vitest';
import {
  createPerfFixtureTargets,
} from '../../../../src/extension/perf/fixtures/targets';

const generatedTargets = {
  createPath: 'src/group-00000/perf-created.ts',
  deletePath: 'src/group-00000/file-000003.ts',
  neutralPath: 'src/group-00000/file-000001.ts',
  renameSourcePath: 'src/group-00000/file-000004.ts',
  renameTargetPath: 'src/group-00000/file-000004.perf-renamed.ts',
  revealPath: 'src/group-00000/file-000000.ts',
  saveMarker: "\nimport './file-000001';\n",
  savePath: 'src/group-00000/file-000000.ts',
};

describe('extension/perf/fixtures/targets', () => {
  it.each(['small', 'medium', 'large', 'huge', 'giant'])(
    'keeps generated %s fixture targets unchanged',
    (dimension) => {
      expect(createPerfFixtureTargets(dimension)).toEqual(generatedTargets);
    },
  );

  it('selects existing repo files and a valid structural save marker for self', () => {
    expect(createPerfFixtureTargets('self')).toEqual({
      createPath: 'perf/fixtures/perf-created.ts',
      deletePath: 'perf/fixtures/generate.ts',
      neutralPath: 'perf/fixtures/generate.ts',
      renameSourcePath: 'perf/fixtures/paths.ts',
      renameTargetPath: 'perf/fixtures/paths.perf-renamed.ts',
      revealPath: 'perf/fixtures/paths.ts',
      saveMarker: "\nimport './generate';\n",
      savePath: 'perf/fixtures/paths.ts',
    });
  });

  it('returns a fresh target map', () => {
    expect(createPerfFixtureTargets('self'))
      .not.toBe(createPerfFixtureTargets('self'));
  });
});

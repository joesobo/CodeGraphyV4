export interface PerfFixtureTargets {
  createPath: string;
  deletePath: string;
  neutralPath: string;
  renameSourcePath: string;
  renameTargetPath: string;
  revealPath: string;
  saveMarker: string;
  savePath: string;
}

const generatedTargets: PerfFixtureTargets = {
  createPath: 'src/group-00000/perf-created.ts',
  deletePath: 'src/group-00000/file-000003.ts',
  neutralPath: 'src/group-00000/file-000001.ts',
  renameSourcePath: 'src/group-00000/file-000004.ts',
  renameTargetPath: 'src/group-00000/file-000004.perf-renamed.ts',
  revealPath: 'src/group-00000/file-000000.ts',
  saveMarker: "\nimport './file-000001';\n",
  savePath: 'src/group-00000/file-000000.ts',
};

const selfTargets: PerfFixtureTargets = {
  createPath: 'perf/fixtures/perf-created.ts',
  deletePath: 'perf/fixtures/generate.ts',
  neutralPath: 'perf/fixtures/generate.ts',
  renameSourcePath: 'perf/fixtures/paths.ts',
  renameTargetPath: 'perf/fixtures/paths.perf-renamed.ts',
  revealPath: 'perf/fixtures/paths.ts',
  saveMarker: "\nimport './generate';\n",
  savePath: 'perf/fixtures/paths.ts',
};

export function createPerfFixtureTargets(dimension: string): PerfFixtureTargets {
  return { ...(dimension === 'self' ? selfTargets : generatedTargets) };
}

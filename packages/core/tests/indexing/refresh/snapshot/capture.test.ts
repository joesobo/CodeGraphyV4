import { describe, expect, it, vi } from 'vitest';

import type { IWorkspaceFileAnalysisResult } from '../../../../src/analysis/fileAnalysis';
import type { IProjectedConnection } from '../../../../src/analysis/projectedConnection';
import {
  canPatchWorkspaceIndexRefreshGraphData,
  captureWorkspaceIndexRefreshGraphSnapshot,
} from '../../../../src/indexing/refresh/snapshot/capture';
import {
  createDiscoveredFile,
  createFileAnalysis,
  createSource,
} from '../fixture';

describe('indexing/refresh/snapshot/capture', () => {
  it('does not capture when metric patching is unavailable', () => {
    const source = createSource({
      _lastFileAnalysis: new Map([
        ['src/app.ts', createFileAnalysis('/workspace/src/app.ts')],
      ]),
    });

    expect(captureWorkspaceIndexRefreshGraphSnapshot(source, [
      createDiscoveredFile('src/app.ts'),
    ])).toBeUndefined();
  });

  it('does not capture when any requested file is missing previous analysis', () => {
    const source = createSource({
      _lastFileAnalysis: new Map([
        ['src/app.ts', createFileAnalysis('/workspace/src/app.ts')],
      ]),
      _patchGraphDataNodeMetrics: vi.fn(),
    });

    expect(captureWorkspaceIndexRefreshGraphSnapshot(source, [
      createDiscoveredFile('src/app.ts'),
      createDiscoveredFile('src/missing.ts'),
    ])).toBeUndefined();
  });

  it('cannot patch graph data without a captured snapshot', () => {
    expect(canPatchWorkspaceIndexRefreshGraphData(
      undefined,
      createAnalysisResult(['src/app.ts']),
      [createDiscoveredFile('src/app.ts')],
    )).toBe(false);
  });

  it('requires updated analysis for every captured file', () => {
    const files = [
      createDiscoveredFile('src/app.ts'),
      createDiscoveredFile('src/dep.ts'),
    ];
    const snapshot = captureWorkspaceIndexRefreshGraphSnapshot(
      createSnapshotSource(['src/app.ts', 'src/dep.ts']),
      files,
    );

    expect(canPatchWorkspaceIndexRefreshGraphData(
      snapshot,
      createAnalysisResult(['src/app.ts']),
      files,
    )).toBe(false);
  });

  it('does not patch graph data when file connections change', () => {
    const file = createDiscoveredFile('src/app.ts');
    const snapshot = captureWorkspaceIndexRefreshGraphSnapshot(
      createSnapshotSource(['src/app.ts'], new Map([
        ['src/app.ts', [createConnection('./dep', '/workspace/src/dep.ts')]],
      ])),
      [file],
    );

    expect(canPatchWorkspaceIndexRefreshGraphData(
      snapshot,
      createAnalysisResult(['src/app.ts'], new Map([
        ['src/app.ts', [createConnection('./next', '/workspace/src/next.ts')]],
      ])),
      [file],
    )).toBe(false);
  });

  it('patches graph data when captured analysis and connections still match', () => {
    const file = createDiscoveredFile('src/app.ts');
    const connections = new Map([
      ['src/app.ts', [createConnection('./dep', '/workspace/src/dep.ts')]],
    ]);
    const snapshot = captureWorkspaceIndexRefreshGraphSnapshot(
      createSnapshotSource(['src/app.ts'], connections),
      [file],
    );

    expect(canPatchWorkspaceIndexRefreshGraphData(
      snapshot,
      createAnalysisResult(['src/app.ts'], connections),
      [file],
    )).toBe(true);
  });
});

function createSnapshotSource(
  relativePaths: string[],
  fileConnections = new Map<string, IProjectedConnection[]>(),
) {
  return createSource({
    _lastFileAnalysis: new Map(relativePaths.map(relativePath => [
      relativePath,
      createFileAnalysis(`/workspace/${relativePath}`),
    ])),
    _lastFileConnections: fileConnections,
    _patchGraphDataNodeMetrics: vi.fn(),
  });
}

function createAnalysisResult(
  relativePaths: string[],
  fileConnections = new Map<string, IProjectedConnection[]>(),
): IWorkspaceFileAnalysisResult {
  return {
    cacheHits: 0,
    cacheMisses: relativePaths.length,
    fileAnalysis: new Map(relativePaths.map(relativePath => [
      relativePath,
      createFileAnalysis(`/workspace/${relativePath}`),
    ])),
    fileConnections,
  };
}

function createConnection(
  specifier: string,
  resolvedPath: string,
): IProjectedConnection {
  return {
    kind: 'import',
    resolvedPath,
    sourceId: 'import',
    specifier,
  };
}

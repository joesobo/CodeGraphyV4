import { describe, expect, it } from 'vitest';

import type { IWorkspaceFileAnalysisResult } from '../../../src/analysis/fileAnalysis';
import type { IProjectedConnection } from '../../../src/analysis/projectedConnection';
import {
  applyWorkspaceIndexAnalysisResult,
  retainWorkspaceIndexDiscoveredFileConnections,
  updateWorkspaceIndexDiscoveryState,
} from '../../../src/indexing/refresh/state';
import {
  createDiscoveredFile,
  createFileAnalysis,
  createSource,
} from './fixture';

describe('indexing/refresh/state', () => {
  it('applies analysis and connection results to the refresh source', () => {
    const source = createSource();
    const connection = createConnection('./dep');
    const analysisResult: IWorkspaceFileAnalysisResult = {
      cacheHits: 0,
      cacheMisses: 1,
      fileAnalysis: new Map([
        ['src/app.ts', createFileAnalysis('/workspace/src/app.ts')],
      ]),
      fileConnections: new Map([
        ['src/app.ts', [connection]],
      ]),
    };

    applyWorkspaceIndexAnalysisResult(source, analysisResult);

    expect(source._lastFileAnalysis.get('src/app.ts')).toEqual(
      createFileAnalysis('/workspace/src/app.ts'),
    );
    expect(source._lastFileConnections.get('src/app.ts')).toEqual([connection]);
  });

  it('updates discovery state and defaults missing directories to an empty list', () => {
    const source = createSource();
    const discoveredFiles = [createDiscoveredFile('src/app.ts')];

    updateWorkspaceIndexDiscoveryState(source, {
      discoveredDirectories: undefined,
      discoveredFiles,
      workspaceRoot: '/workspace-next',
    });

    expect(source._lastDiscoveredDirectories).toEqual([]);
    expect(source._lastDiscoveredFiles).toEqual(discoveredFiles);
    expect(source._lastDiscoveredFiles).not.toBe(discoveredFiles);
    expect(source._lastWorkspaceRoot).toBe('/workspace-next');
  });

  it('retains existing file connections and initializes missing discovered files', () => {
    const source = createSource({
      _lastFileConnections: new Map([
        ['src/app.ts', [createConnection('./dep')]],
      ]),
    });

    retainWorkspaceIndexDiscoveredFileConnections(source, [
      createDiscoveredFile('src/app.ts'),
      createDiscoveredFile('src/missing.ts'),
    ]);

    expect(source._lastFileConnections.get('src/app.ts')).toEqual([
      createConnection('./dep'),
    ]);
    expect(source._lastFileConnections.get('src/missing.ts')).toEqual([]);
  });
});

function createConnection(specifier: string): IProjectedConnection {
  return {
    kind: 'import',
    resolvedPath: `/workspace/src/${specifier.slice(2)}.ts`,
    sourceId: 'import',
    specifier,
  };
}

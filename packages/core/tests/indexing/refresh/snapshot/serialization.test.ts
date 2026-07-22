import { describe, expect, it } from 'vitest';

import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../../../../src/analysis/projectedConnection';
import {
  serializeWorkspaceIndexConnections,
  serializeWorkspaceIndexGraphAnalysis,
} from '../../../../src/indexing/refresh/snapshot/serialization';

describe('indexing/refresh/snapshot/serialization', () => {
  it('serializes missing analysis collections as empty lists', () => {
    expect(serializeWorkspaceIndexGraphAnalysis({
      filePath: '/workspace/src/app.ts',
    })).toBe(JSON.stringify({
      edgeTypes: [],
      filePath: '/workspace/src/app.ts',
      nodeTypes: [],
      nodes: [],
      relations: [],
      symbols: [],
    }));
  });

  it('preserves non-empty analysis collections', () => {
    const analysis: IFileAnalysisResult = {
      filePath: '/workspace/src/app.ts',
      edgeTypes: [{
        id: 'import',
        label: 'Import',
        defaultVisible: true,
      }],
      nodeTypes: [{
        id: 'file',
        label: 'File',
        defaultVisible: true,
      }],
      nodes: [{
        id: 'src/app.ts#App',
        nodeType: 'symbol',
        label: 'App',
        filePath: '/workspace/src/app.ts',
      }],
      relations: [{
        kind: 'import',
        sourceId: 'import',
        fromFilePath: '/workspace/src/app.ts',
        toFilePath: '/workspace/src/dep.ts',
      }],
      symbols: [{
        id: 'src/app.ts#App',
        name: 'App',
        kind: 'class',
        filePath: '/workspace/src/app.ts',
      }],
    };

    expect(JSON.parse(serializeWorkspaceIndexGraphAnalysis(analysis))).toEqual(analysis);
  });

  it('serializes missing connections as an empty list', () => {
    expect(serializeWorkspaceIndexConnections(undefined)).toBe('[]');
  });

  it('preserves non-empty connections', () => {
    const connections: IProjectedConnection[] = [{
      kind: 'import',
      resolvedPath: '/workspace/src/dep.ts',
      sourceId: 'import',
      specifier: './dep',
    }];

    expect(JSON.parse(serializeWorkspaceIndexConnections(connections))).toEqual(connections);
  });
});

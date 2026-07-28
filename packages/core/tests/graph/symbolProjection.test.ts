import { describe, expect, it } from 'vitest';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { projectFileAnalysisConnections } from '../../src/graph/symbolProjection';

const reexportAnalysis: IFileAnalysisResult = {
  filePath: '/workspace/src/index.ts',
  symbols: [],
  relations: [{
    kind: 'reexport',
    sourceId: 'core:treesitter:reexport',
    fromFilePath: '/workspace/src/index.ts',
    fromSymbolId: '/workspace/src/index.ts#Model:alias',
    toFilePath: '/workspace/src/model.ts',
    toSymbolId: '/workspace/src/model.ts#Model:class',
    specifier: './model',
    metadata: { reexport: true },
  }],
};

describe('File analysis connection projection', () => {
  it('projects reexports as imports when Symbol endpoints project to Files', () => {
    const connections = projectFileAnalysisConnections(
      new Map([[reexportAnalysis.filePath, reexportAnalysis]]),
      '/workspace',
    );

    expect(connections.get('src/index.ts')).toEqual([
      expect.objectContaining({
        kind: 'import',
        resolvedPath: '/workspace/src/model.ts',
        metadata: { reexport: true },
      }),
    ]);
  });

  it('omits reexport File projection when Symbol endpoints remain explicit', () => {
    const connections = projectFileAnalysisConnections(
      new Map([[reexportAnalysis.filePath, reexportAnalysis]]),
      '/workspace',
      { includeSymbolEndpointRelations: false },
    );

    expect(connections.get('src/index.ts')).toEqual([]);
  });
});

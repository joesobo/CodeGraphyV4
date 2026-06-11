import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { describe, expect, it } from 'vitest';
import {
  buildSymbolNodesAndEdges,
  projectFileAnalysisConnections,
} from '../../src/graph/symbols';

function analysis(overrides: Partial<IFileAnalysisResult>): IFileAnalysisResult {
  return {
    filePath: '/workspace/src/app.ts',
    relations: [],
    symbols: [],
    ...overrides,
  };
}

function namespaceSymbol(filePath: string, name: string) {
  return {
    id: `${filePath}:namespace:${name}`,
    filePath,
    kind: 'namespace',
    name,
  };
}

describe('core/graph/symbols', () => {
  it('can omit symbol endpoint relations from projected file connections', () => {
    const fileAnalysis = new Map([
      ['/workspace/src/app.ts', analysis({
        relations: [
          {
            kind: 'import',
            sourceId: 'import',
            fromFilePath: '/workspace/src/app.ts',
            specifier: './dep',
            resolvedPath: '/workspace/src/dep.ts',
            toFilePath: '/workspace/src/dep.ts',
          },
          {
            kind: 'call',
            sourceId: 'call',
            fromFilePath: '/workspace/src/app.ts',
            fromSymbolId: 'app:run',
            specifier: 'run',
            toFilePath: '/workspace/src/app.ts',
            toSymbolId: 'app:helper',
          },
        ],
      })],
      ['/workspace/src/empty.ts', analysis({ relations: undefined })],
    ]);

    expect(projectFileAnalysisConnections(fileAnalysis, '/workspace', {
      includeSymbolEndpointRelations: false,
    })).toEqual(new Map([
      ['src/app.ts', [
        expect.objectContaining({ kind: 'import', specifier: './dep' }),
      ]],
      ['src/empty.ts', []],
    ]));
    expect(projectFileAnalysisConnections(fileAnalysis, '/workspace').get('src/app.ts'))
      ?.toHaveLength(2);
  });

  it('projects single namespaces and ignores files without symbols', () => {
    const result = buildSymbolNodesAndEdges(new Map([
      ['/workspace/src/app.ts', analysis({
        symbols: [namespaceSymbol('/workspace/src/app.ts', 'app')],
        relations: undefined,
      })],
      ['/workspace/src/empty.ts', analysis({
        filePath: '/workspace/src/empty.ts',
        symbols: undefined,
        relations: undefined,
      })],
    ]), '/workspace');

    expect(result.containingFileIds).toEqual(new Set(['src/app.ts']));
    expect(result.nodes).toEqual([
      expect.objectContaining({
        id: 'src/app.ts#app:namespace',
        symbol: expect.objectContaining({ name: 'app', kind: 'namespace' }),
      }),
    ]);
    expect(result.edges).toEqual([
      expect.objectContaining({
        from: 'src/app.ts',
        to: 'src/app.ts#app:namespace',
        kind: 'contains',
      }),
    ]);
  });

  it('prefers header namespace declarations across supported header extensions', () => {
    const fileAnalysis = new Map<string, IFileAnalysisResult>();
    for (const extension of ['.h', '.hh', '.hpp', '.hxx']) {
      const name = `ns${extension.slice(1)}`;
      const headerPath = `/workspace/include/${name}${extension}`;
      const sourcePath = `/workspace/src/${name}.cpp`;
      fileAnalysis.set(headerPath, analysis({
        filePath: headerPath,
        symbols: [namespaceSymbol(headerPath, name)],
      }));
      fileAnalysis.set(sourcePath, analysis({
        filePath: sourcePath,
        symbols: [namespaceSymbol(sourcePath, name)],
        relations: [{ kind: 'include', sourceId: 'include', fromFilePath: sourcePath, resolvedPath: headerPath, toFilePath: headerPath }],
      }));
    }

    const result = buildSymbolNodesAndEdges(fileAnalysis, '/workspace');
    expect(result.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'include/nsh.h#nsh:namespace',
      'include/nshh.hh#nshh:namespace',
      'include/nshpp.hpp#nshpp:namespace',
      'include/nshxx.hxx#nshxx:namespace',
    ]));
    expect(result.nodes.map((node) => node.id)).not.toEqual(expect.arrayContaining([
      'src/nsh.cpp#nsh:namespace',
      'src/nshh.cpp#nshh:namespace',
      'src/nshpp.cpp#nshpp:namespace',
      'src/nshxx.cpp#nshxx:namespace',
    ]));
  });
});

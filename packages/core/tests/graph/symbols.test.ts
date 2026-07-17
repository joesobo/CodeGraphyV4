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

function graphSymbol(filePath: string, kind: string, name: string) {
  return {
    id: `${filePath}:${kind}:${name}`,
    filePath,
    kind,
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
            toFilePath: '/workspace/src/dep.ts',
            toSymbolId: 'dep:helper',
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

  it('does not let non-namespace symbols affect namespace projection', () => {
    const namespacePath = '/workspace/src/namespace.cpp';
    const shorterClassPath = '/workspace/a.cpp';
    const result = buildSymbolNodesAndEdges(new Map([
      [namespacePath, analysis({
        filePath: namespacePath,
        symbols: [namespaceSymbol(namespacePath, 'Shared')],
      })],
      [shorterClassPath, analysis({
        filePath: shorterClassPath,
        symbols: [graphSymbol(shorterClassPath, 'class', 'Shared')],
      })],
    ]), '/workspace');

    expect(result.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'src/namespace.cpp#Shared:namespace',
      'a.cpp#Shared:class',
    ]));
  });

  it('uses the shortest file path as the deterministic namespace tie breaker', () => {
    const shorterPath = '/workspace/a.cpp';
    const longerPath = '/workspace/src/much/longer/path.cpp';
    const result = buildSymbolNodesAndEdges(new Map([
      [longerPath, analysis({
        filePath: longerPath,
        symbols: [namespaceSymbol(longerPath, 'Shared')],
      })],
      [shorterPath, analysis({
        filePath: shorterPath,
        symbols: [namespaceSymbol(shorterPath, 'Shared')],
      })],
    ]), '/workspace');

    expect(result.nodes.map((node) => node.id)).toEqual([
      'a.cpp#Shared:namespace',
    ]);
  });

  it('counts only include relations when choosing between duplicate namespaces', () => {
    const shorterPath = '/workspace/a.cpp';
    const includedPath = '/workspace/src/longer.cpp';
    const result = buildSymbolNodesAndEdges(new Map([
      [shorterPath, analysis({
        filePath: shorterPath,
        symbols: [namespaceSymbol(shorterPath, 'Shared')],
      })],
      [includedPath, analysis({
        filePath: includedPath,
        relations: undefined,
        symbols: [namespaceSymbol(includedPath, 'Shared')],
      })],
      ['/workspace/src/importer.cpp', analysis({
        filePath: '/workspace/src/importer.cpp',
        relations: [
          { kind: 'import', sourceId: 'import', fromFilePath: '/workspace/src/importer.cpp', resolvedPath: shorterPath, toFilePath: shorterPath },
          { kind: 'include', sourceId: 'include', fromFilePath: '/workspace/src/importer.cpp', resolvedPath: includedPath, toFilePath: null },
        ],
      })],
    ]), '/workspace');

    expect(result.nodes.map((node) => node.id)).toEqual([
      'src/longer.cpp#Shared:namespace',
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

  it('uses header extension priority before incoming include counts', () => {
    for (const extension of ['.h', '.hh', '.hpp', '.hxx']) {
      const headerPath = `/workspace/include/shared${extension}`;
      const sourcePath = `/workspace/src/shared${extension}.cpp`;
      const result = buildSymbolNodesAndEdges(new Map([
        [headerPath, analysis({
          filePath: headerPath,
          symbols: [namespaceSymbol(headerPath, extension)],
        })],
        [sourcePath, analysis({
          filePath: sourcePath,
          symbols: [namespaceSymbol(sourcePath, extension)],
        })],
        [`/workspace/src/importer${extension}.cpp`, analysis({
          filePath: `/workspace/src/importer${extension}.cpp`,
          relations: [{ kind: 'include', sourceId: 'include', fromFilePath: `/workspace/src/importer${extension}.cpp`, resolvedPath: sourcePath, toFilePath: sourcePath }],
          symbols: undefined,
        })],
      ]), '/workspace');

      expect(result.nodes.map((node) => node.id)).toEqual([
        `include/shared${extension}#${extension}:namespace`,
      ]);
    }
  });
});

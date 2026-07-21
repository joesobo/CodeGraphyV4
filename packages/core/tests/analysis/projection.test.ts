import { describe, expect, it } from 'vitest';
import {
  projectConnectionMapFromFileAnalysis,
  projectProjectedConnectionsFromFileAnalysis,
} from '../../src/analysis/projection';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';

describe('analysis/projection', () => {
  it('projects file analysis relations into projected connections with normalized defaults', () => {
    const analysis: IFileAnalysisResult = {
      filePath: '/workspace/src/app.ts',
      symbols: [],
      relations: [
        {
          kind: 'import',
          fromFilePath: '/workspace/src/app.ts',
          pluginId: 'plugin-a',
          sourceId: 'source-a',
          specifier: 'react',
          resolvedPath: '/workspace/node_modules/react/index.js',
          type: 'value',
          variant: 'default',
          metadata: { package: 'react' },
        },
        {
          kind: 'reference',
          fromFilePath: '/workspace/src/app.ts',
          pluginId: 'plugin-b',
          sourceId: 'source-b',
          toFilePath: '/workspace/src/lib.ts',
        },
      ],
    };

    expect(projectProjectedConnectionsFromFileAnalysis(analysis)).toEqual([
      {
        kind: 'import',
        pluginId: 'plugin-a',
        sourceId: 'source-a',
        specifier: 'react',
        resolvedPath: '/workspace/node_modules/react/index.js',
        type: 'value',
        variant: 'default',
        metadata: { package: 'react' },
      },
      {
        kind: 'reference',
        pluginId: 'plugin-b',
        sourceId: 'source-b',
        specifier: '',
        resolvedPath: '/workspace/src/lib.ts',
        type: undefined,
        variant: undefined,
        metadata: undefined,
      },
    ]);
  });

  it('returns an empty projected connection list when a file analysis has no relations', () => {
    expect(projectProjectedConnectionsFromFileAnalysis({
      filePath: '/workspace/src/app.ts',
      symbols: [],
      relations: undefined,
    })).toEqual([]);
  });

  it('preserves same-file symbol calls but omits symbol containment connections', () => {
    expect(projectProjectedConnectionsFromFileAnalysis({
      filePath: '/workspace/src/app.py',
      symbols: [],
      relations: [
        {
          kind: 'call',
          sourceId: 'core:treesitter:call',
          fromFilePath: '/workspace/src/app.py',
          fromSymbolId: '/workspace/src/app.py:function:main',
          toFilePath: '/workspace/src/app.py',
          toSymbolId: '/workspace/src/app.py:function:helper',
        },
        {
          kind: 'call',
          sourceId: 'plugin:file-call',
          fromFilePath: '/workspace/src/app.py',
          toFilePath: '/workspace/src/app.py',
        },
        {
          kind: 'contains',
          sourceId: 'core:treesitter:contains',
          fromFilePath: '/workspace/src/app.py',
          fromSymbolId: '/workspace/src/app.py:class:App',
          toFilePath: '/workspace/src/app.py',
          toSymbolId: '/workspace/src/app.py:function:main',
        },
      ],
    })).toEqual([
      expect.objectContaining({
        kind: 'call',
        sourceId: 'core:treesitter:call',
        resolvedPath: '/workspace/src/app.py',
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'plugin:file-call',
        resolvedPath: '/workspace/src/app.py',
      }),
    ]);
  });

  it('projects a file analysis map entry by entry', () => {
    const firstAnalysis: IFileAnalysisResult = {
      filePath: '/workspace/src/app.ts',
      symbols: [],
      relations: [{
        kind: 'import',
        fromFilePath: '/workspace/src/app.ts',
        pluginId: 'plugin-a',
        sourceId: 'source-a',
      }],
    };
    const secondAnalysis: IFileAnalysisResult = {
      filePath: '/workspace/src/lib.ts',
      symbols: [],
      relations: undefined,
    };

    expect(projectConnectionMapFromFileAnalysis(new Map([
      ['/workspace/src/app.ts', firstAnalysis],
      ['/workspace/src/lib.ts', secondAnalysis],
    ]))).toEqual(new Map([
      ['/workspace/src/app.ts', [
        {
          kind: 'import',
          pluginId: 'plugin-a',
          sourceId: 'source-a',
          specifier: '',
          resolvedPath: null,
          type: undefined,
          variant: undefined,
          metadata: undefined,
        },
      ]],
      ['/workspace/src/lib.ts', []],
    ]));
  });
});

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
          edgeType: 'import',
          from: { kind: 'file', filePath: '/workspace/src/app.ts' },
          pluginId: 'plugin-a',
          sourceId: 'source-a',
          specifier: 'react',
          target: { kind: 'file', path: '/workspace/node_modules/react/index.js', pathKind: 'absolute', specifier: 'react' },
          timing: 'value',
          variant: 'default',
          metadata: { package: 'react' },
        },
        {
          edgeType: 'reference',
          from: { kind: 'file', filePath: '/workspace/src/app.ts' },
          pluginId: 'plugin-b',
          sourceId: 'source-b',
          target: { kind: 'file', path: '/workspace/src/lib.ts', pathKind: 'absolute' },
        },
      ],
    };

    expect(projectProjectedConnectionsFromFileAnalysis(analysis, '/workspace')).toEqual([
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
    }, '/workspace')).toEqual([]);
  });

  it('projects a file analysis map entry by entry', () => {
    const firstAnalysis: IFileAnalysisResult = {
      filePath: '/workspace/src/app.ts',
      symbols: [],
      relations: [{
        edgeType: 'import',
        from: { kind: 'file', filePath: '/workspace/src/app.ts' },
        pluginId: 'plugin-a',
        sourceId: 'source-a',
        target: { kind: 'unresolved', specifier: '' },
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
    ]), '/workspace')).toEqual(new Map([
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

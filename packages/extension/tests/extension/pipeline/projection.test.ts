import { describe, expect, it } from 'vitest';
import {
  projectConnectionMapFromFileAnalysis,
  projectProjectedConnectionsFromFileAnalysis,
} from '../../../src/extension/pipeline/projection';
import type { IFileAnalysisResult } from '../../../src/core/plugins/types/contracts';

describe('extension/pipeline/projection', () => {
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

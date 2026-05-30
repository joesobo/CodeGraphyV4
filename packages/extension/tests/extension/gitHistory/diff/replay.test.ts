import { describe, expect, it, vi } from 'vitest';
import { analyzeDiffCommitGraph } from '../../../../src/extension/gitHistory/diff/analysis';
import { resolveTreeSitterImportPath } from '@codegraphy-dev/core';
import type { IAnalysisRelationshipEvidence } from '../../../../src/core/plugins/types/contracts';

function importRelation(fromFilePath: string, targetPath: string): IAnalysisRelationshipEvidence {
  return {
    edgeType: 'import',
    pluginId: 'ts',
    sourceId: 'import',
    specifier: './b',
    timing: 'static',
    from: { kind: 'file', filePath: fromFilePath },
    target: { kind: 'file', path: targetPath, pathKind: 'absolute', specifier: './b' },
  };
}

describe('gitHistory/diff/replay', () => {
  it('allows files added in the same commit to connect even when the importer is processed first', async () => {
    const result = await analyzeDiffCommitGraph({
      diffOutput: [
        'A\tsrc/a.ts',
        'A\tsrc/b.ts',
      ].join('\n'),
      commitFiles: ['src/a.ts', 'src/b.ts'],
      getFileAtCommit: vi.fn(async (_sha: string, filePath: string) => {
        if (filePath === 'src/a.ts') {
          return 'import "./b";';
        }

        return 'export const b = 1;';
      }),
      previousGraph: { nodes: [], edges: [] },
      registry: {
        notifyPreAnalyze: vi.fn(async () => {}),
        analyzeFileResult: vi.fn(async (absolutePath: string) => {
          if (!absolutePath.endsWith('a.ts')) {
            return { filePath: absolutePath, relations: [] };
          }

          const resolvedPath = resolveTreeSitterImportPath(absolutePath, './b');
          return {
            filePath: absolutePath,
            relations: resolvedPath ? [importRelation(absolutePath, resolvedPath)] : [],
          };
        }),
        supportsFile: vi.fn(() => true),
      },
      sha: 'sha2',
      shouldExclude: () => false,
      signal: new AbortController().signal,
      workspaceRoot: '/virtual/workspace',
    });

    expect(result.nodes.map((node) => node.id)).toEqual(['src/a.ts', 'src/b.ts']);
    expect(result.edges).toEqual([
      {
        id: 'src/a.ts->src/b.ts#import:static',
        from: 'src/a.ts',
        to: 'src/b.ts',
        kind: 'import',
        sources: [
          {
            id: 'ts:import',
            pluginId: 'ts',
            sourceId: 'import',
            label: 'import',
          },
        ],
      },
    ]);
  });
});

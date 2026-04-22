import { describe, expect, it, vi } from 'vitest';
import { analyzeDiffCommitGraph } from '../../../../src/extension/gitHistory/diff/analysis';
import { resolveTreeSitterImportPath } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/resolve';

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
        analyzeFileResult: vi.fn(async (absolutePath: string) => {
          if (!absolutePath.endsWith('a.ts')) {
            return { filePath: absolutePath, relations: [] };
          }

          const resolvedPath = resolveTreeSitterImportPath(absolutePath, './b');
          return {
            filePath: absolutePath,
            relations: resolvedPath
              ? [{
                  sourceId: 'import',
                  specifier: './b',
                  type: 'static' as const,
                  resolvedPath,
                  kind: 'import' as const,
                  pluginId: 'ts',
                  fromFilePath: absolutePath,
                }]
              : [],
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

import { describe, expect, it, vi } from 'vitest';
import {
  analyzeFullCommitGraph,
  createGitHistoryNode,
} from '../../../src/extension/gitHistory/fullCommitAnalysis';

describe('gitHistory/fullCommitAnalysis', () => {
  it('creates graph nodes from workspace-relative file paths', () => {
    expect(createGitHistoryNode('src/utils/example.ts')).toEqual({
      id: 'src/utils/example.ts',
      label: 'example.ts',
      color: '#93C5FD',
    });
  });

  it('filters excluded and unsupported files, adds plugin source provenance, and drops dangling edges', async () => {
    const getFileAtCommit = vi.fn(async (_sha: string, filePath: string) => {
      if (filePath === 'src/a.ts') {
        return 'import "./b"; import "./missing";';
      }

      return 'export const value = 1;';
    });
    const registry = {
      analyzeFile: vi.fn(async (absolutePath: string) => {
        if (absolutePath.endsWith('a.ts')) {
          return [
            {
              resolvedPath: '/workspace/src/b.ts',
              sourceId: 'import',
              specifier: './b',
              type: 'static' as const,
              kind: 'import' as const,
            },
            {
              resolvedPath: '/workspace/src/missing.ts',
              specifier: './missing',
              type: 'static' as const,
              sourceId: 'import',
              kind: 'import' as const,
            },
          ];
        }

        return [];
      }),
      getPluginForFile: vi.fn(() => ({ id: 'ts' })),
    };

    const result = await analyzeFullCommitGraph({
      allFiles: ['src/a.ts', 'src/b.ts', 'src/skip.js', 'assets/logo.ts'],
      getFileAtCommit,
      registry,
      sha: 'abc123',
      shouldExclude: (filePath) => filePath.startsWith('assets/'),
      signal: new AbortController().signal,
      supportedExtensions: new Set(['.ts']),
      workspaceRoot: '/workspace',
    });

    expect(result.nodes.map((node) => node.id)).toEqual(['src/a.ts', 'src/b.ts']);
    expect(result.edges).toEqual([
      {
        id: 'src/a.ts->src/b.ts#import',
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
    expect(getFileAtCommit).toHaveBeenCalledTimes(2);
    expect(registry.analyzeFile).toHaveBeenCalledTimes(2);
  });

  it('throws an abort error when the signal is aborted during the analysis loop', async () => {
    const controller = new AbortController();
    const getFileAtCommit = vi.fn(async () => {
      controller.abort();
      return '';
    });

    await expect(
      analyzeFullCommitGraph({
        allFiles: ['src/a.ts', 'src/b.ts'],
        getFileAtCommit,
        registry: {
          analyzeFile: vi.fn(async () => []),
        },
        sha: 'abc123',
        shouldExclude: () => false,
        signal: controller.signal,
        supportedExtensions: new Set(['.ts']),
        workspaceRoot: '/workspace',
      })
    ).rejects.toMatchObject({ name: 'AbortError', message: 'Indexing aborted' });
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  analyzeFullCommitGraph,
  createGitHistoryNode,
} from '../../../src/extension/gitHistory/fullCommitAnalysis';
import { resolveTreeSitterImportPath } from '@codegraphy-dev/core';
import type { IAnalysisRelationshipEvidence } from '../../../src/core/plugins/types/contracts';

function importRelation(
  fromFilePath: string,
  targetPath: string,
  specifier: string,
): IAnalysisRelationshipEvidence {
  return {
    edgeType: 'import',
    pluginId: 'ts',
    sourceId: 'import',
    specifier,
    timing: 'static',
    from: { kind: 'file', filePath: fromFilePath },
    target: { kind: 'file', path: targetPath, pathKind: 'absolute', specifier },
  };
}

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
      notifyPreAnalyze: vi.fn(async () => {}),
      analyzeFileResult: vi.fn(async (absolutePath: string) => {
        if (absolutePath.endsWith('a.ts')) {
          return {
            filePath: absolutePath,
            relations: [
              importRelation(absolutePath, '/workspace/src/b.ts', './b'),
              importRelation(absolutePath, '/workspace/src/missing.ts', './missing'),
            ],
          };
        }

        return { filePath: absolutePath, relations: [] };
      }),
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
    expect(registry.notifyPreAnalyze).toHaveBeenCalledWith(
      [
        {
          absolutePath: '/workspace/src/a.ts',
          relativePath: 'src/a.ts',
          content: 'import "./b"; import "./missing";',
        },
        {
          absolutePath: '/workspace/src/b.ts',
          relativePath: 'src/b.ts',
          content: 'export const value = 1;',
        },
        {
          absolutePath: '/workspace/src/skip.js',
          relativePath: 'src/skip.js',
          content: 'export const value = 1;',
        },
      ],
      '/workspace',
      expect.objectContaining({ mode: 'timeline', commitSha: 'abc123' }),
    );
    expect(getFileAtCommit).toHaveBeenCalledTimes(5);
    expect(registry.analyzeFileResult).toHaveBeenCalledTimes(2);
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
          notifyPreAnalyze: vi.fn(async () => {}),
          analyzeFileResult: vi.fn(async (absolutePath: string) => ({ filePath: absolutePath, relations: [] })),
        },
        sha: 'abc123',
        shouldExclude: () => false,
        signal: controller.signal,
        supportedExtensions: new Set(['.ts']),
        workspaceRoot: '/workspace',
      })
    ).rejects.toMatchObject({ name: 'AbortError', message: 'Indexing aborted' });
  });

  it('resolves relative imports against the analyzed commit tree instead of the live workspace', async () => {
    const getFileAtCommit = vi.fn(async (_sha: string, filePath: string) => {
      if (filePath === 'src/a.ts') {
        return 'import "./b";';
      }

      return 'export const b = 1;';
    });
    const registry = {
      notifyPreAnalyze: vi.fn(async () => {}),
      analyzeFileResult: vi.fn(async (absolutePath: string) => {
        if (!absolutePath.endsWith('a.ts')) {
          return { filePath: absolutePath, relations: [] };
        }

        const resolvedPath = resolveTreeSitterImportPath(absolutePath, './b');
        return {
          filePath: absolutePath,
          relations: resolvedPath
            ? [importRelation(absolutePath, resolvedPath, './b')]
            : [],
        };
      }),
    };

    const result = await analyzeFullCommitGraph({
      allFiles: ['src/a.ts', 'src/b.ts'],
      getFileAtCommit,
      registry,
      sha: 'abc123',
      shouldExclude: () => false,
      signal: new AbortController().signal,
      supportedExtensions: new Set(['.ts']),
      workspaceRoot: '/virtual/workspace',
    });

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

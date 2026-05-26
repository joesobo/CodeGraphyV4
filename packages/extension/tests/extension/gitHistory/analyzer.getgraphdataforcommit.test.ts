import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IFileAnalysisResult } from '../../../src/core/plugins/types/contracts';
import type { IGraphData } from '../../../src/shared/graph/contracts';

// Mock vscode module
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  },
  Uri: {
    joinPath: vi.fn((...args: unknown[]) => {
      const parts = args.map((arg) => String((arg as { fsPath?: string }).fsPath ?? arg));
      return { fsPath: parts.join('/') };
    }),
    file: vi.fn((filePath: string) => ({ fsPath: filePath, scheme: 'file' })),
  },
}));

// Mock child_process — vi.hoisted ensures the variable is available when vi.mock runs (hoisted)
const { mockExecFile } = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
}));
vi.mock('child_process', () => ({
  default: { execFile: mockExecFile },
  execFile: mockExecFile,
}));

// Mock fs
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      mkdir: vi.fn(),
      writeFile: vi.fn(),
      readFile: vi.fn(),
      rm: vi.fn(),
      access: vi.fn(),
    },
  };
});

import * as fs from 'fs';
import type { PluginRegistry } from '../../../src/core/plugins/registry/manager';
import { GitHistoryAnalyzer } from '../../../src/extension/gitHistory/analyzer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock ExtensionContext with workspaceState and storageUri.
 */
function createMockContext() {
  const stateStore = new Map<string, unknown>();
  return {
    storageUri: { fsPath: '/tmp/test-storage' },
    workspaceState: {
      get: vi.fn(<T>(key: string): T | undefined => stateStore.get(key) as T | undefined),
      update: vi.fn((key: string, value: unknown) => {
        if (value === undefined) {
          stateStore.delete(key);
        } else {
          stateStore.set(key, value);
        }
        return Promise.resolve();
      }),
    },
    // Expose the raw store so tests can inspect it
    _stateStore: stateStore,
  };
}

/**
 * Creates a mock PluginRegistry.
 */
function createMockRegistry() {
  return {
    notifyPreAnalyze: vi.fn(async () => {}),
    analyzeFileResult: vi.fn(async (absolutePath: string): Promise<IFileAnalysisResult> => ({
      filePath: absolutePath,
      relations: [],
    })),
    supportsFile: vi.fn().mockReturnValue(true),
    getSupportedExtensions: vi.fn().mockReturnValue(['.ts', '.js']),
    list: vi.fn().mockReturnValue([
      {
        plugin: {
          id: 'test.plugin',
          version: '1.0.0',
        },
      },
    ]),
  } as unknown as PluginRegistry & {
    notifyPreAnalyze: Mock;
    analyzeFileResult: Mock;
    supportsFile: Mock;
    getSupportedExtensions: Mock;
    list: Mock;
  };
}

describe('GitHistoryAnalyzer', () => {

    let context: ReturnType<typeof createMockContext>;


    let registry: ReturnType<typeof createMockRegistry>;


    let analyzer: GitHistoryAnalyzer;


    const workspaceRoot = '/workspace';



    beforeEach(() => {
      vi.clearAllMocks();
      context = createMockContext();
      registry = createMockRegistry();
      analyzer = new GitHistoryAnalyzer(
        context as never,
        registry,
        workspaceRoot
      );
    });

  describe('getGraphDataForCommit', () => {

        it('should return cached graph data on cache hit', async () => {
          const cachedData: IGraphData = {
            nodes: [{ id: 'src/a.ts', label: 'a.ts', color: '#93C5FD' }],
            edges: [],
          };

          vi.mocked(fs.promises.access).mockResolvedValue(undefined);
          vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(cachedData));

          const result = await analyzer.getGraphDataForCommit('abc123');

          expect(result).toEqual(cachedData);
          expect(fs.promises.readFile).toHaveBeenCalledWith(
            expect.stringContaining('abc123.json'),
            'utf-8'
          );
        });



        it('should return empty graph data on cache miss', async () => {
          vi.mocked(fs.promises.access).mockRejectedValue(new Error('ENOENT'));

          const result = await analyzer.getGraphDataForCommit('nonexistent');

          expect(result).toEqual({ nodes: [], edges: [] });
        });



        it('should return empty graph data when storageUri is undefined', async () => {
          const ctxNoStorage = createMockContext();
          ctxNoStorage.storageUri = undefined as never;
          const analyzerNoStorage = new GitHistoryAnalyzer(ctxNoStorage as never, registry, workspaceRoot);

          const result = await analyzerNoStorage.getGraphDataForCommit('abc123');
          expect(result).toEqual({ nodes: [], edges: [] });
        });
  });
});

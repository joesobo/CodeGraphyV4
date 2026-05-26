import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { IFileAnalysisResult } from '../../../src/core/plugins/types/contracts';

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

  describe('hasCachedTimeline', () => {

        it('should return false when no cache version is stored', () => {
          expect(analyzer.hasCachedTimeline()).toBe(false);
        });



        it('should return true when correct cache version and plugin signature are stored', () => {
          context._stateStore.set('codegraphy.timelineCacheVersion', '1.4.0');
          context._stateStore.set(
            'codegraphy.timelinePluginSignature',
            'test.plugin@1.0.0',
          );
          expect(analyzer.hasCachedTimeline()).toBe(true);
        });



        it('should sort plugin signatures before comparing them to cached timeline metadata', () => {
          registry.list.mockReturnValue([
            { plugin: { id: 'z.plugin', version: '2.0.0' } },
            { plugin: { id: 'a.plugin', version: '1.0.0' } },
          ]);
          context._stateStore.set('codegraphy.timelineCacheVersion', '1.4.0');
          context._stateStore.set(
            'codegraphy.timelinePluginSignature',
            'a.plugin@1.0.0|z.plugin@2.0.0',
          );

          expect(analyzer.hasCachedTimeline()).toBe(true);
        });



        it('should return false when cache version does not match', () => {
          context._stateStore.set('codegraphy.timelineCacheVersion', '0.9.0');
          expect(analyzer.hasCachedTimeline()).toBe(false);
        });



        it('should return false when plugin signature does not match the current registry', () => {
          context._stateStore.set('codegraphy.timelineCacheVersion', '1.4.0');
          context._stateStore.set(
            'codegraphy.timelinePluginSignature',
            'stale.plugin@1.0.0',
          );

          expect(analyzer.hasCachedTimeline()).toBe(false);
        });
  });
});

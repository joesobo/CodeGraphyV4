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

/**
 * Sets up execFile mock to handle multiple git commands by dispatching
 * on the args.
 */
function mockGitCommands(handlers: Array<{ match: string | RegExp; stdout: string }>) {
  const mockedExecFile = mockExecFile;
  mockedExecFile.mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((_cmd: string, args: readonly string[], _opts: unknown, cb?: (...cbArgs: any[]) => void) => {
      const joined = (args as string[]).join(' ');
      for (const handler of handlers) {
        const matches =
          typeof handler.match === 'string'
            ? joined.includes(handler.match)
            : handler.match.test(joined);
        if (matches) {
          if (cb) {
            cb(null, handler.stdout, '');
          }
          return undefined as never;
        }
      }
      // Fallback: empty output
      if (cb) {
        cb(null, '', '');
      }
      return undefined as never;
    }) as never
  );
}

function liveAbortSignal(): AbortSignal {
  return new AbortController().signal;
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

  describe('exclude patterns', () => {

        it('does not exclude files when the default exclude pattern list is used', async () => {
          mockGitCommands([
            { match: 'rev-parse', stdout: 'main\n' },
            { match: 'log', stdout: 'sha1|1|first|A|\n' },
            {
              match: 'ls-tree',
              stdout: 'src/Stryker was here.ts\n',
            },
            { match: /show sha1:/, stdout: '' },
          ]);

          await analyzer.indexHistory(vi.fn(), liveAbortSignal());

          const writeCallArgs = vi.mocked(fs.promises.writeFile).mock.calls[0];
          const graph = JSON.parse(writeCallArgs[1] as string) as IGraphData;

          expect(graph.nodes.map((node) => node.id)).toContain('src/Stryker was here.ts');
        });



        it('should filter out excluded files during full commit analysis', async () => {
          const analyzerWithExcludes = new GitHistoryAnalyzer(
            context as never,
            registry,
            workspaceRoot,
            ['assets/**', '**/node_modules/**']
          );

          mockGitCommands([
            { match: 'rev-parse', stdout: 'main\n' },
            {
              match: 'log',
              stdout: 'sha1|1|first|A|\n',
            },
            {
              match: 'ls-tree',
              stdout: 'src/index.ts\nsrc/utils.ts\nassets/logo.ts\nnode_modules/lib/index.ts\n',
            },
            { match: /show sha1:/, stdout: '' },
          ]);

          await analyzerWithExcludes.indexHistory(vi.fn(), liveAbortSignal());

          // Only non-excluded files should be analyzed
          const analyzeCalls = registry.analyzeFileResult.mock.calls;
          const analyzedPaths = analyzeCalls.map((call) => call[0] as string);
          for (const analyzedPath of analyzedPaths) {
            expect(analyzedPath).not.toMatch(/assets\//);
            expect(analyzedPath).not.toMatch(/node_modules\//);
          }

          // Check cached graph doesn't contain excluded nodes
          const writeCallArgs = vi.mocked(fs.promises.writeFile).mock.calls[0];
          const graph = JSON.parse(writeCallArgs[1] as string) as IGraphData;
          const nodeIds = graph.nodes.map((n) => n.id);
          expect(nodeIds).toContain('src/index.ts');
          expect(nodeIds).toContain('src/utils.ts');
          expect(nodeIds).not.toContain('assets/logo.ts');
          expect(nodeIds).not.toContain('node_modules/lib/index.ts');
        });



        it('applies conditional native files.exclude rules to commit siblings', async () => {
          const analyzerWithNativeExcludes = new GitHistoryAnalyzer(
            context as never,
            registry,
            workspaceRoot,
            [],
            [{ pattern: '**/*.js', when: '$(basename).ts' }],
          );

          mockGitCommands([
            { match: 'rev-parse', stdout: 'main\n' },
            { match: 'log', stdout: 'sha1|1|first|A|\n' },
            { match: 'ls-tree', stdout: 'src/app.js\nsrc/app.ts\nsrc/standalone.js\n' },
            { match: /show sha1:/, stdout: '' },
          ]);

          await analyzerWithNativeExcludes.indexHistory(vi.fn(), liveAbortSignal());

          const writeCallArgs = vi.mocked(fs.promises.writeFile).mock.calls[0];
          const graph = JSON.parse(writeCallArgs[1] as string) as IGraphData;
          const nodeIds = graph.nodes.map(node => node.id);
          expect(nodeIds).not.toContain('src/app.js');
          expect(nodeIds).toContain('src/app.ts');
          expect(nodeIds).toContain('src/standalone.js');
        });

        it('should skip excluded files when handling Added in diff', async () => {
          const analyzerWithExcludes = new GitHistoryAnalyzer(
            context as never,
            registry,
            workspaceRoot,
            ['assets/**']
          );

          mockGitCommands([
            { match: 'rev-parse', stdout: 'main\n' },
            {
              match: 'log',
              stdout: 'sha2|2|second|A|sha1\nsha1|1|first|B|\n',
            },
            { match: /ls-tree -r --name-only sha1/, stdout: 'src/a.ts\n' },
            { match: /ls-tree -r --name-only sha2/, stdout: 'src/a.ts\nsrc/b.ts\nassets/sprite.ts\n' },
            { match: /show sha1:/, stdout: '' },
            {
              match: /diff --name-status/,
              stdout: 'A\tassets/sprite.ts\nA\tsrc/b.ts\n',
            },
            { match: /show sha2:/, stdout: '' },
          ]);

          await analyzerWithExcludes.indexHistory(vi.fn(), liveAbortSignal());

          // Check that assets/sprite.ts is not in the second commit's graph
          const secondCallArgs = vi.mocked(fs.promises.writeFile).mock.calls[1];
          const graph = JSON.parse(secondCallArgs[1] as string) as IGraphData;
          const nodeIds = graph.nodes.map((n) => n.id);
          expect(nodeIds).toContain('src/a.ts');
          expect(nodeIds).toContain('src/b.ts');
          expect(nodeIds).not.toContain('assets/sprite.ts');
        });



        it('should work with matchBase option for simple glob patterns', async () => {
          const analyzerWithExcludes = new GitHistoryAnalyzer(
            context as never,
            registry,
            workspaceRoot,
            ['*.test.ts']
          );

          mockGitCommands([
            { match: 'rev-parse', stdout: 'main\n' },
            { match: 'log', stdout: 'sha1|1|first|A|\n' },
            {
              match: 'ls-tree',
              stdout: 'src/index.ts\nsrc/index.test.ts\ntests/utils.test.ts\n',
            },
            { match: /show sha1:/, stdout: '' },
          ]);

          await analyzerWithExcludes.indexHistory(vi.fn(), liveAbortSignal());

          const writeCallArgs = vi.mocked(fs.promises.writeFile).mock.calls[0];
          const graph = JSON.parse(writeCallArgs[1] as string) as IGraphData;
          const nodeIds = graph.nodes.map((n) => n.id);
          expect(nodeIds).toContain('src/index.ts');
          expect(nodeIds).not.toContain('src/index.test.ts');
          expect(nodeIds).not.toContain('tests/utils.test.ts');
        });
  });

  describe('abort signal', () => {

        it('should stop indexing when abort signal fires', async () => {
          const controller = new AbortController();

          mockGitCommands([
            { match: 'rev-parse', stdout: 'main\n' },
            {
              match: 'log',
              stdout: [
                'sha3|3|third|A|sha2',
                'sha2|2|second|A|sha1',
                'sha1|1|first|B|',
              ].join('\n'),
            },
            { match: 'ls-tree', stdout: 'src/a.ts\n' },
            { match: /show sha1:/, stdout: '' },
            { match: /diff --name-status/, stdout: '' },
            { match: /show sha2:/, stdout: '' },
          ]);

          const progress = vi.fn();

          // Abort after the second commit finishes caching (progress reports after each commit is cached)
          progress.mockImplementation((_phase: string, current: number) => {
            if (current === 2) {
              controller.abort();
            }
          });

          await expect(
            analyzer.indexHistory(progress, controller.signal)
          ).rejects.toThrow('Indexing aborted');

          // The first two commits should have been cached before the abort is observed
          expect(fs.promises.writeFile).toHaveBeenCalledTimes(2);
          // Progress should have been called for commit 1 and commit 2 (where abort happened)
          expect(progress).toHaveBeenCalledWith('Indexing commits', 1, 3);
          expect(progress).toHaveBeenCalledWith('Indexing commits', 2, 3);
          // But NOT for commit 3
          expect(progress).not.toHaveBeenCalledWith('Indexing commits', 3, 3);
        });
  });

  describe('invalidateCache', () => {

        it('should remove cache directory and clear workspace state', async () => {
          vi.mocked(fs.promises.rm).mockResolvedValue(undefined);

          await analyzer.invalidateCache();

          expect(fs.promises.rm).toHaveBeenCalledWith(
            expect.stringContaining('git-cache'),
            { recursive: true, force: true }
          );
          expect(context.workspaceState.update).toHaveBeenCalledWith(
            'codegraphy.timelineCommits',
            undefined
          );
          expect(context.workspaceState.update).toHaveBeenCalledWith(
            'codegraphy.timelineCacheVersion',
            undefined
          );
        });
  });
});

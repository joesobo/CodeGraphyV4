import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { IGraphData } from '../../../src/shared/contracts';

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
import { GitHistoryAnalyzer } from '../../../src/extension/gitHistory/analyzer';
import type { PluginRegistry } from '../../../src/core/plugins/registry';

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
    analyzeFile: vi.fn().mockResolvedValue([]),
    supportsFile: vi.fn().mockReturnValue(true),
    getSupportedExtensions: vi.fn().mockReturnValue(['.ts', '.js']),
  } as unknown as PluginRegistry & {
    analyzeFile: Mock;
    supportsFile: Mock;
    getSupportedExtensions: Mock;
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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

  // =========================================================================
  // getCommitList
  // =========================================================================

  describe('getCommitList', () => {
    it('should parse git log output and return commits oldest-first', async () => {
      mockGitCommands([
        { match: 'rev-parse --abbrev-ref HEAD', stdout: 'main\n' },
        {
          match: 'log',
          stdout: [
            'abc123|1700000003|third commit|Alice|def456',
            'def456|1700000002|second commit|Bob|ghi789',
            'ghi789|1700000001|first commit|Alice|',
          ].join('\n'),
        },
      ]);

      const commits = await analyzer.getCommitList(100, liveAbortSignal());

      expect(commits).toHaveLength(3);
      // Should be oldest-first (reversed from git log)
      expect(commits[0].sha).toBe('ghi789');
      expect(commits[0].timestamp).toBe(1700000001);
      expect(commits[0].message).toBe('first commit');
      expect(commits[0].author).toBe('Alice');
      expect(commits[0].parents).toEqual([]);

      expect(commits[1].sha).toBe('def456');
      expect(commits[1].parents).toEqual(['ghi789']);

      expect(commits[2].sha).toBe('abc123');
      expect(commits[2].parents).toEqual(['def456']);
    });

    it('should handle commit messages that contain pipe characters', async () => {
      mockGitCommands([
        { match: 'rev-parse --abbrev-ref HEAD', stdout: 'develop\n' },
        {
          match: 'log',
          stdout: 'sha1|1700000001|fix: handle a|b case|Dev|parent1\n',
        },
      ]);

      const commits = await analyzer.getCommitList(10, liveAbortSignal());

      expect(commits).toHaveLength(1);
      // With split limit 5, the message gets the third part
      expect(commits[0].sha).toBe('sha1');
      expect(commits[0].message).toBe('fix: handle a');
    });

    it('should detect the current branch dynamically', async () => {
      const mockedExecFile = mockExecFile;
      const calls: string[][] = [];

      mockedExecFile.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((_cmd: string, args: readonly string[], _opts: unknown, cb?: (...cbArgs: any[]) => void) => {
          calls.push(args as string[]);
          const joined = (args as string[]).join(' ');
          if (joined.includes('rev-parse')) {
            cb?.(null, 'feature-branch\n', '');
          } else {
            cb?.(null, '', '');
          }
          return undefined as never;
        }) as never
      );

      await analyzer.getCommitList(10, liveAbortSignal());

      // The log command should use the detected branch name
      const logCall = calls.find((call) => call.includes('log'));
      expect(logCall).toBeDefined();
      expect(logCall).toContain('feature-branch');
    });

    it('should return empty array for empty git log', async () => {
      mockGitCommands([
        { match: 'rev-parse', stdout: 'main\n' },
        { match: 'log', stdout: '\n' },
      ]);

      const commits = await analyzer.getCommitList(10, liveAbortSignal());
      expect(commits).toEqual([]);
    });
  });

  // =========================================================================
  // getGraphDataForCommit — cache hit / miss
  // =========================================================================

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

  // =========================================================================
  // indexHistory — diff parsing
  // =========================================================================

  describe('indexHistory', () => {
    it('should fully analyze the first commit and diff-analyze subsequent commits', async () => {
      // Two commits: first and second
      mockGitCommands([
        { match: 'rev-parse', stdout: 'main\n' },
        {
          match: 'log',
          stdout: [
            'sha2|1700000002|second|Alice|sha1',
            'sha1|1700000001|first|Bob|',
          ].join('\n'),
        },
        // First commit: ls-tree
        {
          match: 'ls-tree',
          stdout: 'src/a.ts\nsrc/b.ts\n',
        },
        // git show for first commit files
        {
          match: /show sha1:src\/a\.ts/,
          stdout: 'import { b } from "./b";',
        },
        {
          match: /show sha1:src\/b\.ts/,
          stdout: 'export const b = 1;',
        },
        // Diff for second commit
        {
          match: /diff --name-status/,
          stdout: 'A\tsrc/c.ts\nM\tsrc/a.ts\n',
        },
        // git show for second commit files
        {
          match: /show sha2:src\/c\.ts/,
          stdout: 'export const c = 2;',
        },
        {
          match: /show sha2:src\/a\.ts/,
          stdout: 'import { b } from "./b";\nimport { c } from "./c";',
        },
      ]);

      // Configure registry to return connections
      registry.analyzeFile.mockImplementation(
        async (filePath: string, content: string, _root: string) => {
          if (filePath.endsWith('a.ts') && content.includes('./b')) {
            const conns = [
              {
                specifier: './b',
                resolvedPath: '/workspace/src/b.ts',
                type: 'static' as const,
              },
            ];
            if (content.includes('./c')) {
              conns.push({
                specifier: './c',
                resolvedPath: '/workspace/src/c.ts',
                type: 'static' as const,
              });
            }
            return conns;
          }
          return [];
        }
      );

      const progress = vi.fn();
      const commits = await analyzer.indexHistory(progress, liveAbortSignal());

      expect(commits).toHaveLength(2);
      expect(commits[0].sha).toBe('sha1');
      expect(commits[1].sha).toBe('sha2');

      // Progress should be called for each commit
      expect(progress).toHaveBeenCalledWith('Indexing commits', 1, 2);
      expect(progress).toHaveBeenCalledWith('Indexing commits', 2, 2);

      // Cache should be written
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(2);

      // Commit list should be stored in workspaceState
      expect(context.workspaceState.update).toHaveBeenCalledWith(
        'codegraphy.timelineCommits',
        commits
      );
    });

    it('should handle Added files in diff', async () => {
      mockGitCommands([
        { match: 'rev-parse', stdout: 'main\n' },
        {
          match: 'log',
          stdout: 'sha2|2|second|A|sha1\nsha1|1|first|B|\n',
        },
        { match: 'ls-tree', stdout: 'src/a.ts\n' },
        { match: /show sha1:/, stdout: '' },
        {
          match: /diff --name-status/,
          stdout: 'A\tsrc/new.ts\n',
        },
        { match: /show sha2:/, stdout: 'const x = 1;' },
      ]);

      const progress = vi.fn();
      const commits = await analyzer.indexHistory(progress, liveAbortSignal());

      expect(commits).toHaveLength(2);

      // Verify writeFile was called for both commits
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(2);

      // Parse the second commit's cached graph to verify the added node
      const secondCallArgs = vi.mocked(fs.promises.writeFile).mock.calls[1];
      const secondGraph = JSON.parse(secondCallArgs[1] as string) as IGraphData;
      const nodeIds = secondGraph.nodes.map((n) => n.id);
      expect(nodeIds).toContain('src/new.ts');
    });

    it('should handle Deleted files in diff', async () => {
      mockGitCommands([
        { match: 'rev-parse', stdout: 'main\n' },
        {
          match: 'log',
          stdout: 'sha2|2|second|A|sha1\nsha1|1|first|B|\n',
        },
        { match: 'ls-tree', stdout: 'src/a.ts\nsrc/b.ts\n' },
        { match: /show sha1:/, stdout: '' },
        {
          match: /diff --name-status/,
          stdout: 'D\tsrc/b.ts\n',
        },
      ]);

      const progress = vi.fn();
      await analyzer.indexHistory(progress, liveAbortSignal());

      // Parse the second commit's cached graph
      const secondCallArgs = vi.mocked(fs.promises.writeFile).mock.calls[1];
      const secondGraph = JSON.parse(secondCallArgs[1] as string) as IGraphData;
      const nodeIds = secondGraph.nodes.map((n) => n.id);
      expect(nodeIds).not.toContain('src/b.ts');
      expect(nodeIds).toContain('src/a.ts');
    });

    it('should handle Modified files in diff by re-analyzing', async () => {
      // Setup: a.ts imports b.ts at sha1, then at sha2 it also imports c.ts
      mockGitCommands([
        { match: 'rev-parse', stdout: 'main\n' },
        {
          match: 'log',
          stdout: 'sha2|2|second|A|sha1\nsha1|1|first|B|\n',
        },
        { match: 'ls-tree', stdout: 'src/a.ts\nsrc/b.ts\nsrc/c.ts\n' },
        { match: /show sha1:src\/a\.ts/, stdout: 'import "./b";' },
        { match: /show sha1:src\/b\.ts/, stdout: '' },
        { match: /show sha1:src\/c\.ts/, stdout: '' },
        {
          match: /diff --name-status/,
          stdout: 'M\tsrc/a.ts\n',
        },
        {
          match: /show sha2:src\/a\.ts/,
          stdout: 'import "./b"; import "./c";',
        },
      ]);

      let callCount = 0;
      registry.analyzeFile.mockImplementation(
        async (filePath: string, _content: string) => {
          callCount++;
          if (filePath.endsWith('a.ts')) {
            if (callCount <= 3) {
              // First commit: only b
              return [
                {
                  specifier: './b',
                  resolvedPath: '/workspace/src/b.ts',
                  type: 'static' as const,
                },
              ];
            }
            // Second commit: b and c
            return [
              {
                specifier: './b',
                resolvedPath: '/workspace/src/b.ts',
                type: 'static' as const,
              },
              {
                specifier: './c',
                resolvedPath: '/workspace/src/c.ts',
                type: 'static' as const,
              },
            ];
          }
          return [];
        }
      );

      await analyzer.indexHistory(vi.fn(), liveAbortSignal());

      // Parse the second commit's graph
      const secondCallArgs = vi.mocked(fs.promises.writeFile).mock.calls[1];
      const secondGraph = JSON.parse(secondCallArgs[1] as string) as IGraphData;
      const edgeTargets = secondGraph.edges.filter((e) => e.from === 'src/a.ts').map((e) => e.to);
      expect(edgeTargets).toContain('src/b.ts');
      expect(edgeTargets).toContain('src/c.ts');
    });

    it('should handle Renamed files by updating node id and repointing edges', async () => {
      mockGitCommands([
        { match: 'rev-parse', stdout: 'main\n' },
        {
          match: 'log',
          stdout: 'sha2|2|second|A|sha1\nsha1|1|first|B|\n',
        },
        { match: 'ls-tree', stdout: 'src/old.ts\nsrc/main.ts\n' },
        { match: /show sha1:src\/old\.ts/, stdout: '' },
        { match: /show sha1:src\/main\.ts/, stdout: 'import "./old";' },
        {
          match: /diff --name-status/,
          stdout: 'R100\tsrc/old.ts\tsrc/new.ts\n',
        },
        { match: /show sha2:src\/new\.ts/, stdout: '' },
      ]);

      // main.ts imports old.ts at sha1
      registry.analyzeFile.mockImplementation(
        async (filePath: string) => {
          if (filePath.endsWith('main.ts')) {
            return [
              {
                specifier: './old',
                resolvedPath: '/workspace/src/old.ts',
                type: 'static' as const,
              },
            ];
          }
          return [];
        }
      );

      await analyzer.indexHistory(vi.fn(), liveAbortSignal());

      // First commit should have old.ts
      const firstCallArgs = vi.mocked(fs.promises.writeFile).mock.calls[0];
      const firstGraph = JSON.parse(firstCallArgs[1] as string) as IGraphData;
      expect(firstGraph.nodes.map((n) => n.id)).toContain('src/old.ts');

      // Second commit should have src/new.ts instead of src/old.ts
      const secondCallArgs = vi.mocked(fs.promises.writeFile).mock.calls[1];
      const secondGraph = JSON.parse(secondCallArgs[1] as string) as IGraphData;
      const nodeIds = secondGraph.nodes.map((n) => n.id);
      expect(nodeIds).toContain('src/new.ts');
      expect(nodeIds).not.toContain('src/old.ts');

      // Edge from main.ts should now point to new.ts
      const mainEdge = secondGraph.edges.find((e) => e.from === 'src/main.ts');
      expect(mainEdge?.to).toBe('src/new.ts');
    });
  });

  // =========================================================================
  // Exclude patterns
  // =========================================================================

  describe('exclude patterns', () => {
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
      const analyzeCalls = registry.analyzeFile.mock.calls;
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
        { match: 'ls-tree', stdout: 'src/a.ts\n' },
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

  // =========================================================================
  // Abort signal
  // =========================================================================

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

      // Abort after the first commit finishes (progress reports current = 2 for the second)
      progress.mockImplementation((_phase: string, current: number) => {
        if (current === 2) {
          controller.abort();
        }
      });

      await expect(
        analyzer.indexHistory(progress, controller.signal)
      ).rejects.toThrow('Indexing aborted');

      // The first commit should have been cached but the second should not
      expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
      // Progress should have been called for commit 1 and commit 2 (where abort happened)
      expect(progress).toHaveBeenCalledWith('Indexing commits', 1, 3);
      expect(progress).toHaveBeenCalledWith('Indexing commits', 2, 3);
      // But NOT for commit 3
      expect(progress).not.toHaveBeenCalledWith('Indexing commits', 3, 3);
    });
  });

  // =========================================================================
  // invalidateCache
  // =========================================================================

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

  // =========================================================================
  // hasCachedTimeline / getCachedCommitList
  // =========================================================================

  describe('hasCachedTimeline', () => {
    it('should return false when no cache version is stored', () => {
      expect(analyzer.hasCachedTimeline()).toBe(false);
    });

    it('should return true when correct cache version is stored', () => {
      context._stateStore.set('codegraphy.timelineCacheVersion', '1.1.0');
      expect(analyzer.hasCachedTimeline()).toBe(true);
    });

    it('should return false when cache version does not match', () => {
      context._stateStore.set('codegraphy.timelineCacheVersion', '0.9.0');
      expect(analyzer.hasCachedTimeline()).toBe(false);
    });
  });

  describe('getCachedCommitList', () => {
    it('should return null when no cache exists', () => {
      expect(analyzer.getCachedCommitList()).toBeNull();
    });

    it('should return cached commits when cache version matches', () => {
      const commits = [
        { sha: 'abc', timestamp: 1, message: 'init', author: 'A', parents: [] },
      ];
      context._stateStore.set('codegraphy.timelineCacheVersion', '1.1.0');
      context._stateStore.set('codegraphy.timelineCommits', commits);

      expect(analyzer.getCachedCommitList()).toEqual(commits);
    });
  });
});

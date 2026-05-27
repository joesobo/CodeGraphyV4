import type { ExecFileOptions } from 'child_process';
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



        it('passes the workspace root and git execution buffer options into child process calls', async () => {
          const capturedOptions: Array<{ cwd?: string; maxBuffer?: number }> = [];
          mockExecFile.mockImplementation(((
            _cmd: string,
            args: readonly string[],
            opts: ExecFileOptions,
            cb?: (error: Error | null, stdout: string, stderr: string) => void,
          ) => {
            capturedOptions.push(opts as { cwd?: string; maxBuffer?: number });
            const joined = [...args].join(' ');
            if (joined.includes('rev-parse')) {
              cb?.(null, 'main\n', '');
            } else if (joined.includes('log')) {
              cb?.(null, '', '');
            }
            return undefined as never;
          }) as never);
          await analyzer.getCommitList(10, liveAbortSignal());

          expect(capturedOptions).toEqual([
            expect.objectContaining({ cwd: workspaceRoot, maxBuffer: 10 * 1024 * 1024 }),
            expect.objectContaining({ cwd: workspaceRoot, maxBuffer: 10 * 1024 * 1024 }),
          ]);
        });
  });
});

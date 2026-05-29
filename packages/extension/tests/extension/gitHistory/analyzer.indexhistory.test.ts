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

function createAnalysisResult(
  filePath: string,
  relations: IFileAnalysisResult['relations'] = [],
): IFileAnalysisResult {
  return {
    filePath,
    relations,
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

function getWrittenGraph(index: number): IGraphData {
  const writeCallArgs = vi.mocked(fs.promises.writeFile).mock.calls[index];
  return JSON.parse(writeCallArgs[1] as string) as IGraphData;
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
          registry.analyzeFileResult.mockImplementation(
            async (filePath: string, content: string, _root: string) => {
              if (filePath.endsWith('a.ts') && content.includes('./b')) {
                const relations = [
                  {
                    specifier: './b',
                    resolvedPath: '/workspace/src/b.ts',
                    type: 'static' as const,
                    kind: 'import' as const,
                    sourceId: 'import',
                    fromFilePath: filePath,
                  },
                ];
                if (content.includes('./c')) {
                  relations.push({
                    specifier: './c',
                    resolvedPath: '/workspace/src/c.ts',
                    type: 'static' as const,
                    kind: 'import' as const,
                    sourceId: 'import',
                    fromFilePath: filePath,
                  });
                }
                return createAnalysisResult(filePath, relations);
              }
              return createAnalysisResult(filePath);
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



        it('writes cumulative churn into each cached graph revision', async () => {
          mockGitCommands([
            { match: 'rev-parse', stdout: 'main\n' },
            {
              match: 'log',
              stdout: 'sha2|2|second|A|sha1\nsha1|1|first|B|\n',
            },
            { match: /ls-tree -r --name-only sha1/, stdout: 'src/a.ts\nsrc/b.ts\n' },
            { match: /ls-tree -r --name-only sha2/, stdout: 'src/a.ts\nsrc/b.ts\nsrc/c.ts\n' },
            { match: /show sha1:/, stdout: '' },
            {
              match: /diff --name-status/,
              stdout: 'M\tsrc/a.ts\nA\tsrc/c.ts\n',
            },
            { match: /show sha2:/, stdout: '' },
          ]);

          await analyzer.indexHistory(vi.fn(), liveAbortSignal());

          const firstGraph = getWrittenGraph(0);
          expect(firstGraph.nodes).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ id: 'src/a.ts', churn: 1 }),
              expect.objectContaining({ id: 'src/b.ts', churn: 1 }),
            ]),
          );

          const secondGraph = getWrittenGraph(1);
          expect(secondGraph.nodes).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ id: 'src/a.ts', churn: 2 }),
              expect.objectContaining({ id: 'src/b.ts', churn: 1 }),
              expect.objectContaining({ id: 'src/c.ts', churn: 1 }),
            ]),
          );
          expect(context.workspaceState.update).toHaveBeenCalledWith('codegraphy.timelineChurnCounts', {
            'src/a.ts': 2,
            'src/b.ts': 1,
            'src/c.ts': 1,
          });
        });



        it('should handle Added files in diff', async () => {
          mockGitCommands([
            { match: 'rev-parse', stdout: 'main\n' },
            {
              match: 'log',
              stdout: 'sha2|2|second|A|sha1\nsha1|1|first|B|\n',
            },
            { match: /ls-tree -r --name-only sha1/, stdout: 'src/a.ts\n' },
            { match: /ls-tree -r --name-only sha2/, stdout: 'src/a.ts\nsrc/new.ts\n' },
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
          const secondGraph = getWrittenGraph(1);
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
          const secondGraph = getWrittenGraph(1);
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
          registry.analyzeFileResult.mockImplementation(
            async (filePath: string, _content: string) => {
              callCount++;
              if (filePath.endsWith('a.ts')) {
                if (callCount <= 3) {
                  // First commit: only b
                  return createAnalysisResult(filePath, [
                    {
                      specifier: './b',
                      resolvedPath: '/workspace/src/b.ts',
                      type: 'static' as const,
                      kind: 'import',
                      sourceId: 'import',
                      fromFilePath: filePath,
                    },
                  ]);
                }
                // Second commit: b and c
                return createAnalysisResult(filePath, [
                  {
                    specifier: './b',
                    resolvedPath: '/workspace/src/b.ts',
                    type: 'static' as const,
                    kind: 'import',
                    sourceId: 'import',
                    fromFilePath: filePath,
                  },
                  {
                    specifier: './c',
                    resolvedPath: '/workspace/src/c.ts',
                    type: 'static' as const,
                    kind: 'import',
                    sourceId: 'import',
                    fromFilePath: filePath,
                  },
                ]);
              }
              return createAnalysisResult(filePath);
            }
          );

          await analyzer.indexHistory(vi.fn(), liveAbortSignal());

          // Parse the second commit's graph
          const secondGraph = getWrittenGraph(1);
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
            { match: /ls-tree -r --name-only sha1/, stdout: 'src/old.ts\nsrc/main.ts\n' },
            { match: /ls-tree -r --name-only sha2/, stdout: 'src/new.ts\nsrc/main.ts\n' },
            { match: /show sha1:src\/old\.ts/, stdout: '' },
            { match: /show sha1:src\/main\.ts/, stdout: 'import "./old";' },
            {
              match: /diff --name-status/,
              stdout: 'R100\tsrc/old.ts\tsrc/new.ts\n',
            },
            { match: /show sha2:src\/new\.ts/, stdout: '' },
          ]);

          // main.ts imports old.ts at sha1
          registry.analyzeFileResult.mockImplementation(
            async (filePath: string) => {
              if (filePath.endsWith('main.ts')) {
                return createAnalysisResult(filePath, [
                  {
                    specifier: './old',
                    resolvedPath: '/workspace/src/old.ts',
                    type: 'static' as const,
                    kind: 'import',
                    sourceId: 'import',
                    fromFilePath: filePath,
                  },
                ]);
              }
              return createAnalysisResult(filePath);
            }
          );

          await analyzer.indexHistory(vi.fn(), liveAbortSignal());

          // First commit should have old.ts
          const firstGraph = getWrittenGraph(0);
          expect(firstGraph.nodes.map((n) => n.id)).toContain('src/old.ts');

          // Second commit should have src/new.ts instead of src/old.ts
          const secondGraph = getWrittenGraph(1);
          const nodeIds = secondGraph.nodes.map((n) => n.id);
          expect(nodeIds).toContain('src/new.ts');
          expect(nodeIds).not.toContain('src/old.ts');

          // Edge from main.ts should now point to new.ts
          const mainEdge = secondGraph.edges.find((e) => e.from === 'src/main.ts');
          expect(mainEdge?.to).toBe('src/new.ts');
        });



        it('carries churn forward when git reports a rename', async () => {
          mockGitCommands([
            { match: 'rev-parse', stdout: 'main\n' },
            {
              match: 'log',
              stdout: 'sha3|3|third|A|sha2\nsha2|2|second|A|sha1\nsha1|1|first|B|\n',
            },
            { match: /ls-tree -r --name-only sha1/, stdout: 'src/old.ts\n' },
            { match: /ls-tree -r --name-only sha2/, stdout: 'src/old.ts\n' },
            { match: /ls-tree -r --name-only sha3/, stdout: 'src/new.ts\n' },
            { match: /show sha1:/, stdout: '' },
            { match: /show sha2:/, stdout: '' },
            { match: /show sha3:/, stdout: '' },
            {
              match: /diff --name-status .*sha1 sha2/,
              stdout: 'M\tsrc/old.ts\n',
            },
            {
              match: /diff --name-status .*sha2 sha3/,
              stdout: 'R100\tsrc/old.ts\tsrc/new.ts\n',
            },
          ]);

          await analyzer.indexHistory(vi.fn(), liveAbortSignal());

          const renamedGraph = getWrittenGraph(2);
          expect(renamedGraph.nodes).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ id: 'src/new.ts', churn: 3 }),
            ]),
          );
          expect(renamedGraph.nodes).not.toEqual(
            expect.arrayContaining([
              expect.objectContaining({ id: 'src/old.ts' }),
            ]),
          );
        });
  });
});

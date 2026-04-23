import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ExecFileOptions } from 'child_process';
import type { IFileAnalysisResult } from '../../../src/core/plugins/types/contracts';
import type { PluginRegistry } from '../../../src/core/plugins/registry/manager';

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

const { mockExecFile } = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
}));

vi.mock('child_process', () => ({
  default: { execFile: mockExecFile },
  execFile: mockExecFile,
}));

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
  };
}

function createMockRegistry() {
  return {
    notifyPreAnalyze: vi.fn(async () => {}),
    analyzeFileResult: vi.fn(async (absolutePath: string): Promise<IFileAnalysisResult> => ({
      filePath: absolutePath,
      relations: [],
    })),
    supportsFile: vi.fn((filePath: string) => filePath.endsWith('.py')),
    getSupportedExtensions: vi.fn(() => ['.py']),
    list: vi.fn(() => []),
  } as unknown as PluginRegistry & {
    notifyPreAnalyze: ReturnType<typeof vi.fn>;
    analyzeFileResult: ReturnType<typeof vi.fn>;
    supportsFile: ReturnType<typeof vi.fn>;
    getSupportedExtensions: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };
}

function mockGitCommands(handlers: Array<{ match: string | RegExp; stdout: string }>) {
  mockExecFile.mockImplementation(((
    _cmd: string,
    args: readonly string[],
    _opts: ExecFileOptions,
    cb?: (error: Error | null, stdout: string, stderr: string) => void,
  ) => {
    const joined = [...args].join(' ');
    for (const handler of handlers) {
      const matches = typeof handler.match === 'string'
        ? joined.includes(handler.match)
        : handler.match.test(joined);
      if (matches) {
        cb?.(null, handler.stdout, '');
        return undefined as never;
      }
    }

    cb?.(null, '', '');
    return undefined as never;
  }) as never);
}

describe('GitHistoryAnalyzer in a workspace subtree', () => {
  const workspaceRoot = '/workspace/examples';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('indexes commits relative to the opened workspace instead of duplicating the repo prefix', async () => {
    const context = createMockContext();
    const registry = createMockRegistry();
    const analyzer = new GitHistoryAnalyzer(context as never, registry, workspaceRoot);

    mockGitCommands([
      { match: 'rev-parse --abbrev-ref HEAD', stdout: 'main\n' },
      {
        match: 'log --first-parent main --format=%H|%at|%s|%an|%P -n 100 -- .',
        stdout: [
          'sha2|2|update subtree|A|sha1',
          'sha1|1|init subtree|B|',
        ].join('\n'),
      },
      {
        match: 'ls-tree -r --name-only sha1 -- .',
        stdout: [
          '.gitignore',
          'example-python/src/main.py',
        ].join('\n'),
      },
      {
        match: 'ls-tree -r --name-only sha2 -- .',
        stdout: [
          '.gitignore',
          'example-python/src/main.py',
        ].join('\n'),
      },
      { match: 'show sha1:./.gitignore', stdout: '.codegraphy/\n' },
      { match: 'show sha1:./example-python/src/main.py', stdout: 'print("one")\n' },
      { match: 'diff --name-status -M --relative sha1 sha2 -- .', stdout: 'M\texample-python/src/main.py\n' },
      { match: 'show sha2:./example-python/src/main.py', stdout: 'print("two")\n' },
    ]);

    await analyzer.indexHistory(vi.fn(), new AbortController().signal, 100);

    expect(registry.analyzeFileResult).toHaveBeenCalledWith(
      '/workspace/examples/example-python/src/main.py',
      'print("one")\n',
      '/workspace/examples',
      expect.anything(),
    );
    expect(registry.analyzeFileResult).not.toHaveBeenCalledWith(
      '/workspace/examples/examples/example-python/src/main.py',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );

    const firstWrite = vi.mocked(fs.promises.writeFile).mock.calls[0];
    const graph = JSON.parse(firstWrite[1] as string) as { nodes: Array<{ id: string }> };

    expect(graph.nodes).toContainEqual(expect.objectContaining({
      id: 'example-python/src/main.py',
    }));
    expect(graph.nodes).not.toContainEqual(expect.objectContaining({
      id: 'examples/example-python/src/main.py',
    }));
  });
});

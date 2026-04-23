import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExecFileOptions } from 'child_process';
import * as path from 'node:path';
import type { ExtensionContext } from 'vscode';

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
import { createConfiguredRegistry } from '../../core/plugins/registry/pluginRegistry.testSupport';

function createMockContext(): ExtensionContext & {
  _stateStore: Map<string, unknown>;
} {
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
    _stateStore: stateStore,
  } as unknown as ExtensionContext & {
    _stateStore: Map<string, unknown>;
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

function readCachedGraph(callIndex: number) {
  const call = vi.mocked(fs.promises.writeFile).mock.calls[callIndex];
  return JSON.parse(call[1] as string) as {
    nodes: Array<{ id: string }>;
    edges: Array<{ from: string; to: string }>;
  };
}

describe('GitHistoryAnalyzer plugin analysis context', () => {
  const workspaceRoot = '/workspace';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets plugins resolve timeline edges from commit-local files', async () => {
    const registry = createConfiguredRegistry();
    registry.register({
      id: 'acme.timeline-plugin',
      name: 'Timeline Plugin',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      supportedExtensions: ['.edge'],
      analyzeFile: vi.fn(async (filePath: string, _content: string, _root: string, context?: {
        mode?: string;
        commitSha?: string;
        fileSystem?: {
          exists(filePath: string): Promise<boolean>;
        };
      }) => {
        if (!filePath.endsWith('app.edge')) {
          return { filePath, relations: [] };
        }

        const targetPath = path.join(path.dirname(filePath), 'target.edge');
        if (!(await context?.fileSystem?.exists(targetPath))) {
          return { filePath, relations: [] };
        }

        return {
          filePath,
          relations: [{
            kind: 'reference' as const,
            sourceId: 'timeline-edge',
            fromFilePath: filePath,
            toFilePath: targetPath,
            specifier: './target.edge',
          }],
        };
      }),
    });
    const analyzer = new GitHistoryAnalyzer(
      createMockContext(),
      registry,
      workspaceRoot,
    );

    mockGitCommands([
      { match: 'rev-parse --abbrev-ref HEAD', stdout: 'main\n' },
      {
        match: 'log',
        stdout: [
          'sha2|2|remove target|A|sha1',
          'sha1|1|add target|A|',
        ].join('\n'),
      },
      { match: /ls-tree -r --name-only sha1/, stdout: 'graph/app.edge\ngraph/target.edge\n' },
      { match: /ls-tree -r --name-only sha2/, stdout: 'graph/app.edge\n' },
      { match: /show sha1:\.\/graph\/app\.edge/, stdout: 'target.edge' },
      { match: /show sha1:\.\/graph\/target\.edge/, stdout: 'hello' },
      { match: /diff --name-status -M --relative sha1 sha2/, stdout: 'D\tgraph/target.edge\nM\tgraph/app.edge\n' },
      { match: /show sha2:\.\/graph\/app\.edge/, stdout: 'target.edge' },
    ]);

    await analyzer.indexHistory(vi.fn(), new AbortController().signal);

    const firstGraph = readCachedGraph(0);
    const secondGraph = readCachedGraph(1);

    expect(firstGraph.edges).toContainEqual({
      from: 'graph/app.edge',
      to: 'graph/target.edge',
      id: expect.stringContaining('graph/app.edge->graph/target.edge'),
      kind: 'reference',
      sources: expect.any(Array),
    });
    expect(secondGraph.edges).not.toContainEqual(
      expect.objectContaining({
        from: 'graph/app.edge',
        to: 'graph/target.edge',
      }),
    );
    const plugin = registry.get('acme.timeline-plugin')?.plugin;
    if (!plugin?.analyzeFile) {
      throw new Error('Expected timeline plugin analyzeFile hook to be registered');
    }
    const analyzeCalls = vi.mocked(plugin.analyzeFile).mock.calls;
    expect(analyzeCalls).toContainEqual([
      '/workspace/graph/app.edge',
      'target.edge',
      '/workspace',
      expect.objectContaining({ mode: 'timeline', commitSha: 'sha1' }),
    ]);
    expect(analyzeCalls).toContainEqual([
      '/workspace/graph/app.edge',
      'target.edge',
      '/workspace',
      expect.objectContaining({ mode: 'timeline', commitSha: 'sha2' }),
    ]);
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
vi.mock('../../../../src/extension/pipeline/service/runtime/discovery', () => ({
  createWorkspacePipelineDiscoveryDependencies: vi.fn(),
  discoverWorkspacePipelineFilesWithWarnings: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/bootstrap', () => ({
  initializeWorkspacePipeline: vi.fn(),
  syncWorkspacePipelinePlugins: vi.fn(),
  getWorkspacePipelinePluginFilterPatterns: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/cache/index', () => ({
  hasWorkspacePipelineIndex: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/runtime/run', () => ({
  analyzeWorkspacePipeline: vi.fn(),
  rebuildWorkspacePipelineGraph: vi.fn(),
}));

const childProcessMock = vi.hoisted(() => ({
  spawnSync: vi.fn(() => ({ error: undefined, status: 1, stdout: '' })),
}));

vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return {
    ...original,
    spawnSync: childProcessMock.spawnSync,
    default: {
      ...original,
      spawnSync: childProcessMock.spawnSync,
    },
  };
});

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
      inspect: vi.fn(),
    })),
    createFileSystemWatcher: vi.fn(),
    onDidSaveTextDocument: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
  },
  window: {
    showWarningMessage: vi.fn(),
  },
}));

import {
  TestDiscoveryFacade,
  discoveryState,
  vscode,
  discoverWorkspacePipelineFilesWithWarnings,
  setUpDiscoveryFacade,
} from './discoveryFacadeFixture';

describe('pipeline/service/discoveryFacade discovery', () => {
  beforeEach(setUpDiscoveryFacade);

  it('returns an empty graph immediately when no workspace root exists', async () => {
    const facade = new TestDiscoveryFacade();
    facade.getWorkspaceRoot.mockReturnValue(undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(facade.discoverGraph()).resolves.toEqual({ nodes: [], edges: [] });

    expect(discoverWorkspacePipelineFilesWithWarnings).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] No workspace folder open');
  });

  it('discovers files with default filters, updates cached state, and builds graph data', async () => {
    const facade = new TestDiscoveryFacade();
    const buildGraphData = vi
      .spyOn(
        facade as unknown as {
          _buildGraphData: (...args: unknown[]) => unknown;
        },
        '_buildGraphData',
      )
      .mockReturnValue({ nodes: [{ id: 'graph', label: 'Graph', color: '#333333' }], edges: [] });
    const disabledPlugins = new Set(['plugin.disabled']);

    const result = await facade.discoverGraph(undefined, disabledPlugins, new AbortController().signal);

    expect(result).toEqual({ nodes: [{ id: 'graph', label: 'Graph', color: '#333333' }], edges: [] });
    expect(discoverWorkspacePipelineFilesWithWarnings).toHaveBeenCalledWith(
      'discovery-deps',
      '/workspace',
      { showOrphans: true, respectGitignore: true },
      [],
      ['plugin-filter'],
      expect.any(AbortSignal),
      expect.any(Function),
    );

    const warn = vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mock.calls[0][6];
    warn('warning');
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('warning');

    expect(discoveryState(facade)._lastDiscoveredFiles).toEqual([
      { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
      { absolutePath: '/workspace/src/b.ts', relativePath: 'src/b.ts' },
    ]);
    expect(discoveryState(facade)._lastDiscoveredDirectories).toEqual(['src/new-folder']);
    expect(discoveryState(facade)._lastGitIgnoredPaths).toEqual(['example-python/app.py']);
    expect(discoveryState(facade)._lastWorkspaceRoot).toBe('/workspace');
    expect(buildGraphData).toHaveBeenCalledWith(
      new Map([
        ['src/a.ts', []],
        ['src/b.ts', []],
      ]),
      '/workspace',
      true,
      disabledPlugins,
    );
  });

  it('keeps cold-cache discovered file nodes visible when Show Orphans is disabled', async () => {
    const facade = new TestDiscoveryFacade();
    vi.mocked(facade._config.getAll).mockReturnValue({
      showOrphans: false,
      respectGitignore: true,
    } as never);
    const buildGraphData = vi
      .spyOn(
        facade as unknown as {
          _buildGraphData: (...args: unknown[]) => unknown;
        },
        '_buildGraphData',
      )
      .mockReturnValue({
        nodes: [
          { id: 'src/a.ts', label: 'a.ts', color: '#333333' },
          { id: 'src/b.ts', label: 'b.ts', color: '#333333' },
        ],
        edges: [],
      });

    await expect(facade.discoverGraph()).resolves.toEqual({
      nodes: [
        { id: 'src/a.ts', label: 'a.ts', color: '#333333' },
        { id: 'src/b.ts', label: 'b.ts', color: '#333333' },
      ],
      edges: [],
    });

    expect(buildGraphData).toHaveBeenCalledWith(
      new Map([
        ['src/a.ts', []],
        ['src/b.ts', []],
      ]),
      '/workspace',
      true,
      new Set<string>(),
    );
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { WorkspacePipelineDiscoveryFacade } from '../../../../src/extension/pipeline/service/discoveryFacade';
import type { Configuration } from '../../../../src/extension/config/reader';
import type { FileDiscovery } from '../../../../src/core/discovery/file/service';
import type { PluginRegistry } from '../../../../src/core/plugins/registry/manager';
import type { IWorkspaceAnalysisCache } from '../../../../src/extension/pipeline/cache';
import type { IDiscoveredFile } from '../../../../src/core/discovery/contracts';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from '../../../../src/extension/pipeline/service/discovery';
import {
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
} from '../../../../src/extension/pipeline/plugins/bootstrap';
import { hasWorkspacePipelineIndex } from '../../../../src/extension/pipeline/service/index';
import {
  analyzeWorkspacePipeline,
  rebuildWorkspacePipelineGraph,
} from '../../../../src/extension/pipeline/service/run';

vi.mock('../../../../src/extension/pipeline/service/discovery', () => ({
  createWorkspacePipelineDiscoveryDependencies: vi.fn(),
  discoverWorkspacePipelineFilesWithWarnings: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/bootstrap', () => ({
  initializeWorkspacePipeline: vi.fn(),
  getWorkspacePipelinePluginFilterPatterns: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/index', () => ({
  hasWorkspacePipelineIndex: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/run', () => ({
  analyzeWorkspacePipeline: vi.fn(),
  rebuildWorkspacePipelineGraph: vi.fn(),
}));

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

class TestDiscoveryFacade extends WorkspacePipelineDiscoveryFacade {
  readonly syncPluginOrder = vi.fn();
  readonly getWorkspaceRoot = vi.fn<() => string | undefined>(() => '/workspace');
  readonly clearCache = vi.fn();

  constructor() {
    super({
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
  }

  _config = {
    getAll: vi.fn(() => ({ showOrphans: true, respectGitignore: true, pluginOrder: ['plugin.a'] })),
  } as unknown as Configuration;

  _discovery = { kind: 'discovery' } as unknown as FileDiscovery;
  _registry = {
    id: 'registry',
    list: vi.fn(() => []),
    setPluginOrder: vi.fn(),
  } as unknown as PluginRegistry;
  _cache = { files: {} } as unknown as IWorkspaceAnalysisCache;

  protected override _syncPluginOrder(): void {
    this.syncPluginOrder();
  }

  protected override _getWorkspaceRoot(): string | undefined {
    return this.getWorkspaceRoot();
  }
}

describe('pipeline/service/discoveryFacade', () => {
  const discoveryState = (
    facade: TestDiscoveryFacade,
  ): {
    _lastDiscoveredFiles: IDiscoveredFile[];
    _lastWorkspaceRoot: string;
  } => facade as unknown as {
    _lastDiscoveredFiles: IDiscoveredFile[];
    _lastWorkspaceRoot: string;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createWorkspacePipelineDiscoveryDependencies).mockReturnValue('discovery-deps' as never);
    vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mockResolvedValue({
      files: [
        { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
        { absolutePath: '/workspace/src/b.ts', relativePath: 'src/b.ts' },
      ],
    } as never);
    vi.mocked(getWorkspacePipelinePluginFilterPatterns).mockReturnValue(['plugin-filter']);
    vi.mocked(hasWorkspacePipelineIndex).mockReturnValue(true);
    vi.mocked(analyzeWorkspacePipeline).mockResolvedValue({
      nodes: [{ id: 'analysis', label: 'Analysis', color: '#111111' }],
      edges: [],
    });
    vi.mocked(rebuildWorkspacePipelineGraph).mockReturnValue({
      nodes: [{ id: 'rebuild', label: 'Rebuild', color: '#222222' }],
      edges: [],
    });
  });

  it('initializes plugins with a workspace-root getter and logs completion', async () => {
    const facade = new TestDiscoveryFacade();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await facade.initialize();

    expect(initializeWorkspacePipeline).toHaveBeenCalledWith(facade._registry, {
      getWorkspaceRoot: expect.any(Function),
    });
    expect(vi.mocked(initializeWorkspacePipeline).mock.calls[0][1].getWorkspaceRoot()).toBe('/workspace');
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] WorkspacePipeline initialized');
  });

  it('delegates plugin filters and index checks through the shared helpers', () => {
    const facade = new TestDiscoveryFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const getCurrentCommitShaSync = vi
      .spyOn(facade as never, '_getCurrentCommitShaSync')
      .mockReturnValue('abc123');
    const getPluginSignature = vi
      .spyOn(facade as never, '_getPluginSignature')
      .mockReturnValue('plugin-signature');
    const getSettingsSignature = vi
      .spyOn(facade as never, '_getSettingsSignature')
      .mockReturnValue('settings-signature');

    expect(facade.getPluginFilterPatterns(disabledPlugins)).toEqual(['plugin-filter']);
    expect(getWorkspacePipelinePluginFilterPatterns).toHaveBeenCalledWith(facade._registry, disabledPlugins);

    expect(facade.hasIndex()).toBe(true);
    const dependencies = vi.mocked(hasWorkspacePipelineIndex).mock.calls[0][1];
    expect(hasWorkspacePipelineIndex).toHaveBeenCalledWith('/workspace', {
      getCurrentCommitShaSync: expect.any(Function),
      getPluginSignature: expect.any(Function),
      getSettingsSignature: expect.any(Function),
    });
    expect(dependencies.getCurrentCommitShaSync('/workspace')).toBe('abc123');
    expect(getCurrentCommitShaSync).toHaveBeenCalledWith('/workspace');
    expect(dependencies.getPluginSignature()).toBe('plugin-signature');
    expect(getPluginSignature).toHaveBeenCalledOnce();
    expect(dependencies.getSettingsSignature()).toBe('settings-signature');
    expect(getSettingsSignature).toHaveBeenCalledOnce();
  });

  it('returns an empty graph immediately when no workspace root exists', async () => {
    const facade = new TestDiscoveryFacade();
    facade.getWorkspaceRoot.mockReturnValue(undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(facade.discoverGraph()).resolves.toEqual({ nodes: [], edges: [] });

    expect(facade.syncPluginOrder).toHaveBeenCalledOnce();
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
      { showOrphans: true, respectGitignore: true, pluginOrder: ['plugin.a'] },
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

  it('delegates analyze, rebuildGraph, and refreshIndex through the shared runners', async () => {
    const facade = new TestDiscoveryFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const signal = new AbortController().signal;
    const onProgress = vi.fn();
    const analyzeSpy = vi.spyOn(facade, 'analyze');
    const persistIndexMetadata = vi
      .spyOn(
        facade as unknown as {
          _persistIndexMetadata: () => Promise<void>;
        },
        '_persistIndexMetadata',
      )
      .mockResolvedValue(undefined);

    await expect(facade.analyze(undefined, disabledPlugins, signal, onProgress)).resolves.toEqual({
      nodes: [{ id: 'analysis', label: 'Analysis', color: '#111111' }],
      edges: [],
    });
    expect(analyzeWorkspacePipeline).toHaveBeenCalledWith(
      facade,
      facade._cache,
      facade._config,
      facade._discovery,
      expect.any(Function),
      [],
      disabledPlugins,
      onProgress,
      signal,
      expect.any(Function),
    );
    expect(vi.mocked(analyzeWorkspacePipeline).mock.calls[0][4]()).toBe('/workspace');
    await vi.mocked(analyzeWorkspacePipeline).mock.calls[0][9]();
    expect(persistIndexMetadata).toHaveBeenCalledOnce();

    expect(facade.rebuildGraph(disabledPlugins, false)).toEqual({
      nodes: [{ id: 'rebuild', label: 'Rebuild', color: '#222222' }],
      edges: [],
    });
    expect(rebuildWorkspacePipelineGraph).toHaveBeenCalledWith(facade, disabledPlugins, false);

    analyzeSpy.mockResolvedValueOnce({
      nodes: [{ id: 'refresh', label: 'Refresh', color: '#444444' }],
      edges: [],
    });
    await expect(
      facade.refreshIndex(undefined, disabledPlugins, signal),
    ).resolves.toEqual({
      nodes: [{ id: 'refresh', label: 'Refresh', color: '#444444' }],
      edges: [],
    });

    expect(facade.clearCache).toHaveBeenCalledOnce();
    expect(analyzeSpy).toHaveBeenCalledWith([], disabledPlugins, signal, expect.any(Function));

    const refreshWithoutProgress = analyzeSpy.mock.calls[1][3] as (progress: {
      phase: string;
      current: number;
      total: number;
    }) => void;
    expect(() =>
      refreshWithoutProgress({ phase: 'Analyzing', current: 1, total: 2 }),
    ).not.toThrow();

    analyzeSpy.mockResolvedValueOnce({
      nodes: [{ id: 'refresh', label: 'Refresh', color: '#444444' }],
      edges: [],
    });
    await facade.refreshIndex(['*.tsx'], disabledPlugins, signal, onProgress);
    const forwardedProgress = analyzeSpy.mock.calls[2][3] as (progress: {
      phase: string;
      current: number;
      total: number;
    }) => void;
    forwardedProgress({ phase: 'Analyzing', current: 2, total: 5 });
    expect(onProgress).toHaveBeenCalledWith({
      phase: 'Refreshing Index',
      current: 2,
      total: 5,
    });
  });
});

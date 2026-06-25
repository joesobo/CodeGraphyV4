import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileDiscovery } from '@codegraphy-dev/core';
import type { PluginRegistry } from '../../../../src/core/plugins/registry/manager';
import type { Configuration } from '../../../../src/extension/config/reader';
import type { IWorkspaceAnalysisCache } from '../../../../src/extension/pipeline/cache';
import { WorkspacePipelineAnalysisFacade } from '../../../../src/extension/pipeline/service/analysisFacade';
import {
  analyzeWorkspacePipeline,
  rebuildWorkspacePipelineGraph,
} from '../../../../src/extension/pipeline/service/runtime/run';

vi.mock('../../../../src/extension/pipeline/service/runtime/run', () => ({
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
  },
}));

class TestAnalysisFacade extends WorkspacePipelineAnalysisFacade {
  readonly getWorkspaceRoot = vi.fn<() => string | undefined>(() => '/workspace');
  readonly effectiveCustomFilterPatterns = vi.fn((patterns: string[]) =>
    patterns.map(pattern => `effective:${pattern}`),
  );
  readonly persistIndexMetadata = vi.fn(async () => undefined);

  constructor() {
    super({
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
    this._cache = {
      files: {
        'src/stale.ts': { analysis: {}, mtime: 1, size: 10 },
      },
    } as unknown as IWorkspaceAnalysisCache;
  }

  _config = {
    get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
    getAll: vi.fn(() => ({ showOrphans: true, respectGitignore: true })),
  } as unknown as Configuration;

  _discovery = { kind: 'discovery' } as unknown as FileDiscovery;
  _registry = {
    list: vi.fn(() => []),
  } as unknown as PluginRegistry;

  public override get _cache(): IWorkspaceAnalysisCache {
    return super._cache;
  }

  public override set _cache(cache: IWorkspaceAnalysisCache) {
    super._cache = cache;
  }

  protected override _getWorkspaceRoot(): string | undefined {
    return this.getWorkspaceRoot();
  }

  protected override _getEffectiveCustomFilterPatterns(filterPatterns: string[]): string[] {
    return this.effectiveCustomFilterPatterns(filterPatterns);
  }

  protected override async _persistIndexMetadata(): Promise<void> {
    await this.persistIndexMetadata();
  }
}

describe('extension/pipeline/service/analysisFacade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(analyzeWorkspacePipeline).mockResolvedValue({
      nodes: [{ id: 'analysis', label: 'Analysis', color: '#111111' }],
      edges: [],
    });
    vi.mocked(rebuildWorkspacePipelineGraph).mockReturnValue({
      nodes: [{ id: 'rebuild', label: 'Rebuild', color: '#222222' }],
      edges: [],
    });
  });

  it('delegates analysis with effective filters and index metadata persistence', async () => {
    const facade = new TestAnalysisFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const signal = new AbortController().signal;
    const onProgress = vi.fn();

    await expect(
      facade.analyze(['src/**'], disabledPlugins, signal, onProgress),
    ).resolves.toEqual({
      nodes: [{ id: 'analysis', label: 'Analysis', color: '#111111' }],
      edges: [],
    });

    expect(analyzeWorkspacePipeline).toHaveBeenCalledWith(
      facade,
      facade._cache,
      facade._config,
      facade._discovery,
      expect.any(Function),
      ['effective:src/**'],
      disabledPlugins,
      onProgress,
      signal,
      expect.any(Function),
    );
    expect(vi.mocked(analyzeWorkspacePipeline).mock.calls[0][4]()).toBe('/workspace');
    await vi.mocked(analyzeWorkspacePipeline).mock.calls[0][9]();
    expect(facade.persistIndexMetadata).toHaveBeenCalledOnce();

    await facade.analyze();
    expect(facade.effectiveCustomFilterPatterns).toHaveBeenLastCalledWith([]);
  });

  it('delegates graph rebuilding with disabled plugins and orphan visibility', () => {
    const facade = new TestAnalysisFacade();
    const disabledPlugins = new Set(['plugin.disabled']);

    expect(facade.rebuildGraph(disabledPlugins, false)).toEqual({
      nodes: [{ id: 'rebuild', label: 'Rebuild', color: '#222222' }],
      edges: [],
    });
    expect(rebuildWorkspacePipelineGraph).toHaveBeenCalledWith(
      facade,
      disabledPlugins,
      false,
    );
  });

  it('refreshes from an empty cache and forwards progress with fallback phases', async () => {
    const facade = new TestAnalysisFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const signal = new AbortController().signal;
    const onProgress = vi.fn();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const cacheBeforeRefresh = facade._cache;
    const analyzeSpy = vi
      .spyOn(facade, 'analyze')
      .mockImplementation(async (_filters, _disabledPlugins, _signal, reportProgress) => {
        reportProgress?.({ phase: '', current: 1, total: 2 });
        reportProgress?.({ phase: 'Analyzing', current: 2, total: 2 });
        return {
          nodes: [{ id: 'refresh', label: 'Refresh', color: '#333333' }],
          edges: [],
        };
      });

    await expect(
      facade.refreshIndex(undefined, disabledPlugins, signal, onProgress),
    ).resolves.toEqual({
      nodes: [{ id: 'refresh', label: 'Refresh', color: '#333333' }],
      edges: [],
    });

    expect(facade._cache).not.toBe(cacheBeforeRefresh);
    expect(facade._cache.files).toEqual({});
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] Cache cleared');
    expect(analyzeSpy).toHaveBeenCalledWith(
      [],
      disabledPlugins,
      signal,
      expect.any(Function),
    );
    expect(onProgress).toHaveBeenNthCalledWith(1, {
      phase: 'Refreshing Index',
      current: 1,
      total: 2,
    });
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      phase: 'Analyzing',
      current: 2,
      total: 2,
    });

    await expect(
      facade.refreshIndex(['src/**'], disabledPlugins, signal),
    ).resolves.toEqual({
      nodes: [{ id: 'refresh', label: 'Refresh', color: '#333333' }],
      edges: [],
    });
    expect(analyzeSpy).toHaveBeenLastCalledWith(
      ['src/**'],
      disabledPlugins,
      signal,
      expect.any(Function),
    );
  });
});

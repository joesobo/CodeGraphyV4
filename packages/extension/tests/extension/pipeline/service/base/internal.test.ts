import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { WorkspacePipelineInternalBase } from '../../../../../src/extension/pipeline/service/base/internal';
import type { Configuration } from '../../../../../src/extension/config/reader';
import type { FileDiscovery } from '../../../../../src/core/discovery/file/service';
import type { PluginRegistry } from '../../../../../src/core/plugins/registry/manager';
import type { IWorkspaceAnalysisCache } from '../../../../../src/extension/pipeline/cache';
import { readWorkspacePipelineFileStat } from '../../../../../src/extension/pipeline/serviceAdapters';
import {
  analyzeWorkspacePipelineDiscoveredFiles,
  preAnalyzeWorkspacePipelinePlugins,
} from '../../../../../src/extension/pipeline/service/runtime/analysis';
import { persistWorkspacePipelineCache } from '../../../../../src/extension/pipeline/service/cache/storage';
import {
  buildWorkspacePipelineGraph,
  buildWorkspacePipelineGraphFromAnalysis,
} from '../../../../../src/extension/pipeline/service/runtime/graph';
import { persistWorkspacePipelineIndexMetadata } from '../../../../../src/extension/pipeline/service/cache/index';
import {
  readWorkspacePipelineAnalysisFiles,
  toWorkspaceRelativePath,
} from '../../../../../src/extension/pipeline/service/cache/paths';
import {
  createWorkspacePipelinePluginSignature,
  readWorkspacePipelineCurrentCommitSha,
  createWorkspacePipelineSettingsSignature,
  readWorkspacePipelineCurrentCommitShaSync,
} from '../../../../../src/extension/pipeline/service/cache/signatures';

vi.mock('../../../../../src/extension/pipeline/serviceAdapters', () => ({
  readWorkspacePipelineFileStat: vi.fn(),
  readWorkspacePipelineRoot: vi.fn(() => '/workspace'),
}));

vi.mock('../../../../../src/extension/pipeline/service/runtime/analysis', () => ({
  analyzeWorkspacePipelineDiscoveredFiles: vi.fn(),
  preAnalyzeWorkspacePipelinePlugins: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/service/cache/storage', () => ({
  persistWorkspacePipelineCache: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/service/runtime/graph', () => ({
  buildWorkspacePipelineGraph: vi.fn(),
  buildWorkspacePipelineGraphFromAnalysis: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/service/cache/index', () => ({
  persistWorkspacePipelineIndexMetadata: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/service/cache/paths', () => ({
  readWorkspacePipelineAnalysisFiles: vi.fn(),
  toWorkspaceRelativePath: vi.fn((workspaceRoot: string, filePath: string) =>
    filePath.replace(`${workspaceRoot}/`, ''),
  ),
}));

vi.mock('../../../../../src/extension/pipeline/service/cache/signatures', () => ({
  createWorkspacePipelinePluginSignature: vi.fn(),
  createWorkspacePipelineSettingsSignature: vi.fn(),
  readWorkspacePipelineCurrentCommitSha: vi.fn(),
  readWorkspacePipelineCurrentCommitShaSync: vi.fn(),
}));

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
    fs: {},
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
      inspect: vi.fn(),
    })),
    createFileSystemWatcher: vi.fn(),
    onDidSaveTextDocument: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
  },
}));

class TestInternalBase extends WorkspacePipelineInternalBase {
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
    getAll: vi.fn(() => ({ pluginOrder: ['plugin.a', 'plugin.b'] })),
  } as unknown as Configuration;

  _registry = {
    list: vi.fn(() => [{ plugin: { id: 'plugin.a' } }]),
    setPluginOrder: vi.fn(),
  } as unknown as PluginRegistry;

  _discovery = {
    readContent: vi.fn(async file => `contents:${file.absolutePath}`),
  } as unknown as FileDiscovery;

  _cache = { files: { 'src/a.ts': { cached: true } } } as unknown as IWorkspaceAnalysisCache;

  public syncPluginOrder(): void {
    this._syncPluginOrder();
  }

  public preAnalyzePlugins(
    files: Array<{ absolutePath: string; relativePath: string }>,
    workspaceRoot: string,
  ): Promise<void> {
    return this._preAnalyzePlugins(files as never, workspaceRoot);
  }

  public analyzeFiles(
    files: Array<{ absolutePath: string; relativePath: string }>,
    workspaceRoot: string,
    onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
  ) {
    return this._analyzeFiles(files as never, workspaceRoot, onProgress);
  }

  public buildGraphData(
    fileConnections: Map<string, Array<{ from: string; to: string }>>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins?: Set<string>,
  ) {
    return this._buildGraphData(fileConnections as never, workspaceRoot, showOrphans, disabledPlugins);
  }

  public buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, { filePath: string }>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins?: Set<string>,
  ) {
    return this._buildGraphDataFromAnalysis(fileAnalysis as never, workspaceRoot, showOrphans, disabledPlugins);
  }

  public getFileStat(filePath: string) {
    return this._getFileStat(filePath);
  }

  public getPluginSignature(): string | null {
    return this._getPluginSignature();
  }

  public getSettingsSignature(): string {
    return this._getSettingsSignature();
  }

  public getCurrentCommitShaSync(workspaceRoot: string): string | null {
    return this._getCurrentCommitShaSync(workspaceRoot);
  }

  public getCurrentCommitSha(workspaceRoot: string) {
    return this._getCurrentCommitSha(workspaceRoot);
  }

  public toWorkspaceRelativePath(workspaceRoot: string, filePath: string) {
    return this._toWorkspaceRelativePath(workspaceRoot, filePath);
  }

  public readAnalysisFiles(files: Array<{ absolutePath: string; relativePath: string }>): Promise<
    Array<{ absolutePath: string; relativePath: string; content: string }>
  > {
    return this._readAnalysisFiles(files as never);
  }

  public persistIndexMetadata(): Promise<void> {
    return this._persistIndexMetadata();
  }

  public persistCache(): void {
    this._persistCache();
  }
}

describe('extension/pipeline/service/internalBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createWorkspacePipelinePluginSignature).mockReturnValue('plugin-signature');
    vi.mocked(createWorkspacePipelineSettingsSignature).mockReturnValue('settings-signature');
    vi.mocked(readWorkspacePipelineCurrentCommitSha).mockResolvedValue('async-commit-sha');
    vi.mocked(readWorkspacePipelineCurrentCommitShaSync).mockReturnValue('commit-sha');
    vi.mocked(readWorkspacePipelineFileStat).mockResolvedValue({
      mtime: 123,
      size: 456,
    });
    vi.mocked(preAnalyzeWorkspacePipelinePlugins).mockResolvedValue(undefined);
    vi.mocked(analyzeWorkspacePipelineDiscoveredFiles).mockResolvedValue({
      fileAnalysis: new Map(),
      fileConnections: new Map(),
    } as never);
    vi.mocked(buildWorkspacePipelineGraph).mockReturnValue({
      nodes: [{ id: 'graph' }],
      edges: [],
    } as never);
    vi.mocked(buildWorkspacePipelineGraphFromAnalysis).mockReturnValue({
      nodes: [{ id: 'analysis-graph' }],
      edges: [],
    } as never);
    vi.mocked(readWorkspacePipelineAnalysisFiles).mockResolvedValue([
      {
        absolutePath: '/workspace/src/a.ts',
        relativePath: 'src/a.ts',
        content: 'contents:/workspace/src/a.ts',
      },
    ]);
    vi.mocked(persistWorkspacePipelineIndexMetadata).mockResolvedValue(undefined);
  });

  it('syncs plugin order from the current configuration', () => {
    const source = new TestInternalBase();

    source.syncPluginOrder();

    expect(source._registry.setPluginOrder).toHaveBeenCalledWith([
      'plugin.a',
      'plugin.b',
    ]);
  });

  it('delegates pre-analysis through the shared helper with registry and discovery callbacks', async () => {
    const source = new TestInternalBase();
    const files = [{ absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' }];
    source._registry = {
      ...source._registry,
      notifyPreAnalyze: vi.fn(async () => undefined),
    } as never;

    await source.preAnalyzePlugins(files, '/workspace');

    expect(preAnalyzeWorkspacePipelinePlugins).toHaveBeenCalledWith(
      files,
      '/workspace',
      expect.any(Object),
      undefined,
    );
    const dependencies = vi.mocked(preAnalyzeWorkspacePipelinePlugins).mock.calls[0][2];
    await dependencies.notifyPreAnalyze(
      [{ relativePath: 'src/a.ts' }] as never,
      '/workspace',
    );
    expect(source._registry.notifyPreAnalyze).toHaveBeenCalledWith(
      [{ relativePath: 'src/a.ts' }],
      '/workspace',
    );
    await expect(dependencies.readContent(files[0] as never)).resolves.toBe(
      'contents:/workspace/src/a.ts',
    );
    expect(source._discovery.readContent).toHaveBeenCalledWith(files[0]);
  });

  it('delegates file analysis through the shared helper with the current collaborators', async () => {
    const source = new TestInternalBase();
    const progress = vi.fn();
    source.setEventBus({ emit: vi.fn() } as never);
    const state = source as unknown as { _eventBus: unknown };
    const getFileStat = vi
      .spyOn(source as unknown as { _getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null> }, '_getFileStat')
      .mockResolvedValue({ mtime: 1, size: 2 });

    await source.analyzeFiles(
      [{ absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' }],
      '/workspace',
      progress,
    );

    expect(analyzeWorkspacePipelineDiscoveredFiles).toHaveBeenCalledWith(
      source._cache,
      source._discovery,
      state._eventBus,
      source._registry,
      expect.any(Function),
      [{ absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' }],
      '/workspace',
      progress,
      undefined,
    );
    await expect(
      vi.mocked(analyzeWorkspacePipelineDiscoveredFiles).mock.calls[0][4]('/workspace/src/a.ts'),
    ).resolves.toEqual({ mtime: 1, size: 2 });
    expect(getFileStat).toHaveBeenCalledWith('/workspace/src/a.ts');
  });

  it('delegates graph building helpers with cache, context, and registry state', () => {
    const source = new TestInternalBase();
    const fileConnections = new Map([['src/a.ts', [{ from: 'a', to: 'b' }]]]);
    const fileAnalysis = new Map([['src/a.ts', { filePath: 'src/a.ts' }]]);
    const disabledPlugins = new Set(['plugin.disabled']);

    expect(
      source.buildGraphData(fileConnections, '/workspace', true, disabledPlugins),
    ).toEqual({
      nodes: [{ id: 'graph' }],
      edges: [],
    });
    expect(buildWorkspacePipelineGraph).toHaveBeenCalledWith(
      source._cache,
      expect.any(Object),
      source._registry,
      fileConnections,
      '/workspace',
      true,
      disabledPlugins,
    );

    expect(
      source.buildGraphDataFromAnalysis(
        fileAnalysis,
        '/workspace',
        false,
        disabledPlugins,
      ),
    ).toEqual({
      nodes: [{ id: 'analysis-graph' }],
      edges: [],
    });
    expect(buildWorkspacePipelineGraphFromAnalysis).toHaveBeenCalledWith(
      source._cache,
      expect.any(Object),
      source._registry,
      fileAnalysis,
      '/workspace',
      false,
      disabledPlugins,
    );
  });

  it('delegates file stats and workspace-relative paths through the shared helpers', async () => {
    const source = new TestInternalBase();

    await expect(source.getFileStat('/workspace/src/a.ts')).resolves.toEqual({
      mtime: 123,
      size: 456,
    });
    expect(readWorkspacePipelineFileStat).toHaveBeenCalledWith(
      '/workspace/src/a.ts',
      vscode.workspace.fs,
    );

    expect(
      source.toWorkspaceRelativePath('/workspace', '/workspace/src/a.ts'),
    ).toBe('src/a.ts');
    expect(toWorkspaceRelativePath).toHaveBeenCalledWith(
      '/workspace',
      '/workspace/src/a.ts',
    );
  });

  it('builds plugin and settings signatures through the shared helpers', () => {
    const source = new TestInternalBase();

    expect(source.getPluginSignature()).toBe('plugin-signature');
    expect(createWorkspacePipelinePluginSignature).toHaveBeenCalledWith(
      source._registry.list(),
    );

    expect(source.getSettingsSignature()).toBe('settings-signature');
    expect(createWorkspacePipelineSettingsSignature).toHaveBeenCalledWith(
      source._config,
    );
  });

  it('reads the current commit sha synchronously through the signature helper', () => {
    const source = new TestInternalBase();

    expect(source.getCurrentCommitShaSync('/workspace')).toBe('commit-sha');
    expect(readWorkspacePipelineCurrentCommitShaSync).toHaveBeenCalledWith(
      '/workspace',
    );
  });

  it('reads the current commit sha asynchronously through the signature helper', async () => {
    const source = new TestInternalBase();

    await expect(source.getCurrentCommitSha('/workspace')).resolves.toBe(
      'async-commit-sha',
    );
    expect(readWorkspacePipelineCurrentCommitSha).toHaveBeenCalledWith(
      '/workspace',
    );
  });

  it('reads analysis files through the shared helper and discovery reader', async () => {
    const source = new TestInternalBase();
    const files = [{ absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' }];

    await expect(source.readAnalysisFiles(files)).resolves.toEqual([
      {
        absolutePath: '/workspace/src/a.ts',
        relativePath: 'src/a.ts',
        content: 'contents:/workspace/src/a.ts',
      },
    ]);

    expect(readWorkspacePipelineAnalysisFiles).toHaveBeenCalledWith(
      files,
      expect.any(Function),
    );
    const readContent = vi.mocked(readWorkspacePipelineAnalysisFiles).mock.calls[0][1];
    await expect(readContent(files[0] as never)).resolves.toBe(
      'contents:/workspace/src/a.ts',
    );
    expect(source._discovery.readContent).toHaveBeenCalledWith(files[0]);
  });

  it('persists index metadata through delegated getters and warning logging', async () => {
    const source = new TestInternalBase();
    const getCurrentCommitSha = vi
      .spyOn(
        source as unknown as { _getCurrentCommitSha: (workspaceRoot: string) => Promise<string | null> },
        '_getCurrentCommitSha',
      )
      .mockResolvedValue('async-commit-sha');
    const getPluginSignature = vi
      .spyOn(source as unknown as { _getPluginSignature: () => string | null }, '_getPluginSignature')
      .mockReturnValue('plugin-signature');
    const getSettingsSignature = vi
      .spyOn(source as unknown as { _getSettingsSignature: () => string }, '_getSettingsSignature')
      .mockReturnValue('settings-signature');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await source.persistIndexMetadata();

    expect(persistWorkspacePipelineIndexMetadata).toHaveBeenCalledWith(
      '/workspace',
      expect.any(Object),
    );
    const dependencies = vi.mocked(persistWorkspacePipelineIndexMetadata).mock.calls[0][1];
    await expect(dependencies.getCurrentCommitSha('/workspace')).resolves.toBe(
      'async-commit-sha',
    );
    expect(getCurrentCommitSha).toHaveBeenCalledWith('/workspace');
    expect(dependencies.getPluginSignature()).toBe('plugin-signature');
    expect(getPluginSignature).toHaveBeenCalledOnce();
    expect(dependencies.getSettingsSignature()).toBe('settings-signature');
    expect(getSettingsSignature).toHaveBeenCalledOnce();
    dependencies.warn('failed to persist', new Error('boom'));
    expect(warnSpy).toHaveBeenCalledWith('failed to persist', expect.any(Error));
  });

  it('persists the cache through the shared helper and warning logger', () => {
    const source = new TestInternalBase();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    source.persistCache();

    expect(persistWorkspacePipelineCache).toHaveBeenCalledWith(
      '/workspace',
      source._cache,
      expect.any(Function),
    );
    const warn = vi.mocked(persistWorkspacePipelineCache).mock.calls[0][2];
    warn('cache warning', new Error('boom'));
    expect(warnSpy).toHaveBeenCalledWith('cache warning', expect.any(Error));
  });
});

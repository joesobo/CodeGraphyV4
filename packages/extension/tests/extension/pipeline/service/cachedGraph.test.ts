import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  projectFileAnalysisConnections,
  throwIfWorkspaceAnalysisAborted,
  type FileDiscovery,
  type IDiscoveredFile,
} from '@codegraphy-dev/core';
import type { PluginRegistry } from '../../../../src/core/plugins/registry/manager';
import type { Configuration } from '../../../../src/extension/config/reader';
import { WorkspacePipelineCachedGraphFacade } from '../../../../src/extension/pipeline/service/cachedGraph';
import { createCachedWorkspaceDiscoveryState } from '../../../../src/extension/pipeline/service/cache/cachedDiscovery';
import {
  isMissingFileError,
  isWorkspaceAnalysisAbortError,
} from '../../../../src/extension/pipeline/service/cachedGraphWarmup/errors';
import { warmCachedGraphAnalysisFile } from '../../../../src/extension/pipeline/service/cachedGraphWarmup/execution';
import { createCachedGraphAnalysisWarmupInput } from '../../../../src/extension/pipeline/service/cachedGraphWarmup/input';

vi.mock('@codegraphy-dev/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@codegraphy-dev/core')>();
  return {
    ...actual,
    projectFileAnalysisConnections: vi.fn(),
    throwIfWorkspaceAnalysisAborted: vi.fn(),
  };
});

vi.mock('../../../../src/extension/pipeline/service/cache/cachedDiscovery', () => ({
  createCachedWorkspaceDiscoveryState: vi.fn(),
}));
vi.mock('../../../../src/extension/pipeline/service/cachedGraphWarmup/errors', () => ({
  isMissingFileError: vi.fn(),
  isWorkspaceAnalysisAbortError: vi.fn(),
}));
vi.mock('../../../../src/extension/pipeline/service/cachedGraphWarmup/execution', () => ({
  warmCachedGraphAnalysisFile: vi.fn(),
}));
vi.mock('../../../../src/extension/pipeline/service/cachedGraphWarmup/input', () => ({
  createCachedGraphAnalysisWarmupInput: vi.fn(),
}));

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
    getConfiguration: vi.fn(() => ({ get: vi.fn(), inspect: vi.fn(), update: vi.fn() })),
  },
}));

const cachedAnalysis = { filePath: '/workspace/src/cached.ts', imports: [], relations: [], symbols: [] };
const cachedFiles: IDiscoveredFile[] = [{
  absolutePath: '/workspace/src/cached.ts',
  relativePath: 'src/cached.ts',
}] as never;

class TestCachedGraphFacade extends WorkspacePipelineCachedGraphFacade {
  readonly getWorkspaceRoot = vi.fn<() => string | undefined>(() => '/workspace');
  readonly hydrateCacheFromGraphCache = vi.fn(async () => undefined);
  readonly activeAnalysisPluginIds = vi.fn((
    _pluginIds: readonly string[] | undefined, _disabledPlugins: ReadonlySet<string>,
  ) => ['plugin.active']);
  readonly buildGraphDataFromAnalysis = vi.fn((
    _fileAnalysis: Map<string, never>, _workspaceRoot: string, _showOrphans: boolean, _disabledPlugins: Set<string>,
  ) => ({ nodes: [{ id: 'graph', label: 'Graph', color: '#333333' }], edges: [] }));

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
        'src/cached.ts': { analysis: cachedAnalysis, mtime: 1, size: 10 },
      },
    } as never;
  }

  _config = {
    get: vi.fn((key: string, defaultValue: unknown) =>
      key === 'nodeVisibility' ? { Symbol: true } : defaultValue,
    ),
    getAll: vi.fn(() => ({ respectGitignore: true, showOrphans: false })),
  } as unknown as Configuration;

  _discovery = { kind: 'discovery' } as unknown as FileDiscovery;
  _registry = {
    list: vi.fn(() => []),
  } as unknown as PluginRegistry;

  protected override _getWorkspaceRoot(): string | undefined {
    return this.getWorkspaceRoot();
  }

  protected override async _hydrateCacheFromGraphCache(): Promise<void> {
    await this.hydrateCacheFromGraphCache();
  }

  protected override _getActiveAnalysisPluginIds(
    pluginIds: readonly string[] | undefined,
    disabledPlugins: ReadonlySet<string>,
  ): string[] {
    return this.activeAnalysisPluginIds(pluginIds, disabledPlugins);
  }

  protected override _buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, never>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string>,
  ) {
    return this.buildGraphDataFromAnalysis(fileAnalysis, workspaceRoot, showOrphans, disabledPlugins);
  }
}

interface CachedGraphState {
  _lastDiscoveredDirectories: string[];
  _lastDiscoveredFiles: IDiscoveredFile[];
  _lastFileAnalysis: Map<string, unknown>;
  _lastFileConnections: Map<string, unknown>;
  _lastGitIgnoredPaths: string[];
  _lastWorkspaceRoot: string;
}

function cachedGraphState(facade: TestCachedGraphFacade): CachedGraphState {
  return facade as unknown as CachedGraphState;
}

function setupCachedDiscovery(): Map<string, never[]> {
  const projectedConnections = new Map<string, never[]>([['src/cached.ts', []]]);

  vi.mocked(projectFileAnalysisConnections).mockReturnValue(projectedConnections as never);
  vi.mocked(createCachedWorkspaceDiscoveryState).mockReturnValue({
    directories: ['src'],
    files: cachedFiles,
    gitIgnoredPaths: ['dist/generated.ts'],
  });
  vi.mocked(createCachedGraphAnalysisWarmupInput).mockReturnValue({
    file: cachedFiles[0],
  } as never);
  vi.mocked(warmCachedGraphAnalysisFile).mockResolvedValue(undefined);

  return projectedConnections;
}

async function flushWarmupCatch(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('extension/pipeline/service/cachedGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isMissingFileError).mockReturnValue(false);
    vi.mocked(isWorkspaceAnalysisAbortError).mockReturnValue(false);
    setupCachedDiscovery();
  });

  it('returns an empty graph after hydration when no workspace is open', async () => {
    const facade = new TestCachedGraphFacade();
    facade.getWorkspaceRoot.mockReturnValue(undefined);

    await expect(facade.loadCachedGraph()).resolves.toEqual({ nodes: [], edges: [] });

    expect(facade.hydrateCacheFromGraphCache).toHaveBeenCalledOnce();
    expect(facade._config.getAll).not.toHaveBeenCalled();
    expect(createCachedWorkspaceDiscoveryState).not.toHaveBeenCalled();
    expect(warmCachedGraphAnalysisFile).not.toHaveBeenCalled();
  });

  it('replays cached analysis into graph state and schedules warmup by default', async () => {
    const facade = new TestCachedGraphFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const signal = new AbortController().signal;
    const projectedConnections = setupCachedDiscovery();

    await expect(
      facade.loadCachedGraph(['ignored'], disabledPlugins, signal),
    ).resolves.toEqual({
      nodes: [{ id: 'graph', label: 'Graph', color: '#333333' }],
      edges: [],
    });

    expect(throwIfWorkspaceAnalysisAborted).toHaveBeenCalledWith(signal);
    expect(createCachedWorkspaceDiscoveryState).toHaveBeenCalledWith(
      '/workspace',
      ['src/cached.ts'],
      true,
    );
    expect(projectFileAnalysisConnections).toHaveBeenCalledWith(
      new Map([['src/cached.ts', cachedAnalysis]]),
      '/workspace',
    );
    const retainedState = cachedGraphState(facade);
    expect(retainedState._lastDiscoveredFiles).toEqual(cachedFiles);
    expect(retainedState._lastDiscoveredDirectories).toEqual(['src']);
    expect(retainedState._lastGitIgnoredPaths).toEqual(['dist/generated.ts']);
    expect(retainedState._lastFileAnalysis).toEqual(new Map([['src/cached.ts', cachedAnalysis]]));
    expect(retainedState._lastFileConnections).toBe(projectedConnections);
    expect(retainedState._lastWorkspaceRoot).toBe('/workspace');
    expect(facade.buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      new Map([['src/cached.ts', cachedAnalysis]]),
      '/workspace',
      false,
      disabledPlugins,
    );

    expect(createCachedGraphAnalysisWarmupInput).toHaveBeenCalledWith({
      disabledPlugins,
      files: cachedFiles,
      getActiveAnalysisPluginIds: expect.any(Function),
      nodeVisibility: { Symbol: true },
      registry: facade._registry,
      signal,
      workspaceRoot: '/workspace',
    });
    const warmupInput = vi.mocked(createCachedGraphAnalysisWarmupInput).mock.calls[0][0];
    expect(warmupInput.getActiveAnalysisPluginIds(new Set(['disabled']))).toEqual(['plugin.active']);
    expect(facade.activeAnalysisPluginIds).toHaveBeenCalledWith(undefined, new Set(['disabled']));
    expect(warmCachedGraphAnalysisFile).toHaveBeenCalledWith(
      { file: cachedFiles[0] },
      facade._discovery,
      facade._registry,
    );
  });

  it('honors gitignore and warmup replay options independently', async () => {
    const facade = new TestCachedGraphFacade();

    await facade.loadCachedGraph([], new Set(), undefined, {
      includeCurrentGitignoreMetadata: false,
      warmAnalysis: false,
    });

    expect(createCachedWorkspaceDiscoveryState).toHaveBeenLastCalledWith(
      '/workspace',
      ['src/cached.ts'],
      false,
    );
    expect(createCachedGraphAnalysisWarmupInput).not.toHaveBeenCalled();
    expect(warmCachedGraphAnalysisFile).not.toHaveBeenCalled();

    vi.clearAllMocks();
    setupCachedDiscovery();
    vi.mocked(facade._config.getAll).mockReturnValueOnce({
      showOrphans: true,
      respectGitignore: false,
    } as never);

    await facade.loadCachedGraph();

    expect(createCachedWorkspaceDiscoveryState).toHaveBeenLastCalledWith(
      '/workspace',
      ['src/cached.ts'],
      false,
    );
    expect(facade.buildGraphDataFromAnalysis).toHaveBeenLastCalledWith(
      new Map([['src/cached.ts', cachedAnalysis]]),
      '/workspace',
      true,
      new Set<string>(),
    );
  });

  it('logs only unexpected cached analysis warmup failures', async () => {
    const facade = new TestCachedGraphFacade();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const abortError = new Error('aborted');
    const missingFileError = new Error('missing');
    const failedError = new Error('failed');

    vi.mocked(warmCachedGraphAnalysisFile).mockRejectedValueOnce(abortError);
    vi.mocked(isWorkspaceAnalysisAbortError).mockImplementation(error => error === abortError);
    await facade.loadCachedGraph();
    await flushWarmupCatch();
    expect(warnSpy).not.toHaveBeenCalled();

    vi.mocked(warmCachedGraphAnalysisFile).mockRejectedValueOnce(missingFileError);
    vi.mocked(isWorkspaceAnalysisAbortError).mockReturnValue(false);
    vi.mocked(isMissingFileError).mockImplementation(error => error === missingFileError);
    await facade.loadCachedGraph();
    await flushWarmupCatch();
    expect(warnSpy).not.toHaveBeenCalled();

    vi.mocked(warmCachedGraphAnalysisFile).mockRejectedValueOnce(failedError);
    vi.mocked(isMissingFileError).mockReturnValue(false);
    await facade.loadCachedGraph();
    await flushWarmupCatch();

    expect(warnSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to warm cached graph analysis.',
      failedError,
    );

    vi.mocked(createCachedGraphAnalysisWarmupInput).mockReturnValueOnce(undefined);
    await facade.loadCachedGraph();
    expect(warmCachedGraphAnalysisFile).toHaveBeenCalledTimes(3);
  });
});

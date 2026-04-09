import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IGraphData } from '../../../../src/shared/graph/types';
import { WorkspacePipeline } from '../../../../src/extension/pipeline/service';
import * as pluginModule from '../../../../src/extension/pipeline/plugins/queries';
import * as runModule from '../../../../src/extension/pipeline/analysis/run';
import * as stateModule from '../../../../src/extension/pipeline/analysis/state';
import * as repoMetaModule from '../../../../src/extension/repoSettings/meta';
import * as gitExecModule from '../../../../src/extension/gitHistory/exec';

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

function createContext() {
  return {
    subscriptions: [],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
  };
}

function createGraph(): IGraphData {
  return {
    nodes: [{ id: 'src/index.ts', label: 'index.ts', color: '#93C5FD' }],
    edges: [],
  };
}

describe('WorkspacePipeline delegates', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();
    vi.spyOn(repoMetaModule, 'readCodeGraphyRepoMeta').mockReturnValue(
      repoMetaModule.createDefaultCodeGraphyRepoMeta(),
    );
    vi.spyOn(repoMetaModule, 'writeCodeGraphyRepoMeta').mockImplementation(() => {});
  });

  it('delegates analyze through the shared runner with the current workspace root', async () => {
    const context = createContext();
    const analyzer = new WorkspacePipeline(
      context as unknown as vscode.ExtensionContext,
    );
    const signal = new AbortController().signal;
    const disabledSources = new Set(['plugin.typescript:rule']);
    const disabledPlugins = new Set(['plugin.python']);
    const expectedGraph = createGraph();
    vi.spyOn(gitExecModule, 'execGitCommand').mockResolvedValue('abc123\n');
    const runSpy = vi
      .spyOn(runModule, 'runWorkspacePipelineAnalysis')
      .mockImplementation(
        async (
          source,
          cache,
          config,
          discovery,
          getWorkspaceRoot,
          filterPatterns,
          nextDisabledRules,
          nextDisabledPlugins,
          nextProgress,
          nextSignal,
        ) => {
          expect(cache).toBe((analyzer as unknown as { _cache: unknown })._cache);
          expect(config).toBe((analyzer as unknown as { _config: unknown })._config);
          expect(discovery).toBe((analyzer as unknown as { _discovery: unknown })._discovery);
          expect(source._lastDiscoveredFiles).toBe(
            (analyzer as unknown as { _lastDiscoveredFiles: unknown })._lastDiscoveredFiles,
          );
          expect(source._lastFileConnections).toBe(
            (analyzer as unknown as { _lastFileConnections: unknown })._lastFileConnections,
          );
          expect(source._lastWorkspaceRoot).toBe('');
          expect(getWorkspaceRoot()).toBe('/test/workspace');
          expect(filterPatterns).toEqual(['**/*.generated.ts']);
          expect(nextDisabledRules).toBe(disabledSources);
          expect(nextDisabledPlugins).toBe(disabledPlugins);
          expect(nextProgress).toBeUndefined();
          expect(nextSignal).toBe(signal);
          return expectedGraph;
        },
      );

    await expect(
      analyzer.analyze(['**/*.generated.ts'], disabledSources, disabledPlugins, signal),
    ).resolves.toEqual(expectedGraph);
    expect(runSpy).toHaveBeenCalledOnce();
    expect(repoMetaModule.writeCodeGraphyRepoMeta).toHaveBeenCalledWith(
      '/test/workspace',
      expect.objectContaining({
        lastIndexedAt: expect.any(String),
        lastIndexedCommit: 'abc123',
        pluginSignature: null,
        settingsSignature: expect.any(String),
      }),
    );
  });

  it('updates cached discovered files when the shared runner writes them back', async () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext,
    );
    const discoveredFiles = [
      {
        absolutePath: '/test/workspace/src/index.ts',
        extension: '.ts',
        name: 'index.ts',
        relativePath: 'src/index.ts',
      },
    ];

    vi.spyOn(runModule, 'runWorkspacePipelineAnalysis').mockImplementation(async source => {
      source._lastDiscoveredFiles = discoveredFiles;
      return { nodes: [], edges: [] };
    });

    await analyzer.analyze();

    expect(
      (analyzer as unknown as { _lastDiscoveredFiles: unknown })._lastDiscoveredFiles,
    ).toBe(discoveredFiles);
  });

  it('updates cached file connections when the shared runner writes them back', async () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext,
    );
    const fileConnections = new Map([
      [
        'src/index.ts',
        [
          {
            resolvedPath: '/test/workspace/src/utils.ts',
            specifier: './utils',
            type: 'static' as const,
            sourceId: 'import',
            kind: 'import' as const,
          },
        ],
      ],
    ]);

    vi.spyOn(runModule, 'runWorkspacePipelineAnalysis').mockImplementation(async source => {
      source._lastFileConnections = fileConnections;
      return { nodes: [], edges: [] };
    });

    await analyzer.analyze();

    expect(
      (analyzer as unknown as { _lastFileConnections: unknown })._lastFileConnections,
    ).toBe(fileConnections);
  });

  it('updates the cached workspace root when the shared runner writes it back', async () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext,
    );
    const workspaceRoot = '/test/workspace';

    vi.spyOn(runModule, 'runWorkspacePipelineAnalysis').mockImplementation(async source => {
      source._lastWorkspaceRoot = workspaceRoot;
      return { nodes: [], edges: [] };
    });

    await analyzer.analyze();

    expect(
      (analyzer as unknown as { _lastWorkspaceRoot: unknown })._lastWorkspaceRoot,
    ).toBe(workspaceRoot);
  });

  it('delegates rebuildGraph through the cached rebuild source', () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext,
    );
    const disabledSources = new Set(['plugin.typescript:rule']);
    const disabledPlugins = new Set(['plugin.python']);
    const expectedGraph = createGraph();
    const rebuildSpy = vi
      .spyOn(stateModule, 'rebuildWorkspacePipelineGraphForSource')
      .mockReturnValue(expectedGraph);

    expect(
      analyzer.rebuildGraph(disabledSources, disabledPlugins, false),
    ).toEqual(expectedGraph);
    const [source, nextDisabledRules, nextDisabledPlugins, nextShowOrphans] =
      rebuildSpy.mock.calls[0];
    expect(source._lastFileConnections).toBe(
      (analyzer as unknown as { _lastFileConnections: unknown })._lastFileConnections,
    );
    expect(source._lastWorkspaceRoot).toBe('');
    expect(nextDisabledRules).toBe(disabledSources);
    expect(nextDisabledPlugins).toBe(disabledPlugins);
    expect(nextShowOrphans).toBe(false);
  });

  it('delegates plugin status calculation through the current analyzer state', () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext,
    );
    const analyzerPrivate = analyzer as unknown as {
      _lastDiscoveredFiles: Array<{ relativePath: string }>;
      _lastFileConnections: Map<string, never[]>;
      _lastWorkspaceRoot: string;
      _registry: unknown;
    };
    const disabledSources = new Set(['plugin.typescript:rule']);
    const disabledPlugins = new Set(['plugin.python']);
    const expectedStatuses = [{ id: 'plugin.typescript', status: 'active' }];

    analyzerPrivate._lastDiscoveredFiles = [{ relativePath: 'src/index.ts' }];
    analyzerPrivate._lastFileConnections = new Map([['src/index.ts', []]]);
    analyzerPrivate._lastWorkspaceRoot = '/test/workspace';

    const statusSpy = vi
      .spyOn(pluginModule, 'getWorkspacePipelinePluginStatuses')
      .mockReturnValue(expectedStatuses as never);

    expect(
      analyzer.getPluginStatuses(disabledSources, disabledPlugins),
    ).toEqual(expectedStatuses);
    expect(statusSpy).toHaveBeenCalledWith({
      disabledPlugins,
      disabledSources,
      discoveredFiles: analyzerPrivate._lastDiscoveredFiles,
      fileConnections: analyzerPrivate._lastFileConnections,
      registry: analyzerPrivate._registry,
    });
  });

  it('delegates plugin name lookup with the live workspace root callback', () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext,
    );
    const analyzerPrivate = analyzer as unknown as {
      _lastWorkspaceRoot: string;
      _registry: unknown;
    };

    analyzerPrivate._lastWorkspaceRoot = '';

    const resolveSpy = vi
      .spyOn(pluginModule, 'resolveWorkspacePipelinePluginNameForFile')
      .mockImplementation((relativePath, lastWorkspaceRoot, getWorkspaceRoot, registry) => {
        expect(relativePath).toBe('src/index.ts');
        expect(lastWorkspaceRoot).toBe('');
        expect(getWorkspaceRoot()).toBe('/test/workspace');
        expect(registry).toBe(analyzerPrivate._registry);
        return 'TypeScript';
      });

    expect(analyzer.getPluginNameForFile('src/index.ts')).toBe('TypeScript');
    expect(resolveSpy).toHaveBeenCalledOnce();
  });

  it('delegates cache clearing and replaces the cached analysis state', () => {
    const context = createContext();
    const analyzer = new WorkspacePipeline(
      context as unknown as vscode.ExtensionContext,
    );
    const replacementCache = { version: '1.9.0', files: {} };
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const clearSpy = vi
      .spyOn(stateModule, 'clearWorkspacePipelineCache')
      .mockImplementation((workspaceRoot, logInfo: (message: string) => void) => {
        expect(workspaceRoot).toBe('/test/workspace');
        logInfo('[CodeGraphy] Cache cleared');
        return replacementCache as never;
      });

    analyzer.clearCache();

    expect(clearSpy).toHaveBeenCalledOnce();
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] Cache cleared');
    expect((analyzer as unknown as { _cache: unknown })._cache).toBe(replacementCache);
  });
});

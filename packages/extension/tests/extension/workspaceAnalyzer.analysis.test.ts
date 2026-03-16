import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { DEFAULT_EXCLUDE_PATTERNS } from '../../src/extension/Configuration';
import { WorkspaceAnalyzer } from '../../src/extension/WorkspaceAnalyzer';

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

(vscode.window as Record<string, unknown>).showWarningMessage = vi.fn();

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

describe('WorkspaceAnalyzer analysis', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();
  });

  it('registers all built-in plugins as built-in entries during initialize', async () => {
    const analyzer = new WorkspaceAnalyzer(
      createContext() as unknown as vscode.ExtensionContext
    );

    await analyzer.initialize();

    expect(analyzer.registry.list().map((pluginInfo) => pluginInfo.builtIn)).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
  });

  it('returns the unique default filter patterns from registered plugins', async () => {
    const analyzer = new WorkspaceAnalyzer(
      createContext() as unknown as vscode.ExtensionContext
    );

    await analyzer.initialize();

    const expectedPatterns = [
      ...new Set(
        analyzer.registry.list().flatMap((pluginInfo) => pluginInfo.plugin.defaultFilters ?? [])
      ),
    ];

    expect(expectedPatterns.length).toBeGreaterThan(0);
    expect(analyzer.getPluginFilterPatterns()).toEqual(expectedPatterns);
  });

  it('returns an empty graph when no workspace folder is open', async () => {
    workspaceFoldersValue = undefined;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const analyzer = new WorkspaceAnalyzer(
      createContext() as unknown as vscode.ExtensionContext
    );

    const result = await analyzer.analyze();

    expect(result).toEqual({ nodes: [], edges: [] });
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] No workspace folder open');
  });

  it('merges default and plugin filters into discovery options without an event bus', async () => {
    const context = createContext();
    const analyzer = new WorkspaceAnalyzer(
      context as unknown as vscode.ExtensionContext
    );
    const analyzerPrivate = analyzer as unknown as {
      _buildGraphData: (connections: Map<string, never[]>) => { nodes: []; edges: [] };
      _config: {
        getAll: () => {
          include: string[];
          maxFiles: number;
          respectGitignore: boolean;
          showOrphans: boolean;
        };
      };
      _discovery: {
        discover: (options: unknown) => Promise<{
          durationMs: number;
          files: [];
          limitReached: boolean;
          totalFound: number;
        }>;
      };
      _preAnalyzePlugins: (files: [], workspaceRoot: string, signal?: AbortSignal) => Promise<void>;
      _analyzeFiles: (files: [], workspaceRoot: string, signal?: AbortSignal) => Promise<Map<string, never[]>>;
    };

    vi.spyOn(analyzer, 'getPluginFilterPatterns').mockReturnValue(['**/*.generated.ts']);
    vi.spyOn(analyzerPrivate._config, 'getAll').mockReturnValue({
      include: ['**/*'],
      maxFiles: 25,
      respectGitignore: false,
      showOrphans: true,
    });
    const discoverSpy = vi.spyOn(analyzerPrivate._discovery, 'discover').mockResolvedValue({
      durationMs: 2,
      files: [],
      limitReached: false,
      totalFound: 0,
    });
    vi.spyOn(analyzerPrivate, '_preAnalyzePlugins').mockResolvedValue();
    vi.spyOn(analyzerPrivate, '_analyzeFiles').mockResolvedValue(new Map());
    vi.spyOn(analyzerPrivate, '_buildGraphData').mockReturnValue({ nodes: [], edges: [] });
    const signal = new AbortController().signal;

    await expect(analyzer.analyze(undefined, undefined, undefined, signal)).resolves.toEqual({
      nodes: [],
      edges: [],
    });

    expect(discoverSpy).toHaveBeenCalledWith({
      rootPath: '/test/workspace',
      maxFiles: 25,
      include: ['**/*'],
      exclude: [...new Set([...DEFAULT_EXCLUDE_PATTERNS, '**/*.generated.ts'])],
      respectGitignore: false,
      signal,
    });
    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    expect(context.workspaceState.update).toHaveBeenCalled();
  });

  it('shows a warning when discovery hits the file limit', async () => {
    const analyzer = new WorkspaceAnalyzer(
      createContext() as unknown as vscode.ExtensionContext
    );
    const analyzerPrivate = analyzer as unknown as {
      _buildGraphData: () => { nodes: []; edges: [] };
      _config: {
        getAll: () => {
          include: string[];
          maxFiles: number;
          respectGitignore: boolean;
          showOrphans: boolean;
        };
      };
      _discovery: {
        discover: () => Promise<{
          durationMs: number;
          files: [];
          limitReached: boolean;
          totalFound: number;
        }>;
      };
      _preAnalyzePlugins: () => Promise<void>;
      _analyzeFiles: () => Promise<Map<string, never[]>>;
    };

    vi.spyOn(analyzerPrivate._config, 'getAll').mockReturnValue({
      include: ['**/*'],
      maxFiles: 10,
      respectGitignore: true,
      showOrphans: true,
    });
    vi.spyOn(analyzer, 'getPluginFilterPatterns').mockReturnValue([]);
    vi.spyOn(analyzerPrivate._discovery, 'discover').mockResolvedValue({
      durationMs: 1,
      files: [],
      limitReached: true,
      totalFound: 27,
    });
    vi.spyOn(analyzerPrivate, '_preAnalyzePlugins').mockResolvedValue();
    vi.spyOn(analyzerPrivate, '_analyzeFiles').mockResolvedValue(new Map());
    vi.spyOn(analyzerPrivate, '_buildGraphData').mockReturnValue({ nodes: [], edges: [] });

    await analyzer.analyze();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'CodeGraphy: Found 27+ files, showing first 10. Increase codegraphy.maxFiles in settings to see more.'
    );
  });

  it('emits analysis lifecycle events with graph identifiers', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const analyzer = new WorkspaceAnalyzer(
      createContext() as unknown as vscode.ExtensionContext
    );
    const analyzerPrivate = analyzer as unknown as {
      _buildGraphData: () => {
        edges: [{ id: 'src/index.ts->src/utils.ts' }];
        nodes: [{ id: 'src/index.ts' }, { id: 'src/utils.ts' }];
      };
      _config: {
        getAll: () => {
          include: string[];
          maxFiles: number;
          respectGitignore: boolean;
          showOrphans: boolean;
        };
      };
      _discovery: {
        discover: () => Promise<{
          durationMs: number;
          files: [{ absolutePath: string; relativePath: string }];
          limitReached: boolean;
          totalFound: number;
        }>;
      };
      _preAnalyzePlugins: () => Promise<void>;
      _analyzeFiles: () => Promise<Map<string, never[]>>;
    };
    const eventBus = { emit: vi.fn() };

    analyzer.setEventBus(eventBus as never);
    vi.spyOn(analyzer, 'getPluginFilterPatterns').mockReturnValue([]);
    vi.spyOn(analyzerPrivate._config, 'getAll').mockReturnValue({
      include: ['**/*'],
      maxFiles: 25,
      respectGitignore: true,
      showOrphans: true,
    });
    vi.spyOn(analyzerPrivate._discovery, 'discover').mockResolvedValue({
      durationMs: 7,
      files: [{ absolutePath: '/test/workspace/src/index.ts', relativePath: 'src/index.ts' }],
      limitReached: false,
      totalFound: 1,
    });
    vi.spyOn(analyzerPrivate, '_preAnalyzePlugins').mockResolvedValue();
    vi.spyOn(analyzerPrivate, '_analyzeFiles').mockResolvedValue(new Map([
      ['src/index.ts', []],
    ]));
    vi.spyOn(analyzerPrivate, '_buildGraphData').mockReturnValue({
      nodes: [
        { id: 'src/index.ts' },
        { id: 'src/utils.ts' },
      ],
      edges: [
        { id: 'src/index.ts->src/utils.ts' },
      ],
    });

    await analyzer.analyze();

    expect(eventBus.emit).toHaveBeenNthCalledWith(1, 'analysis:started', {
      fileCount: 1,
    });
    expect(eventBus.emit).toHaveBeenNthCalledWith(2, 'analysis:completed', {
      graph: {
        nodes: [{ id: 'src/index.ts' }, { id: 'src/utils.ts' }],
        edges: [{ id: 'src/index.ts->src/utils.ts' }],
      },
      duration: 0,
    });
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] Discovered 1 files in 7ms');
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] Graph built: 2 nodes, 1 edges');
  });
});

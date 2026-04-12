import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { IFileAnalysisResult } from '../../../src/core/plugins/types/contracts';
import { DEFAULT_EXCLUDE_PATTERNS } from '../../../src/extension/config/defaults';
import { formatWorkspacePipelineLimitReachedMessage } from '../../../src/extension/pipeline/discovery';
import { WorkspacePipeline } from '../../../src/extension/pipeline/service';

const fixtureWorkspacePath = path.resolve(__dirname, '../../../test-fixtures/workspace');

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

describe('WorkspacePipeline analysis', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.restoreAllMocks();
  });

  it('registers all built-in plugins as built-in entries during initialize', async () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );

    await analyzer.initialize();

    expect(analyzer.registry.list().map((pluginInfo) => pluginInfo.builtIn)).toEqual([true]);
    expect(analyzer.registry.list().map((pluginInfo) => pluginInfo.plugin.id)).toEqual([
      'codegraphy.markdown',
    ]);
  });

  it('returns the unique default filter patterns from registered plugins', async () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );

    await analyzer.initialize();

    const expectedPatterns = [
      ...new Set(
        analyzer.registry.list().flatMap((pluginInfo) => pluginInfo.plugin.defaultFilters ?? [])
      ),
    ];

    expect(analyzer.getPluginFilterPatterns()).toEqual(expectedPatterns);
  });

  it('wires the core Tree-sitter analyzer into the registry during initialize', async () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );
    const appPath = `${fixtureWorkspacePath}/src/index.ts`;
    const content = await fs.readFile(appPath, 'utf8');

    await analyzer.initialize();

    const result = await analyzer.registry.analyzeFileResult(
      appPath,
      content,
      fixtureWorkspacePath,
    );

    expect(result?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'import',
          sourceId: 'codegraphy.core.treesitter:import',
          specifier: './utils',
        }),
      ]),
    );
  });

  it('returns an empty graph when no workspace folder is open', async () => {
    workspaceFoldersValue = undefined;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );

    const result = await analyzer.analyze();

    expect(result).toEqual({ nodes: [], edges: [] });
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] No workspace folder open');
  });

  it('discovers disconnected file nodes without running full analysis', async () => {
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );
    const analyzerPrivate = analyzer as unknown as {
      _buildGraphData: (
        fileConnections: Map<string, never[]>,
        workspaceRoot: string,
        showOrphans: boolean,
      ) => { nodes: [{ id: string }]; edges: [] };
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
      _lastFileConnections: Map<string, never[]>;
      _lastDiscoveredFiles: Array<{ absolutePath: string; relativePath: string }>;
      _lastWorkspaceRoot: string;
    };

    vi.spyOn(analyzerPrivate._config, 'getAll').mockReturnValue({
      include: ['**/*'],
      maxFiles: 25,
      respectGitignore: true,
      showOrphans: true,
    });
    vi.spyOn(analyzer, 'getPluginFilterPatterns').mockReturnValue([]);
    vi.spyOn(analyzerPrivate._discovery, 'discover').mockResolvedValue({
      durationMs: 3,
      files: [{ absolutePath: '/test/workspace/src/index.ts', relativePath: 'src/index.ts' }],
      limitReached: false,
      totalFound: 1,
    });
    const preAnalyzeSpy = vi.spyOn(analyzerPrivate, '_preAnalyzePlugins').mockResolvedValue();
    const analyzeFilesSpy = vi.spyOn(analyzerPrivate, '_analyzeFiles').mockResolvedValue({
      cacheHits: 0,
      cacheMisses: 0,
      fileAnalysis: new Map(),
      fileConnections: new Map(),
    } as never);
    const buildGraphDataSpy = vi.spyOn(analyzerPrivate, '_buildGraphData').mockImplementation(
      (fileConnections, workspaceRoot, showOrphans) => {
        expect([...fileConnections.entries()]).toEqual([['src/index.ts', []]]);
        expect(workspaceRoot).toBe('/test/workspace');
        expect(showOrphans).toBe(true);
        return {
          nodes: [{ id: 'src/index.ts' }],
          edges: [],
        };
      },
    );

    const result = await analyzer.discoverGraph();

    expect(result).toEqual({
      nodes: [{ id: 'src/index.ts' }],
      edges: [],
    });
    expect(preAnalyzeSpy).not.toHaveBeenCalled();
    expect(analyzeFilesSpy).not.toHaveBeenCalled();
    expect(buildGraphDataSpy).toHaveBeenCalledOnce();
    expect(analyzerPrivate._lastDiscoveredFiles).toEqual([
      { absolutePath: '/test/workspace/src/index.ts', relativePath: 'src/index.ts' },
    ]);
    expect([...analyzerPrivate._lastFileConnections.entries()]).toEqual([['src/index.ts', []]]);
    expect(analyzerPrivate._lastWorkspaceRoot).toBe('/test/workspace');
  });

  it('merges default and plugin filters into discovery options without an event bus', async () => {
    const context = createContext();
    const analyzer = new WorkspacePipeline(
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
      _analyzeFiles: (
        files: [],
        workspaceRoot: string,
        onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
        signal?: AbortSignal,
      ) => Promise<{
        cacheHits: number;
        cacheMisses: number;
        fileAnalysis: Map<string, IFileAnalysisResult>;
        fileConnections: Map<string, never[]>;
      }>;
      _buildGraphDataFromAnalysis: (
        fileAnalysis: Map<string, IFileAnalysisResult>,
      ) => { nodes: []; edges: [] };
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
    vi.spyOn(analyzerPrivate, '_analyzeFiles').mockResolvedValue({
      cacheHits: 0,
      cacheMisses: 0,
      fileAnalysis: new Map(),
      fileConnections: new Map(),
    });
    vi.spyOn(analyzerPrivate, '_buildGraphDataFromAnalysis').mockReturnValue({
      nodes: [],
      edges: [],
    });
    const signal = new AbortController().signal;

    await expect(analyzer.analyze(undefined, undefined, signal)).resolves.toEqual({
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
    expect(context.workspaceState.update).not.toHaveBeenCalled();
  });

  it('shows a warning when discovery hits the file limit', async () => {
    const analyzer = new WorkspacePipeline(
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
      _analyzeFiles: () => Promise<{
        cacheHits: number;
        cacheMisses: number;
        fileAnalysis: Map<string, IFileAnalysisResult>;
        fileConnections: Map<string, never[]>;
      }>;
      _buildGraphDataFromAnalysis: (
        fileAnalysis: Map<string, IFileAnalysisResult>,
      ) => { nodes: []; edges: [] };
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
    vi.spyOn(analyzerPrivate, '_analyzeFiles').mockResolvedValue({
      cacheHits: 0,
      cacheMisses: 0,
      fileAnalysis: new Map(),
      fileConnections: new Map(),
    });
    vi.spyOn(analyzerPrivate, '_buildGraphDataFromAnalysis').mockReturnValue({
      nodes: [],
      edges: [],
    });

    await analyzer.analyze();

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      formatWorkspacePipelineLimitReachedMessage(27, 10),
    );
  });

  it('emits analysis lifecycle events with graph identifiers', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const analyzer = new WorkspacePipeline(
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
      _analyzeFiles: () => Promise<{
        cacheHits: number;
        cacheMisses: number;
        fileAnalysis: Map<string, IFileAnalysisResult>;
        fileConnections: Map<string, never[]>;
      }>;
      _buildGraphDataFromAnalysis: (
        fileAnalysis: Map<string, IFileAnalysisResult>,
      ) => {
        edges: [{ id: string }];
        nodes: [{ id: string }, { id: string }];
      };
    };
    const eventBus = { emit: vi.fn() };
    const fileAnalysis = new Map<string, IFileAnalysisResult>([
      ['src/index.ts', { filePath: '/test/workspace/src/index.ts', relations: [] }],
    ]);

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
    vi.spyOn(analyzerPrivate, '_analyzeFiles').mockResolvedValue({
      cacheHits: 0,
      cacheMisses: 1,
      fileAnalysis,
      fileConnections: new Map([['src/index.ts', []]]),
    });
    vi.spyOn(analyzerPrivate, '_buildGraphDataFromAnalysis').mockReturnValue({
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

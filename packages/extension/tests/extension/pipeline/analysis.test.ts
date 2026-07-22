import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { IFileAnalysisResult } from '../../../src/core/plugins/types/contracts';
import { DEFAULT_EXCLUDE_PATTERNS } from '../../../src/extension/config/defaults';
import {
  getWorkspaceAnalysisDatabasePath,
  readWorkspaceAnalysisDatabaseSnapshot,
} from '../../../src/extension/pipeline/database/cache/storage';
import { formatWorkspacePipelineLimitReachedMessage } from '../../../src/extension/pipeline/discovery';
import { WorkspacePipeline } from '../../../src/extension/pipeline/service/lifecycleFacade';

const fixtureWorkspacePath = path.resolve(__dirname, '../../../test-fixtures/workspace');
const tempWorkspaceRoots: string[] = [];

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

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-pipeline-'));
  tempWorkspaceRoots.push(workspaceRoot);

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf8');
  }

  return workspaceRoot;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

afterAll(async () => {
  await Promise.all(
    tempWorkspaceRoots.splice(0).map((workspaceRoot) =>
      fs.rm(workspaceRoot, { recursive: true, force: true }),
    ),
  );
});

describe('WorkspacePipeline analysis', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.restoreAllMocks();
  });

  it('registers built-in plugin entries during initialize', async () => {
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

  it('wires core Tree-sitter analysis into the registry during initialize', async () => {
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
          sourceId: 'core:treesitter:import',
          specifier: './utils',
        }),
      ]),
    );
  });

  it('wires core Tree-sitter analysis for Python files without a marketplace plugin', async () => {
    const workspaceRoot = await createWorkspace({
      'pkg/thing.py': 'def run():\n    return True\n',
      'app.py': 'from .pkg import thing\nclass App:\n    def run(self):\n        thing.run()\n',
    });
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceRoot), name: 'workspace', index: 0 },
    ];
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );
    const appPath = path.join(workspaceRoot, 'app.py');
    const content = await fs.readFile(appPath, 'utf8');

    await analyzer.initialize();

    const result = await analyzer.registry.analyzeFileResult(
      appPath,
      content,
      workspaceRoot,
    );

    expect(result?.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'import',
          sourceId: 'core:treesitter:import',
          specifier: '.pkg.thing',
          toFilePath: path.join(workspaceRoot, 'pkg/thing.py'),
        }),
        expect.objectContaining({
          kind: 'call',
          sourceId: 'core:treesitter:call',
          specifier: '.pkg.thing',
          toFilePath: path.join(workspaceRoot, 'pkg/thing.py'),
        }),
      ]),
    );
  });

  it('pre-analyzes core Tree-sitter files before C# workspace analysis', async () => {
    const workspaceRoot = await createWorkspace({
      'src/Contracts/IRunner.cs': 'namespace MyApp.Contracts;\npublic interface IRunner {}\n',
      'src/Program.cs': 'using MyApp.Services;\nusing MyApp.Utils;\nApiService.Run();\nHelpers.Format();\n',
      'src/Services/ApiService.cs': 'using MyApp.Contracts;\nnamespace MyApp.Services;\npublic class ApiService : IRunner { public static void Run() {} }\n',
      'src/Utils/Helpers.cs': 'namespace MyApp.Utils;\npublic static class Helpers { public static string Format() => "ok"; }\n',
    });
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceRoot), name: 'workspace', index: 0 },
    ];
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );

    await analyzer.initialize();

    const graph = await analyzer.analyze();

    expect(graph.edges.map(edge => edge.id)).toEqual(
      expect.arrayContaining([
        'src/Program.cs->src/Services/ApiService.cs#call',
        'src/Program.cs->src/Services/ApiService.cs#using',
        'src/Program.cs->src/Utils/Helpers.cs#call',
        'src/Program.cs->src/Utils/Helpers.cs#using',
        'src/Services/ApiService.cs->src/Contracts/IRunner.cs#implements',
        'src/Services/ApiService.cs->src/Contracts/IRunner.cs#using',
      ]),
    );
  });

  it('keeps Tree-sitter relations after workspace plugin reload and index refresh', async () => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(fixtureWorkspacePath), name: 'workspace', index: 0 },
    ];
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );

    await analyzer.initialize();

    const initialGraph = await analyzer.analyze();
    expect(initialGraph.edges.map(edge => edge.id)).toEqual(
      expect.arrayContaining([
        'src/index.ts->src/utils.ts#import',
      ]),
    );

    await analyzer.reloadWorkspacePlugins();
    const refreshedGraph = await analyzer.refreshIndex();

    expect(analyzer.registry.get('codegraphy.markdown')).toBeDefined();
    expect(refreshedGraph.edges.map(edge => edge.id)).toEqual(
      expect.arrayContaining([
        'src/index.ts->src/utils.ts#import',
      ]),
    );
  });

  it('preserves the previous Tree-sitter index when a full refresh is aborted', async () => {
    const workspaceRoot = await createWorkspace({
      'src/utils.ts': 'export const value = 1;\n',
      'src/index.ts': "import { value } from './utils';\nconsole.log(value);\n",
    });
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceRoot), name: 'workspace', index: 0 },
    ];
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );

    await analyzer.initialize();

    const graph = await analyzer.analyze();
    expect(graph.edges.map(edge => edge.id)).toContain('src/index.ts->src/utils.ts#import');
    const snapshotBefore = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
    expect(snapshotBefore.relations.length).toBeGreaterThan(0);

    const controller = new AbortController();
    controller.abort();
    await expect(
      analyzer.refreshIndex([], new Set<string>(), controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).relations.length).toBe(
      snapshotBefore.relations.length,
    );
  });

  it('recreates a deleted Graph Cache when indexing the workspace', async () => {
    const workspaceRoot = await createWorkspace({
      'src/utils.ts': 'export const value = 1;\n',
      'src/index.ts': "import { value } from './utils';\nconsole.log(value);\n",
    });
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceRoot), name: 'workspace', index: 0 },
    ];
    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );

    await analyzer.initialize();

    const initialGraph = await analyzer.analyze();
    expect(initialGraph.edges.map(edge => edge.id)).toContain('src/index.ts->src/utils.ts#import');
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);
    expect(await pathExists(databasePath)).toBe(true);

    await fs.unlink(databasePath);
    expect(analyzer.hasIndex()).toBe(false);

    const indexedGraph = await analyzer.refreshIndex();

    expect(indexedGraph.edges.map(edge => edge.id)).toContain('src/index.ts->src/utils.ts#import');
    expect(await pathExists(databasePath)).toBe(true);
    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).relations.length).toBeGreaterThan(0);
  });

  it('replays warm Graph Cache nodes and edges after a cold index', async () => {
    const workspaceRoot = await createWorkspace({
      'src/utils.ts': 'export const value = 1;\n',
      'src/index.ts': "import { value } from './utils';\nconsole.log(value);\n",
    });
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceRoot), name: 'workspace', index: 0 },
    ];
    const coldAnalyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );

    await coldAnalyzer.initialize();

    const coldGraph = await coldAnalyzer.analyze();
    expect(coldGraph.edges.map(edge => edge.id)).toContain('src/index.ts->src/utils.ts#import');

    const warmAnalyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext
    );
    await warmAnalyzer.initialize();

    const warmGraph = await warmAnalyzer.loadCachedGraph();

    expect(warmGraph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'src/index.ts', color: expect.stringMatching(/^#[0-9a-f]{6}$/i) }),
        expect.objectContaining({ id: 'src/utils.ts', color: expect.stringMatching(/^#[0-9a-f]{6}$/i) }),
      ]),
    );
    expect(warmGraph.edges.map(edge => edge.id)).toContain('src/index.ts->src/utils.ts#import');
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

  it('does not apply query Filters to workspace discovery', async () => {
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

    const getPluginFilterPatterns = vi.spyOn(analyzer, 'getPluginFilterPatterns')
      .mockReturnValue(['**/*.generated.ts']);
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
      exclude: DEFAULT_EXCLUDE_PATTERNS,
      respectGitignore: false,
      signal,
    });
    expect(getPluginFilterPatterns).not.toHaveBeenCalled();
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

import { vi } from 'vitest';
import fs from 'node:fs';
import * as vscode from 'vscode';
import { WorkspacePipelineRefreshFacade } from '../../../../src/extension/pipeline/service/refreshFacade';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from '../../../../src/extension/pipeline/service/runtime/discovery';
import {
  refreshWorkspacePipelineAnalysisScope,
  refreshWorkspacePipelineChangedFiles,
  refreshWorkspacePipelinePluginFiles,
} from '../../../../src/extension/pipeline/service/runtime/refresh';

export class TestRefreshFacade extends WorkspacePipelineRefreshFacade {
  constructor() {
    super({
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
    this._lastDiscoveredFiles = [] as never;
    this._lastFileAnalysis = new Map() as never;
    this._lastFileConnections = new Map() as never;
    this._lastWorkspaceRoot = '';
  }

  _config = {
    get: vi.fn((key: string, defaultValue: unknown) => {
      if (key === 'nodeVisibility') {
        return {};
      }
      return defaultValue;
    }),
    getAll: vi.fn(() => ({ showOrphans: true, respectGitignore: true })),
  } as never;

  _discovery = { kind: 'discovery' } as never;
  _registry = {
    list: vi.fn(() => [{ plugin: { id: 'plugin.a' } }]),
    notifyFilesChanged: vi.fn(async () => ({ additionalFilePaths: [], requiresFullRefresh: false })),
  } as never;

  public override get _lastDiscoveredFiles(): never {
    return super._lastDiscoveredFiles as never;
  }

  public override set _lastDiscoveredFiles(files: never) {
    super._lastDiscoveredFiles = files;
  }

  public override get _lastDiscoveredDirectories(): string[] {
    return super._lastDiscoveredDirectories;
  }

  public override set _lastDiscoveredDirectories(directories: string[]) {
    super._lastDiscoveredDirectories = directories;
  }

  public override get _lastGitIgnoredPaths(): string[] {
    return super._lastGitIgnoredPaths;
  }

  public override set _lastGitIgnoredPaths(gitIgnoredPaths: string[]) {
    super._lastGitIgnoredPaths = gitIgnoredPaths;
  }

  public override get _lastFileAnalysis(): never {
    return super._lastFileAnalysis as never;
  }

  public override set _lastFileAnalysis(fileAnalysis: never) {
    super._lastFileAnalysis = fileAnalysis;
  }

  public override get _lastFileConnections(): never {
    return super._lastFileConnections as never;
  }

  public override set _lastFileConnections(fileConnections: never) {
    super._lastFileConnections = fileConnections;
  }

  public override get _lastWorkspaceRoot(): string {
    return super._lastWorkspaceRoot;
  }

  public override set _lastWorkspaceRoot(workspaceRoot: string) {
    super._lastWorkspaceRoot = workspaceRoot;
  }

  public override get _lastGraphData(): never {
    return super._lastGraphData as never;
  }

  public override set _lastGraphData(graphData: never) {
    super._lastGraphData = graphData;
  }

  public override get _cache(): never {
    return super._cache as never;
  }

  public override set _cache(cache: never) {
    super._cache = cache;
  }

  _getWorkspaceRoot = vi.fn(() => '/workspace');
  getPluginFilterPatterns = vi.fn(() => ['plugin-filter']);
  _persistCache = vi.fn();
  _persistIndexMetadata = vi.fn(async () => undefined);
  _toWorkspaceRelativePath = vi.fn((root: string, filePath: string) => filePath.replace(`${root}/`, ''));
  _readAnalysisFiles = vi.fn(async () => []);
  _analyzeFiles = vi.fn(async () => ({
    cacheHits: 0,
    cacheMisses: 0,
    fileAnalysis: new Map(),
    fileConnections: new Map(),
  })) as never;
  _buildGraphData = vi.fn(() => ({ nodes: [], edges: [] })) as never;
  _buildGraphDataFromAnalysis = vi.fn(() => ({ nodes: [], edges: [] })) as never;
  analyze = vi.fn(async () => ({ nodes: [], edges: [] })) as never;
  invalidateWorkspaceFiles = vi.fn((filePaths: readonly string[]) => [...filePaths]);
  clearCache = vi.fn(async () => undefined);
}


export function setUpRefreshFacade(): void {
    vi.clearAllMocks();
    vi.mocked(createWorkspacePipelineDiscoveryDependencies).mockReturnValue('discovery-deps' as never);
    vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mockResolvedValue({
      files: [{ absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' }],
      gitIgnoredPaths: ['example-python/app.py'],
    } as never);
    vi.mocked(refreshWorkspacePipelineChangedFiles).mockResolvedValue({
      nodes: [{ id: 'refresh' }],
      edges: [],
    } as never);
    vi.mocked(refreshWorkspacePipelineAnalysisScope).mockResolvedValue({
      nodes: [{ id: 'scope-refresh' }],
      edges: [],
    } as never);
    vi.mocked(refreshWorkspacePipelinePluginFiles).mockResolvedValue({
      nodes: [{ id: 'plugin-refresh' }],
      edges: [],
    } as never);
  }

export {
  fs,
  vscode,
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
  refreshWorkspacePipelineAnalysisScope,
  refreshWorkspacePipelineChangedFiles,
  refreshWorkspacePipelinePluginFiles,
};

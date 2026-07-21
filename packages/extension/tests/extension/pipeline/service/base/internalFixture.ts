import { vi } from 'vitest';
import * as vscode from 'vscode';
import { WorkspacePipelineInternalBase } from '../../../../../src/extension/pipeline/service/base/internal';
import type { Configuration } from '../../../../../src/extension/config/reader';
import type { FileDiscovery } from '@codegraphy-dev/core';
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
  readWorkspacePipelineCurrentCommitSha,
  readWorkspacePipelineCurrentCommitShaSync,
} from '../../../../../src/extension/pipeline/cacheSignatures/commit';
import { createWorkspacePipelinePluginSignature } from '../../../../../src/extension/pipeline/cacheSignatures/plugin';
import { createWorkspacePipelineSettingsSignature } from '../../../../../src/extension/pipeline/cacheSignatures/settings';
import { createWorkspacePipelineAnalysisCacheTiers } from '../../../../../src/extension/pipeline/service/cache/tiers';
import { preAnalyzeCoreTreeSitterFiles } from '@codegraphy-dev/core';

export class TestInternalBase extends WorkspacePipelineInternalBase {
  constructor() {
    super({
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
    this._cache = { files: { 'src/a.ts': { cached: true } } } as unknown as IWorkspaceAnalysisCache;
  }

  _config = {
    get: vi.fn(<T>(key: string, defaultValue: T): T => (
      key === 'nodeVisibility'
        ? { file: true, symbol: false } as T
        : defaultValue
    )),
    getAll: vi.fn(() => ({
      version: 1,
      showOrphans: true,
      respectGitignore: true,
      filterPatterns: [],
      plugins: [],
    })),
  } as unknown as Configuration;

  _registry = {
    list: vi.fn(() => [{ plugin: { id: 'plugin.a' } }]),
  } as unknown as PluginRegistry;

  _discovery = {
    readContent: vi.fn(async file => `contents:${file.absolutePath}`),
  } as unknown as FileDiscovery;

  public override get _cache(): IWorkspaceAnalysisCache {
    return super._cache;
  }

  public override set _cache(cache: IWorkspaceAnalysisCache) {
    super._cache = cache;
  }

  public preAnalyzePlugins(
    files: Array<{ absolutePath: string; relativePath: string }>,
    workspaceRoot: string,
    disabledPlugins?: Set<string>,
  ): Promise<void> {
    return this._preAnalyzePlugins(files as never, workspaceRoot, undefined, disabledPlugins);
  }

  public analyzeFiles(
    files: Array<{ absolutePath: string; relativePath: string }>,
    workspaceRoot: string,
    onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
    disabledPlugins?: Set<string>,
  ) {
    return this._analyzeFiles(files as never, workspaceRoot, onProgress, undefined, undefined, disabledPlugins);
  }

  public buildGraphData(
    fileConnections: Map<string, Array<{ from: string; to: string }>>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins?: Set<string>,
  ) {
    return this._buildGraphData(
      fileConnections as never,
      workspaceRoot,
      showOrphans,
      disabledPlugins,
    );
  }

  public buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, { filePath: string }>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins?: Set<string>,
  ) {
    return this._buildGraphDataFromAnalysis(
      fileAnalysis as never,
      workspaceRoot,
      showOrphans,
      disabledPlugins,
    );
  }

  public setLastDiscoveredDirectories(directoryPaths: string[]): void {
    this._lastDiscoveredDirectories = directoryPaths;
  }

  public setLastGitIgnoredPaths(gitIgnoredPaths: string[]): void {
    this._lastGitIgnoredPaths = gitIgnoredPaths;
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

  public get completeGraphData() {
    return this._completeGraphData;
  }
}


export function setUpInternalBase(): void {
    vi.clearAllMocks();
    vi.mocked(createWorkspacePipelinePluginSignature).mockReturnValue('plugin-signature');
    vi.mocked(createWorkspacePipelineSettingsSignature).mockReturnValue('settings-signature');
    vi.mocked(createWorkspacePipelineAnalysisCacheTiers).mockReturnValue({
      active: ['baseline', 'plugin:plugin.a'],
      completed: ['baseline', 'plugin:plugin.a'],
      required: ['baseline', 'plugin:plugin.a'],
    });
    vi.mocked(readWorkspacePipelineCurrentCommitSha).mockResolvedValue('async-commit-sha');
    vi.mocked(readWorkspacePipelineCurrentCommitShaSync).mockReturnValue('commit-sha');
    vi.mocked(readWorkspacePipelineFileStat).mockResolvedValue({
      mtime: 123,
      size: 456,
    });
    vi.mocked(preAnalyzeCoreTreeSitterFiles).mockResolvedValue(undefined);
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
  }

export {
  vscode,
  readWorkspacePipelineFileStat,
  analyzeWorkspacePipelineDiscoveredFiles,
  preAnalyzeWorkspacePipelinePlugins,
  persistWorkspacePipelineCache,
  buildWorkspacePipelineGraph,
  buildWorkspacePipelineGraphFromAnalysis,
  persistWorkspacePipelineIndexMetadata,
  readWorkspacePipelineAnalysisFiles,
  toWorkspaceRelativePath,
  createWorkspacePipelinePluginSignature,
  readWorkspacePipelineCurrentCommitSha,
  createWorkspacePipelineSettingsSignature,
  readWorkspacePipelineCurrentCommitShaSync,
  createWorkspacePipelineAnalysisCacheTiers,
  preAnalyzeCoreTreeSitterFiles,
};

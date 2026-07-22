import type { IDiscoveredFile } from '@codegraphy-dev/core';
import { vi } from 'vitest';
import * as vscode from 'vscode';
import type { PluginRegistry } from '../../../../src/core/plugins/registry/manager';
import type {
  IFileAnalysisResult,
  IProjectedConnection,
} from '../../../../src/core/plugins/types/contracts';
import type { IWorkspaceAnalysisCache } from '../../../../src/extension/pipeline/cache';
import { readWorkspacePluginStatusContext } from '../../../../src/extension/pipeline/plugins/statusContext';
import {
  invalidateWorkspacePipelineFiles,
  resolveWorkspacePipelinePluginFilePaths,
} from '../../../../src/extension/pipeline/service/cache/invalidation';
import { clearWorkspacePipelineStoredCache } from '../../../../src/extension/pipeline/service/cache/storage';
import { WorkspacePipelineLifecycleFacade } from '../../../../src/extension/pipeline/service/lifecycleFacade';
import {
  getWorkspacePipelinePluginName,
  getWorkspacePipelineStatusList,
} from '../../../../src/extension/pipeline/service/runtime/plugins';

export class TestLifecycleFacade extends WorkspacePipelineLifecycleFacade {
  readonly getWorkspaceRoot = vi.fn<() => string | undefined>(() => '/workspace');
  readonly persistCache = vi.fn();

  constructor() {
    super({
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
    this._cache = { files: {} } as unknown as IWorkspaceAnalysisCache;
    this._lastDiscoveredFiles = [
      { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts', extension: '.ts', name: 'a.ts' },
    ] as unknown as IDiscoveredFile[];
    this._lastFileAnalysis = new Map([['src/a.ts', { id: 'analysis' }]]) as unknown as Map<
      string,
      IFileAnalysisResult
    >;
    this._lastFileConnections = new Map([['src/a.ts', [{ id: 'edge' }]]]) as unknown as Map<
      string,
      IProjectedConnection[]
    >;
    this._lastWorkspaceRoot = '/workspace';
  }

  _registry = {
    list: vi.fn(() => []),
    disposeAll: vi.fn(),
  } as unknown as PluginRegistry;

  public override get _cache(): IWorkspaceAnalysisCache {
    return super._cache;
  }

  public override set _cache(cache: IWorkspaceAnalysisCache) {
    super._cache = cache;
  }

  public override get _lastDiscoveredFiles(): IDiscoveredFile[] {
    return super._lastDiscoveredFiles;
  }

  public override set _lastDiscoveredFiles(files: IDiscoveredFile[]) {
    super._lastDiscoveredFiles = files;
  }

  public override get _lastFileAnalysis(): Map<string, IFileAnalysisResult> {
    return super._lastFileAnalysis;
  }

  public override set _lastFileAnalysis(fileAnalysis: Map<string, IFileAnalysisResult>) {
    super._lastFileAnalysis = fileAnalysis;
  }

  public override get _lastFileConnections(): Map<string, IProjectedConnection[]> {
    return super._lastFileConnections;
  }

  public override set _lastFileConnections(fileConnections: Map<string, IProjectedConnection[]>) {
    super._lastFileConnections = fileConnections;
  }

  public override get _lastWorkspaceRoot(): string {
    return super._lastWorkspaceRoot;
  }

  public override set _lastWorkspaceRoot(workspaceRoot: string) {
    super._lastWorkspaceRoot = workspaceRoot;
  }

  protected override _getWorkspaceRoot(): string | undefined {
    return this.getWorkspaceRoot();
  }

  protected override _persistCache(): void {
    this.persistCache();
  }
}

export function lifecycleState(
  facade: TestLifecycleFacade,
): {
  _lastDiscoveredDirectories: string[];
  _lastDiscoveredFiles: IDiscoveredFile[];
  _registry: {
    list: ReturnType<typeof vi.fn>;
    disposeAll: ReturnType<typeof vi.fn>;
  };
} {
  return facade as unknown as {
    _lastDiscoveredDirectories: string[];
    _lastDiscoveredFiles: IDiscoveredFile[];
    _registry: {
      list: ReturnType<typeof vi.fn>;
      disposeAll: ReturnType<typeof vi.fn>;
    };
  };
}

export function setUpLifecycleFacade(): void {
  vi.clearAllMocks();
  vi.mocked(clearWorkspacePipelineStoredCache).mockReturnValue({
    files: { 'src/a.ts': { cached: true } },
  } as never);
  vi.mocked(getWorkspacePipelineStatusList).mockReturnValue([{ id: 'plugin.a' }] as never);
  vi.mocked(getWorkspacePipelinePluginName).mockReturnValue('TypeScript');
  vi.mocked(readWorkspacePluginStatusContext).mockReturnValue({
    installedPlugins: [
      {
        package: '@codegraphy-dev/plugin-vue',
        version: '2.0.0',
        id: 'codegraphy.vue',
        host: 'core',
        entry: './dist/plugin.js',
        apiVersion: '^4.0.0',
        packageRoot: '/global/node_modules/@codegraphy-dev/plugin-vue',
        globallyEnabled: false,
      },
    ],
    workspaceEnabledPluginIds: new Set(['codegraphy.vue']),
  });
  vi.mocked(invalidateWorkspacePipelineFiles).mockReturnValue(['src/a.ts']);
  vi.mocked(resolveWorkspacePipelinePluginFilePaths).mockReturnValue(['/workspace/src/a.ts']);
}

export {
  vscode,
  clearWorkspacePipelineStoredCache,
  invalidateWorkspacePipelineFiles,
  resolveWorkspacePipelinePluginFilePaths,
  getWorkspacePipelinePluginName,
  getWorkspacePipelineStatusList,
  readWorkspacePluginStatusContext,
};

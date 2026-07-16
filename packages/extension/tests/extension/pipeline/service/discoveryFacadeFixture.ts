import { vi } from 'vitest';
import * as vscode from 'vscode';
import { spawnSync } from 'node:child_process';
import { WorkspacePipelineDiscoveryFacade } from '../../../../src/extension/pipeline/service/discoveryFacade';
import type { Configuration } from '../../../../src/extension/config/reader';
import type { FileDiscovery } from '@codegraphy-dev/core';
import type { PluginRegistry } from '../../../../src/core/plugins/registry/manager';
import type { IWorkspaceAnalysisCache } from '../../../../src/extension/pipeline/cache';
import type { IDiscoveredFile } from '@codegraphy-dev/core';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from '../../../../src/extension/pipeline/service/runtime/discovery';
import {
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
  syncWorkspacePipelinePlugins,
} from '../../../../src/extension/pipeline/plugins/bootstrap';
import { hasWorkspacePipelineIndex } from '../../../../src/extension/pipeline/service/cache/index';
import {
  analyzeWorkspacePipeline,
  rebuildWorkspacePipelineGraph,
} from '../../../../src/extension/pipeline/service/runtime/run';

export function createDeferred<T = void>(): {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

export class TestDiscoveryFacade extends WorkspacePipelineDiscoveryFacade {
  readonly getWorkspaceRoot = vi.fn<() => string | undefined>(() => '/workspace');
  readonly clearCache = vi.fn();

  constructor() {
    super({
      extensionUri: {
        fsPath: '/extension',
      },
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
    this._cache = { files: {} } as unknown as IWorkspaceAnalysisCache;
  }

  _config = {
    get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
    getAll: vi.fn(() => ({ showOrphans: true, respectGitignore: true })),
  } as unknown as Configuration;

  _discovery = { kind: 'discovery' } as unknown as FileDiscovery;
  _registry = {
    id: 'registry',
    list: vi.fn(() => []),
    disposeAll: vi.fn(),
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
}


export const discoveryState = (
    facade: TestDiscoveryFacade,
  ): {
    _lastDiscoveredDirectories: string[];
    _lastDiscoveredFiles: IDiscoveredFile[];
    _lastGitIgnoredPaths: string[];
    _lastWorkspaceRoot: string;
  } => facade as unknown as {
    _lastDiscoveredDirectories: string[];
    _lastDiscoveredFiles: IDiscoveredFile[];
    _lastGitIgnoredPaths: string[];
    _lastWorkspaceRoot: string;
  };

export function setUpDiscoveryFacade(): void {
    vi.clearAllMocks();
    vi.mocked(spawnSync).mockReturnValue({
      error: undefined,
      status: 1,
      stdout: '',
    } as never);
    vi.mocked(createWorkspacePipelineDiscoveryDependencies).mockReturnValue('discovery-deps' as never);
    vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mockResolvedValue({
      directories: ['src/new-folder'],
      files: [
        { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
        { absolutePath: '/workspace/src/b.ts', relativePath: 'src/b.ts' },
      ],
      gitIgnoredPaths: ['example-python/app.py'],
    } as never);
    vi.mocked(getWorkspacePipelinePluginFilterPatterns).mockReturnValue(['plugin-filter']);
    vi.mocked(syncWorkspacePipelinePlugins).mockResolvedValue(undefined);
    vi.mocked(hasWorkspacePipelineIndex).mockReturnValue(true);
    vi.mocked(analyzeWorkspacePipeline).mockResolvedValue({
      nodes: [{ id: 'analysis', label: 'Analysis', color: '#111111' }],
      edges: [],
    });
    vi.mocked(rebuildWorkspacePipelineGraph).mockReturnValue({
      nodes: [{ id: 'rebuild', label: 'Rebuild', color: '#222222' }],
      edges: [],
    });
  }

export {
  vscode,
  spawnSync,
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
  syncWorkspacePipelinePlugins,
  hasWorkspacePipelineIndex,
  analyzeWorkspacePipeline,
  rebuildWorkspacePipelineGraph,
};
export type { FileDiscovery, PluginRegistry };

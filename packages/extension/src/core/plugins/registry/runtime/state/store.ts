import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IPluginInfo } from '../../../types/contracts';
import {
  replayReadinessForPlugin as lifecycleReplayReadiness,
} from '../../../lifecycle/replay';
import type {
  CoreFileAnalysisResultProvider,
} from '../../../routing/router/analyze';
import type { IPluginGraphScopeCapabilities } from '../../../types/contracts';

export type CoreGraphScopeCapabilitiesProvider = (
  filePaths?: readonly string[],
) => Required<IPluginGraphScopeCapabilities>;

export type IPluginInfoV2 = IPluginInfo;

export abstract class PluginRegistryState {
  protected readonly _plugins = new Map<string, IPluginInfoV2>();
  protected readonly _extensionMap = new Map<string, string[]>();
  protected readonly _initializedPlugins = new Set<IPluginInfoV2>();
  protected readonly _initializingPlugins = new Map<IPluginInfoV2, Promise<boolean>>();
  private readonly _pendingPluginUnloads = new Set<() => void>();
  private _activePluginOperations = 0;
  protected _lastWorkspaceReadyGraph?: IGraphData;
  protected _workspaceReadyNotified = false;
  protected _coreAnalyzeFileResult?: CoreFileAnalysisResultProvider;
  protected _coreGraphScopeCapabilitiesProvider?: CoreGraphScopeCapabilitiesProvider;

  protected _replayReadinessForPlugin(info: IPluginInfoV2): void {
    lifecycleReplayReadiness(
      info,
      this._workspaceReadyNotified,
      this._lastWorkspaceReadyGraph,
    );
  }

  protected async _runPluginOperation<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    this._activePluginOperations += 1;
    try {
      return await operation();
    } finally {
      this._releasePluginOperation();
    }
  }

  protected _runPluginOperationSync<TResult>(operation: () => TResult): TResult {
    this._activePluginOperations += 1;
    try {
      return operation();
    } finally {
      this._releasePluginOperation();
    }
  }

  protected _queuePluginUnload(
    unload: () => void,
    initialization: Promise<boolean> | undefined,
  ): void {
    if (initialization) {
      void initialization.then(
        () => this._queueSettledPluginUnload(unload),
        () => this._queueSettledPluginUnload(unload),
      );
      return;
    }
    this._queueSettledPluginUnload(unload);
  }

  private _releasePluginOperation(): void {
    this._activePluginOperations -= 1;
    if (this._activePluginOperations !== 0) {
      return;
    }
    for (const unload of this._pendingPluginUnloads) unload();
    this._pendingPluginUnloads.clear();
  }

  private _queueSettledPluginUnload(unload: () => void): void {
    if (this._activePluginOperations > 0) {
      this._pendingPluginUnloads.add(unload);
      return;
    }
    unload();
  }
}

import type { EventBus } from '../events/bus';
import type { CodeGraphyAPIImpl } from '../api/instance';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { IPluginInfo } from '../types/contracts';
import { DEFAULT_LOG_FN } from './configure';
import type { RegistryV2Config } from './register';
import {
  replayReadinessForPlugin as lifecycleReplayReadiness,
} from '../lifecycle/replay';
import type {
  CoreFileAnalysisResultProvider,
} from '../routing/router/analyze';

export interface IPluginInfoV2 extends IPluginInfo {
  api?: CodeGraphyAPIImpl;
}

export abstract class PluginRegistryState {
  protected readonly _plugins = new Map<string, IPluginInfoV2>();
  protected readonly _extensionMap = new Map<string, string[]>();
  protected readonly _initializedPlugins = new Set<string>();
  protected _eventBus?: EventBus;
  protected _v2Config: RegistryV2Config = { logFn: DEFAULT_LOG_FN };
  protected _lastWorkspaceReadyGraph?: IGraphData;
  protected _workspaceReadyNotified = false;
  protected _webviewReadyNotified = false;
  protected _coreAnalyzeFileResult?: CoreFileAnalysisResultProvider;

  protected _replayReadinessForPlugin(info: IPluginInfoV2): void {
    lifecycleReplayReadiness(
      info,
      this._workspaceReadyNotified,
      this._lastWorkspaceReadyGraph,
      this._webviewReadyNotified,
    );
  }
}

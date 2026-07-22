import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IPluginAnalysisContext } from '../../../types/contracts';
import {
  initializeAll as lifecycleInitializeAll,
  initializePlugin as lifecycleInitializePlugin,
} from '../../../lifecycle/initialize';
import {
  notifyGraphRebuild as lifecycleNotifyGraphRebuild,
  notifyPostAnalyze as lifecycleNotifyPostAnalyze,
  notifyPreAnalyze as lifecycleNotifyPreAnalyze,
} from '../../../lifecycle/notify/analysis';
import { notifyWorkspaceReady as lifecycleNotifyWorkspaceReady } from '../../../lifecycle/notify/readiness';
import { notifyFilesChanged as lifecycleNotifyFilesChanged } from '../../../lifecycle/notify/filesChanged';
import { PluginRegistryCollection } from './collection';

export abstract class PluginRegistryLifecycle extends PluginRegistryCollection {
  async initializeAll(workspaceRoot: string): Promise<void> {
    this._v2Config.workspaceRoot = workspaceRoot;
    await lifecycleInitializeAll(
      this._plugins,
      workspaceRoot,
      this._initializedPlugins,
    );
  }

  async initializePlugin(pluginId: string, workspaceRoot: string): Promise<void> {
    this._v2Config.workspaceRoot = workspaceRoot;
    const info = this._plugins.get(pluginId);
    if (!info) {
      return;
    }

    await lifecycleInitializePlugin(info, workspaceRoot, this._initializedPlugins);
  }

  notifyWorkspaceReady(graph: IGraphData, disabledPlugins: ReadonlySet<string> = new Set()): void {
    this._workspaceReadyNotified = true;
    this._lastWorkspaceReadyGraph = graph;
    lifecycleNotifyWorkspaceReady(this._plugins, graph, disabledPlugins);
  }

  async notifyPreAnalyze(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string,
    analysisContext?: IPluginAnalysisContext,
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): Promise<void> {
    await lifecycleNotifyPreAnalyze(this._plugins, files, workspaceRoot, analysisContext, disabledPlugins);
  }

  async notifyFilesChanged(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string,
    analysisContext?: IPluginAnalysisContext,
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): Promise<{ additionalFilePaths: string[]; requiresFullRefresh: boolean }> {
    return lifecycleNotifyFilesChanged(this._plugins, files, workspaceRoot, analysisContext, disabledPlugins);
  }

  notifyPostAnalyze(graph: IGraphData, disabledPlugins: ReadonlySet<string> = new Set()): void {
    this._lastWorkspaceReadyGraph = graph;
    lifecycleNotifyPostAnalyze(this._plugins, graph, disabledPlugins);
  }

  notifyGraphRebuild(graph: IGraphData, disabledPlugins: ReadonlySet<string> = new Set()): void {
    this._lastWorkspaceReadyGraph = graph;
    lifecycleNotifyGraphRebuild(this._plugins, graph, disabledPlugins);
  }

}

import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IPluginAnalysisContext } from '../../../types/contracts';
import { initializePlugin as lifecycleInitializePlugin } from '../../../lifecycle/initialize';
import {
  notifyGraphRebuild as lifecycleNotifyGraphRebuild,
  notifyPostAnalyze as lifecycleNotifyPostAnalyze,
  notifyPreAnalyze as lifecycleNotifyPreAnalyze,
} from '../../../lifecycle/notify/analysis';
import { notifyWorkspaceReady as lifecycleNotifyWorkspaceReady } from '../../../lifecycle/notify/readiness';
import { notifyFilesChanged as lifecycleNotifyFilesChanged } from '../../../lifecycle/notify/filesChanged';
import { PluginRegistryCollection } from './collection';

export abstract class PluginRegistryLifecycle extends PluginRegistryCollection {
  abstract unregister(pluginId: string): boolean;

  async initializeAll(workspaceRoot: string): Promise<void> {
    await Promise.all(
      [...this._plugins.keys()].map(pluginId => this.initializePlugin(pluginId, workspaceRoot)),
    );
  }

  async initializePlugin(pluginId: string, workspaceRoot: string): Promise<void> {
    const info = this._plugins.get(pluginId);
    if (!info || this._initializedPlugins.has(info)) {
      return;
    }

    let initialization = this._initializingPlugins.get(info);
    const ownsInitialization = !initialization;
    if (!initialization) {
      initialization = lifecycleInitializePlugin(
        info,
        workspaceRoot,
        this._initializedPlugins,
      );
      this._initializingPlugins.set(info, initialization);
    }

    const initialized = await initialization;
    if (this._initializingPlugins.get(info) === initialization) {
      this._initializingPlugins.delete(info);
    }
    if (!initialized && this._plugins.get(pluginId) === info) {
      this.unregister(pluginId);
      return;
    }
    if (initialized && ownsInitialization && this._plugins.get(pluginId) === info) {
      this._runPluginOperationSync(() => this._replayReadinessForPlugin(info));
    }
  }

  notifyWorkspaceReady(graph: IGraphData, disabledPlugins: ReadonlySet<string> = new Set()): void {
    this._workspaceReadyNotified = true;
    this._lastWorkspaceReadyGraph = graph;
    this._runPluginOperationSync(() => (
      lifecycleNotifyWorkspaceReady(this._plugins, graph, disabledPlugins)
    ));
  }

  async notifyPreAnalyze(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string,
    analysisContext?: IPluginAnalysisContext,
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): Promise<void> {
    await this._runPluginOperation(() => (
      lifecycleNotifyPreAnalyze(this._plugins, files, workspaceRoot, analysisContext, disabledPlugins)
    ));
  }

  async notifyFilesChanged(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string,
    analysisContext?: IPluginAnalysisContext,
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): Promise<{ additionalFilePaths: string[]; requiresFullRefresh: boolean }> {
    return this._runPluginOperation(() => (
      lifecycleNotifyFilesChanged(this._plugins, files, workspaceRoot, analysisContext, disabledPlugins)
    ));
  }

  notifyPostAnalyze(graph: IGraphData, disabledPlugins: ReadonlySet<string> = new Set()): void {
    this._lastWorkspaceReadyGraph = graph;
    this._runPluginOperationSync(() => (
      lifecycleNotifyPostAnalyze(this._plugins, graph, disabledPlugins)
    ));
  }

  notifyGraphRebuild(graph: IGraphData, disabledPlugins: ReadonlySet<string> = new Set()): void {
    this._lastWorkspaceReadyGraph = graph;
    this._runPluginOperationSync(() => (
      lifecycleNotifyGraphRebuild(this._plugins, graph, disabledPlugins)
    ));
  }

}

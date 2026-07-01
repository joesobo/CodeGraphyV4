import type { IPluginFilterPatternGroup } from '../../../shared/protocol/extensionToWebview';
import { hasWorkspacePipelineIndex } from './cache/index';
import { WorkspacePipelineInternalBase } from './base/internal';
import { getWorkspacePipelineIndexStatus } from './indexStatus';
import {
  getEffectiveCustomFilterPatterns,
  getEffectivePluginFilterPatterns,
  getPipelinePluginFilterGroups,
  getPipelinePluginFilterPatterns,
  initializeWorkspacePipelinePlugins,
  queueWorkspacePipelinePluginReload,
  queueWorkspacePipelinePluginSync,
} from './pluginState';

export abstract class WorkspacePipelinePluginFacade extends WorkspacePipelineInternalBase {
  private _workspacePluginReloadQueue: Promise<void> = Promise.resolve();

  async initialize(): Promise<void> {
    await initializeWorkspacePipelinePlugins(
      this._registry,
      () => this._getWorkspaceRoot(),
      this._context.extensionUri.fsPath,
    );

    console.log('[CodeGraphy] WorkspacePipeline initialized');
  }

  async reloadWorkspacePlugins(): Promise<void> {
    const { reload, nextQueue } = queueWorkspacePipelinePluginReload(
      this._workspacePluginReloadQueue,
      this._registry,
      () => this.initialize(),
    );
    this._workspacePluginReloadQueue = nextQueue;
    return reload;
  }

  async syncWorkspacePlugins(): Promise<void> {
    const { sync, nextQueue } = queueWorkspacePipelinePluginSync(
      this._workspacePluginReloadQueue,
      this._registry,
      () => this._getWorkspaceRoot(),
      this._context.extensionUri.fsPath,
    );
    this._workspacePluginReloadQueue = nextQueue;
    return sync;
  }

  getPluginFilterPatterns(
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): string[] {
    return getPipelinePluginFilterPatterns(this._registry, disabledPlugins);
  }

  getPluginFilterGroups(
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): IPluginFilterPatternGroup[] {
    return getPipelinePluginFilterGroups(this._registry, disabledPlugins);
  }

  protected _getEffectiveCustomFilterPatterns(filterPatterns: string[]): string[] {
    return getEffectiveCustomFilterPatterns(this._config, filterPatterns);
  }

  protected _getEffectivePluginFilterPatterns(disabledPlugins: ReadonlySet<string>): string[] {
    return getEffectivePluginFilterPatterns(this._registry, this._config, disabledPlugins);
  }

  hasIndex(): boolean {
    return hasWorkspacePipelineIndex(this._getWorkspaceRoot());
  }

  getIndexStatus(): { freshness: 'fresh' | 'stale' | 'missing'; detail: string } {
    return getWorkspacePipelineIndexStatus({
      hasIndex: () => this.hasIndex(),
      pluginSignature: this._getPluginSignature(),
      settingsSignature: this._getSettingsSignature(),
      workspaceRoot: this._getWorkspaceRoot(),
    });
  }
}

/**
 * @fileoverview Plugin lifecycle management extracted from PluginRegistry.
 * Handles initialization and readiness notification for plugins.
 * @module core/plugins/pluginLifecycle
 */

import { IGraphData } from '../../shared/types';
import { IPluginInfo } from './types';
import { CodeGraphyAPIImpl } from './CodeGraphyAPI';

/** Minimal shape of a plugin info record that lifecycle functions require. */
export interface IPluginInfoWithApi extends IPluginInfo {
  /** Scoped API instance (optional). */
  api?: CodeGraphyAPIImpl;
}

/** Shared readiness state tracked across lifecycle calls. */
export interface IReadinessState {
  workspaceReadyNotified: boolean;
  webviewReadyNotified: boolean;
  lastWorkspaceReadyGraph?: IGraphData;
}

/**
 * Initializes all registered plugins.
 *
 * @param plugins - The plugins map
 * @param initializedPlugins - Set tracking which plugins have been initialized
 * @param workspaceRoot - Workspace root path
 */
export async function initializeAll(
  plugins: ReadonlyMap<string, IPluginInfoWithApi>,
  initializedPlugins: Set<string>,
  workspaceRoot: string
): Promise<void> {
  const promises = Array.from(plugins.values()).map((info) =>
    initializePlugin(info, initializedPlugins, workspaceRoot)
  );
  await Promise.all(promises);
}

/**
 * Initializes one plugin if it has not already been initialized.
 *
 * @param info - The plugin info record
 * @param initializedPlugins - Set tracking which plugins have been initialized
 * @param workspaceRoot - Workspace root path
 */
export async function initializePlugin(
  info: IPluginInfoWithApi,
  initializedPlugins: Set<string>,
  workspaceRoot: string
): Promise<void> {
  const pluginId = info.plugin.id;
  if (initializedPlugins.has(pluginId)) return;
  initializedPlugins.add(pluginId);

  if (!info.plugin.initialize) {
    return;
  }

  try {
    await info.plugin.initialize(workspaceRoot);
  } catch (error) {
    initializedPlugins.delete(pluginId);
    console.error(`[CodeGraphy] Error initializing plugin ${pluginId}:`, error);
  }
}

/**
 * Notify all plugins that the workspace is ready with initial graph data.
 *
 * @param plugins - The plugins map
 * @param state - Mutable readiness state
 * @param graph - The initial graph data
 */
export function notifyWorkspaceReady(
  plugins: ReadonlyMap<string, IPluginInfoWithApi>,
  state: IReadinessState,
  graph: IGraphData
): void {
  state.workspaceReadyNotified = true;
  state.lastWorkspaceReadyGraph = graph;
  for (const info of plugins.values()) {
    notifyWorkspaceReadyForPlugin(info, graph);
  }
}

/**
 * Notify all plugins before an analysis pass.
 */
export async function notifyPreAnalyze(
  plugins: ReadonlyMap<string, IPluginInfoWithApi>,
  files: Array<{ absolutePath: string; relativePath: string; content: string }>,
  workspaceRoot: string
): Promise<void> {
  for (const info of plugins.values()) {
    if (info.plugin.onPreAnalyze) {
      try {
        await info.plugin.onPreAnalyze(files, workspaceRoot);
      } catch (error) {
        console.error(`[CodeGraphy] Error in onPreAnalyze for ${info.plugin.id}:`, error);
      }
    }
  }
}

/**
 * Notify all plugins after an analysis pass.
 */
export function notifyPostAnalyze(
  plugins: ReadonlyMap<string, IPluginInfoWithApi>,
  state: IReadinessState,
  graph: IGraphData
): void {
  state.lastWorkspaceReadyGraph = graph;
  for (const info of plugins.values()) {
    if (info.plugin.onPostAnalyze) {
      try {
        info.plugin.onPostAnalyze(graph);
      } catch (error) {
        console.error(`[CodeGraphy] Error in onPostAnalyze for ${info.plugin.id}:`, error);
      }
    }
  }
}

/**
 * Notify all plugins that the graph was rebuilt without re-analysis.
 */
export function notifyGraphRebuild(
  plugins: ReadonlyMap<string, IPluginInfoWithApi>,
  state: IReadinessState,
  graph: IGraphData
): void {
  state.lastWorkspaceReadyGraph = graph;
  for (const info of plugins.values()) {
    if (info.plugin.onGraphRebuild) {
      try {
        info.plugin.onGraphRebuild(graph);
      } catch (error) {
        console.error(`[CodeGraphy] Error in onGraphRebuild for ${info.plugin.id}:`, error);
      }
    }
  }
}

/**
 * Notify all plugins that the webview is ready.
 */
export function notifyWebviewReady(
  plugins: ReadonlyMap<string, IPluginInfoWithApi>,
  state: IReadinessState
): void {
  state.webviewReadyNotified = true;
  for (const info of plugins.values()) {
    notifyWebviewReadyForPlugin(info);
  }
}

/**
 * Replays readiness hooks for a late-registered plugin.
 */
export function replayReadinessForPlugin(
  info: IPluginInfoWithApi,
  state: IReadinessState
): void {
  if (state.workspaceReadyNotified && state.lastWorkspaceReadyGraph) {
    notifyWorkspaceReadyForPlugin(info, state.lastWorkspaceReadyGraph);
  }
  if (state.webviewReadyNotified) {
    notifyWebviewReadyForPlugin(info);
  }
}

/**
 * Safely invokes onWorkspaceReady for one plugin.
 */
export function notifyWorkspaceReadyForPlugin(info: IPluginInfoWithApi, graph: IGraphData): void {
  if (!info.plugin.onWorkspaceReady) return;
  try {
    info.plugin.onWorkspaceReady(graph);
  } catch (error) {
    console.error(`[CodeGraphy] Error in onWorkspaceReady for ${info.plugin.id}:`, error);
  }
}

/**
 * Safely invokes onWebviewReady for one plugin.
 */
export function notifyWebviewReadyForPlugin(info: IPluginInfoWithApi): void {
  if (!info.plugin.onWebviewReady) return;
  try {
    info.plugin.onWebviewReady();
  } catch (error) {
    console.error(`[CodeGraphy] Error in onWebviewReady for ${info.plugin.id}:`, error);
  }
}

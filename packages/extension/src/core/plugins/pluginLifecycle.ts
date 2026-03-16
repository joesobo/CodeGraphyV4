/**
 * @fileoverview Lifecycle notification helpers for the plugin registry.
 * Extracted pure lifecycle functions that operate on plugin info maps.
 * @module core/plugins/pluginLifecycle
 */

import { IPlugin } from './types';
import { IGraphData } from '../../shared/types';

/** Minimal plugin info subset needed for lifecycle operations. */
export interface ILifecyclePluginInfo {
  plugin: IPlugin;
}

/**
 * Initializes all registered plugins.
 */
export async function initializeAll(
  plugins: Map<string, ILifecyclePluginInfo>,
  workspaceRoot: string,
  initializedSet: Set<string>,
): Promise<void> {
  const promises = Array.from(plugins.values()).map((info) =>
    initializePlugin(info, workspaceRoot, initializedSet),
  );
  await Promise.all(promises);
}

/**
 * Initializes a single plugin if not already initialized.
 */
export async function initializePlugin(
  info: ILifecyclePluginInfo,
  workspaceRoot: string,
  initializedSet: Set<string>,
): Promise<void> {
  const pluginId = info.plugin.id;
  if (initializedSet.has(pluginId)) return;
  initializedSet.add(pluginId);

  if (!info.plugin.initialize) {
    return;
  }

  try {
    await info.plugin.initialize(workspaceRoot);
  } catch (error) {
    initializedSet.delete(pluginId);
    console.error(`[CodeGraphy] Error initializing plugin ${pluginId}:`, error);
  }
}

/**
 * Notifies all plugins that the workspace is ready with initial graph data.
 */
export function notifyWorkspaceReady(
  plugins: Map<string, ILifecyclePluginInfo>,
  graph: IGraphData,
): void {
  for (const info of plugins.values()) {
    notifyWorkspaceReadyForPlugin(info, graph);
  }
}

/**
 * Notifies all plugins before an analysis pass.
 */
export async function notifyPreAnalyze(
  plugins: Map<string, ILifecyclePluginInfo>,
  files: Array<{ absolutePath: string; relativePath: string; content: string }>,
  workspaceRoot: string,
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
 * Notifies all plugins after an analysis pass.
 */
export function notifyPostAnalyze(
  plugins: Map<string, ILifecyclePluginInfo>,
  graph: IGraphData,
): void {
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
 * Notifies all plugins that the graph was rebuilt without re-analysis.
 */
export function notifyGraphRebuild(
  plugins: Map<string, ILifecyclePluginInfo>,
  graph: IGraphData,
): void {
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
 * Notifies all plugins that the webview is ready.
 */
export function notifyWebviewReady(
  plugins: Map<string, ILifecyclePluginInfo>,
): void {
  for (const info of plugins.values()) {
    notifyWebviewReadyForPlugin(info);
  }
}

/**
 * Safely invokes onWorkspaceReady for one plugin.
 */
export function notifyWorkspaceReadyForPlugin(
  info: ILifecyclePluginInfo,
  graph: IGraphData,
): void {
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
export function notifyWebviewReadyForPlugin(info: ILifecyclePluginInfo): void {
  if (!info.plugin.onWebviewReady) return;
  try {
    info.plugin.onWebviewReady();
  } catch (error) {
    console.error(`[CodeGraphy] Error in onWebviewReady for ${info.plugin.id}:`, error);
  }
}

/**
 * Replays readiness hooks for a late-registered plugin.
 */
export function replayReadinessForPlugin(
  info: ILifecyclePluginInfo,
  workspaceReadyNotified: boolean,
  lastWorkspaceReadyGraph: IGraphData | undefined,
  webviewReadyNotified: boolean,
): void {
  if (workspaceReadyNotified && lastWorkspaceReadyGraph) {
    notifyWorkspaceReadyForPlugin(info, lastWorkspaceReadyGraph);
  }
  if (webviewReadyNotified) {
    notifyWebviewReadyForPlugin(info);
  }
}

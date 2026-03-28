/**
 * @fileoverview Plugin lifecycle notification functions.
 * @module core/plugins/lifecycleNotify
 */

import type { IGraphData } from '../../shared/contracts';
import type { ILifecyclePluginInfo } from './lifecycleTypes';

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

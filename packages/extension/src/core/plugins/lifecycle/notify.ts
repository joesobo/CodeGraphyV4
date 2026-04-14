/**
 * @fileoverview Plugin lifecycle notification functions.
 * @module core/plugins/lifecycle/notify
 */

import type { IGraphData } from '../../../shared/graph/types';
import type { ILifecyclePluginInfo } from './contracts';

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

export interface IPluginFilesChangedResult {
  additionalFilePaths: string[];
  requiresFullRefresh: boolean;
}

export async function notifyFilesChanged(
  plugins: Map<string, ILifecyclePluginInfo>,
  files: Array<{ absolutePath: string; relativePath: string; content: string }>,
  workspaceRoot: string,
): Promise<IPluginFilesChangedResult> {
  const additionalFilePaths = new Set<string>();
  let requiresFullRefresh = false;

  for (const info of plugins.values()) {
    const pluginFiles = files.filter((file) => {
      if (info.plugin.supportedExtensions.includes('*')) {
        return true;
      }

      return info.plugin.supportedExtensions.some((extension) =>
        file.relativePath.toLowerCase().endsWith(extension.toLowerCase()),
      );
    });

    if (pluginFiles.length === 0) {
      continue;
    }

    if (!info.plugin.onFilesChanged) {
      if (info.plugin.onPreAnalyze) {
        requiresFullRefresh = true;
      }
      continue;
    }

    try {
      const nextPaths = await info.plugin.onFilesChanged(pluginFiles, workspaceRoot);
      for (const filePath of nextPaths ?? []) {
        if (typeof filePath === 'string' && filePath.length > 0) {
          additionalFilePaths.add(filePath);
        }
      }
    } catch (error) {
      console.error(`[CodeGraphy] Error in onFilesChanged for ${info.plugin.id}:`, error);
      requiresFullRefresh = true;
    }
  }

  return {
    additionalFilePaths: [...additionalFilePaths],
    requiresFullRefresh,
  };
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

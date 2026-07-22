/**
 * @fileoverview Plugin initialization lifecycle functions.
 * @module core/plugins/lifecycle/initialize
 */

import type { ILifecyclePluginInfo } from './contracts';
import { createWorkspacePluginAnalysisContext } from '../context/workspace';

/**
 * Initializes all registered plugins.
 */
export async function initializeAll(
  plugins: Map<string, ILifecyclePluginInfo>,
  workspaceRoot: string,
  initializedSet: Set<string>,
): Promise<string[]> {
  const results = await Promise.all(
    Array.from(plugins.values()).map(async (info) => ({
      pluginId: info.plugin.id,
      initialized: await initializePlugin(info, workspaceRoot, initializedSet),
    })),
  );
  return results.filter(result => !result.initialized).map(result => result.pluginId);
}

/**
 * Initializes a single plugin if not already initialized.
 */
export async function initializePlugin(
  info: ILifecyclePluginInfo,
  workspaceRoot: string,
  initializedSet: Set<string>,
): Promise<boolean> {
  const pluginId = info.plugin.id;
  if (initializedSet.has(pluginId)) return true;
  initializedSet.add(pluginId);

  if (!info.plugin.initialize) {
    return true;
  }

  try {
    await info.plugin.initialize(
      workspaceRoot,
      createWorkspacePluginAnalysisContext(workspaceRoot, { pluginOptions: info.options }),
    );
    return true;
  } catch (error) {
    initializedSet.delete(pluginId);
    console.error(`[CodeGraphy] Error initializing plugin ${pluginId}:`, error);
    return false;
  }
}

/**
 * @fileoverview Plugin initialization lifecycle functions.
 * @module core/plugins/lifecycle/initialize
 */

import type { ILifecyclePluginInfo } from './contracts';

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

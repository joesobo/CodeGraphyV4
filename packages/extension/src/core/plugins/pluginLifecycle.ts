/**
 * @fileoverview Lifecycle notification helpers for the plugin registry.
 * @module core/plugins/pluginLifecycle
 */

export type { ILifecyclePluginInfo } from './lifecycleTypes';
export { initializeAll, initializePlugin } from './lifecycleInit';
export {
  notifyWorkspaceReady,
  notifyPreAnalyze,
  notifyPostAnalyze,
  notifyGraphRebuild,
  notifyWebviewReady,
  notifyWorkspaceReadyForPlugin,
  notifyWebviewReadyForPlugin,
} from './lifecycleNotify';
export { replayReadinessForPlugin } from './lifecycleReplay';

/**
 * @fileoverview Plugin lifecycle notification functions.
 * @module core/plugins/lifecycle/notify
 */

export {
  notifyGraphRebuild,
  notifyPostAnalyze,
  notifyPreAnalyze,
} from './notify/analysis';
export {
  notifyFilesChanged,
  type IPluginFilesChangedResult,
} from './notify/filesChanged';
export {
  notifyWebviewReady,
  notifyWebviewReadyForPlugin,
  notifyWorkspaceReady,
  notifyWorkspaceReadyForPlugin,
} from './notify/readiness';

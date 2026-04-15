/**
 * @fileoverview Pure file-routing functions for the plugin registry.
 * Determines which plugin handles a given file based on extension maps.
 * @module core/plugins/routing/router
 */

export {
  getPluginForFile,
  getPluginsForExtension,
  getSupportedExtensions,
  supportsFile,
  type IRoutablePluginInfo,
} from './router/lookups';
export {
  analyzeFile,
  analyzeFileResult,
  type CoreFileAnalysisResultProvider,
} from './router/analyze';

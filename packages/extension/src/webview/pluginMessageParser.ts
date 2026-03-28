/**
 * @fileoverview Re-exports for plugin message parsing.
 * @module webview/pluginMessageParser
 */

export type { PluginInjectPayload, PluginScopedMessage } from './pluginMessageValidation';
export { normalizePluginInjectPayload, parsePluginScopedMessage } from './pluginMessageValidation';
export type { PluginWebviewModule } from './pluginModuleResolver';
export { resolvePluginModuleActivator } from './pluginModuleResolver';

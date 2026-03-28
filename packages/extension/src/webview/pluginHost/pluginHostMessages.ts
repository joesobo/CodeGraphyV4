/**
 * @fileoverview Message delivery for plugin host.
 * @module webview/pluginHost/pluginHostMessages
 */

/**
 * Deliver a message from the extension to a specific plugin's handlers.
 */
export function deliverPluginMessage(
  pluginId: string,
  msg: { type: string; data: unknown },
  messageHandlers: Map<string, Set<(msg: { type: string; data: unknown }) => void>>,
): void {
  const handlers = messageHandlers.get(pluginId);
  if (handlers) {
    for (const handler of handlers) {
      try {
        handler(msg);
      } catch (e) {
        console.error(`[CG] Plugin ${pluginId} message handler error:`, e);
      }
    }
  }
}

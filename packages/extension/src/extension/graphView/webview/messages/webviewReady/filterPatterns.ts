import type { ExtensionToWebviewMessage } from '../../../../../shared/protocol/extensionToWebview';
import type { GraphViewReadyHandlers } from './contracts';

type FilterPatternsUpdatedMessage = Extract<
  ExtensionToWebviewMessage,
  { type: 'FILTER_PATTERNS_UPDATED' }
>;
export type FilterPatternsPayload = FilterPatternsUpdatedMessage['payload'];

export function createWebviewReadyFilterPatternsPayload(
  handlers: GraphViewReadyHandlers,
): FilterPatternsPayload {
  return {
    patterns: handlers.getFilterPatterns(),
    pluginPatterns: handlers.getPluginFilterPatterns(),
    pluginPatternGroups: handlers.getPluginFilterGroups?.() ?? [],
    disabledCustomPatterns: handlers.getConfig('disabledCustomFilterPatterns', []),
    disabledPluginPatterns: handlers.getConfig('disabledPluginFilterPatterns', []),
  };
}

export function sendWebviewReadyFilterPatterns(
  handlers: GraphViewReadyHandlers,
): FilterPatternsPayload {
  const payload = createWebviewReadyFilterPatternsPayload(handlers);
  handlers.sendMessage({
    type: 'FILTER_PATTERNS_UPDATED',
    payload,
  });
  return payload;
}

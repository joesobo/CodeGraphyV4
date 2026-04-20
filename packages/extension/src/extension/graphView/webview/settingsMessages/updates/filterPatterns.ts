import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../router';

export async function applyFilterPatternsUpdate(
  message: Extract<WebviewToExtensionMessage, { type: 'UPDATE_FILTER_PATTERNS' }>,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  state.filterPatterns = message.payload.patterns;
  await handlers.updateConfig('filterPatterns', state.filterPatterns);
  const disabledCustomPatterns = handlers
    .getConfig<string[]>('disabledCustomFilterPatterns', [])
    .filter(pattern => state.filterPatterns.includes(pattern));
  await handlers.updateConfig('disabledCustomFilterPatterns', disabledCustomPatterns);
  handlers.sendMessage({
    type: 'FILTER_PATTERNS_UPDATED',
    payload: {
      patterns: state.filterPatterns,
      pluginPatterns: handlers.getPluginFilterPatterns(),
      disabledCustomPatterns,
      disabledPluginPatterns: handlers.getConfig('disabledPluginFilterPatterns', []),
    },
  });
  return true;
}

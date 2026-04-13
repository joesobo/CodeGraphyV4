import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import { applyLegendMessage } from '../messages/legends';
import { applySettingsMessage } from '../settingsMessages/router';
import type { GraphViewPrimaryMessageContext, GraphViewPrimaryMessageResult } from './primary';
import {
  createGraphViewPrimaryLegendMessageState,
  createGraphViewPrimarySettingsMessageState,
} from './primaryState';

export async function dispatchGraphViewPrimaryStateMessage(
  message: WebviewToExtensionMessage,
  context: GraphViewPrimaryMessageContext,
): Promise<GraphViewPrimaryMessageResult> {
  const legendState = createGraphViewPrimaryLegendMessageState(context);
  if (await applyLegendMessage(message, legendState, context)) {
    return {
      handled: true,
      userGroups: legendState.userLegends,
    };
  }

  const settingsState = createGraphViewPrimarySettingsMessageState(context);
  if (await applySettingsMessage(message, settingsState, context)) {
    return {
      handled: true,
      filterPatterns:
        message.type === 'UPDATE_FILTER_PATTERNS'
          ? settingsState.filterPatterns
          : undefined,
    };
  }

  return { handled: false };
}

import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import { applyGroupMessage } from '../messages/groups';
import { applySettingsMessage } from '../settingsMessages/router';
import type { GraphViewPrimaryMessageContext, GraphViewPrimaryMessageResult } from './primary';
import {
  createGraphViewPrimaryGroupMessageState,
  createGraphViewPrimarySettingsMessageState,
} from './primaryState';

export async function dispatchGraphViewPrimaryStateMessage(
  message: WebviewToExtensionMessage,
  context: GraphViewPrimaryMessageContext,
): Promise<GraphViewPrimaryMessageResult> {
  const groupState = createGraphViewPrimaryGroupMessageState(context);
  if (await applyGroupMessage(message, groupState, context)) {
    return {
      handled: true,
      userGroups: groupState.userGroups,
    };
  }

  const settingsState = createGraphViewPrimarySettingsMessageState(context);
  if (await applySettingsMessage(message, settingsState, context)) {
    return {
      handled: true,
      filterPatterns: settingsState.filterPatterns,
    };
  }

  return { handled: false };
}

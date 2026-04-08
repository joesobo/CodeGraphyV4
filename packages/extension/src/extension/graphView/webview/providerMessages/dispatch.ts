import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from './listener';
import { DEFAULT_DEPENDENCIES } from './listener';
import { dispatchGraphViewPluginMessage } from '../dispatch/plugin';
import { dispatchGraphViewPrimaryMessage } from '../dispatch/primary';
import { createGraphViewProviderMessageContext } from './context';

export async function dispatchGraphViewProviderMessage(
  message: WebviewToExtensionMessage,
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies = DEFAULT_DEPENDENCIES,
): Promise<void> {
  const context = createGraphViewProviderMessageContext(source, dependencies);

  const primaryResult = await dispatchGraphViewPrimaryMessage(message, context);
  if (primaryResult.handled) {
    if (primaryResult.userGroups !== undefined) {
      context.setUserGroups(primaryResult.userGroups);
      context.recomputeGroups();
      context.sendGroupsUpdated();
    }
    if (primaryResult.filterPatterns !== undefined) {
      context.setFilterPatterns(primaryResult.filterPatterns);
    }
    return;
  }

  const pluginResult = await dispatchGraphViewPluginMessage(message, context);
  if (pluginResult.handled && pluginResult.readyNotified !== undefined) {
    context.setWebviewReadyNotified(pluginResult.readyNotified);
  }
}
